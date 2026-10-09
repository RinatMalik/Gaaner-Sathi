const fs=require('fs'); eval(fs.readFileSync(__dirname+'/.extracted/parser.js','utf8')+';globalThis.P=parseSong;globalThis.L=parseNotesLine;globalThis.SH=shiftOctaves;');
const N=['S','r','R','g','G','M','M#','P','d','D','n','N'];
const show=line=>L(line).beats.map(b=>b.units.map(u=>u.k==='note'?(u.oct<0?'.'.repeat(-u.oct):'')+N[u.semi]+(u.oct>0?"'".repeat(u.oct):''):u.k==='hold'?'-':'x').join('')+(b.err?'!':'')).join(' ');
let ok=true; const chk=(name,got,exp)=>{const p=got===exp; ok=ok&&p; console.log(p?'PASS':'FAIL',name,'=>',JSON.stringify(got),p?'':'  expected '+JSON.stringify(exp));};
// regression: same readings as v1
[['সা সা পা | র্সা র্সা -া | না র্সা না | ধা না ধা', "S S P S' S' - N S' N D N D"],['সারাগা','SRG'],['পাধা','PD'],['মাপা মা','MP M'],['পা ধা','P D'],['পধা নর্সা র্সা',"PD NS' S'"],['ন্সা .নসা ধ্‌া','.NS .NS .D'],['জ্ঞা হ্মা ঋা দা ণা','g M# r d n'],['র্রা র্গা র্া',"R' G' .R"],["S R G | S' - - | .N S x | M# PD S-R","S R G S' - - .N S x M# PD S-R"],['সা -া -া II','S - -'],["সা' রা","S' R"],['সাক','S!']].forEach(([i,e])=>chk('read '+i,show(i),e));
// offsets
const txt="# head\n  সা রা | র্সা\n> a b c\nS P' .N";
const p=P(txt);
const bl=p.beatList.map(b=>txt.slice(b.a,b.b)).join(',');
chk('beat spans',bl,"সা,রা,র্সা,S,P',.N");
// shifts
const sh=(t,s,e,d)=>{const r=SH(t,s,e,d);return r.text+' ['+r.text.slice(r.s,r.e)+'] n='+r.count;};
let t='না সা -া'; let c=t.indexOf('সা')+2;
chk('caret middle Sa up', sh(t,c,c,1), 'না র্সা -া [র্সা] n=1');
t='না র্সা -া'; c=t.indexOf('সা')+1;
chk('caret upper Sa down', sh(t,c,c,-1), 'না সা -া [সা] n=1');
t='না সা ধা'; chk('range up', sh(t,0,t.length,1), 'র্না র্সা র্ধা [র্না র্সা র্ধা] n=3');
t='সা রা'; chk('down twice', (()=>{const r1=SH(t,0,t.length,-1);const r=SH(r1.text,0,r1.text.length,-1);return r.text+' ['+r.text.slice(r.s,r.e)+'] n='+r.count;})(), '..সা ..রা [..সা ..রা] n=2');
t='.না সা'; chk('lower Ni up', sh(t,0,3,1), 'না সা [না] n=1');
t='ন্সা'; chk('hasanta lower up (whole beat)', sh(t,0,t.length,1), 'নর্সা [নর্সা] n=2');
t='পধা'; c=t.length; chk('caret picks last note in beat', sh(t,c,c,1), 'পর্ধা [পর্ধা] n=1');
t="S R G | N S' -"; chk('latin range down', sh(t,0,t.length,-1), ".S .R .G | .N S - [.S .R .G | .N S -] n=5");
t="M#' P"; chk('latin tivra upper down', sh(t,0,2,-1), "M# P [M#] n=1");
t="S'R"; chk('latin adjacent up', sh(t,0,3,1), "S''R' [S''R'] n=2");
t="সা' রা"; c=1; chk('mark after akar', sh(t,c,c,-1), "সা রা [সা] n=1");
t="রা"; chk('upper Re', sh(t,0,2,1), "র্রা [র্রা] n=1");
t="জ্ঞা হ্মা"; chk('conjuncts up', sh(t,0,t.length,1), "র্জ্ঞা র্হ্মা [র্জ্ঞা র্হ্মা] n=2");
// re-parse shifted text
chk('reparse conjuncts', show("র্জ্ঞা র্হ্মা"), "g' M#'");
t="র্র্সা"; chk('cap at +2', String(SH(t,0,t.length,1).count), '0');
// events unchanged for multi-line
const q=P("সা -া রা\n> a b c\nগা -া -া");
chk('events', q.events.map(e=>N[e.semi]+'@'+e.start+'x'+e.dur).join(' '), 'S@0x2 R@2x1 G@3x3');
chk('lines', q.noteLines.map(l=>l.srcLine).join(','), '1,3');
process.exit(ok?0:1);
