'use strict';
const moment = require('moment');
const errors = reqlib('_/modules/feathers/errors');
const { requirePlayer, requireNotPlaying } = reqlib('_/src/utils/access-control');


module.exports = class GamesService {
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

  async requireGameTableSeat(gameTable, playerDetail, playerGameStateModel) {
    const selfCount = await playerGameStateModel.count({
      where: {
        state: 'JOINED',
        gameTableId: gameTable.id,
        playerDetailId: playerDetail.id,
      }
    });
    if (selfCount > 0) {
      throw errors.BadRequest(null, `Already joined this table`);
    }

    try {
      await requireNotPlaying(playerDetail.id, gameTable.startingAt, this.models);
    } catch(e) {
      throw errors.BadRequest(null, e.message);
    }

    let playerCount = await playerGameStateModel.count({
      where: {
        state: 'JOINED', 
        gameTableId: gameTable.id,
      }
    });
    if (playerCount >= gameTable.maxPlayerCount) {
      throw errors.BadRequest(null, `Game table is full`);
    }
    return playerCount;
  }

  async notifyPlayers(state) {
    const gameTableModel = this.getModel('game_table');
    const table = await gameTableModel.findOne({ where: { id: state.gameTableId } });

    const playerGameStateModel = this.getModel('player_game_state');
    const players = await playerGameStateModel.findAll({
      where: { gameTableId: state.gameTableId, },
      include: ['player_detail']
    });

    const newPlayer = players.filter((playerState) => playerState.id === state.id);

    let publicStatus = {
      eventType: 'playerEvent',
      status: table.gameStatus,
      maxPlayerCount: table.maxPlayerCount,
      players: players.map((p) => ({ name: p.player_detail.name, cardCount: 0 })),
      newPlayerJoined: newPlayer[0].player_detail.name,
      gameTableId: table.id,
      gamePlaySequence: 0,
    };

    players.map((p) => {
      app.service('game-play-notifications').create(Object.assign({
        deck: [],
        userId: p.player_detail.userId,
      }, publicStatus));
    });

    if (players.length === table.maxPlayerCount && moment(table.startingAt).isBefore()) {
      app.service('game-play').create({
        playerGameStateId: state.id,
        gameTableId: table.id,
      });
    }
  }

  async create(data, params) {
    const isPlayer = await requirePlayer(params.user);
    if (!isPlayer) {
      throw errors.NotAuthenticated(null, `Only game players can join game tables`);
    }

    const gameTableModel = this.getModel('game_table');
    const playerDetailModel = this.getModel('player_detail');
    const playerGameStateModel = this.getModel('player_game_state');

    const playerDetail = await playerDetailModel.findOne({
      where: {userId: params.user.id}
    });
    if (!playerDetail) {
      throw errors.Forbidden(null, `Only game players can join game tables`);
    }

    const gameTable = await gameTableModel.findOne({ where: {
      id: data.gameTableId,
      gameStatus: 'notStarted',
      $or: [
        { tablePassword: null },
        { tablePassword: "" },
        { tablePassword: data.tablePassword },
      ]
    }});

    if (!gameTable && !data.tablePassword) {
      throw errors.NotFound(null, `Game table not found: ${data.gameTableId}`);
    } else if(!gameTable && data.tablePassword) {
      throw errors.NotFound(null, `Game table not found or password incorrect`);
    }

    const stakeAmount = data.stakeAmount || gameTable.minStakeAmount || 0;
    if (stakeAmount < gameTable.minStakeAmount) {
      throw errors.BadRequest(null, `A minimum stake amount of ${gameTable.minStakeAmount} is required`);
    }

    const playerCount = await this.requireGameTableSeat(gameTable, playerDetail, playerGameStateModel);

    const [upCount, upRows] = await playerDetailModel.update({
      depositBalance: playerDetail.depositBalance - stakeAmount,
    }, { where: {
      userId: params.user.id,
      depositBalance: {$gte: stakeAmount}
    }});

    if (!upCount) {
      throw errors.BadRequest(null, `Insufficient funds`);
    }

    const state =  await playerGameStateModel.create({
      state: 'JOINED',
      stakeAmount: stakeAmount,
      gameTableId: data.gameTableId,
      playerDetailId: playerDetail.id,
    });
    await state.joinChatRoom();

    let startingAt = moment(gameTable.startingAt);
    if ((playerCount + 1) >= gameTable.maxPlayerCount && gameTable.gameType === 'PRIVATE') {
      // Private games should not have start times; they should begin once everyone has joined.
      // since the FE uses startingAt to display the game start countdown, we set it to
      // 'countdown' seconds from now, this will trigger all game startup machinery.
      const countdown = parseInt(config.gameDispatcherCountdown || '20');
      const forceStartAt = moment().add(countdown, 'seconds');
      if (forceStartAt.isBefore(startingAt)) {
        startingAt = forceStartAt;
      }
    }

    await gameTableModel.update({
      startingAt: startingAt.toISOString(),
      playerCount: playerCount + 1,
      stakeAmount: gameTable.stakeAmount + stakeAmount,
    }, {where: {id: data.gameTableId,}});

    await this.notifyPlayers(state);

    return state;
  }
};

