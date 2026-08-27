<<<<<<< HEAD
import { useState } from "react";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import FarmerListingForm from "./FarmerListingForm.jsx";
import MyListings from "./MyListings.jsx";
import CooperativeSubmissionForm from "./CooperativeSubmissionForm.jsx";
=======
import { useState, useCallback } from "react";
import PriceBoard from "./PriceBoard";
import SubmissionForm from "./SubmissionForm";
import OperatorQueue from "./OperatorQueue";
import BuyerBrowse from "./BuyerBrowse";
>>>>>>> 0ed4f03 (task 7 demo)

export default function App() {
  const [activeView, setActiveView] = useState("dashboard");

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col">
      <Header activeView={activeView} setActiveView={setActiveView} />

      <main className="mx-auto px-8 py-8 w-full flex-1">
        {activeView === "dashboard" && (
          <div className="max-w-sm mx-auto">
            <h1 className="text-2xl font-bold text-stone-800 mb-1">Farmer Listing</h1>
            <p className="text-stone-500 text-sm mb-6">List your produce for buyers to find.</p>
            <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-5">
              <FarmerListingForm />
            </div>
          </div>
        )}

<<<<<<< HEAD
        {activeView === "mylistings" && (
          <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-green-800 mb-4">
              📋 My Listings
            </h2>
            <MyListings />
          </div>
        )}

        {activeView === "coop" && <CooperativeSubmissionForm />}
      </main>

      <Footer />
=======
      <div className="mt-8 max-w-2xl [&_table]:w-full [&_table]:border-collapse [&_th]:text-left [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-amber-700 [&_th]:pb-2 [&_td]:py-2 [&_td]:border-b [&_td]:border-stone-200 [&_th]:border-b [&_th]:border-stone-200 [&_td]:text-sm">
        <PriceBoard refreshKey={refreshKey} />
      </div>
      <div className="mt-8">
        <BuyerBrowse />
      </div>
>>>>>>> 0ed4f03 (task 7 demo)
    </div>
  );
}