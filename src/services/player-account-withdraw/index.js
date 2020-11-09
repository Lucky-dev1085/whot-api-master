'use strict';
const moment = require('moment');
const errors = reqlib('_/modules/feathers/errors');
const crypto = require('crypto');

const bankData = require('./bank_data');
const { PaystackTransfer } = require('./transfer');

module.exports = class PlayerAccountWithdrawService {
  constructor() {
    this.models = null;
    this._config = {
      auth: {
        create: true,
      },
      apidocs: { operations: 'c' }
    };
  }

  getModel(modelKey) {
    if (!this.models) {
      this.models = reqlib('_/models');
    }
    return this.models[modelKey];
  }

  async create(data, params) {
    return {
      id: deposit.id,
      amount: deposit.amount,
      origin: deposit.origin,
      originDetail: deposit.originDetail,
      playerDetailId: deposit.playerDetailId,
      message: 'Deposit registered', // Super important, see hooks file
    };
  }
};

