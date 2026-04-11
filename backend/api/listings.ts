interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
}

const listings: Listing[] = [];

function searchListings(query: string): Listing[] {
  return listings.filter(listing => 
    listing.title.toLowerCase().includes(query.toLowerCase()) ||
    listing.description.toLowerCase().includes(query.toLowerCase())
  );
}

function getListing(id: string): Listing | undefined {
  return listings.find(listing => listing.id === id);
}

function createListing(title: string, description: string, price: number): Listing {
  const newListing: Listing = {
    id: Math.random().toString(36).substr(2, 9),
    title,
    description,
    price
  };
  listings.push(newListing);
  return newListing;
}

function updateListing(id: string, title?: string, description?: string, price?: number): Listing | undefined {
  const listing = getListing(id);
  if (listing) {
    if (title) listing.title = title;
    if (description) listing.description = description;
    if (price !== undefined) listing.price = price;
    return listing;
  }
  return undefined;
}

export { searchListings, getListing, createListing, updateListing };