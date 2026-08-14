import { useEffect, useState } from 'react';
import { getMyListings } from './offlineSync';

export default function MyListings() {
  const [listings, setListings] = useState([]);

  useEffect(() => {
    getMyListings().then(setListings);
  }, []);

  if (listings.length === 0) return <p>No listings yet.</p>;

  return (
    <ul>
      {listings.map((l) => (
        <li key={l.id}>
          {l.commodityId} — {l.quantity} ({l.grade}) — {l.pickupLocation}
          {!l.synced && ' (pending sync)'}
        </li>
      ))}
    </ul>
  );
}