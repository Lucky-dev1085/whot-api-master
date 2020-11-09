'use strict';
const _ = require('lodash');
const moment = require('moment');
const errors = reqlib('_/modules/feathers/errors');
const asyncRedis = require("async-redis");

const { requirePlayer } = reqlib('_/src/utils/access-control');
const { makeNewDeck } = require("./cards");
const { Whot } = require("./whot");

class MockRedis {
  constructor() {
    this.data = {};
  }

  async get(key) {
    return this.data[key];
  }

  async set(key, value) {
    this.data[key] = value;
  }

  async expire(key, secondsTimeout) {
    // does nothing for tests
  }

  async sadd(key, value) {
    const list = this.data[key] || [];
    list.push(value);
    this.data[key] = list;
  }

  async spop(key) {
    const list = this.data[key] || [];
    return list.length > 0 ? list.pop() : null;
  }

  async srem(key, item) {
    const list = this.data[key] || [];
    this.data[key] = list.filter((listItem) => listItem !== item);
  }

  async smembers(key) {
    return this.data[key] || [];
  }
}

const getWebSocketArgs = function getWebSocketArgs() {
  return {
    realtimeConnection: {
      socketioUrl: config.publicUrl,
      transports: ['websocket', 'polling'],
      gamePlayService: 'game-play-notifications',
      tokenAuthService: 'ws-auth',
    }
  };
}

const processWhotAITurn = async function processWhotAITurn() {
  // Process all Whot AI plays in one batch
  const timeout = parseInt(config.playerTimeout || '20');
  let gameTableId = await this.client.spop('robot-requests');

  if(!gameTableId && gameTableId !== 0) {
    this.stopWhotAIProcessor();
  }

  while (gameTableId || gameTableId === 0) {

    const gamePlayState = await this.getGamePlayState(gameTableId);
    let whot = gamePlayState && new Whot(gamePlayState);

    while (!whot.isGameOver() && (whot.isCurrentPlayerARobot() || whot.hasCurrentPlayerTimedOut(timeout) || whot.isForecdToMarket())) {
      const play = whot.getAutoPlay();
      const isWhotAi = whot.isCurrentPlayerARobot();
      const hasCurrentPlayerTimedOut = whot.hasCurrentPlayerTimedOut(timeout);

      if (hasCurrentPlayerTimedOut) {
        const haveAllPlayersTimedOut = await this.haveAllPlayersDisconnected(gameTableId, whot);
        if (haveAllPlayersTimedOut) {
          try {
            whot.setDisconnected();
            await this.setGamePlayState(gameTableId, whot);
            await this.endGame(gameTableId, whot, 'DISCONNECTED');
          } catch(e) {
            console.log(`Failed to end game: ${gameTableId}: ${e}`);
            await this.deleteGamePlayState(gameTableId, whot.players.map((p) => p.userId));
          }
          break;
        }
      }

      whot.applyPlay(whot.currentPlayerId, play);
      await this.setGamePlayState(gameTableId, whot);

      const publicStatus = Object.assign({
        play, isWhotAi, hasCurrentPlayerTimedOut
      }, await this.getTournamentData(gameTableId), whot.getGameStatus());
      await this.notifyPlayers(whot, gameTableId, publicStatus)

      if (publicStatus.status === 'live') {
        this.setPlayerTimeout(gameTableId);
      }
      else {
        await this.endGame(gameTableId, whot);
        break;
      }
    }

    gameTableId = await this.client.spop('robot-requests');
  }
}

