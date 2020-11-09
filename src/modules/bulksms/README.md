# node-module-bulksms

Send sms messages using https://bulksms.com/

## Configuration

### Defaults

```json
{
  "sender": "BULKSMS_SENDER",
  "authBasic": "BULKSMS_AUTH_BASIC",
  "simulate": "BULKSMS_SIMULATE"
}
```

### Example usage

```javascript
const { sendSMS } = reqlib('_/modules/bulksms/sms');
const result = await sendSMS('+40720123456', 'Test Pass');

```
