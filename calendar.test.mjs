import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('./vendor/lunar.js',import.meta.url),'utf8')+'\n'+readFileSync(new URL('./calendar.js',import.meta.url),'utf8'),context);
const calendar=vm.runInContext('AstraCalendar',context);
const p=(date,time='12:00',zone=8)=>calendar.pillars({date,time,zone});
test('official calendar fixtures: new year, leap month, and full Chinese day labels',()=>{
 for(const [date,year,month,day,leap] of [['2024-02-10',2024,1,1,false],['2023-03-22',2023,2,1,true],['2023-02-20',2023,2,1,false],['2020-05-23',2020,4,1,true],['2026-10-23',2026,9,14,false]]){
  const lunar=calendar.toLunar(date);assert.deepEqual([lunar.year,lunar.month,lunar.day,lunar.leap],[year,month,day,leap]);assert.equal(calendar.toSolar(year,month,day,leap),date);
 }
 assert.match(calendar.toLunar('2024-02-10').label,/正月初一/);
 assert.match(calendar.toLunar('2023-03-22').label,/闰二月初一/);
});
test('nonexistent dates, leap months and lunar month day overflow are rejected',()=>{
 for(const date of ['2023-02-29','2024-02-30','2024-13-01','2024-00-01','1900-01-01','2101-01-01'])assert.throws(()=>calendar.toLunar(date));
 assert.throws(()=>calendar.toSolar(2024,2,1,true));
 assert.throws(()=>calendar.toSolar(2024,1,30)); // 2024 lunar first month has 29 days.
 assert.throws(()=>calendar.toSolar(2024,1,0));
});
test('Gregorian/lunar round trips cover every year in supported range and timezone-independent dates',()=>{
 for(let year=1901;year<=2100;year++)for(const month of [1,2,3,6,9,12]){
  const date=`${year}-${String(month).padStart(2,'0')}-15`,l=calendar.toLunar(date);
  assert.equal(calendar.toSolar(l.year,l.month,l.day,l.leap),date);
 }
});
test('Bazi crosses the exact spring boundary, not Chinese New Year or midnight',()=>{
 assert.deepEqual(Array.from(p('2024-02-04','16:26').values.slice(0,2)),['癸卯','乙丑']);
 assert.deepEqual(Array.from(p('2024-02-04','16:28').values.slice(0,2)),['甲辰','丙寅']);
 assert.equal(p('2024-02-09').values[0],'甲辰');
 assert.equal(calendar.toLunar('2024-02-09').yearGanZhi,'癸卯');
});
test('day reference, midnight rollover and five-rat hour rule use one consistent convention',()=>{
 assert.equal(p('2000-01-07').values[2],'甲子');
 assert.deepEqual(Array.from(p('2005-12-23','08:37').values),['乙酉','戊子','辛巳','壬辰']);
 assert.deepEqual(Array.from(p('2000-01-07','23:59').values.slice(2)),['甲子','甲子']);
 assert.deepEqual(Array.from(p('2000-01-08','00:00').values.slice(2)),['乙丑','丙子']);
 assert.equal(p('2000-01-07','00:59').values[3],'甲子');
 assert.equal(p('2000-01-07','01:00').values[3],'乙丑');
 assert.deepEqual(Array.from(p('2024-02-04','16:28',8).values),Array.from(p('2024-02-04','08:28',0).values));
});
test('earliest supported birth date can cross into previous Beijing date safely',()=>{
 assert.equal(p('1901-01-01','00:00',14).values.length,4);
});
