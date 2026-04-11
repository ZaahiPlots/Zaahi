import { Currency, PaymentMethod } from '../types';

interface Escrow {
  id: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  status: 'created' | 'locked' | 'completed' | 'refunded';
}

class EscrowService {
  private escrows: Escrow[] = [];

  createEscrow(buyerId: string, sellerId: string, amount: number, currency: Currency, paymentMethod: PaymentMethod): Escrow {
    const id = Date.now().toString();
    const newEscrow: Escrow = { id, buyerId, sellerId, amount, currency, paymentMethod, status: 'created' };
    this.escrows.push(newEscrow);
    return newEscrow;
  }

  lockFunds(escrowId: string): void {
    const escrow = this.escrows.find(e => e.id === escrowId);
    if (escrow && escrow.status === 'created') {
      escrow.status = 'locked';
    } else {
      throw new Error('Invalid escrow status or ID');
    }
  }

  checkConditions(escrowId: string): boolean {
    const escrow = this.escrows.find(e => e.id === escrowId);
    if (escrow && escrow.status === 'locked') {
      // Placeholder for condition checking logic
      return true;
    } else {
      throw new Error('Invalid escrow status or ID');
    }
  }

  releaseFunds(escrowId: string): void {
    const escrow = this.escrows.find(e => e.id === escrowId);
    if (escrow && escrow.status === 'locked' && this.checkConditions(escrowId)) {
      escrow.status = 'completed';
    } else {
      throw new Error('Invalid escrow status or ID');
    }
  }

  refund(escrowId: string): void {
    const escrow = this.escrows.find(e => e.id === escrowId);
    if (escrow && escrow.status !== 'completed') {
      escrow.status = 'refunded';
    } else {
      throw new Error('Invalid escrow status or ID');
    }
  }

  getBalance(escrowId: string): number {
    const escrow = this.escrows.find(e => e.id === escrowId);
    if (escrow) {
      return escrow.amount;
    } else {
      throw new Error('Invalid escrow ID');
    }
  }
}

export default EscrowService;