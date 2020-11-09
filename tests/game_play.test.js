/* eslint arrow-body-style: ["off"] */
/* eslint global-require: ["off"] */

'use strict';
const { assert } = require('chai');
const { playGame, sleep } = require('./game_play_utils');

const cfg = reqlib('_/src/modules/feathers-auth/cfg');
const models = reqlib('_/src/models');
const tokenModel = models[cfg.tokenModel];

module.exports = function suite() {
  beforeEach(async function() {
    const response = await this.testState.api.postUsers({ json: {
      email: "user-jack@example.com",
      name: 'BigJack500',
      termsAgreed: true,
      password: "password",
    }});
    assert.equal(response.status, 201);

    const authResponse = await this.testState.api.postAuthLogin({ json: {
      "email": "user-jack@example.com",
      "password": "password"
    }});
    assert.equal(authResponse.status, 200);
    const user = authResponse.data.user;

    this.testState.api.authorizationBearer(authResponse.data.jwt);
    const pdResponse = await this.testState.api.getPlayerDetails({userId: user.id});
    assert.equal(pdResponse.status, 200);

    assert.equal(pdResponse.data.data.length, 1);
    this.testState.playerDetail = pdResponse.data.data[0];

    const gameTablesResponse = await this.testState.api.postGameTables({json: {
      tableTitle: "Big Jack's monster table",
      minStakeAmount: 0,
      maxPlayerCount: 5,
    }});
    assert.equal(gameTablesResponse.status, 201);
    this.testState.gameTable = gameTablesResponse.data;
  });

  afterEach(async function() {
    this.testState.api.authorizationBearer("Unauthorized");
  });

  it('should be able to start a new game', async function () {
    let response = await this.testState.api.postGamePlay({ json: {
      gameTableId: this.testState.gameTable.id
    }});
    assert.exists(response);
    assert.equal(response.status, 201);

    assert.exists(response.data);
    assert.equal(response.data.status, 'live');

    assert.exists(response.data.deck);
    assert.equal(response.data.deck.length, 4);

    assert.exists(response.data.nextPlayer);
    assert.exists(response.data.players);
    assert.equal(response.data.players.length, 5);

    assert.exists(response.data.upCard);
    assert.exists(response.data.upCard.suit);
    assert.exists(response.data.upCard.rank);

    const authResponse = await this.testState.api.postAuthLogin({ json: {
      "email": "admin@example.com",
      "password": "password"
    }});
    assert.equal(authResponse.status, 200);
    this.testState.api.authorizationBearer(authResponse.data.jwt);
    const gameTablesResponse = await this.testState.api.getGameTables(this.testState.gameTable.id);
    assert.equal(gameTablesResponse.data.gameStatus, 'live');
  });

  it('should auto-start games when all players join', async function () {
    let response = await this.testState.api.patchGameTables(this.testState.gameTable.id, {json: {
      maxPlayerCount: 2,
    }});
    assert.equal(response.status, 200);

    response = await this.testState.api.getGamePlay(this.testState.gameTable.id);
    assert.equal(response.status, 200);

    let gameState = response.data;
    assert.equal(gameState.status, 'notStarted');

    response = await this.testState.api.postUsers({ json: {
      email: "jane@example.com",
      name: 'WhotJane',
      termsAgreed: true,
      password: "password",
    }});
    assert.equal(response.status, 201);

    response = await this.testState.api.postAuthLogin({ json: {
      "email": "jane@example.com",
      "password": "password"
    }});
    assert.equal(response.status, 200);

    this.testState.api.authorizationBearer(response.data.jwt);
    response = await this.testState.api.postJoinGameTable({ json: {
      gameTableId: this.testState.gameTable.id,
    }});
    assert.equal(response.status, 201);

    response = await this.testState.api.getGamePlay(this.testState.gameTable.id);
    assert.equal(response.status, 200);
    assert.equal(response.data.status, 'live');
  });

  it('should be able to get game play for notStarted games', async function () {
    let response = await this.testState.api.getGamePlay(this.testState.gameTable.id);
    assert.exists(response);
    assert.equal(response.status, 200);
    assert.exists(response.data);

    const gameState = response.data;
    assert.equal(gameState.status, 'notStarted');
  });

  it('should be able to get game play', async function () {
    let response = await this.testState.api.postGamePlay({ json: {
      gameTableId: this.testState.gameTable.id
    }});
    assert.exists(response);
    assert.equal(response.status, 201);

    response = await this.testState.api.getGamePlay(this.testState.gameTable.id);
    assert.exists(response);
    assert.equal(response.status, 200);
    assert.exists(response.data);

    assert.exists(response.data.deck);
    assert.equal(response.data.deck.length, 4);

    assert.exists(response.data.nextPlayer);
    assert.exists(response.data.players);
    assert.equal(response.data.players.length, 5);

    for (let player of response.data.players) {
      assert.exists(player.name);
      assert.exists(player.isRobot);
    }

    assert.exists(response.data.upCard);
    assert.exists(response.data.upCard.suit);
    assert.exists(response.data.upCard.rank);

    assert.isOk(response.data.realtimeConnection);
    assert.isOk(response.data.realtimeConnection.socketioUrl);
    assert.isOk(response.data.tableDeckCount > 0);
    assert.equal(response.data.playedDeck.length, 1);
  });

  it('should be able to go to market', async function () {
    let response = await this.testState.api.postGamePlay({ json: {
      gameTableId: this.testState.gameTable.id
    }});
    assert.exists(response);
    assert.equal(response.status, 201);

    const nextPlayer = response.data.nextPlayer;

    response = await this.testState.api.postGamePlay({ json: {
      gameTableId: this.testState.gameTable.id,
      gotoMarket: true,
    }});
    assert.exists(response);
    assert.equal(response.status, 201);

    assert.exists(response.data.deck);
    assert.equal(response.data.deck.length, 5);
    assert.isOk(response.data.nextPlayer != nextPlayer);
  });

  it('should be able to play a card', async function () {
    let response = await this.testState.api.postGamePlay({ json: {
      gameTableId: this.testState.gameTable.id
    }});
    assert.exists(response);
    assert.equal(response.status, 201);
    const deck = response.data.deck;
    const upCard = response.data.upCard;

    let playCardIndex = -1;

    for (let index in deck) {
      const card = deck[index];
      if (card.suit === upCard.suit || card.rank === upCard.rank) {
        playCardIndex = index;
        break;
      }
    }

    if (playCardIndex < 0) {
      assert.equal('Not holding any suitable cards ', JSON.stringify(upCard));
    }
    response = await this.testState.api.postGamePlay({ json: {
      gameTableId: this.testState.gameTable.id,
      playCard: playCardIndex,
    }});
    assert.exists(response);
    assert.equal(response.status, 201);

    assert.exists(response.data.deck);
    assert.equal(response.data.deck.length, 3);

    assert.isOk(response.data.tableDeckCount > 0);
    assert.equal(response.data.playedDeck.length, 2);

    const gamePlaySequence = response.data.gamePlaySequence
    assert.equal(gamePlaySequence, 1);

    response = await this.testState.api.getGamePlay(
      this.testState.gameTable.id, { gamePlaySequence });
    assert.exists(response);
    assert.equal(response.status, 200);
  });

  it('should be forbidden from submitting two consecutive plays', async function () {
    let response;
    response = await this.testState.api.postGamePlay({ json: {
      gameTableId: this.testState.gameTable.id
    }});
    assert.exists(response);
    assert.equal(response.status, 201);
    assert.equal(response.data.nextPlayer, 'BigJack500');

    await this.testState.api.postGamePlay({ json: {
      gameTableId: this.testState.gameTable.id,
      gotoMarket: true,
    }});

    try {
      response = await this.testState.api.postGamePlay({ json: {
        gameTableId: this.testState.gameTable.id,
        gotoMarket: true,
      }});
      assert.equal(response.status, 400);
    } catch(e) {
      assert.exists(e.response);
      assert.equal(e.response.status, 400);
    }
  });

  it('should be able to end a game', async function () {
    let response = await this.testState.api.postGamePlay({ json: {
      gameTableId: this.testState.gameTable.id
    }});
    response = await this.testState.api.getGamePlay(this.testState.gameTable.id);

    while (!response || response.data.status !== 'ended') {
      if (response.data.nextPlayer == this.testState.playerDetail.name) {
        response = await this.testState.api.postGamePlay({ json: {
          gameTableId: this.testState.gameTable.id,
          gotoMarket: true,
        }});
      } else {
        response = await this.testState.api.getGamePlay(this.testState.gameTable.id);
      }
      await sleep(200);
    }

    assert.equal(response.data.status, 'ended');
    assert.isOk(response.data.winners.length > 0);
  }).timeout(20000);

  it('should be able to play to win a game', async function () {
    let response = await this.testState.api.postGamePlay({ json: {
      gameTableId: this.testState.gameTable.id
    }});

    response = await playGame(this.testState.api, this.testState.gameTable.id, this.testState.playerDetail);
    assert.equal(response.data.status, 'ended');
    assert.equal(response.data.winners.length, 1);
  }).timeout(20000);
};
