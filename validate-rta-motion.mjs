import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const core=readFileSync('js/app-core.js','utf8');
const start=core.indexOf('function smoothRtaVisualDb('),end=core.indexOf('\nfunction heat(',start);
const smooth=runInNewContext(core.slice(start,end)+';smoothRtaVisualDb');
assert.equal(smooth(NaN,-42,1/60,80,420),-42,'First frame must have no artificial fade from silence');
assert.equal(smooth(-42,-30,0,80,420),-42,'A zero-length frame cannot change the display');
function trajectory(fps,frequency,signal,duration=2){let value=signal(0),samples=[];for(let frame=1;frame<=duration*fps;frame++){value=smooth(value,signal(frame/fps),1/fps,frequency,420);samples.push(value);}return samples;}
const spread=a=>Math.max(...a)-Math.min(...a);
for(const fps of [30,60,120]){
 const input=t=>-45+2*Math.sin(2*Math.PI*8*t);
 const out=trajectory(fps,80,input).slice(fps);
 assert.ok(spread(out)<1.3,`${fps} Hz display must attenuate small rapid level fluctuations`);
 // Test a real step from an existing level.
 let value=-45;for(let i=0;i<Math.round(.2*fps);i++)value=smooth(value,-25,1/fps,80,420);
 assert.ok(value>-28.5,`${fps} Hz display must follow a 20 dB increase within 200 ms`);
 let down=-25;for(let i=0;i<fps;i++)down=smooth(down,-100,1/fps,80,420);
 assert.ok(down<-99,`${fps} Hz display must settle after signal stops`);
 console.log(`${fps} Hz: jitter range ${spread(out).toFixed(2)} dB; 200 ms step ${value.toFixed(2)} dB; silence ${down.toFixed(2)} dB`);
}
const step=t=>t<.3?-45:-30;
const ends=[30,60,120].map(fps=>trajectory(fps,80,step,1).at(-1));
assert.ok(spread(ends)<.15,'Display response must be consistent across refresh rates');
const low=trajectory(60,40,t=>-45+2*Math.sin(2*Math.PI*8*t)).slice(60);
const high=trajectory(60,5000,t=>-45+2*Math.sin(2*Math.PI*8*t)).slice(60);
assert.ok(spread(low)<spread(high),'Low-frequency bins need more jitter suppression');
assert.ok(core.includes('lastBandDb[b]=displayDb;')&&core.includes('lastV[b]=v;'),'Measured levels remain separate from presentation ballistics');
assert.ok(core.includes('if(!frozen||!Number.isFinite(rtaVisualDb[b]))'),'Frozen bars must stay still');
assert.ok(core.includes('peaks[b]-dt*.15'),'Peak-marker decay must use elapsed time');
console.log('RTA motion validation passed.');
