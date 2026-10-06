const {packager} = require('@electron/packager');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
(async()=>{
 const version=require('./package.json').version;
 const apps=await packager({dir:__dirname,out:path.join(__dirname,'build'),name:'GAL Analyzer',platform:'darwin',arch:'arm64',overwrite:true,
 extraResource:[path.join(__dirname,'build/native-audio/gal-audio-host')],appBundleId:'com.galanalyzer.desktop',appVersion:version,buildVersion:'13',asar:true,
 ignore:[/^\/build($|\/)/,/^\/tools($|\/)/,/^\/web-test/,/package-lock\.json/,/README\.md/],
 extendInfo:{NSMicrophoneUsageDescription:'GAL Analyzer uses your selected microphone or audio interface for local measurements. Audio stays on this Mac.'}});
 const app=path.join(apps[0],'GAL Analyzer.app');
 execFileSync('codesign',['--force','--deep','--sign','-',app],{stdio:'inherit'});
 execFileSync('codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});
 const archive=path.join(__dirname,'build',`GAL-Analyzer-Desktop-${version}-arm64.zip`);
 execFileSync('ditto',['-c','-k','--sequesterRsrc','--keepParent',app,archive]);
 console.log('Built:',archive);
})().catch(error=>{console.error(error);process.exit(1)});
