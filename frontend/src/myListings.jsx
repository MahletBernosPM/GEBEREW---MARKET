import { useEffect, useState } from 'react';
import {
  getMyListings,
  updateListingRemote,
  deleteListingRemote,
  updateCachedListing,
  removeCachedListing,
} from './offlineSync';

const GRADES = ['Grade A', 'Grade B', 'Grade C'];

export default function MyListings() {
  const [listings, setListings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
  const refresh = () => getMyListings().then(setListings);
  refresh();
  window.addEventListener('listings-updated', refresh);
  return () => window.removeEventListener('listings-updated', refresh);
}, []);

  const startEdit = (listing) => {
    setEditingId(listing.id);
    setEditForm({ quantity: listing.quantity, grade: listing.grade, pickupLocation: listing.pickupLocation });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError(null);
  };

  const saveEdit = async (id) => {
    if (!navigator.onLine) {
      setError('You need to be online to save changes.');
      return;
    }
    try {
      await updateListingRemote(id, editForm);
      const updated = { ...listings.find((l) => l.id === id), ...editForm };
      await updateCachedListing(id, updated);
      setListings((prev) => prev.map((l) => (l.id === id ? updated : l)));
      setEditingId(null);
    } catch {
      setError('Could not save changes — please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!navigator.onLine) {
      setError('You need to be online to delete a listing.');
      return;
    }
    try {
      await deleteListingRemote(id);
      await removeCachedListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch {
      setError('Could not delete — please try again.');
    }
  };

  if (listings.length === 0) return <p className="text-stone-500 text-sm">No listings yet.</p>;

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="bg-red-50 text-red-700 rounded-md px-3 py-2 text-sm">{error}</p>}
      {listings.map((l) => (
        <div key={l.id} className="flex gap-3 bg-orange-50 border border-stone-200 rounded-lg p-3">
          {l.photo && (
            <img src={l.photo} alt={l.commodityId} className="w-16 h-16 object-cover rounded-md border border-stone-200" />
          )}
          <div className="flex-1">
            {editingId === l.id ? (
              <div className="flex flex-col gap-2">
                <input
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                  className="border border-stone-300 rounded-md px-2 py-1 text-sm"
                  placeholder="Quantity"
                />
                <select
                  value={editForm.grade}
                  onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                  className="border border-stone-300 rounded-md px-2 py-1 text-sm"
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <input
                  value={editForm.pickupLocation}
                  onChange={(e) => setEditForm({ ...editForm, pickupLocation: e.target.value })}
                  className="border border-stone-300 rounded-md px-2 py-1 text-sm"
                  placeholder="Pickup location"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(l.id)}
                    className="text-sm bg-green-800 text-white rounded-md px-3 py-1.5 hover:bg-green-900"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-sm border border-stone-300 rounded-md px-3 py-1.5 text-stone-600 hover:bg-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-stone-800 text-sm">
                    {l.commodityId} — {l.grade}
                  </p>
                  <span className="text-xs bg-green-100 text-green-800 rounded-full px-2 py-0.5">
                    {l.synced === false ? 'Pending sync' : 'Active'}
                  </span>
                </div>
               <p className="text-stone-500 text-sm">
  {l.quantity} {l.unit} • {l.pickupLocation}
</p>
{l.price && <p className="text-stone-700 text-sm font-medium">💰 {l.price} ETB / {l.unit}</p>}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => startEdit(l)}
                    className="text-sm border border-stone-300 rounded-md px-3 py-1 text-stone-600 hover:bg-white"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(l.id)}
                    className="text-sm border border-red-200 text-red-600 rounded-md px-3 py-1 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}