'use strict';

const _ = require('lodash');
const moment = require('moment');
const errors = require('@feathersjs/errors');
const { ensureKey } = reqlib('_/modules/utils');

const requirePlayer = async function requirePlayer(user) {
  if (!user) {
    throw { code: 401, message: `Must be logged-in to access this operation`};
  }
  const isAdmin = await user.hasPermissions(['game:write']);
  return !isAdmin;
}

const enforcePlayer = function(options) {

  return async function enforcePlayer(context) {
    const user = context.params.user;

    if (!user) {
      throw errors.BadRequest(null, `Must be logged-in to perform this operation`);
    }

    const models = context.service.model.sequelize.models;
    const playerDetailModel = models['player_detail']

    const unfilteredAccess = await user.hasPermissions([`players:read`, `players:write`]);
    if (unfilteredAccess) {
      // user is allowed to access everything
      return true;
    }

    const playerDetail = await playerDetailModel.findOne({
      where: {userId: user.id}
    });
    if (!playerDetail) {
      throw errors.BadRequest(null, `Only game players can manage their bank accounts`);
    }

    const playerValue = _.get(playerDetail, options.playerField || options.field);
    if (!playerValue) {
      return false;
    }

    // for any reads, apply a filter:
    const $and = ensureKey(context.params, 'sequelize.where.$and', []);
    $and.push({
      [options.field]: {
        $or: [
          {$eq: playerValue},
          {$eq: null}
        ]
      }
    });

    return true;
  };  
}

function error(message) {
  return { message };
}

async function requireNotPlaying(playerDetailId, startingAt, sequelizeModels) {
  if (!playerDetailId) {
    return
  }

  const playerGameStateModel = sequelizeModels.player_game_state;
  let joinedGames =  await playerGameStateModel.findAll({
    where: {
      state: 'JOINED',
      playerDetailId: playerDetailId,
      gameTableId: { $ne: null },
    }
  });

  if (!joinedGames.length) {
    return;
  }

  const deckCount = 49; // 49 cards
  const moveTimeout = parseInt(config.playerTimeout || '20');
  const startCountdown = parseInt(config.gameDispatcherCountdown || '20');
  const maxGameDuration = deckCount * moveTimeout;

  const gameTableIds = joinedGames.map((gplayerGame) => gplayerGame.gameTableId);

  startingAt = moment(startingAt);
  let endsAt = moment(startingAt);
  endsAt = endsAt.add(maxGameDuration, 'seconds');

  let otherGameCountdownAt = moment(startingAt);
  otherGameCountdownAt = otherGameCountdownAt.subtract(startCountdown, 'seconds');
  otherGameCountdownAt = otherGameCountdownAt.subtract(startCountdown, 'seconds');
  otherGameCountdownAt = otherGameCountdownAt.subtract(maxGameDuration, 'seconds');

  const gameTableModel = sequelizeModels.game_table;
  let joinedGameCount = await gameTableModel.count({
    where: {
      id: gameTableIds,
      startingAt: {
        $gte: otherGameCountdownAt.toISOString(),
        $lte: endsAt.toISOString()
      }
    }
  });

  if (joinedGameCount > 0) {
    throw error(`Another game you have joined is scheduled to start`);
  }
}

module.exports = {
  enforcePlayer: enforcePlayer,
  requirePlayer: requirePlayer,
  requireNotPlaying: requireNotPlaying,
};
