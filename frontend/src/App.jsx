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
