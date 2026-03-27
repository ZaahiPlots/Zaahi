export interface LandParcel {
  id: string;
  plotNumber: string;
  ownerId: string;
  status: string;
  assetClass: string;
  area: number;
  emirate: string;
  district: string;
  countryCode: string;
  isTokenized: boolean;
  currentValuation: number;
  createdAt: Date;
}