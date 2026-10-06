const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(__dirname, 'web');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const file of ['index.html','app.js','js','recorder-worklet.js','icons','branding','manifest.webmanifest']) {
  fs.cpSync(path.join(root, file), path.join(out, file), { recursive: true });
}
for(const file of ['native-input.js','native-input-worklet.js']) fs.copyFileSync(path.join(__dirname,file),path.join(out,file));
const html=path.join(out,'index.html');fs.writeFileSync(html,fs.readFileSync(html,'utf8').replace('<head>','<head><script src="native-input.js"></script>'));
// Desktop packaging is a generated copy. Web sources stay shared and unchanged.
for (const file of ['index.html', 'app.js', 'js/core/config.js', 'js/app-core.js']) {
  const target = path.join(out,file);
  let content = fs.readFileSync(target,'utf8').replaceAll('5.7.26','6.0.0-preview.12');
  if (file === 'js/app-core.js') content = content.replace("if('serviceWorker' in navigator){", "if(false){ // Desktop updates ship in the bundle, not a hosted service worker.");
  fs.writeFileSync(target, content);
}
console.log('Prepared shared web interface for desktop.');
