import Link from "next/link";
export default function Dashboard() {
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-gray-800 px-8 py-4 flex justify-between items-center">
        <span className="text-2xl font-bold text-amber-400">ZAAHI</span>
        <div className="flex gap-6 text-gray-400">
          <Link href="/parcels" className="hover:text-white">Parcels</Link>
          <Link href="/listings" className="hover:text-white">Listings</Link>
          <Link href="/deals" className="hover:text-white">Deals</Link>
        </div>
      </nav>
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-500 mb-8">Welcome to ZAAHI. Archibald is watching over your assets.</p>
        <div className="grid grid-cols-3 gap-6 mb-8">
          {[["My Parcels","0","🏞️"],["Active Deals","0","🤝"],["Portfolio Value","$0","💰"]].map(([label,val,icon]) => (
            <div key={label} className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <div className="text-3xl mb-3">{icon}</div>
              <div className="text-3xl font-bold text-white mb-1">{val}</div>
              <div className="text-gray-500 text-sm">{label}</div>
            </div>
          ))}
        </div>
        <div className="bg-gray-900 rounded-2xl p-6 border border-amber-500/30">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🐱</div>
            <div>
              <p className="text-amber-400 font-bold mb-1">Archibald says:</p>
              <p className="text-gray-300">Welcome to ZAAHI. I am Archibald — your personal AI advisor for all things real estate in Dubai. Start by adding your first land parcel, or explore the marketplace to find opportunities.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
