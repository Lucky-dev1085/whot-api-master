# node-module-feathers-auth

## Configuration

### Defaults

```
{
  "path": "/auth",
  "successRedirectUrl": "",
  "failureRedirectUrl": "",
  "passportModel": "passport",
  "userModel": "user",
  "tokenModel": "token",
  "jwt": {
    "expiresIn": "1y"
  },
  "cookie": false,
  "providers": {
    "local": {}
  }
}
```

### Facebook Authentication Example

```
{
  "providers": {
    "facebook": {
      "clientID": "...",
      "clientSecret": "...",
      "scope": [
        "email"
      ],
      "profileFields": [
        "id",
        "name",
        "email",
        "picture.type(square)"
      ],
      "strategy": {
        "name": "passport-facebook",
        "key": "Strategy"
      },
      "protocol": "oauth2"
    },
    "facebook-token": {
      "inheritFrom": "facebook",
      "strategy": "passport-facebook-token"
    }
  }
}
```
