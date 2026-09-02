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

const app = express();

app.use(cors());
app.use(express.json());

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
