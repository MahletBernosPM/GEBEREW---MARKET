import { useEffect, useState } from 'react';

// TASK: Daily price board view
// Shows today's aggregated prices, pulled from /api/price-index
export default function PriceBoard() {
  const [prices, setPrices] = useState([]);

  useEffect(() => {
    fetch('/api/price-index')
      .then((res) => res.json())
      .then(setPrices)
      .catch((err) => console.error('Failed to load price index', err));
  }, []);

  return (
    <div>
      <h1>Today's Prices</h1>
      <table>
        <thead>
          <tr>
            <th>Commodity</th>
            <th>Average Price</th>
            <th>Submissions</th>
          </tr>
        </thead>
        <tbody>
          {prices.map((p) => (
            <tr key={p.commodityId}>
              <td>{p.commodityId}</td>
              <td>{p.averagePrice.toFixed(2)}</td>
              <td>{p.submissionCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
