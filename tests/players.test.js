/* eslint arrow-body-style: ["off"] */
/* eslint global-require: ["off"] */

'use strict';
const { assert } = require('chai');

const cfg = reqlib('_/src/modules/feathers-auth/cfg');
const models = reqlib('_/src/models');
const tokenModel = models[cfg.tokenModel];

module.exports = function suite() {

  afterEach(async function() {
    this.testState.api.authorizationBearer("Unauthorized");
  });

  it('should have users', async function () {
    const users = await this.testState.usersService.find();
    
    assert.exists(users);
    assert.exists(users.data);
    assert.equal(users.data.length, 1);
  });

  it('should be unable to create users with same name', async function () {
    this.testState.api.authorizationBearer('x');

    const response = await this.testState.api.postUsers({ json: {
      email: "user@example.com",
      name: 'BigJack500',
      termsAgreed: true,
      password: "password",
    }});
    assert.equal(response.status, 201);    

    try {
      await this.testState.api.postUsers({ json: {
        email: "jack@daniels.com",
        name: 'BigJack500',
        termsAgreed: true,
        password: "super",
      }});
      assert.fail('Should fail with 400');
    } catch(e) {
      assert.equal(e.response.status, 400);
      assert.equal(e.response.data.message, 'Username already exists');
    }
  });

  it('should be able to create users with promo code', async function () {
    let response = await this.testState.api.postAuthLogin({ json: {
      "email": "admin@example.com",
      "password": "password"
    }});
    assert.equal(response.status, 200);
    this.testState.api.authorizationBearer(response.data.jwt);

    response = await this.testState.api.postPromotions({json: {
      batchName: 'AUG-SILVER',
      denomination: 450,
      numberOfCodes: 1,
      expiresAt: '2100-01-01 19:09:32.667Z',
    }});
    assert.equal(response.status, 201);

    assert.equal(response.data.serials.length, 1);
    const serial = response.data.serials[0];

    // Logout
    this.testState.api.authorizationBearer('x');

    response = await this.testState.api.postUsers({ json: {
      email: "user@example.com",
      name: 'BigJack500',
      termsAgreed: true,
      password: "password",
      promoCode: serial,
    }});
    assert.equal(response.status, 201);

    try {
      await this.testState.api.getPlayerDetails({userId: response.data.id});
      assert.fail();
    } catch(e) {
      assert.equal(e.response.status, 401);
    }
    
    const authResponse = await this.testState.api.postAuthLogin({ json: {
      "email": "user@example.com",
      "password": "password"
    }});
    assert.equal(authResponse.status, 200);

    this.testState.api.authorizationBearer(authResponse.data.jwt);

    const pdResponse = await this.testState.api.getPlayerDetails({userId: response.data.id});
    assert.equal(pdResponse.status, 200);
    assert.equal(pdResponse.data.data[0].depositBalance, 450);
  });

  it('should be unable to create users with invalid promo code', async function () {
    this.testState.api.authorizationBearer('x');

    try {
      const response = await this.testState.api.postUsers({ json: {
        email: "jack@daniels.com",
        name: 'BigJack500',
        password: "super",
        promoCode: "BAD BAD BAD",
      }});
      assert.fail();
    } catch(e) {
      assert.equal(e.response.status, 400);
      assert.equal(e.response.data.message, 'Incorrect promotion code serial number');
    }
  });

  it('should be unable to create admins while unauthenticated', async function () {
    this.testState.api.authorizationBearer('x');

    try {
      await this.testState.api.postUsers({ json: {
        email: "super_master@example.com",
        name: 'SuperJack',
        password: "password",
        roles: {
          set: ['superadmin']
        }
      }});
      assert.fail('Should fail with 401');
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 401);
    }

    try {
      await this.testState.api.postUsers({ json: {
        email: "master@example.com",
        name: 'AdminJack',
        password: "password",
        roles: {
          set: ['admin']
        }
      }});
      assert.fail('Should fail with 401');
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 401);
    }    
  });

  it('should be able to create players or admins', async function () {
    const authResponse = await this.testState.api.postAuthLogin({ json: {
      "email": "admin@example.com",
      "password": "password"
    }});
    assert.equal(authResponse.status, 200);
    this.testState.api.authorizationBearer(authResponse.data.jwt);

    const userResponse = await this.testState.api.postUsers({ json: {
      email: "user@example.com",
      name: 'BigJack500',
      termsAgreed: true,
      password: "password",
    }});
    assert.equal(userResponse.status, 201);

    let response = await this.testState.api.getUsers(userResponse.data.id, {$include: 'roles'});
    assert.equal(response.status, 200);
    assert.equal(response.data.roles[0].id, 'user');

    const adminResponse = await this.testState.api.postUsers({ json: {
      email: "master@example.com",
      name: 'SuperJack',
      password: "password",
      roles: {
        set: ['admin']
      }
    }});
    assert.equal(adminResponse.status, 201);

    response = await this.testState.api.getUsers(adminResponse.data.id, {$include: 'roles'});
    assert.equal(response.status, 200);
    assert.equal(response.data.roles[0].id, 'admin');
  });

  it('should be unable to patch user name to another already existing name', async function () {
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

    const playerId = authResponse.data.user.playerDetail.id;
    assert.exists(playerId);

    this.testState.api.authorizationBearer(authResponse.data.jwt);

    try {
      await this.testState.api.patchPlayerDetails(playerId, { json: {
        name: "Jack Daniels",
      }});
      assert.fail('Should fail with 400');
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 400);
      assert.equal(e.response.data.message, 'Username already exists');
    }
  });

  it('should be forbidden for users to patch mobile phone if already set', async function () {
    let response = await this.testState.api.postUsers({ json: {
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

    const playerId = authResponse.data.user.playerDetail.id;
    assert.exists(playerId);

    this.testState.api.authorizationBearer(authResponse.data.jwt);

    response = await this.testState.api.patchPlayerDetails(playerId, { json: {
      mobile: "01112223334",
    }});
    assert.equal(response.status, 200);
    assert.isOk(response.data.token);

    // Mobile is unverified, so this should work
    response = await this.testState.api.patchPlayerDetails(playerId, { json: {
      mobile: "+2345552223335",
    }});
    assert.equal(response.status, 200);
    assert.isOk(response.data.token);

    // Verify phone number
    const tokenObject = await tokenModel.findOne({ where: {id: response.data.token}});
    const verificationResponse = await this.testState.api.postPlayerVerification({json: {
      token: tokenObject.id,
      code: tokenObject.data.code,
    }});
    assert.equal(response.status, 200);

    try {
      await this.testState.api.patchPlayerDetails(playerId, { json: {
        mobile: "+2345552223334",
      }});
      assert.fail('Should fail with 400');
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 400);
      assert.equal(e.response.data.message, 'Mobile phone number cannot be updated, please contact support');
    }
  });

  it('should be allowed for admins to patch mobile phone if already set', async function () {
    const authResponse = await this.testState.api.postAuthLogin({ json: {
      "email": "admin@example.com",
      "password": "password"
    }});
    assert.equal(authResponse.status, 200);
    const playerId = authResponse.data.user.playerDetail.id;
    this.testState.api.authorizationBearer(authResponse.data.jwt);

    let response = await this.testState.api.patchPlayerDetails(playerId, { json: {
      mobile: "01112223334",
    }});
    assert.equal(response.status, 200);
    assert.isOk(!response.data.token);
    assert.isOk(response.data.mobileVerificationTimestamp);

    response = await this.testState.api.patchPlayerDetails(playerId, { json: {
      mobile: "+2345552223335",
    }});
    assert.equal(response.status, 200);
    assert.isOk(!response.data.token);
    assert.isOk(response.data.mobileVerificationTimestamp);

    try {
      // Can't set the mobile verification timestamp explicitly
      await this.testState.api.patchPlayerDetails(playerId, { json: {
        mobileVerificationTimestamp: "2019-08-15T13:57:33.147Z",
      }});
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 400);
      assert.equal(e.response.data.message, 'Invalid Parameters');
    }
  });

  it('should disable user on self-remove', async function () {
    const authResponse = await this.testState.api.postAuthLogin({ json: {
      "email": "admin@example.com",
      "password": "password"
    }});
    assert.equal(authResponse.status, 200);
    const userId = authResponse.data.user.id;
    this.testState.api.authorizationBearer(authResponse.data.jwt);

    const response = await this.testState.api.deleteUsers(userId)
    assert.equal(response.status, 200);
  });

  it('should allow checking username availability', async function () {
    this.testState.api.authorizationBearer("Unauthorized");

    let response = await this.testState.api.getPlayerAvailable({ name: "JimBean"});
    assert.equal(response.status, 200);
    assert.equal(response.data.available, true);

    response = await this.testState.api.getPlayerAvailable({ name: "Jack Daniels"});
    assert.equal(response.status, 200);
    assert.equal(response.data.available, false);

    response = await this.testState.api.getPlayerAvailable({ name: "jack daniels"});
    assert.equal(response.status, 200);
    assert.equal(response.data.available, false);

    response = await this.testState.api.getPlayerNames({ nameSearch: "jack d"});
    assert.equal(response.status, 200);
    assert.equal(response.data.count, 1);
    assert.equal(response.data.player_details.length, 1);
    assert.equal(response.data.player_details[0].name, 'Jack Daniels');
  });

  it('should allow checking email existence', async function () {
    this.testState.api.authorizationBearer("Unauthorized");

    let response = await this.testState.api.getPlayerAvailable({ email: "admin@example.com"});
    assert.equal(response.status, 200);
    assert.equal(response.data.available, false);
    assert.equal(response.data.exists, true);

    response = await this.testState.api.getPlayerAvailable({ email: "james@example.com"});
    assert.equal(response.status, 200);
    assert.equal(response.data.available, true);
    assert.equal(response.data.exists, false);
  });

  it('should allow checking serials validity', async function () {
    const authResponse = await this.testState.api.postAuthLogin({ json: {
      "email": "admin@example.com",
      "password": "password"
    }});
    assert.equal(authResponse.status, 200);
    this.testState.api.authorizationBearer(authResponse.data.jwt);

    let response = await this.testState.api.postPromotions({json: {
      batchName: 'AUG-SILVER',
      denomination: 450,
      numberOfCodes: 1,
      expiresAt: '2100-01-01 19:09:32.667Z',
    }});
    assert.equal(response.status, 201);

    assert.equal(response.data.serials.length, 1);
    const serial = response.data.serials[0];

    // Logout
    this.testState.api.authorizationBearer("Unauthorized");

    response = await this.testState.api.getPlayerAvailable({ serial });
    assert.equal(response.status, 200);
    assert.equal(response.data.exists, true);
    assert.equal(response.data.expired, false);

    response = await this.testState.api.getPlayerAvailable({ serial: "11223344"});
    assert.equal(response.status, 200);
    assert.equal(response.data.exists, false);
    assert.equal(response.data.expired, true);
  });
};
