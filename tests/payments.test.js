/* eslint arrow-body-style: ["off"] */
/* eslint global-require: ["off"] */

'use strict';
const { assert } = require('chai');

const cfg = reqlib('_/src/modules/feathers-auth/cfg');
const models = reqlib('_/src/models');
const tokenModel = models[cfg.tokenModel];
const crypto = require('crypto');
const secret = process.env.PAYSTACK_SECRET;

module.exports = function suite() {

  beforeEach(async function() {
    var response = await this.testState.api.postAuthLogin({ json: {
      "email": "admin@example.com",
      "password": "password"
    }});
    assert.equal(response.status, 200);
    this.testState.adminAuth = response.data.jwt;
    this.testState.api.authorizationBearer(this.testState.adminAuth);

    response = await this.testState.api.postBanks({ json: {
      name: 'FirstBank',
      logoUrl: 'https://google.com/',
      accountUrl: 'https://google.com/',
    }});
    assert.equal(response.status, 201);
    this.testState.bank = response.data;
    
    response = await this.testState.api.postUsers({ json: {
      email: "user@example.com",
      name: 'BigJack500',
      termsAgreed: true,
      password: "password",
    }});
    assert.equal(response.status, 201);
    const user = response.data;
    this.testState.playerUser = user;

    response = await this.testState.api.getPlayerDetails({userId: user.id});
    assert.equal(response.status, 200);
    const playerId = response.data.data[0].id;

    response = await this.testState.api.patchPlayerDetails(playerId, { json: {
      withdrawalBalance: 5000.0,
    }});
    assert.equal(response.status, 200);

    response = await this.testState.api.postAuthLogin({ json: {
      "email": "user@example.com",
      "password": "password"
    }});
    assert.equal(response.status, 200);
    this.testState.userAuth = response.data.jwt;
    this.testState.api.authorizationBearer(this.testState.userAuth);

    
    // Verify phone number
    response = await this.testState.api.getPlayerDetails({userId: user.id});
    assert.equal(response.status, 200);
    
    response = await this.testState.api.patchPlayerDetails(playerId, { json: {
      mobile: "+2345552223335",
    }});
    assert.equal(response.status, 200);
    assert.isOk(response.data.token);
    const tokenObject = await tokenModel.findOne({ where: {id: response.data.token}});

    const verificationResponse = await this.testState.api.postPlayerVerification({json: {
      token: tokenObject.id,
      code: tokenObject.data.code,
    }});
    assert.equal(response.status, 200);
    
    const pdResponse = await this.testState.api.getPlayerDetails({userId: user.id});
    assert.equal(pdResponse.status, 200);

    assert.equal(pdResponse.data.data.length, 1);
    this.testState.playerDetail = pdResponse.data.data[0];
    assert.isOk(this.testState.playerDetail.id);
  });

  afterEach(async function() {
    this.testState.api.authorizationBearer("Unauthorized");
  });

  it('should be able to add bank account', async function () {
    var response = await this.testState.api.postPlayerBankAccounts({ json: {
      name: this.testState.bank.name,
      accountNumber: '000111222',
      accountBvn: '333222111',
      bankId: this.testState.bank.id,
    }});
    assert.equal(response.status, 201);
    assert.isOk(response.data.id);
    assert.isOk(response.data.bankId);
    assert.isOk(response.data.playerDetailId);
    assert.isOk(response.data.token);

    response = await this.testState.api.getPlayerBankAccounts({
      $include: 'player_detail,bank',
    });
    assert.equal(response.status, 200);

    assert.equal(response.data.data.length, 1);
    const account = response.data.data[0];

    assert.isOk(account.bank);
    assert.isOk(account.bankId);
    assert.isOk(!account.verifiedAt);

    assert.isOk(account.player_detail);
    assert.isOk(account.playerDetailId);

    response = await this.testState.api.getPlayerBankAccounts({
      $include: 'player_detail,bank',
      'verifiedAt[$ne]': 'null',
    });
    assert.equal(response.status, 200);
    assert.equal(response.data.data.length, 0);

    response = await this.testState.api.deletePlayerBankAccounts(account.id);
    assert.equal(response.status, 200);

    response = await this.testState.api.getPlayerBankAccounts();
    assert.equal(response.status, 200);
    assert.equal(response.data.data.length, 0);
  });

  it('should be able to verify bank account', async function () {
    var response = await this.testState.api.postPlayerBankAccounts({ json: {
      name: this.testState.bank.name,
      accountNumber: '000111222',
      accountBvn: '333222111',
      bankId: this.testState.bank.id,
    }});
    assert.equal(response.status, 201);
    const playerBankAccountId = response.data.id;

    const tokenObject = await tokenModel.findOne({ where: {id: response.data.token}});
    assert.equal(tokenObject.data.playerBankAccountId, playerBankAccountId);

    // TODO: use the API instead of the service when upstream fixes their bug
    await this.testState.playerBankAccountsVerification.create({
      token: tokenObject.id,
      code: tokenObject.data.code,
    });

    response = await this.testState.api.getPlayerBankAccounts({
      $include: 'player_detail,bank',
    });
    assert.equal(response.status, 200);
    assert.equal(response.data.data.length, 1);

    const account = response.data.data[0];
    assert.isOk(account.verifiedAt);
  });

  it('should be able pay with paystack', async function () {
    let response = await this.testState.api.getPlayerDeposits();

    assert.equal(response.status, 200);
    assert.equal(response.data.data.length, 0);

    try {
      await this.testState.api.postPlayerAccountFunding({ json: {
        unknown: 'unknown'
      }});
      assert.fail('Should fail with 400');
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 400);
    }
    try {
      await this.testState.api.postPlayerAccountFunding({ json: {
        serial: 'unknown'
      }});
      assert.fail('Should fail with 400');
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 400);
    }

    const body = {
      "event": "charge.success",
      "data": {
        "id": 284029548,
        "domain": "test",
        "status": "success",
        "reference": "SiZWkl7mn8-uVTK",
        "amount": 45000, // Paystack returns the amount in cents/kobo
        "paid_at": "2019-10-02T16:50:53.000Z",
        "channel": "card",
        "currency": "NGN",
        "ip_address": "160.152.27.18",
        "metadata": {
          "playerId": this.testState.playerDetail.id,
          "referrer": "http://localhost:1975/deposit-pot/add"
        },
        "authorization": {
          "authorization_code": "AUTH_7mys3z44rn",
          "last4": "4081",
          "exp_month": "12",
          "exp_year": "2020",
          "channel": "card",
          "card_type": "visa DEBIT",
          "bank": "Test Bank",
          "country_code": "NG",
          "brand": "visa",
          "reusable": true,
          "signature": "SIG_qPK92iMizekJMteFLJTR"
        },
        "customer": {
          "id": 13427677,
          "first_name": "",
          "last_name": "",
          "email": this.testState.playerUser.email,
          "customer_code": "CUS_75m02sle9yboxwf",
          "phone": "",
          "metadata": null,
          "risk_action": "default"
        },
        "customer": this.testState.playerDetail.id,
        "fees": 17500,
        "fees_split": null,
      }
    };
    const sig = crypto.createHmac('sha512', secret).update(JSON.stringify(body)).digest('hex');
    this.testState.api.setCustomHeaders({'X-Paystack-Signature': sig});

    response = await this.testState.api.postPlayerAccountFunding({ json: body });
    assert.equal(response.status, 200);

    const depositId = response.data.id;
    assert.equal(response.data.amount, 450);
    assert.equal(response.data.origin, 'paystack');
    assert.equal(response.data.playerDetailId, this.testState.playerDetail.id);

    this.testState.api.authorizationBearer(this.testState.userAuth);
    response = await this.testState.api.getPlayerDeposits();
    assert.equal(response.status, 200);
    assert.equal(response.data.data.length, 1);
    assert.equal(response.data.data[0].id, depositId);
  });

  it('should be able to pay with promotion codes', async function () {
    this.testState.api.authorizationBearer(this.testState.adminAuth);

    let response = await this.testState.api.postPromotions({json: {
      batchName: 'AUG-SILVER',
      denomination: 450,
      numberOfCodes: 1,
      expiresAt: '2100-01-01 19:09:32.667Z',
    }});
    assert.equal(response.status, 201);

    assert.equal(response.data.serials.length, 1);
    const serial = response.data.serials[0];

    this.testState.api.authorizationBearer(this.testState.userAuth);
    response = await this.testState.api.postPlayerAccountFunding({ json: { serial }});
    assert.equal(response.status, 200);

    try {
      await this.testState.api.postPlayerAccountFunding({ json: { serial }});
      assert.fail('Should fail with 400');
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 400);
    }

    const depositId = response.data.id;
    assert.equal(response.data.amount, 450);
    assert.equal(response.data.origin, 'promotion_code');
    assert.equal(response.data.playerDetailId, this.testState.playerDetail.id);

    response = await this.testState.api.getPlayerDeposits();
    assert.equal(response.status, 200);
    assert.equal(response.data.data.length, 1);
    assert.equal(response.data.data[0].id, depositId);
  });

  it('should be able to deposit from withdrawal account', async function () {
    this.testState.api.authorizationBearer(this.testState.userAuth);
    let response = await this.testState.api.postPlayerAccountFunding({ json: {
      amount: 2000,
    }});
    assert.equal(response.status, 200);

    const depositId = response.data.id;
    assert.equal(response.data.amount, 2000);
    assert.equal(response.data.origin, 'withdrawal_balance');
    assert.equal(response.data.playerDetailId, this.testState.playerDetail.id);

    response = await this.testState.api.getPlayerDeposits();
    assert.equal(response.status, 200);
    assert.equal(response.data.data.length, 1);
    assert.equal(response.data.data[0].id, depositId);
  });

  it('should be able to withdraw funds', async function () {
    let response = await this.testState.api.postPlayerBankAccounts({ json: {
      name: this.testState.bank.name,
      accountNumber: '000111222',
      accountBvn: '333222111',
      bankId: this.testState.bank.id,
    }});
    assert.equal(response.status, 201);
    const playerBankAccountId = response.data.id;

    response = await this.testState.api.postPlayerWithdrawals({ json: {
      amount: 5.0,
      playerBankAccountId: playerBankAccountId,
      recepientName: 'Jack Daniels',
    }});
    assert.equal(response.status, 201);
    assert.equal(response.data.amount, 5.0);
    assert.equal(response.data.amountValue, 500);
    assert.equal(response.data.recepientName, 'Jack Daniels');
    assert.equal(response.data.accountNumber, '000111222');
    assert.isOk(response.data.bankCode);
    assert.isOk(response.data.reason);

    response = await this.testState.api.getPlayerWithdrawals();
    assert.equal(response.status, 200);

    const transfers = response.data.data;
    assert.equal(transfers.length, 1);
    assert.equal(transfers[0].accountNumber, '000111222');
    assert.equal(transfers[0].amountValue, 500);
  });
};
