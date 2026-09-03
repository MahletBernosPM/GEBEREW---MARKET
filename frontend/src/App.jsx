import { useState, useCallback } from "react";
import PriceBoard from "./PriceBoard";
import SubmissionForm from "./SubmissionForm";
import OperatorQueue from "./OperatorQueue";
import PriceTrendChart from "./PriceTrendChart";

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <h1 className="text-2xl font-bold mb-6 text-stone-900">
        Geberew Market — Dev Preview
      </h1>

      <div className="flex flex-col md:flex-row gap-6 items-stretch md:items-start">
  <SubmissionForm onSubmitted={bumpRefresh} />
  <OperatorQueue refreshKey={refreshKey} onDecision={bumpRefresh} />
</div>

      <div className="mt-8 max-w-2xl [&_table]:w-full [&_table]:border-collapse [&_th]:text-left [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-amber-700 [&_th]:pb-2 [&_td]:py-2 [&_td]:border-b [&_td]:border-stone-200 [&_th]:border-b [&_th]:border-stone-200 [&_td]:text-sm">
        <PriceBoard refreshKey={refreshKey} />
      </div>

      <div className="mt-8 max-w-2xl">
        <PriceTrendChart />
      </div>
    </div>
  );
}