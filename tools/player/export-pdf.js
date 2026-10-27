// node player/export-pdf.js <piece-id> [fontsDir]  -> out/pdf/<id>-band-score.pdf (A4 landscape, light theme, ताल वाद्य split into 3 rows)
'use strict';
const path=require('path'),fs=require('fs');
const { chromium } = require('/home/claude/node_modules/playwright');
const id=process.argv[2], fonts=process.argv[3];
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'});
  const p=await b.newPage({viewport:{width:1047,height:740},colorScheme:'light'});
  await p.addInitScript(()=>{try{localStorage.setItem('gb-tvx','true')}catch(e){}});
  await p.goto('file://'+path.resolve('player/ghosh-band.html'));
  if(fonts){const f=n=>'file://'+path.resolve(fonts,n);
    await p.addStyleTag({content:`
      @font-face{font-family:"Tiro Devanagari Hindi";src:url(${f('tiro-devanagari-hindi-devanagari-400-normal.woff2')}) format("woff2")}
      @font-face{font-family:"Tiro Devanagari Hindi";src:url(${f('tiro-devanagari-hindi-latin-400-normal.woff2')}) format("woff2");unicode-range:U+0000-00FF}
      @font-face{font-family:"Mukta";font-weight:400;src:url(${f('mukta-devanagari-400-normal.woff2')}) format("woff2")}
      @font-face{font-family:"Mukta";font-weight:400;src:url(${f('mukta-latin-400-normal.woff2')}) format("woff2");unicode-range:U+0000-00FF,U+2013-2014}
      @font-face{font-family:"Mukta";font-weight:500;src:url(${f('mukta-devanagari-500-normal.woff2')}) format("woff2")}
      @font-face{font-family:"Mukta";font-weight:700;src:url(${f('mukta-devanagari-700-normal.woff2')}) format("woff2")}`});}
  await p.emulateMedia({media:'print',colorScheme:'light'});
  await p.evaluate(async id=>{await document.fonts.ready;loadPiece(id);await document.fonts.ready;layout()},id);
  await p.waitForTimeout(400);
  fs.mkdirSync('out/pdf',{recursive:true});
  const out=`out/pdf/${id}-band-score.pdf`;
  await p.pdf({path:out,format:'A4',landscape:true,printBackground:true,preferCSSPageSize:true});
  await p.screenshot({path:`out/pdf/${id}-preview.png`,fullPage:true});
  console.log(out);await b.close();
})();
