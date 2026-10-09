const path = require('node:path');
const pkg = require('./package.json');
const version = pkg.version;
const match = /^(\d+\.\d+\.\d+)(?:-[\w.-]+)?$/.exec(version);
if (!match || !/^\d+$/.test(String(pkg.galBuildNumber))) throw Error('Invalid desktop release version or build number.');
const appVersion = match[1];
const buildVersion = String(pkg.galBuildNumber);
const bundleId = 'com.galanalyzer.desktop';
function options(platform, output) {
  return {
    dir:__dirname, out:path.join(__dirname,'build',output), name:'GAL Analyzer',
    platform, arch:'arm64', overwrite:true, asar:true,
    appBundleId:bundleId, appVersion, buildVersion, appCategoryType:'public.app-category.music',
    icon:path.join(__dirname,'build/GAL Analyzer.icns'),
    extraResource:[path.join(__dirname,'build/native-audio/gal-audio-host')],
    ignore:[/^\/build($|\/)/, /^\/tools($|\/)/, /^\/web-test/, /^\/mas($|\/)/,
      /^\/store($|\/)/, /^\/\.env/, /package-lock\.json/, /README\.md/, /\.(?:provisionprofile|mobileprovision|p12|pem|key|csr|cer)$/],
    extendInfo:{LSMinimumSystemVersion:'13.0',NSMicrophoneUsageDescription:'GAL Analyzer uses your selected microphone or audio interface for local measurements. Audio stays on this Mac.'}
  };
}
module.exports = {version, appVersion, buildVersion, bundleId, options};
