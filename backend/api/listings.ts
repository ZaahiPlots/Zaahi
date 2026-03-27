import { Request, Response } from 'express';

interface Listing {
  id: number;
  title: string;
  description: string;
  price: number;
}

const listings: Listing[] = [];

function searchListings(req: Request, res: Response): void {
  const query = req.query.q as string | undefined;
  if (query) {
    const results = listings.filter(listing => 
      listing.title.toLowerCase().includes(query.toLowerCase()) ||
      listing.description.toLowerCase().includes(query.toLowerCase())
    );
    res.json(results);
  } else {
    res.json(listings);
  }
}

function getListing(req: Request, res: Response): void {
  const id = parseInt(req.params.id, 10);
  const listing = listings.find(l => l.id === id);
  if (listing) {
    res.json(listing);
  } else {
    res.status(404).json({ message: 'Listing not found' });
  }
}

function createListing(req: Request, res: Response): void {
  const newListing: Listing = {
    id: listings.length + 1,
    title: req.body.title as string,
    description: req.body.description as string,
    price: parseFloat(req.body.price as string)
  };
  listings.push(newListing);
  res.status(201).json(newListing);
}

function updateListing(req: Request, res: Response): void {
  const id = parseInt(req.params.id, 10);
  const updatedListing: Partial<Listing> = req.body;
  const index = listings.findIndex(l => l.id === id);
  if (index !== -1) {
    listings[index] = { ...listings[index], ...updatedListing };
    res.json(listings[index]);
  } else {
    res.status(404).json({ message: 'Listing not found' });
  }
}

export { searchListings, getListing, createListing, updateListing };