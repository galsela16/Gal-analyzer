const {packager} = require('@electron/packager');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
(async()=>{
 const {version,options}=require('./release.cjs');
 const apps=await packager(options('darwin',''));
 const app=path.join(apps[0],'GAL Analyzer.app');
 execFileSync('codesign',['--force','--deep','--sign','-',app],{stdio:'inherit'});
 execFileSync('codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});
 const archive=path.join(__dirname,'build',`GAL-Analyzer-Desktop-${version}-arm64.zip`);
 execFileSync('ditto',['-c','-k','--sequesterRsrc','--keepParent',app,archive]);
 console.log('Built:',archive);
})().catch(error=>{console.error(error);process.exit(1)});
