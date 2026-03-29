const https = require('https');
https.get('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyBGOD6aYW_Hu3032-cqjgxqehzncaR2eSM', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.parse(data).models?.map(m => m.name).join('\n')));
});
