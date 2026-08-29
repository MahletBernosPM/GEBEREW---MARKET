import { useState, useCallback } from "react";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import FarmerListingForm from "./FarmerListingForm.jsx";
import MyListings from "./MyListings.jsx";
import CooperativeSubmissionForm from "./CooperativeSubmissionForm.jsx";
import PriceBoard from "./PriceBoard";
import SubmissionForm from "./SubmissionForm";
import OperatorQueue from "./OperatorQueue";
import BuyerBrowse from "./BuyerBrowse";

export default function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  const bumpRefresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <Header />

      <h1 className="text-2xl font-bold mb-6 text-stone-900">
        Geberew Market — Dev Preview
      </h1>

      <div className="flex flex-col md:flex-row gap-6 items-stretch md:items-start">
        <SubmissionForm onSubmitted={bumpRefresh} />
        <OperatorQueue
          refreshKey={refreshKey}
          onDecision={bumpRefresh}
        />
      </div>

      <div className="mt-8 max-w-2xl [&_table]:w-full [&_table]:border-collapse [&_th]:text-left [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-amber-700 [&_th]:pb-2 [&_td]:py-2 [&_td]:border-b [&_td]:border-stone-200 [&_th]:border-b [&_th]:border-stone-200 [&_td]:text-sm">
        <PriceBoard refreshKey={refreshKey} />
      </div>

      <div className="mt-8">
        <BuyerBrowse />
      </div>

      <Footer />
    </div>
  );
}