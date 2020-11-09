# node-module-bootstrap

This module provides a common ground for all Node based seeds, which makes code sharing across apps and even different seeds possible. It is a required module for all seeds.

## Globals

The following globals are defined by this module:

### `rootdir`

This points to the top application directory.

### `basedir`

This is taken from `config.paths.basedir` and should point to the directory containing the entry script for the application. If not defined, it will default to the same value as `rootdir`.

It is used by `reqlib` (see below) as the base path to resolve all defined virtual paths.

### `config`

Configuration is loaded using the [config](https://www.npmjs.com/package/config) module. The location of the config directory is taken from `settings.configDir` in `package.json` or, if not set there, defaults to `${rootdir}/config`.

When loading the configuration, the following operations are applied to the data:

* All `${VARNAME}` placeholders are replaced by the value of the corresponding `VARNAME` environment variable
* Relative paths are expanded to absolute paths, using the config directory as reference
* Optimistic type casting is performed

#### Loading files

It's possible to load files into configuration. For `js` or `json` files, Node's `require` is used, while all others are loaded using `fs.readFileSync()`.

```json
{
  "myFile": "< /path/to/some/file"
}
```

Another example, this time using an environment variable to point to the file's location:

```json
{
  "cert": "< ${SSL_CERT}"
}
```

If, for example, the `SSL_CERT` env var was set to `../../ssl.pem`, we would try to load the file from `${configDir}/../../ssl.pem`.

### `reqlib`

This is an alternative to Node's `require` used to load modules from "virtual" paths. Virtual paths are defined in `package.json` under `settings.reqlib.paths` key, as a map from virtual to relative-to-basedir path.

We'll use the following configured paths (in `package.json`) for the examples that will follow.

```json
{
  "settings": {
    "reqlib": {
      "paths": {
        "_/modules": "modules",
        "_/utils": "../utils"
      }
    }
  }
}
```

Also, let's assume `paths.basedir` is set into configuration to `./src`.

Given the above configuration, the following is possible:

```js
// moduleA is loaded from ${basedir}/modules/moduleA/index.js
const moduleA = reqlib('_/modules/moduleA');

// someFunction is loaded from ${basedir}../utils/common.js
const { someFunction } = reqlib('_/utils/common');

// as a special case, even if not defined as virtual path, this will just return global.config:
const cfg = reqlib('_/config');
```

#### Why is this needed?

By providing `reqlib` we achieve the following goals:

* Modules work across different seeds because they can load other modules (or resources, like models, controllers, etc...) without needing to know exactly where they are located
* We fail gracefully in case loading fails (useful when modules try to load other modules as optional "plugins")
* Code refactoring is easier
