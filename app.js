'use strict';
// No remote requests or dependencies: all profile, spread and reading data stays local.
const STORAGE_KEY = 'astra.starbook.v1';
const $ = id => document.getElementById(id);
const form = $('birth-form');
const TYPES = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
const PERIODS = {tomorrow:'明天',month:'本月',year:'本年',nextyear:'明年',life:'一生'};
const STEMS = '甲乙丙丁戊己庚辛壬癸', BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const ELEMENTS = ['木','木','火','火','土','土','金','金','水','水'];
const DECK = [
 ['愚者','THE FOOL','☀','新的尝试','为未知留出空间','放慢脚步，先看清边界'],
 ['魔术师','THE MAGICIAN','✧','主动创造','把已有资源变成一次行动','减少空想，检视手边资源'],
 ['女祭司','HIGH PRIESTESS','☽','内在直觉','安静倾听尚未表达的感受','用事实核对你的直觉'],
 ['皇后','THE EMPRESS','❀','滋养与丰盛','给关系和创作耐心的照料','先照顾自己，再回应他人'],
 ['皇帝','THE EMPEROR','♜','秩序与责任','建立清楚且温和的边界','给过于严格的规则留些弹性'],
 ['教皇','THE HIEROPHANT','⚜','学习与传承','向值得信任的人请教','检查旧习惯是否仍适合自己'],
 ['恋人','THE LOVERS','♡','选择与联结','让选择与你珍视的价值一致','把期待说清楚，不急于承诺'],
 ['战车','THE CHARIOT','♞','方向与行动','聚焦一个方向并稳步前进','重新安排节奏，避免分散精力'],
 ['力量','STRENGTH','∞','温柔的勇气','以耐心代替对抗','允许自己休息，不必证明强大'],
 ['隐者','THE HERMIT','✶','独处与探索','给深度思考留下一段空白','适时向他人表达你的需要'],
 ['命运之轮','WHEEL OF FORTUNE','☸','变化与周期','在变化中寻找可以调整的小事','接纳无法控制的部分'],
 ['正义','JUSTICE','⚖','平衡与诚实','依据事实做出公平的选择','重新审视判断中的偏见'],
 ['倒吊人','THE HANGED MAN','☥','停顿与新视角','暂缓结论，试着换个角度','区分有益等待与一再拖延'],
 ['死神','DEATH','☾','结束与更新','告别不再适合你的旧模式','给改变留出缓冲，不必强迫自己'],
 ['节制','TEMPERANCE','⚱','协调与耐心','让不同需求找到温和的平衡','减少过量投入，重新分配时间'],
 ['恶魔','THE DEVIL','♄','束缚与觉察','识别消耗自己的惯性选择','尝试松开一种不必要的依赖'],
 ['高塔','THE TOWER','ϟ','重审与重建','检查不稳固的假设并及时调整','从小处改变，避免积累压力'],
 ['星星','THE STAR','✦','希望与修复','保留希望，并以小行动回应它','找回具体可行的期待'],
 ['月亮','THE MOON','☽','情绪与未知','允许暂时不确定，慢慢收集信息','把担忧写下来，与事实分开'],
 ['太阳','THE SUN','☼','清晰与喜悦','分享进展，欣赏简单的快乐','别让完美标准遮住已有的进步'],
 ['审判','JUDGEMENT','♧','回顾与觉醒','回看经历，回应真正重要的事','停止苛责，从经验中提取启示'],
 ['世界','THE WORLD','◎','完成与整合','整理成果，为新阶段腾出空间','先完成一件小事，再开启下一程']
];
let state = {version:1,draft:{date:'',time:'',mbti:'',period:'tomorrow'},profile:null,spread:[],reading:null};
let clearArmed = false;
const mod = (n,m) => ((n % m) + m) % m;
function beijingNow(){return new Date(Date.now()+8*3600000);}
function today(){return beijingNow().toISOString().slice(0,10);}
$('birth-date').max = today();
TYPES.forEach(type => { const option=document.createElement('option');option.value=type;option.textContent=type; $('mbti').append(option); });
function draft(){return {date:form.elements.date.value,time:form.elements.time.value,mbti:form.elements.mbti.value,period:form.elements.period.value};}
function validate(p){
 if(!p || !/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!/^\d{2}:\d{2}$/.test(p.time)) return '请完整填写出生日期与出生时间。';
 const [y,m,d]=p.date.split('-').map(Number),[h,min]=p.time.split(':').map(Number);
 const check=new Date(Date.UTC(y,m-1,d));
 if(check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d||h>23||min>59) return '请输入有效的日期与时间。';
 if(y<1901 || new Date(`${p.date}T${p.time}:00+08:00`).getTime()>Date.now()) return '出生时间须在 1901 年 1 月 1 日至当前时刻之间。';
 if(!TYPES.includes(p.mbti)) return '请选择一个 MBTI 人格类型。';
 if(!Object.hasOwn(PERIODS,p.period)) return '请选择有效的测算周期。';
 return '';
}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));$('storage-status').textContent='';}catch{$('storage-status').textContent='浏览器无法保存记录（空间不足或存储被禁用）；当前页面仍可正常使用。';}}
function restore(){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return;const s=JSON.parse(raw);
 if(s.version!==1||!s.draft)throw Error('Invalid state');
 for(const name of ['date','time','mbti','period'])if(typeof s.draft[name]!=='string')throw Error('Invalid draft');
 state.draft={date:s.draft.date,time:s.draft.time,mbti:TYPES.includes(s.draft.mbti)?s.draft.mbti:'',period:Object.hasOwn(PERIODS,s.draft.period)?s.draft.period:'tomorrow'};
 if(s.profile&&!validate(s.profile)&&Array.isArray(s.spread)&&s.spread.length===3&&new Set(s.spread.map(c=>c.id)).size===3&&s.spread.every(c=>Number.isInteger(c.id)&&c.id>=0&&c.id<DECK.length&&typeof c.reversed==='boolean'&&typeof c.revealed==='boolean')){state.profile=s.profile;state.spread=s.spread;
 if(s.reading && typeof s.reading.created==='string' && Number.isFinite(Date.parse(s.reading.created)) && s.reading.created.length<40)state.reading={created:s.reading.created};}
 }catch{$('storage-status').textContent='本地记录无法读取，已使用空白状态。';}}
