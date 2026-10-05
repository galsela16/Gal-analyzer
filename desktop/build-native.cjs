const {execFileSync}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');
const dir=path.join(__dirname,'native-audio'),out=path.join(__dirname,'build','native-audio');
fs.mkdirSync(out,{recursive:true});
execFileSync('clang++',['-target','arm64-apple-macosx13.0','-std=c++17','-O2','-Wall','-Wextra','-Werror','-c',path.join(dir,'CaptureRing.cpp'),'-o',path.join(out,'ring.o')],{stdio:'inherit'});
execFileSync('clang++',['-std=c++17','-O2',path.join(dir,'RingTest.cpp'),path.join(out,'ring.o'),'-framework','AudioToolbox','-o',path.join(out,'ring-test')],{stdio:'inherit'});
execFileSync(path.join(out,'ring-test'),[],{stdio:'inherit'});
execFileSync('swiftc',['-target','arm64-apple-macosx13.0','-module-cache-path',path.join(out,'module-cache'),'-swift-version','5','-O','-import-objc-header',path.join(dir,'CaptureRing.h'),path.join(dir,'AudioHost.swift'),path.join(out,'ring.o'),'-Xlinker','-lc++','-Xlinker','-sectcreate','-Xlinker','__TEXT','-Xlinker','__info_plist','-Xlinker',path.join(dir,'helper.plist'),'-o',path.join(out,'gal-audio-host')],{stdio:'inherit'});
execFileSync('codesign',['--force','--sign','-',path.join(out,'gal-audio-host')],{stdio:'inherit'});
