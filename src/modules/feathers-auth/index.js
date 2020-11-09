'use strict';

const auth = require('./hooks/auth');
const cfg = require('./cfg');

exports.bootstrap = function() {
  app.configure(require('./setup/authentication'));

  // authorisation hook, to run before everything else on each request:
  app.hooks({
    before: {
      all: [
        auth(cfg.allowByDefault)
      ]
    }
  });
};
