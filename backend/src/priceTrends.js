const { withOperatorContext } = require("./db");

/**
 * TASK 13 (Habtamu's): 7/30-day price trends + market comparison
 *
 * GET /api/price-index/history?cropId=<id>&days=7|30           -> one series per market (market comparison view)
 * GET /api/price-index/history?cropId=<id>&marketId=<id>&days= -> single series (per-crop-per-market trend line)
 *
 * Reuses the same verified-only / effective-date filtering as Task 9's
 * /api/price-index (backend/src/index.js), just aggregated by day across
 * a date range instead of a single day. Kept as its own module + a single
 * mount line in index.js on purpose: Task 9's branch isn't merged yet, so
 * this stays out of the diff on index.js, db.js, and schema.prisma.
 *
 * NOTE: uses withOperatorContext for the same reason Task 9's endpoint
 * does (see backend/src/db.js TODO(auth)) — there's no real per-request
 * auth yet, so reads run under a hardcoded OPERATOR context. Replace once
 * real auth lands.
 */
function registerPriceTrendRoutes(app) {
  app.get("/api/price-index/history", async (req, res) => {
    const { cropId, marketId } = req.query;
    const days = Number(req.query.days) || 7;

    if (!cropId) {
      return res.status(400).json({ error: "cropId is required" });
    }
    if (![7, 30].includes(days)) {
      return res.status(400).json({ error: "days must be 7 or 30" });
    }

    // Date range: today back through (days - 1) days ago, inclusive.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const rangeStart = new Date(startOfToday);
    rangeStart.setDate(rangeStart.getDate() - (days - 1));

    try {
      const prices = await withOperatorContext((tx) =>
        tx.price.findMany({
          where: {
            cropId,
            ...(marketId ? { marketId } : {}),
            isVerified: true,
            effectiveDate: { gte: rangeStart, lt: startOfTomorrow },
          },
          include: { crop: true, market: true },
          orderBy: { effectiveDate: "asc" },
        }),
      );

      // Group verified submissions by market, then by calendar day.
      const byMarket = {};
      for (const p of prices) {
        const dayKey = p.effectiveDate.toISOString().slice(0, 10);
        const mKey = p.marketId;
        if (!byMarket[mKey]) {
          byMarket[mKey] = {
            marketId: p.marketId,
            marketName: p.market.name,
            cropId: p.cropId,
            cropName: p.crop.nameEn ?? p.crop.nameAm,
            byDay: {},
          };
        }
        if (!byMarket[mKey].byDay[dayKey]) {
          byMarket[mKey].byDay[dayKey] = [];
        }
        byMarket[mKey].byDay[dayKey].push(Number(p.priceValue));
      }

      // Build a complete date axis so days with no verified submissions
      // show up as explicit gaps (null) rather than being skipped, which
      // would otherwise silently compress the x-axis.
      const dateAxis = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(rangeStart);
        d.setDate(d.getDate() + i);
        dateAxis.push(d.toISOString().slice(0, 10));
      }

      const result = Object.values(byMarket).map((m) => ({
        marketId: m.marketId,
        marketName: m.marketName,
        cropId: m.cropId,
        cropName: m.cropName,
        series: dateAxis.map((date) => {
          const dayPrices = m.byDay[date];
          return {
            date,
            averagePrice: dayPrices
              ? dayPrices.reduce((a, b) => a + b, 0) / dayPrices.length
              : null,
            submissionCount: dayPrices ? dayPrices.length : 0,
          };
        }),
      }));

      res.json(result);
    } catch (err) {
      console.error("Failed to build price trend history", err);
      res.status(500).json({ error: "Failed to load price history" });
    }
  });
}

module.exports = registerPriceTrendRoutes;