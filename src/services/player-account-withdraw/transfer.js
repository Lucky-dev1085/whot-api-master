const { crest } = require('crest-js');

const bankData = require('./bank_data');
const baseUrl = 'https://api.paystack.co';

class ExtendableError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else { 
      this.stack = (new Error(message)).stack; 
    }
  }
}


class PaystackTransferException extends ExtendableError {
}


class PaystackTransfer {
  constructor(apiKey) {
    this.apiKey = apiKey || config.paystack.secretKey;
    this.api = crest({
      baseUrl,
      specialFragments: {
        ResendOtp: 'resend_otp',
        FinalizeTransfer: 'finalize_transfer',
      },
    });
    this.api.authorizationBearer(this.apiKey);
  }

  async newRecipient(name, description, account_number, bank, metadata) {
    try {
      return await this.api.postTtransferrecipient({ json: {
        type: "nuban",
        currency: "NGN",
        bank_code: bank.code,
        name: name,
        description: description,
        account_number: account_number,
        metadata: metadata,
      }});
    } catch(e) {
      throw new PaystackTransferException(e.message || e);
    }
  }

  async getRecipients() {
    try {
      return await this.api.getTtransferrecipient();
    } catch(e) {
      throw new PaystackTransferException(e.message || e);
    }
  }

  async singleTransfer(amount, recipient, reason, source) {
    try {
      return await this.api.postTransfer({ json: {
        source: source || 'balance',
        reason: reason,
        amount: amount,
        recipient: recipient,
      }});
    } catch(e) {
      throw new PaystackTransferException(e.message || e);
    }
  }

  async finalizeTransfer(transfer_code, otp) {
    try {
      return await this.api.postTransferFinalizeTransfer({ json: {
        otp: otp,
        transfer_code: transfer_code,
      }});
    } catch(e) {
      throw new PaystackTransferException(e.message || e);
    }
  }

  async resendOtp(transfer_code, otp) {
    try {
      return await this.api.postTransferResendOtp({ json: {
        transfer_code: transfer_code,
      }});
    } catch(e) {
      throw new PaystackTransferException(e.message || e);
    }
  }

  async getBalance(transfer_code, otp) {
    try {
      return await this.api.getBalance();
    } catch(e) {
      throw new PaystackTransferException(e.message || e);
    }
  }
}

module.exports = { PaystackTransfer };
