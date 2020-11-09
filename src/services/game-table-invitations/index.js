'use strict';
const moment = require('moment');
const _ = require('lodash');
const errors = reqlib('_/modules/feathers/errors');
const emailModule = reqlib('_/modules/email', true);
const cfg = reqlib('_/modules/feathers-auth/cfg');

function redirectMiddleware(req, res, next) {
  if (res.data.redirectUrl) {
    res.redirect(res.data.redirectUrl);
  } else {
    next();
  }
}

module.exports = class GamesService {
  constructor() {
    this.models = null;
    this._config = {
      auth: {
        create: true,
        find: true,
      },
      apidocs: { operations: 'cr' },
      customServiceMiddleware: redirectMiddleware,
    };
    
    require('./apidocs')();
  }

  getModel(modelKey) {
    if (!this.models) {
      this.models = reqlib('_/models');
    }
    return this.models[modelKey];
  }

  async requirePlayer(params) {
    if (!params.user) {
      throw errors.NotAuthenticated(null, `Must be logged-in to update games`);
    }
    const isAdmin = await params.user.hasPermissions(['game:write']);
    return !isAdmin;
  }

  async requireTokenInQuery(params) {
    if (!params.query.token) {
      throw errors.NotFound(null, `Missing or invalid token`);
    }

    const tokenModel = this.getModel('token');
    const token = await tokenModel.findOne({
      where: {
        id: params.query.token,
        scope: 'gameInvitation'
      }
    });
    if (!token) {
      throw errors.NotFound(null, 'Missing/Invalid invitation token');
    }
    return token;
  }

  async find(params) {
    const token = await this.requireTokenInQuery(params)
    const action = params.query.action;
    if (!action || action != 'decline') {
      return token.data;
    }

    // user declined this invitation
    const userModel = this.getModel('user');
    const user = await userModel.findOne({
      where: {
        id: token.data.hostUserId,
      }
    });
    if (!user) {
      throw errors.NotFound(null, 'Missing/Invalid host user');
    }

    let inviteLink = config.gameInvitePlayersUrl;
    let userInviteLink = inviteLink
      .replace('$gameTableId', token.data.gameTableId);

    await emailModule.sendEmail({
      to: user.email,
      subject: `${token.data.guestUserName} declined your Whot.ng invitation`,
      html: {
        name: 'game-invitation-declined',
        data: {
          firstName: token.data.guestUserName,
          headerImageUrl: cfg.get('features.welcomeEmail.headerImageUrl'),
          link: userInviteLink,
        }
      }
    });

    const gameTableModel = this.getModel('game_table');
    const gameTable = await gameTableModel.findOne({
      where: { id: token.data.gameTableId },
    });

    let declinedLink = config.gameInviteDeclinedUrl;
    let userDeclinedLink = declinedLink
      .replace('$tableTitle', encodeURIComponent(gameTable.tableTitle))
      .replace('$minStakeAmount', (gameTable.minStakeAmount));

    return { redirectUrl: userDeclinedLink };
  }

  async create(data, params) {
    const isPlayer = await this.requirePlayer(params);
    const gameTableModel = this.getModel('game_table');
    const playerDetailModel = this.getModel('player_detail');

    const playerDetail = await playerDetailModel.findOne({
      where: {userId: params.user.id}
    });
    if (!playerDetail && isPlayer) {
      throw errors.Forbidden(null, `Only game players can update game tables`);
    }

    const gameTable = await gameTableModel.findOne({ where: Object.assign(
      {
        id: data.gameTableId,
        gameStatus: 'notStarted'
      },
      isPlayer && { playerDetailId: playerDetail.id }
    )});

    if (!gameTable) {
      throw errors.NotFound(null, `Game table not found: ${data.gameTableId}`);
    }

    if (!data.playerDetailIds || data.playerDetailIds.length == 0) {
      throw errors.BadRequest(null, `No player invitations sent`);
    }
    
    const invitedPlayers = await playerDetailModel.findAll({
      where: {id: data.playerDetailIds}
    });

    if (invitedPlayers.length < data.playerDetailIds.length) {
      throw errors.BadRequest(null, `Failed to find some players`);
    }

    if (!emailModule) {
      return { state: 'Missing email module' };
    }

    const cfgs = {
      firstName: params.user.firstName,
      minStakeAmount: gameTable.minStakeAmount,
      maxPlayerCount: gameTable.maxPlayerCount,
      startTime: gameTable.startingAt,
      headerImageUrl: cfg.get('features.welcomeEmail.headerImageUrl')
    };
    
    let joinLink = config.gameConfirmInvitationUrl;
    let declineLink = config.gameDeclineInvitationUrl;

    for(let player of invitedPlayers) {
      let user = await player.getUser();

      const token = await user.createToken({
        scope: 'gameInvitation',
        data: {
          hostUserId: params.user.id,
          guestUserName: user.firstName,
          gameTableId: gameTable.id,
          tableTitle: gameTable.tableTitle,
          minStakeAmount: gameTable.minStakeAmount,
          maxPlayerCount: gameTable.maxPlayerCount,
        }
      });
      let userJoinLink = joinLink
        .replace('$token', token.id)
        .replace('$tableTitle', encodeURIComponent(gameTable.tableTitle))
        .replace('$minStakeAmount', (gameTable.minStakeAmount));

      let userDeclineLink = declineLink
        .replace('$token', token.id);

      await emailModule.sendEmail({
        to: user.email,
        subject: `Invitation to join ${player.name} for a game of Whot.ng`,
        html: {
          name: 'game-invitation',
          data: _.merge({}, cfgs, {
            joinLink: userJoinLink,
            declineLink: userDeclineLink
          })
        }
      });
    }
    return { state: 'ok' };
  }
};

