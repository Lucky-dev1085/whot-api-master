'use strict';
const _ = require('lodash');
const moment = require('moment');
const errors = reqlib('_/modules/feathers/errors');

module.exports = class PlayerGamesService {
  constructor() {
    this.models = null;
    this._config = {
      auth: {
        create: false,
        find: true,
      },
      publish: { create: async function (data, context) {
        console.log(`🔔 Sending countdown to ${data.userId} from game ${data.gameTableId}`);
        return app.channel(`users-${data.userId}`);
      }},
    };
    this.startDispatcher();
  }

  startDispatcher() {
    if (!this.dispatcherTimer) {
      console.log(`Setting up the game dispatcher...`);
      this.dispatcherErrorCount = 0;
      const interval = parseInt(config.gameDispatcherFrequency || '5');
      console.log(`Triggering game dispatcher every ${interval} seconds`);
      this.dispatcherTimer = setInterval(dispatchGameSchedules.bind(this), interval * 1000);
    }
  }

  stopDispatcher() {
    if(this.dispatcherTimer) {
      console.log(`Stopping the game dispatcher...`);
      clearInterval(this.dispatcherTimer);
      delete this.dispatcherTimer;
    }
  }

  async requirePlayer(params) {
    if (!params.user) {
      throw errors.NotAuthenticated(null, `Must be logged-in to access scheduled player games`);
    }

    const playerDetailModel = this.getModel('player_detail');
    const playerDetail = await playerDetailModel.findOne({
      where: {userId: params.user.id}
    });
    if (!playerDetail) {
      throw errors.Forbidden(null, `Must be logged-in as player to fuaccessnd scheduled games`);
    }
    return playerDetail;
  }

  async create() {
    // NOOP:
    // Only here for the publish functionality
    return {};
  }

  async find(params) {
    const playerDetail = await this.requirePlayer(params);
    const gameTableModel = this.getModel('game_table');
    const playerDetailModel = this.getModel('player_detail');
    const playerGameStatesModel = this.getModel('player_game_state');

    const countdownTables = await gameTableModel.findAll({
      include: [{model: playerGameStatesModel, include: [{model: playerDetailModel}]}, 'tournament'],
      where: Object.assign(this.makeCountdownGameTableFilter(), {
        '$player_game_states.playerDetailId$': playerDetail.id
      }),
      order: [ ['startingAt', 'DESC'] ],
      subQuery: false
    });

    let result = [];
    for (let table of countdownTables) {
      result.push(this.makeCountdownNotification(table, playerDetail));
    }

    await dispatchGameSchedules.bind(this)();

    return Object.assign({
      data: result,
    }, getWebSocketArgs());
  };

  getModel(modelKey) {
    if (!this.models) {
      this.models = reqlib('_/models');
    }
    return this.models[modelKey];
  }

  makeCountdownNotification(table, playerDetail) {
    return Object.assign({}, {
      userId: playerDetail.userId,
      gameTable: table
    }, table.tournamentId && {
      tournament: {
        id: table.tournamentId,
        currentRoundNo: table.tournament.currentRoundNo,
        tournamentTitle: table.tournament.tournamentTitle,
        tournamentStage: table.tournament.tournamentStage,
      }
    });
  }

  makeCountdownGameTableFilter() {
    const countdown = parseInt(config.gameDispatcherCountdown || '20');
    const gameStartTimeout = parseInt(config.gameStartTimeout || '120');

    const now = moment();

    let countdownEnd = moment(now);
    countdownEnd.add(countdown, 'seconds');

    let countdownStart = moment(now);
    countdownStart = countdownStart.subtract(gameStartTimeout, 'seconds');

    return {
      gameStatus: ['notStarted', 'live'],
      startingAt: {
        $lte: countdownEnd.toISOString(),
        $gte: countdownStart.toISOString()
      }
    };
  }

  async startTournamentRound(tournament, ranks, tournamentStage) {
    const gameTableModel = this.getModel('game_table');
    const playerGameStateModel = this.getModel('player_game_state');

    console.log(`Starting tournament: ${tournament.tournamentTitle}`);
    let roundPlayers = ranks.map((r) => r);
    let now = moment(tournament.startingAt);
    if (now.isBefore()) {
      now = moment();
    }
    let gamesStartingAt = moment(now);

    const countdown = parseInt(config.gameDispatcherCountdown || '20');
    gamesStartingAt = gamesStartingAt.add(countdown, 'seconds');

    let maxPlayerCount = 5;
    if (tournamentStage === 'FINAL') {
      maxPlayerCount = ranks.length;
    }

    // create (ranks.length / 5) game tables
    const gameTableCount = getGameTableCount(ranks.length);
    console.log(`Tournament: ${tournament.tournamentTitle}(${tournamentStage}): ${ranks.length} players on ${gameTableCount} game tables`);
    for(let gameIndex = 0; gameIndex < gameTableCount; gameIndex++) {
      const remainder = roundPlayers.length % 5;
      let tablePlayerCount = 5;
      if (remainder > 2) {
        tablePlayerCount = remainder;
      }
      else if (remainder > 0 && remainder <= 2) {
        tablePlayerCount = remainder + 2;
      }

      roundPlayers = await this.createTournamentTable({
        tableTitle: `${tournament.tournamentTitle} ${tournamentStage.toLowerCase()} #${tournament.currentRoundNo+1}-${gameIndex+1}`,
        startingAt: gamesStartingAt.toISOString(),
        tournamentId: tournament.id,
        playerCount: tablePlayerCount,
        maxPlayerCount: maxPlayerCount,
      }, roundPlayers);
    }
  }

  async createTournamentTable(gameTableFields, roundPlayers) {
    const gameTableModel = this.getModel('game_table');
    const playerGameStateModel = this.getModel('player_game_state');

    const gameTable = await gameTableModel.create(Object.assign({
      gameType: 'TOURNAMENT',
      minStakeAmount: 0,
    }, gameTableFields));
    console.log(`Tournament game: ${gameTable.tableTitle}: ${gameTable.playerCount} players starting at ${gameTable.startingAt}`);

    for(let playerNo = 0; playerNo < gameTable.playerCount; playerNo++) {
      let playerIndex = _.random(roundPlayers.length - 1);
      let roundPlayer = roundPlayers[playerIndex];
      roundPlayers = [...roundPlayers.slice(0, playerIndex), ...roundPlayers.slice(playerIndex+1)];

      const state =  await playerGameStateModel.create({
        state: 'JOINED',
        stakeAmount: 0,
        gameTableId: gameTable.id,
        playerDetailId: roundPlayer.playerDetailId,
      });
      await state.joinChatRoom();
    }
    return roundPlayers;
  }

  async closeExpiredGames(tournament) {
    const timeoutSeconds = parseInt(config.playerConnectionTimeout || '90');
    const expiredAt = moment().add(-timeoutSeconds, 'seconds');

    const gameTableModel = this.getModel('game_table');
    const playerGameStateModel = this.getModel('player_game_state');
    const tables = await gameTableModel.findAll({
      include: [{model: playerGameStateModel}],
      where: {
        tournamentId: tournament.id,
        gameStatus: 'notStarted',
        startingAt: { $lte: expiredAt.toISOString() }
      }
    });

    if (!tables.length) {
      return;
    }

    console.log(`Tournament: ${tournament.tournamentTitle}: closing ${tables.length} expired game tables.`);

    await gameTableModel.update({
      gameStatus: 'ended',
    }, { where: {id: tables.map((t) => t.id)} });

    await playerGameStateModel.update({
      state: 'ENDED',
    }, { where: {id: tables.map((t) => t.id)} });

    const tournamentRanksModel = this.getModel('tournament_rank');
    await tournamentRanksModel.update({
      score: 999999,
      state: 'ENDED',
    }, { where: {
      tournamentId: tournament.id,
      playerDetailId: tables.reduce((ids, table) => [...ids, ...table.player_game_states.map((s) => s.playerDetailId)], []),
    } });
  }

  async advanceTournamentRound(tournament, all_ranks) {
    console.log(`Tournament: ${tournament.tournamentTitle}: ${all_ranks.length} total players`);

    const exitStates = ['ENDED', 'DISCONNECTED'];
    let activePlayers = all_ranks.filter((roundPlayer) => exitStates.indexOf(roundPlayer.state) < 0);

    let tournamentRoundNo = _.min(activePlayers.map((roundPlayer) => roundPlayer.currentRoundNo))
    const currentlyPlaying = activePlayers.filter((roundPlayer) => roundPlayer.state === 'LIVE' || roundPlayer.currentRoundNo != tournamentRoundNo);

    if (currentlyPlaying.length > 0) {
      return;
    }

    let tournamentStage = 'PRELIMINARY';
    const tournamentModel = this.getModel('tournament');
    if (activePlayers.length > 10) {
      tournamentStage = 'PRELIMINARY';
    }
    else if (activePlayers.length <= 1) {
      await tournamentModel.update({
        state: 'ENDED',
      }, {where: { id: tournament.id }});
      return;
    }
    else {
      let runnerUpProgressing = 0

      if (activePlayers.length > 5) {
        tournamentStage = 'SEMI-FINAL';
        runnerUpProgressing = 10 - activePlayers.length
      }
      else {
        tournamentStage = 'FINAL';
        if (tournament.tournamentStage != tournamentStage) {
          runnerUpProgressing = 1;
        }
      }
      let runnerUpCandidates = all_ranks.filter((roundPlayer) => roundPlayer.state === 'ENDED' && roundPlayer.currentRoundNo == tournamentRoundNo);
      runnerUpCandidates = _.orderBy(runnerUpCandidates, ['score', 'desc'], ['updatedAt', 'asc']);
      activePlayers = [...activePlayers, ...runnerUpCandidates.slice(0, runnerUpProgressing)]
    }

    await tournamentModel.update({
      state: 'LIVE',
      tournamentStage: tournamentStage,
      currentRoundNo: tournamentRoundNo,
    }, {where: { id: tournament.id }});

    const gameTableModel = this.getModel('game_table');
    const playerGameStateModel = this.getModel('player_game_state');
    const playerStates = await playerGameStateModel.findAll({
      include: [{model: gameTableModel}],
      where: {
        '$game_table.tournamentId$': tournament.id,
        state: 'JOINED',
      },
    });

    const playingPlayerIds = playerStates.map((playerState) => playerState.playerDetailId);
    const remainingPlayerRanks = activePlayers.filter((roundPlayer) =>
      playingPlayerIds.indexOf(roundPlayer.playerDetailId) < 0
    );

    return await this.startTournamentRound(tournament, remainingPlayerRanks, tournamentStage);
  }

  async runGameTournaments() {
    const gameTableModel = this.getModel('game_table');
    const tournamentModel = this.getModel('tournament');
    const tournamentRankModel = this.getModel('tournament_rank');

    const tournamentGames = await tournamentModel.findAll({
      include: [
        {model: gameTableModel},
        {model: tournamentRankModel},
      ],
      where: {
        state: ['PENDING', 'LIVE'],
        startingAt: { $lte: moment().toISOString() },
      },
      order: [ ['startingAt', 'ASC'] ],
    });

    for (let tournament of tournamentGames) {
      const ranks = tournament.tournament_ranks;
      await this.advanceTournamentRound(tournament, ranks);
      await this.closeExpiredGames(tournament);
    }
  }
};

