/* Home (/): animações e interações dos blocos redesenhados em 26/11/2026. */
const rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
document.querySelectorAll('.fx').forEach(sec=>{const cs=[...sec.querySelectorAll('.card')];let bi=0,idle=true;
 const beam=()=>{cs.forEach(c=>c.classList.remove('beam'));if(idle&&!rm){cs[bi%cs.length].classList.add('beam');bi++}};beam();setInterval(beam,3200);
 sec.addEventListener('pointermove',e=>{idle=false;cs.forEach(c=>{c.classList.remove('beam');const q=c.getBoundingClientRect();c.style.setProperty('--gx',(e.clientX-q.left)+'px');c.style.setProperty('--gy',(e.clientY-q.top)+'px')})});
 sec.addEventListener('pointerleave',()=>{idle=true;cs.forEach(c=>{c.style.setProperty('--gx','-999px');c.style.setProperty('--gy','-999px')})});});

document.querySelectorAll('.b3 .ag-modes ul').forEach(u=>[...u.children].forEach((li,k)=>li.style.setProperty('--l',k)));
const b3=document.querySelector('.b3');new IntersectionObserver((es,o)=>es.forEach(x=>{if(x.isIntersecting){b3.classList.add('on');o.disconnect()}}),{threshold:.2}).observe(b3);

// Títulos: palavra por palavra saindo do desfoque (vale para todos os .head h2 da página)
document.querySelectorAll('.head, .rvh').forEach(hd=>{const h=hd.querySelector('h2');let n=0;
 [...h.childNodes].forEach(nd=>{if(nd.nodeType===3){const f=document.createDocumentFragment();nd.textContent.split(/(\s+)/).forEach(t=>{if(!t)return;if(/^\s+$/.test(t)){f.append(t);return}const sp=document.createElement('span');sp.className='w';sp.style.setProperty('--w',n++);sp.textContent=t;f.append(sp)});nd.replaceWith(f)}
 else{const sp=document.createElement('span');sp.className='w';sp.style.setProperty('--w',n++);nd.replaceWith(sp);sp.append(nd)}});
 const p=hd.querySelector('p');if(p)p.classList.add('rv');
 new IntersectionObserver((es,o)=>es.forEach(x=>{if(x.isIntersecting){hd.classList.add('on');o.disconnect()}}),{threshold:.3}).observe(hd);});

const sts=[...document.querySelectorAll('.b4 .st')];sts.forEach((e,k)=>e.style.setProperty('--k',k));
if(!matchMedia('(prefers-reduced-motion:reduce)').matches){let k=0;setInterval(()=>{sts.forEach(e=>e.classList.remove('act'));sts[k%4].classList.add('act');k++},1200);}

// Bloco 5: dashboard. Aprovar um item atualiza "esperando você", entregas do dia, anel e barra da área.
(()=>{const b5=document.querySelector('.b5'),pn=b5.querySelector('.pn'),cnt=pn.querySelector('.cnt'),done=pn.querySelector('.done'),rf=pn.querySelector('.rf');
 new IntersectionObserver((es,o)=>es.forEach(x=>{if(x.isIntersecting){b5.classList.add('on');o.disconnect()}}),{threshold:.25}).observe(b5);
 if(matchMedia('(prefers-reduced-motion:reduce)').matches){b5.classList.add('on');return}
 pn.querySelectorAll('.days li').forEach((l,k)=>l.style.setProperty('--d',k));const base={c:7,m:6,o:7,e:3};let tot=23;
 const setArea=(k,v)=>{const li=pn.querySelector('.ar-'+k),t=+li.dataset.t;li.querySelector('.av b').textContent=v;li.querySelector('.bar i').style.setProperty('--p',(v/t*100)+'%')};
 setInterval(()=>{if(!b5.classList.contains('on'))return;const a=[...pn.querySelectorAll('.pn-list .row.ap')];
  if(a.length){const r=a[0],k=r.dataset.a;r.classList.replace('ap','ok');r.classList.add('flip');r.querySelector('.tg').textContent='Feito';
   cnt.textContent=a.length-1;tot++;done.textContent=tot;rf.style.setProperty('--r',tot/30*100);
   const li=pn.querySelector('.ar-'+k);setArea(k,+li.querySelector('.av b').textContent+1);li.classList.add('bump');setTimeout(()=>{r.classList.remove('flip');li.classList.remove('bump')},1200)}
  else{pn.querySelectorAll('.pn-list .row').forEach(r=>{r.classList.replace('ok','ap');r.querySelector('.tg').textContent='Aprovar'});
   cnt.textContent=3;tot=23;done.textContent=23;rf.style.setProperty('--r',77);Object.entries(base).forEach(([k,v])=>setArea(k,v))}},2600);})();

