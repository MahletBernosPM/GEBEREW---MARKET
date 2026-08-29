import React from "react";

const ResultGrid = ({ filteredListings, handleInquiry }) => {
  if (filteredListings.length === 0) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-6 py-10 text-center">
        <h3 className="text-lg font-semibold text-stone-900">
          No listings found
        </h3>

        <p className="mt-2 text-sm text-stone-600">
          Try changing your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {filteredListings.map((listing) => (
        <article
          key={listing.id}
          className="rounded-xl border border-stone-200 bg-stone-50 p-5 transition hover:shadow-md"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-stone-900">
                  {listing.crop}
                </h3>

                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  {listing.grade}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
                <p>
                  <span className="font-medium text-stone-800">Quantity:</span>
                  {listing.quantity} {listing.unit}
                </p>

                <p>
                  <span className="font-medium text-stone-800">Region:</span>
                  {listing.region}
                </p>

                <p>
                  <span className="font-medium text-stone-800">Pickup:</span>
                  {listing.pickup}
                </p>

                <p>
                  <span className="font-medium text-stone-800">Distance:</span>
                  {listing.distanceKm} km
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={`tel:${listing.contact}`}
                className="rounded-lg bg-stone-900 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-stone-700"
              >
                Call
              </a>

              <button
                type="button"
                onClick={() => handleInquiry(listing)}
                className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                Send Inquiry
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

export default ResultGrid;
