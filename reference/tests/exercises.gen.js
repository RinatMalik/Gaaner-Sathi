const fs = require('fs');
eval(fs.readFileSync(__dirname+'/.extracted/parser.js', 'utf8') + ';globalThis.P=parseSong;globalThis.CK=checkNotation;');
const TA = { dadra: { name: 'Dadra', cycle: 6, starts: [0, 3] }, keherwa: { name: 'Keherwa', cycle: 8, starts: [0, 4] }, rupak: { name: 'Rupak', cycle: 7, starts: [0, 3, 5] } };
const BN = ['স', 'ঋ', 'র', 'জ্ঞ', 'গ', 'ম', 'হ্ম', 'প', 'দ', 'ধ', 'ণ', 'ন'];
const SYL = ['সা', 'রে', 'রে', 'গা', 'গা', 'মা', 'মা', 'পা', 'ধা', 'ধা', 'নি', 'নি'];
const bnUnit = u => u.k === 'hold' ? '-' : u.k === 'rest' ? 'x' : ('.'.repeat(Math.max(0, -u.oct)) + 'র্'.repeat(Math.max(0, u.oct)) + BN[u.semi]);
const bnBeat = b => b.units.map(bnUnit).join('') + 'া';
const sylBeat = b => b.units.every(u => u.k !== 'note') ? '০' : b.units.map(u => u.k === 'note' ? SYL[u.semi] : '').join('');
function convert(line, lyr) {
  const r = parseNotesLine(line, 0);
  const join = (f) => r.beats.map((b, j) => (j && r.bars.has(j) ? '| ' : '') + f(b, j)).join(' ') + (r.bars.has(r.beats.length) ? ' |' : '');
  const notes = join(bnBeat);
  let ly = null;
  if (lyr === 'sargam') ly = '> ' + join(sylBeat);
  if (lyr === 'aa') ly = '> ' + join((b, j) => j === 0 ? 'আ' : '০');
  return ly ? notes + '\n' + ly : notes;
}
const X = [
  { id: 'ex-long-notes', title: '১ · লম্বা স্বর', taal: 'dadra', tempo: 100, lyr: 'sargam', lines: [
    '# প্রতিটি স্বর এক আবর্তন ধরে রাখুন। সুর যেন না কাঁপে।', '# আরোহ',
    'S - - | - - - | R - - | - - -', 'G - - | - - - | M - - | - - -', 'P - - | - - - | D - - | - - -', "N - - | - - - | S' - - | - - -",
    '# অবরোহ',
    "S' - - | - - - | N - - | - - -", 'D - - | - - - | P - - | - - -', 'M - - | - - - | G - - | - - -', 'R - - | - - - | S - - | - - -'] },
  { id: 'ex-scale', title: '২ · আরোহ-অবরোহ', taal: 'keherwa', tempo: 96, lyr: 'sargam', lines: [
    '# ড্রোন চালু রাখুন, প্রতিটি স্বর সা-এর সঙ্গে মিলিয়ে নিন।', '# আরোহ',
    "S R G M | P D N S'", '# অবরোহ', "S' N D P | M G R S", 'S - - - | - - - -'] },
  { id: 'ex-alankar-bn', title: '৩ · অলংকার · তিন স্বরের দল', taal: 'dadra', tempo: 110, lyr: 'sargam', lines: [
    '# তিন স্বরের দল। প্রথমে ধীরে, সুর স্থির হলে লয় বাড়ান।', '# আরোহ',
    'S R G | R G M', 'G M P | M P D', "P D N | D N S'", '# অবরোহ',
    "S' N D | N D P", 'D P M | P M G', 'M G R | G R S', 'S - - | - - -'] },
  { id: 'ex-alankar-4', title: '৪ · অলংকার · চার স্বরের দল', taal: 'keherwa', tempo: 120, lyr: 'sargam', lines: [
    '# চার স্বরের দল। প্রতিটি দলের প্রথম স্বরে একটু জোর দিন।', '# আরোহ',
    'S R G M | R G M P', 'G M P D | M P D N', "P D N S' | S' - - -", '# অবরোহ',
    "S' N D P | N D P M", 'D P M G | P M G R', 'M G R S | S - - -'] },
  { id: 'ex-skip', title: '৫ · অলংকার · এক স্বর বাদ দিয়ে', taal: 'keherwa', tempo: 110, lyr: 'sargam', lines: [
    '# একটি স্বর বাদ দিয়ে লাফ। মাঝের স্বরটি মনে মনে ভাবুন।', '# আরোহ',
    'S G R M | G P M D', "P N D S' | S' - - -", '# অবরোহ',
    "S' D N P | D M P G", 'M R G S | S - - -'] },
  { id: 'ex-laya', title: '৬ · একগুণ, দ্বিগুণ, চৌগুণ', taal: 'keherwa', tempo: 80, lyr: 'sargam', lines: [
    '# তাল একই থাকে, শুধু প্রতি মাত্রায় স্বর বাড়ে।', '# একগুণ',
    "S R G M | P D N S'", "S' N D P | M G R S", '# দ্বিগুণ',
    "SR GM PD NS' | S'N DP MG RS", "SR GM PD NS' | S'N DP MG RS", '# চৌগুণ',
    "SRGM PDNS' S'NDP MGRS | S - - -"] },
  { id: 'ex-leaps', title: '৭ · সা থেকে স্বর-লাফ', taal: 'keherwa', tempo: 90, lyr: 'sargam', lines: [
    '# সা থেকে প্রতিটি স্বরে লাফ দিন, আবার সা-তে ফিরুন।',
    'S R S - | S G S -', 'S M S - | S P S -', 'S D S - | S - - -', 'S N S - | S - - -', "S S' S - | S - - -"] },
  { id: 'ex-range', title: '৮ · মন্দ্র থেকে তার সপ্তক', taal: 'keherwa', tempo: 100, lyr: 'sargam', lines: [
    '# নিচের সপ্তক থেকে উপরের সপ্তক। জোর না দিয়ে আরামে গলা খুলুন।',
    '.P .D .N S | R G M P', "D N S' R' | G' R' S' N", 'D P M G | R S .N .D', '.P - - - | - - - -'] },
  { id: 'ex-rupak', title: '৯ · রূপক তালে অলংকার', taal: 'rupak', tempo: 120, lyr: 'sargam', lines: [
    '# রূপক তাল ৩+২+২। প্রথম মাত্রা খালি, তাই হালকা করে শুরু করুন।', '# আরোহ',
    'S R G | M P | M G', 'R G M | P D | P M', 'G M P | D N | D P', "M P D | N S' | - -", '# অবরোহ',
    "S' N D | P M | P D", 'N D P | M G | M P', 'D P M | G R | G M', 'P M G | R S | - -'] },
  { id: 'ex-bhairav', title: '১০ · কোমল ঋ ও ধ · ভৈরব ঠাট', taal: 'keherwa', tempo: 90, lyr: 'sargam', lines: [
    '# কোমল ঋ (ঋা) ও কোমল ধ (দা) শুদ্ধ স্বরের চেয়ে একটু নিচে লাগে।',
    "S r G M | P d N S'", "S' N d P | M G r S", '# অলংকার',
    'S r G M | r G M P', 'G M P d | M P d N', "P d N S' | S' - - -",
    "S' N d P | N d P M", 'd P M G | P M G r', 'M G r S | S - - -'] },
  { id: 'ex-kalyan', title: '১১ · তীব্র মা · কল্যাণ ঠাট', taal: 'keherwa', tempo: 90, lyr: 'sargam', lines: [
    '# তীব্র মা (হ্মা) শুদ্ধ মা-এর চেয়ে একটু উপরে লাগে।',
    "S R G M# | P D N S'", "S' N D P | M# G R S", '# অলংকার',
    '.N R G M# | P - - -', "M# D N S' | S' - - -", "S' N D P | M# G R S", 'S - - - | - - - -'] },
  { id: 'ex-akar', title: '১২ · আকার সাধনা', taal: 'dadra', tempo: 90, lyr: 'aa', lines: [
    "# পুরো লাইন এক 'আ'-তে গান। স্বর বদলাবে, শ্বাস নয়।",
    'S R G | M P - | M G R | S - -', 'R G M | P D - | P M G | R - -', 'G M P | D N - | D P M | G - -',
    "M P D | N S' - | N D P | M - -", 'S - - | - - -'] },
];
const out = [];
let bad = 0;
for (const x of X) {
  const lines = x.lines.map(l => l.startsWith('#') ? l : convert(l, x.lyr));
  const text = lines.join('\n') + '\n';
  const latin = P(x.lines.filter(l => !l.startsWith('#')).join('\n'));
  const bn = P(text);
  const sig = p => p.events.map(e => e.semi + ':' + e.oct + '@' + e.start.toFixed(3) + 'x' + e.dur.toFixed(3)).join(' ');
  const same = sig(latin) === sig(bn);
  const issues = CK(bn, TA[x.taal], 0);
  const errs = bn.errors.length + bn.warnings.length;
  if (!same || issues.length || errs) { bad++; console.log('PROBLEM', x.title, { same, issues, errors: bn.errors, warnings: bn.warnings }); }
  console.log((same && !issues.length && !errs ? 'OK  ' : 'FAIL') + ' ' + x.title + ' · ' + x.taal + ' · ' + bn.total + ' matras · ' + (bn.total / TA[x.taal].cycle) + ' cycles');
  out.push({ id: x.id, example: true, title: x.title, taal: x.taal, tempo: x.tempo, saKey: 0, saOct: 4, startOn: 1, text });
}
fs.writeFileSync(__dirname+'/.extracted/exercises.json', JSON.stringify(out, null, 1));
console.log('\nSample (exercise 3):\n' + out[2].text);
// deliberate-octave rule
const c1 = CK(P("S S' S - | S - - -"), TA.keherwa, 0), c2 = CK(P("N S' R' S N D"), TA.dadra, 0);
console.log('deliberate octave not flagged:', c1.length === 0, '| real slip still flagged:', c2.length === 1);
process.exit(bad ? 1 : 0);