document.querySelectorAll('.b6 .row, .b6 .boss, .b6 .ax-boss').forEach(r=>{if(!r.classList.contains('row'))return;new IntersectionObserver((es,o)=>es.forEach(x=>{if(x.isIntersecting){r.classList.add('in');o.disconnect()}}),{threshold:.15}).observe(r)});

// Bloco 8: palavras dos títulos dos boxes
(()=>{const g=document.querySelector('.b8 .ag-prof');[...g.querySelectorAll('.card')].forEach((c,k)=>{c.style.setProperty('--c',k);const h=c.querySelector('h3');let n=0;
 h.innerHTML=h.textContent.split(/\s+/).map(t=>`<span class="w" style="--w:${n++}">${t}</span>`).join(' ')});
 new IntersectionObserver((es,o)=>es.forEach(x=>{if(x.isIntersecting){g.classList.add('on');o.disconnect()}}),{threshold:.2}).observe(g);})();

// Micro-histórias
(()=>{const S={"Advocacia": [["8h12", "Contato novo no WhatsApp", "Uma pessoa pergunta se tem direito a indenização. O Noah responde na hora, faz as perguntas de triagem e agenda a consulta na sua agenda.", "noah-chat", "Noah · Atendimento"], ["10h", "Prazo vigiado", "A SofIA avisa que a contestação de um processo vence na sexta. A minuta já foi montada a partir do seu modelo.", "lider-sofia", "SofIA · Operações"], ["14h", "Clientes atualizados", "Cada cliente com movimentação no processo recebe uma mensagem clara sobre o andamento, sem você digitar nada.", "lider-vitoria", "VitorIA · Comercial"], ["17h", "Para você aprovar", "Uma minuta e um contrato de honorários prontos para revisar. O resto do dia já foi resolvido.", "lider-atlas", "Atlas · Resumo do dia"]], "Arquitetura e engenharia": [["8h30", "Pedido de orçamento", "Um cliente pede orçamento de reforma. A VitorIA monta a proposta com a sua tabela de valores e os seus modelos.", "lider-vitoria", "VitorIA · Comercial"], ["11h", "Cronograma ajustado", "O fornecedor atrasou a entrega do piso. A SofIA reorganiza o cronograma da obra e avisa o cliente antes que ele pergunte.", "lider-sofia", "SofIA · Operações"], ["15h", "Projeto vira conteúdo", "O Dante prepara o post e o carrossel do projeto entregue, com as fotos e o texto na voz do escritório.", "lider-dante", "Dante · Marketing"], ["18h", "Para você aprovar", "A proposta da reforma e o post do projeto. Você aprova e o time envia e agenda.", "lider-atlas", "Atlas · Resumo do dia"]], "Agências de viagem": [["9h", "Roteiro em minutos", "Um casal pede um roteiro para Portugal. A VitorIA monta três opções de orçamento com hotéis e passeios.", "lider-vitoria", "VitorIA · Comercial"], ["12h", "Documento conferido", "Na confirmação das reservas, a SofIA percebe que um passaporte vence antes da volta e avisa o viajante a tempo.", "lider-sofia", "SofIA · Operações"], ["16h", "Embarque tranquilo", "Quem viaja amanhã recebe o lembrete com horário, documentos e checklist da mala.", "noah-chat", "Noah · Atendimento"], ["18h", "Para você aprovar", "Os três orçamentos do casal e a mensagem de pós-viagem para quem voltou ontem.", "lider-atlas", "Atlas · Resumo do dia"]], "Contabilidade e consultoria": [["8h", "Documentos do mês", "A SofIA pede os documentos do mês para cada cliente e acompanha quem ainda não enviou.", "lider-sofia", "SofIA · Operações"], ["11h", "Vencimento lembrado", "Clientes com guia vencendo na semana recebem o lembrete com o valor e o prazo.", "noah-chat", "Noah · Atendimento"], ["15h", "Relatório montado", "O relatório mensal de um cliente fica pronto com os números organizados e um resumo em linguagem simples.", "lider-axel", "Axel · Tecnologia"], ["17h", "Para você aprovar", "O relatório mensal e duas respostas a dúvidas que fogem do padrão.", "lider-atlas", "Atlas · Resumo do dia"]], "E-commerce": [["9h", "Pedido confirmado", "Assim que o pagamento cai, o cliente recebe a confirmação no WhatsApp com o prazo de entrega.", "noah-chat", "Noah · Atendimento"], ["13h", "Atraso avisado antes", "A transportadora atrasou. A SofIA identifica o problema e o cliente é avisado antes de reclamar.", "lider-sofia", "SofIA · Operações"], ["16h", "Pós-venda", "O pedido foi entregue. O cliente recebe a mensagem de pós-venda pedindo avaliação.", "lider-dante", "Dante · Marketing"], ["18h", "Para você aprovar", "A resposta para um cliente insatisfeito e a campanha de recompra da semana.", "lider-atlas", "Atlas · Resumo do dia"]]};const st=document.querySelector('.story'),trk=st.querySelector('.trk'),prog=st.querySelector('.prog'),sn=st.querySelector('.sn');let cur=0,n=0,tm,last;
 const rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
 const go=i=>{cur=Math.max(0,Math.min(n-1,i));trk.scrollTo({left:trk.clientWidth*cur,behavior:rm?'auto':'smooth'});
  [...prog.children].forEach((p,k)=>{p.className=k<cur?'done':k===cur?'now':'';});void prog.offsetWidth;sn.textContent=(cur+1)+' de '+n;
  clearTimeout(tm);if(!rm&&cur<n-1)tm=setTimeout(()=>go(cur+1),5500)};
 const open=(k,btn)=>{last=btn;const d=S[k];n=d.length;st.querySelector('.sh .tag').textContent=k;
  trk.innerHTML=d.map((x,i)=>`<div class="sl${i==n-1?' fim':''}"><span class="tm">${x[0]}</span><h4>${x[1]}</h4><p>${x[2]}</p><div class="who"><img src="/assets/img/${x[3]}.jpg" alt=""><span>${x[4]}</span></div></div>`).join('');
  prog.innerHTML='<i></i>'.repeat(n);st.hidden=false;document.body.style.overflow='hidden';trk.scrollLeft=0;go(0);st.querySelector('.sx').focus()};
 const close=()=>{st.hidden=true;document.body.style.overflow='';clearTimeout(tm);last&&last.focus()};
 document.querySelectorAll('.dia').forEach(b=>b.addEventListener('click',()=>open(b.dataset.s,b)));
 st.querySelector('.sx').onclick=close;st.querySelector('.sb').onclick=close;
 st.querySelectorAll('.sv').forEach(b=>b.onclick=()=>go(cur+ +b.dataset.d));
 document.addEventListener('keydown',e=>{if(st.hidden)return;if(e.key==='Escape')close();if(e.key==='ArrowRight')go(cur+1);if(e.key==='ArrowLeft')go(cur-1)});
 let sx;trk.addEventListener('scroll',()=>{clearTimeout(sx);sx=setTimeout(()=>{const i=Math.round(trk.scrollLeft/trk.clientWidth);if(i!==cur)go(i)},120)});
 st.querySelector('.sp').addEventListener('pointerenter',()=>st.classList.add('pause'));st.querySelector('.sp').addEventListener('pointerleave',()=>st.classList.remove('pause'));
})();

