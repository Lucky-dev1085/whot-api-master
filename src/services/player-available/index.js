'use strict';
const moment = require('moment');

module.exports = class PlayerAvailableService {
  constructor() {
    this.models = null;
    this._config = {
      auth: {
        find: true,
      },
      apidocs: { operations: 'f' }
    };
    
    require('./apidocs')();
  }

  getModel(modelKey) {
    if (!this.models) {
      this.models = reqlib('_/models');
    }
    return this.models[modelKey];
  }

  async find(context) {
    const fields = {
      name: { model: 'player_detail', op: '$iLike', response: playerNameResponse },
      email: { model: 'user', op: '$eq', response: userEmailResponse },
      serial: { model: 'promotion_code', op: '$eq', response: promoCodeResponse },
    }

    for (let k of Object.keys(fields)) {
      if (!context.query[k]) {
        continue;
      }
      const model = this.getModel(fields[k].model);
      const count = await model.count({
        where: { [k]: { [fields[k].op]: context.query[k] } }
      });
      return await fields[k].response(model, k, context.query[k], count);
    }
  }
};

async function playerNameResponse(model, key, value, count) {
  return {
    [key]: value,
    available: count <= 0,
  };
}

async function userEmailResponse(model, key, value, count) {
  return {
    [key]: value,
    exists: count > 0,
    available: count <= 0,
  };
}

async function promoCodeResponse(model, key, value, count) {
  const code = await model.findOne({
    where: { [key]: value }
  });
  if (!code) {
    return {
      [key]: value,
      exists: false,
      expired: true,
    };
  }
  const promotion = await code.getPromotion();
  return {
    [key]: value,
    exists: count > 0,
    expired: promotion && moment(promotion.expiresAt).isBefore(),
  };
}
