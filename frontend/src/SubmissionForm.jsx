import { useState } from 'react';

// TASK: Cooperative submission form
// Lets a cooperative submit a price observation for a commodity
export default function SubmissionForm() {
  const [form, setForm] = useState({
    commodityId: '',
    price: '',
    cooperativeName: '',
    region: '',
  });
  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="cooperativeName" placeholder="Cooperative name" onChange={handleChange} required />
      <input name="commodityId" placeholder="Commodity (e.g. teff)" onChange={handleChange} required />
      <input name="price" type="number" placeholder="Price" onChange={handleChange} required />
      <input name="region" placeholder="Region (e.g. Oromia)" onChange={handleChange} required />
      <button type="submit">Submit price</button>
      {status === 'success' && <p>Submitted!</p>}
      {status === 'error' && <p>Something went wrong.</p>}
    </form>
  );
}
