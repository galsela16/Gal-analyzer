import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const html=readFileSync('index.html','utf8');
const config=readFileSync('js/core/config.js','utf8');
const worker=readFileSync('sw.js','utf8');

assert(html.includes('V5.7 — professional measurement UI'));
assert(config.includes("version:'5.7.6-studio-plugin-console'"));
assert(worker.includes('v5-7-6-studio-plugin'));
assert(html.includes('body:not(.sun-mode) #targetMeasurementPanel{position:fixed}'));
assert(!html.includes('.tlsCard,body:not(.sun-mode) #targetMeasurementPanel{position:relative}'));
assert(html.includes('--rack-blue:#35a9ff')&&html.includes('--rack-amber:#f0bd62'));
assert(html.includes('repeating-linear-gradient(90deg'),'Rack surfaces must include a restrained metal grain');
assert(html.includes('body:not(.sun-mode) #v53AnalysisGroup button.on'),'Active analyzer mode must use the illuminated hardware state');
assert(html.includes('body:not(.sun-mode) .meterFill'),'Meters must use the studio hardware palette');
assert(html.includes('body:not(.sun-mode) .measureDock'),'Measurement docks must share the rack finish');

assert(html.includes('--pro-cyan:#42c9e8'),'Professional palette is missing');
assert(html.includes('body:not(.sun-mode) #tfWorkflowSteps .toggle'),'TF workflow controls must share the professional instrument finish');
assert(!html.includes('id="targetCommandBar"'),'Duplicate bottom command surface must stay removed');
assert(html.includes('--rack-brush:repeating-linear-gradient')&&html.includes('--rack-satin:radial-gradient'),'Rack shell must use clean fine brushing and controlled satin highlights');
assert(!html.includes('--rack-grain:url("data:image/svg+xml')&&!html.includes('--rack-wear:'),'Distressed noise and grime must remain removed');
assert(html.includes('body:not(.sun-mode) .tlsCard')&&html.includes('body:not(.sun-mode) #uiRightTools button'),'Grain must cover panels and controls');
assert(html.includes('#v53AnalysisGroup{width:100%!important;max-width:none!important;height:44px!important;padding:0!important;gap:5px!important;border:0!important'),'Analysis buttons must not sit inside a decorative frame');
assert(html.includes('#v5ModeTabs{height:58px!important;padding:6px 8px!important;background:#071016!important;border:0!important;box-shadow:none!important}'),'Analysis button gaps must match the canvas without a tinted toolbar');
assert(html.includes('V5.7.6 — premium studio-plugin detailing'),'Studio-plugin detail layer must be present');
assert(html.includes('#1595e8 0 46%')&&html.includes('#3bd576 82%'),'Input meters must use the reference-inspired blue-to-green palette');
assert(html.includes('radial-gradient(circle at 35% 30%,#b9c2c6'),'Rack panels must include restrained machined corner screws');
console.log('V5.7.6 studio-plugin professional console validation passed.');
