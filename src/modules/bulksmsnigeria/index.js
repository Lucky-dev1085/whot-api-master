'use strict';
const cfg = require('./cfg');
const request = require('request-promise-native');

const accessKey = cfg.accessKey;

export function sendSMS(to, text) {
  const simulate = `${cfg.simulate}` || "";
  if ('yestrue'.indexOf(simulate.toLowerCase()) >= 0) {
    return;
  }

  return request({
    url: `https://www.bulksmsnigeria.com/api/v1/sms/create`,
    method: 'GET',
    json: true,
    qs: {
      api_token: accessKey,
      from: cfg.sender,
      to: to,
      body: text,
      dnd: (cfg.dndOption && cfg.dndOption !== 'BULKSMSNG_DND_OPTION') ? cfg.dndOption: 1,
    },
    headers: {
      Accept: 'application/json'
    },
  });
}
