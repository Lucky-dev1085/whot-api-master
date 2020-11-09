/* eslint arrow-body-style: ["off"] */
/* eslint global-require: ["off"] */

'use strict';
require(require('app-root-path') + '/bootstrap');
const moment = require('moment');

const { assert } = require('chai');
const { Model } = reqlib('_/modules/sequelize/decorators');
const { crest } = require('crest-js');
reqlib('_/modules/feathers');

const models = reqlib('_/models');

const basic_test = require('./basic.test');
const auth_test = require('./auth.test');
const players_test = require('./players.test');
const game_tables_test = require('./game_tables.test');
const promotions_test = require('./promotions.test');
const payments_test = require('./payments.test');
const game_play_test = require('./game_play.test');
const chat_test = require('./chat.test');
const tournaments_test = require('./tournaments.test');

const testState = {};


describe('Checking API status', function () {
  before(async function () {
    testState.app = app;
    assert.exists(testState.app);

    const playerDetailModel = models['player_detail'];
    playerDetailModel.middleware(app);

    testState.host = testState.app.get('host') || '127.0.0.1';
    testState.port = testState.app.get('port') || 5555;

    testState.server = app.listen(testState.port);
    testState.server.on('listening', async () => {
      testState.baseUrl = `http://${testState.host}:${testState.port}`;
      console.log(`Feathers application started on ${testState.baseUrl}`);
    });

    testState.usersService = testState.app.service('users');
    testState.tokensService = testState.app.service('tokens');
    testState.playerDetailsService = testState.app.service('player-details');
    testState.gameTablesService = testState.app.service('game-tables');
    testState.chatRoomsService = testState.app.service('chat-rooms');
    testState.chatMessagesService = testState.app.service('chat-messages');
    testState.promotionsService = testState.app.service('promotions');
    testState.promotionCodesService = testState.app.service('promotion-codes');
    testState.auditLogService = testState.app.service('audit-logs');

    testState.playerDepositsService = testState.app.service('player-deposits');
    testState.playerWithdrawalsService = testState.app.service('player-withdrawals');
    testState.bankService = testState.app.service('banks');
    testState.playerBankAccountsService = testState.app.service('player-bank-accounts');
    testState.playerBankAccountsVerification = testState.app.service('player-bank-accounts-verification');
    testState.tournamentsService = testState.app.service('tournaments');
    testState.tournamentRanksService = testState.app.service('tournament-ranks');
    assert.exists(testState.usersService);
  });

  after(async function () {
    const sequelize = testState.usersService.model.sequelize;

    delete testState.app;
    delete testState.usersService;

    testState.server.close();
    delete testState.server;

    await sequelize.close();
  });

  beforeEach(async function() {
    testState.api = crest({
      baseUrl: testState.baseUrl,
      specialFragments: {
        PlayerDetails: 'player-details',
        GamePlay: 'game-play',
        GameTables: 'game-tables',
        GameTableInvitations: 'game-table-invitations',
        JoinGameTable: 'join-game-table',
        ChatRooms: 'chat-rooms',
        ChatMessages: 'chat-messages',
        PasswordReset: 'password-reset',
        PlayerNames: 'player-names',
        PlayerAvailable: 'player-available',
        PlayerVerification: 'player-verification',
        PlayerBankAccounts: 'player-bank-accounts',
        PlayerBankAccountsVerification: 'player-bank-accounts-verification',
        PlayerDeposits: 'player-deposits',
        PlayerWithdrawals: 'player-withdrawals',
        PlayerAccountFunding: 'player-account-funding',
        PlayerGames: 'player-games',
        PromotionCodes: 'promotion-codes',
        JoinTournament: 'join-tournament',
        TournamentRanks: 'tournament-ranks',
      }
    });
    
    const user = await testState.usersService.create({
      email: 'admin@example.com',
      name: 'Jack Daniels',
      emailVerified: true,
      password: 'password',
      roles: {set: ['superadmin', 'admin']}
    });
    assert.exists(user);
    testState.adminUser = user;

    await testState.api.postPlayerDetails({ json: {
      userId: user.id,
      name: user.name,
      termsAgreed: true,
      termsAgreedTimestamp: moment().toISOString(),
    }});

    this.testState = testState;
  });

  afterEach(async function() {
    const services = Object
      .keys(testState)
      .filter((k) => k.endsWith('Service'))
      .map((k) => testState[k]);

    for (const service of services) {
      try {
        let items = (await service.find()) || {data: []};
        items = items.data;
        for (const item of items) {
          await service.remove(item.id);
        }
      } catch(e) {
        await service.model.findAll();
        await service.model.destroy({ where: {} });
      }
    }
    delete testState.api;
  });
  /* */
  describe('basic tests', basic_test.bind(this));
  describe('authentication tests', auth_test.bind(this));
  describe('players tests', players_test.bind(this));
  describe('game play tests', game_play_test.bind(this));
  describe('game chat tests', chat_test.bind(this));
  describe('game table tests', game_tables_test.bind(this));
  describe('payments tests', payments_test.bind(this));
  describe('promotions tests', promotions_test.bind(this));
  /* */
  describe('tournaments tests', tournaments_test.bind(this));
});
