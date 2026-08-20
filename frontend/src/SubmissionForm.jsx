import { useState } from "react";

export default function SubmissionForm() {
  const [form, setForm] = useState({
    commodityId: "",
    market: "",
    price: "",
    effectiveDate: "",
  });
  const [status, setStatus] = useState(null);

  const today = new Date().toISOString().slice(0, 10);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.effectiveDate < today) {
      setStatus("invalid-date");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("success");
        setForm({ commodityId: "", market: "", price: "", effectiveDate: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-stone-200 rounded-xl p-6 max-w-sm flex flex-col"
    >
      <h2 className="text-sm font-semibold mb-4">Submit price</h2>

      <label
        htmlFor="commodityId"
        className="text-[11px] uppercase tracking-wide text-amber-700 mt-3 mb-1"
      >
        Crop
      </label>
      <input
        id="commodityId"
        name="commodityId"
        placeholder="e.g. Teff"
        value={form.commodityId}
        onChange={handleChange}
        required
        className="border border-stone-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-amber-700"
      />

      <label
        htmlFor="market"
        className="text-[11px] uppercase tracking-wide text-amber-700 mt-3 mb-1"
      >
        Market
      </label>
      <input
        id="market"
        name="market"
        placeholder="e.g. Merkato"
        value={form.market}
        onChange={handleChange}
        required
        className="border border-stone-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-amber-700"
      />

      <div className="flex gap-3">
        <div className="flex-1 flex flex-col">
          <label
            htmlFor="price"
            className="text-[11px] uppercase tracking-wide text-amber-700 mt-3 mb-1"
          >
            Price (ETB)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={handleChange}
            required
            className="border border-stone-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-amber-700"
          />
        </div>
        <div className="flex-1 flex flex-col">
          <label
            htmlFor="effectiveDate"
            className="text-[11px] uppercase tracking-wide text-amber-700 mt-3 mb-1"
          >
            Effective date
          </label>
          <input
            id="effectiveDate"
            name="effectiveDate"
            type="date"
            min={today}
            value={form.effectiveDate}
            onChange={handleChange}
            required
            className="border border-stone-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-amber-700"
          />
        </div>
      </div>

      {status === "success" && (
        <p className="text-xs text-green-700 mt-3">Submitted for review!</p>
      )}
      {status === "invalid-date" && (
        <p className="text-xs text-red-600 mt-3">
          Effective date can't be in the past.
        </p>
      )}
      {status === "error" && (
        <p className="text-xs text-red-600 mt-3">Something went wrong.</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-5 self-start border border-stone-900 rounded-lg px-4 py-2 text-sm font-medium bg-white hover:bg-stone-100 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "submitting" ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}
