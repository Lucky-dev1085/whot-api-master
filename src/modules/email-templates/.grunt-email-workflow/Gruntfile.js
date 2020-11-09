require(require('app-root-path') + '/bootstrap');
const cfg = require('../cfg');

module.exports = function(grunt) {

  require('load-grunt-config')(grunt, {

    // Pass data to tasks
    data: {

      // Re-usable filesystem path variables
      paths: {
        src:        rootdir + '/email-templates/src',
        src_img:    rootdir + '/email-templates/src/img',
        dist:       rootdir + '/email-templates/dist',
        dist_img:   rootdir + '/email-templates/dist/img',
        preview:    'preview'
      },

      secrets: cfg.secrets
    }
  });
};
