import { NextApiRequest, NextApiResponse } from 'next';

const parcels = [
  {
    id: 1,
    plotNumber: 'A1',
    area: 500,
    emirate: 'Abu Dhabi',
    district: 'Al Wathba'
  },
  {
    id: 2,
    plotNumber: 'B2',
    area: 750,
    emirate: 'Ajman',
    district: 'Umm Al Quwain'
  }
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    res.status(200).json(parcels);
  } else if (req.method === 'POST') {
    const { plotNumber, area, emirate, district } = req.body;
    
    if (!plotNumber || !area || !emirate || !district) {
      return res
        .status(400)
        .json({ message: 'Missing required fields' });
    }

    const newParcel = {
      id: parcels.length + 1,
      plotNumber,
      area,
      emirate,
      district
    };

    parcels.push(newParcel);
    res.status(201).json(newParcel);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}