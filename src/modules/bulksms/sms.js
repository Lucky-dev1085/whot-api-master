const cfg = require('./cfg');
const request = require('request-promise-native');

const tokenId = cfg.tokenId;
const tokenSecret = cfg.tokenSecret;
const basicKey = cfg.authBasic;

const auth = (basicKey && `Basic ${basicKey}`);


export function sendSMS(to, text) {
  const simulate = `${cfg.simulate}` || "";
  if ('yestrue'.indexOf(simulate.toLowerCase()) >= 0) {
    return;
  }

  return request({
    url: 'https://api.bulksms.com/v1/messages',
    headers: {
      Authorization: auth
    },
    json: true,
    method: 'POST',
    body: {
      from: {
        type: 'ALPHANUMERIC',
        address: cfg.sender
      },
      to: to,
      body: text,
    }
  });  
}
