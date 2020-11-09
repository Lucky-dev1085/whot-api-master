# node-module-feathers-sequelize

Mounts a CRUD service for each defined model.

## Extending Models

This feature is useful when the application needs to make customisations to models provided by installed modules. In this case, a new model can be added to the application, which extends the model provided by the module, using something like:

```js

// extend model "user" defined in module "feathers-auth"
// in this example we add a new field

const { ExtendModel } = reqlib('_/modules/feathers-sequelize/decorators');
const BaseUserLoader = reqlib('_/modules/feathers-auth/models/sequelize/user');

module.exports = function(sequelize, DataTypes) {
  @ExtendModel(sequelize, 'user', {
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  })
  class User extends BaseUserLoader(sequelize, DataTypes) {
  }

  return User;
};
```
