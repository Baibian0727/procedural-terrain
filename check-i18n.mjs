// usage: node check-i18n.mjs  (checks every T()/N() key exists in EN and ES, and no Chinese UI text is left untranslated)
import {readFileSync} from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';
const dir=process.argv[2]||fileURLToPath(new URL('.',import.meta.url));
const src=readFileSync(`${dir}/index.js`,'utf8');
const {EN,ES}=await import(pathToFileURL(`${dir}/i18n.js`).href);
const han=/[㐀-鿿＀-￯　-〿]/;
const keys=new Set();let bad=0;
const lit=/\b[TN]\(\s*(['"])((?:\\.|(?!\1).)*)\1/g;
for(const m of src.matchAll(lit))keys.add(Function(`return ${m[1]}${m[2]}${m[1]}`)());
if(/\bT\(\s*`/.test(src)){console.log('T() called with a template literal');bad++;}
const vars=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join();
for(const k of keys)for(const [name,d] of [['EN',EN],['ES',ES]]){
  if(typeof d[k]!=='string'||!d[k]){console.log(`${name} missing: ${k}`);bad++;}
  else if(vars(d[k])!==vars(k)){console.log(`${name} placeholder mismatch: ${k}`);bad++;}
  else if(han.test(d[k])){console.log(`${name} still Chinese: ${k}`);bad++;}
}
const stripped=src.replace(lit,'T(""').replace(/\/\*.*?\*\//g,'').split(/\r?\n/).map(l=>l.replace(/(^|[^:'"`\\])\/\/.*$/,'$1'));
stripped.forEach((l,i)=>{if(han.test(l)){console.log(`untranslated index.js:${i+1}: ${l.trim().slice(0,120)}`);bad++;}});
console.log(`${keys.size} keys, ${bad} problems`);process.exit(bad?1:0);
