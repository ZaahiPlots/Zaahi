import React from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-gray-900 p-4 flex justify-between items-center">
      <Link to="/" className="text-white text-lg font-bold">ZAAHI</Link>
      <div className="space-x-4">
        <Link to="/dashboard" className="text-white hover:text-gray-300">Dashboard</Link>
        <Link to="/parcels" className="text-white hover:text-gray-300">Parcels</Link>
        <Link to="/listings" className="text-white hover:text-gray-300">Listings</Link>
        <Link to="/deals" className="text-white hover:text-gray-300">Deals</Link>
      </div>
    </nav>
  );
};

export default Navbar;