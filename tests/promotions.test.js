/* eslint arrow-body-style: ["off"] */
/* eslint global-require: ["off"] */

'use strict';
const moment = require('moment');
const { assert } = require('chai');

module.exports = function suite() {
  beforeEach(async function() {
    const response = await this.testState.api.postAuthLogin({ json: {
      "email": "admin@example.com",
      "password": "password"
    }});

    assert.equal(response.status, 200);
    assert.exists(response.data.jwt);

    this.testState.api.authorizationBearer(response.data.jwt);
  });

  afterEach(async function() {
    this.testState.api.authorizationBearer("Unauthorized");
  });

  it('Unauthenticated users should be unable to create promotions', async function () {
    this.testState.api.authorizationBearer("Unauthorized");
    try {
      await this.testState.api.postPromotions({json: {
        batchName: 'AUG-SILVER',
        denomination: 2500,
        numberOfCodes: 100,
      }});
      assert.fail('Should fail with 401');
    } catch(e) {
      assert.equal(e.response.status, 401);
    }
  });

  it('Players should be unable to create promotions larger than their deposit pot', async function () {
    this.testState.api.authorizationBearer("Unauthorized");

    const response = await this.testState.api.postUsers({ json: {
      email: "user@example.com",
      name: 'BigJack500',
      termsAgreed: true,
      password: "password",
    }});
    assert.equal(response.status, 201);    

    const authResponse = await this.testState.api.postAuthLogin({ json: {
      "email": "user@example.com",
      "password": "password"
    }});
    assert.equal(authResponse.status, 200);

    this.testState.api.authorizationBearer(authResponse.data.jwt);

    try {
      await this.testState.api.postPromotions({json: {
        batchName: 'AUG-SILVER',
        denomination: 2500,
        numberOfCodes: 100,
        expiresAt: '2100-01-01 19:09:32.667Z',
      }});
      assert.fail('Should fail with 403');
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 400);
      assert.equal(e.response.data.message, 'Insufficient funds');
    }
  });

  it('admins should be able to create promotions', async function () {
    let response = await this.testState.api.postPromotions({json: {
      batchName: 'AUG-SILVER',
      denomination: 2500,
      numberOfCodes: 100,
      expiresAt: '2100-01-01 19:09:32.667Z',
    }});

    assert.exists(response);
    assert.equal(response.status, 201);
    assert.exists(response.data.id);

    let getResponse = await this.testState.api.getPromotions(response.data.id);

    assert.exists(getResponse);
    assert.equal(getResponse.status, 200);
    assert.equal(getResponse.data.batchName, 'AUG-SILVER');

    getResponse = await this.testState.api.getPromotionCodes();
    assert.equal(getResponse.status, 200);
    assert.equal(getResponse.data.data.length, 100);

    for (let code of getResponse.data.data) {
      assert.equal(code.serial.length, 8);
    }
  });

  it('admins should be unable to create promotions with same batch name', async function () {
    let response = await this.testState.api.postPromotions({json: {
      batchName: 'AUG-SILVER',
      denomination: 2500,
      numberOfCodes: 100,
      expiresAt: '2100-01-01 19:09:32.667Z',
    }});

    assert.exists(response);
    assert.equal(response.status, 201);
    assert.exists(response.data.id);

    try {
      let response = await this.testState.api.postPromotions({json: {
        batchName: 'AUG-SILVER',
        denomination: 50000,
        numberOfCodes: 10,
        expiresAt: '2200-01-01 19:09:32.667Z',
      }});
      assert.fail(`Should fail with 400, however status ${response.status} was received`);
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 400);
      assert.equal(e.response.data.message, 'Promotion batch name must be unique');
    }
  });

  it('users should be unable to create promotions with negative denomination', async function () {
    try {
      let response = await this.testState.api.postPromotions({json: {
        batchName: 'AUG-SILVER',
        denomination: -20,
        numberOfCodes: 10,
        expiresAt: '2200-01-01 19:09:32.667Z',
      }});
      assert.fail(`Should fail with 400, however status ${response.status} was received`);
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 400);
      assert.equal(e.response.data.message, 'Promotion denomination must be positive');
    }
  });

  it('users should be able to create promotions with null batch name', async function () {
    let response = await this.testState.api.postPromotions({json: {
      batchName: 'MEGA-STUFF',
      denomination: 1000,
      numberOfCodes: 100,
      expiresAt: '2100-01-01 19:09:32.667Z',
    }});

    assert.exists(response);
    assert.equal(response.status, 201);

    response = await this.testState.api.postPromotions({json: {
      batchName: null,
      denomination: 2000,
      numberOfCodes: 100,
      expiresAt: '2100-01-01 19:09:32.667Z',
    }});

    assert.exists(response);
    assert.equal(response.status, 201);

    response = await this.testState.api.postPromotions({json: {
      denomination: 2000,
      numberOfCodes: 100,
      expiresAt: '2100-01-01 19:09:32.667Z',
    }});
    assert.exists(response);
    assert.equal(response.status, 201);

    let getResponse = await this.testState.api.getPromotions();
    assert.exists(getResponse);
    assert.equal(getResponse.status, 200);

    const promotions = getResponse.data.data;
    const denominations = [1000, 2000, 3000];

    for (let promotion of promotions) {
      assert.isOk(promotion.batchName === null || promotion.batchName === 'MEGA-STUFF');
      assert.isOk(denominations.indexOf(promotion.denomination) >= 0);
    }

    getResponse = await this.testState.api.getPromotionCodes();
    assert.exists(getResponse);
    assert.equal(getResponse.status, 200);

    const codes = getResponse.data.data;
    const promotionIds = promotions.map((p) => p.id);

    for (let code of codes) {
      assert.isOk(code.availableUsages, 1);
      assert.isOk(denominations.indexOf(code.value) >= 0);
      assert.isOk(promotionIds.indexOf(code.promotionId) >= 0);
    }
  });

  it('users should be unable to use expired promo codes', async function () {
    let response = await this.testState.api.postPromotions({json: {
      batchName: 'MEGA-STUFF',
      denomination: 1000,
      numberOfCodes: 100,
      expiresAt: '2100-01-01 19:09:32.667Z',
    }});

    assert.equal(response.status, 201);
    const promotion = response.data;
    const codes = promotion.serials;
    assert.exists(codes);
    assert.equal(codes.length, 100);

    response = await this.testState.api.getPlayerAvailable({serial: codes[0]});
    assert.equal(response.status, 200);
    assert.equal(response.data.serial, codes[0]);
    assert.equal(response.data.exists, true);
    assert.equal(response.data.expired, false);

    const promoModel = this.testState.promotionsService.model;
    await promoModel.update({
      expiresAt: moment().add(-10, 'seconds').toISOString()
    }, {where: {id: promotion.id}});

    response = await this.testState.api.getPlayerAvailable({serial: codes[0]});
    assert.equal(response.status, 200);
    assert.equal(response.data.serial, codes[0]);
    assert.equal(response.data.exists, true);
    assert.equal(response.data.expired, true);

    try {
      response = await this.testState.api.postUsers({ json: {
        email: "user@example.com",
        name: 'BigJack500',
        termsAgreed: true,
        password: "password",
        promoCode: codes[0],
      }});
      assert.fail(`Should fail with 400, however status ${response.status} was received`);
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 400);
      assert.equal(e.response.data.message, 'Promotion has expired');
    }

    response = await this.testState.api.postUsers({ json: {
      email: "user@example.com",
      name: 'BigJack500',
      termsAgreed: true,
      password: "password",
    }});
    assert.equal(response.status, 201);

    response = await this.testState.api.postAuthLogin({ json: {
      "email": "user@example.com",
      "password": "password"
    }});
    assert.equal(response.status, 200);
    this.testState.api.authorizationBearer(response.data.jwt);

    try {
      let response = await this.testState.api.postPlayerAccountFunding({ json: {
        serial: codes[0]
      }});
      assert.fail(`Should fail with 400, however status ${response.status} was received`);
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 400);
      assert.equal(e.response.data.message, 'Promotion has expired');
    }
  });
};
