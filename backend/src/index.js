require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { prisma, withOperatorContext, withSystemContext } = require("./db");
const { fanoutVerifiedPrice } = require("./smsFanout");
const { parseSmsCommand } = require("../../sms-gateway/src/parser");
const { checkRateLimit } = require("../../sms-gateway/src/rateLimiter");

const app = express();

app.use(cors());
app.use(express.json());

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * TASK 3: Reference data for the submission form
 * crops/markets have RLS OFF (same list for every role — see SCHEMA.md
 * section 8), so these are plain reads, no operator context needed.
 */
app.get("/api/crops", async (req, res) => {
  try {
    const crops = await prisma.crop.findMany({ orderBy: { nameEn: "asc" } });
    res.json(crops);
  } catch (err) {
    console.error("Failed to list crops", err);
    res.status(500).json({ error: "Failed to list crops" });
  }
});

app.get("/api/markets", async (req, res) => {
  try {
    const markets = await prisma.market.findMany({ orderBy: { name: "asc" } });
    res.json(markets);
  } catch (err) {
    console.error("Failed to list markets", err);
    res.status(500).json({ error: "Failed to list markets" });
  }
});

/**
 * TASK 3: Price submission
 * Creates a Price row with isVerified: false — it enters the operator
 * approval queue immediately.
 */
app.post("/api/prices", async (req, res) => {
  const { cropId, marketId, price, unit, effectiveDate, grade, source } =
    req.body;

  if (!cropId || !marketId || !price || !unit || !effectiveDate) {
    return res.status(400).json({
      error:
        "Missing required fields: cropId, marketId, price, unit, effectiveDate",
    });
  }

  const numericPrice = Number(price);
  if (Number.isNaN(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({ error: "price must be a positive number" });
  }

  const effectiveDateObj = new Date(effectiveDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(effectiveDateObj.getTime()) || effectiveDateObj < today) {
    return res
      .status(400)
      .json({ error: "effectiveDate must be a valid date not in the past" });
  }

  try {
    const created = await withOperatorContext(async (tx) => {
      const [crop, market] = await Promise.all([
        tx.crop.findUnique({ where: { id: cropId } }),
        tx.market.findUnique({ where: { id: marketId } }),
      ]);
      if (!crop) throw new HttpError(400, `Unknown cropId: ${cropId}`);
      if (!market) throw new HttpError(400, `Unknown marketId: ${marketId}`);

      return tx.price.create({
        data: {
          cropId,
          marketId,
          priceValue: numericPrice,
          unit,
          effectiveDate: effectiveDateObj,
          grade: grade ?? null,
          source: source ?? "field_reporter",
          isVerified: false,
        },
      });
    });

    res.status(201).json(created);
  } catch (err) {
    if (err instanceof HttpError)
      return res.status(err.status).json({ error: err.message });
    console.error("Failed to create price submission", err);
    res.status(500).json({ error: "Failed to submit price" });
  }
});

/**
 * TASK 3: Operator queue
 * Lists prices waiting for verification.
 */
app.get("/api/prices", async (req, res) => {
  const verifiedParam = req.query.verified;

  try {
    const results = await withOperatorContext((tx) =>
      tx.price.findMany({
        where:
          verifiedParam !== undefined
            ? { isVerified: verifiedParam === "true" }
            : undefined,
        include: { crop: true, market: true },
        orderBy: { createdAt: "desc" },
      }),
    );
    res.json(results);
  } catch (err) {
    console.error("Failed to list prices", err);
    res.status(500).json({ error: "Failed to list prices" });
  }
});

/**
 * TASK 3: Verify a price
 * Sets isVerified: true and triggers the SMS fanout in the same transaction
 * so a delivery record is only created for a price that's actually verified.
 */
app.patch("/api/prices/:id/verify", async (req, res) => {
  try {
    const result = await withOperatorContext(async (tx) => {
      const updated = await tx.price.update({
        where: { id: req.params.id },
        data: { isVerified: true },
        include: { crop: true, market: true },
      });

      const { fanoutCount } = await fanoutVerifiedPrice(tx, updated);
      return { updated, fanoutCount };
    });

    res.json({ price: result.updated, fanoutCount: result.fanoutCount });
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ error: "Price not found" });
    console.error("Failed to verify price", err);
    res.status(500).json({ error: "Failed to verify price" });
  }
});

/**
 * TASK 3: Reject a price
 * Schema has no status/rejection field on Price — only isVerified — so a
 * rejected submission is deleted rather than flagged. If an audit trail of
 * rejections matters, that needs a schema change (worth raising with the
 * Task 1 owner).
 */
