'use strict';

const aws = require('./aws');
const cfg = require('./cfg');
const _ = require('lodash');

function _getRegion() {
  return _.get(cfg, 'services.s3.region', cfg.region);
}

/**
 * Create a presigned upload URL and payload, that allows the front end to
 * upload directly to S3.
 *
 * @param {String} bucket
 * @param {String} key The S3 key, may contain $uuid which will be substituted
 * @param {Object} options Additional options passed to createPresignedPost
 * @return {Object}
 */
exports.presignedUpload = function(bucket, key, options) {
  const client = new aws.S3();

  const result = client.createPresignedPost(_.merge(
    {
      Bucket: bucket,
      Fields: {
        key
      }
    },
    options
  ));

  //result.url = 'https://' + bucket + '.s3.amazonaws.com';

  return result;
};
