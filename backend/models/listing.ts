export interface Listing {
  id: string;
  parcelId: string;
  ownerId: string;
  type: 'sale' | 'jv' | 'rent';
  askingPrice: number;
  currency: string;
  status: string;
  views: number;
  createdAt: Date;
}