app.patch("/api/prices/:id/reject", async (req, res) => {
  try {
    await withOperatorContext((tx) =>
      tx.price.delete({ where: { id: req.params.id } }),
    );
    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ error: "Price not found" });
    console.error("Failed to reject price", err);
    res.status(500).json({ error: "Failed to reject price" });
  }
});

/**
 * TASK 9 (Habtamu's): Public price index
 * Only verified prices whose effective date is TODAY are shown — this is
 * what "Today's Prices" on the board actually means. Grouped by crop AND
 * market per the task spec (previously crop-only, which collapsed prices
 * from different markets into one misleading average).
 */
app.get("/api/price-index", async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const prices = await withOperatorContext((tx) =>
      tx.price.findMany({
        where: {
          isVerified: true,
          effectiveDate: { gte: startOfToday, lt: startOfTomorrow },
        },
        include: { crop: true, market: true },
      }),
    );

    const grouped = {};
    for (const p of prices) {
      const key = `${p.cropId}::${p.marketId}`;
      if (!grouped[key]) {
        grouped[key] = {
          cropId: p.cropId,
          cropName: p.crop.nameEn ?? p.crop.nameAm,
          marketId: p.marketId,
          marketName: p.market.name,
          prices: [],
        };
      }
      grouped[key].prices.push(Number(p.priceValue));
    }

    const index = Object.values(grouped).map(
      ({ cropId, cropName, marketId, marketName, prices }) => ({
        commodityId: cropId,
        commodityName: cropName,
        marketId,
        marketName,
        averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
        submissionCount: prices.length,
      }),
    );

    res.json(index);
  } catch (err) {
    console.error("Failed to build price index", err);
    res.status(500).json({ error: "Failed to load price index" });
  }
});

/**
 * TASK 5: SMS gateway inbound listener
 * Handles PRICE/SELL commands via SMS. Uses withSystemContext (see db.js)
 * because creating a first-time user row and logging sms_messages both
 * require ADMIN under current RLS — flagged to the team as a gap, not a
 * long-term design choice.
 */
app.post("/api/sms/inbound", async (req, res) => {
  const { sender, text } = req.body;

  if (!sender || !text) {
    return res.status(400).json({ error: "Missing sender or text" });
  }

  const rateCheck = checkRateLimit(sender);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      retryAfterSec: rateCheck.retryAfterSec,
    });
  }

  const parsed = parseSmsCommand(text);

  try {
    const replyText = await withSystemContext(async (tx) => {
      // Find or create the user for this phone number
      const user = await tx.user.upsert({
        where: { phone: sender },
        update: {},
        create: { phone: sender, role: "FARMER" },
      });

      // Log the inbound message regardless of outcome
      await tx.smsMessage.create({
        data: {
          sender,
          intent: parsed.intent,
          response: text,
          direction: "INBOUND",
          userId: user.id,
        },
      });

      let reply;

      if (!parsed.valid) {
        reply = parsed.error + (parsed.helpText ? ` ${parsed.helpText}` : "");
      } else if (parsed.intent === "QUERY_PRICE") {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

        const prices = await tx.price.findMany({
          where: {
            cropId: parsed.cropId,
            isVerified: true,
            effectiveDate: { gte: startOfToday, lt: startOfTomorrow },
          },
          include: { crop: true, market: true },
        });

        if (prices.length === 0) {
          reply = `No verified price today for ${parsed.cropId}.`;
        } else {
          const lines = prices.map(
            (p) => `${p.market.name}: ${p.priceValue} ETB/${p.unit}`,
          );
          reply = `${parsed.cropId.toUpperCase()} — ${lines.join(", ")}`;
        }
      } else if (parsed.intent === "SUBMIT_LISTING") {
        await tx.listing.create({
          data: {
            farmerId: user.id,
            cropId: parsed.cropId,
            quantity: parsed.quantity,
            pickup: parsed.pickupLocation,
            contact: sender,
          },
        });
        reply = `Listing created: ${parsed.cropId}, qty ${parsed.quantity}, at ${parsed.pickupLocation}.`;
      } else {
        reply = "Unrecognized command.";
      }

      // Log the outbound reply
      await tx.smsMessage.create({
        data: {
          sender,
          intent: parsed.intent,
          response: reply,
          direction: "OUTBOUND",
          status: "queued",
          userId: user.id,
        },
      });

      return reply;
    });

    res.status(200).json({ received: true, reply: replyText });
  } catch (err) {
    console.error("Failed to process inbound SMS", err);
    res.status(500).json({ error: "Failed to process SMS" });
  }
});

require("./priceTrends")(app);


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
