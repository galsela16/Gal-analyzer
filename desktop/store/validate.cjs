const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const listing=JSON.parse(fs.readFileSync(path.join(__dirname,'listing.en-US.json'),'utf8'));
const release=require('../release.cjs');
const chars=s=>Array.from(s).length;
const checkText=(key,min,max)=>assert(typeof listing[key]==='string'&&chars(listing[key])>=min&&chars(listing[key])<=max,key+' exceeds its character limit');
checkText('name',2,30);checkText('subtitle',1,30);checkText('promotionalText',1,170);checkText('description',1,4000);
assert(Buffer.byteLength(listing.keywords)<=100,'Keywords exceed 100 bytes');
assert(listing.keywords.split(',').every(word=>chars(word)>2),'Keyword too short');
assert(Buffer.byteLength(listing.reviewNotes)<=4000,'Review notes exceed 4000 bytes');
assert.equal(listing.locale,'en-US');assert.equal(listing.preparedDesktopVersion,release.version);
assert.equal(String(listing.preparedBuild),release.buildVersion);assert.equal(listing.marketingVersion,release.appVersion);
assert.equal(listing.bundleId,release.bundleId);assert.equal(listing.signInRequired,false);
assert.equal(listing.primaryCategory,'MUSIC');assert.equal(listing.price,'Free');
for(const [key,file] of [['description','description.en-US.txt'],['promotionalText','promotional-text.en-US.txt'],['keywords','keywords.en-US.txt'],['reviewNotes','review-notes.en-US.txt']])
  assert.equal(fs.readFileSync(path.join(__dirname,file),'utf8'),listing[key]+'\n','Plain text differs: '+file);
for(const key of ['privacyPolicyURL','supportURL'])if(listing[key])assert(new URL(listing[key]).protocol==='https:',key+' must use HTTPS');
const privacy=require('../privacy.cjs').html;
assert(privacy.includes('dir="ltr"')&&privacy.includes('Audio processing'));
assert(!privacy.includes('<h2>The application is provided'),'Policy final paragraph incorrectly rendered as a heading');
let screenshots=0;
const option=process.argv.indexOf('--screenshots');
if(option>=0){
  assert(process.argv[option+1],'Missing screenshot directory');
  const dir=path.resolve(process.argv[option+1]);
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
  assert.equal(manifest.release,release.version);assert.equal(manifest.shots.length,5);
  assert.equal(manifest.tf.verified,true);assert(Math.abs(manifest.tf.delayMs-5)<.1);
  assert.equal(new Set(manifest.shots.map(s=>s.file)).size,5);
  for(const shot of manifest.shots){
    assert(/^[a-z0-9-]+\.jpg$/.test(shot.file),'Unsafe screenshot filename');
    assert.equal(shot.syntheticAudio,true);assert.equal(shot.finalSignedMas,false);
    const data=fs.readFileSync(path.join(dir,shot.file));assert.equal(data.readUInt16BE(0),0xffd8,'Not a JPEG');
    let dimensions;
    for(let offset=2;offset<data.length;){
      assert.equal(data[offset++],0xff,'Malformed JPEG marker');
      while(data[offset]===0xff)offset++;
      const marker=data[offset++];if(marker===0xd9||marker===0xda)break;
      const length=data.readUInt16BE(offset);assert(length>=2&&offset+length<=data.length);
      if([0xc0,0xc1,0xc2].includes(marker)){dimensions={height:data.readUInt16BE(offset+3),width:data.readUInt16BE(offset+5)};break;}
      offset+=length;
    }
    assert.deepEqual(dimensions,{width:1440,height:900},'Incorrect Mac screenshot size');screenshots++;
  }
}
console.log(JSON.stringify({preparedRelease:release.version,metadataLengths:{name:chars(listing.name),subtitle:chars(listing.subtitle),promotionalText:chars(listing.promotionalText),description:chars(listing.description),keywordBytes:Buffer.byteLength(listing.keywords),reviewNoteBytes:Buffer.byteLength(listing.reviewNotes)},screenshots,metadataValidated:true,readyToSubmit:false,pending:listing.ownerFieldsPending},null,2));
