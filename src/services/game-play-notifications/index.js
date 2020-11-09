'use strict';

module.exports = class GamePlayNotificationsService {
  constructor() {
    this.models = null;
    this._config = {
      auth: {
        create: false,
      },
      apidocs: false,
      publish: { all: async function (data, context) {
        console.log(`🔔 Sending notification to ${data.userId} from game ${data.gameTableId}`);
        return app.channel(`users-${data.userId}`);
      }},
    };
  }

  async create(data, params) {
    return data;
  };
};