// Approximate apparent solar longitude (degrees), adequate for entertainment; near-term boundaries may differ.
function solarLongitude(timestamp){const t=(timestamp/86400000+2440587.5-2451545)/36525;const rad=Math.PI/180;const L=280.46646+36000.76983*t+.0003032*t*t;const M=(357.52911+35999.05029*t-.0001537*t*t)*rad;const C=(1.914602-.004817*t-.000014*t*t)*Math.sin(M)+(.019993-.000101*t)*Math.sin(2*M)+.000289*Math.sin(3*M);return mod(L+C-.00569-.00478*Math.sin((125.04-1934.136*t)*rad),360);}
function pillars(p){const [y,m,d]=p.date.split('-').map(Number);const h=Number(p.time.slice(0,2));const lon=solarLongitude(new Date(`${p.date}T${p.time}:00+08:00`).getTime());const monthIndex=Math.floor(mod(lon-315,360)/30);const solarYear=(m<=2&&lon>=270&&lon<315)?y-1:y;const year=mod(solarYear-4,60);const monthStem=mod((year%10%5)*2+2+monthIndex,10);const monthBranch=mod(monthIndex+2,12);
 // Gregorian 2000-01-07 is a Jia-Zi day; midnight is the selected day boundary.
 const day=mod(Math.round((Date.UTC(y,m-1,d)-Date.UTC(2000,0,7))/86400000),60);const hourBranch=Math.floor((h+1)/2)%12;const hourStem=mod((day%10%5)*2+hourBranch,10);
 return {values:[STEMS[year%10]+BRANCHES[year%12],STEMS[monthStem]+BRANCHES[monthBranch],STEMS[day%10]+BRANCHES[day%12],STEMS[hourStem]+BRANCHES[hourBranch]],element:ELEMENTS[day%10]};}
