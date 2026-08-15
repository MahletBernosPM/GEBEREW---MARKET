export default function Header() {
  return (
    <header className="bg-green-900 text-white px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold leading-tight">🌿 Geberew Market</h1>
        <p className="text-xs text-green-200">Transparent prices, stronger farmers.</p>
      </div>
      <nav className="hidden md:flex gap-6 text-sm font-medium">
        <a href="#" className="border-b-2 border-lime-400 pb-1">Home</a>
        <a href="#" className="hover:text-lime-300">Listings</a>
        <a href="#" className="hover:text-lime-300">Cooperatives</a>
        <a href="#" className="hover:text-lime-300">About Us</a>
        <a href="#" className="hover:text-lime-300">Contact</a>
      </nav>
    </header>
  );
}