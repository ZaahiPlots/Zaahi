import { Request, Response } from 'express';
import { Parcel } from '../models/parcel';

export async function listParcels(req: Request, res: Response) {
  try {
    const parcels = await Parcel.find();
    res.status(200).json(parcels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve parcels' });
  }
}

export async function getParcel(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const parcel = await Parcel.findById(id);
    if (!parcel) {
      return res.status(404).json({ error: 'Parcel not found' });
    }
    res.status(200).json(parcel);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve parcel' });
  }
}

export async function createParcel(req: Request, res: Response) {
  try {
    const { recipient, address, status } = req.body;
    const newParcel = new Parcel({ recipient, address, status });
    await newParcel.save();
    res.status(201).json(newParcel);
  } catch (error) {
    res.status(400).json({ error: 'Invalid parcel data' });
  }
}

export async function updateParcel(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { recipient, address, status } = req.body;
    const updatedParcel = await Parcel.findByIdAndUpdate(id, { recipient, address, status }, { new: true });
    if (!updatedParcel) {
      return res.status(404).json({ error: 'Parcel not found' });
    }
    res.status(200).json(updatedParcel);
  } catch (error) {
    res.status(400).json({ error: 'Invalid parcel data' });
  }
}

export async function deleteParcel(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deletedParcel = await Parcel.findByIdAndDelete(id);
    if (!deletedParcel) {
      return res.status(404).json({ error: 'Parcel not found' });
    }
    res.status(200).json({ message: 'Parcel deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete parcel' });
  }
}