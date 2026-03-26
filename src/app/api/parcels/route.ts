import { NextApiRequest, NextApiResponse } from 'next';

const parcels = [
  { id: 1, plotNumber: 'A001', area: 500, emirate: 'Dubai', district: 'Al Bateen' },
  { id: 2, plotNumber: 'B002', area: 300, emirate: 'Abu Dhabi', district: 'Sharjah' },
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    res.status(200).json(parcels);
  } else if (req.method === 'POST') {
    const { plotNumber, area, emirate, district } = req.body;
    const newParcel = { id: parcels.length + 1, plotNumber, area, emirate, district };
    parcels.push(newParcel);
    res.status(201).json(newParcel);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}