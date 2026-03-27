import { Request, Response } from 'express';
import Deal from '../models/Deal';

// List all deals
export const listDeals = async (req: Request, res: Response) => {
  try {
    const deals = await Deal.find({});
    return res.status(200).json(deals);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a single deal by ID
export const getDeal = async (req: Request, res: Response) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    return res.status(200).json(deal);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new deal
export const createDeal = async (req: Request, res: Response) => {
  try {
    const newDeal = await Deal.create(req.body);
    return res.status(201).json(newDeal);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update the status of a deal
export const updateDealStatus = async (req: Request, res: Response) => {
  try {
    const updatedDeal = await Deal.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!updatedDeal) return res.status(404).json({ message: 'Deal not found' });
    return res.status(200).json(updatedDeal);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get the timeline of a deal
export const getDealTimeline = async (req: Request, res: Response) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    return res.status(200).json(deal.timeline);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};