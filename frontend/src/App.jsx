import { useState } from 'react';
import Header from './Header.jsx';
import Hero from './Hero.jsx';
import Footer from './Footer.jsx';
import FarmerListingForm from './FarmerListingForm.jsx';
import MyListings from './MyListings.jsx';
import CooperativeSubmissionForm from './CooperativeSubmissionForm.jsx';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col">
      <Header activeView={activeView} setActiveView={setActiveView} />
      {activeView === 'dashboard' && <Hero />}

      <main className="mx-auto px-8 py-8 w-full flex-1">
        {activeView === 'dashboard' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-green-800 mb-4">🌾 Farmer Listing</h2>
              <FarmerListingForm />
            </div>
          </div>
        )}


        {activeView === 'mylistings' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-green-800 mb-4">📋 My Listings</h2>
              <MyListings />
            </div>
          </div>
        )}

        {activeView === 'coop' && <CooperativeSubmissionForm />}
      </main>

      <Footer />
    </div>
  );
}