export enum DealStatus {
  PENDING,
  APPROVED,
  REJECTED,
  COMPLETED
}

export class Deal {
  id: string;
  listingId: string;
  parcelId: string;
  sellerId: string;
  buyerId: string;
  status: DealStatus;
  agreedPrice: number;
  currency: string;
  platformFee: number;
  roboticsFundAmount: number;
  createdAt: Date;

  constructor(id: string, listingId: string, parcelId: string, sellerId: string, buyerId: string, status: DealStatus, agreedPrice: number, currency: string, platformFee: number, roboticsFundAmount: number) {
    this.id = id;
    this.listingId = listingId;
    this.parcelId = parcelId;
    this.sellerId = sellerId;
    this.buyerId = buyerId;
    this.status = status;
    this.agreedPrice = agreedPrice;
    this.currency = currency;
    this.platformFee = platformFee;
    this.roboticsFundAmount = roboticsFundAmount;
    this.createdAt = new Date();
  }
}