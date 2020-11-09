'use strict';
  
const { Model } = require('sequelize');
const _ = require('lodash');
const { evalTruthArray } = reqlib('_/modules/utils');

module.exports = class BaseModel extends Model {
  /**
   * Support removing attributes based on dynamically generated blacklists
   * compiled from the defined config and user's permissions.
   */

  get(key, options) {
    if (options === undefined && typeof(key) == 'object') {
      options = key;
      key = undefined;
    }
    options = options || {};

    let values = super.get(key, options);

    if (!key && _.isPlainObject(values)) {
      if (this.attrBlacklist) {
        values = _.omit(values, this.attrBlacklist);
      }
    }

    return values;
  }

  /**
   * Compile the attribute blacklist.
   */
  async compileAttrBlacklist(permissions, fnArgs = []) {
    const attrBlacklist = {};

    const names = [
      ...Object.keys(this.constructor.rawAttributes),
      ...this._options.includeNames || []
    ];

    await Promise.all(names.map(async name => {
      let _config = {};
      if (this.constructor.rawAttributes[name]) {
        _config = this.constructor.rawAttributes[name]._config || {};
      }
      else if (this.constructor.associations[name]) {
        _config = _.pick(this.constructor.associations[name].options, [
          'writeOnly', 'viewIff'
        ]);
      }

      if (_config.writeOnly) {
        attrBlacklist[name] = true;
        return;
      }

      if (_config.viewIff) {
        const pass = await evalTruthArray(_config.viewIff, permissions, 'any', this, fnArgs);

        if (pass !== true) {
          attrBlacklist[name] = true;
          return;
        }
      }
    }));

    this.attrBlacklist = Object.keys(attrBlacklist);

    if (this._options.includeNames) {
      const subModels = [];
      this._options.includeNames.forEach(name => {
        if (attrBlacklist[name]) {
          return;
        }

        const value = this.get(name);
        if (_.isArray(value)) {
          subModels.push.apply(subModels, value);
        }
        else if (value) {
          subModels.push(value);
        }
      });

      await Promise.all(subModels.map(subModel => {
        if (subModel instanceof BaseModel) {
          return subModel.compileAttrBlacklist();
        }
      }));
    }
  }

  /**
   * Custom Hooks
   */

  /**
   * Run a hook before/after a save operation that updates a certain field. The
   * hook function should have signature:
   *
   * function(newValue, oldValue, instance, options) {}
   *
   * If "field" is an array of fields, the hook will run if at least one of the
   * fields was updated and new/old value will be an object.
   */

  static beforeSaveField(field, hook) {
    this.beforeSave(function(instance, options) {
      const {hasChanges, newValue, oldValue} = getChanges(field, instance);

      if (hasChanges) {
        return hook(newValue, oldValue, instance, options);
      }
      else {
        return Promise.resolve();
      }
    });
  }

  static afterSaveField(field, hook) {
    let changes;

    this.beforeSave(function(instance, _options) {
      changes = getChanges(field, instance);
    });

    this.afterSave(function(instance, options) {
      if (changes.hasChanges) {
        return hook(changes.newValue, changes.oldValue, instance, options);
      }
      else {
        return Promise.resolve();
      }
    });
  }
};

/**
 * Given one or more fields, get all the updated ones from an instance.
 */
function getChanges(field, instance) {
  let hasChanges = false;
  let newValue;
  let oldValue;

  if (_.isArray(field)) {
    newValue = {};
    oldValue = {};
    for (let i = 0; i < field.length; i++) {
      if (instance.changed(field[i])) {
        hasChanges = true;
        newValue[field[i]] = instance.get(field[i]);
        oldValue[field[i]] = instance.previous(field[i]);
      }
    }
  }
  else {
    if (instance.changed(field)) {
      hasChanges = true;
      newValue = instance.get(field);
      oldValue = instance.previous(field);
    }
  }

  return {hasChanges, newValue, oldValue};
}
