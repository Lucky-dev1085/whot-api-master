'use strict';

module.exports = class PlayerNamesService {
  constructor() {
    this.models = null;
    this._config = {
      auth: {
        find: true,
      },
      apidocs: { operations: 'f' }
    };
    
    require('./apidocs')();
  }

  getModel(modelKey) {
    if (!this.models) {
      this.models = reqlib('_/models');
    }
    return this.models[modelKey];
  }

  async find(params) {
    const nameSearch = params.query['nameSearch']
    if(!nameSearch) {
      return {
        names: [],
        count: 0
      };
    }
    const playerDetailModel = this.getModel('player_detail');
    
    const where = {
      name: {'$iLike': `${nameSearch}%` }
    };
    const count = await playerDetailModel.count({ where });
    const results = await playerDetailModel.findAll({ where, limit: 10 });

    return {
      count: count,
      player_details: results.map((pd) => { return {id: pd.id, name: pd.name}; }),
    };
  };
};