const getWebSocketArgs = function getWebSocketArgs() {
  return {
    realtimeConnection: {
      socketioUrl: config.publicUrl,
      transports: ['websocket', 'polling'],
      playerGamesService: 'player-games',
      tokenAuthService: 'ws-auth',
    }
  };
}

const dispatchGameSchedules = async function dispatchGameSchedules() {
  try {
    await this.runGameTournaments();

    const gameTableModel = this.getModel('game_table');
    const playerDetailModel = this.getModel('player_detail');
    const playerGameStatesModel = this.getModel('player_game_state');

    const countdownTables = await gameTableModel.findAll({
      include: [{model: playerGameStatesModel, include: [{model: playerDetailModel}]}, 'tournament'],
      where: Object.assign({}, this.makeCountdownGameTableFilter()),
      order: [ ['startingAt', 'DESC'] ],
    });

    console.log(`Dispatching countdowns for ${countdownTables.length} games`);
    const playerGamesService = app.service('player-games');
    for (let table of countdownTables) {
      for (let player of table.player_game_states) {
        const data = Object.assign(
          this.makeCountdownNotification(table, player.player_detail),
          getWebSocketArgs());
        playerGamesService.create(data);
      }
    }
    this.dispatcherErrorCount = 0;
  } catch(e) {
    console.log(`(${this.dispatcherErrorCount}) Error on dispatching game countdowns: ${e}`);
    this.dispatcherErrorCount += 1;
    if (this.dispatcherErrorCount > 5) {
      this.stopDispatcher();
    }
  }
};

const getGameTableCount = function getGameTableCount(playerCount) {
  const remainder = playerCount % 5;
  return parseInt(playerCount / 5) + (remainder === 0 ? 0 : 1);
};
