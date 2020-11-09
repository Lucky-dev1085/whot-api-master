/* eslint arrow-body-style: ["off"] */
/* eslint global-require: ["off"] */

'use strict';
const moment = require('moment');
const { assert } = require('chai');
const models = reqlib('_/src/models');
const cfg = reqlib('_/src/modules/feathers-auth/cfg');
const tokenModel = models[cfg.tokenModel];

module.exports = function suite() {

  beforeEach(async function() {
    const response = await this.testState.api.postAuthLogin({ json: {
      "email": "admin@example.com",
      "password": "password"
    }});
    assert.equal(response.status, 200);

    this.testState.api.authorizationBearer(response.data.jwt);
    const user = response.data.user;

    const pdResponse = await this.testState.api.getPlayerDetails({userId: user.id});
    assert.equal(pdResponse.status, 200);

    assert.equal(pdResponse.data.data.length, 1);
    this.testState.playerDetail = pdResponse.data.data[0];
    assert.isOk(this.testState.playerDetail.id);
  });

  afterEach(async function() {
    this.testState.api.authorizationBearer("Unauthorized");
  });

  it('should be able to create game table', async function () {
    const pdResponse = await this.testState.api.patchPlayerDetails(this.testState.playerDetail.id, {json: {
      name: 'Big Jack',
    }});
    assert.equal(pdResponse.status, 200);

    const gameTablesResponse = await this.testState.api.postGameTables({json: {
      playerDetailId: this.testState.playerDetail.id,
      tableTitle: "Big Jacck's monster table",
    }});
    assert.equal(gameTablesResponse.status, 201);
    assert.isOk(gameTablesResponse.data.chatRoomId);
  });

  describe('game table search and filter tests', function() {
    beforeEach(async function() {
      const gt1Response = await this.testState.api.postGameTables({json: {
        playerDetailId: this.testState.playerDetail.id,
        tableTitle: "Big Jacck's monster table",
        tablePassword: "123",
      }});
      assert.equal(gt1Response.status, 201);

      const gt2Response = await this.testState.api.postGameTables({json: {
        playerDetailId: this.testState.playerDetail.id,
        tableTitle: "Small table",
        tablePassword: "",
      }});
      assert.equal(gt2Response.status, 201);
    });

    it('should be able to search game table', async function () {
      const allTablesResponse = await this.testState.api.getGameTables({$limit: 999});
      assert.equal(allTablesResponse.status, 200);
      assert.equal(allTablesResponse.data.data.length, 2);
      assert.equal(allTablesResponse.data.limit, 999);
      assert.equal(allTablesResponse.data.total, 2);

      const filteredNoFieldResponse = await this.testState.api.getGameTables({
        $limit: 999, $q: 'Big'
      });
      assert.equal(filteredNoFieldResponse.status, 200);
      assert.equal(filteredNoFieldResponse.data.data.length, 2);
      assert.equal(filteredNoFieldResponse.data.limit, 999);
      assert.equal(filteredNoFieldResponse.data.total, 2);

      const filteredFieldResponse = await this.testState.api.getGameTables({
        $limit: 999, $q: 'Big', $searchFields: 'tableTitle'
      });
      assert.equal(filteredFieldResponse.status, 200);
      assert.equal(filteredFieldResponse.data.data.length, 1);
      assert.equal(filteredFieldResponse.data.limit, 999);
      assert.equal(filteredFieldResponse.data.total, 1);
    });

    it('should be able to filter game tables by player name', async function () {
      const allTablesResp = await this.testState.api.getGameTables({
        $limit: 999,
        $include: 'player_detail',
        '$player_detail.name$': 'Jack Daniels',
      });

      assert.equal(allTablesResp.status, 200);
      assert.equal(allTablesResp.data.data.length, 2);
      assert.equal(allTablesResp.data.limit, 999);
      assert.equal(allTablesResp.data.total, 2);

      const limitedTablesResp = await this.testState.api.getGameTables({
        $limit: 1, $offset: 0,
        $include: 'player_detail',
        '$player_detail.name$': 'Jack Daniels',
        $q: 'big', $searchFields: 'tableTitle'
      });

      assert.equal(limitedTablesResp.status, 200);
      assert.equal(limitedTablesResp.data.data.length, 1);
      assert.equal(limitedTablesResp.data.limit, 1);
      assert.equal(limitedTablesResp.data.total, 1);

      const noTablesResp = await this.testState.api.getGameTables({
        $include: 'player_detail',
        '$player_detail.name$': 'does-not-exist'
      });

      assert.equal(noTablesResp.status, 200);
      assert.equal(noTablesResp.data.data.length, 0);
    });
  });

  it('should be able schedule a featured game table', async function () {
    const pdResponse = await this.testState.api.patchPlayerDetails(this.testState.playerDetail.id, {json: {
      name: 'Big Jack',
    }});
    assert.equal(pdResponse.status, 200);

    const gameTablesResponse = await this.testState.api.postGameTables({json: {
      tableTitle: "Big Jack's monster table",
      tablePassword: null,
      logo: null,
      gameType: "Public",
      featured: true,
      maxPlayerCount: 5,
      minStakeAmount: 0,
      stakeAmount: 5,
      startingAt: moment().add(1, 'hours'),
    }});
    assert.equal(gameTablesResponse.status, 201);
    assert.equal(gameTablesResponse.data.playerDetailId, pdResponse.data.id);
  });

  it('should be able create game table with non-player admin', async function () {
    const user = await this.testState.usersService.create({
      email: 'moderator@example.com',
      name: 'Moderator Jane',
      emailVerified: true,
      password: 'password',
      roles: {set: ['superadmin', 'admin']}
    });
    assert.exists(user);

    const delPlayerDetailsResponse = await this.testState.api.deletePlayerDetails({
      userId: user.id
    });
    assert.equal(delPlayerDetailsResponse.status, 200);

    const authResponse = await this.testState.api.postAuthLogin({ json: {
      "email": "moderator@example.com",
      "password": "password"
    }});
    assert.equal(authResponse.status, 200);
    this.testState.api.authorizationBearer(authResponse.data.jwt);

    const gameTablesResponse = await this.testState.api.postGameTables({json: {
      tableTitle: "Big Jack's monster table",
      tablePassword: null,
      logo: null,
      gameType: "Public",
      featured: true,
      maxPlayerCount: 5,
      minStakeAmount: 0,
      stakeAmount: 5000,
    }});
    assert.equal(gameTablesResponse.status, 201);
    assert.isOk(!gameTablesResponse.data.playerDetailId);
  });

  it('should be possible for players to create game tables and be joined automatically', async function () {
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

    const gameTablesResponse = await this.testState.api.postGameTables({json: {
      tableTitle: "Big Jack's monster table",
      gameType: "PUBLIC",
      maxPlayerCount: 5,
      minStakeAmount: 0,
    }});
    assert.equal(gameTablesResponse.status, 201);
    const table = gameTablesResponse.data;

    try {
      await this.testState.api.postJoinGameTable({ json: {
        gameTableId: table.id,
        stakeAmount: 300,
      }});
      assert.fail('Should fail with 400');
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 400);
      assert.equal(e.response.data.message, 'Already joined this table');
    }
  });

  it('should be possible for players to join game tables', async function () {
    const gameTablesResponse = await this.testState.api.postGameTables({json: {
      tableTitle: "Big Jack's monster table",
      gameType: "PUBLIC",
      featured: true,
      maxPlayerCount: 5,
      stakeAmount: 0,
      minStakeAmount: 0,
      startingAt: moment().add(1, 'hours'),
    }});
    assert.equal(gameTablesResponse.status, 201);
    const table = gameTablesResponse.data;

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
    const gameStateResponse = await this.testState.api.postJoinGameTable({ json: {
      gameTableId: table.id,
    }});
    assert.equal(gameTablesResponse.status, 201);
  });

  it('should be possible for players to invite other players', async function () {
    let response = await this.testState.api.postPromotions({json: {
      batchName: 'AUG-SILVER',
      denomination: 15000,
      numberOfCodes: 1,
      expiresAt: '2100-01-01 19:09:32.667Z',
    }});
    assert.equal(response.status, 201);

    assert.equal(response.data.serials.length, 1);
    const serial = response.data.serials[0];
    
    response = await this.testState.api.postUsers({ json: {
      email: "user@example.com",
      name: 'BigJack500',
      termsAgreed: true,
      password: "password",
      promoCode: serial,
    }});
    assert.equal(response.status, 201);

    const pdResponse = await this.testState.api.getPlayerDetails({userId: response.data.id});
    const playerDetailId = pdResponse.data.data[0].id;

    const gameTablesResponse = await this.testState.api.postGameTables({json: {
      tableTitle: "Big Jack's monster table",
      gameType: "PUBLIC",
      featured: true,
      maxPlayerCount: 5,
      stakeAmount: 5001,
      minStakeAmount: 5000,
      startingAt: moment().add(1, 'hours'),
    }});
    assert.equal(gameTablesResponse.status, 201);
    const table = gameTablesResponse.data;

    const gameStateResponse = await this.testState.api.postGameTableInvitations({ json: {
      gameTableId: table.id,
      playerDetailIds: [playerDetailId],
    }});
    assert.equal(gameTablesResponse.status, 201);

    const tokenObject = await tokenModel.findOne({ where: {scope: 'gameInvitation'}});

    const invitationResponse = await this.testState.api.getGameTableInvitations({ token: tokenObject.id });
    const inviteData = invitationResponse.data;

    assert.equal(inviteData.gameTableId, table.id);

    const declineInvitationResponse = await this.testState.api.getGameTableInvitations({
      token: tokenObject.id, action: 'decline'
    });

    assert.equal(declineInvitationResponse.statusText, 'OK');
  });

  it('should be check account funding before joining a table', async function () {
    const user = await this.testState.usersService.create({
      email: 'moderator@example.com',
      name: 'Moderator Jane',
      emailVerified: true,
      password: 'password',
      roles: {set: ['superadmin', 'admin']}
    });
    assert.exists(user);

    const delPlayerDetailsResponse = await this.testState.api.deletePlayerDetails({
      userId: user.id
    });
    assert.equal(delPlayerDetailsResponse.status, 200);

    let authResponse = await this.testState.api.postAuthLogin({ json: {
      "email": "moderator@example.com",
      "password": "password"
    }});
    assert.equal(authResponse.status, 200);
    this.testState.api.authorizationBearer(authResponse.data.jwt);

    const gameTablesResponse = await this.testState.api.postGameTables({json: {
      tableTitle: "Big Jack's monster table",
      gameType: "Public",
      featured: true,
      maxPlayerCount: 5,
      minStakeAmount: 30000,
      stakeAmount: 0,
    }});
    assert.equal(gameTablesResponse.status, 201);
    const table = gameTablesResponse.data;
    assert.isOk(!table.playerDetailId);
    assert.isOk(table.startingAt);

    const response = await this.testState.api.postUsers({ json: {
      email: "user@example.com",
      name: 'BigJack500',
      termsAgreed: true,
      password: "password",
    }});
    assert.equal(response.status, 201);

    authResponse = await this.testState.api.postAuthLogin({ json: {
      "email": "user@example.com",
      "password": "password"
    }});
    assert.equal(authResponse.status, 200);
    this.testState.api.authorizationBearer(authResponse.data.jwt);

    try {
      await this.testState.api.postJoinGameTable({ json: {
        gameTableId: table.id,
      }});
      assert.fail('Should fail with 400');
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 400);
      assert.equal(e.response.data.message, 'Insufficient funds');
    }
  });

  it('should receive countdown notifications', async function () {
    const gameTablesResponse = await this.testState.api.postGameTables({json: {
      tableTitle: "Big Jack's monster table",
      gameType: "PUBLIC",
      featured: true,
      maxPlayerCount: 5,
      stakeAmount: 0,
      minStakeAmount: 0,
      startingAt: moment().add(15, 'seconds'),
    }});
    assert.equal(gameTablesResponse.status, 201);
    const table = gameTablesResponse.data;

    let response = await this.testState.api.getPlayerGames();
    assert.equal(response.status, 200);

    let countdownTables = response.data.data;
    assert.equal(countdownTables.length, 1);
    assert.isOk(countdownTables[0].userId);

    assert.isOk(countdownTables[0].gameTable);
    assert.equal(countdownTables[0].gameTable.id, table.id);

    assert.isOk(response.data.realtimeConnection);
    assert.equal(response.data.realtimeConnection.playerGamesService, 'player-games');
  });
};
