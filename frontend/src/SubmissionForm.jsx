import { useEffect, useState } from "react";

const UNITS = ["quintal", "kg"];

function cropLabel(c) {
  const parts = [c.nameEn, c.nameAm, c.nameOm].filter(Boolean);
  return parts.join(" — ");
}

export default function SubmissionForm({ onSubmitted }) {
  const [crops, setCrops] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [refError, setRefError] = useState(false);

  const [form, setForm] = useState({
    cropId: "",
    marketId: "",
    price: "",
    unit: UNITS[0],
    grade: "",
    effectiveDate: "",
  });
  const [status, setStatus] = useState(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    Promise.all([
      fetch("/api/crops").then((res) => {
        if (!res.ok) throw new Error("crops");
        return res.json();
      }),
      fetch("/api/markets").then((res) => {
        if (!res.ok) throw new Error("markets");
        return res.json();
      }),
    ])
      .then(([cropList, marketList]) => {
        setCrops(cropList);
        setMarkets(marketList);
      })
      .catch(() => setRefError(true));
  }, []);

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
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cropId: form.cropId,
          marketId: form.marketId,
          price: form.price,
          unit: form.unit,
          effectiveDate: form.effectiveDate,
          grade: form.grade || undefined,
          source: "field_reporter",
        }),
      });
      if (res.ok) {
        setStatus("success");
        setForm({
          cropId: "",
          marketId: "",
          price: "",
          unit: UNITS[0],
          grade: "",
          effectiveDate: "",
        });
        onSubmitted?.();
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
      className="bg-white border border-stone-300 rounded-2xl p-8 w-full md:max-w-md flex flex-col"
    >
      <h2 className="text-2xl font-bold mb-6 text-stone-900">Submit price</h2>

      {refError && (
        <p className="text-sm text-red-600 mb-4">
          Couldn't load crops/markets. Is the backend running?
        </p>
      )}

      <label htmlFor="cropId" className="text-sm text-stone-500 mb-2">
        Crop
      </label>
      <select
        id="cropId"
        name="cropId"
        value={form.cropId}
        onChange={handleChange}
        required
        className="border border-stone-300 rounded-xl px-4 py-3 text-base w-full focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white mb-5"
      >
        <option value="" disabled>
          Select a crop
        </option>
        {crops.map((c) => (
          <option key={c.id} value={c.id}>
            {cropLabel(c)}
          </option>
        ))}
      </select>

      <label htmlFor="marketId" className="text-sm text-stone-500 mb-2">
        Market
      </label>
      <select
        id="marketId"
        name="marketId"
        value={form.marketId}
        onChange={handleChange}
        required
        className="border border-stone-300 rounded-xl px-4 py-3 text-base w-full focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white mb-5"
      >
        <option value="" disabled>
          Select a market
        </option>
        {markets.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} ({m.region})
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="flex flex-col">
          <label htmlFor="price" className="text-sm text-stone-500 mb-2">
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
            className="border border-stone-300 rounded-xl px-4 py-3 text-base w-full focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="effectiveDate" className="text-sm text-stone-500 mb-2">
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
            className="border border-stone-300 rounded-xl px-4 py-3 text-base w-full focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>
      </div>

      <label htmlFor="unit" className="text-sm text-stone-500 mb-2">
        Unit (quintal / kg)
      </label>
      <select
        id="unit"
        name="unit"
        value={form.unit}
        onChange={handleChange}
        required
        className="border border-stone-300 rounded-xl px-4 py-3 text-base w-full focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white mb-5"
      >
        {UNITS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>

      <label htmlFor="grade" className="text-sm text-stone-500 mb-2">
        Grade (optional)
      </label>
      <input
        id="grade"
        name="grade"
        placeholder="e.g. Grade 1"
        value={form.grade}
        onChange={handleChange}
        className="border border-stone-300 rounded-xl px-4 py-3 text-base w-full focus:outline-none focus:ring-2 focus:ring-stone-400 mb-6"
      />

      {status === "success" && (
        <p className="text-sm text-green-700 mb-4">Submitted for review!</p>
      )}
      {status === "invalid-date" && (
        <p className="text-sm text-red-600 mb-4">
          Effective date can't be in the past.
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-600 mb-4">Something went wrong.</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="self-start border-2 border-stone-900 rounded-xl px-6 py-3 text-base font-medium bg-white hover:bg-stone-100 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "submitting" ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}