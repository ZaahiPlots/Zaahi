import { Request, Response } from 'express';
import * as parcelModel from '../models/parcel';

export async function listParcels(req: Request, res: Response) {
  try {
    const parcels = await parcelModel.getAll();
    res.json(parcels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch parcels' });
  }
}

export async function getParcel(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const parcel = await parcelModel.getOne(id);
    if (parcel) {
      res.json(parcel);
    } else {
      res.status(404).json({ error: 'Parcel not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch parcel' });
  }
}

export async function createParcel(req: Request, res: Response) {
  try {
    const { sender, receiver, weight, status } = req.body;
    const newParcel = await parcelModel.create({ sender, receiver, weight, status });
    res.status(201).json(newParcel);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create parcel' });
  }
}

export async function updateParcel(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { sender, receiver, weight, status } = req.body;
    const updatedParcel = await parcelModel.update(id, { sender, receiver, weight, status });
    if (updatedParcel) {
      res.json(updatedParcel);
    } else {
      res.status(404).json({ error: 'Parcel not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update parcel' });
  }
}

export async function deleteParcel(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await parcelModel.delete(id);
    if (result) {
      res.json({ message: 'Parcel deleted successfully' });
    } else {
      res.status(404).json({ error: 'Parcel not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete parcel' });
  }
}