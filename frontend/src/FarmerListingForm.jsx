import { useState, useEffect } from "react";
import {
  queueListing,
  syncQueuedListings,
  cacheMyListing,
  generateListingId,
} from "./offlineSync";
import { COMMODITIES, GRADES } from "./constants";

export default function FarmerListingForm() {
  const [form, setForm] = useState({
    commodityId: "",
    quantity: "",
    unit: "Quintal",
    grade: "",
    pickupLocation: "",
    contact: "",
  });
  const [photo, setPhoto] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const runSync = async () => {
      await syncQueuedListings();
      setStatus((prev) =>
        prev?.type === "queued" ? { type: "success", crop: prev.crop } : prev,
      );
    };
    runSync();
    window.addEventListener("online", runSync);
    return () => window.removeEventListener("online", runSync);
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return setPhoto(null);
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setForm({
      commodityId: "",
      quantity: "",
      unit: "Quintal",
      grade: "",
      pickupLocation: "",
      contact: "",
    });
    setPhoto(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");

    const listing = {
      id: generateListingId(),
      ...form,
      photo,
      createdAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      await queueListing(listing);
      window.dispatchEvent(new Event("listings-updated"));
      setStatus({ type: "queued" });
      resetForm();
      return;
    }

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(listing),
      });
      if (!res.ok) throw new Error("Server error");
      await cacheMyListing({ ...listing, synced: true });
      window.dispatchEvent(new Event("listings-updated"));
      setStatus({ type: "success", crop: form.commodityId });
    } catch {
      await queueListing(listing);
      setStatus({ type: "queued" });
    }
    resetForm();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Crop
        </label>
        <select
          name="commodityId"
          value={form.commodityId}
          onChange={handleChange}
          required
          className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-orange-50 focus:outline-none focus:border-orange-600 focus:bg-white"
        >
          <option value="" disabled>
            Select crop
          </option>
          {COMMODITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Quantity
          </label>
          <input
            name="quantity"
            placeholder="10"
            value={form.quantity}
            onChange={handleChange}
            required
            className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-orange-50 focus:outline-none focus:border-orange-600 focus:bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Unit
          </label>
          <select
            name="unit"
            value={form.unit}
            onChange={handleChange}
            className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-orange-50 focus:outline-none focus:border-orange-600 focus:bg-white"
          >
            <option value="Quintal">Quintal</option>
            <option value="Kg">Kg</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Grade
        </label>
        <select
          name="grade"
          value={form.grade}
          onChange={handleChange}
          required
          className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-orange-50 focus:outline-none focus:border-orange-600 focus:bg-white"
        >
          <option value="" disabled>
            Select grade
          </option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Pickup Location
        </label>
        <input
          name="pickupLocation"
          placeholder="e.g. Bahir Dar, Amhara"
          value={form.pickupLocation}
          onChange={handleChange}
          required
          className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-orange-50 focus:outline-none focus:border-orange-600 focus:bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Phone Number
        </label>
        <input
          name="contact"
          placeholder="09XX XXX XXX"
          value={form.contact}
          onChange={handleChange}
          required
          className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-orange-50 focus:outline-none focus:border-orange-600 focus:bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Product Photo
        </label>
        <label className="flex items-center justify-center gap-2 border border-dashed border-stone-300 rounded-md px-3 py-3 text-sm text-stone-500 cursor-pointer hover:bg-orange-50">
          📷 Upload product photo
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </label>
        {photo && (
          <div className="mt-2">
            <img
              src={photo}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-stone-200"
            />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="text-sm border border-stone-300 rounded-md px-3 py-1 mt-2 text-stone-600 hover:bg-orange-50"
            >
              Remove photo
            </button>
          </div>
        )}
      </div>

      <button
        type="submit"
        className="bg-orange-800 text-white font-semibold rounded-md px-4 py-2.5 text-sm hover:bg-orange-900 transition"
      >
        List Produce
      </button>

      {status?.type === "success" && (
        <p className="bg-green-50 text-green-800 rounded-md px-3 py-2 text-sm">
          ✅ Produce listed successfully!
          <br />
          Your {status.crop} listing is now available to buyers.
        </p>
      )}
      {status?.type === "queued" && (
        <p className="bg-orange-50 text-orange-800 rounded-md px-3 py-2 text-sm">
          You're offline — this will sync automatically when connection returns.
        </p>
      )}
    </form>
  );
}
