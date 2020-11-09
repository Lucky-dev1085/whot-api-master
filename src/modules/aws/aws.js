'use strict';

const aws = require('aws-sdk');
const cfg = require('./cfg');

aws.config.update({
  accessKeyId: cfg.accessKeyId,
  secretAccessKey: cfg.secretAccessKey,
  ...cfg.region && {region: cfg.region}
});

if (cfg.region) {
  aws.config.update({region: cfg.region});
}

module.exports = aws;
