const {spawn,execFile}=require('node:child_process');
const {promisify}=require('node:util');const path=require('node:path');const {randomUUID}=require('node:crypto');
class NativeHost {
 constructor({app,send,testing}){this.file=app.isPackaged?path.join(process.resourcesPath,'gal-audio-host'):path.join(__dirname,'build/native-audio/gal-audio-host');this.send=send;this.testing=testing;this.capture=null;}
 async list(){const {stdout}=await promisify(execFile)(this.file,['--list'],{timeout:5000,maxBuffer:1024*1024});return JSON.parse(stdout);}
 async stop(){
  const capture=this.capture;this.capture=null;if(!capture)return;
  capture.stopping=true;clearInterval(capture.watchdog);capture.child.kill('SIGTERM');
  await Promise.race([new Promise(resolve=>capture.child.once('close',resolve)),new Promise(resolve=>setTimeout(()=>{capture.child.kill('SIGKILL');resolve();},700))]);
 }
 async start({uid,sampleRate}){
  if(typeof uid!=='string'||uid.length>512||!Number.isFinite(sampleRate)||sampleRate<40000||sampleRate>192000)throw Error('Invalid native capture configuration.');
  await this.stop();
  if(!this.testing && uid && !(await this.list()).some(d=>d.uid===uid))throw Error('The selected audio interface is disconnected. Refresh inputs.');
  const id=randomUUID();
  const child=spawn(this.file,[this.testing?'--test-stream':'--capture',uid,String(sampleRate)],{stdio:['pipe','pipe','pipe']});
  const capture={child,id,stopping:false,lastPacket:Date.now(),watchdog:null};this.capture=capture;
  return new Promise((resolve,reject)=>{
   let ready=null,buffer=Buffer.alloc(0),stderr='',sequence=-1,settled=false;
   const fail=message=>{
    if(capture.stopping)return;
    if(!settled){settled=true;reject(Error(message));}
    this.send('gal:native:ended',{id,message});capture.stopping=true;
    clearInterval(capture.watchdog);child.kill('SIGTERM');if(this.capture===capture)this.capture=null;
   };
   child.on('error',error=>fail(error.message));
   child.stderr.on('data',data=>{
    stderr+=data.toString();if(stderr.length>65536)return fail('Native audio diagnostic overflow.');
    let end;
    while((end=stderr.indexOf('\n'))>=0){const line=stderr.slice(0,end);stderr=stderr.slice(end+1);let event;try{event=JSON.parse(line)}catch{continue;}
     if(event.type==='error')fail(event.message);
     if(event.type==='ready'){
      if(event.channels<1||event.channels>32||event.sampleRate!==sampleRate)return fail('Invalid native input format.');
      ready=event;settled=true;resolve({...event,id});
     }
    }
   });
   child.stdout.on('data',data=>{
    capture.lastPacket=Date.now();buffer=Buffer.concat([buffer,data]);
    if(buffer.length>4*1024*1024)return fail('Native audio transport overloaded.');
    while(buffer.length>=20){
     if(buffer.readUInt32LE(0)!==0x504c4147)return fail('Native PCM framing error.');
     const channels=buffer.readUInt32LE(4),frames=buffer.readUInt32LE(8),rate=buffer.readUInt32LE(12),number=buffer.readUInt32LE(16);
     if(channels<1||channels>32||frames<1||frames>16384||rate!==sampleRate)return fail('Native PCM format error.');
     const length=20+channels*frames*4;if(buffer.length<length)break;
     if(sequence>=0 && number!==((sequence+1)>>>0))return fail('Native audio discontinuity. Restart audio.');
     if(ready && channels!==ready.channels)return fail('Native channel count changed. Restart audio.');
     sequence=number;
     this.send('gal:native:packet',{id,channels,frames,sampleRate:rate,sequence:number,pcm:Uint8Array.from(buffer.subarray(20,length))});buffer=buffer.subarray(length);
    }
   });
   child.on('close',(code)=>{clearInterval(capture.watchdog);if(!capture.stopping)fail(`Native audio input stopped (${code}). Refresh inputs and start again.`);});
   capture.watchdog=setInterval(()=>{if(Date.now()-capture.lastPacket> (ready?3000:12000))fail('Native audio input stopped responding. Restart audio.');},500);
  });
 }
}
module.exports={NativeHost};
