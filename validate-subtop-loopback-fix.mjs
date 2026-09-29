import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const core=readFileSync('js/app-core.js','utf8');
const rootCore=readFileSync('app-core.js','utf8');
const html=readFileSync('index.html','utf8');
const recorder=readFileSync('recorder-worklet.js','utf8');

assert.equal(rootCore,core,'Both runtime core copies must match');
assert(html.includes('data-src="external-sweep"'),'External sweep must be selectable');
assert(core.includes("function isSweepSource(kind){return kind==='sweep'||kind==='external-sweep';}"));
assert(core.includes("function capturePhase(which,sourceKind='external')"));
assert(core.includes('tfSweepAcquiring=isSweepSource(sourceKind)'),'Sub/Top must retain bins visited by a sweep');
assert(core.includes('if(tfSweepAcquiring){')&&core.includes('tfPxx[k] += pxx'),'Sweep acquisition must accumulate rather than forget earlier frequencies');
assert(core.includes('let t=isSweepSource(sourceKind)?Math.max(5,Math.ceil(genSweepDur+1)):3'),'Sub/Top must capture the complete sweep');
assert(core.includes("const ratio=Math.pow(2,1/6), lo=xoverF/ratio, hi=xoverF*ratio"),'Sub/Top quality must be evaluated only around the crossover');
assert(core.includes('sourceKind!==subTopSourceKind'),'Sub and Top must use the same excitation type');
assert(recorder.includes('const c1 = loopback || input[this.refChannel] || null'),'Missing Reference must stay missing');
assert(recorder.includes('this.buffer.ref[this.pos] = c1 ? c1[i] : 0'),'Missing Reference must record silence instead of cloning MIC');
assert(core.includes('signalType:isSweepSource')===false);
assert(core.includes('isSweepSource(requestedSignal)'),'Delay sync must recognize an external sweep');

console.log('Sub/Top and loopback validation passed.');
