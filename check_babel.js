const fs = require('fs');
const babel = require('/home/nwasim/projects/ddn-kv-cache/frontend/node_modules/@babel/parser');

const files = [
  '/home/nwasim/projects/ddn-kv-cache/frontend/src/pages/About.tsx',
  '/home/nwasim/projects/ddn-kv-cache/frontend/src/pages/ChatObservatory.tsx',
];

for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  try {
    babel.parse(c, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
    console.log('CLEAN:', f.split('/').pop());
  } catch(e) {
    console.log('ERROR:', f.split('/').pop(), 'line', e.loc && e.loc.line, '-', e.message.split('\n')[0]);
  }
}
