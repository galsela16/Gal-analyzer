import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const core=readFileSync('js/app-core.js','utf8');

assert(core.includes("source.channelInterpretation = 'discrete'"),'Media input must not use speaker-style mono up-mixing');
assert(core.includes("splitter.channelInterpretation = 'discrete'"),'Channel splitter must preserve independent interface channels');
assert(core.includes('chReceived = Number(settings.channelCount) || 1'),'Missing browser channel metadata must not invent stereo');
assert(core.includes('analyserRef = audioCtx.createAnalyser()'),'Reference analyser must remain available when an interface under-reports channelCount');
assert(core.includes('splitter.connect(analyserRef, refChannel)'),'Reference analyser must follow the selected discrete input');
assert(core.includes('splitter.connect(analyserMeter, measChannel)'),'Main meter must follow the selected measurement channel');
assert(!core.includes('source.connect(analyserMeter)'),'Main meter must not down-mix the complete input stream');

console.log('Discrete input routing validation passed.');
