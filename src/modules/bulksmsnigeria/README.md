# node-module-bulksmsnigeria

Send sms messages using https://bulksmsnigeria.com/

## Configuration

### Defaults

```json
{
    "sender": "BULKSMSNG_SENDER",
    "accessKey": "BULKSMSNG_ACCESS_KEY",
    "simulate": "BULKSMSNG_SIMULATE"
    "dndOption": "BULKSMSNG_DND_OPTION"
}
```

### Example usage

```javascript
const { sendSMS } = reqlib('_/modules/bulksmsnigeria');
const result = await sendSMS('+40720123456', 'Test Pass');

```
