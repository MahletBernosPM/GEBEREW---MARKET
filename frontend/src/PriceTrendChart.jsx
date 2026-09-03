import { useEffect, useState } from "react";

// TASK 13: 7/30-day price trend lines + market comparison view.
// Reads live from GET /api/price-index/history.
//
// Two modes, driven by whether a specific market is selected:
//   - marketId set      -> single trend line for that crop+market
//   - marketId === "all" -> one line per market for that crop
//     (this IS the market comparison view — same endpoint, no marketId)
//
// Plain SVG, no charting library — keeps frontend/package.json untouched
// so this doesn't collide with other in-flight branches touching it.

const LINE_COLORS = ["#b45309", "#0f766e", "#7c3aed", "#be123c", "#0369a1"];
const CHART_WIDTH = 640;
const CHART_HEIGHT = 260;
const PADDING = { top: 16, right: 16, bottom: 32, left: 56 };

function buildPath(series, xScale, yScale) {
  // Break the path on null (no verified submissions that day) instead of
  // interpolating across a gap, so missing data reads as missing.
  let d = "";
  let penDown = false;
  series.forEach((point, i) => {
    if (point.averagePrice === null) {
      penDown = false;
      return;
    }
    const x = xScale(i);
    const y = yScale(point.averagePrice);
    d += `${penDown ? "L" : "M"} ${x} ${y} `;
    penDown = true;
  });
  return d.trim();
}

function formatDateLabel(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PriceTrendChart() {
  const [crops, setCrops] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [cropId, setCropId] = useState("");
  const [marketId, setMarketId] = useState("all");
  const [days, setDays] = useState(7);
  const [series, setSeries] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/crops")
      .then((res) => res.json())
      .then((data) => {
        setCrops(data);
        if (data.length > 0) setCropId(data[0].id);
      })
      .catch((err) => console.error("Failed to load crops", err));

    fetch("/api/markets")
      .then((res) => res.json())
      .then(setMarkets)
      .catch((err) => console.error("Failed to load markets", err));
  }, []);

  useEffect(() => {
    if (!cropId) return;

    const params = new URLSearchParams({ cropId, days: String(days) });
    if (marketId !== "all") params.set("marketId", marketId);

    fetch(`/api/price-index/history?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setSeries(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load price history", err);
        setError("Couldn't load price history.");
      });
  }, [cropId, marketId, days]);

  const allPrices = series.flatMap((s) =>
    s.series.map((p) => p.averagePrice).filter((v) => v !== null),
  );
  const minPrice = allPrices.length ? Math.min(...allPrices) : 0;
  const maxPrice = allPrices.length ? Math.max(...allPrices) : 1;
  const pricePad = (maxPrice - minPrice) * 0.1 || 1;
  const yMin = Math.max(0, minPrice - pricePad);
  const yMax = maxPrice + pricePad;

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const xScale = (i) =>
    PADDING.left + (days === 1 ? 0 : (i / (days - 1)) * plotWidth);
  const yScale = (value) =>
    PADDING.top + plotHeight - ((value - yMin) / (yMax - yMin || 1)) * plotHeight;

  const dateAxis = series[0]?.series.map((p) => p.date) ?? [];
  // Thin out x-axis labels so they don't overlap on the 30-day view.
  const labelEvery = days > 7 ? Math.ceil(days / 7) : 1;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-stone-900 mr-2">
          Price Trends
        </h2>

        <select
          className="border border-stone-300 rounded px-2 py-1 text-sm"
          value={cropId}
          onChange={(e) => setCropId(e.target.value)}
        >
          {crops.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameEn ?? c.nameAm}
            </option>
          ))}
        </select>

        <select
          className="border border-stone-300 rounded px-2 py-1 text-sm"
          value={marketId}
          onChange={(e) => setMarketId(e.target.value)}
        >
          <option value="all">All markets (compare)</option>
          {markets.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <div className="flex rounded border border-stone-300 overflow-hidden text-sm">
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 ${
                days === d
                  ? "bg-amber-700 text-white"
                  : "bg-white text-stone-700 hover:bg-stone-100"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {!error && series.length === 0 && (
        <p className="text-sm text-stone-500">
          No verified prices in this window yet.
        </p>
      )}

      {series.length > 0 && (
        <>
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="w-full max-w-2xl"
          >
            {/* y-axis gridlines + labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const value = yMin + t * (yMax - yMin);
              const y = yScale(value);
              return (
                <g key={t}>
                  <line
                    x1={PADDING.left}
                    x2={CHART_WIDTH - PADDING.right}
                    y1={y}
                    y2={y}
                    stroke="#e7e5e4"
                    strokeWidth="1"
                  />
                  <text
                    x={PADDING.left - 8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize="10"
                    fill="#78716c"
                  >
                    {value.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* x-axis labels */}
            {dateAxis.map((date, i) =>
              i % labelEvery === 0 ? (
                <text
                  key={date}
                  x={xScale(i)}
                  y={CHART_HEIGHT - PADDING.bottom + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#78716c"
                >
                  {formatDateLabel(date)}
                </text>
              ) : null,
            )}

            {/* one line per market */}
            {series.map((s, idx) => (
              <path
                key={s.marketId}
                d={buildPath(s.series, xScale, yScale)}
                fill="none"
                stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                strokeWidth="2"
              />
            ))}

            {/* data points */}
            {series.map((s, idx) =>
              s.series.map((p, i) =>
                p.averagePrice !== null ? (
                  <circle
                    key={`${s.marketId}-${p.date}`}
                    cx={xScale(i)}
                    cy={yScale(p.averagePrice)}
                    r="2.5"
                    fill={LINE_COLORS[idx % LINE_COLORS.length]}
                  />
                ) : null,
              ),
            )}
          </svg>

          {/* legend */}
          <div className="flex flex-wrap gap-4 mt-2">
            {series.map((s, idx) => (
              <div key={s.marketId} className="flex items-center gap-1.5 text-sm">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: LINE_COLORS[idx % LINE_COLORS.length] }}
                />
                <span className="text-stone-700">{s.marketName}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}