// Bloco 9: conversa aparece como no WhatsApp e repete
(()=>{const ph=document.querySelector('.b9 .ph'),its=[...ph.querySelectorAll('[data-t]')],ty=ph.querySelector('.typing'),acts=ph.querySelector('.acts'),chat=ph.querySelector('.ph-chat');
 if(matchMedia('(prefers-reduced-motion:reduce)').matches){its.forEach(e=>e.classList.add('show'));return}
 const W=ms=>new Promise(r=>setTimeout(r,ms));
 const put=e=>{chat.insertBefore(ty,e);e.classList.add('show')};
 async function run(){for(;;){its.forEach(e=>e.classList.remove('show'));acts.classList.remove('tap');await W(700);
  for(const e of its){const k=+e.dataset.t;
   if(k===3){await W(1400);acts.classList.add('tap');await W(500);e.classList.add('show');await W(900);continue}
   if(k===2){await W(500);e.classList.add('show');continue}
   chat.insertBefore(ty,e);ty.classList.add('vis');await W(k===0?900:1300);ty.classList.remove('vis');e.classList.add('show');await W(600)}
  await W(5000)}}
 let st=false;new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting&&!st){st=true;run()}}),{threshold:.3}).observe(ph);})();

(()=>{const v=document.querySelector('.b10 .vs');new IntersectionObserver((es,o)=>es.forEach(x=>{if(x.isIntersecting){v.classList.add('on');o.disconnect()}}),{threshold:.35}).observe(v)})();

