import { NextApiRequest, NextApiResponse } from 'next';

const sampleListings = [
  {
    id: '1',
    parcelId: 'P001',
    askingPrice: 250000,
    type: 'Single Family Home'
  },
  {
    id: '2',
    parcelId: 'P002',
    askingPrice: 350000,
    type: 'Apartment'
  }
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return res.status(200).json(sampleListings);
  } else if (req.method === 'POST') {
    const { parcelId, askingPrice, type } = req.body;
    if (!parcelId || !askingPrice || !type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const newListing = {
      id: Date.now().toString(),
      parcelId,
      askingPrice,
      type
    };
    sampleListings.push(newListing);
    return res.status(201).json(newListing);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}