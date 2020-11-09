'use strict';

require('../');

const child_process = require('child_process');
const fs = require('fs');
const path = require('path');

// run `npm i` on all modules that have a package.json file:
const modulesDir = reqlib.resolveVirtualPath('_/modules');

if (!fs.existsSync(modulesDir)) {
  process.exit(0);
}

fs.readdirSync(modulesDir).forEach(function(module) {
  const modulePath = path.join(modulesDir, module);

  // skip dot directories:
  if (module.charAt(0) == '.') {
    return;
  }

  if (fs.existsSync(path.join(modulePath, 'package.json'))) {
    child_process.spawnSync('npm', ['i'], {
      env: process.env,
      cwd: modulePath,
      stdio: 'inherit'
    });
  }
});
