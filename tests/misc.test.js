/* eslint arrow-body-style: ["off"] */
/* eslint global-require: ["off"] */

'use strict';
require(require('app-root-path') + '/bootstrap');

const { assert } = require('chai');
const bulksms = reqlib('_/modules/bulksms/sms');
const bulksmsng = reqlib('_/modules/bulksmsnigeria');
const { validateNumber } = reqlib('_/modules/numverify');

describe('Checking API statuses', function () {
  it.skip('Numverify API', async function () {
    const result = await validateNumber('720934473', 'RO');

    assert.exists(result);
    console.log(`${JSON.stringify(result)}`);
    assert.isOk(result.valid);
    assert.equal(result.number, '40720934473');
    assert.equal(result.local_format, '0720934473');
    assert.equal(result.international_format, '+40720934473');
  });
  
  it.skip('BulkSMSNigeria API', async function () {
    const result = await bulksmsng.sendSMS('+40720934473', 'Test Pass');
    
    assert.exists(result);
  });
});
