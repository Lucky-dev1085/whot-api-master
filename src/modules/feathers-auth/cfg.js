'use strict';

const defaults = config.util.hydrate(require('./defaults'));
const _ = require('lodash');

const cfg = module.exports = _.merge({}, defaults, _.get(config, 'modules.feathers-auth'));
config.util.attachProtoDeep(cfg);

// dynamically enable PassportJS:
if (!cfg.has('features.passport')) {
  cfg.features.passport = {
    enabled: false
  };

  const protocols = _.map(cfg.get('providers'), function(value, key) {
    return value.protocol || key;
  });
  if (_.intersection(protocols, ['oauth', 'oauth2', 'saml']).length) {
    cfg.features.passport.enabled = true;
  }
}
