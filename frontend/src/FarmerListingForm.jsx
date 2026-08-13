import { useState, useEffect } from 'react';
import { queueListing, syncQueuedListings } from './offlineSync';

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

// TASK 4: Farmer Listing Form & PWA Offline Sync
// Lets a farmer list produce for sale; queues locally if offline and syncs when back online
export default function FarmerListingForm() {
  const [form, setForm] = useState({
    farmerName: '',
    phone: '',
    commodityId: '',
    quantity: '',
    price: '',
    region: '',
  });
  const [status, setStatus] = useState(null);

  useEffect(() => {
    // Try to flush any queued listings on mount and whenever we come back online
    syncQueuedListings();
    window.addEventListener('online', syncQueuedListings);
    return () => window.removeEventListener('online', syncQueuedListings);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');

    if (!navigator.onLine) {
      await queueListing(form);
      setStatus('queued');
      return;
    }

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        await queueListing(form);
        setStatus('queued');
      }
    } catch {
      await queueListing(form);
      setStatus('queued');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="farmerName" placeholder="Farmer name" onChange={handleChange} required />
      <input name="phone" placeholder="Phone number" onChange={handleChange} required />
      <select name="commodityId" onChange={handleChange} required defaultValue="">
        <option value="" disabled>Select commodity</option>
        {COMMODITIES.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <input name="quantity" placeholder="Quantity" onChange={handleChange} required />
      <input name="price" placeholder="Asking price" onChange={handleChange} required />
      <input name="region" placeholder="Region (e.g. Oromia)" onChange={handleChange} required />
      <button type="submit">List produce</button>
      {status === 'success' && <p>Listed successfully!</p>}
      {status === 'queued' && <p>You're offline — this will sync automatically when connection returns.</p>}
      {status === 'error' && <p>Something went wrong.</p>}
    </form>
  );
}