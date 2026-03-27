export const ZAAHI_FEE_RATE = 0.002 as const;
export const ROBOTICS_FUND_RATE = 0.10 as const;
export const DEPOSIT_RATE = 0.10 as const;
export const TOKEN_SYMBOL = 'ZAH' as const;

export const SUPPORTED_COUNTRIES = [
  'US',
  'CA',
  'GB',
  'AU',
  'NZ'
] as const;

export const DEAL_STATUSES = {
  PENDING: 'pending' as const,
  APPROVED: 'approved' as const,
  REJECTED: 'rejected' as const,
  COMPLETED: 'completed' as const
} as const;