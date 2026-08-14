const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// In-memory store for now (replace with a real DB before launch)
let submissions = [];

/**
 * TASK: Cooperative submission form (frontend calls this)
 * TASK: Security check on submission form -> validate before pushing to submissions[]
 */
app.post('/api/submissions', (req, res) => {
  const { commodityId, price, cooperativeName, region } = req.body;
 
  // TODO (Security check task): validate commodityId exists in docs/commodities.json,
  // validate price is a positive number within a sane range,
  // rate-limit repeated submissions from the same source.
  if (!commodityId || !price || !cooperativeName || !region) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  submissions.push({
    commodityId,
    price,
    cooperativeName,
    region,
    submittedAt: new Date().toISOString(),
  });

  res.status(201).json({ ok: true });
});

/**
 * TASK: Aggregate to a public price index
 * Simple average per commodity for now — refine aggregation logic here.
 */
app.get('/api/price-index', (req, res) => {
  const grouped = {};
  submissions.forEach((s) => {
    if (!grouped[s.commodityId]) grouped[s.commodityId] = [];
    grouped[s.commodityId].push(s.price);
  });

  const index = Object.entries(grouped).map(([commodityId, prices]) => ({
    commodityId,
    averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
    submissionCount: prices.length,
  }));

  res.json(index);
});

/**
 * TASK: SMS gateway listener
 * Placeholder webhook endpoint for the SMS provider (e.g. Africa's Talking, Twilio).
 * Parses inbound SMS like "PRICE TEFF 4500 OROMIA" and forwards to submissions.
 */
app.post('/api/sms/inbound', (req, res) => {
  const { text, from } = req.body;

  // TODO: parse `text`, map to commodityId, price, region
  // TODO: reply back to `from` via SMS provider with confirmation

  res.status(200).json({ received: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

// In-memory store for farmer listings, keyed by client-generated id
let listings = {};

app.post('/api/listings', (req, res) => {
  const { id, commodityId, quantity, grade, pickupLocation, contact } = req.body;
  if (!id || !commodityId || !quantity || !grade || !pickupLocation || !contact) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  // Upsert by id — safe to retry without creating duplicates
  listings[id] = {
    ...req.body,
    listedAt: listings[id]?.listedAt || new Date().toISOString(),
  };
  res.status(201).json({ ok: true, id });
});