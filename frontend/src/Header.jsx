export default function Header({ activeView, setActiveView }) {
  const navItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'mylistings', label: 'My Listings' },
  { key: 'coop', label: 'Cooperative Submission' },
];

  return (
    <header className="bg-green-900 text-white px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold leading-tight">🌿 Geberew Market</h1>
        <p className="text-xs text-green-200">Transparent prices, stronger farmers.</p>
      </div>
      <nav className="hidden md:flex gap-6 text-sm font-medium">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveView(item.key)}
            className={
              activeView === item.key
                ? 'border-b-2 border-lime-400 pb-1'
                : 'hover:text-lime-300'
            }
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}