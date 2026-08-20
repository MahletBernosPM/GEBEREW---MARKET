import { useState } from "react";

export default function SubmissionForm() {
  const [form, setForm] = useState({
    commodityId: "",
    price: "",
    cooperativeName: "",
    region: "",
  });
  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Cooperative Name
        </label>
        <input
          name="cooperativeName"
          placeholder="Enter cooperative name"
          onChange={handleChange}
          required
          className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-orange-50 focus:outline-none focus:border-orange-600 focus:bg-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Commodity
        </label>
        <input
          name="commodityId"
          placeholder="e.g. teff"
          onChange={handleChange}
          required
          className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-orange-50 focus:outline-none focus:border-orange-600 focus:bg-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Price
        </label>
        <input
          name="price"
          placeholder="Enter price"
          onChange={handleChange}
          required
          className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-orange-50 focus:outline-none focus:border-orange-600 focus:bg-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Region
        </label>
        <input
          name="region"
          placeholder="e.g. Oromia"
          onChange={handleChange}
          required
          className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-orange-50 focus:outline-none focus:border-orange-600 focus:bg-white"
        />
      </div>
      <button
        type="submit"
        className="bg-orange-800 text-white font-semibold rounded-md px-4 py-2.5 text-sm hover:bg-orange-900 transition"
      >
        Submit Price
      </button>
      {status === "success" && (
        <p className="bg-green-50 text-green-800 rounded-md px-3 py-2 text-sm">
          Submitted!
        </p>
      )}
      {status === "error" && (
        <p className="bg-red-50 text-red-700 rounded-md px-3 py-2 text-sm">
          Something went wrong.
        </p>
      )}
    </form>
  );
}
