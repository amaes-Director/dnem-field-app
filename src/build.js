// Builds the two deliverables from src/:
//   ../phone-app/  (../docs/ in the GitHub repo, served by GitHub Pages) -> the phone app
//   ../DNEM ADA Lens Report Builder.html  -> single file; open in Chrome or Edge
// Run: node build.js
const fs = require('fs'), path = require('path');
const SRC = __dirname, OUT = path.join(SRC, '..');
const read = p => fs.readFileSync(path.join(SRC, p), 'utf8');

// phone app
const phoneOut = path.join(OUT, fs.existsSync(path.join(OUT, '.git')) ? 'docs' : 'phone-app');
fs.rmSync(phoneOut, { recursive: true, force: true });
fs.cpSync(path.join(SRC, 'phone'), phoneOut, { recursive: true });
fs.writeFileSync(path.join(phoneOut, '.nojekyll'), '');
fs.copyFileSync(path.join(SRC, 'rules.js'), path.join(phoneOut, 'rules.js'));
fs.copyFileSync(path.join(SRC, 'engine.js'), path.join(phoneOut, 'engine.js'));
fs.copyFileSync(path.join(SRC, 'walk.js'), path.join(phoneOut, 'walk.js'));

// report builder (single file)
const inline = js => '<script>\n' + js.replace(/<\/script/gi, '<\\/script') + '\n</script>';
let html = read('report/builder.html');
const parts = { docx: 'report/lib/docx.iife.js', jszip: 'phone/lib/jszip.min.js', rules: 'rules.js', engine: 'engine.js', walk: 'walk.js', report: 'report/report.js' };
const b64 = p => fs.readFileSync(path.join(SRC, p)).toString('base64');
html = html.replace('__LOGO_DATA_URI__', 'data:image/png;base64,' + b64('brand/dnem_logo.png')).replace('__REPORT_LOGO_B64__', b64('brand/dnem_report_logo.png'));
for (const [k, p] of Object.entries(parts)) html = html.replace('<!--INLINE:' + k + '-->', () => inline(read(p)));
fs.writeFileSync(path.join(OUT, 'DNEM ADA Lens Report Builder.html'), html);
console.log('Built ' + path.basename(phoneOut) + '/ and DNEM ADA Lens Report Builder.html (' + Math.round(html.length / 1024) + ' KB)');
