import type { NextApiRequest, NextApiResponse } from 'next/server';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { name, email, roles } = req.body;

  if (!name || !email || !roles) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Simulate user creation and generation of id and referralCode
  const id = Math.floor(Math.random() * 1000000).toString();
  const referralCode = Math.random().toString(36).substr(2, 9);

  res.status(200).json({ id, referralCode });
}