'use strict';

const apidocs = reqlib('_/modules/apidocs');
const pkg = require(require('app-root-path') + '/package');

exports.init = function() {
  // serve the docs index page:
  app.get(apidocs.cfg.path, function(req, res) {
    res.render(apidocs.docsIndex, {
      path: apidocs.cfg.path,
      name: pkg.name
    });
  });

  // serve Swagger UI:
  app.use(`${apidocs.cfg.path}/swagger-ui`, app.express.static(apidocs.swaggerUI.getAbsoluteFSPath()));

  // serve the API spec:
  app.mountService(`${apidocs.cfg.path}/spec`, {
    _config: {
      auth: true
    },

    async find() {
      return apidocs.spec.get();
    }
  });
};
