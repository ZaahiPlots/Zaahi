export interface Participant {
  id: string;
  roles: string[];
  legalName: string;
  email: string;
  phone?: string;
  nationality: string;
  verificationStatus: boolean;
  referralCode?: string;
  walletAddress?: string;
  createdAt: Date;
}