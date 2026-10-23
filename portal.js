'use strict';
// Portal navigation and the three browser-local rituals. No AI requests are made.
const PORTAL_KEY='astra.rituals.v1';
const PORTAL_ANSWERS=[
 ['先把力气留给值得的事。','暂时停一停，也是一种前进。','不必今天就给出全部答案。','让自己准备好，再迈出下一步。','一件小小的完成，已经足够。'],
 ['把真实的想法，说得简单一点。','你可以清楚表达，也可以温柔。','一次坦诚的交流，胜过反复猜测。','先听见自己的声音。','允许别人了解你的真实偏好。'],
 ['给靠近一点空间，也给自己一点边界。','真诚不必以过度付出证明。','有来有往的关系，值得慢慢珍惜。','一份具体的关心，比完美表达更重要。','别忘了把温柔也分给自己。'],
 ['把目光放回你能完成的那一步。','先试一个小版本，再让经验回答。','行动之前，留意自己真正想去的方向。','不需要同时开启所有可能。','完成，比一直等到完美更重要。'],
 ['换一个角度，可能会看见新的路。','给好奇心一次低成本的尝试。','还不熟练，不代表不适合。','答案也许藏在一次真实体验里。','别急着替未来关上门。'],
 ['先收好一件悬着的小事。','有些东西可以放下，有些值得留下。','留一点空白给尚未发生的生活。','把复杂的事情，拆成简单的一步。','你可以重新安排属于自己的节奏。']
];
const PORTAL_COMMON=['不必把这句话当成命令，感受自己的回应。','先照顾眼前的真实需要。','给自己一个可以修改的选择。','相信此刻的你仍有调整的余地。'];
function portalAnswerPool(focus){return [...(PORTAL_ANSWERS[focus]||PORTAL_ANSWERS[5]),...PORTAL_COMMON];}
function timerRemaining(timer,now=Date.now()){return timer.running?Math.max(0,timer.deadline-now):Math.max(0,timer.remaining);}
let ritualState={answerQuestion:'',answer:'',answerBasis:'',decisionQuestion:'',decision:null,minutes:3,mode:'breath',timer:{running:false,remaining:180000,deadline:0,started:0,completed:false},sessions:0};
try{
 const saved=JSON.parse(localStorage.getItem(PORTAL_KEY)||'null');
 if(saved&&typeof saved==='object'){
  for(const k of ['answerQuestion','answer','answerBasis','decisionQuestion'])if(typeof saved[k]==='string')ritualState[k]=saved[k].slice(0,k==='answerBasis'?500:300);
  if(saved.decision===0||saved.decision===1)ritualState.decision=saved.decision;
  if([1,3,5,10,15].includes(saved.minutes))ritualState.minutes=saved.minutes;
  if(['breath','quiet'].includes(saved.mode))ritualState.mode=saved.mode;
  if(Number.isInteger(saved.sessions)&&saved.sessions>=0)ritualState.sessions=Math.min(saved.sessions,100000);
  const t=saved.timer;
  if(t&&typeof t.running==='boolean'&&[t.remaining,t.deadline,t.started].every(Number.isFinite)&&t.remaining>=0&&t.remaining<=900000&&t.deadline>=0&&t.deadline<=Date.now()+900000&&t.started>=0&&t.started<=Date.now())ritualState.timer={...t,completed:!!t.completed};
 }
}catch{/* Private mode and unavailable storage still allow the rituals to run. */}
function storeRituals(){try{localStorage.setItem(PORTAL_KEY,JSON.stringify(ritualState));}catch{$('meditation-status').textContent='浏览器未允许保存记录，当前练习仍可继续。';}}
function currentRitualFocus(){return state.profile?(dailyModel?.focusIndex??5):5;}
function recommendedMinutes(){return dailyState.mood==='tired'?3:[3,5,5,3,5,10][currentRitualFocus()];}
function renderPortal(){
 const date=cityToday(dailyState.city),parts=date.split('-');$('home-month').textContent=parts[1];$('home-day').textContent=parts[2];$('home-year').textContent=parts[0];
 const symbols=[['✿','❧'],['✧','✎'],['♡','✿'],['✷','↗'],['✦','☼'],['☾','✧']][currentRitualFocus()];document.querySelector('.portal-date-art i').textContent=symbols[0];document.querySelector('.portal-date-art i:last-child').textContent=symbols[1];
 $('home-basis').textContent=dailyModel&&state.profile?`${dailyModel.sign} · ${state.profile.mbti} · 今日主题：${dailyModel.focus}`:'先完善个人命盘与当前城市，开启你的专属日报。';
 $('home-daily-line').textContent=dailyModel?dailyModel.headline.split('。')[0]+'。':'给今天一点灵感，也给自己一点偏爱。';
 $('answer-personal').textContent=dailyModel&&state.profile?`结合你的「${dailyModel.focus}」主题，筛选一页可供反思的随机文字。`:'先想一件小事，翻开一页随机文字；完善命盘后，文字主题会更贴近你。';
 $('meditation-recommend').textContent=`使用今日建议时长 · ${recommendedMinutes()} 分钟`;
 $('meditation-personal').textContent=dailyModel&&state.profile?`今天的主题是「${dailyModel.focus}」。${dailyState.mood==='tired'?'疲惫时不必强求专注，安静坐一会儿也很好。':'让这一小段时间，只属于自己的呼吸与感受。'}`:'给呼吸一点空间，让注意力慢慢回来。';
}
new MutationObserver(renderPortal).observe($('daily-headline'),{childList:true,characterData:true,subtree:true});
new MutationObserver(renderPortal).observe($('daily-personal-note'),{childList:true,characterData:true,subtree:true});
new MutationObserver(renderPortal).observe($('daily-theme-note'),{childList:true,characterData:true,subtree:true});
renderPortal();
const viewMap={home:'home',daily:'daily',ritual:'ritual',tarot:'ritual',reading:'ritual',companions:'companion','ai-chat':'companion','emotion-space':'companion',answers:'answers',decision:'decision',meditation:'meditation','daily-heading':'daily','daily-lucky':'daily','daily-guide':'daily','daily-card':'daily'};
const viewNames={daily:'今日日报',ritual:'命盘与塔罗',companion:'问答与树洞',answers:'答案之书',decision:'正反决定',meditation:'定时正念'};
function routePortal(){
 let target='home';try{target=decodeURIComponent(location.hash.slice(1)||'home');}catch{}const view=viewMap[target]||'home';
 for(const node of document.querySelectorAll('[data-view]'))node.hidden=node.dataset.view!==view;
 document.body.classList.toggle('portal-home-open',view==='home');$('view-toolbar').hidden=view==='home';$('view-title').textContent=viewNames[view]||'';
 document.title=view==='home'?'ASTRA · 生活里的小小仪式':`${viewNames[view]} · ASTRA`;
 for(const link of document.querySelectorAll('header nav a')){const linkView=viewMap[link.hash.slice(1)];if(linkView===view)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
 requestAnimationFrame(()=>{const node=document.getElementById(target),isRoot=['home','daily','ritual','answers','decision','meditation','ai-chat'].includes(target);if(node&&!node.closest('[hidden]')&&!isRoot)node.scrollIntoView({block:'start',behavior:'instant'});else window.scrollTo({top:0,behavior:'instant'});});
}
window.addEventListener('hashchange',routePortal);routePortal();
$('answer-question').value=ritualState.answerQuestion;$('decision-question').value=ritualState.decisionQuestion;
for(const [id,key] of [['answer-question','answerQuestion'],['decision-question','decisionQuestion']])$(id).addEventListener('input',()=>{ritualState[key]=$(id).value;storeRituals();});
if(ritualState.answer){$('answer-text').textContent=ritualState.answer;$('answer-book').setAttribute('aria-label','答案：'+ritualState.answer+'；点击再翻一页');$('answer-book').classList.add('opened');$('answer-context').textContent=ritualState.answerBasis||'上一页文字已留在本机。';}
let bookBusy=false;
function openAnswer(){
 if(bookBusy)return;bookBusy=true;$('answer-book').disabled=true;$('answer-again').disabled=true;
 const pool=portalAnswerPool(currentRitualFocus()).filter(text=>text!==ritualState.answer),answer=pool[randomInt(pool.length)];
 const book=$('answer-book');book.classList.remove('opened');
 setTimeout(()=>{
  ritualState.answer=answer;ritualState.answerBasis=dailyModel&&state.profile?`本页依据今日「${dailyModel.focus}」主题随机选取，文字供你反思，选择仍在自己手里。`:'本页为通用随机灵感；完善命盘后可按今日主题筛选。';
  $('answer-text').textContent=answer;$('answer-book').setAttribute('aria-label','答案：'+answer+'；点击再翻一页');$('answer-context').textContent=ritualState.answerBasis;book.classList.add('opened');storeRituals();
  setTimeout(()=>{bookBusy=false;$('answer-book').disabled=false;$('answer-again').disabled=false;},700);
 },book.classList.contains('has-opened')?400:80);book.classList.add('has-opened');
}
$('answer-book').addEventListener('click',openAnswer);$('answer-again').addEventListener('click',openAnswer);
let toasterBusy=false;
function renderToastResult(){
 if(ritualState.decision===null)return;
 const yes=ritualState.decision===0;
 $('toast-word').textContent=yes?'YES':'NO';
 $('decision-result').textContent=yes?'面包烤好啦 · YES。留意自己对这个答案的第一反应。':'面包烤好啦 · NO。暂缓也可以，听听自己的真实想法。';
 $('coin-flip').textContent='再烤一片 ↗';
}
renderToastResult();
$('coin-flip').addEventListener('click',()=>{
 if(toasterBusy)return;toasterBusy=true;$('coin-flip').disabled=true;$('coin-flip').textContent='正在烘烤…';
 const stage=$('toaster-stage'),reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 stage.classList.remove('toast-popped');stage.classList.add('toasting');
 $('decision-result').textContent='面包正在烘烤，先听见自己希望的答案…';
 const side=randomInt(2);
 setTimeout(()=>{
  ritualState.decision=side;storeRituals();renderToastResult();stage.classList.remove('toasting');stage.classList.add('toast-popped');
  setTimeout(()=>{toasterBusy=false;$('coin-flip').disabled=false;},reduced?80:750);
 },reduced?80:1600);
});
$('meditation-minutes').value=String(ritualState.minutes);$('meditation-mode').value=ritualState.mode;
function renderMeditation(){
 const timer=ritualState.timer,now=Date.now(),remaining=timerRemaining(timer,now);
 if(timer.running&&remaining===0){timer.running=false;timer.remaining=0;timer.completed=true;ritualState.sessions++;storeRituals();}
 const seconds=Math.ceil(remaining/1000);$('meditation-clock').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
 $('meditation-recommend').disabled=timer.running;$('meditation-minutes').disabled=timer.running;$('meditation-mode').disabled=timer.running;$('meditation-toggle').textContent=timer.running?'暂停练习':timer.completed?'再练习一次':remaining<ritualState.minutes*60000?'继续练习':'开始正念';
 const breathing=timer.running&&ritualState.mode==='breath';
 $('breathing-scene').classList.toggle('is-breathing',breathing);
 if(breathing){const elapsed=(ritualState.minutes*60000-remaining)/1000,phase=elapsed%10,scale=phase<4?1+phase/4*.16:1.16-(phase-4)/6*.16;$('breathing-scene').style.setProperty('--breath-scale',String(scale));$('breath-label').textContent=phase<4?'轻轻吸气':'慢慢呼气';$('breath-note').textContent='不用憋气，也不必强求跟上节拍';}
 else{$('breathing-scene').style.setProperty('--breath-scale','1');$('breath-label').textContent=timer.completed?'谢谢这段陪伴':timer.running?'安静地在这里':remaining<ritualState.minutes*60000?'休息一下':'安静坐好';$('breath-note').textContent=timer.completed?'把这份安静，带回接下来的日常':'肩膀松一点，保持自然呼吸';}
 if(timer.completed){const message=`这一段练习完成了，轻轻活动肩颈，再慢慢回到日常。已完成 ${ritualState.sessions} 次。`;if($('meditation-status').textContent!==message)$('meditation-status').textContent=message;}
}
function resetMeditation(){ritualState.timer={running:false,remaining:ritualState.minutes*60000,deadline:0,started:0,completed:false};$('meditation-status').textContent='可以睁眼，也可以闭眼；随时暂停，不需要勉强跟随。';storeRituals();renderMeditation();}
$('meditation-minutes').addEventListener('change',()=>{ritualState.minutes=Number($('meditation-minutes').value);resetMeditation();});
$('meditation-mode').addEventListener('change',()=>{ritualState.mode=$('meditation-mode').value;storeRituals();renderMeditation();});
$('meditation-reset').addEventListener('click',resetMeditation);
$('meditation-recommend').addEventListener('click',()=>{if(ritualState.timer.running)return;ritualState.minutes=recommendedMinutes();$('meditation-minutes').value=String(ritualState.minutes);resetMeditation();});
$('meditation-toggle').addEventListener('click',()=>{
 const t=ritualState.timer;if(t.running){t.remaining=timerRemaining(t);t.running=false;$('meditation-status').textContent='练习已暂停，准备好时可以继续。';}
 else{if(t.completed||t.remaining===0)resetMeditation();const next=ritualState.timer;next.running=true;next.started=Date.now();next.deadline=next.started+next.remaining;$('meditation-status').textContent='计时已开始。念头走远时，温柔地把注意力带回此刻。';}
 storeRituals();renderMeditation();
});
setInterval(renderMeditation,200);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')renderMeditation();});renderMeditation();