function zodiac(date){const [,m,d]=date.split('-').map(Number);const names=['摩羯座','水瓶座','双鱼座','白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座'];const cutoffs=[20,19,21,20,21,22,23,23,23,24,23,22];return names[m-1+(d>=cutoffs[m-1]?1:0)];}
function randomInt(max){const buf=new Uint32Array(1);const limit=Math.floor(4294967296/max)*max;do{crypto.getRandomValues(buf);}while(buf[0]>=limit);return buf[0]%max;}
function newSpread(){const pool=DECK.map((_,i)=>i);return Array.from({length:3},()=>({id:pool.splice(randomInt(pool.length),1)[0],reversed:randomInt(2)===1,revealed:false}));}
function createCards(){const labels=[['过去','THE PAST'],['现在','THE PRESENT'],['未来','THE FUTURE']];$('cards').replaceChildren();labels.forEach(([zh,en],i)=>{const slot=document.createElement('div');slot.className='card-slot';slot.innerHTML=`<div class="slot-label">${zh}<small>${en}</small></div><button class="tarot-card" type="button" data-index="${i}" aria-label="翻开${zh}牌"><div class="card-inner"><div class="card-face back"><div class="sigil">☽</div><span class="card-caption">AS ABOVE · SO BELOW</span></div><div class="card-face front"></div></div></button>`;$('cards').append(slot);slot.querySelector('button').addEventListener('click',()=>reveal(i));});}
function updateCards(){const count=state.spread.filter(c=>c.revealed).length;document.querySelectorAll('.tarot-card').forEach((button,i)=>{const c=state.spread[i];button.disabled=!state.profile||!!c?.revealed;button.classList.toggle('flipped',!!c?.revealed);const front=button.querySelector('.front');front.replaceChildren();if(c?.revealed){const card=DECK[c.id];front.innerHTML=`<small>${String(c.id).padStart(2,'0')} · ARCANA</small><div class="art ${c.reversed?'reversed':''}" aria-hidden="true">${card[2]}</div><strong>${card[0]}</strong><small>${card[1]}</small><em>${c.reversed?'逆位':'正位'} · ${card[3]}</em>`;button.setAttribute('aria-label',`${['过去','现在','未来'][i]}：${card[0]}，${c.reversed?'逆位':'正位'}`);}else{button.setAttribute('aria-label',`翻开${['过去','现在','未来'][i]}牌`);}});
 $('card-progress').textContent=state.profile?`✦ 已翻开 ${count} / 3 张${count===3?' · 星夜手记已生成':''}`:'✦ 等待与你的星辰连接';$('redraw').disabled=!state.profile;
 $('tarot-instruction').textContent=state.profile?'点击任意牌面，依照你的直觉翻牌。三张牌全部揭晓后，将生成整合解读。':'先连接你的星辰，再依次翻开三张牌。安静片刻，想一想你此刻的心愿。';}
