const fs = require('fs');
let code = fs.readFileSync('apps/api/test/virtual-trading.e2e-spec.ts', 'utf8');
code = code.replace("userToken = (res.headers['set-cookie'] as string[])[0].split(';')[0].split('=')[1];", "userToken = (Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'][0] : (res.headers['set-cookie'] || '') as string).split(';')[0].split('=')[1];");
code = code.replace("user2Token = (res.headers['set-cookie'] as string[])[0].split(';')[0].split('=')[1];", "user2Token = (Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'][0] : (res.headers['set-cookie'] || '') as string).split(';')[0].split('=')[1];");
fs.writeFileSync('apps/api/test/virtual-trading.e2e-spec.ts', code);
