import { useState } from "react";
import { queueListing, cacheMyListing, generateListingId } from "./offlineSync";
import { COMMODITIES, GRADES } from "./constants";

const INITIAL_MEMBERS = [
  { id: "m1", name: "Almaz Bekele", phone: "0911223344" },
  { id: "m2", name: "Girma Tesfaye", phone: "0922334455" },
  { id: "m3", name: "Hana Wolde", phone: "0933445566" },
  { id: "m4", name: "Kebede Alemu", phone: "0944556677" },
];

// TASK 6: Cooperative Submission — a rep submits one shared listing on
// behalf of several selected members in a single flow.
export default function CooperativeSubmissionForm() {
  const [cooperativeName, setCooperativeName] = useState("");
  const [repName, setRepName] = useState("");
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", phone: "" });
  const [listing, setListing] = useState({
    commodityId: "",
    quantity: "",
    unit: "Quintal",
    grade: "",
    pickupLocation: "",
  });
  const [status, setStatus] = useState(null);

  const toggleMember = (id) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const handleAddMember = () => {
    if (!newMember.name.trim() || !newMember.phone.trim()) return;
    const id = `custom-${Date.now()}`;
    setMembers((prev) => [...prev, { id, ...newMember }]);
    setSelectedMembers((prev) => [...prev, id]);
    setNewMember({ name: "", phone: "" });
    setShowAddMember(false);
  };

  const handleListingChange = (e) =>
    setListing({ ...listing, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedMembers.length === 0) {
      setStatus({ type: "error", message: "Select at least one member." });
      return;
    }
    if (
      !listing.commodityId ||
      !listing.quantity ||
      !listing.grade ||
      !listing.pickupLocation
    ) {
      setStatus({ type: "error", message: "Fill in all listing details." });
      return;
    }

    setStatus({ type: "submitting" });
    const chosen = members.filter((m) => selectedMembers.includes(m.id));

    for (const member of chosen) {
      const entry = {
        id: generateListingId(),
        ...listing,
        contact: member.phone,
        submittedBy: repName,
        cooperativeName,
        createdAt: new Date().toISOString(),
      };
      if (!navigator.onLine) {
        await queueListing(entry);
        continue;
      }
      try {
        const res = await fetch("/api/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        });
        if (!res.ok) throw new Error("Server error");
        await cacheMyListing({ ...entry, synced: true });
      } catch {
        await queueListing(entry);
      }
    }

    window.dispatchEvent(new Event("listings-updated"));
    setStatus({ type: "success", count: chosen.length });
    setSelectedMembers([]);
    setListing({
      commodityId: "",
      quantity: "",
      unit: "Quintal",
      grade: "",
      pickupLocation: "",
    });
  };

  return (
    <div className="px-6 py-8 w-full">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">
        Cooperative Submission
      </h1>
      <p className="text-stone-500 text-sm mb-6">
        Submit produce on behalf of cooperative members.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-stone-200 rounded-lg shadow-sm p-6 flex flex-col gap-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Cooperative Name
            </label>
            <input
              value={cooperativeName}
              onChange={(e) => setCooperativeName(e.target.value)}
              placeholder="Enter cooperative name"
              required
              className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-stone-50 focus:outline-none focus:border-green-700 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Submitted By (Rep)
            </label>
            <input
              value={repName}
              onChange={(e) => setRepName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-stone-50 focus:outline-none focus:border-green-700 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Members Included in This Submission
          </label>
          <div className="border border-stone-200 rounded-md divide-y divide-stone-100">
            {members.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-stone-50"
              >
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(m.id)}
                  onChange={() => toggleMember(m.id)}
                  className="accent-green-700"
                />
                <span className="font-medium text-stone-800">{m.name}</span>
                <span className="text-stone-500">{m.phone}</span>
              </label>
            ))}
          </div>

          {showAddMember ? (
            <div className="border border-dashed border-stone-300 rounded-md p-3 mt-2 flex flex-col sm:flex-row gap-2">
              <input
                value={newMember.name}
                onChange={(e) =>
                  setNewMember({ ...newMember, name: e.target.value })
                }
                placeholder="Member name"
                className="flex-1 border border-stone-300 rounded-md px-3 py-2 text-sm bg-stone-50"
              />
              <input
                value={newMember.phone}
                onChange={(e) =>
                  setNewMember({ ...newMember, phone: e.target.value })
                }
                placeholder="Phone number"
                className="flex-1 border border-stone-300 rounded-md px-3 py-2 text-sm bg-stone-50"
              />
              <button
                type="button"
                onClick={handleAddMember}
                className="bg-green-800 text-white text-sm rounded-md px-4 py-2 hover:bg-green-900"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="border border-stone-300 text-stone-600 text-sm rounded-md px-4 py-2 hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddMember(true)}
              className="mt-2 text-sm border border-stone-300 rounded-md px-3 py-1.5 text-green-800 hover:bg-green-50"
            >
              + Add Member
            </button>
          )}
        </div>

        <div className="border-t border-stone-100 pt-5">
          <p className="text-sm font-medium text-stone-700 mb-3">
            Listing details apply to each selected member.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Crop
              </label>
              <select
                name="commodityId"
                value={listing.commodityId}
                onChange={handleListingChange}
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-stone-50 focus:outline-none focus:border-green-700 focus:bg-white"
              >
                <option value="" disabled>
                  Select crop
                </option>
               {COMMODITIES.map((c) => (
  <option key={c.id} value={c.id}>{c.label}</option>
))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Quantity
                </label>
                <input
                  name="quantity"
                  value={listing.quantity}
                  onChange={handleListingChange}
                  placeholder="10"
                  className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-stone-50 focus:outline-none focus:border-green-700 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Unit
                </label>
                <select
                  name="unit"
                  value={listing.unit}
                  onChange={handleListingChange}
                  className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-stone-50 focus:outline-none focus:border-green-700 focus:bg-white"
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
                value={listing.grade}
                onChange={handleListingChange}
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-stone-50 focus:outline-none focus:border-green-700 focus:bg-white"
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
                value={listing.pickupLocation}
                onChange={handleListingChange}
                placeholder="e.g. Bahir Dar, Amhara"
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-stone-50 focus:outline-none focus:border-green-700 focus:bg-white"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="self-start bg-green-800 text-white font-semibold rounded-md px-8 py-2.5 text-sm hover:bg-green-900 transition"
        >
          Submit for Members
        </button>

        {status?.type === "error" && (
          <p className="bg-red-50 text-red-700 rounded-md px-3 py-2 text-sm">
            {status.message}
          </p>
        )}
        {status?.type === "success" && (
          <p className="bg-green-50 text-green-800 rounded-md px-3 py-2 text-sm">
            ✅ Submitted listings for {status.count} member
            {status.count > 1 ? "s" : ""}.
          </p>
        )}
      </form>
    </div>
  );
}
