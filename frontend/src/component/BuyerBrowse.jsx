import { useEffect, useMemo, useState } from "react";

import Filter from "./pages/Filter";
import ResultGrid from "./pages/ResulatGrid";

const API_URL = "http://localhost:4000";

const BuyerBrowse = () => {
  const [listings, setListings] = useState([]);

  const [search, setSearch] = useState("");
  const [crop, setCrop] = useState("All");
  const [region, setRegion] = useState("All");
  const [grade, setGrade] = useState("All");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load real listings from backend
  useEffect(() => {
    const loadListings = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/api/listings`);

        if (!response.ok) {
          throw new Error("Failed to load listings");
        }

        const data = await response.json();

        const formattedListings = data.map((listing) => ({
          id: listing.id,

          crop:
            listing.crop?.nameEn ||
            listing.crop?.nameAm ||
            "Unknown crop",

          cropId: listing.cropId,

          region:
            listing.market?.region ||
            listing.pickup ||
            "Unknown region",

          quantity: Number(listing.quantity),

          unit: listing.unit || "quintal",

          grade: listing.grade || "Not specified",

          pickup: listing.pickup || "Not specified",

          contact: listing.contact,

          createdAt: listing.createdAt,

          market: listing.market,

          // Backend does not provide distance yet
          distanceKm: null,
        }));

        setListings(formattedListings);
      } catch (err) {
        console.error("Failed to load listings:", err);
        setError("Failed to load listings.");
      } finally {
        setLoading(false);
      }
    };

    loadListings();
  }, []);

  // Search + filter + sorting
  const filteredListings = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    const result = listings.filter((listing) => {
      const matchesSearch =
        !searchValue ||
        listing.crop.toLowerCase().includes(searchValue) ||
        listing.region.toLowerCase().includes(searchValue) ||
        listing.pickup.toLowerCase().includes(searchValue);

      const matchesCrop =
        crop === "All" || listing.crop === crop;

      const matchesRegion =
        region === "All" || listing.region === region;

      const matchesGrade =
        grade === "All" || listing.grade === grade;

      const matchesMin =
        minQuantity === "" ||
        listing.quantity >= Number(minQuantity);

      const matchesMax =
        maxQuantity === "" ||
        listing.quantity <= Number(maxQuantity);

      return (
        matchesSearch &&
        matchesCrop &&
        matchesRegion &&
        matchesGrade &&
        matchesMin &&
        matchesMax
      );
    });

    // Sorting
    if (sortBy === "nearest") {
      result.sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;

        return a.distanceKm - b.distanceKm;
      });
    } else {
      result.sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      );
    }

    return result;
  }, [
    listings,
    search,
    crop,
    region,
    grade,
    minQuantity,
    maxQuantity,
    sortBy,
  ]);

  const clearFilters = () => {
    setSearch("");
    setCrop("All");
    setRegion("All");
    setGrade("All");
    setMinQuantity("");
    setMaxQuantity("");
    setSortBy("newest");
  };

  const handleInquiry = async (listing) => {
    console.log("Inquiry requested:", listing.id);

    // We will replace this with POST /api/inquiries
    // after creating the backend endpoint.
    alert(`Inquiry started for ${listing.crop} listing.`);
  };

  if (loading) {
    return (
      <section className="w-full rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-stone-600">
          Loading listings...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-red-600">{error}</p>
      </section>
    );
  }

  return (
    <section className="w-full rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-900">
          Buyer Browse
        </h2>

        <p className="mt-1 text-sm text-stone-600">
          Search and compare farmer listings by crop,
          region, quantity, and grade.
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
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search crop, region, or pickup location..."
          className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
        />
      </div>

      <Filter
        listings={listings}
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
          {filteredListings.length === 1
            ? "listing"
            : "listings"}{" "}
          found
        </p>

        <button
          type="button"
          onClick={clearFilters}
          className="cursor-pointer rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 shadow-lg transition hover:bg-stone-100"
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