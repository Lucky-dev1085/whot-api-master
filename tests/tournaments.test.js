/* eslint arrow-body-style: ["off"] */
/* eslint global-require: ["off"] */

'use strict';
const { assert } = require('chai');
const { playGame, sleep } = require('./game_play_utils');

const moment = require('moment');

module.exports = function suite() {
  beforeEach(async function() {
    let response = await this.testState.api.postAuthLogin({ json: {
      "email": "admin@example.com",
      "password": "password"
    }});

    assert.equal(response.status, 200);
    assert.exists(response.data.jwt);
    this.testState.adminAuth = response.data.jwt;

    this.testState.api.authorizationBearer(this.testState.adminAuth);

    response = await this.testState.api.postTournaments({ json: {
      "tournamentTitle": "Mega Whot!",
      "maxPlayerCount": 200,
      "minPlayerCount": 2,
      "prizeAmount": 5000,
      "stakeAmount": 500,
      "startingAt": moment().add('10', 'seconds').toISOString(),
    }});

    assert.equal(response.status, 201);
    assert.exists(response.data);
    assert.exists(response.data.id);
    assert.equal(response.data.playerCount, 0);
    this.testState.tournament = response.data;

    response = await this.testState.api.postPromotions({json: {
      denomination: 5000,
      numberOfCodes: 1,
      usageCountPerCode: 100,
      expiresAt: '2100-01-01 19:09:32.667Z',
    }});
    assert.equal(response.status, 201);

    assert.equal(response.data.serials.length, 1);
    this.testState.promotionCode = response.data.serials[0];
  });

  afterEach(async function() {
    this.testState.api.authorizationBearer("Unauthorized");
  });

  it('Unauthenticated users should be unable to join tournament', async function () {
    this.testState.api.authorizationBearer("Unauthorized");

    try {
      let response = await this.testState.api.postJoinTournament({json: {
        tournamentId: this.testState.tournament.id
      }});
      assert.fail(`Should fail with 401, however status ${response.status} was received`);
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 401);
    }
  });

  it('Players should be unable to join tournament if they are heve insufficient funds', async function () {
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
      let response = await this.testState.api.postJoinTournament({json: {
        tournamentId: this.testState.tournament.id
      }});
      assert.fail(`Should fail with 400, however status ${response.status} was received`);
    } catch(e) {
      if (`${e}`.startsWith('AssertionError')) {
        throw e;
      }
      assert.equal(e.response.status, 400);
      assert.equal(e.response.data.message, 'Insufficient funds');
    }
  });

  it('Players should be able to join a tournament', async function () {
    let response = await this.testState.api.postUsers({ json: {
      email: "user@example.com",
      name: 'BigJack500',
      termsAgreed: true,
      password: "password",
      promoCode: this.testState.promotionCode,
    }});
    assert.equal(response.status, 201);

    const authResponse = await this.testState.api.postAuthLogin({ json: {
      "email": "user@example.com",
      "password": "password"
    }});
    assert.equal(authResponse.status, 200);
    this.testState.api.authorizationBearer(authResponse.data.jwt);

    response = await this.testState.api.postJoinTournament({json: {
      tournamentId: this.testState.tournament.id
    }});
    assert.equal(response.status, 201);

    response = await this.testState.api.getTournaments(this.testState.tournament.id);
    assert.equal(response.status, 200);

    let tournament = response.data;
    assert.equal(tournament.playerCount, 1);

    response = await this.testState.api.getTournamentRanks({tournamentId: this.testState.tournament.id});
    assert.equal(response.status, 200);

    let ranks = response.data.data;
    assert.equal(ranks.length, 1);
  });

  describe('Players within tournaments', function() {
    beforeEach(async function() {
      let players = [];
      for(let playerNo = 0; playerNo < 12; playerNo++) {
        let response = await this.testState.api.postUsers({ json: {
          email: `user${playerNo}@example.com`,
          name: `BigJack #${playerNo + 1}`,
          termsAgreed: true,
          password: "password",
          promoCode: this.testState.promotionCode,
        }});
        assert.equal(response.status, 201);

        response = await this.testState.api.postAuthLogin({ json: {
          "email": response.data.email,
          "password": "password"
        }});
        assert.equal(response.status, 200);
        this.testState.api.authorizationBearer(response.data.jwt);
        players.push(response.data);

        response = await this.testState.api.postJoinTournament({json: {
          tournamentId: this.testState.tournament.id
        }});
        assert.equal(response.status, 201);
      }
      this.testState.tournamentPlayers = players;
    });

    afterEach(async function() {
      delete this.testState.tournamentPlayers;
    });

    it('Players should be able to start a tournament', async function () {
      const players = this.testState.tournamentPlayers;

      let response = await this.testState.api.getTournamentRanks({tournamentId: this.testState.tournament.id});
      assert.equal(response.status, 200);

      let ranks = response.data.data;
      assert.equal(ranks.length, players.length);

      for(let playerRank of ranks) {
        assert.equal(playerRank.currentRoundNo, 0);
      }

      response = await this.testState.api.getTournaments(this.testState.tournament.id);
      assert.equal(response.status, 200);

      this.testState.api.authorizationBearer(this.testState.adminAuth);
      response = await this.testState.api.getGameTables({$limit: 999});
      assert.equal(response.status, 200);
      assert.equal(response.data.data.length, 0);

      response = await this.testState.api.patchTournaments(this.testState.tournament.id, { json: {
        "startingAt": moment().add(-10, 'seconds').toISOString(),
      }});

      let tournament = response.data;
      assert.equal(tournament.playerCount, players.length);
      assert.equal(tournament.state, 'PENDING');

      for(let playerLogin of players) {
        this.testState.api.authorizationBearer(playerLogin.jwt);
        response = await this.testState.api.getPlayerGames();
        assert.equal(response.status, 200);
      }

      this.testState.api.authorizationBearer(this.testState.adminAuth);
      response = await this.testState.api.getGameTables({$limit: 999});
      assert.equal(response.status, 200);
      assert.equal(response.data.data.length, 3);

      for(let playerLogin of players) {
        this.testState.api.authorizationBearer(playerLogin.jwt);
        response = await this.testState.api.getPlayerGames();
        assert.equal(response.status, 200);

        let countdownTables = response.data.data;
        assert.equal(countdownTables.length, 1);
        assert.exists(countdownTables[0].tournament);
        assert.exists(countdownTables[0].tournament.id);
        assert.exists(countdownTables[0].tournament.tournamentTitle);
        assert.exists(countdownTables[0].tournament.currentRoundNo);
        assert.exists(countdownTables[0].tournament.tournamentStage);
        assert.equal(countdownTables[0].tournament.id, this.testState.tournament.id);
      }
    }).timeout(10000);

    it('Players should be able to play in a tournament', async function () {
      const players = this.testState.tournamentPlayers;
      this.testState.api.authorizationBearer(this.testState.adminAuth);
      let response = await this.testState.api.patchTournaments(this.testState.tournament.id, { json: {
        "startingAt": moment().add(-10, 'seconds').toISOString(),
      }});

      this.testState.api.authorizationBearer("Unauthorized");
      let playerGameTables = [];
      for(let playerLogin of players) {
        let playerGames = [];
        let retries = 0;
        while(playerGames.length <= 0 && retries <= 14) {
          let response = await this.testState.api.getPlayerGames({ headers: { Authorization: `Bearer ${playerLogin.jwt}`}});
          assert.equal(response.status, 200);

          if (response.data.data.length <= 0) {
            await sleep(200);
            retries += 1;
          } else {
            playerGames = response.data.data;
          }
        }

        if (!playerGames.length) {
          assert.fail(`Failed to fetch games for ${playerLogin.user.playerDetail.name} after ${retries} retries`);
        }
        assert.equal(playerGames.length, 1);
        playerGameTables.push(playerGames[0]);

        response = await this.testState.api.postGamePlay({
          json: { gameTableId: playerGames[0].gameTable.id },
          headers: { Authorization: `Bearer ${playerLogin.jwt}` },
        });
        assert.equal(response.status, 201);
      }

      const finalStates = await Promise.all(players.map((playerLogin, index) => playGame(
        this.testState.api, playerGameTables[index].gameTable.id, playerLogin.user.playerDetail, playerLogin.jwt)));

      for(let response of finalStates) {
        const gameState = response.data;
        assert.equal(gameState.status, 'ended');
        assert.equal(gameState.gameType, 'TOURNAMENT');
        assert.isOk(gameState.tournament.totalRounds > 4);
        assert.equal(gameState.tournament.currentRoundNo, 1);
        assert.exists(gameState.tournament.tournamentTitle);
        assert.exists(gameState.tournament.tournamentStage);
        assert.exists(gameState.tournament.currentRoundLiveTableCount);
        assert.exists(gameState.tournament.id);
      }

      response = await this.testState.api.getTournamentRanks({tournamentId: this.testState.tournament.id});
      assert.equal(response.status, 200);

      const firstRoundCounts = {'JOINED': 0, 'ENDED': 0};
      for(let playerRank of response.data.data) {
        assert.equal(playerRank.currentRoundNo, 1);
        assert.isOk(Object.keys(firstRoundCounts).indexOf(playerRank.state) >= 0);

        assert.isOk(playerRank.score >= 0);
        if(playerRank.state === 'ENDED') {
          assert.isOk(playerRank.score > 0);
        }
        firstRoundCounts[playerRank.state] += 1;
      }
      assert.isOk(firstRoundCounts['ENDED'] > 0);
      assert.isOk(firstRoundCounts['JOINED'] > 0);
    }).timeout(40000);
  });
};
