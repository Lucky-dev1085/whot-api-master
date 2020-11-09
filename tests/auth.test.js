/* eslint arrow-body-style: ["off"] */
/* eslint global-require: ["off"] */

'use strict';
const { assert } = require('chai');

const cfg = reqlib('_/src/modules/feathers-auth/cfg');
const models = reqlib('_/src/models');
const tokenModel = models[cfg.tokenModel];

module.exports = function suite() {

  it('should be able to login', async function () {
    const response = await this.testState.api.postAuthLogin({ json: {
      "email": "admin@example.com",
      "password": "password"
    }});

    assert.exists(response);
    assert.equal(response.status, 200);
    
    assert.exists(response.data.jwt);
    assert.exists(response.data.user);
    
    const user = response.data.user;
    assert.exists(user.id);
    assert.exists(user.name);

    this.testState.api.authorizationBearer(response.data.jwt);
    const userResponse = await this.testState.api.getUsers(user.id);
    assert.equal(userResponse.status, 200);
  });

  it('should fail to reset-password for unknown emails', async function () {
    try {
      await this.testState.api.getAuthPasswordReset({ email: "unknown-email-addr@example.com" });
      assert.fail('Should fail with 404');
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 404);
      assert.exists(e.response.data.message);
    }

    try {
      await this.testState.api.postAuthPasswordReset({json: {
        token: "abc",
        password: "password",
      }});
      assert.fail('Should fail with 404');
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 404);
      assert.exists(e.response.data.message);
    }
  });

  it('should be able to reset-password', async function () {
    const adminUser = this.testState.adminUser;
    let response = await this.testState.api.getAuthPasswordReset({ email: adminUser.email });
    assert.equal(response.status, 204);

    const tokens = await this.testState.tokensService.find();
    const relevantTokens = tokens.data.filter(function(t) {
      return t.userId == adminUser.id && t.scope == 'password-reset';
    });
    // assert.equal(relevantTokens.length, 1);
    const t = relevantTokens[0];

    response = await this.testState.api.postAuthPasswordReset({json: {
      token: t.id,
      password: "password",
    }});
    assert.equal(response.status, 200);
  });

  it('should be able to reset-password and user name', async function () {
    const adminUser = this.testState.adminUser;
    let response = await this.testState.api.getAuthPasswordReset({ email: adminUser.email });
    assert.equal(response.status, 204);

    const tokens = await this.testState.tokensService.find();
    const relevantTokens = tokens.data.filter(function(t) {
      return t.userId == adminUser.id && t.scope == 'password-reset';
    });
    const t = relevantTokens[0];

    response = await this.testState.api.postAuthPasswordReset({json: {
      token: t.id,
      name: 'John Doe',
      password: "password",
    }});
    assert.equal(response.status, 200);

    let loginResponse = await this.testState.api.postAuthLogin({ json: {
      "email": adminUser.email,
      "password": "password"
    }});
    assert.equal(loginResponse.status, 200);
    this.testState.api.authorizationBearer(loginResponse.data.jwt);

    let userResponse = await this.testState.api.getUsers({ email: adminUser.email });
    assert.equal(userResponse.status, 200);
    let userData = userResponse.data.data;

    assert.equal(userData.length, 1);
    assert.equal(userData[0].name, 'John Doe');
  });  

  it('should fail for expired tokens', async function () {
    const tokens = await this.testState.tokensService.find();
    const adminUser = this.testState.adminUser;
    
    const relevantTokens = tokens.data.filter(function(t) {
      return t.userId == adminUser.id && t.scope == 'password-reset';
    });
    assert.equal(relevantTokens.length, 1);
    const t = relevantTokens[0];

    // Hack the token creation date
    await tokenModel.update({ createdAt: '2019-01-01 05:34:55.330 +00:00' }, { where: { id: t.id } });

    try {
      await this.testState.api.postAuthPasswordReset({json: {
        token: t.id,
        password: "password",
      }});
      assert.fail('Should fail with 403');
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 403);
      assert.exists(e.response.data.message);
    }
  });

  it('should be able to change password', async function () {
    const userResponse = await this.testState.api.postUsers({ json: {
      email: "user@example.com",
      name: 'BigJack500',
      termsAgreed: true,
      password: "password",
    }});
    assert.equal(userResponse.status, 201);

    let response = await this.testState.api.postAuthLogin({ json: {
      "email": "user@example.com",
      "password": "password"
    }});
    assert.equal(response.status, 200);
    this.testState.api.authorizationBearer(response.data.jwt);

    const patchResponse = await this.testState.api.patchUsers(response.data.user.id, { json: {
      password: "asdf1234",
    }});
    assert.equal(patchResponse.status, 200);

    this.testState.api.authorizationBearer(response.data.jwt);
    response = await this.testState.api.postAuthLogin({ json: {
      "email": "user@example.com",
      "password": "asdf1234"
    }});
    assert.equal(response.status, 200);

    try {
      await this.testState.api.postAuthLogin({ json: {
        "email": "user@example.com",
        "password": "password"
      }});
      assert.fail('Should fail with 403');
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 403);
    }
  });

  it('should be able to filter by permission', async function () {
    const userResponse = await this.testState.api.postUsers({ json: {
      email: "user@example.com",
      name: 'BigJack500',
      termsAgreed: true,
      password: "password",
    }});
    assert.equal(userResponse.status, 201);

    const adminUser = this.testState.adminUser;
    let loginResponse = await this.testState.api.postAuthLogin({ json: {
      "email": adminUser.email,
      "password": "password"
    }});
    assert.equal(loginResponse.status, 200);
    this.testState.api.authorizationBearer(loginResponse.data.jwt);

    const allUsersResp = await this.testState.api.getUsers({});
    assert.equal(allUsersResp.status, 200);
    assert.equal(allUsersResp.data.data.length, 2);

    const admUsersResp = await this.testState.api.getUsers({
      $include: 'roles.permissions',
      '$roles.permissions.id$': ['admin-app:read', '*'],
    });
    assert.equal(admUsersResp.status, 200);
    assert.equal(admUsersResp.data.data.length, 1);
    assert.equal(admUsersResp.data.data[0]['name'], 'Jack Daniels');

    const regularUsersResp = await this.testState.api.getUsers({
      $include: 'roles.permissions',
      '$roles.id$': 'user',
    });
    assert.equal(regularUsersResp.status, 200);
    assert.equal(regularUsersResp.data.data.length, 1);
    assert.equal(regularUsersResp.data.data[0]['name'], 'BigJack500');
    assert.isOk(regularUsersResp.data.data[0]['roles'][0]['permissions']);
  });

  it('should be able to filter by role with limit', async function () {
    const adminUser = this.testState.adminUser;
    let loginResponse = await this.testState.api.postAuthLogin({ json: {
      "email": adminUser.email,
      "password": "password"
    }});
    assert.equal(loginResponse.status, 200);
    this.testState.api.authorizationBearer(loginResponse.data.jwt);

    const userResponse = await this.testState.api.postUsers({ json: {
      email: "user@example.com",
      name: 'SQLfail500',
      termsAgreed: true,
      password: "password",
      roles: {set: ['admin']}
    }});
    assert.equal(userResponse.status, 201);

    const admUsersResp = await this.testState.api.getUsers({
      '$include': 'roles',
      '$roles.id$': ['admin'],
      '@roles.id': ['admin'],
      '$offset': 0,
      '$limit': 1,
    });
    assert.equal(admUsersResp.status, 200);
    assert.equal(admUsersResp.data.data.length, 1);
    assert.equal(admUsersResp.data.data[0]['name'], 'Jack Daniels');
  });

  it('should be able to filter by permission with limit', async function () {
    const userResponse = await this.testState.api.postUsers({ json: {
      email: "user@example.com",
      name: 'SQLfail500',
      termsAgreed: true,
      password: "password",
    }});
    assert.equal(userResponse.status, 201);

    const adminUser = this.testState.adminUser;
    let loginResponse = await this.testState.api.postAuthLogin({ json: {
      "email": adminUser.email,
      "password": "password"
    }});
    assert.equal(loginResponse.status, 200);
    this.testState.api.authorizationBearer(loginResponse.data.jwt);

    const admUsersResp = await this.testState.api.getUsers({
      '$include': 'roles.permissions',
      '$roles.permissions.id$': ['admin-app:read', '*'],
      '@roles.permissions.id': ['admin-app:read', '*'],
      '$offset': 0,
      '$limit': 1,
    });
    assert.equal(admUsersResp.status, 200);
    assert.equal(admUsersResp.data.data.length, 1);
    assert.equal(admUsersResp.data.data[0]['name'], 'Jack Daniels');
  });

  it('should reject disbled user login', async function () {
    const userResponse = await this.testState.api.postUsers({ json: {
      email: "user@example.com",
      name: 'SQLfail500',
      termsAgreed: true,
      password: "password",
    }});
    assert.equal(userResponse.status, 201);
    const userId = userResponse.data.id;

    const adminUser = this.testState.adminUser;
    let loginResponse = await this.testState.api.postAuthLogin({ json: {
      "email": adminUser.email,
      "password": "password"
    }});
    assert.equal(loginResponse.status, 200);
    this.testState.api.authorizationBearer(loginResponse.data.jwt);

    const admUsersResp = await this.testState.api.patchUsers(userId, {json: {
      status: 'disabled'
    }});
    assert.equal(admUsersResp.status, 200);

    try {
      await this.testState.api.postAuthLogin({ json: {
        email: "user@example.com",
        password: "password"
      }});
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 403);
    }

    let resp = await this.testState.api.patchUsers(userId, {json: {
      status: 'disabled',
      roles: {set: ['superadmin']}
    }});
    assert.equal(resp.status, 200);

    try {
      await this.testState.api.postAuthLogin({ json: {
        email: "user@example.com",
        password: "password"
      }});
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 403);
    }

    resp = await this.testState.api.patchUsers(userId, {json: {
      status: 'active'
    }});
    assert.equal(resp.status, 200);

    resp = await this.testState.api.postAuthLogin({ json: {
      email: "user@example.com",
      password: "password"
    }});
    assert.equal(resp.status, 200);
  });

  it('should be able to login irrespective of email case', async function () {
    const response = await this.testState.api.postAuthLogin({ json: {
      email: 'AdmiN@ExamPle.Com',
      password: 'password',
    } });

    assert.exists(response);
    assert.equal(response.status, 200);
  });
};
