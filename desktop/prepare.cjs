const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(__dirname, 'web');
const version = require('./release.cjs').version;
const webVersion = /version:'([^'-]+)/.exec(fs.readFileSync(path.join(root,'js/core/config.js'),'utf8'))[1];
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out,'privacy.html'),require('./privacy.cjs').html);
for (const file of ['index.html','app.js','js','recorder-worklet.js','icons','branding','manifest.webmanifest']) {
  fs.cpSync(path.join(root, file), path.join(out, file), { recursive: true });
}
for(const file of ['native-input.js','native-input-worklet.js']) fs.copyFileSync(path.join(__dirname,file),path.join(out,file));
// Resize the user-approved artwork without redrawing it. Shared web assets stay untouched.
for(const [file,size] of [['icon-192.png',192],['icon-512.png',512],['icon-512-maskable.png',512]]) {
  execFileSync('sips',['-s','format','png','-z',String(size),String(size),path.join(__dirname,'assets/gal-analyzer-logo-final.jpeg'),'--out',path.join(out,'icons',file)],{stdio:'pipe'});
}
const html=path.join(out,'index.html');fs.writeFileSync(html,fs.readFileSync(html,'utf8').replace('<head>','<head><script src="native-input.js"></script>'));
// Desktop packaging is a generated copy. Web sources stay shared and unchanged.
for (const file of ['index.html', 'app.js', 'js/core/config.js', 'js/app-core.js']) {
  const target = path.join(out,file);
  let content = fs.readFileSync(target,'utf8').replaceAll(webVersion,version);
  if (file === 'js/app-core.js') content = content.replace("if('serviceWorker' in navigator){", "if(false){ // Desktop updates ship in the bundle, not a hosted service worker.");
  fs.writeFileSync(target, content);
}
console.log('Prepared shared web interface for desktop.');
