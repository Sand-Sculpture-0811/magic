'use strict';
// lunar-javascript 1.7.7 is vendored locally; no network or device timezone is used.
const AstraCalendar=(()=>{
 const stems='甲乙丙丁戊己庚辛壬癸',branches='子丑寅卯辰巳午未申酉戌亥';
 function solarDate(date){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))throw Error('请输入有效的公历日期。');
  const [y,m,d]=date.split('-').map(Number);
  if(y<1901||y>2100)throw Error('公历换算支持 1901—2100 年。');
  const check=new Date(Date.UTC(y,m-1,d));
  if(check.getUTCFullYear()!==y||check.getUTCMonth()+1!==m||check.getUTCDate()!==d)throw Error('公历日期不存在。');
  return Solar.fromYmd(y,m,d);
 }
 function lunarInfo(lunar){return {year:lunar.getYear(),month:Math.abs(lunar.getMonth()),day:lunar.getDay(),leap:lunar.getMonth()<0,label:`${lunar.getYear()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,yearGanZhi:lunar.getYearInGanZhi()};}
 function toLunar(date){return lunarInfo(solarDate(date).getLunar());}
 function toSolar(year,month,day,leap=false){
  if(![year,month,day].every(Number.isInteger)||year<1900||year>2100||month<1||month>12||day<1||day>30)throw Error('请填写有效的农历年、月、日。');
  const signedMonth=leap?-month:month;
  try{
   const lunar=Lunar.fromYmd(year,signedMonth,day),solar=lunar.getSolar(),back=solar.getLunar();
   if(back.getYear()!==year||back.getMonth()!==signedMonth||back.getDay()!==day)throw Error();
   const date=solar.toYmd();solarDate(date);return date;
  }catch{throw Error('该农历日期不存在，或超出 1901—2100 年公历范围，请核对闰月及大小月。');}
 }
 function pillars(profile){
  solarDate(profile.date);
  if(!/^\d{2}:\d{2}$/.test(profile.time||'')||!Number.isFinite(Number(profile.zone??8)))throw Error('出生时间或时区无效。');
  const [hour,minute]=profile.time.split(':').map(Number),zone=Number(profile.zone??8);
  if(hour>23||minute>59||zone<-12||zone>14)throw Error('出生时间或时区无效。');
  const instant=Date.parse(profile.date+'T'+profile.time+':00Z')-zone*3600000;
  const bj=new Date(instant+8*3600000);
  const lunar=Solar.fromYmdHms(bj.getUTCFullYear(),bj.getUTCMonth()+1,bj.getUTCDate(),bj.getUTCHours(),bj.getUTCMinutes(),0).getLunar();
  const eight=lunar.getEightChar();eight.setSect(2); // Midnight changes the day pillar.
  const day=eight.getDay(),dayStem=stems.indexOf(day[0]);
  // Derive the hour from the SAME midnight day stem, including 23:00—23:59.
  const hourBranch=Math.floor((bj.getUTCHours()+1)/2)%12;
  const time=stems[(dayStem%5*2+hourBranch)%10]+branches[hourBranch];
  return {values:[eight.getYear(),eight.getMonth(),day,time],element:['木','木','火','火','土','土','金','金','水','水'][dayStem],lunar:lunarInfo(lunar),basis:'北京时间 · 立春交节换年 · 十二节交节换月 · 00:00换日 · 不校正真太阳时'};
 }
 return Object.freeze({toLunar,toSolar,pillars});
})();
