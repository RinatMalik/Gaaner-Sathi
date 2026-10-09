// Pulls the testable pure code out of ../gaaner-sathi.html into .extracted/ so the suites can load it.
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'gaaner-sathi.html'), 'utf8');
const out = path.join(__dirname, '.extracted');
fs.mkdirSync(out, { recursive: true });
const between = (a, b, inclusive) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('marker not found: ' + a); return html.slice(i, inclusive ? j + b.length : j); };
fs.writeFileSync(path.join(out, 'parser.js'), between('/*PARSER-START*/', '/*PARSER-END*/', true));
fs.writeFileSync(path.join(out, 'ks.js'), between('/*KS-START*/', '/*KS-END*/', true));
fs.writeFileSync(path.join(out, 'rhythm.js'), between('const TAALS = {', 'const bolText') + between('const GROOVES = {', 'const rhythmCache') + between('const rhythmCache', 'function scheduleRhythm'));
console.log('extracted parser.js, ks.js, rhythm.js');