document.querySelectorAll('.ag-checks').forEach(u=>{[...u.children].forEach((li,k)=>li.style.setProperty('--li',k));new IntersectionObserver((es,o)=>es.forEach(x=>{if(x.isIntersecting){u.classList.add('in');o.disconnect()}}),{threshold:.2}).observe(u)});

// Bloco 11: abre a solução num painel dentro da página
(()=>{const lb=document.querySelector('.lb11'),big=lb.querySelector('.big'),th=lb.querySelector('.thumbs');let last;
 const show=(src,alt)=>{big.src=src;big.alt=alt;th.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.src===src))};
 const open=c=>{last=c;const imgs=[...c.querySelectorAll('.art img')];lb.querySelector('.kicker').textContent=c.querySelector('.kicker').textContent;
  lb.querySelector('h3').textContent=c.querySelector('h3').textContent;lb.querySelector('.ds').textContent=c.querySelector('.app-copy p').textContent;lb.querySelector('.lst').textContent=c.querySelector('.stat').textContent;
  th.innerHTML=imgs.map(i=>`<button type="button" data-src="${i.getAttribute('src')}" aria-label="Ver imagem"><img src="${i.getAttribute('src')}" alt=""></button>`).join('');
  th.querySelectorAll('button').forEach((b,k)=>b.onclick=()=>show(b.dataset.src,imgs[k].alt));show(imgs[0].getAttribute('src'),imgs[0].alt);
  lb.hidden=false;document.body.style.overflow='hidden';lb.querySelector('.sx').focus()};
 const close=()=>{lb.hidden=true;document.body.style.overflow='';last&&last.focus()};
 document.querySelectorAll('.b11 .app').forEach(c=>{c.addEventListener('click',()=>open(c));c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(c)}})});
 lb.querySelector('.sx').onclick=close;lb.querySelector('.sb').onclick=close;lb.querySelector('.lbtx .btn').addEventListener('click',close);
 document.addEventListener('keydown',e=>{if(!lb.hidden&&e.key==='Escape')close()});})();

(()=>{const l=document.querySelector('.b12-l');new IntersectionObserver((es,o)=>es.forEach(x=>{if(x.isIntersecting){l.classList.add('on');o.disconnect()}}),{threshold:.3}).observe(l)})();


(()=>{const sec=document.querySelector('.b14'),bd=sec.querySelector('.b14-bd'),btn=sec.querySelector('.b14-ft .btn');
// Mesmas opções do primeiro passo do diagnóstico (diagnostico.js): clicar abre o formulário já no passo 2.
const OP=[['advocacia','Advocacia'],['engenharia-arquitetura','Engenharia ou arquitetura'],['agencia-viagens','Agência de viagens'],['clinica','Clínica ou consultório'],['loja-ecommerce','Loja ou e-commerce'],['outro','Outro']];
const R=matchMedia('(prefers-reduced-motion:reduce)').matches,w=ms=>new Promise(r=>setTimeout(r,R?0:ms));
const add=(h,c='m')=>{const d=document.createElement('div');d.className=c;d.innerHTML=h;bd.appendChild(d);return d};
async function say(t,d=900){const ty=add('<span></span><span></span><span></span>','ty');await w(d);ty.remove();add(t)}
async function run(){await say('Oi! Sou o Noah. Em cerca de 1 minuto eu entendo o seu caso.',800);await w(500);await say('Para começar: qual é o seu negócio?');
 const op=add(OP.map(([v,o],i)=>`<button type="button" data-v="${v}" style="--i:${i}">${o}</button>`).join(''),'b14-op');
 op.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||op.dataset.done)return;op.dataset.done=1;b.classList.add('sel');
  op.querySelectorAll('button:not(.sel)').forEach(x=>x.style.opacity=.35);await w(350);add(b.textContent,'m me');await w(400);
  await say('Perfeito. São mais 6 perguntas rápidas e eu já te passo para a equipe.');btn.dataset.negocio=b.dataset.v;btn.classList.add('go');await w(700);btn.click()})}
new IntersectionObserver((es,o)=>es.forEach(x=>{if(x.isIntersecting){sec.classList.add('on');run();o.disconnect()}}),{threshold:.35}).observe(sec)})();
