import { mockListings } from "./mockListing";

const Filter = ({
  crop,
  setCrop,
  region,
  setRegion,
  grade,
  setGrade,
  minQuantity,
  setMinQuantity,
  maxQuantity,
  setMaxQuantity,
  sortBy,
  setSortBy,
}) => {
  const crops = ["All", ...new Set(mockListings.map((item) => item.crop))];

  const regions = ["All", ...new Set(mockListings.map((item) => item.region))];

  const grades = ["All", ...new Set(mockListings.map((item) => item.grade))];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Crop */}
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

      {/* Region */}
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

      {/* Grade */}
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

      {/* Minimum quantity */}
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

      {/* Maximum quantity */}
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

      {/* Sort */}
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
  );
};

export default Filter;
