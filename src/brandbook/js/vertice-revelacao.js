/* Vértice · revelação animada da AgenticaLab
   Linha do tempo (ms): hastes 200–1150 · base 1100–1700 · sinal 1700–2300 · assinatura 2300–3200 · pausa · saída */
(function(){
const host=document.getElementById('vx'); if(!host) return;
const NS='http://www.w3.org/2000/svg';
const P={
  agents:'M160 9 C178 9 193 19 202 35 L307 221 C316 237 305 248 288 248 H272 C261 248 253 243 247 232 L145 55 C132 33 139 9 160 9Z',
  process:'M153 9 C174 6 189 18 186 36 C185 42 183 47 179 53 L77 231 C70 243 63 248 49 248 H31 C13 248 5 234 13 220 L123 32 C130 19 139 11 153 9Z',
  result:'M96 211 H223 L244 248 H75Z'
};
const css=`
.vx{display:grid;gap:14px}
.vx-stage{position:relative;background:#1E1E25;border-radius:16px;overflow:hidden;aspect-ratio:16/9;box-shadow:inset 0 0 0 1px #2E2C38;max-width:100%}
.vx-stage svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.vx-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.vx-bar button{font:600 13px/1 Inter,Arial,sans-serif;color:#F4F2F7;background:transparent;border:1px solid #3A3846;border-radius:999px;padding:9px 14px;cursor:pointer}
.vx-bar button[aria-pressed="true"]{background:#F4F2F7;color:#1E1E25;border-color:#F4F2F7}
.vx-bar button:focus-visible,.vx-bar input:focus-visible{outline:2px solid #FF6B2C;outline-offset:2px}
.vx-bar input[type=range]{flex:1 1 180px;min-width:0;accent-color:#FF6B2C}
.vx-time{font:500 12px/1 ui-monospace,Menlo,monospace;color:#B7AAC4;min-width:64px;text-align:right;font-variant-numeric:tabular-nums}
.vx-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:0;padding:0;list-style:none}
.vx-steps li{border-top:2px solid #2E2C38;padding-top:10px;font:13px/1.5 Inter,Arial,sans-serif;color:#B7AAC4;transition:border-color .2s,color .2s}
.vx-steps li b{display:block;color:#F4F2F7;font-weight:600}
.vx-steps li.on{border-color:#FF6B2C;color:#F4F2F7}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

host.innerHTML=`<div class="vx">
 <div class="vx-stage">
  <svg viewBox="0 0 1600 900" role="img" aria-label="Animação do símbolo Vértice da AgenticaLab">
   <defs>
    <radialGradient id="vxGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#6B3BF5" stop-opacity=".55"/><stop offset="1" stop-color="#6B3BF5" stop-opacity="0"/></radialGradient>
    <clipPath id="vxClipP"><rect id="vxWipeP" x="-80" y="-14" width="160" height="0" transform="translate(152 10) rotate(27)"/></clipPath>
    <clipPath id="vxClipA"><rect id="vxWipeA" x="-80" y="-14" width="160" height="0" transform="translate(162 10) rotate(-28.5)"/></clipPath>
    <clipPath id="vxClipW"><rect id="vxWipeW" x="0" y="0" width="0" height="900"/></clipPath>
    <linearGradient id="vxSheen" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
   </defs>
   <ellipse id="vxHalo" cx="800" cy="450" rx="520" ry="420" fill="url(#vxGlow)" opacity="0"/>
   <g id="vxSym">
     <g clip-path="url(#vxClipA)"><path d="${P.agents}" fill="#6B3BF5"/></g>
     <g clip-path="url(#vxClipP)"><path d="${P.process}" fill="#F4F2F7"/></g>
     <g id="vxBase"><path id="vxBasePath" d="${P.result}" fill="#FF6B2C"/></g>
     <circle id="vxDot" r="9" fill="#F4F2F7" opacity="0"/>
   </g>
   <g clip-path="url(#vxClipW)"><text id="vxWord" x="0" y="0" font-family="Space Grotesk, Inter, Arial, sans-serif" font-weight="600" font-size="150" letter-spacing="-4" fill="#F4F2F7" opacity="0">AgenticaLab</text></g>
  </svg>
 </div>
 <div class="vx-bar" role="group" aria-label="Controles da animação">
  <button type="button" id="vxPlay" aria-pressed="true">Pausar</button>
  <button type="button" id="vxAgain">Repetir</button>
  <button type="button" id="vxModeS" aria-pressed="false">Só o símbolo</button>
  <button type="button" id="vxModeH" aria-pressed="true">Assinatura horizontal</button>
  <input type="range" id="vxScrub" min="0" max="1000" value="0" aria-label="Posição na animação">
  <span class="vx-time" id="vxTime">0,0 s</span>
 </div>
 <ol class="vx-steps">
  <li data-s="0"><b>Processos</b>A haste off-white nasce no topo.</li>
  <li data-s="1"><b>Agentes</b>A haste roxa segue logo atrás.</li>
  <li data-s="2"><b>Resultados</b>A base laranja fecha o triângulo.</li>
  <li data-s="3"><b>Assinatura</b>O símbolo abre espaço e o nome entra.</li>
 </ol>
</div>`;

const $=id=>host.querySelector('#'+id);
const wipeP=$('vxWipeP'),wipeA=$('vxWipeA'),wipeW=$('vxWipeW'),sym=$('vxSym'),base=$('vxBase'),basePath=$('vxBasePath'),dot=$('vxDot'),word=$('vxWord'),halo=$('vxHalo');
const steps=[...host.querySelectorAll('.vx-steps li')];

/* easing */
const clamp=v=>Math.max(0,Math.min(1,v));
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const expoOut=x=>x===1?1:1-Math.pow(2,-10*x);
const backOut=x=>{const c=1.4;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const easeInOut=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const lerp=(a,b,x)=>a+(b-a)*x;

let mode='h';
const TOTAL={h:5200,s:4200};
/* símbolo: viewBox interno 8..312 x 8..248 (centro óptico ~160,140) */
let wordW=0;
function layout(){
  word.setAttribute('x',0);word.setAttribute('y',0);
  try{wordW=word.getComputedTextLength()}catch(e){wordW=880}
  if(!wordW) wordW=880;
}

function render(t){
  const T=TOTAL[mode];
  /* saída: tudo some no fim do loop */
  const out=1-easeInOut(seg(t,T-450,T-50));

  /* 1. hastes: recorte cresce do topo (y=6) até a base (y=250) */
  const hp=expoOut(seg(t,200,1100)), ha=expoOut(seg(t,330,1200));
  wipeP.setAttribute('height',lerp(0,300,hp));
  wipeA.setAttribute('height',lerp(0,300,ha));

  /* 2. base: abre do centro e sobe 14 unidades */
  const b=seg(t,1100,1650), bx=backOut(b), by=expoOut(b);
  base.setAttribute('transform',`translate(159.5 ${229.5+lerp(16,0,by)}) scale(${b<=0?0.0001:Math.max(0.0001,bx)} 1) translate(-159.5 -229.5)`);
  base.style.opacity=b>0?1:0;

  /* 3. sinal: ponto percorre a haste roxa do topo à base e acende o laranja */
  const s=seg(t,1700,2250);
  if(s>0&&s<1){
    const e=easeInOut(s); const x=lerp(170,255,e), y=lerp(30,214,e);
    dot.setAttribute('cx',x);dot.setAttribute('cy',y);dot.setAttribute('opacity',Math.sin(Math.PI*s)*0.95);
  }else dot.setAttribute('opacity',0);
  const flash=Math.max(0,1-Math.abs(seg(t,2150,2500)*2-1));
  basePath.setAttribute('fill',mix('#FF6B2C','#FFB08A',flash*0.85));
  halo.setAttribute('opacity',(0.25+0.35*flash)*expoOut(seg(t,300,1600))*out);

  /* 4. composição: centralizado → assinatura horizontal */
  const symH=240, bigScale=1.55;           // símbolo grande no centro
  const smallScale=0.95;                   // símbolo na assinatura (≈1,45× a altura do x do nome)
  const gap=56, fs=150;
  const lockW=304*smallScale+gap+wordW;
  const lx=(1600-lockW)/2;
  const c=mode==='h'?easeInOut(seg(t,2300,2950)):0;
  const sc=lerp(bigScale,smallScale,c);
  const cxBig=800, cxSmall=lx+304*smallScale/2;
  const cx=lerp(cxBig,cxSmall,c), cy=450;
  sym.setAttribute('transform',`translate(${cx} ${cy}) scale(${sc}) translate(-160 -128)`);
  halo.setAttribute('cx',cx);

  const wx=lx+304*smallScale+gap, baseline=cy+symH*smallScale*0.5-14;
  const w=mode==='h'?expoOut(seg(t,2850,3550)):0;
  word.setAttribute('x',wx+lerp(-24,0,w));word.setAttribute('y',baseline);
  word.setAttribute('opacity',w>0?1:0);
  wipeW.setAttribute('x',wx-30);wipeW.setAttribute('width',(wordW+60)*w);

  host.querySelector('svg').style.opacity=out;

  /* etapa ativa */
  const act=t<330?-1:t<1100?(t<700?0:1):t<2300?2:(mode==='h'?3:2);
  steps.forEach((li,i)=>li.classList.toggle('on',i===act||(i<act&&false)));
  steps[3].style.display=mode==='h'?'':'none';
  $('vxTime').textContent=(t/1000).toFixed(1).replace('.',',')+' s';
  $('vxScrub').value=Math.round(t/T*1000);
}
function mix(a,b,k){const pa=[1,3,5].map(i=>parseInt(a.slice(i,i+2),16)),pb=[1,3,5].map(i=>parseInt(b.slice(i,i+2),16));return '#'+pa.map((v,i)=>Math.round(v+(pb[i]-v)*k).toString(16).padStart(2,'0')).join('')}

/* relógio */
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
let t=0,last=null,playing=!reduce.matches,raf=0;
function frame(now){
  if(last!==null) t=(t+(now-last))%TOTAL[mode];
  last=now;render(t);raf=requestAnimationFrame(frame);
}
function setPlaying(v){
  playing=v;cancelAnimationFrame(raf);last=null;
  $('vxPlay').textContent=v?'Pausar':'Reproduzir';$('vxPlay').setAttribute('aria-pressed',String(v));
  if(v) raf=requestAnimationFrame(frame);
}
$('vxPlay').addEventListener('click',()=>setPlaying(!playing));
$('vxAgain').addEventListener('click',()=>{t=0;render(0);setPlaying(true)});
$('vxScrub').addEventListener('input',e=>{setPlaying(false);t=e.target.value/1000*(TOTAL[mode]-1);render(t)});
function setMode(m){mode=m;$('vxModeS').setAttribute('aria-pressed',String(m==='s'));$('vxModeH').setAttribute('aria-pressed',String(m==='h'));t=0;render(0);if(!playing)render(m==='h'?3600:3000)}
$('vxModeS').addEventListener('click',()=>setMode('s'));
$('vxModeH').addEventListener('click',()=>setMode('h'));

layout();
/* parado = quadro final completo (reduced motion e primeira pintura) */
render(playing?0:3600);
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{layout();render(t)});
if(playing) raf=requestAnimationFrame(frame);
/* para exportar quadros: window.VX.seek(ms, 'h'|'s') */
window.VX={seek:(ms,m)=>{if(m&&m!==mode){mode=m}setPlaying(false);t=ms;render(ms)},total:()=>TOTAL[mode],layout};
})();