function reveal(i){if(!state.profile||!state.spread[i]||state.spread[i].revealed)return;state.spread[i].revealed=true;if(state.spread.every(c=>c.revealed))state.reading={created:new Date().toISOString()};updateCards();renderReading();save();}
function periodInfo(key,created){const now=new Date(Date.parse(created)+8*3600000);const y=now.getUTCFullYear(),m=now.getUTCMonth()+1;let range='长期自我探索';if(key==='tomorrow'){now.setUTCDate(now.getUTCDate()+1);range=now.toISOString().slice(0,10);}if(key==='month')range=`${y} 年 ${m} 月`;if(key==='year')range=`${y} 年`;if(key==='nextyear')range=`${y+1} 年`;return {range};}
function renderIdentity(){if(!state.profile){$('sun-sign').textContent='等待星辰回应';$('pillars').textContent='— · — · — · —';$('personality').textContent='—';return;}const p=state.profile;$('sun-sign').textContent=zodiac(p.date);$('pillars').textContent=pillars(p).values.join(' · ');$('personality').textContent=p.mbti;}
// Each axis contributes actual interpretation, not just a name inserted into a template.
const PERSONALITIES = {
 INTJ:['擅长把零散线索拼成长期蓝图','过早排除不符合预期的答案','拿出一个尚未完美的方案，邀请可信的人挑出盲点'],
 INTP:['喜欢追问原理，能发现规则的裂缝','把持续研究当作推迟尝试的理由','把一个有趣的想法做成粗糙的小样，让现实给你反馈'],
 ENTJ:['善于调动资源，让模糊目标有了推进方向','把别人的犹豫误读为缺乏动力','在分配任务前，先问对方希望承担哪一部分'],
 ENTP:['容易看见替代路径，也愿意挑战旧答案','不断开启新话题，令已有承诺失去落点','选一个最想验证的假设，找真实场景试一次'],
 INFJ:['能够感知关系背后的需求，重视意义感','替别人预想太多，却迟迟不表达自己的需要','把一句含糊的“都可以”换成一个真实偏好'],
 INFP:['重视内在一致性，愿意为珍视的事投入感情','因为现实不够理想，就怀疑投入是否值得','给心中重要的主题留下具体作品，哪怕只是一段文字'],
 ENFJ:['擅长鼓舞他人，让不同的人找到共同方向','不自觉地承担所有人的情绪和结果','帮助别人之前，先确认对方需要倾听还是建议'],
 ENFP:['对人与可能性充满好奇，容易点燃新鲜的热情','把一时的兴奋变成过多承诺','邀请一个有不同经验的人交换想法，再保留最有共鸣的一条线索'],
 ISTJ:['尊重经验与承诺，能让事情可靠地运转','为了维持既有流程而错过更省力的方法','挑一个熟悉的步骤，试用更简洁的做法并比较效果'],
 ISFJ:['善于记住细节，让关心落实在日常行动里','习惯默默付出，期待别人自行读懂疲惫','清楚说出一件你希望被分担的小事'],
 ESTJ:['能够组织秩序，把想法转成明确的责任','太快进入纠正模式，忽略对方的处境','提出改进意见前，听完对方认为最困难的环节'],
 ESFJ:['重视合作与回应，能营造被接纳的氛围','用外界是否满意衡量自己的价值','为自己安排一次无需照顾任何人感受的小选择'],
 ISTP:['擅长现场判断，喜欢通过亲手实践理解问题','省略解释，令别人难以跟上你的想法','展示一次你的做法，同时说出判断背后的依据'],
 ISFP:['对体验与美感敏锐，珍惜自在而真实的表达','遇到分歧时退开，却让不满留在心里','用照片、音乐或具体例子表达一个难以说清的感受'],
 ESTP:['善于捕捉现场机会，行动带来鲜活的信息','低估后续维护的成本，或忽视较慢的伙伴','尝试新事物前，先为退出条件和后续责任留一句说明'],
 ESFP:['擅长带动气氛，从真实互动中获得能量','被当下的热闹牵走，忽略自己的真实舒适度','发起一次轻松的小聚，同时保留自由离开的空间']
};
const SIGN_STORIES = {
 白羊座:['开创','你更容易从“先试一下”中找回力量','把勇气用在开启对话，而不是争取最后一句话'],
 金牛座:['扎根','稳定、触手可及的体验更能给你安全感','留意坚持是在滋养你，还是只因改变显得麻烦'],
 双子座:['连接','不同的信息与视角容易激活你的好奇心','把好奇延伸到追问细节，让交流留下真正的理解'],
 巨蟹座:['归属','熟悉的人与空间可能是你恢复能量的起点','照顾关系时，也允许自己提出被照顾的需要'],
 狮子座:['表达','被看见的愿望可以转化为分享作品的动力','分享你真正喜欢的内容，不必等待一致的赞赏'],
 处女座:['打磨','细节会给你带来掌控感，也能改善实际体验','把修正留给真正影响结果的部分，容许小小的不完美'],
 天秤座:['协调','你容易同时看到双方的合理之处','保持体谅的同时，说出你自己的选择'],
 天蝎座:['深入','比起表面的热闹，你可能更在意信任的深度','用直接询问代替反复试探，给答案留出余地'],
 射手座:['探索','新的知识与陌生体验能为你打开思路','让自由带着一点责任，兑现一次具体的约定'],
 摩羯座:['积累','你容易从可持续的投入中感到踏实','允许过程里出现乐趣，成果不是唯一的衡量尺'],
 水瓶座:['革新','独立视角可能让你看到惯例以外的道路','解释新想法如何改善真实生活，而不只强调它有多不同'],
 双鱼座:['感受','想象与共情为你提供细腻的观察角度','区分自己的感受与替别人承担的情绪']
};
const ELEMENT_STORIES = {
 木:['生长','像枝条一样保留延展的余地','去接触一个平时不会主动选择的主题','把同时伸展的方向收回一些，给一个兴趣更深的土壤'],
 火:['表达','让热情成为可被别人感知的温度','把欣赏说出口，或分享一个你真正投入的作品','降低急于得到回应的期待，让热情有自然冷却的空间'],
 土:['承接','用具体的安排安放不确定感','整理一处常用空间，让它更适合你现在的生活','分清哪些责任属于你，哪些只是习惯性地接了过来'],
 金:['取舍','清楚的边界能为重要的人事留出位置','结束一项不再需要的承诺，并温和说明原因','允许标准因情境而调整，别让清晰变成苛刻'],
 水:['流动','观察变化，给答案一点浮现的时间','换一条散步路线，留心自己对环境的真实反应','把模糊的担忧说成一个可以回答的问题']
};
const PERIOD_STORIES = {
 tomorrow:{opening:'把镜头收近到明天的一次交谈、一个选择或一段独处',past:'最近留下的惯性',now:'明天值得留意的情境',future:'明天可以尝试的回应',work:'从眼前的一次沟通或一项任务入手，不必把一天变成人生转折',relation:'选择一个真实的交流时刻，注意对方的反应，再调整表达',pace:'留一段不被通知打断的空隙，让一天不至于只剩回应别人',scope:'只做一次小范围尝试，观察感受即可'},
 month:{opening:'把本月看作一段能试错、能调整的生活实验',past:'带进这个月的旧模式',now:'本月适合培养的方式',future:'月底值得观察的变化',work:'围绕一个正在推进的主题，先试一个版本，再根据反馈改动',relation:'观察关系里的反复情境：谁常主动、谁常妥协、哪些话一直没有说',pace:'为兴趣、社交和独处各留一点空间，别让整个月只有一种角色',scope:'连续体验几次之后再判断是否适合自己，不用一次定论'},
 year:{opening:'从这一年尚可展开的空间里，寻找值得持续投入的方向',past:'这一年延续至今的经验',now:'年内可以投入的主线',future:'通向下一阶段的铺垫',work:'选一项愿意长期练习的能力，留下能展示成长的真实作品',relation:'辨认哪些关系允许你自然变化，哪些关系需要重新协商边界',pace:'在忙碌与恢复之间建立季节性的弹性，而不是全年保持同一速度',scope:'把它放进今年余下的生活中逐步实践，时间不足时就缩小规模'},
 nextyear:{opening:'把明年视为尚未写满的篇章，先辨认你想带走与放下的东西',past:'进入明年前需要整理的经验',now:'当下可以做的准备',future:'明年的探索方向',work:'先接触向往领域的真实日常，再决定是否投入更多时间学习',relation:'想一想明年希望如何相处，把重要期待提前说清楚',pace:'给明年的安排留白，让未知的机会和生活变化有位置可放',scope:'现在先做低成本的准备，明年再按真实处境调整投入'},
 life:{opening:'将一生理解为多次改变方向的旅程，而非一张写定的命运地图',past:'可能反复出现的成长课题',now:'值得认识的内在模式',future:'可以长期培养的生活能力',work:'让技能、兴趣与生活需求相互校准，允许职业认同随阶段演变',relation:'寻找能容纳差异与变化的联结，亲近并不等于彼此没有边界',pace:'把休息、创造和陪伴当作生活本身，而非完成任务后的奖励',scope:'把它当作可随人生阶段修改的练习，不要求一次找到终身答案'}
};
// Stable variation: identical saved input/spread yields identical wording after refresh.
function readingSeed(p,spread){let n=2166136261;for(const ch of JSON.stringify([p,spread.map(c=>[c.id,c.reversed])])){n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;}return n;}
function buildReading(p,spread,created){
 const b=pillars(p),sign=zodiac(p.date),person=PERSONALITIES[p.mbti],star=SIGN_STORIES[sign],element=ELEMENT_STORIES[b.element],period=PERIOD_STORIES[p.period],info=periodInfo(p.period,created);
 const cards=spread.map(c=>({...c,data:DECK[c.id]}));const name=c=>`${c.data[0]}${c.reversed?'（逆位）':'（正位）'}`;const advice=c=>c.data[c.reversed?5:4];const seed=readingSeed(p,spread);const pick=(items,offset)=>items[(seed+offset)%items.length];
 const loveTone=cards[2].reversed?'慢一点确认心意':'给靠近留一个机会';
 const moneyTone=cards[1].reversed?'看清欲望与实际需要':'让资源服务真正重视的事';
 const careerTone=cards[1].reversed?'调整配合方式':'把优势用在具体场景';
 const studyTone=cards[0].reversed?'换一种理解路径':'让好奇变成掌握';
 const moneyPeriods={tomorrow:'明天遇到想买的东西，可以先想象它真正会在哪个场景派上用场；也留意是否只是被当时的气氛吸引',month:'本月可以留意哪些花费带来持续满足，哪些只是短暂的新鲜感，让两者的差别帮你看清自己的偏好',year:'今年适合重新理解钱对你的意义：是自由、安心、体验，还是被认可？不同答案会影响你愿意把资源放在哪里',nextyear:'想象明年的理想日常时，把居住、学习、陪伴和兴趣这些具体需要放进去，看看哪些愿望真正属于自己',life:'从一生的尺度看，你对金钱的期待可能随阶段改变；允许自己重新定义“足够”，不必沿用别人的成功尺度'};
 const studyPeriods={tomorrow:'明天挑一个正卡住的知识点，用自己的话讲出来，看看究竟是哪一步还不清楚',month:'本月围绕一个主题逐渐建立联系，每学到一个概念，就找一个生活中的例子来解释它',year:'今年可以积累一组能展示理解的作品：解题过程、读书札记、项目或演示，比单纯记录学过多少更直观',nextyear:'为明年的学习方向先做一次轻量体验，感受自己是否喜欢实际练习的过程，而不只喜欢学成后的想象',life:'长期学习不必是一条直线；允许兴趣迁移，让不同阶段的知识在新的问题里重新连接'};
 const sections=[
 ['♡ 桃花运',[
 `${PERIODS[p.period]}的感情主题是「${loveTone}」。${name(cards[2])}带来「${cards[2].data[3]}」的线索：${advice(cards[2])}。${p.mbti[0]==='I'?'如果单身，更适合从舒适的一对一交流中慢慢了解彼此，不必勉强自己成为聚会焦点。':'如果单身，可以让兴趣和共同话题成为认识彼此的入口，热闹之后也听听自己的真实感受。'}`,
 `如果已有伴侣，${period.relation}。${p.mbti[2]==='F'?'你可能很在意相处的温度，但照顾气氛时也别省略自己的需要。':'你可能习惯直接分析问题，先回应对方的感受，往往能让后面的讨论更顺畅。'}借${sign}的「${star[0]}」意象提醒自己：${star[2]}。`
 ]],
 ['◇ 金钱运',[
 `${PERIODS[p.period]}的金钱主题是「${moneyTone}」。${name(cards[1])}在这里象征「${cards[1].data[3]}」，更适合借它观察自己与金钱的关系，而不是判断收入或收益。${moneyPeriods[p.period]}。`,
 `${p.mbti[3]==='J'?'你可能喜欢明确的安排，也可以留意是否把每次计划外的花费都看成失控。':'你可能看重新体验带来的自由，也可以留意新鲜感消退后，自己是否仍然珍惜这项选择。'}日主${b.element}的「${element[0]}」意象提示你${element[1]}；面对花钱、人情往来或资源分配，先说清自己的真实意愿。`
 ]],
 ['✧ 事业运',[
 `${PERIODS[p.period]}的事业主题是「${careerTone}」。${name(cards[1])}提示你${advice(cards[1])}。${period.work}。如果你仍在读书，也可以把这里的事业理解为社团、合作项目或未来方向。`,
 `作为 ${p.mbti}，你可能${person[0]}；当合作受阻时，留意是否出现“${person[1]}”的惯性。一个贴近你的尝试是：${person[2]}。${cards[1].reversed?'遇到阻力时，先调整沟通或分工，不必急着否定自己的能力。':'有想法时，给别人一个看得见、能讨论的版本，让反馈帮助你往前走。'}`
 ]],
 ['✎ 学习运',[
 `${PERIODS[p.period]}的学习主题是「${studyTone}」。过去牌${name(cards[0])}提醒你${advice(cards[0])}，也可以借此看看自己惯用的学习方法是否还适合当前问题。${studyPeriods[p.period]}。`,
 `${p.mbti[1]==='N'?'你可能更容易被原理和关联吸引；理解大图景之后，拿一道具体问题检验自己的推理。':'你可能更容易从实例和操作中理解内容；做完一次练习后，试着提炼它能适用于哪些其他情境。'}${p.mbti[0]==='I'?'先独立整理，再向别人讲述，能帮你找到表达中的缺口。':'通过讨论激活想法后，再独立重做一次，确认理解已经成为自己的。'}${cards[0].reversed?'暂时卡住并不等于不擅长，换一个例子或表达方式再试。':'保留那些让你真正理解的例子，它们会成为后续学习的支点。'}`
 ]],
 ['✦ 人际运',[
 `${PERIODS[p.period]}的人际主题是「${cards[0].reversed?'放下旧有猜测，重新理解彼此':'让共同兴趣成为联结'}」。过去牌${name(cards[0])}带来「${cards[0].data[3]}」的线索，邀请你${advice(cards[0])}。在朋友、同学或同事之间，${p.mbti[0]==='I'?'不必用交往数量衡量关系质量，选择一个让你自在的人分享近况，也是一种主动。':'你可能善于开启交流，也可以留意群体中较安静的人，给他们自然加入话题的机会。'}`,
 `${period.relation}。${p.mbti[2]==='F'?'重视和气的你，可以练习在不赞同时表达具体理由；真正舒服的关系，也容得下不同意见。':'重视清晰的你，可以先确认对方的出发点，再讨论观点差异；理解一个人并不需要同意所有看法。'}借${sign}的「${star[0]}」意象提醒自己：${star[2]}。`
 ]],
 ['☽ 生活状态',[
 `${period.pace}。从${sign}的象征来看，${star[1]}；结合日主${b.element}的意象，可以试着${cards[1].reversed?element[3]:element[2]}。这只是日常体验的灵感，不据此判断五行旺衰。`,
 `三张牌从「${cards[0].data[3]}」走向「${cards[1].data[3]}」，再到「${cards[2].data[3]}」，可以读作一次${cards[2].reversed?'先听清自己、再决定回应方式':'把内在想法慢慢带进生活'}的邀请。${period.scope}。`
 ]]
 ];
 return {intro:`${info.range} · ${period.opening}。${sign}带来「${star[0]}」的象征，${p.mbti}提示你可能${person[0]}，而${name(cards[1])}将本次主题引向「${cards[1].data[3]}」。以下建议供你与真实经历对照，符合自己的部分才值得留下。`,sections,summary:`${PERIODS[p.period]}，你的这份运势手记以「${cards[1].data[3]}」为主线：桃花运侧重${loveTone}，金钱运提醒你${moneyTone}，事业运适合${careerTone}，学习运关注${studyTone}，人际运则适合${cards[0].reversed?'放下旧有猜测，重新理解彼此':'用共同兴趣建立联结'}。结合${sign}的${star[0]}意象与 ${p.mbti} 的偏好，你可以发挥“${person[0]}”的优势，同时觉察“${person[1]}”的惯性；从日主${b.element}的${element[0]}意象出发，也别忘了为自己的生活节奏留出余地。未来牌${name(cards[2])}给出的收尾提醒是：${advice(cards[2])}。这些内容是供你参考的象征性解读，具体选择仍由真实处境与自己的意愿决定。`,closing:pick(['愿你在清晰与未知之间，找到适合自己的步幅。','不必成为牌面描绘的人；把它当作一次重新认识自己的对话。','星辰提供意象，你的感受与选择才赋予它意义。','允许答案慢一点，也允许自己与昨天不同。'],3),range:info.range};
}
function renderReading(){const p=state.profile;const box=$('reading-content');$('period-label').textContent=p?PERIODS[p.period]:'尚未开启';if(!p||state.spread.some(c=>!c.revealed)){box.className='empty-reading';box.innerHTML=`<span>☽</span><h3>${p?'星辰已连接，静待三张牌揭晓':'宇宙的来信，正等待拆封'}</h3><p>${p?'每张牌都是一个看待自己的新角度。':'填写你的星辰坐标，翻开三张塔罗牌，<br>在这里遇见属于你的整合解读。'}</p>`;return;}
 if(!state.reading)state.reading={created:new Date().toISOString()};const reading=buildReading(p,state.spread,state.reading.created);box.className='';box.replaceChildren();const intro=document.createElement('p');intro.className='reading-intro';intro.textContent=reading.intro;box.append(intro);
 const grid=document.createElement('div');grid.className='reading-grid';reading.sections.forEach(([title,paragraphs])=>{const item=document.createElement('article');item.className='reading-item';const h=document.createElement('h3');h.textContent=title;item.append(h);paragraphs.forEach(content=>{const para=document.createElement('p');para.textContent=content;item.append(para);});grid.append(item);});box.append(grid);const note=document.createElement('p');note.className='ritual-note';note.textContent=`✧ ${reading.closing}`;const meta=document.createElement('p');meta.className='reading-meta';meta.textContent=`生成于 ${new Date(state.reading.created).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}（北京时间） · 基于本地规则的娱乐性解读 · ${reading.range}`;const summary=document.createElement('section');summary.className='reading-summary';const summaryTitle=document.createElement('h3');summaryTitle.textContent='✦ 一段话总结';const summaryText=document.createElement('p');summaryText.textContent=reading.summary;summary.append(summaryTitle,summaryText);box.append(note,summary,meta);state.reading.text=box.textContent;
}
form.addEventListener('input',()=>{state.draft=draft();$('form-error').textContent='';save();});
form.addEventListener('submit',event=>{event.preventDefault();const p=draft();const error=validate(p);$('form-error').textContent=error;if(error)return;state.draft=p;state.profile={...p};state.spread=newSpread();state.reading=null;renderIdentity();updateCards();renderReading();save();$('tarot').scrollIntoView({behavior:'smooth',block:'start'});});
$('redraw').addEventListener('click',()=>{state.spread=newSpread();state.reading=null;updateCards();renderReading();save();});
$('clear-data').addEventListener('click',()=>{if(!clearArmed){clearArmed=true;$('clear-data').textContent='再次点击，确认清除全部记录';return;}try{localStorage.removeItem(STORAGE_KEY);$('storage-status').textContent='本地记录已清除。';}catch{$('storage-status').textContent='无法访问浏览器存储，页面记录已清空。';}state={version:1,draft:{date:'',time:'',mbti:'',period:'tomorrow'},profile:null,spread:[],reading:null};form.reset();$('form-error').textContent='';clearArmed=false;$('clear-data').textContent='清除本地记录';renderIdentity();updateCards();renderReading();});
restore();for(const [name,value] of Object.entries(state.draft)){form.elements[name].value=value;}createCards();renderIdentity();updateCards();renderReading();if(state.reading)save();
