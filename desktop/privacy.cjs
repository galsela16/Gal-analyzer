const fs = require('node:fs');
const path = require('node:path');
const detail=fs.readFileSync(path.join(__dirname,'PRIVACY.md'),'utf8');
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const sections=detail.trim().split(/\n\n/).slice(1).map(section=>{
  const [heading,...body]=section.split('\n');
  const isHeading=['Audio processing','Local storage and exports','Data collection and tracking','Support'].includes(heading);
  return isHeading&&body.length?`<section><h2>${escape(heading)}</h2><p>${escape(body.join(' '))}</p></section>`:`<p>${escape(section.replaceAll('\n',' '))}</p>`;
}).join('\n');
const html=`<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Privacy Policy — GAL Analyzer</title><style>
*{box-sizing:border-box}html{color-scheme:dark;background:#0d171d;color:#d8e6ec;font-family:Arial,sans-serif}body{margin:0;padding:30px}article{max-width:650px;margin:auto}h1{font-size:26px;margin:0 0 10px;color:#54ddea}h2{font-size:18px;margin:28px 0 10px;color:#d8e6ec}p{font-size:15px;line-height:1.7;overflow-wrap:anywhere;margin:12px 0}header{border-bottom:1px solid #29454f;padding-bottom:18px}.updated{color:#9bb4bf;font-size:13px}main{width:100%}@media(max-width:520px){body{padding:20px}h1{font-size:23px}}
</style></head><body><main><article><header><h1>Privacy Policy</h1><p>Your audio and measurements stay on this Mac.</p><p class="updated">GAL Analyzer · Updated October 9, 2026</p></header>${sections}</article></main></body></html>`;
module.exports=Object.freeze({title:'Privacy Policy',detail,html});
