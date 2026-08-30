import { useMemo, useState } from "react";

import Filter from "./pages/Filter";
import { mockListings } from "./pages/mockListing";
import ResultGrid from "./pages/ResulatGrid";

const BuyerBrowse = () => {
  const [search, setSearch] = useState("");
  const [crop, setCrop] = useState("All");
  const [region, setRegion] = useState("All");
  const [grade, setGrade] = useState("All");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // this is mock listing for testing purpose I replaced real listing backend api end point
  const filteredListings = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    const result = mockListings.filter((listing) => {
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

  // inquery later I replaced query api endpoint
  const handleInquiry = (listing) => {
    console.log("Inquiry requested:", listing.id);

    alert(`Inquiry started for ${listing.crop} listing.`);
  };

  return (
    <section className="w-full rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-900">Buyer Browse</h2>

        <p className="mt-1 text-sm text-stone-600">
          Search and compare farmer listings by crop, region, quantity, and
          grade.
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

      <Filter
        crop={crop}
        setCrop={setCrop}
        region={region}
        setRegion={setRegion}
        grade={grade}
        setGrade={setGrade}
        minQuantity={minQuantity}
        setMinQuantity={setMinQuantity}
        maxQuantity={maxQuantity}
        setMaxQuantity={setMaxQuantity}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* Results header */}
      <div className="mt-6 flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-600">
          {filteredListings.length}{" "}
          {filteredListings.length === 1 ? "listing" : "listings"} found
        </p>

        <button
          type="button"
          onClick={clearFilters}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 shadow-lg cursor-pointer"
        >
          Clear filters
        </button>
      </div>

      <ResultGrid
        filteredListings={filteredListings}
        handleInquiry={handleInquiry}
      />
    </section>
  );
};

export default BuyerBrowse;
