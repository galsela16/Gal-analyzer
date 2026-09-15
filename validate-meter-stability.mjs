import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const core=readFileSync('js/app-core.js','utf8');
const rootCore=readFileSync('app-core.js','utf8');
const html=readFileSync('index.html','utf8');

assert.equal(rootCore,core,'Both runtime core copies must match');
assert(core.includes('1-Math.exp(-dt/tau)'),'Main meter smoothing must be time based');
assert(core.includes('if(now-meterTextAt>=100)'),'Main numeric meter must have a stable refresh interval');
assert(core.includes('if(now-v52MeterPaintAt<50)return'),'I/O meters must paint at a bounded rate');
assert(core.includes("noSignal=db<=-110")&&core.includes("'NO SIG'"),'Silent reference input must have a stable no-signal state');
assert(!html.includes('transition:width 0.08s ease-out'),'Main meter must not combine CSS and signal smoothing');
assert(!html.includes('transition:width .045s linear'),'I/O meters must not restart a CSS animation every audio frame');

console.log('Meter stability validation passed: time-based ballistics, bounded paint rate and no-signal state.');
