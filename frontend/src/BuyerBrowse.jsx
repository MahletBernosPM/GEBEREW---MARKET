
import { useMemo, useState } from "react";

const mockListings = [
  {
    id: "listing-1",
    crop: "Teff",
    region: "Oromia",
    quantity: 25,
    unit: "quintal",
    grade: "Grade 1",
    pickup: "Adama",
    contact: "+251911111111",
    createdAt: "2026-08-27T08:30:00Z",
    distanceKm: 12,
  },
  {
    id: "listing-2",
    crop: "Maize",
    region: "Amhara",
    quantity: 40,
    unit: "quintal",
    grade: "Grade 2",
    pickup: "Bahir Dar",
    contact: "+251922222222",
    createdAt: "2026-08-26T14:00:00Z",
    distanceKm: 85,
  },
  {
    id: "listing-3",
    crop: "Wheat",
    region: "Oromia",
    quantity: 18,
    unit: "quintal",
    grade: "Grade 1",
    pickup: "Jimma",
    contact: "+251933333333",
    createdAt: "2026-08-25T10:15:00Z",
    distanceKm: 35,
  },
  {
    id: "listing-4",
    crop: "Red Onion",
    region: "Sidama",
    quantity: 60,
    unit: "quintal",
    grade: "Grade 1",
    pickup: "Hawassa",
    contact: "+251944444444",
    createdAt: "2026-08-24T09:00:00Z",
    distanceKm: 55,
  },
  {
    id: "listing-5",
    crop: "Coffee",
    region: "Oromia",
    quantity: 30,
    unit: "quintal",
    grade: "Washed Grade 1",
    pickup: "Jimma",
    contact: "+251955555555",
    createdAt: "2026-08-27T06:45:00Z",
    distanceKm: 20,
  },
];

const crops = ["All", ...new Set(mockListings.map((item) => item.crop))];
const regions = ["All", ...new Set(mockListings.map((item) => item.region))];
const grades = ["All", ...new Set(mockListings.map((item) => item.grade))];

const BuyerBrowse=()=> {
  const [search, setSearch] = useState("");
  const [crop, setCrop] = useState("All");
  const [region, setRegion] = useState("All");
  const [grade, setGrade] = useState("All");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const filteredListings = useMemo(() => {
    const result = mockListings.filter((listing) => {
      const searchValue = search.trim().toLowerCase();

      const matchesSearch =
        !searchValue ||
        listing.crop.toLowerCase().includes(searchValue) ||
        listing.region.toLowerCase().includes(searchValue) ||
        listing.pickup.toLowerCase().includes(searchValue);

      const matchesCrop = crop === "All" || listing.crop === crop;
      const matchesRegion = region === "All" || listing.region === region;
      const matchesGrade = grade === "All" || listing.grade === grade;

      const matchesMin =
        minQuantity === "" || listing.quantity >= Number(minQuantity);

      const matchesMax =
        maxQuantity === "" || listing.quantity <= Number(maxQuantity);

      return (
        matchesSearch &&
        matchesCrop &&
        matchesRegion &&
        matchesGrade &&
        matchesMin &&
        matchesMax
      );
    });

    result.sort((a, b) => {
      if (sortBy === "nearest") {
        return a.distanceKm - b.distanceKm;
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return result;
  }, [search, crop, region, grade, minQuantity, maxQuantity, sortBy]);

  const clearFilters = () => {
    setSearch("");
    setCrop("All");
    setRegion("All");
    setGrade("All");
    setMinQuantity("");
    setMaxQuantity("");
    setSortBy("newest");
  };

  const handleInquiry = (listing) => {
    // Temporary UI-only action.
    // Later this will call POST /api/inquiries.
    console.log("Inquiry requested for listing:", listing.id);
    alert(`Inquiry started for ${listing.crop} listing.`);
  };

  return (
    <section className="w-full rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-900">
          Buyer Browse
        </h2>

        <p className="mt-1 text-sm text-stone-600">
          Search and compare farmer listings by crop, region, quantity, and grade.
        </p>
      </div>

      {/* Search */}
      <div className="mb-5">
        <label
          htmlFor="listing-search"
          className="mb-2 block text-sm font-medium text-stone-700"
        >
          Search listings
        </label>

        <input
          id="listing-search"
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search crop, region, or pickup location..."
          className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
        />
      </div>

      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700">
            Crop
          </label>

          <select
            value={crop}
            onChange={(event) => setCrop(event.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-3 text-sm outline-none focus:border-amber-500"
          >
            {crops.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700">
            Region
          </label>

          <select
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-3 text-sm outline-none focus:border-amber-500"
          >
            {regions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700">
            Grade
          </label>

          <select
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-3 text-sm outline-none focus:border-amber-500"
          >
            {grades.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700">
            Minimum quantity
          </label>

          <input
            type="number"
            min="0"
            value={minQuantity}
            onChange={(event) => setMinQuantity(event.target.value)}
            placeholder="e.g. 10"
            className="w-full rounded-lg border border-stone-300 px-3 py-3 text-sm outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700">
            Maximum quantity
          </label>

          <input
            type="number"
            min="0"
            value={maxQuantity}
            onChange={(event) => setMaxQuantity(event.target.value)}
            placeholder="e.g. 50"
            className="w-full rounded-lg border border-stone-300 px-3 py-3 text-sm outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700">
            Sort by
          </label>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-3 text-sm outline-none focus:border-amber-500"
          >
            <option value="newest">Newest</option>
            <option value="nearest">Nearest</option>
          </select>
        </div>
      </div>

      {/* Results header */}
      <div className="mt-6 flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-600">
          {filteredListings.length}{" "}
          {filteredListings.length === 1 ? "listing" : "listings"} found
        </p>

        <button
          type="button"
          onClick={clearFilters}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
        >
          Clear filters
        </button>
      </div>

      {/* Results */}
      <div className="mt-5 space-y-4">
        {filteredListings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-6 py-10 text-center">
            <h3 className="text-lg font-semibold text-stone-900">
              No listings found
            </h3>

            <p className="mt-2 text-sm text-stone-600">
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          filteredListings.map((listing) => (
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
                      <span className="font-medium text-stone-800">
                        Quantity:
                      </span>{" "}
                      {listing.quantity} {listing.unit}
                    </p>

                    <p>
                      <span className="font-medium text-stone-800">
                        Region:
                      </span>{" "}
                      {listing.region}
                    </p>

                    <p>
                      <span className="font-medium text-stone-800">
                        Pickup:
                      </span>{" "}
                      {listing.pickup}
                    </p>

                    <p>
                      <span className="font-medium text-stone-800">
                        Distance:
                      </span>{" "}
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
          ))
        )}
      </div>
    </section>
  );
}
 export default BuyerBrowse
