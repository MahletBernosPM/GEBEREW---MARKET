// import PriceBoard from './PriceBoard.jsx';
import Header from './Header.jsx';
import Hero from './Hero.jsx';
import Footer from './Footer.jsx';
import SubmissionForm from './SubmissionForm.jsx';
import FarmerListingForm from './FarmerListingForm.jsx';
import MyListings from './MyListings.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-orange-50 flex flex-col">
      <Header />
      <Hero />
      
<main className="max-w-6xl mx-auto px-6 py-8 w-full">
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-green-800 mb-4">🌾 Farmer Listing</h2>
      <FarmerListingForm />
    </div>

    <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-green-800 mb-4">🤝 Cooperative Submission</h2>
      <SubmissionForm />
    </div>

    <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-green-800 mb-4">📋 My Listings</h2>
      <MyListings />
    </div>
  </div>
</main>

      <Footer />
    </div>
  );
}