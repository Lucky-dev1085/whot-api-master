'use strict';

/**
 * Format an e-mail address from our standard format to AWS/SES format.
 *
 * The input 'email' parameter can be one of:
 *  - {addr: 'recipient@example.com', name: 'Recipient Name'}
 *  - {addr: 'recipient@example.com'}
 *  - recipient@example.com
 */
exports.formatEmail = function(email) {
  if (email.name) {
    return `${email.name} <${email.addr}>`;
  }
  else {
    return email.addr || email;
  }
};
