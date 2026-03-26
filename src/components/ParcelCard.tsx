import React from 'react';

interface ParcelCardProps {
  plotNumber: string;
  area: number;
  emirate: string;
  district: string;
  status: string;
}

const ParcelCard: React.FC<ParcelCardProps> = ({ plotNumber, area, emirate, district, status }) => {
  return (
    <div className="bg-gray-900 rounded-xl p-4 text-white">
      <h3>{plotNumber}</h3>
      <p>Area: {area} sqft</p>
      <p>Emirate: {emirate}</p>
      <p>District: {district}</p>
      <p>Status: {status}</p>
    </div>
  );
};

export default ParcelCard;