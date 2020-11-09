'use strict';
const cfg = require('./cfg');
const request = require('request-promise-native');

const accessKey = cfg.accessKey;

export function validateNumber(number, countryCode) {
  const simulate = `${cfg.simulate}` || "";
  if ('yestrue'.indexOf(simulate.toLowerCase()) >= 0) {
    return;
  }

  return request({
    url: `http://apilayer.net/api/validate`,
    method: 'GET',
    json: true,
    qs: {
      access_key: accessKey,
      number: number,
      country_code: countryCode || cfg.countryCode,
      format: "1",
    },
    headers: {
      Accept: 'application/json'
    },
  });
}
