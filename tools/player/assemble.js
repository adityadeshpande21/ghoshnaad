// node player/assemble.js (reads the standalone v3 files in out/v3)
//  -> player/ghosh-band.html (band score) with all compiled pieces inlined
'use strict';
const fs=require('fs');
const order=['bharatam','ajey','chetak','bhoop','swagat-pranam','pratyutprachalanam','deepnirvan-suchana','dhvajaropanam','prabodhan','dashmesh','aruni','bharat','anak-prathmik-path-kerva'];
const all=fs.readdirSync('out/v3').map(f=>f.replace('.json',''));
const ids=[...order.filter(x=>all.includes(x)),...all.filter(x=>!order.includes(x))];
const pieces=ids.map(id=>JSON.parse(fs.readFileSync(`out/v3/${id}.json`,'utf8')));
const tl=fs.readFileSync('src/timeline3.js','utf8');
const tpl=fs.readFileSync('player/band.html','utf8');
const out=tpl.replace('__PIECES__',()=>JSON.stringify(pieces).replace(/</g,'\\u003c')).replace('__TIMELINE__',()=>tl);
fs.writeFileSync('player/ghosh-band.html',out);
console.log('ghosh-band.html',(out.length/1024).toFixed(0)+'KB',ids.length,'pieces');
