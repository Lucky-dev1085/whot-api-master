'use strict';

const cfg = require('./cfg');
const request = require('request-promise-native');

const appKey = cfg.appKey;
const basicKey = cfg.basicKey;
const auth = (appKey && `App ${appKey}`) || (basicKey && `Basic ${basicKey}`);

/**
 * Send SMS.
 */
export function sendSMS(to, text) {
  const simulate = `${cfg.simulate}` || "";
  if ('yestrue'.indexOf(simulate.toLowerCase()) >= 0) {
    return;
  }

  return request({
    url: 'https://api.infobip.com/sms/1/text/single',
    headers: {
      Authorization: auth
    },
    json: true,
    method: 'POST',
    body: {
      from: cfg.sender,
      text,
      to
    }
  });
}
