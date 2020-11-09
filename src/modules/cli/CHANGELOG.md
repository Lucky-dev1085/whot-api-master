# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 1.0.0 (2019-07-16)


### Bug Fixes

* breaking changes to older versions ([26b30f5](https://bitbucket.org/onsysol/node-seed-feathers/commit/26b30f5))
* check for case sensitive BREAKING CHANGES during module push ([aad1546](https://bitbucket.org/onsysol/node-seed-feathers/commit/aad1546))
* don't allow push if the module is behind upstream ([95a4978](https://bitbucket.org/onsysol/node-seed-feathers/commit/95a4978))
* get declared module version from git tags if no meta information is available ([218d392](https://bitbucket.org/onsysol/node-seed-feathers/commit/218d392))
* handle case where git describe fails ([c270e13](https://bitbucket.org/onsysol/node-seed-feathers/commit/c270e13))
* solve issue when testing for breaking changes in the output of standard-version ([e811567](https://bitbucket.org/onsysol/node-seed-feathers/commit/e811567))


### Features

* module-clone will now reclone already installed modules ([6c8dadb](https://bitbucket.org/onsysol/node-seed-feathers/commit/6c8dadb))
* use standard-version when pushing modules and automatically determine the new module version ([2a698d9](https://bitbucket.org/onsysol/node-seed-feathers/commit/2a698d9))
