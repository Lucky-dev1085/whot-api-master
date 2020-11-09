'use strict';

const debug = require('debug')('app:module:aws:ses');
const aws = require('./aws');
const cfg = require('./cfg');
const _ = require('lodash');
const { formatEmail } = require('./utils');

function getRegion() {
  return _.get(cfg, 'services.ses.region', cfg.region);
}

/**
 * Send email.
 *
 * sendEmail({
 *   to: {addr: 'recipient@example.com', name: 'Recipient Name'}, // or to: 'recipient@example.com'
 *   // from: ... same as 'to' (optional, picked from configuration)
 *   subject: 'Subject',
 *   text: 'text version',
 *   html: '<b>html</b> version'
 * })
 *
 * @param {Object} params Sending parameters
 * @return {Promise}
 */
exports.sendEmail = async function(params) {
  debug('To:', params.to, 'Subject:', params.subject);

  if (cfg.simulate) {
    return;
  }

  const client = new aws.SES({
    region: getRegion()
  });

  const payload = {
    Destination: {
      ToAddresses: [
        formatEmail(params.to)
      ]
    },
    Message: {
      Body: {
        ...params.html && {Html: {Data: params.html}},
        ...params.text && {Text: {Data: params.text}}
      },
      Subject: {
        Data: params.subject || ''
      }
    },
    Source: formatEmail(params.from || _.get(cfg, 'services.ses.from', 'sender@example.com'))
  };

  return client.sendEmail(payload).promise();
};
