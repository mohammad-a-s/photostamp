const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Node {
 constructor(){this.value='';this.hidden=false;this.children=[];this.events={};this.textContent='';}
 addEventListener(name,fn){this.events[name]=fn;} replaceChildren(){this.children=[];} append(...items){this.children.push(...items);} focus(){} click(){return this.events.click?.();}
}
const nodes={},win={}, get=id=>nodes[id] ||= new Node();
const box={URL,Date,Map,Error,Number,Math,Promise,$:get,DEFAULT_ENDPOINT:'https://example.netlify.app/.netlify/functions/reverse',image:{},sequence:1,coordinates:null,fieldSources:{},busy:false,cooldown:0,navigator:{onLine:true},AbortSignal,window:{addEventListener:(name,fn)=>win[name]=fn},document:{createElement:()=>new Node()},setInterval:()=>{},sharedDeadline:()=>0,publishDeadline:()=>{},sourceLabels:()=>{},draw:()=>{},confirm:()=>true,fetch:async()=>({ok:true,json:async()=>({results:[{name:'<Test Airport>',address:'Sepang, Malaysia',formatted:'<Test Airport>, Malaysia'}]})})};
vm.createContext(box);vm.runInContext(fs.readFileSync(require.resolve('../site/place-search.js'),'utf8'),box);
(async()=>{
 get('placeQuery').value='Airport';
 await vm.runInContext('searchPlaces()',box);
 assert.equal(get('place').value,''); // Results require an explicit choice.
 assert.equal(get('placeResults').children.length,1);
 get('placeResults').children[0].children[0].click();
 assert.equal(get('place').value,'<Test Airport>');
 assert.equal(box.coordinates,null);
 assert.equal(box.fieldSources.place,'manually selected');
 assert.equal(get('placeSearchPanel').hidden,true);
 // A result for an old photo must never populate a replacement photo.
 let resolve;box.fetch=()=>new Promise(r=>resolve=r);get('placeQuery').value='Different city';
 const pending=vm.runInContext('searchPlaces()',box);
 box.sequence++;win['photostamp:photochange']();
 resolve({ok:true,json:async()=>({results:[{name:'Old result',address:'Old',formatted:'Old'}]})});
 await pending;assert.equal(get('placeResults').children.length,0);
 assert.equal(get('chosenLocation').hidden,true);
 // Offline search leaves caption fields editable and sends no request.
 box.navigator.onLine=false;box.fetch=()=>{throw Error('Unexpected network request');};
 await vm.runInContext('searchPlaces()',box);assert.match(get('searchStatus').textContent,/offline/);
 console.log('Chooser selection, no invented GPS, stale-result and offline checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
