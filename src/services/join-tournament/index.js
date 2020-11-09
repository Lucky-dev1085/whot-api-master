'use strict';
const moment = require('moment');
const errors = reqlib('_/modules/feathers/errors');
const { requirePlayer, requireNotPlaying } = reqlib('_/src/utils/access-control');


module.exports = class JoinTournamentService {
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

  async create(data, params) {
    let isPlayer
    try {
      isPlayer = await requirePlayer(params.user);
    } catch(e) {
      throw errors.NotAuthenticated(null, e.message);
    }
    if (!isPlayer) {
      throw errors.NotAuthenticated(null, `Only game players can join tournaments`);
    }

    const playerDetailModel = this.getModel('player_detail');

    const playerDetail = await playerDetailModel.findOne({
      where: {userId: params.user.id}
    });
    if (!playerDetail) {
      throw errors.Forbidden(null, `Only game players can join tournaments`);
    }

    const tournamentModel = this.getModel('tournament');
    const tournament = await tournamentModel.findOne({ where: {
      id: data.tournamentId,
      state: 'PENDING',
      startingAt: {$gt: moment().toISOString()}
    }});

    if (!tournament) {
      throw errors.NotFound(null, `Tournament not found or already started`);
    }

    const stakeAmount = data.stakeAmount || tournament.stakeAmount || 0;
    if (stakeAmount < tournament.stakeAmount) {
      throw errors.BadRequest(null, `A minimum stake amount of ${tournament.stakeAmount} is required`);
    }

    const [upCount, upRows] = await playerDetailModel.update({
      depositBalance: playerDetail.depositBalance - stakeAmount,
    }, { where: {
      userId: params.user.id,
      depositBalance: {$gte: stakeAmount}
    }});

    if (!upCount) {
      throw errors.BadRequest(null, `Insufficient funds`);
    }

    const tournamentRankModel = this.getModel('tournament_rank');
    const rank =  await tournamentRankModel.create({
      state: 'JOINED',
      stakeAmount: stakeAmount,
      tournamentId: data.tournamentId,
      playerDetailId: playerDetail.id,
      score: 0,
    });

    await tournamentModel.increment({
      playerCount: 1,
    }, {where: {id: data.tournamentId,}});

    return rank;
  }
};

