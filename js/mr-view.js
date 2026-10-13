// Shared M/R presentation; consumes the existing calibrated, averaged band data.
window.GalMr={render(c,W,H,{cursorX=null,compact=false}={}){
 const left=compact?42:64,right=W-16,top=compact?34:48,bottom=H-24,width=right-left;
 if(width<40||bottom-top<70)return;
 const split=top+(bottom-top)*.64,gap=compact?24:34,deltaTop=split+gap,deltaBottom=bottom;
 const lo=ISO[0],hi=ISO[BANDS-1],x=f=>left+Math.log(f/lo)/Math.log(hi/lo)*width;
 const upperY=db=>split-(Math.max(floorDb,Math.min(ceilDb,db))-floorDb)/(ceilDb-floorDb)*(split-top);
 const deltaY=db=>deltaBottom-(Math.max(-24,Math.min(24,db))+24)/48*(deltaBottom-deltaTop);
 const text=sunMode?'#456373':'#9bb6c5',grid=sunMode?'#cbdce5':'#183846',mic=sunMode?'#0087b1':'#18daf4',ref=sunMode?'#b57300':'#ffb744';
 const hasRef=refChannel>=0&&!!analyserRef,hasSignal=hasRef&&rtaRefVisualDb.some(v=>v>floorDb);
 c.clearRect(0,0,W,H);c.fillStyle=sunMode?'#f8fafc':'#04141e';c.fillRect(0,0,W,H);c.font=(compact?'10':'11')+'px Arial';c.textAlign='left';
 c.fillStyle=mic;c.fillText('MIC '+(measChannel+1),left,16);c.fillStyle=ref;c.fillText(hasRef?'REF '+(refChannel+1):'REF not assigned',left+(compact?65:95),16);
 if(!compact){c.fillStyle=text;c.fillText('1/'+curBpo+' octave · dBFS',left,32);}
 const ticks=(compact?[20,100,1000,10000,20000]:[20,31.5,50,100,200,500,1000,2000,5000,10000,20000]).filter(f=>f>=lo&&f<=hi);
 c.strokeStyle=grid;c.lineWidth=1;
 for(const f of ticks){const px=x(f);for(const [a,b] of [[top,split],[deltaTop,deltaBottom]]){c.beginPath();c.moveTo(px,a);c.lineTo(px,b);c.stroke();}c.fillStyle=text;c.textAlign='center';c.fillText(f>=1000?(f/1000)+'k':String(f),px,H-7);}
 c.textAlign='right';const step=compact?20:10;
 for(let db=Math.ceil(floorDb/step)*step;db<=ceilDb;db+=step){const py=upperY(db);c.strokeStyle=grid;c.beginPath();c.moveTo(left,py);c.lineTo(right,py);c.stroke();c.fillStyle=text;c.fillText(db+'',left-8,py+3);}
 for(const db of [-24,0,24]){const py=deltaY(db);c.strokeStyle=db===0?(sunMode?'#6b8997':'#527b8a'):grid;c.beginPath();c.moveTo(left,py);c.lineTo(right,py);c.stroke();c.fillStyle=text;c.fillText((db>0?'+':'')+db,left-8,py+3);}
 const line=(values,color,y,dash=[])=>{c.save();c.setLineDash(dash);c.beginPath();c.rect(left,top,width,bottom-top);c.clip();c.beginPath();let pen=false;values.forEach((v,b)=>{if(!Number.isFinite(v)){pen=false;return;}const px=x(values.length===ISO.length?ISO[b]:lo*Math.pow(hi/lo,b/Math.max(1,values.length-1))),py=y(v);pen?c.lineTo(px,py):c.moveTo(px,py);pen=true;});c.strokeStyle=color;c.lineWidth=compact?1.5:2;c.lineJoin='round';c.stroke();c.restore();};
 line(rtaVisualDb,mic,upperY);if(hasRef)line(rtaRefVisualDb,ref,upperY);
 if(!compact&&typeof tfTraces!=='undefined')for(const t of tfTraces){if(t.visible===false||t.type==='tf'||!t.values)continue;line(t.values.map(v=>floorDb+v*(ceilDb-floorDb)),t.color,upperY,[5,4]);}
 if(!compact&&typeof tfTraces!=='undefined'){const visible=tfTraces.filter(t=>t.visible!==false&&t.type!=='tf'&&t.values);visible.slice(0,Math.max(1,Math.floor((width-150)/110))).forEach((t,i)=>{c.textAlign='left';c.fillStyle=t.color;c.fillText(t.name,left+150+i*110,32,100)});}
 c.textAlign='left';c.fillStyle=text;c.fillText(compact?'MIC − REF · dB':'MIC − REF · Level difference (not TF)',left,split+(compact?16:22));
 if(hasSignal)line(rtaVisualDb.map((v,b)=>v-rtaRefVisualDb[b]),sunMode?'#197b62':'#62e3ad',deltaY);
 else{c.fillText(hasRef?'Reference below display range':'Assign REF in I/O to compare inputs',left,deltaTop+Math.max(14,(deltaBottom-deltaTop)/2));}
 if(cursorX!==null&&cursorX>=left&&cursorX<=right){const frequency=lo*Math.pow(hi/lo,(cursorX-left)/width);let band=0;for(let b=1;b<BANDS;b++)if(Math.abs(Math.log(ISO[b]/frequency))<Math.abs(Math.log(ISO[band]/frequency)))band=b;
  c.save();c.setLineDash([3,4]);c.strokeStyle=text;c.beginPath();c.moveTo(cursorX,top);c.lineTo(cursorX,bottom);c.stroke();c.restore();
  const values=[(ISO[band]>=1000?(ISO[band]/1000).toFixed(2)+' kHz':ISO[band].toFixed(1)+' Hz'),'MIC '+rtaVisualDb[band].toFixed(1)+' dBFS'];
  if(hasRef)values.push('REF '+rtaRefVisualDb[band].toFixed(1)+' dBFS');if(hasSignal)values.push('Δ '+(rtaVisualDb[band]-rtaRefVisualDb[band]).toFixed(1)+' dB');
  const tw=Math.max(...values.map(v=>c.measureText(v).width))+20,tx=Math.min(right-tw,Math.max(left,cursorX+10)),ty=top+8;
  c.fillStyle=sunMode?'#ffffff':'#0d2936';c.fillRect(tx,ty,tw,values.length*16+12);c.strokeStyle=mic;c.strokeRect(tx,ty,tw,values.length*16+12);c.fillStyle=text;values.forEach((v,i)=>c.fillText(v,tx+10,ty+18+i*16));
 }
}};
