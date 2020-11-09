'use strict';
const moment = require('moment');
const errors = reqlib('_/modules/feathers/errors');

module.exports = class PlayerBankAccountVerificationServices {
  constructor() {
    this.models = null;
    this._config = {
      auth: {
        create: true,
      },
      apidocs: { operations: 'c' }
    };
    
    require('./apidocs')();
  }

  getModel(modelKey) {
    if (!this.models) {
      this.models = reqlib('_/models');
    }
    return this.models[modelKey];
  }

  async create(data, params) {
    if (!data || !data.code) {
      throw errors.BadRequest(null, 'Missing/incorrect verification code');
    }
    const code =  data.code;
    const tokenModel = this.getModel('token');
    const playerBankAccountModel = this.getModel('player_bank_account');

    const token = await tokenModel.findOne({
      where: {
        id: {$eq: data.token},
        scope: 'bankAccountVerification'
      }
    });

    if (!token) {
      throw errors.NotFound(null, 'Missing/Invalid verification token');
    }
    if (code != token.data.code) {
      throw errors.BadRequest(null, 'Incorrect verification code');
    }

    const now = moment();
    await playerBankAccountModel.update({
      verifiedAt: now,
    }, { where: { id: token.data.playerBankAccountId } });

    return {
      verifiedAt: now,
    };
  }
};
