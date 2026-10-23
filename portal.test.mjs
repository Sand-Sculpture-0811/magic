import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./portal.js',import.meta.url),'utf8');
const context=vm.createContext({});vm.runInContext(source.slice(0,source.indexOf('let ritualState=')),context);
const remaining=vm.runInContext('timerRemaining',context),landing=vm.runInContext('coinLanding',context),pool=vm.runInContext('portalAnswerPool',context);
test('meditation countdown uses a wall-clock deadline across throttling, reload and pause',()=>{
 const running={running:true,deadline:181000,remaining:180000};
 assert.equal(remaining(running,1000),180000);assert.equal(remaining(running,121000),60000);assert.equal(remaining(running,201000),0);
 const paused={running:false,deadline:181000,remaining:60000};assert.equal(remaining(paused,901000),60000);
 const resumed={running:true,deadline:961000,remaining:60000};assert.equal(remaining(resumed,931000),30000);
});
test('coin completes multiple rotations and lands on the chosen side after repeated throws',()=>{
 let degrees=0;for(const side of [0,1,1,0,1,0]){const next=landing(degrees,side);assert.ok(next-degrees>=1800);assert.equal(next%360,side*180);degrees=next;}
});
test('answer book has different personal theme pools and enough alternatives for repeat draws',()=>{
 const distinct=new Set();for(let focus=0;focus<6;focus++){const answers=pool(focus);assert.equal(new Set(answers).size,answers.length);assert.ok(answers.length>=8);distinct.add(JSON.stringify(answers));}assert.equal(distinct.size,6);
});
