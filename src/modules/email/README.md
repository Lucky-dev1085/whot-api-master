# node-module-email

This is a "virtual" module providing a common interface for sending e-mails through various providers, which are implemented in separate modules.

## Configuration

### Defaults

```json
{
  "simulate": false,
  "from": {
    "addr": "sender@example.com",
    "name": "Sender Name"
  },
  "providers": [],
  "defaultProvider": ""
}
```

If no `defaultProvider` specified, it will default to first entry in `providers` array.

## Sending Emails

```js
const { sendEmail } = reqlib('_/modules/email');

sendEmail(
const sendOptions = {
  provider: '...', // optional, uses default provider if not defined
  to: {addr: 'recipient@example.com', name: 'Recipient Name'}, // or just to: 'recipient@example.com'
  // from: ... same as 'to' (optional, picked from configuration)
  subject: 'Subject',
  text: {name: 'text-template-name', data: {...}}, // or just text: 'text version'
  html: {name: 'html-template-name', data: {...}} // or just html: '<b>html</b> version'
  // ... any other provider specific options ...
};

sendEmail(sendOptions, 'some-provider')
  .then(function(providerResponse) { ... })
  .catch(function(error) { ... });
```
