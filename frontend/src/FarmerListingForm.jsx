import { useState, useEffect } from 'react';
import { queueListing, syncQueuedListings, cacheMyListing, generateListingId } from './offlineSync';

const COMMODITIES = [
  { id: 'teff', name: 'Teff' },
  { id: 'wheat', name: 'Wheat' },
  { id: 'maize', name: 'Maize' },
  { id: 'coffee', name: 'Coffee (Green)' },
  { id: 'sorghum', name: 'Sorghum' },
  { id: 'barley', name: 'Barley' },
  { id: 'chickpeas', name: 'Chickpeas' },
  { id: 'onion', name: 'Onion' },
  { id: 'potato', name: 'Potato' },
  { id: 'tomato', name: 'Tomato' },
];

const GRADES = ['Grade A', 'Grade B', 'Grade C'];

// TASK 4: Farmer Listing Form & PWA Offline Sync
export default function FarmerListingForm() {
  const [form, setForm] = useState({
    commodityId: '',
    quantity: '',
    grade: '',
    pickupLocation: '',
    contact: '',
  });
  const [photo, setPhoto] = useState(null); // base64 data URL, optional
  const [status, setStatus] = useState(null);

 useEffect(() => {
  const runSync = async () => {
    await syncQueuedListings();
    setStatus((prev) => (prev === 'queued' ? 'success' : prev));
  };
  runSync();
  window.addEventListener('online', runSync);
  return () => window.removeEventListener('online', runSync);
}, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return setPhoto(null);
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setForm({ commodityId: '', quantity: '', grade: '', pickupLocation: '', contact: '' });
    setPhoto(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');

    // Client-generated ID: identifies this listing from creation through
    // offline queueing and eventual sync, so retries never duplicate it.
    const listing = {
      id: generateListingId(),
      ...form,
      photo,
      createdAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      await queueListing(listing);
      setStatus('queued');
      resetForm();
      return;
    }

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listing),
      });
      if (!res.ok) throw new Error('Server error');
      await cacheMyListing({ ...listing, synced: true });
      setStatus('success');
    } catch {
      await queueListing(listing);
      setStatus('queued');
    }
    resetForm();
  };

  return (
    <form onSubmit={handleSubmit}>
      <select name="commodityId" value={form.commodityId} onChange={handleChange} required>
        <option value="" disabled>Select crop</option>
        {COMMODITIES.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <input name="quantity" placeholder="Quantity (e.g. 10 quintal)" value={form.quantity} onChange={handleChange} required />
      <select name="grade" value={form.grade} onChange={handleChange} required>
        <option value="" disabled>Select grade</option>
        {GRADES.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
      <input name="pickupLocation" placeholder="Pickup location" value={form.pickupLocation} onChange={handleChange} required />
      <input name="contact" placeholder="Contact (phone number)" value={form.contact} onChange={handleChange} required />
      <input type="file" accept="image/*" onChange={handlePhotoChange} />
      {photo && (
  <div>
    <img src={photo} alt="Preview" style={{ maxWidth: '150px', display: 'block', marginTop: '8px' }} />
    <button type="button" onClick={() => setPhoto(null)}>Remove photo</button>
  </div>
)}
      <button type="submit">List produce</button>
      {status === 'success' && <p>Listed successfully!</p>}
      {status === 'queued' && <p>You're offline — this will sync automatically when connection returns.</p>}
    </form>
  );
}