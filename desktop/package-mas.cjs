const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const release = require('./release.cjs');
const distribution = process.argv.includes('--distribution');
const assembleOnly = process.argv.includes('--assemble-only');
const identity = process.env.GAL_MAS_IDENTITY;
const profile = process.env.GAL_MAS_PROFILE;
const team = process.env.GAL_MAS_TEAM;
const installerIdentity = process.env.GAL_MAS_INSTALLER_IDENTITY;
function readPlist(file, input) {
  return JSON.parse(execFileSync('plutil',['-convert','json','-o','-','--',file],{input,encoding:'utf8'}));
}
function signingProblems(identities) {
  const errors=[];
  const prefix=distribution?'Apple Distribution:':'Apple Development:';
  if (!identity || !identity.startsWith(prefix) || !identities.includes(identity)) errors.push(`GAL_MAS_IDENTITY must name an installed ${prefix} certificate.`);
  if (!team || !/^[A-Z0-9]{10}$/.test(team)) errors.push('GAL_MAS_TEAM must contain your 10-character Team ID.');
  if (!profile || !fs.existsSync(profile)) errors.push('GAL_MAS_PROFILE must point to a matching provisioning profile.');
  else {
    try {
      const data=readPlist('-',execFileSync('security',['cms','-D','-i',profile]));
      const entitlements=data.Entitlements||{};
      const expiry=new Date(data.ExpirationDate).getTime();
      if (!Number.isFinite(expiry) || expiry<=Date.now()) errors.push('Provisioning profile is expired or has no valid expiration date.');
      if (!data.TeamIdentifier?.includes(team)) errors.push('Provisioning profile does not match GAL_MAS_TEAM.');
      if (entitlements['com.apple.application-identifier']!==`${team}.${release.bundleId}`) errors.push(`Provisioning profile must match ${release.bundleId}.`);
      if (distribution ? Boolean(data.ProvisionedDevices) : !data.ProvisionedDevices?.length) errors.push('Provisioning profile has the wrong development/distribution type.');
      if (data.ProvisionsAllDevices) errors.push('A Developer ID profile cannot be used for the Mac App Store.');
    } catch { errors.push('Provisioning profile could not be decoded.'); }
  }
  if (distribution && (!installerIdentity || !installerIdentity.startsWith('3rd Party Mac Developer Installer:') || !identities.includes(installerIdentity))) errors.push('GAL_MAS_INSTALLER_IDENTITY must name an installed Mac Installer Distribution certificate.');
  return errors;
}
async function main() {
  const identities=execFileSync('security',['find-identity','-v'],{encoding:'utf8'});
  const problems=signingProblems(identities);
  if (process.argv.includes('--check')) {
    console.log(JSON.stringify({target:'Apple Silicon / Electron MAS',version:release.version,
      bundleVersion:release.appVersion,build:release.buildVersion,mode:distribution?'distribution':'development',
      signedBuildReady:problems.length===0,blockers:problems},null,2));
    return;
  }
  if (!assembleOnly && problems.length) throw Error(problems.join('\n'));
  for (const script of ['build-native.cjs','build-icon.cjs','prepare.cjs']) execFileSync(process.execPath,[path.join(__dirname,script)],{stdio:'inherit'});
  const {packager}=require('@electron/packager');
  const opts=release.options('mas',assembleOnly?'mas-unsigned':distribution?'mas-distribution':'mas-development');
  opts.osxSign=false;
  if (!assembleOnly) opts.extendInfo.ElectronTeamID=team;
  const [output]=await packager(opts);
  const app=path.join(output,'GAL Analyzer.app');
  const info=readPlist(path.join(app,'Contents/Info.plist'));
  if (info.CFBundleShortVersionString!==release.appVersion || String(info.CFBundleVersion)!==release.buildVersion) throw Error('Packaged store version does not match release configuration.');
  for (const binary of ['Contents/MacOS/GAL Analyzer','Contents/Resources/gal-audio-host']) {
    const arch=execFileSync('lipo',['-archs',path.join(app,binary)],{encoding:'utf8'}).trim();
    if (arch!=='arm64') throw Error(`${binary} is not exclusively Apple Silicon: ${arch}`);
  }
  if (assembleOnly) {
    console.log('Assembled unsigned Apple Silicon MAS bundle:',app);
    console.log('NOT runnable sandbox validation and NOT ready for submission. Apple signing and hardware tests remain required.');
    return;
  }
  const {sign,flat}=await import('@electron/osx-sign');
  await sign({app,platform:'mas',type:distribution?'distribution':'development',identity,
    provisioningProfile:profile,
    binaries:[path.join(app,'Contents/Resources/gal-audio-host')],
    optionsForFile:file=>({entitlements:path.join(__dirname,'mas',file===app?'parent.plist':'child.plist')})
  });
  execFileSync('codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});
  if (distribution) {
    const pkg=path.join(path.dirname(output),`GAL-Analyzer-${release.appVersion}-${release.buildVersion}-MAS.pkg`);
    await flat({app,platform:'mas',identity:installerIdentity,pkg});
    execFileSync('pkgutil',['--check-signature',pkg],{stdio:'inherit'});
    console.log('Store package:',pkg);
  } else console.log('Signed development app:',app);
  console.log('Hardware/sandbox acceptance is required before submission. This command does not publish to Apple.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
