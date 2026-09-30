import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const html=readFileSync('index.html','utf8');
const config=readFileSync('js/core/config.js','utf8');
const worker=readFileSync('sw.js','utf8');

assert(html.includes('V5.6.1 — premium studio rack finish'));
assert(config.includes("version:'5.6.1-premium-rack'"));
assert(worker.includes('v5-6-1-premium-rack'));
assert(html.includes('body:not(.sun-mode) #targetMeasurementPanel{position:fixed}'));
assert(!html.includes('.tlsCard,body:not(.sun-mode) #targetMeasurementPanel{position:relative}'));
assert(html.includes('--rack-blue:#35a9ff')&&html.includes('--rack-amber:#f0bd62'));
assert(html.includes('repeating-linear-gradient(90deg'),'Rack surfaces must include a restrained metal grain');
assert(html.includes('body:not(.sun-mode) #v53AnalysisGroup button.on'),'Active analyzer mode must use the illuminated hardware state');
assert(html.includes('body:not(.sun-mode) .meterFill'),'Meters must use the studio hardware palette');
assert(html.includes('body:not(.sun-mode) .measureDock'),'Measurement docks must share the rack finish');

console.log('V5.6.1 premium rack theme and right rail validation passed.');
