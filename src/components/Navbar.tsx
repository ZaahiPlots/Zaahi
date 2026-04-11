import React from 'react';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-gray-900 p-4 flex justify-between items-center">
      <div className="text-white font-bold">ZAAHI</div>
      <ul className="flex space-x-4">
        <li><a href="#" className="text-white hover:text-gray-300">Dashboard</a></li>
        <li><a href="#" className="text-white hover:text-gray-300">Parcels</a></li>
        <li><a href="#" className="text-white hover:text-gray-300">Listings</a></li>
        <li><a href="#" className="text-white hover:text-gray-300">Deals</a></li>
      </ul>
    </nav>
  );
};

export default Navbar;