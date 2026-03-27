import React from 'react';

interface ParcelCardProps {
  plotNumber: string;
  area: number;
  emirate: string;
  district: string;
  status: string;
}

const ParcelCard: React.FC<ParcelCardProps> = ({
  plotNumber,
  area,
  emirate,
  district,
  status
}) => {
  return (
    <div className="bg-gray-900 rounded-xl p-4 shadow-md">
      <h3 className="text-white font-bold">{plotNumber}</h3>
      <p className="text-gray-200">Area: {area} sqft</p>
      <p className="text-gray-200">Emirate: {emirate}</p>
      <p className="text-gray-200">District: {district}</p>
      <p className="text-green-300 font-semibold">{status}</p>
    </div>
  );
};

export default ParcelCard;