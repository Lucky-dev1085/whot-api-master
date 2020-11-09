'use strict';

require(require('app-root-path') + '/bootstrap');
reqlib('_/modules/feathers');

const models = reqlib('_/models');
const playerDetailModel = models['player_detail'];
playerDetailModel.middleware(app);

// start listening:
const host = config.host || '127.0.0.1';
const port = config.port || 3000;
app.listen(port, host, async function() {
  console.log('Listening on %s:%s', host, port);
  console.log('Memory usage:', Math.round(process.memoryUsage().rss / (1024*1024)));
  //console.log('Config:', JSON.stringify(config, null, 4));
});
