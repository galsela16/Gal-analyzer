const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const scope={window:{},ISO:[20,200,2000,20000],BANDS:4,floorDb:-85,ceilDb:-15,curBpo:48,measChannel:0,refChannel:1,analyserRef:{},rtaVisualDb:[-40,-50,-60,-70],rtaRefVisualDb:[-60,-55,-50,-45],sunMode:false,tfTraces:[]};
vm.createContext(scope);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/mr-view.js'),'utf8'),scope);
let cases=0;
for(const compact of [false,true])for(const day of [false,true])for(const reference of [false,true])for(const cursorX of [80,250,420]){
 scope.sunMode=day;scope.refChannel=reference?1:-1;
 const stack=[],texts=[],fills=[],strokes=[];let box;
 const c={textAlign:'right',textBaseline:'top',fillStyle:'',strokeStyle:'',save(){stack.push({textAlign:this.textAlign,textBaseline:this.textBaseline,fillStyle:this.fillStyle,strokeStyle:this.strokeStyle})},restore(){Object.assign(this,stack.pop())},clearRect(){},fillRect(){},strokeRect(x,y,w,h){box={x,y,w,h}},measureText(t){return {width:t.length*6}},fillText(t,x,y,max){texts.push({t,x,y,max,align:this.textAlign})},fill(){fills.push(this.fillStyle)},stroke(){strokes.push(this.strokeStyle)},createLinearGradient(){return {gradient:true,addColorStop(){}}},setLineDash(){},beginPath(){},rect(){},clip(){},moveTo(){},lineTo(){},closePath(){}};
 scope.window.GalMr.render(c,460,300,{compact,cursorX});
 assert(box);for(const t of texts.filter(t=>/Hz|MIC .*dBFS|REF .*dBFS/.test(t.t)&&t.y>=box.y&&t.y<=box.y+box.h)){assert.equal(t.align,'left');assert(t.x>=box.x&&t.x+Math.min(t.t.length*6,t.max||Infinity)<=box.x+box.w)}
 assert.equal(fills.filter(f=>f?.gradient).length,1,'MIC fill missing or duplicate REF fill');
 assert(strokes.includes(day?'#0087b1':'#18daf4'));if(reference)assert(strokes.includes(day?'#b57300':'#ffb744'));
 assert.equal(c.textAlign,'right','Renderer leaked text alignment');assert.equal(stack.length,0);cases++;
}
console.log(JSON.stringify({pass:true,cases,micFilled:true,referenceOutlineOnly:true,cursorTextInsideBox:true}));
