import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
function core(){const context=vm.createContext({});const constants=source.slice(source.indexOf('const TYPES'),source.indexOf('let state ='));const astronomy=source.slice(source.indexOf('function solarLongitude'),source.indexOf('function randomInt'));const personalities=source.slice(source.indexOf('const PERSONALITIES'),source.indexOf('// Stable variation:'));const daily=source.slice(source.indexOf('const DAILY_PALETTES='),source.indexOf('// DAILY_CORE_END'));vm.runInContext(constants+'\nconst mod=(n,m)=>((n%m)+m)%m;\n'+astronomy+personalities+daily,context);return context;}
test('daily content is stable, personalised and quote choice survives tarot changes',()=>{const c=core();vm.runInContext("const p={date:'2000-01-07',time:'12:00',mbti:'INTJ',place:'上海',zone:'8'};const one=buildDaily(p,'四川省 成都市','tired','2026-10-22',[]);const again=buildDaily(p,'四川省 成都市','tired','2026-10-22',[]);const cards=buildDaily(p,'四川省 成都市','tired','2026-10-22',[{id:3,revealed:true,reversed:false}]);const other=buildDaily({...p,mbti:'ENFP'},'四川省 成都市','bright','2026-10-22',[]);",c);assert.equal(vm.runInContext('JSON.stringify(one)===JSON.stringify(again)',c),true);assert.equal(vm.runInContext('one.seed===cards.seed && JSON.stringify(one.quoteOrder)===JSON.stringify(cards.quoteOrder)',c),true);assert.equal(vm.runInContext('one.seed!==other.seed && one.headline!==other.headline',c),true);assert.equal(vm.runInContext('one.number>=1&&one.number<=9&&new Set(one.quoteOrder).size===4&&one.guides.length===5',c),true);assert.equal(vm.runInContext("buildDaily(null,'上海','normal','2026-10-22').sign",c),null);});
test('dates use current city timezone rather than device timezone',()=>{const c=core();assert.equal(vm.runInContext("cityToday('纽约',new Date('2026-10-22T01:00:00Z'))",c),'2026-10-21');assert.equal(vm.runInContext("cityToday('四川省 成都市',new Date('2026-10-22T01:00:00Z'))",c),'2026-10-22');});
test('clothing uses real weather conditions and clearly handles missing data',()=>{const c=core();const text=vm.runInContext("dailyOutfit({min:5,max:13,rain:70,wind:35,uv:7,code:61},DAILY_PALETTES[0],'tired')",c);for(const word of ['5–13°C','莓果红','带伞','挡风','防晒','温差'])assert.ok(text.includes(word),word);assert.match(vm.runInContext('dailyOutfit(null,DAILY_PALETTES[1],"normal")',c),/天气暂未读取/);});
test('all dynamic palettes keep readable ink on paper',()=>{const c=core();const palettes=vm.runInContext('DAILY_PALETTES',c);const luminance=hex=>{const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};for(const p of palettes){const contrast=(luminance(p.paper)+.05)/(luminance(p.ink)+.05);assert.ok(contrast>=7,p.name);}});

test('weather browser fallback recovers server failure without credentials and rejects stale data',async()=>{
 const snippet=source.slice(source.indexOf('// WEATHER_FALLBACK_START'),source.indexOf('// WEATHER_FALLBACK_END'));
 for(const stale of [false,true]){
  let calls=0;
  const c=vm.createContext({URL,URLSearchParams,AbortSignal,fetch:async(url,options)=>{
   calls++;
   if(calls===1)return new Response('{}',{status:502});
   assert.equal(new URL(url).origin,'https://api.open-meteo.com');
   assert.equal(new URL(url).searchParams.get('timezone'),'Asia/Shanghai');
   assert.equal(options.credentials,'omit');assert.equal(options.headers,undefined);
   return new Response(JSON.stringify({daily:{time:[stale?'2026-10-21':'2026-10-22'],temperature_2m_min:[13],temperature_2m_max:[19],precipitation_probability_max:[60],wind_speed_10m_max:[15],uv_index_max:[3],weather_code:[61]}}));
  }});
  vm.runInContext(snippet,c);
  const result=vm.runInContext("loadDailyWeather([104,30],'2026-10-22','Asia/Shanghai')",c);
  if(stale)await assert.rejects(result,/备用天气连接/);else assert.equal((await result).max,19);
  assert.equal(calls,2);
 }
});
