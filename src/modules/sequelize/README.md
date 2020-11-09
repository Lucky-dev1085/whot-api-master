# node-module-sequelize

[Sequelize](http://sequelizejs.com) integration.

## Configuration

### Defaults

```
{
  "url": "DATABASE_URL",
  "logging": true,
  "charset": "utf8mb4"
}
```

## Loading Models

This module loads models from:

  1. The application, by looking into `_/models/sequelize/`
  2. The installed modules, by looking into `_/modules/*/models/sequelize/`

In case a model defined in the application and another defined in a module have the same name, only the model defined in the application is loaded.
