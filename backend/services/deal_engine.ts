class DealEngine {
  private state: string;

  constructor() {
    this.state = 'initial';
  }

  initiateDeal(): void {
    if (this.state === 'initial') {
      this.state = 'dealInitiated';
    } else {
      throw new Error('Invalid state for initiating deal');
    }
  }

  submitDeposit(): void {
    if (this.state === 'dealInitiated' || this.state === 'depositSubmitted') {
      this.state = 'depositSubmitted';
    } else {
      throw new Error('Invalid state for submitting deposit');
    }
  }

  signAgreement(): void {
    if (this.state === 'depositSubmitted') {
      this.state = 'agreementSigned';
    } else {
      throw new Error('Invalid state for signing agreement');
    }
  }

  collectDocuments(): void {
    if (this.state === 'agreementSigned' || this.state === 'documentsCollected') {
      this.state = 'documentsCollected';
    } else {
      throw new Error('Invalid state for collecting documents');
    }
  }

  verifyGov(): void {
    if (this.state === 'documentsCollected' || this.state === 'governmentVerified') {
      this.state = 'governmentVerified';
    } else {
      throw new Error('Invalid state for verifying government');
    }
  }

  requestNOC(): void {
    if (this.state === 'governmentVerified' || this.state === 'nocRequested') {
      this.state = 'nocRequested';
    } else {
      throw new Error('Invalid state for requesting NOC');
    }
  }

  payTransferFee(): void {
    if (this.state === 'nocRequested' || this.state === 'transferFeePaid') {
      this.state = 'transferFeePaid';
    } else {
      throw new Error('Invalid state for paying transfer fee');
    }
  }

  submitDLD(): void {
    if (this.state === 'transferFeePaid' || this.state === 'dldSubmitted') {
      this.state = 'dldSubmitted';
    } else {
      throw new Error('Invalid state for submitting DLD');
    }
  }

  completeDeal(): void {
    if (this.state === 'dldSubmitted' || this.state === 'dealCompleted') {
      this.state = 'dealCompleted';
    } else {
      throw new Error('Invalid state for completing deal');
    }
  }

  disputeDeal(): void {
    if (this.state === 'completeDeal' || this.state === 'disputeInitiated') {
      this.state = 'disputeInitiated';
    } else {
      throw new Error('Invalid state for initiating dispute');
    }
  }

  cancelDeal(): void {
    if (this.state === 'initial' || this.state === 'dealCancelled') {
      this.state = 'dealCancelled';
    } else {
      throw new Error('Invalid state for cancelling deal');
    }
  }
}

export default DealEngine;