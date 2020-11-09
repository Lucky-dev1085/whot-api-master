'use strict';

const consolidate = require('consolidate');

/**
 * Render an e-mail template.
 *
 * @param {String} name The template basename
 * @param {Object} data
 * @return {Promise}
 */
exports.renderTemplate = function(name, data) {
  const tpl = `${rootdir}/email-templates/dist/${name}.html`;
  const render = consolidate.handlebars;

  return render(tpl, data);
};
