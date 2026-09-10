<<<<<<< HEAD
import React from 'react';
import PriceBoard from './PriceBoard';
import SubmissionForm from './SubmissionForm';

export default function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Geberew Market</h1>
      <section style={{ marginBottom: '2rem' }}>
        <h2>Submit Price Observation</h2>
        <SubmissionForm />
      </section>
      <section>
        <PriceBoard />
      </section>
    </div>
  );
}
=======
import { useState } from "react";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import FarmerListingForm from "./FarmerListingForm.jsx";
import MyListings from "./MyListings.jsx";
import CooperativeSubmissionForm from "./CooperativeSubmissionForm.jsx";
import BuyerBrowse from "./component/BuyerBrowse.jsx";

export default function App() {
  const [activeView, setActiveView] = useState("dashboard");

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col">
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
      />

      <main className="mx-auto px-8 py-8 w-full flex-1">

        {/* Farmer Dashboard */}
        {activeView === "dashboard" && (
          <div className="max-w-sm mx-auto">
            <h1 className="text-2xl font-bold text-stone-800 mb-1">
              Farmer Listing
            </h1>

            <p className="text-stone-500 text-sm mb-6">
              List your produce for buyers to find.
            </p>

            <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-5">
              <FarmerListingForm />
            </div>
          </div>
        )}

        {/* My Listings */}
        {activeView === "mylistings" && (
          <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-green-800 mb-4">
              📋 My Listings
            </h2>

            <MyListings />
          </div>
        )}

        {/* Cooperative */}
        {activeView === "coop" && (
          <CooperativeSubmissionForm />
        )}

        {/* Buyer Browse */}
        {activeView === "buyer" && (
          <BuyerBrowse />
        )}

      </main>

      <Footer />
    </div>
  );
}
>>>>>>> origin/main
