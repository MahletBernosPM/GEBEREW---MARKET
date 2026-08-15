export default function Hero() {
  return (
    <section className="bg-lime-50 px-6 py-10">
      <h2 className="text-3xl font-bold text-green-900 mb-2">Welcome to Geberew Market</h2>
      <p className="text-stone-600 max-w-md mb-6">
        Connecting Ethiopian farmers and buyers through transparent wholesale prices.
      </p>
      <div className="flex flex-wrap gap-6 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-xl">📈</span>
          <div>
            <p className="font-semibold text-stone-800">Transparent Prices</p>
            <p className="text-stone-500">Verified wholesale prices from cooperatives</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-xl">🤝</span>
          <div>
            <p className="font-semibold text-stone-800">More Connections</p>
            <p className="text-stone-500">Linking farmers with trusted buyers</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-xl">📱</span>
          <div>
            <p className="font-semibold text-stone-800">Accessible for All</p>
            <p className="text-stone-500">Works on smartphones and SMS</p>
          </div>
        </div>
      </div>
    </section>
  );
}