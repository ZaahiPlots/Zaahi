import { Currency, Balance } from '../models/balance';
import { Transaction } from '../models/transaction';

export class EscrowService {
    private transactions: Map<string, Transaction> = new Map();

    createEscrow(amount: number, currency: Currency): string {
        const transactionId = this.generateTransactionId();
        this.transactions.set(transactionId, {
            id: transactionId,
            amount,
            currency,
            status: 'created',
            lockTime: null
        });
        return transactionId;
    }

    lockFunds(transactionId: string, lockTime: Date): boolean {
        const transaction = this.transactions.get(transactionId);
        if (transaction && transaction.status === 'created') {
            transaction.status = 'locked';
            transaction.lockTime = lockTime;
            return true;
        }
        return false;
    }

    checkConditions(transactionId: string): boolean {
        const transaction = this.transactions.get(transactionId);
        if (transaction && transaction.lockTime) {
            const currentTime = new Date();
            return currentTime >= transaction.lockTime;
        }
        return false;
    }

    releaseFunds(transactionId: string): boolean {
        const transaction = this.transactions.get(transactionId);
        if (transaction && transaction.status === 'locked' && this.checkConditions(transactionId)) {
            transaction.status = 'released';
            return true;
        }
        return false;
    }

    refund(transactionId: string): boolean {
        const transaction = this.transactions.get(transactionId);
        if (transaction && (transaction.status === 'locked' || transaction.status === 'created')) {
            transaction.status = 'refunded';
            return true;
        }
        return false;
    }

    getBalance(currency: Currency): Balance {
        let balance = 0;
        for (const transaction of this.transactions.values()) {
            if (transaction.currency === currency) {
                switch (transaction.status) {
                    case 'created':
                    case 'locked':
                        balance -= transaction.amount;
                        break;
                    case 'released':
                        balance += transaction.amount;
                        break;
                    default:
                        break;
                }
            }
        }
        return new Balance(currency, balance);
    }

    private generateTransactionId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}