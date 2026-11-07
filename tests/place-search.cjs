const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../netlify/functions/search.cjs'),'utf8');
let calls = 0, requested;
const ctx = {exports:{},URL,URLSearchParams,AbortSignal,process:{env:{GEOAPIFY_API_KEY:'secret-test-key'}},fetch:async url => {
 calls++; requested=new URL(url); return {ok:true,json:async()=>({results:[{name:'Airport',formatted:'Airport, Street, Sepang, Malaysia',city:'Sepang',state:'Selangor',country:'Malaysia',lat:2,lon:101}]})};
}};
vm.runInNewContext(source,ctx);
const event=q=>({httpMethod:'GET',headers:{origin:'https://mohammad-a-s.github.io'},queryStringParameters:{q}});
(async()=>{
 assert.equal((await ctx.exports.handler(event('a'))).statusCode,400);
 assert.equal((await ctx.exports.handler(event('a'.repeat(201)))).statusCode,400);
 assert.equal((await ctx.exports.handler({...event('Airport'),headers:{origin:'https://other.example'}})).statusCode,403);
 assert.equal(calls,0);
 const response=await ctx.exports.handler(event('Airport, Malaysia'));
 assert.equal(response.statusCode,200);
 assert.equal(requested.hostname,'api.geoapify.com'); assert.equal(requested.searchParams.get('limit'),'5');
 const data=JSON.parse(response.body);
 assert.equal(data.results[0].address,'Sepang, Selangor, Malaysia');
 assert.equal(data.results[0].lat,undefined);
 assert.ok(!response.body.includes('secret-test-key'));
 ctx.fetch=async()=>({ok:false,status:429,headers:{get:()=> '45'}});
 const limited=await ctx.exports.handler(event('Airport'));
 assert.equal(limited.statusCode,429);assert.equal(limited.headers['Retry-After'],'45');
 ctx.fetch=async()=>({ok:true,json:async()=>({results:[]})});
 assert.deepEqual(JSON.parse((await ctx.exports.handler(event('Unknown'))).body),{results:[]});
 console.log('Place search validation, mapping, privacy, empty results and rate-limit checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