module.exports = class GamePlayService {
  constructor() {
    this.models = null;
    this._config = {
      auth: {
        get: true,
        create: true,
      },
      apidocs: { operations: 'f' },
      publish: { all: async function (data, context) {
        return [];
      }},
    };
    if (config.redisServerUrl.startsWith('mockredis://') || config.nodeEnv==='development') {
      console.log(`  Using MockRedis for game play`);
      this.client = new MockRedis();
    } else {
      console.log(`  Using Redis for game play states (${config.redisServerUrl})`);
      this.client = asyncRedis.createClient(config.redisServerUrl);
    }
    this.playerTimeoutTimers = {};
    require('./apidocs')();
    setTimeout(this.startWhotAIProcessor.bind(this), 500);
  }

  startWhotAIProcessor() {
    if (!this.whotAITimer) {
      console.log(`Setting up the WhotAI processor...`);
      this.whotAITimer = setInterval(processWhotAITurn.bind(this), parseInt(config.gameAISleep || 3000));
    }
  }

  stopWhotAIProcessor() {
    if(this.whotAITimer) {
      console.log(`Stopping the WhotAI processor...`);
      clearInterval(this.whotAITimer);
      delete this.whotAITimer;
    }
  }
  
  getModel(modelKey) {
    if (!this.models) {
      this.models = reqlib('_/models');
    }
    return this.models[modelKey];
  }

  async getValue(key) {
    const stringValue = await this.client.get(key);
    if (stringValue) {
      return JSON.parse(stringValue);
    }
    return stringValue;
  }

  async setValue(key, value) {
    const stringValue = JSON.stringify(value);
    await this.client.set(key, stringValue);
  }

  async getGamePlayState(gameTableId) {
    return await this.getValue(`game-${gameTableId}`);
  }

  async deleteGamePlayState(gameTableId, userIds) {
    // Expire the game state record in 2 minutes
    // await this.client.expire(`game-${gameTableId}`, 120);
    await this.client.expire(`game-${gameTableId}`, 3600);

    for(let userId of userIds) {
      const plk = `player-game-play-${gameTableId}-${userId}`;
      const gamePlaySequenceSet = await this.client.smembers(plk);
      await Promise.all(gamePlaySequenceSet.map(
        (gamePlaySequence) => this.client.expire(`${plk}-${gamePlaySequence}`, 60)
      ));
      await this.client.expire(plk, 60);
    }
    this.clearPlayerTimeout(gameTableId);
  }

  async setGamePlayState(gameTableId, whotState) {
    await this.setValue(`game-${gameTableId}`, whotState);
  }

  async pushWhotAIRequest(gameTableId) {
    this.startWhotAIProcessor();
    await this.client.sadd('robot-requests', gameTableId);
  }

  clearPlayerTimeout(gameTableId) {
    const timer = this.playerTimeoutTimers[gameTableId];
    if (timer) {
      clearTimeout(timer);
    }
  }

  setPlayerTimeout(gameTableId) {
    const gamePlay = this;
    const timer = setTimeout(async function() {
      await gamePlay.pushWhotAIRequest(gameTableId);
    }, parseInt(config.playerTimeout) * 1000);
    this.playerTimeoutTimers[gameTableId] = timer;
  }

  async getGamePlay(playerGameState, requireCurrentPlayerTurn) {
    const gamePlayState = await this.getGamePlayState(playerGameState.gameTableId);
    // console.log(`Game state ${playerGameState.gameTableId}: ${JSON.stringify(gamePlayState)}`);

    if (gamePlayState && requireCurrentPlayerTurn) {
      const notPlayerTurn = `${gamePlayState.currentPlayerId}` !== `${playerGameState.id}`;
      if (notPlayerTurn) {
        throw errors.BadRequest(null, `Incorrect player turn`);
      }
    }
    return gamePlayState && new Whot(gamePlayState);
  }

  async requirePlayerGame(data, params, includeCompletedGames) {
    const playerGameStateFilter = Object.assign(
      {
        gameTableId: { $ne: null }
      },
      !includeCompletedGames && {
        state: 'JOINED',
      }
    );
    if (data.gameTableId) {
      playerGameStateFilter['gameTableId'] = data.gameTableId;
    }
    if (data.playerGameStateId) {
      playerGameStateFilter['id'] = data.playerGameStateId;
    }
    if (params.user) {
      const playerDetailModel = this.getModel('player_detail');
      const playerDetail = await playerDetailModel.findOne({
        where: {userId: params.user.id}
      });
      playerGameStateFilter['playerDetailId'] = playerDetail.id;
    }

    const playerGameStateModel = this.getModel('player_game_state');
    const playerGames = await playerGameStateModel.findAll({
      where: playerGameStateFilter,
      include: 'player_detail'
    });
    if (!playerGames || playerGames.length <= 0 || playerGames.length > 1) {
      throw errors.NotFound(null, `Missing or incorrect game`);
    }

    return playerGames[0];
  }

  async requirePlayerTurn(data, params) {
    const playerState = await this.requirePlayerGame(data, params);
    const whot = await this.getGamePlay(playerState, Object.keys(this.getPlayerMove(data)).length > 0);
    return [playerState, whot];
  }

  async startNewGame(gameTableId) {
    const playerGameStateModel = this.getModel('player_game_state');
    const players = await playerGameStateModel.findAll({
      where: { gameTableId },
      include: ['player_detail']
    });

    const gameTableModel = this.getModel('game_table');
    const table = await gameTableModel.findOne({
      where: {id: gameTableId}
    });

    await gameTableModel.update({
      gameStatus: 'live',
    }, {
      where: {id: gameTableId}
    });

    const tournament = await this.startTournamentGame(gameTableId, players);
    let advancingPlayerCount = this.getAdvancingPlayerCount(tournament);

    const whot = new Whot();
    whot.startNewGame(players, table.maxPlayerCount, advancingPlayerCount);
    await this.setGamePlayState(gameTableId, whot);

    return whot;
  }

  async distributeWinnings(gameTableId, winningAmount, winners, playerMap, balanceField) {
    const playerGameStateModel = this.getModel('player_game_state');

    await playerGameStateModel.update({
      winningAmount,
    }, { where: {
      gameTableId, id: winners.map((p) => parseInt(p.id)),
    } });

    const playerDetailModel = this.getModel('player_detail');
    await playerDetailModel.increment(
      { [balanceField || "withdrawalBalance"]: winningAmount },
      { where: {
        id: winners.map((w) => playerMap[w.id].playerDetailId),
      }}
    );
  }

  async endGame(gameTableId, whot, playerEndState) {
    const gameTableModel = this.getModel('game_table');
    await gameTableModel.update({
      gameStatus: 'ended',
    }, { where: {id: gameTableId} });

    const playerGameStateModel = this.getModel('player_game_state');
    await playerGameStateModel.update({
      state: playerEndState || 'ENDED',
    }, { where: { gameTableId } });

    // distribute profits
    const playerStates = await playerGameStateModel.findAll({
      where: { gameTableId },
      include: ['player_detail']
    });
    const playerMap = playerStates.reduce((map, state) => Object.assign(map, {[state.id]: state}), {});
    let { winners, runnerUps, topPlayers } = whot.getWinners({ onlyHumans: true });

    await this.updateTournamentScore(gameTableId, playerStates, topPlayers, playerMap, playerEndState);

    const totalStake = playerStates.reduce((amount, state) => amount + state.stakeAmount, 0);
    const housePercent = 0.05;

    const noRunnerUps = runnerUps.length <= 0 || (winners.length + runnerUps.length) >= playerStates.length;
    if (winners.length > 0 && (playerStates.length < 4 || noRunnerUps)) {
      // Single winner for small games or no runner-ups
      const playerProfits = totalStake * (1.0 - housePercent) / (1.0 * winners.length);
      console.log(`Distributing table ${gameTableId} winnings: ${playerProfits} to ${winners.length} player(s)`);
      await this.distributeWinnings(gameTableId, playerProfits, winners, playerMap);
    }
    else if (winners.length > 0) {
      // Winner and runner-up for large games
      const runnerUpStake = runnerUps.reduce((amount, player) => amount + playerMap[player.id].stakeAmount, 0);

      const winnerProfit = (totalStake - runnerUpStake) * (1.0 - housePercent) / (1.0 * winners.length);
      console.log(`Distributing table ${gameTableId} winnings: ${winnerProfit} to ${winners.length} player(s)`);
      await this.distributeWinnings(gameTableId, winnerProfit, winners, playerMap);

      const runnerUpProfit = runnerUpStake / (1.0 * runnerUps.length);
      console.log(`Distributing table ${gameTableId} runner-up prize: ${runnerUpProfit} to ${runnerUps.length} player(s)`);
      await this.distributeWinnings(gameTableId, runnerUpProfit, runnerUps, playerMap, 'depositBalance');
    }
    else {
      console.log(`Distributing table ${gameTableId} winnings ${totalStake} to the house`);
    }

    // Redis cleanup
    await this.deleteGamePlayState(gameTableId, playerStates.map((ps) => ps.player_detail.userId));
  }

  async getTournamentId(gameTableId) {
    const gameTableModel = this.getModel('game_table');
    const gameTable = await gameTableModel.findOne({
      where: {id: gameTableId},
      include: ['player_game_states', 'tournament']
    });
    return [gameTable, gameTable.tournamentId];
  }

  async getTournamentData(gameTableId) {
    const [gameTable, tournamentId] = await this.getTournamentId(gameTableId);
    if (!tournamentId) {
      return {
        gameType: gameTable.gameType,
      };
    }
    const tournamentModel = this.getModel('tournament');
    const tournament = await tournamentModel.findOne({where: {id: tournamentId}});

    const tournamentRanksModel = this.getModel('tournament_rank');
    const ranks = await tournamentRanksModel.findAll({
      where: {
        tournamentId: tournamentId,
        playerDetailId: gameTable.player_game_states.map((playerState) => playerState.playerDetailId),
      }
    });

    const gameTableModel = this.getModel('game_table');
    const currentRoundLiveTableCount = await gameTableModel.count({where: {
      tournamentId: tournamentId,
      gameStatus: ['notStarted', 'live'],
    }});

    return {
      gameType: gameTable.gameType,
      tournament: {
        id: tournamentId,
        tournamentTitle: tournament.tournamentTitle,
        currentRoundNo: _.min(ranks.map((rank) => rank.currentRoundNo)),
        totalRounds: await tournament.getTotalRounds(),
        currentRoundLiveTableCount: currentRoundLiveTableCount,
        tournamentStage: tournament.tournamentStage,
      }
    };
  }

  getAdvancingPlayerCount(tournament) {
    if (!tournament) {
      return 1;
    }
    if (tournament.tournamentStage === 'FINAL') {
      return -1;
    }
    if (tournament.tournamentStage === 'SEMI-FINAL') {
      return 2;
    }
    return 3;
  }

  async updateTournamentScore(gameTableId, playerStates, topPlayers, playerMap, playerEndState) {
    const [gameTable, tournamentId] = await this.getTournamentId(gameTableId);
    if (!tournamentId) {
      return;
    }

    let advancingPlayerCount = this.getAdvancingPlayerCount(gameTable.tournament);
    if (advancingPlayerCount < 0) {
      advancingPlayerCount += topPlayers.length;
    }
    
    const tournamentRanksModel = this.getModel('tournament_rank');
    for(let i=0; i<topPlayers.length; i++) {
      const playerResult = topPlayers[i];
      const playerGameState = playerMap[playerResult.id];
      let playerTournamentState = playerEndState || 'ENDED';
      if (i<advancingPlayerCount) {
        playerTournamentState = 'JOINED';
      }

      await tournamentRanksModel.update({
        score: playerResult.score,
        state: playerTournamentState,
      }, { where: {
        tournamentId: gameTable.tournamentId,
        playerDetailId: playerGameState.playerDetailId,
      } });
    }
  }

  async startTournamentGame(gameTableId, playerStates) {
    const [gameTable, tournamentId] = await this.getTournamentId(gameTableId);
    if (!tournamentId) {
      return;
    }

    const tournamentRanksModel = this.getModel('tournament_rank');
    const gameTablePlayerFilter = { where: {
      tournamentId: gameTable.tournamentId,
      playerDetailId: playerStates.map((playerState) => playerState.playerDetailId),
    } };
    await tournamentRanksModel.update({
      state: 'LIVE',
    }, gameTablePlayerFilter);

    await tournamentRanksModel.increment({
      currentRoundNo: 1,
    }, gameTablePlayerFilter);

    return gameTable.tournament;
  }

  async applyMove(playerState, whot, data) {
    const publicStatus = whot.getGameStatus();
    if (publicStatus.status !== 'live') {
      console.log(`🔴 Illegal play by ${playerState.id} after game end`);
      throw errors.BadRequest(null, `Incorrect/Illegal play after game end`);
    }

    if (Object.keys(this.getPlayerMove(data)).length > 0) {
      const { validPlay, gameEnded } = whot.applyPlay(playerState.id, data);
      if (!validPlay) {
        console.log(`🔴 Illegal play by ${playerState.id}, play: ${JSON.stringify(data)}`);
        throw errors.BadRequest(null, `Incorrect/Illegal play`);
      }
    }

    await this.setGamePlayState(playerState.gameTableId, whot);
    return whot;
  }

  async notifyPlayers(whot, gameTableId, publicStatus) {
    for(let p of whot.players) {
      if (p.isRobot) {
        continue
      }
      const data = Object.assign({
        userId: p.userId,
        gameTableId: gameTableId,
        deck: whot.getPlayerDeck(p.id),
        notificationSentAt: moment().toISOString(),
      }, publicStatus);

      await this.appendPlayerGamePlayNotifications(gameTableId, p.userId, data);
      app.service('game-play-notifications').create(data);
    }
  }

  async haveAllPlayersDisconnected(gameTableId, whot) {
    const timeoutSeconds = parseInt(config.playerConnectionTimeout || '90');

    console.log(`Checking connection status for game ${gameTableId}, with ${whot.players.length} players`);
    for(let p of whot.players) {
      if (p.isRobot) {
        continue;
      }
      const plk = `player-game-play-${gameTableId}-${p.userId}`;
      const gamePlaySequenceSet = await this.client.smembers(plk);
      const now = moment().toISOString();

      let oldestTimestamp = now;
      for(let gamePlaySequence of gamePlaySequenceSet) {
        const data = await this.getValue(`${plk}-${gamePlaySequence}`);
        if (data.notificationSentAt && (oldestTimestamp === null || oldestTimestamp > data.notificationSentAt)) {
          oldestTimestamp = data.notificationSentAt;
        }
      }

      const timeoutTime = moment(oldestTimestamp).add(timeoutSeconds, 'seconds');
      if (timeoutTime > moment()) {
        // There is a player that has retrieved all their notifications
        return false;
      }
      console.log(`Player '${p.name}' disconnected from ${gameTableId}. Last active at: ${oldestTimestamp} (${moment() - timeoutTime}ms ago.)`);
    }
    return true;
  }

  async clearPlayerNotifications(gameTableId, userId, gamePlaySequence) {
    const plk = `player-game-play-${gameTableId}-${userId}`;
    const data = await this.getValue(`${plk}-${gamePlaySequence}`);

    let clearCount = 0;
    const gamePlaySequenceSet = await this.client.smembers(plk);
    for(let gamePlaySequence of gamePlaySequenceSet) {
      const otherData = await this.getValue(`${plk}-${gamePlaySequence}`);
      if (otherData.notificationSentAt && (otherData.notificationSentAt <= data.notificationSentAt)) {
        await this.client.srem(plk, otherData.gamePlaySequence);
        await this.client.expire(`${plk}-${otherData.gamePlaySequence}`, 10);
        clearCount += 1;
      }
    }
    console.log(`Clearing ${clearCount} notifications for player ${userId} for game ${gameTableId}`);
  }

  async getPlayerGamePlayNotification(gameTableId, userId, gamePlaySequence) {
    const plk = `player-game-play-${gameTableId}-${userId}`;
    return this.getValue(`player-game-play-${gameTableId}-${userId}-${gamePlaySequence}`);
  }

  async appendPlayerGamePlayNotifications(gameTableId, userId, data) {
    const plk = `player-game-play-${gameTableId}-${userId}`;
    await this.setValue(`${plk}-${data.gamePlaySequence}`, data);
    await this.client.sadd(plk, data.gamePlaySequence);
  }

  getPlayerMove(data) {
    return Object.assign(
      {},
      (data['playCard'] || data['playCard'] === 0) && { playCard: data['playCard'] },
      data['continue'] && { continue: data['continue'] },
      data['gotoMarket'] && { gotoMarket: data['gotoMarket'] },
      data['whotFollowUpSuit'] && { whotFollowUpSuit: data['whotFollowUpSuit'] },
    );
  }

  async create(data, params) {
    let [playerState, whot] = await this.requirePlayerTurn(data, params);

    const play = Object.assign(
      { player: playerState.player_detail.name }, this.getPlayerMove(data)
    );

    if (!whot) {
      whot = await this.startNewGame(playerState.gameTableId);
    }
    else {
      whot = await this.applyMove(playerState, whot, play);
    }

    const publicStatus = Object.assign({
      play: play,
      maxPlayerCount: whot.players.length,
    }, await this.getTournamentData(playerState.gameTableId), whot.getGameStatus());

    this.clearPlayerTimeout(playerState.gameTableId);
    await this.notifyPlayers(whot, playerState.gameTableId, publicStatus)

    if (publicStatus.status === 'live' && whot.isCurrentPlayerARobot()) {
      await this.pushWhotAIRequest(playerState.gameTableId);
    }
    else if (publicStatus.status === 'live') {
      this.setPlayerTimeout(playerState.gameTableId);
    }
    else if (publicStatus.status !== 'live') {
      await this.endGame(playerState.gameTableId, whot);
    }

    return Object.assign({
      deck: whot.getPlayerDeck(playerState.id),
      status: 'live',
    }, getWebSocketArgs(), publicStatus);
  }

  async get(id, params) {
    const isPlayer = await requirePlayer(params.user);
    if (!isPlayer) {
      throw errors.Forbidden('Only game table players can access game plays');
    }
    const playerState = await this.requirePlayerGame({
      gameTableId: id
    }, params, true);

    if (params.query.gamePlaySequence || `${params.query.gamePlaySequence}` === '0') {
      return this.getPlayerGamePlayNotification(
        id, playerState.player_detail.userId, params.query.gamePlaySequence);
    }

    const gameTableModel = this.getModel('game_table');
    const table = await gameTableModel.findOne({ where: { id } });

    let response = Object.assign({
      status: table.gameStatus,
      maxPlayerCount: table.maxPlayerCount,
    }, await this.getTournamentData(table.id), getWebSocketArgs());

    let whot = await this.getGamePlay(playerState, false);
    if (!whot) {
      const playerGameStateModel = this.getModel('player_game_state');
      const players = await playerGameStateModel.findAll({
        where: { gameTableId: id, },
        include: ['player_detail']
      });
      response = Object.assign(response, {
        gamePlaySequence: 0,
        players: players.map((p) => ({ name: p.player_detail.name, cardCount: 0 })),
      });
    } else {
      response = Object.assign(response, { deck: whot.getPlayerDeck(playerState.id), }, whot.getGameStatus());
    }
    if (table.gameStatus === 'ended') {
      response.status = table.gameStatus;
    }

    return response;
  }

  async remove(id, params) {
    const isPlayer = await requirePlayer(params.user);
    if (!isPlayer) {
      throw errors.Forbidden('Only game table players can clear game play notifications');
    }
    const playerState = await this.requirePlayerGame({
      gameTableId: id
    }, params, true);

    if (!params.query.gamePlaySequence && params.query.gamePlaySequence !== 0) {
      throw errors.BadRequest('Missing/Invalid query parameter: `gamePlaySequence`');
    }

    const clearCount = await this.clearPlayerNotifications(
      id, playerState.player_detail.userId, params.query.gamePlaySequence);

    return {"cleared": clearCount};
  }
};
