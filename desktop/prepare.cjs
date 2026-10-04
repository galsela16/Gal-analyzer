const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(__dirname, 'web');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const file of ['index.html','app.js','js','recorder-worklet.js','icons','branding','manifest.webmanifest']) {
  fs.cpSync(path.join(root, file), path.join(out, file), { recursive: true });
}
// Desktop packaging is a generated copy. Web sources stay shared and unchanged.
for (const file of ['index.html', 'app.js', 'js/core/config.js', 'js/app-core.js']) {
  const target = path.join(out,file);
  let content = fs.readFileSync(target,'utf8').replaceAll('5.7.18','6.0.0-preview.4');
  if (file === 'js/app-core.js') content = content.replace("if('serviceWorker' in navigator){", "if(false){ // Desktop updates ship in the bundle, not a hosted service worker.");
  fs.writeFileSync(target, content);
}
console.log('Prepared shared web interface for desktop.');
