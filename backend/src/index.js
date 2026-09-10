<<<<<<< HEAD
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { parseSmsCommand } = require('../../sms-gateway/src/parser');
const { checkRateLimit } = require('../../sms-gateway/src/rateLimiter');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined in backend environment');
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });
=======
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const {
  prisma,
  withOperatorContext,
  withSystemContext,
  withFarmerContext,
  withBuyerContext,
} = require("./db");
const { fanoutVerifiedPrice } = require("./smsFanout");
const { parseSmsCommand } = require("../../sms-gateway/src/parser");
const { checkRateLimit } = require("../../sms-gateway/src/rateLimiter");
>>>>>>> origin/main

const app = express();

const rateLimit = require("express-rate-limit");

<<<<<<< HEAD
// ---------------------------------------------------------------------------
// 1. Cooperative Price Submission Form (Web API)
// ---------------------------------------------------------------------------
app.post('/api/submissions', async (req, res) => {
  try {
    const { commodityId, price, cooperativeName, region } = req.body;

    if (!commodityId || !price || !cooperativeName || !region) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const priceVal = Number(price);
    if (isNaN(priceVal) || priceVal <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    // Verify crop exists in DB
    const crop = await prisma.crop.findUnique({
      where: { id: commodityId.toLowerCase() },
    });

    if (!crop) {
      return res.status(404).json({ error: `Crop '${commodityId}' not found in index.` });
    }

    // Default to Merkato or region market
    let market = await prisma.market.findFirst({
      where: { name: { contains: region, mode: 'insensitive' } },
    });

    if (!market) {
      market = await prisma.market.findFirst({ where: { name: 'Merkato' } });
    }

    // Save price submission to database
    const savedPrice = await prisma.price.create({
      data: {
        cropId: crop.id,
        marketId: market.id,
        priceValue: priceVal,
        unit: 'quintal',
        source: `cooperative:${cooperativeName}`,
        isVerified: true,
      },
    });

    res.status(201).json({ ok: true, id: savedPrice.id });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// 2. Aggregate Public Price Index (Web API)
// ---------------------------------------------------------------------------
app.get('/api/price-index', async (req, res) => {
  try {
    const prices = await prisma.price.findMany({
      include: {
        crop: true,
        market: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by cropId to calculate average price and submission counts
    const grouped = {};
    for (const p of prices) {
      if (!grouped[p.cropId]) {
        grouped[p.cropId] = {
          commodityId: p.crop.nameEn || p.cropId,
          cropId: p.cropId,
          amharicName: p.crop.nameAm,
          oromoName: p.crop.nameOm,
          prices: [],
        };
      }
      grouped[p.cropId].prices.push(Number(p.priceValue));
    }

    const priceIndex = Object.values(grouped).map((item) => ({
      commodityId: item.commodityId,
      cropId: item.cropId,
      amharicName: item.amharicName,
      oromoName: item.oromoName,
      averagePrice: item.prices.reduce((a, b) => a + b, 0) / item.prices.length,
      submissionCount: item.prices.length,
    }));

    res.json(priceIndex);
  } catch (error) {
    console.error('Price index error:', error);
    res.status(500).json({ error: 'Failed to fetch price index' });
  }
});

// ---------------------------------------------------------------------------
// 3. SMS Gateway Listener & Short Code Webhook (Task 5)
//    Supports Ethio Telecom & Safaricom Ethiopia Short Codes
// ---------------------------------------------------------------------------
app.post('/api/sms/inbound', async (req, res) => {
  const { messageId, provider, from, text } = req.body;

  const sender = from || 'ANONYMOUS';
  const rawText = text || '';
  const telecomProvider = provider || 'ethio_telecom';

  // Step A: Check Outbound Rate Limiting per sender phone number
  const rateLimit = checkRateLimit(sender);
  if (!rateLimit.allowed) {
    const rateLimitResponse = `Rate limit exceeded. Please wait ${rateLimit.retryAfterSec} seconds before sending another SMS request.`;

    // Log rate limited attempt in DB
    await prisma.smsMessage.create({
      data: {
        sender,
        intent: 'RATE_LIMITED',
        response: rateLimitResponse,
        direction: 'OUTBOUND',
        status: 'BLOCKED',
      },
    }).catch(console.error);

    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      retryAfterSec: rateLimit.retryAfterSec,
      smsResponse: rateLimitResponse,
    });
  }

  // Step B: Parse inbound command
  const parsed = parseSmsCommand(rawText);

  // Look up existing user by sender phone number if available
  let existingUser = await prisma.user.findUnique({ where: { phone: sender } }).catch(() => null);

  // Log Inbound SMS to Database
  const inboundLog = await prisma.smsMessage.create({
    data: {
      userId: existingUser ? existingUser.id : undefined,
      sender,
      intent: parsed.intent,
      response: rawText,
      direction: 'INBOUND',
      status: parsed.valid ? 'PROCESSED' : 'INVALID',
    },
  }).catch((err) => {
    console.error('Failed to log inbound SMS:', err);
    return null;
  });

  let smsResponse = '';

  try {
    // -----------------------------------------------------------------------
    // PATH 1: PRICE QUERY (e.g. "PRICE TEFF", "ዋጋ ጤፍ", "GATI XAAFII")
    // -----------------------------------------------------------------------
    if (parsed.intent === 'QUERY_PRICE' && parsed.valid) {
      const crop = await prisma.crop.findUnique({
        where: { id: parsed.cropId },
        include: {
          prices: {
            where: { isVerified: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { market: true },
          },
        },
      });

      if (!crop || crop.prices.length === 0) {
        smsResponse = `Geberew Market: No verified prices available for ${parsed.cropId} yet.`;
      } else {
        const latestPrice = crop.prices[0];
        const priceVal = Number(latestPrice.priceValue).toLocaleString();
        const marketName = latestPrice.market ? latestPrice.market.name : 'Merkato';

        smsResponse = `[Geberew Market] ${crop.nameEn} (${crop.nameAm} / ${crop.nameOm}): ${priceVal} ETB/${latestPrice.unit} at ${marketName}.`;
      }
    }

    // -----------------------------------------------------------------------
    // PATH 2: LISTING SUBMISSION (e.g. "SELL TEFF 8500 10 ADAMA")
    // -----------------------------------------------------------------------
    else if (parsed.intent === 'SUBMIT_LISTING' && parsed.valid) {
      // Find or create User record for sender phone number
      const user = await prisma.user.upsert({
        where: { phone: sender },
        update: {},
        create: {
          phone: sender,
          role: 'FARMER',
        },
      });
      existingUser = user;

      // Create new Listing record in DB
      const listing = await prisma.listing.create({
        data: {
          farmerId: user.id,
          cropId: parsed.cropId,
          grade: 'Grade 1',
          quantity: parsed.quantity,
          pickup: parsed.pickupLocation,
          contact: sender,
          status: 'ACTIVE',
        },
        include: { crop: true },
      });

      const cropName = listing.crop ? listing.crop.nameEn : parsed.cropId;
      smsResponse = `[Geberew Market Confirmation] Listing created for ${parsed.quantity} Qtl ${cropName} at ${parsed.price} ETB/Qtl (Location: ${parsed.pickupLocation}). Listing ID: ${listing.id.slice(0, 8)}.`;
    }

    // -----------------------------------------------------------------------
    // PATH 3: UNKNOWN / INVALID COMMAND
    // -----------------------------------------------------------------------
    else {
      smsResponse = `[Geberew Market SMS Help] ${parsed.error || 'Invalid command.'} ${parsed.helpText || 'Send PRICE TEFF or SELL TEFF 8500 10 ADAMA.'}`;
    }

    // Log Outbound SMS Response to Database
    await prisma.smsMessage.create({
      data: {
        userId: existingUser ? existingUser.id : undefined,
        sender,
        intent: parsed.intent,
        response: smsResponse,
        direction: 'OUTBOUND',
        status: 'SENT',
      },
    }).catch(console.error);

    res.status(200).json({
      success: true,
      messageId: messageId || `msg_${Date.now()}`,
      provider: telecomProvider,
      intent: parsed.intent,
      smsResponse,
    });
  } catch (error) {
    console.error('SMS processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process SMS request',
    });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend API running on port ${PORT}`));
=======
app.use(cors());
app.use(express.json({ limit: "10mb" }));

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const priceSubmitionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many price submissions, please try again later.",
  },
});

const listingSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many listing submissions. Please try again later.",
  },
});

/**
 * TASK 3: Reference data for the submission form
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
 */
app.post("/api/prices", priceSubmitionLimiter, async (req, res) => {
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
 * TASK 9: Public price index
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
      const user = await tx.user.upsert({
        where: { phone: sender },
        update: {},
        create: { phone: sender, role: "FARMER" },
      });

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

/**
 * TASK 4/6 & 12: Farmer & Cooperative listing creation with input validation & rate limiting
 */
app.post("/api/listings", listingSubmissionLimiter, async (req, res) => {
  const { id, commodityId, quantity, grade, pickupLocation, contact } = req.body;

  if (!id || !commodityId || !quantity || !pickupLocation || !contact) {
    return res.status(400).json({
      error:
        "Missing required fields: id, commodityId, quantity, pickupLocation, contact",
    });
  }

  const numericQuantity = Number(quantity);
  if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
    return res.status(400).json({
      error: "quantity must be a positive number",
    });
  }

  const normalizedContact = String(contact).trim();
  if (!/^\+?\d{10,15}$/.test(normalizedContact)) {
    return res.status(400).json({
      error: "contact must be a valid phone number",
    });
  }

  try {
    const listing = await withFarmerContext(
      normalizedContact,
      async (tx, farmer) => {
        const crop = await tx.crop.findUnique({
          where: { id: commodityId },
        });

        if (!crop) {
          throw new HttpError(400, `Unknown commodityId: ${commodityId}`);
        }

        return tx.listing.upsert({
          where: { id },
          create: {
            id,
            farmerId: farmer.id,
            cropId: commodityId,
            quantity: numericQuantity,
            grade: grade || null,
            pickup: pickupLocation,
            contact: normalizedContact,
          },
          update: {
            quantity: numericQuantity,
            grade: grade || null,
            pickup: pickupLocation,
          },
        });
      },
    );

    res.status(201).json({
      ok: true,
      id: listing.id,
    });
  } catch (err) {
    if (err instanceof HttpError)
      return res.status(err.status).json({ error: err.message });
    console.error("Failed to create listing", err);
    res.status(500).json({
      error: "Failed to create listing",
    });
  }
});

/**
 * TASK 7: Buyer browse listings endpoint
 */
app.get("/api/listings", async (req, res) => {
  try {
    const listings = await withBuyerContext((tx) =>
      tx.listing.findMany({
        where: {
          status: "ACTIVE",
        },
        include: {
          crop: true,
          market: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    );

    res.json(listings);
  } catch (err) {
    console.error("Failed to list active listings", err);
    res.status(500).json({ error: "Failed to load listings" });
  }
});

/**
 * Update listing endpoint
 */
app.patch("/api/listings/:id", async (req, res) => {
  const { quantity, grade, pickupLocation } = req.body;

  let numericQuantity;
  if (quantity !== undefined) {
    numericQuantity = Number(quantity);
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      return res.status(400).json({
        error: "quantity must be a positive number",
      });
    }
  }

  try {
    const existing = await withOperatorContext((tx) =>
      tx.listing.findUnique({
        where: { id: req.params.id },
      }),
    );

    if (!existing) {
      return res.status(404).json({
        error: "Listing not found",
      });
    }

    const updated = await withFarmerContext(
      existing.contact,
      (tx) =>
        tx.listing.update({
          where: { id: req.params.id },
          data: {
            quantity: quantity !== undefined ? numericQuantity : existing.quantity,
            grade: grade !== undefined ? grade : existing.grade,
            pickup: pickupLocation !== undefined ? pickupLocation : existing.pickup,
          },
        }),
    );

    res.json({
      ok: true,
      listing: updated,
    });
  } catch (err) {
    console.error("Failed to update listing", err);
    res.status(500).json({
      error: "Failed to update listing",
    });
  }
});

/**
 * Delete listing endpoint
 */
app.delete("/api/listings/:id", async (req, res) => {
  try {
    const existing = await withOperatorContext((tx) =>
      tx.listing.findUnique({ where: { id: req.params.id } }),
    );

    if (!existing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    await withFarmerContext(
      existing.contact,
      (tx) =>
        tx.listing.delete({
          where: { id: req.params.id },
        }),
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete listing", err);
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
>>>>>>> origin/main
