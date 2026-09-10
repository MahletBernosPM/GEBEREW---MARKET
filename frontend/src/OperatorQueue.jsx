import { useEffect, useState } from "react";

function cropLabel(c) {
  if (!c) return "";
  const parts = [c.nameEn, c.nameAm, c.nameOm].filter(Boolean);
  return parts.join(" — ");
}

export default function OperatorQueue({ refreshKey, onDecision }) {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState(null);
  const [lastFanout, setLastFanout] = useState(null);

  useEffect(() => {
    fetchQueue();
  }, [refreshKey]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/prices?verified=false");
      const data = await res.json();
      setPrices(data);
    } catch {
      setPrices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (id, decision) => {
    setPendingId(id);
    try {
      const res = await fetch(`/api/prices/${id}/${decision}`, {
        method: "PATCH",
      });
      if (res.ok) {
        if (decision === "verify") {
          const data = await res.json();
          setLastFanout({ id, count: data.fanoutCount });
        }
        setPrices((prev) => prev.filter((p) => p.id !== id));
        onDecision?.();
      }
    } catch {
      // leave it in the queue so the operator can retry
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="bg-white border border-stone-300 rounded-2xl p-8 w-full md:max-w-2xl">
      <h2 className="text-2xl font-bold mb-6 text-stone-900">Operator queue</h2>

      {loading && <p className="text-sm text-stone-500">Loading queue…</p>}
      {!loading && prices.length === 0 && (
        <p className="text-sm text-stone-500">No prices waiting for review.</p>
      )}
      {lastFanout && (
        <p className="text-sm text-green-700 mb-4">
          Verified — SMS fanout queued for {lastFanout.count} recipient
          {lastFanout.count === 1 ? "" : "s"}.
        </p>
      )}

      <ul className="flex flex-col gap-5">
        {prices.map((p) => (
          <li
            key={p.id}
            className="bg-stone-100 rounded-2xl p-6 flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1">
              <span className="text-base font-bold text-stone-900">
                {cropLabel(p.crop)} — {p.market?.name}
              </span>
              <span className="text-sm text-stone-500">
                {p.priceValue} ETB/{p.unit}
                {p.grade ? ` · ${p.grade}` : ""} · effective{" "}
                {String(p.effectiveDate).slice(0, 10)}
              </span>
              <span className="text-sm text-stone-400">
                source: {p.source}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                disabled={pendingId === p.id}
                onClick={() => handleDecision(p.id, "verify")}
                className="border-2 border-stone-900 rounded-xl px-6 py-2.5 text-base font-medium bg-white hover:bg-stone-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Approve
              </button>
              <button
                disabled={pendingId === p.id}
                onClick={() => handleDecision(p.id, "reject")}
                className="border-2 border-stone-900 rounded-xl px-6 py-2.5 text-base font-medium bg-white hover:bg-stone-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}