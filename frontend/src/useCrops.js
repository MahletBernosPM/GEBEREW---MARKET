import { useEffect, useState } from 'react';

export function cropLabel(c) {
  const parts = [c.nameEn, c.nameAm, c.nameOm].filter(Boolean);
  return parts.join(' — ');
}

export function useCrops() {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/crops')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load crops');
        return res.json();
      })
      .then((data) => setCrops(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return { crops, loading, error };
}