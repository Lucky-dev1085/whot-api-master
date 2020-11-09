# node-module-numverify
Verify the validity of a phone number - https://numverify.com/

## Configuration

### Defaults

```json
{
  "accessKey": "NUMVERIFY_ACCESS_KEY",
  "simulate": "NUMVERIFY_SIMULATE"
}
```

### Example usage

```javascript
const { validateNumber } = reqlib('_/modules/numverify');
const result = await validateNumber('720123456', 'RO');

{
  "valid":true,
  "number":"40720123456",
  "local_format":"0720123456",
  "international_format":"+40720123456",
  "country_prefix":"+40",
  "country_code":"RO",
  "country_name":"Romania",
  "location":"",
  "carrier":"Vodafone Romania SA",
  "line_type":"mobile"
}
```
