'use strict';

const _ = require('lodash');
const generateSchema = reqlib('_/modules/sequelize/utils/generateSchema');
const apidocs = reqlib('_/modules/sequelize/utils/apidocs');
const futils = reqlib('_/modules/feathers-utils');
const { parseQuery, mergeQueryOptions, parseSearchFilter } = require('./utils');
const errors = reqlib('_/modules/feathers/errors');
const hooks = require('./hooks');

module.exports = class Service {
  constructor(_config) {
    this._config = _.merge({
      primaryKey: 'id'
    }, _config);

    this.model = this._config.model;
    this.id = this.pk = this._config.primaryKey;

    // add a reference to this service on the model, used when dealing with
    // associations:
    if (!this.model.options.service) {
      this.model.options.service = this;
    }

    // hooks:
    const userHooks = futils.parseHooks(this._config.hooks);
    this._config.hooks = futils.mergeHooks(
      {before: userHooks.before},
      {before: hooks.before},
      {after: hooks.after},
      {after: userHooks.after},
      {error: hooks.error},
      {error: userHooks.error}
    );

    // generate API docs for this model:
    if (this._config.apidocs !== false) {
      this._config.apidocs = apidocs.crud(_.merge({
        model: this.model
      }, this._config.apidocs));
    }

    // generate schema for this model:
    this._config.schema = generateSchema(this.model, this._config.schema);
  }

  /**
   * Find
   */

  async _find(params, queryOptionsOverrides) {
    const paginate = _.get(params, 'paginate', this._config.paginate);
    const query = Object.assign({}, this._config.query, params.query);

    const {filters, where} = parseQuery(query, paginate);

    const associationFilters = _.filter(where, function(value, key) {
      return (/^\$.+\$$/).test(key);
    });

    let associationSearchFields = [];
    if (filters.$q && filters.$searchFields) {
      const fields = filters.$searchFields.split(/\s*,\s*/);
      associationSearchFields = _.filter(fields, function(value) {
        return (/^\$.+\$$/).test(value);
      });
    }
    const hasAssociations = associationFilters.length || associationSearchFields.length;

    const queryOptions = mergeQueryOptions(
      {
        where,
        include: filters.$include || [],
        ...filters.$order && {
          order: this._parseOrder(filters.$order)
        },
      },
      (filters.$offset || filters.$limit) && {
        offset: filters.$offset || 0,
        limit: filters.$limit || Number.MAX_SAFE_INTEGER,
      },
      (filters.$offset || filters.$limit) && hasAssociations && {
        // When $limit/$offset are specified, sequelize will get data from the
        // main table using a subquery with limit/offsset for performance.
        //
        // However when $association.field$ filters are also specified, sequelize
        // will incorrectly add the filter to the where clause of the generated
        // subquery resulting in broken SQL.
        //
        // So we mitigate using the undocumented 'subQuery' option (google it!).
        //
        subQuery: false,
      },
      filters.$q && filters.$searchFields && parseSearchFilter(
        filters.$searchFields, filters.$q, this.model),
      params.sequelize,
      queryOptionsOverrides
    );

    if (queryOptions.limit === 0) {
      return this.model.count({
        ..._.pick(queryOptions, ['where', 'include']),
        col: this.pk,
        distinct: true
      });
    }
    else {
      let result;

      if (queryOptions.offset || queryOptions.limit) {
        result = Object.assign(
          {
            offset: queryOptions.offset,
            limit: queryOptions.limit,
            total: 0
          },
          await this.model.findAndCountAll({
            ...queryOptions,
            distinct: true
          })
        );

        result.data = result.rows;
        delete result.rows;

        result.total = result.count;
        delete result.count;
      }
      else {
        result = {
          data: await this.model.findAll(queryOptions)
        };
      }

      return result;
    }
  }

  async find(params) {
    const result = await this._find(params);

    _.set(params, 'crud.result', result);

    return result;
  }

  /**
   * Create
   */

  async _create(data, params, transaction) {
    let result;

    if (_.isArray(data)) {
      result = await this.model.bulkCreate(data, {individualHooks: true, transaction});
      await Promise.all(result.map((instance, i) => this._updateAssociations({
        params, instance, data: data[i], transaction
      })));
    }
    else {
      result = await this.model.create(data, {transaction});
      await this._updateAssociations({params, instance: result, data, transaction});
    }

    return result;
  }

  async create(data, params) {
    let result;

    try {
      if (params.transaction) {
        result = await this._create(data, params, params.transaction);
      }
      else {
        result = await this.model.sequelize.transaction(
          transaction => this._create(data, params, transaction)
        );
      }
    }
    catch (e) {
      throw e;
    }

    const $include = _.get(params, 'query.$include');
    if ($include) {
      const ids = _.isArray(result) ? _.map(result, this.pk) : [result[this.pk]];
      result = await this._find(params, {
        where: {
          [this.pk]: ids
        }
      });

      if (_.isArray(data)) {
        result = result.data;
      }
      else {
        result = result.data[0];
      }
    }

    _.set(params, 'crud.result', result);

    return result;
  }

  /**
   * Get
   */
  async get(id, params) {
    const result = await this._find(params, {
      where: {
        [this.pk]: id
      }
    });

    if (!result.data.length) {
      throw errors.NotFound();
    }

    _.set(params, 'crud.result', result.data[0]);

    return result.data[0];
  }

  /**
   * Patch
   */

  async _patch(id, data, params, transaction) {
    const result = await this._find(params, {
      where: {
        ...id && {[this.pk]: id}
      }
    });

    await Promise.all(result.data.map(async instance => {
      await instance.update(data, {transaction});
      result.updated = await this._updateAssociations({params, instance, data, transaction});
    }));

    return result;
  }

  async patch(id, data, params) {
    let result;

    try {
      if (params.transaction) {
        result = await this._patch(id, data, params, params.transaction);
      }
      else {
        result = await this.model.sequelize.transaction(
          transaction => this._patch(id, data, params, transaction)
        );
      }
    }
    catch (e) {
      throw e;
    }

    if (result.updated) {
      await Promise.all(result.data.map(instance => instance.reload()));
    }

    if (id) {
      if (!result.data.length) {
        throw errors.NotFound();
      }

      _.set(params, 'crud.result', result.data[0]);
      return result.data[0];
    }
    else {
      _.set(params, 'crud.result', result);
      return result.data;
    }
  }

  /**
   * Remove
   */
  async remove(id, params) {
    if (!id) {
      const query = Object.assign({}, this._config.query, params.query);
      const {filters, where} = parseQuery(query);

      if (filters.$all !== true && !Object.keys(where).length) {
        throw errors.BadRequest(null, 'Query parameters must be specified');
      }
    }

    const result = await this._find(params, {
      where: {
        ...id && {[this.pk]: id}
      }
    });

    if (id) {
      if (!result.data.length) {
        throw errors.NotFound();
      }

      await result.data[0].destroy();

      _.set(params, 'crud.result', result.data[0]);
      return result.data[0];
    }
    else {
      const service = app.service(this._config.path);
      const deleted = await Promise.all(result.data.map(async instance => {
        let res;

        try {
          res = await service.remove(instance.id, params);
        }
        catch (e) {
          res = e;
        }

        return res;
      }));

      _.set(params, 'crud.result', deleted);
      return deleted;
    }
  }

  /**
   * Update associations
   */
  async _updateAssociations({params, instance, data, transaction}) {
    let updated = false;

    await Promise.all(_.map(this.model.associations, async (assoc, name) => {
      const assocType = assoc.associationType;
      if (!data[name]) {
        return;
      }

      const Name = _.upperFirst(name);
      const assocData = data[name];

      if (assocType !== 'BelongsTo' && assocData.remove) {
        // Remove a specific set of associations
        if (assoc.options.onDelete && assoc.options.onDelete.toLowerCase() === 'cascade') {
          let items = await this._removeAssociations({params, instance, assoc, assocData: assocData.remove, transaction});
          updated = items.length ? true : false;
        }
        else {
          let items = await this._findAssociations({params, instance, assoc, assocData: assocData.remove, transaction});
          if (items.length) {
            const service = app.service(assoc.target.options.service._config.path);
            let itemKeys = items.map((match) => match[service.pk]);

            updated = true;
            await instance[`remove${Name}`](itemKeys, { transaction });
          }
        }
      }

      if (typeof(assocData.set) !== 'undefined' && (assocData.set === null || !assocData.set.length)) {
        // Remove all associations
        updated = true;
        await instance[`set${Name}`](null, { transaction });
      }
      else if (assocData.set) {
        // Associate with these new or existing objects
        let items = await this._addAssociations({params, instance, assoc, assocData: assocData.set, transaction});
        if (items.length) {
          updated = true;
          await instance[`set${Name}`](assocType == 'BelongsTo' ? items[0] : items, {transaction});
        }
      }

      if (assocType !== 'BelongsTo' && assocData.add) {
        // Associate with these new or existing objects
        let items = await this._addAssociations({params, instance, assoc, assocData: assocData.add, transaction});
        if (items.length) {
          updated = true;
          await instance[`add${Name}`](items, {transaction});
        }
      }
    }));

    return updated;
  }

  /**
   * Add associations
   */
  async _addAssociations({params, instance, assoc, assocData, transaction}) {
    const service = app.service(assoc.target.options.service._config.path);

    const serviceMethodParams = {
      provider: params.provider,
      user: params.user,
      jwt: params.jwt,
      transaction
    };

    return _.filter(await Promise.all(assocData.map(async item => {
      if (!item) {
        return;
      }
      let persisted;

      try {
        if (typeof(item) == 'object') {
          // Create or Patch associated object
          const payload = item.payload || item;

          const fkey = assoc.options.foreignKey || `${this.model.name}Id`;
          payload[fkey] = instance[this.pk];

          if (!item[service.pk]) {
            const createParams = Object.assign({ query: { $upsert: true } }, serviceMethodParams);
            persisted = await service.create(payload, createParams);
          }
          else {
            // Update the associated object
            persisted = await service.patch(item[service.pk], payload, serviceMethodParams);
          }
        }
        else {
          // No need to operate any updates on associated object
          persisted = await service.get(item, serviceMethodParams);
        }

        if (!(persisted instanceof assoc.target)) {
          persisted = assoc.target.build({
            [service.pk]: persisted[service.pk]
          }, {isNewRecord: false});
        }

        if (item.through) {
          persisted[assoc.options.through.model.name] = item.through;
        }
      }
      catch (e) {
        throw e;
      }

      return persisted;
    })));
  }

  async _removeAssociations({params, instance, assoc, assocData, transaction}) {
    const service = app.service(assoc.target.options.service._config.path);

    const result = await service.remove(null, {
      provider: params.provider,
      user: params.user,
      jwt: params.jwt,
      query: this._makeAssociationQuery(instance, assoc, assocData, service.pk),
      transaction
    });

    return result;
  }

  async _findAssociations({params, instance, assoc, assocData, transaction}) {
    const service = app.service(assoc.target.options.service._config.path);

    const result = await service.find({
      provider: params.provider,
      user: params.user,
      jwt: params.jwt,
      query: this._makeAssociationQuery(instance, assoc, assocData, service.pk),
      transaction
    });

    return result.data;
  }

  _makeAssociationQuery(instance, assoc, assocData, primaryKey) {
    let query = [];
    const {assocKeys, assocFilters} = _.groupBy(assocData, (item) => typeof(item) !== 'object' ? 'assocKeys': 'assocFilters');

    if (assocFilters) {
      query = [...query, ...assocFilters];
    }

    if (assocKeys) {
      query = [...query, { [primaryKey]: assocKeys }];
    }

    const foreignKey = assoc.options.foreignKey || `${this.model.name}Id`;
    return {
      [foreignKey]: instance[this.pk],
      $or: query
    };
  }

  /**
   * Parse the $order parameter.
   */
  _parseOrder($order) {
    const parsed = [];

    $order.split(/\s*,\s*/).forEach(field => {
      const f = field.replace(/^[+-]/, '').split('.');
      let order;

      if (f.length > 1) {
        order = f;
      }
      else {
        order = _.get(this._config, `customOrder.${f[0]}`, f[0]);

        if (_.isFunction(order)) {
          order = order(this);
        }
        else {
          order = _.clone(order);
        }
      }

      if (_.isArray(order) && _.isArray(order[0])) {
        parsed.push.apply(parsed, order);
      }
      else {
        if (!_.isArray(order)) {
          order = [order];
        }

        if (!(/^(asc|desc)$/i.test(order[order.length - 1]))) {
          order.push(field.charAt(0) == '-' ? 'DESC' : 'ASC');
        }

        parsed.push(order);
      }
    });

    return parsed;
  }
};
