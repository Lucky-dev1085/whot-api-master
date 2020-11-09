'use strict';

const debug = require('debug')('app:module:email');
const cfg = require('./cfg');
const _ = require('lodash');
const emailTemplates = reqlib('_/modules/email-templates', true);

// load all providers:
const knownProviders = [
  'aws/ses', 'mailgun', 'mailjet', 'sendgrid'
];
const providers = _.fromPairs(
  knownProviders.concat(cfg.providers).map(
    provider => [provider, reqlib(`_/modules/${provider}`, true)]
  ).filter(provider => !!provider[1])
);

// default provider name:
const _providerName = cfg.defaultProvider || _.keys(providers)[0];


/**
 * Send an e-mail.
 *
 * sendEmail({
 *   provider: '...', // optional, uses default provider if not defined
 *   to: {addr: 'recipient@example.com', name: 'Recipient Name'}, // or to: 'recipient@example.com'
 *   // from: ... same as 'to' (optional, picked from configuration)
 *   subject: 'Subject',
 *   text: {name: 'text-template-name', data: {...}}, // or just text: 'text version'
 *   html: {name: 'html-template-name', data: {...}} // or just html: '<b>html</b> version'
 *   // ... any other provider specific options ...
 * })
 *
 * @param {Object} params E-mail sending parameters
 * @return {Promise}
 */
exports.sendEmail = async function(params) {
  if (cfg.simulate) {
    debug('To:', params.to, 'Subject:', params.subject);
    return;
  }

  const providerName = params.provider || _providerName;
  if (!providerName) {
    throw new Error('Can\'t determine e-mail provider');
  }

  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Invalid e-mail provider "${providerName}"`);
  }

  params = Object.assign({}, params);

  if (!params.from && cfg.from) {
    params.from = cfg.from;
  }

  // render templates:
  if (typeof(params.text) == 'object' || typeof(params.html) == 'object') {
    if (!emailTemplates) {
      throw new Error('Module "email-templates" is required');
    }

    if (typeof(params.text) == 'object') {
      params.text = await emailTemplates.renderTemplate(params.text.name, params.text.data);
    }

    if (typeof(params.html) == 'object') {
      params.html = await emailTemplates.renderTemplate(params.html.name, params.html.data);
    }
  }

  return provider.sendEmail(params);
};
