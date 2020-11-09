'use strict';
  
module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [
    ],
    update: [],
    patch: [],
    remove: []
  },
  after: {
    all: [],
    find: [],
    get: [],
    create: [
      async (context) => {
        if (context.result.message === 'Deposit registered') {
          // Paystack will fail webhook calls if the response status code != 200
          // Paystack will retry failed webhook calls every hour for a couple of days
          context.statusCode = 200;
        }
      }
    ],
    update: [],
    patch: [],
    remove: []
  },
  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
