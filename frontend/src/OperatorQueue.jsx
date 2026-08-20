import { useEffect, useState } from "react";

export default function OperatorQueue() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/submissions?status=pending");
      const data = await res.json();
      setSubmissions(data);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (id, decision) => {
    setPendingId(id);
    try {
      const res = await fetch(`/api/submissions/${id}/${decision}`, {
        method: "PATCH",
      });
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      // leave it in the queue so the operator can retry
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-6 max-w-md">
      <h2 className="text-sm font-semibold mb-4">Operator queue</h2>

      {loading && <p className="text-xs text-stone-500">Loading queue…</p>}
      {!loading && submissions.length === 0 && (
        <p className="text-xs text-stone-500">No prices waiting for review.</p>
      )}

      <ul className="flex flex-col gap-3.5">
        {submissions.map((s) => (
          <li
            key={s.id}
            className="bg-stone-100 rounded-lg p-4 flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold">
                {s.commodityId} — {s.market}
              </span>
              <span className="text-xs text-stone-500">
                {s.price} ETB · effective {s.effectiveDate}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                disabled={pendingId === s.id}
                onClick={() => handleDecision(s.id, "approve")}
                className="border border-stone-900 rounded-md px-3.5 py-1.5 text-sm font-medium bg-white hover:bg-stone-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Approve
              </button>
              <button
                disabled={pendingId === s.id}
                onClick={() => handleDecision(s.id, "reject")}
                className="border border-red-600 text-red-600 rounded-md px-3.5 py-1.5 text-sm font-medium bg-white hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
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
