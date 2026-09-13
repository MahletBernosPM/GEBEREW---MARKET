import { useEffect, useState } from "react";

// TASK 14: Daily Price Board — shows today's verified prices by crop/market.
// Depends on Task 9's /api/price-index. Currently unreachable: backend/src/db.js
// on main is missing the Prisma client + context functions, and there's no
// .env/DATABASE_URL in the repo. Until that's fixed, fetches below will fail —
// expected, not a bug here.

// Fallback labels only, so the table has its shape before real data loads
// (or while the shared backend is down). Fully replaced once real data arrives.
const FALLBACK_CROPS = ["Teff", "Maize", "Wheat", "Red onion", "Coffee"];
const FALLBACK_MARKETS = ["Adama", "Merkato", "Bahir Dar"];

export default function PriceBoard({ refreshKey }) {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Original fetch — refetches on refreshKey change.
  useEffect(() => {
    fetch("/api/price-index")
      .then((res) => res.json())
      .then(setPrices)
      .catch((err) => console.error("Failed to load price index", err));
  }, [refreshKey]);

  // Auto-refresh every 60s + loading/error state.
  useEffect(() => {
    const poll = () => {
      setLoading(true);
      setError("");
      fetch("/api/price-index")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(setPrices)
        .catch(() => setError("Unable to load today's prices."))
        .finally(() => setLoading(false));
    };
    poll();
    const id = setInterval(poll, 60000);
    return () => clearInterval(id);
  }, []);

  // Real data always overrides fallback labels once it exists.
  const markets = prices.length
    ? [...new Set(prices.map((p) => p.marketName))]
    : FALLBACK_MARKETS;

  const crops = prices.length
    ? [...new Map(prices.map((p) => [p.commodityId, p])).values()]
    : FALLBACK_CROPS.map((name) => ({ commodityId: name, commodityName: name }));

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 sm:p-6">
      <h1 className="text-lg sm:text-xl font-bold mb-3 text-stone-900">
        Daily price board
      </h1>

      {/* Error shown as a note, table stays visible either way */}
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-stone-500">Crop</th>
            {markets.map((m) => (
              <th key={m} className="px-4 py-3 text-left text-stone-500">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {crops.map((c) => (
            <tr key={c.commodityId} className="border-t border-stone-200">
              <td className="px-4 py-3">{c.commodityName}</td>
              {markets.map((m) => {
                const p = prices.find(
                  (x) => x.commodityId === c.commodityId && x.marketName === m
                );
                return (
                  <td key={m} className="px-4 py-3">
                    {loading ? (
                      <span className="inline-block h-2 w-24 rounded bg-stone-200 animate-pulse" />
                    ) : p ? (
                      p.averagePrice.toFixed(2)
                    ) : (
                      "—"
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}