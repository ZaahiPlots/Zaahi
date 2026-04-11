import React, { useState } from 'react';
import styles from './page.module.css';

interface Listing {
  id: number;
  title: string;
  price: number;
  location: string;
}

const listings: Listing[] = [
  { id: 1, title: 'Item A', price: 100, location: 'New York' },
  { id: 2, title: 'Item B', price: 200, location: 'Los Angeles' },
  // Add more listings here
];

const Page = () => {
  const [filteredListings, setFilteredListings] = useState(listings);

  const handlePriceRangeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const maxPrice = parseInt(event.target.value);
    const filtered = listings.filter(listing => listing.price <= maxPrice);
    setFilteredListings(filtered);
  };

  return (
    <div className={styles.container}>
      <h1>Marketplace</h1>
      <div className={styles.filterSection}>
        <label htmlFor="maxPrice">Max Price:</label>
        <input
          type="number"
          id="maxPrice"
          value={listings.length > 0 ? Math.max(...listings.map(l => l.price)) : ''}
          onChange={handlePriceRangeChange}
          className={styles.filterInput}
        />
      </div>
      <div className={styles.grid}>
        {filteredListings.map(listing => (
          <div key={listing.id} className={styles.card}>
            <h2>{listing.title}</h2>
            <p>${listing.price}</p>
            <p>{listing.location}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Page;