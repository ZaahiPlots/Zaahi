"use client";
import { useState } from 'react';

const NewParcelPage: React.FC = () => {
  const [plotNumber, setPlotNumber] = useState('');
  const [area, setArea] = useState('');
  const [emirate, setEmirate] = useState('');
  const [district, setDistrict] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log('Parcel data:', { plotNumber, area, emirate, district });
  };

  return (
    <div style={{ backgroundColor: '#121212', color: '#FFFFFF', padding: '20px' }}>
      <h1>Add Parcel</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="plotNumber">Plot Number:</label>
        <input
          type="text"
          id="plotNumber"
          value={plotNumber}
          onChange={(e) => setPlotNumber(e.target.value)}
          required
        />
        <br />
        <label htmlFor="area">Area:</label>
        <input
          type="number"
          id="area"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          required
        />
        <br />
        <label htmlFor="emirate">Emirate:</label>
        <select
          id="emirate"
          value={emirate}
          onChange={(e) => setEmirate(e.target.value)}
          required
        >
          <option value="">Select Emirate</option>
          <option value="Abu Dhabi">Abu Dhabi</option>
          <option value="Ajman">Ajman</option>
          <option value="Dubai">Dubai</option>
          <option value="Fujairah">Fujairah</option>
          <option value="Ras Al Khaimah">Ras Al Khaimah</option>
          <option value="Sharjah">Sharjah</option>
          <option value="Umm Al Quwain">Umm Al Quwain</option>
        </select>
        <br />
        <label htmlFor="district">District:</label>
        <input
          type="text"
          id="district"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          required
        />
        <br />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default NewParcelPage;