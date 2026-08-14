// import PriceBoard from './PriceBoard.jsx';
import SubmissionForm from './SubmissionForm.jsx';
import FarmerListingForm from './FarmerListingForm.jsx';
import MyListings from './MyListings.jsx';

export default function App() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      <h1>Geberew Market</h1>
      {/* <h2>Price Board</h2>
      {/* <PriceBoard /> */}
      <h2>My Listings</h2>
      <MyListings />
      <h2>Farmer Listing</h2>
      <FarmerListingForm />
      <h2>Cooperative Submission</h2>
      <SubmissionForm />
    </div>
  );
}