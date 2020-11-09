'use strict';
const moment = require('moment');
const errors = reqlib('_/modules/feathers/errors');
const crypto = require('crypto');
const { consumePromoCode } = reqlib('_/src/utils/promotions');

module.exports = class PlayerAccountFundingService {
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
    let deposit;

    if (data && params.req.headers['x-paystack-signature']) {
      deposit = await this.paystack_deposit(data, params);
    } else if (data && data.serial) {
      deposit = await this.promo_code_deposit(data, params);
    } else if (data && data.amount) {
      deposit = await this.deposit_from_withdrawal_account(data, params);
    } else {
      throw errors.BadRequest(null, 'Missing/incorrect promotion code serial number');
    }

    const playerDetailModel = this.getModel('player_detail');
    const playerDetail = await playerDetailModel.findOne({
      where: {id: deposit.playerDetailId}
    });

    await playerDetailModel.update({
      depositBalance: playerDetail.depositBalance + deposit.amount,
    }, { where: { id: deposit.playerDetailId } });

    return {
      id: deposit.id,
      amount: deposit.amount,
      origin: deposit.origin,
      originDetail: deposit.originDetail,
      playerDetailId: deposit.playerDetailId,
      message: 'Deposit registered', // Super important, see hooks file
    };
  }

  async requirePlayer(params) {
    if (!params.user) {
      throw errors.NotAuthenticated(null, `Must be logged-in to use fund player accounts`);
    }

    const playerDetailModel = this.getModel('player_detail');
    const playerDetail = await playerDetailModel.findOne({
      where: {userId: params.user.id}
    });
    if (!playerDetail) {
      throw errors.Forbidden(null, `Must be logged-in as player to fund accounts`);
    }
    return playerDetail;
  }

  async promo_code_deposit(data, params) {
    const playerDetail = await this.requirePlayer(params);
    console.log(`Received promo_code payment: serial: ${data.serial}, user: ${params.user.id}`);

    try {
      return await consumePromoCode(data.serial, playerDetail, this.models, false);
    } catch(e) {
      throw errors.BadRequest(null, e.message);
    }
  }

  async deposit_from_withdrawal_account(data, params) {
    const playerDetail = await this.requirePlayer(params);
    console.log(`Received request to deposit from withdrawal account: ${data.amount}, user: ${params.user.id}`);

    const playerDetailModel = this.getModel('player_detail');
    const result = await playerDetailModel.increment({
      withdrawalBalance: 0.0 - data.amount,
    }, {
      where: {
        id: playerDetail.id,
        withdrawalBalance: { $gte: data.amount },
      },
    });
    const [rows, rowCount] = result[0];
    if (!rowCount) {
      throw errors.BadRequest(null, 'Insufficient funds');
    }

    const playerDepositModel = this.getModel('player_deposit');
    return await playerDepositModel.create({
      amount: data.amount,
      origin: 'withdrawal_balance',
      originDetail: 'Transfer from withdrawal account',
      playerDetailId: playerDetail.id,
    });
  }

  async validate_paystack_deposit(reference, amount) {
    const playerDepositModel = this.getModel('player_deposit');

    // Prevent deposit duplication from paystack
    const depositCount = await playerDepositModel.count({ where: {
      amount: amount,
      originDetail: reference,
    }});

    if (depositCount > 0) {
      console.log(`Rejecting duplicate paystack deposit: ${sig}, body: ${JSON.stringify(data)}`);
      throw errors.BadRequest(null, `Duplicate deposit`);
    }
  }

  async paystack_deposit(data, params) {
    const sig = params.req.headers['x-paystack-signature'];
    const hash = crypto.createHmac('sha512', config.paystack.secretKey).update(JSON.stringify(data)).digest('hex');
    if (hash != sig) {
      console.log(`Rejecting bad paystack payload: header: ${sig}, body: ${JSON.stringify(data)}`);
      throw errors.BadRequest(null, 'Rejecting payload (signature mismatch)');
    }
    console.log(`Received paystack webhook: header: ${sig}, body: ${JSON.stringify(data)}`);

    if (data.event != 'charge.success') {
      throw errors.BadRequest(null, 'Ok');
    }

    if (data.data.domain != config.paystack.domain) {
      throw errors.BadRequest(null, `Rejecting payment from ${data.data.domain} domain`);
    }
    if (!data.data.metadata || data.data.status != 'success' || !data.data.customer) {
      throw errors.BadRequest(null, 'Payment did not confirm');
    }

    const playerDetailModel = this.getModel('player_detail');
    const playerDetail = await playerDetailModel.findOne({
      where: {id: data.data.metadata.playerId}
    });
    if (!playerDetail) {
      throw errors.BadRequest(null, `Unknown player`);
    }

    const amount = data.data.amount / 100;  // paystack sends the amount in cents/kobo
    await this.validate_paystack_deposit(data.data.reference, amount);

    const playerDepositModel = this.getModel('player_deposit');
    return await playerDepositModel.create({
      amount: amount,
      origin: 'paystack',
      originDetail: data.data.reference,
      playerDetailId: playerDetail.id,
    });
  }
};

