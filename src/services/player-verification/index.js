'use strict';
const moment = require('moment');
const errors = reqlib('_/modules/feathers/errors');

module.exports = class PlayerVerificationServices {
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
    const playerDetailModel = this.getModel('player_detail');

    const token = await tokenModel.findOne({
      where: {
        id: {$eq: data.token},
        scope: 'mobileVerification'
      }
    });

    if (!token) {
      throw errors.NotFound(null, 'Missing/Invalid verification token');
    }
    if (code != token.data.code) {
      throw errors.BadRequest(null, 'Incorrect verification code');
    }

    const now = moment();
    await playerDetailModel.update({
      mobile: token.data.mobile,
      mobileVerificationTimestamp: now,
    }, { where: { userId: token.userId } });

    return {
      mobile: token.data.mobile,
      mobileVerificationTimestamp: now,
    };
  }
};
