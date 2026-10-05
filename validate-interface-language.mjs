import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const files=['index.html','app.js','js/app-core.js','js/core/diagnostics.js','manifest.webmanifest'];
for(const file of files){const text=await readFile(file,'utf8');assert.ok(!/[\u0590-\u05ff]/.test(text),`Hebrew remains in shipped interface source: ${file}`);}
const html=await readFile('index.html','utf8');
assert.ok(html.includes('<html lang="en" dir="ltr">'));
assert.ok(!/direction\s*:\s*rtl/.test(html));
const manifest=JSON.parse(await readFile('manifest.webmanifest','utf8'));
assert.equal(manifest.lang,'en');assert.equal(manifest.dir,'ltr');assert.equal(manifest.name,'GAL Analyzer');
for(const match of html.matchAll(/font-family\s*:\s*([^;{}]+)/g))assert.match(match[1],/^(?:Arial,sans-serif|inherit)(?:!important)?$/);
for(const match of html.matchAll(/\bfont\s*:\s*([^;{}]+)/g))assert.ok(match[1]==='inherit'||/Arial(?:,sans-serif)?(?:!important)?$/.test(match[1]),`Different CSS font: ${match[1]}`);
const core=await readFile('js/app-core.js','utf8');
const canvasFonts=[...core.matchAll(/\.font\s*=\s*['"]([^'"]+)['"]/g)];assert.ok(canvasFonts.length>30);
for(const match of canvasFonts)assert.match(match[1],/px Arial$/);
console.log('English interface, LTR layout, manifest and shared DOM/canvas typeface passed.');
