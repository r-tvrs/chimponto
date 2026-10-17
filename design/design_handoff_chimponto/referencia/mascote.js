(function(){
if (customElements.get('mascote-chimp')) return;
const K={fur:'#6B4330',furD:'#4E2F20',skin:'#F3CDA6',skinD:'#E0AC84',ink:'#2B1B13',blush:'#F29A88',mouth:'#5A2420',tongue:'#E8776F',banana:'#FFD23F',bananaD:'#D49F00',flesh:'#FFF0BF',fleshD:'#E8CF86',stem:'#7A5A2A',leaf:'#46A86F',leafD:'#2F7F52',sweat:'#8CCBF2',red:'#E2574C',line:'#E2D9CA',mug:'#F1EADF',mugD:'#C9BBA8',wood:'#A0663A',woodD:'#8A5530',metal:'#C79A52',steel:'#8C93A0',pack:'#3F4C63',packD:'#2E3A50',q:'#7B5EA7',soft:'#CDBFAE'};
const MOODS={
  neutro:{eyes:'round',mouth:'smile',blush:.45},
  feliz:{eyes:'happy',mouth:'open',blush:.75},
  preocupado:{eyes:'small',mouth:'wavy',brows:1,blush:0},
  tranquilo:{eyes:'round',mouth:'smile',blush:.5},
  almoco:{eyes:'happy',mouth:'o',blush:.7},
  saida:{eyes:'happy',mouth:'smile',blush:.6},
  cofre:{eyes:'round',mouth:'flat',blush:.3},
  contando:{eyes:'down',mouth:'smile',blush:.6},
  pendente:{eyes:'round',mouth:'wavy',blush:.2},
  offline:{eyes:'round',mouth:'smile',blush:.5},
  boasvindas:{eyes:'happy',mouth:'open',blush:.75},
  lupa:{eyes:'round',mouth:'smirk',blush:.4},
  erro:{eyes:'small',mouth:'o',brows:1,blush:0}
};
const ALIAS={positivo:'feliz',negativo:'preocupado',zerado:'tranquilo'};
const st=(c,w)=>`stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
function eye(x,y,t){
  if(t==='happy')return `<path d="M${x-6} ${y+2}Q${x} ${y-6} ${x+6} ${y+2}" ${st(K.ink,3.4)}/>`;
  if(t==='down')return `<path d="M${x-6} ${y-1}Q${x} ${y+5} ${x+6} ${y-1}" ${st(K.ink,3.4)}/>`;
  if(t==='lid')return `<path d="M${x-6} ${y-1}A6 6 0 0 0 ${x+6} ${y-1}Z" fill="${K.ink}"/><path d="M${x-7.5} ${y-1.5}H${x+7.5}" ${st(K.ink,2.4)}/>`;
  const r=t==='small'?4.6:6;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${K.ink}"/><circle cx="${x+r*.38}" cy="${y-r*.4}" r="${r*.34}" fill="#fff"/>`;
}
const MOUTH={
  smile:`<path d="M-9 23Q0 31 9 23" ${st(K.ink,3)}/>`,
  open:`<path d="M-11 21Q0 40 11 21Z" fill="${K.mouth}"/><ellipse cx="0" cy="27.5" rx="4.5" ry="2.4" fill="${K.tongue}"/>`,
  wavy:`<path d="M-10 25Q-5 21 0 25T10 25" ${st(K.ink,2.8)}/>`,
  smirk:`<path d="M-8 25Q2 28 10 21" ${st(K.ink,3)}/>`,
  o:`<ellipse cx="0" cy="25" rx="4.5" ry="5.5" fill="${K.mouth}"/>`,
  flat:`<path d="M-7 25H7" ${st(K.ink,3)}/>`
};
function face(cx,cy,s,m){
  const b=m.blush?`<circle cx="-26" cy="12" r="5.5" fill="${K.blush}" opacity="${m.blush}"/><circle cx="26" cy="12" r="5.5" fill="${K.blush}" opacity="${m.blush}"/>`:'';
  const br=m.brows?`<path d="M-26 -16L-12 -20M12 -20L26 -16" ${st(K.furD,3.2)}/>`:'';
  return `<g transform="translate(${cx} ${cy}) scale(${s})"><circle cx="-20" cy="-4" r="21" fill="${K.skin}"/><circle cx="20" cy="-4" r="21" fill="${K.skin}"/><ellipse cx="0" cy="18" rx="31" ry="22" fill="${K.skin}"/>${b}${eye(-18,-3,m.eyes)}${eye(18,-3,m.eyes)}${br}<ellipse cx="-4" cy="12" rx="2.2" ry="1.7" fill="${K.ink}" opacity=".75"/><ellipse cx="4" cy="12" rx="2.2" ry="1.7" fill="${K.ink}" opacity=".75"/>${MOUTH[m.mouth]}</g>`;
}
function head(cx,cy,r,tuft){
  const er=r*.34,ex=r*.97,ey=cy+r*.1;
  let s=`<circle cx="${cx-ex}" cy="${ey}" r="${er}" fill="${K.fur}"/><circle cx="${cx+ex}" cy="${ey}" r="${er}" fill="${K.fur}"/><circle cx="${cx-ex}" cy="${ey}" r="${er*.56}" fill="${K.skinD}"/><circle cx="${cx+ex}" cy="${ey}" r="${er*.56}" fill="${K.skinD}"/>`;
  if(tuft)s+=`<circle cx="${cx-8}" cy="${cy-r+4}" r="${r*.14}" fill="${K.fur}"/><circle cx="${cx+3}" cy="${cy-r}" r="${r*.16}" fill="${K.fur}"/><circle cx="${cx+12}" cy="${cy-r+5}" r="${r*.12}" fill="${K.fur}"/>`;
  return s+`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${K.fur}"/>`;
}
const hand=(x,y,r=7.5)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${K.skin}"/>`;
const limb=(x1,y1,x2,y2,h=true,w=15)=>`<path d="M${x1} ${y1}L${x2} ${y2}" ${st(K.fur,w)}/>`+(h?hand(x2,y2):'');
const L16=(a,b,c,d,h=true)=>limb(a,b,c,d,h,16);
const BAN=`<path d="M-2 2C-11 14-7 31 7 37C1 27 2 14 4 2Z" fill="${K.banana}" stroke="${K.bananaD}" stroke-width="1.6" stroke-linejoin="round"/><rect x="-3" y="-4" width="6" height="7" rx="2" fill="${K.stem}"/>`;
const banana=(x,y,rot=0,s=1)=>`<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${BAN}</g>`;
const bunch=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${banana(0,0,-32)}${banana(0,0,32)}${banana(0,0,0)}<circle cx="0" cy="-3" r="4" fill="${K.stem}"/></g>`;
const peeled=(x,y,rot)=>`<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M-5 0C-6 -14 -4 -24 1 -28C5 -24 6 -14 5 0Z" fill="${K.flesh}" stroke="${K.fleshD}" stroke-width="1.4"/><path d="M-6 -2C-12 6 -12 14 -8 20C-6 12 -3 6 0 2ZM6 -2C12 6 12 14 8 20C6 12 3 6 0 2ZM-2 0C-2 10 0 16 2 22C3 14 3 6 2 0Z" fill="${K.banana}" stroke="${K.bananaD}" stroke-width="1.4" stroke-linejoin="round"/></g>`;
const mug=(x,y)=>`<g transform="translate(${x} ${y})"><path d="M5 -6q4 -6 0 -12M13 -6q4 -6 0 -12" ${st(K.mugD,2.2)}/><circle cx="22" cy="12" r="6.5" ${st(K.mugD,3.5)}/><rect x="0" y="0" width="22" height="25" rx="5" fill="${K.mug}" stroke="${K.mugD}" stroke-width="1.5"/><rect x="0.75" y="9" width="20.5" height="6" fill="${K.red}"/></g>`;
const thumb=(x,y)=>`<g transform="translate(${x} ${y})"><rect x="-4" y="-19" width="8" height="14" rx="4" fill="${K.skin}"/><rect x="-9" y="-8" width="18" height="16" rx="7" fill="${K.skin}"/><path d="M-5 -1H4M-5 3H4" ${st(K.skinD,1.6)}/></g>`;
const sweat=(x,y)=>`<path d="M${x} ${y}C${x-6} ${y+9} ${x-6} ${y+14} ${x} ${y+14}C${x+6} ${y+14} ${x+6} ${y+9} ${x} ${y}Z" fill="${K.sweat}"/>`;
const badge=(x,y,w=22,h=27)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#fff" stroke="${K.line}" stroke-width="1.5"/><rect x="${x}" y="${y}" width="${w}" height="7" rx="3" fill="${K.red}"/><rect x="${x}" y="${y+4}" width="${w}" height="4" fill="${K.red}"/><circle cx="${x+w/2}" cy="${y+h*.52}" r="${w*.16}" fill="${K.line}"/><rect x="${x+4}" y="${y+h*.76}" width="${w-8}" height="2.5" rx="1.2" fill="${K.line}"/>`;
const LEAF=`<path d="M100 46Q97 32 104 21" ${st(K.leafD,3)}/><ellipse cx="115" cy="22" rx="13" ry="6.5" transform="rotate(-28 115 22)" fill="${K.leaf}"/>`;

function A(m,mood){
  let s=`<ellipse cx="80" cy="210" rx="17" ry="8" fill="${K.furD}"/><ellipse cx="120" cy="210" rx="17" ry="8" fill="${K.furD}"/>`;
  s+=`<rect x="60" y="132" width="80" height="78" rx="32" fill="#8DCBB6"/><path d="M85 134L100 149L115 134Z" fill="#6FAF99"/>`;
  s+=`<path d="M89 139L97 164M111 139L103 164" ${st(K.red,3)}/>`+badge(89,163);
  s+=head(100,82,58,1)+face(100,90,1.22,m);
  const mugR=limb(130,148,148,170,false)+mug(146,150)+hand(148,170);
  if(mood==='feliz')s+=limb(70,146,46,116)+limb(130,146,156,112,false)+bunch(156,104,1)+hand(156,108);
  else if(mood==='preocupado')s+=limb(70,148,60,182)+limb(130,148,140,182)+sweat(162,42);
  else if(mood==='tranquilo')s+=limb(70,146,48,138,false)+thumb(46,134)+mugR;
  else s+=limb(70,148,58,182)+mugR;
  return s;
}
function B(m,mood){
  let s=`<rect x="52" y="116" width="96" height="88" rx="24" fill="${K.pack}"/>`;
  s+=`<rect x="64" y="110" width="72" height="110" rx="28" fill="#F4EFE6"/><path d="M84 111L100 125L91 131ZM116 111L100 125L109 131Z" fill="#DCD3C4"/>`;
  s+=`<g transform="rotate(9 100 124)"><rect x="95" y="120" width="10" height="9" rx="2.5" fill="${K.red}"/><path d="M96 128L91 160L100 170L109 160L104 128Z" fill="${K.red}"/></g>`;
  s+=`<rect x="67" y="112" width="11" height="74" rx="5.5" fill="${K.packD}"/><rect x="122" y="112" width="11" height="74" rx="5.5" fill="${K.packD}"/>`+badge(119,150,17,21);
  s+=head(100,66,44,0)+`<path d="M95 25q7-11 15-4" ${st(K.fur,7)}/>`+face(100,72,.92,m);
  const L=limb(66,124,58,190);
  if(mood==='feliz')s+=L+limb(134,124,160,100,false)+banana(160,96,180,1.15)+hand(160,100);
  else if(mood==='preocupado')s+=L+limb(134,124,142,190)+sweat(148,20);
  else if(mood==='tranquilo')s+=L+limb(134,124,150,168,false)+mug(146,150)+hand(150,168);
  else s+=L+limb(134,124,142,190);
  return s;
}
function Cbase(m){
  return `<ellipse cx="76" cy="204" rx="19" ry="9" fill="${K.furD}"/><ellipse cx="124" cy="204" rx="19" ry="9" fill="${K.furD}"/>`+LEAF+
  `<circle cx="34" cy="106" r="17" fill="${K.fur}"/><circle cx="166" cy="106" r="17" fill="${K.fur}"/><circle cx="34" cy="106" r="9.5" fill="${K.skinD}"/><circle cx="166" cy="106" r="9.5" fill="${K.skinD}"/>`+
  `<ellipse cx="100" cy="122" rx="68" ry="80" fill="${K.fur}"/>`+face(100,104,1.28,m)+
  `<path d="M90 156L97 167M110 156L103 167" ${st(K.red,3)}/>`+badge(89,166);
}
const LD=()=>L16(42,146,32,166), RD=()=>L16(158,146,168,166);
function C(m,mood){
  const base=Cbase(m);
  switch(mood){
    case 'feliz': return base+L16(46,132,26,104)+L16(154,132,176,100,false)+bunch(176,92,.85)+hand(176,96);
    case 'preocupado': return `<path d="M-4 118h18M-10 134h22M-2 150h14" ${st(K.soft,3)}/>`+base+LD()+RD()+sweat(152,38);
    case 'tranquilo': return base+LD()+L16(156,140,172,126,false)+thumb(174,122);
    case 'almoco': return base+LD()+L16(160,146,136,148,false)+peeled(134,146,-50)+hand(134,148);
    case 'saida': return base+LD()+L16(156,134,168,98,false)+`<path d="M162 108L168 98L178 108" ${st(K.packD,4)}/><rect x="150" y="106" width="40" height="50" rx="13" fill="${K.pack}"/><rect x="157" y="128" width="26" height="18" rx="6" fill="${K.packD}"/><path d="M157 120h26" ${st(K.packD,2)}/>`+hand(168,98);
    case 'cofre': return base+L16(44,140,54,160,false)+L16(156,140,146,160,false)+
      banana(74,172,170,.6)+banana(90,170,185,.6)+banana(116,171,175,.6)+
      `<rect x="50" y="170" width="100" height="40" rx="8" fill="${K.wood}"/><rect x="46" y="156" width="108" height="20" rx="8" fill="${K.woodD}"/><rect x="70" y="156" width="8" height="54" fill="${K.metal}"/><rect x="122" y="156" width="8" height="54" fill="${K.metal}"/>`+
      `<path d="M92 172v-7a8 8 0 0 1 16 0v7" ${st(K.steel,4.5)}/><rect x="88" y="170" width="24" height="21" rx="5" fill="${K.banana}" stroke="${K.bananaD}" stroke-width="1.6"/><circle cx="100" cy="179" r="2.6" fill="${K.stem}"/><rect x="98.8" y="180" width="2.4" height="6" rx="1.2" fill="${K.stem}"/>`+
      hand(54,160)+hand(146,160);
    case 'contando': return base+L16(44,146,58,178)+L16(156,140,170,118,false)+banana(170,114,200,.9)+hand(170,118)+
      banana(60,196,-80,.85)+banana(82,201,-95,.85)+banana(104,198,-70,.85)+banana(76,188,-85,.85)+
      `<text x="180" y="88" font-family="Fredoka,sans-serif" font-weight="700" font-size="18" fill="#B98500">+1</text>`;
    case 'pendente': return base+LD()+L16(156,124,142,56)+`<text x="164" y="54" font-family="Fredoka,sans-serif" font-weight="700" font-size="34" fill="${K.q}">?</text>`;
    case 'offline': return `<path d="M150 -44C140 -10 160 20 152 62" ${st(K.leafD,4.5)}/><ellipse cx="146" cy="-14" rx="8" ry="4" transform="rotate(-30 146 -14)" fill="${K.leaf}"/><ellipse cx="157" cy="16" rx="8" ry="4" transform="rotate(30 157 16)" fill="${K.leaf}"/>`+
      `<g transform="rotate(-10 152 60)">${base}${L16(42,146,26,156)}${L16(156,118,152,62,false)}</g>`+hand(152,62);
    case 'boasvindas': return base+LD()+L16(156,132,178,94,false)+hand(178,92,9)+`<path d="M190 78q6 7 0 15M198 70q10 11 0 30" ${st(K.soft,3)}/>`;
    case 'lupa': return base+`<path d="M8 128h30v42l-5-4-5 4-5-4-5 4-5-4-5 4Z" fill="#fff" stroke="${K.line}" stroke-width="1.5"/><path d="M14 138h18M14 146h12M14 154h16" ${st(K.soft,2)}/>`+L16(48,146,38,156,false)+hand(38,156)+
      L16(160,150,152,128,false)+`<path d="M139 113L152 128" ${st(K.stem,7)}/><circle cx="126" cy="100" r="19" fill="#DDF0FF" fill-opacity=".6" stroke="#5C6B7A" stroke-width="4.5"/><circle cx="124" cy="100" r="9" fill="${K.ink}"/><circle cx="127.5" cy="96.5" r="3" fill="#fff"/>`+hand(152,128);
    case 'erro': return `<g transform="translate(150 214)"><path d="M0 0C-14 -2 -22 4 -26 10C-16 6 -8 6 0 4ZM0 0C14 -2 22 4 26 10C16 6 8 6 0 4ZM-3 0C-4 -10 -2 -16 2 -20C4 -14 4 -6 3 0Z" fill="${K.banana}" stroke="${K.bananaD}" stroke-width="1.6" stroke-linejoin="round"/></g>`+
      `<g transform="rotate(-16 100 206)">${base}${L16(46,126,20,98)}${L16(154,126,182,104)}</g><circle cx="168" cy="40" r="4" fill="${K.banana}"/><circle cx="182" cy="56" r="3" fill="${K.banana}"/><circle cx="154" cy="26" r="2.5" fill="${K.banana}"/>`;
    default: return base+LD()+RD();
  }
}
function ICON(m){
  return `<path d="M100 50Q97 36 104 26" ${st(K.leafD,3.4)}/><ellipse cx="117" cy="27" rx="14" ry="7" transform="rotate(-28 117 27)" fill="${K.leaf}"/>`+
  `<circle cx="37" cy="116" r="21" fill="${K.fur}"/><circle cx="163" cy="116" r="21" fill="${K.fur}"/><circle cx="37" cy="116" r="11.5" fill="${K.skinD}"/><circle cx="163" cy="116" r="11.5" fill="${K.skinD}"/>`+
  `<circle cx="100" cy="108" r="64" fill="${K.fur}"/>`+face(100,106,1.32,m);
}
function inner(v,mood){
  mood=ALIAS[mood]||mood;
  const m={...(MOODS[mood]||MOODS.neutro)};
  if(v==='icone')return ICON({...MOODS.neutro,blush:.55});
  if(v==='b'){if(mood==='neutro'||!MOODS[mood]){m.eyes='lid';m.mouth='smirk';m.blush=.3}else if(mood==='tranquilo')m.eyes='lid';}
  return v==='b'?B(m,mood):v==='a'?A(m,mood):C(m,mood);
}
function draw(v,mood){
  const vb=v==='icone'?'0 0 200 200':'0 0 200 224';
  return `<svg viewBox="${vb}" width="100%" height="100%" style="display:block;overflow:visible" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mascote Bolota (${mood||v})">${inner(v,mood)}</svg>`;
}
function icon(kind,bg){
  bg=bg||'#F7C928';
  if(kind==='mono'){
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><mask id="mk"><rect width="96" height="96" fill="#fff"/><circle cx="39" cy="50" r="4.5" fill="#000"/><circle cx="57" cy="50" r="4.5" fill="#000"/><path d="M41 63Q48 69 55 63" stroke="#000" stroke-width="3.4" fill="none" stroke-linecap="round"/></mask></defs><g mask="url(#mk)" fill="#fff"><circle cx="18" cy="54" r="10"/><circle cx="78" cy="54" r="10"/><circle cx="48" cy="52" r="30"/><path d="M48 24Q47 16 51 11" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="58" cy="12" rx="8" ry="4" transform="rotate(-28 58 12)"/></g></svg>`;
  }
  const s=kind==='maskable'?2.05:2.2, cx=256, cy=kind==='maskable'?262:266;
  const g=`<g transform="translate(${cx-100*s} ${cy-100*s}) scale(${s})">${ICON({...MOODS.neutro,blush:.55})}</g>`;
  const back=kind==='maskable'?`<rect width="512" height="512" fill="${bg}"/>`:`<rect width="512" height="512" rx="112" fill="${bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${back}${g}</svg>`;
}
class Chimp extends HTMLElement{
  static get observedAttributes(){return['variant','mood']}
  connectedCallback(){this.style.cssText='display:block;width:100%;height:100%';this.render()}
  attributeChangedCallback(){this.render()}
  get variant(){return this._v||this.getAttribute('variant')||'c'} set variant(x){this._v=x;this.render()}
  get mood(){return this._m||this.getAttribute('mood')||'neutro'} set mood(x){this._m=x;this.render()}
  render(){if(this.isConnected)this.innerHTML=draw(this.variant,this.mood)}
}
customElements.define('mascote-chimp',Chimp);
function cacho(n,size){
  const rots=[40,14,-14,-40];let s='';
  rots.forEach((r,i)=>{const on=i<n;s+=`<g transform="translate(32 11) rotate(${r}) scale(1.15)"><path d="M-2 2C-11 14-7 31 7 37C1 27 2 14 4 2Z" fill="${on?K.banana:'none'}" stroke="${on?K.bananaD:'currentColor'}" stroke-opacity="${on?1:.45}" stroke-width="${on?1.6:1.8}" stroke-linejoin="round"/></g>`});
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" style="display:block" aria-label="${n} de 4 batidas">${s}<circle cx="32" cy="9" r="4.5" fill="${K.stem}"/></svg>`;
}
class Cacho extends HTMLElement{
  static get observedAttributes(){return['n','size']}
  connectedCallback(){this.style.display='inline-flex';this.render()}
  attributeChangedCallback(){this.render()}
  get n(){return this._n??this.getAttribute('n')??0} set n(x){this._n=x;this.render()}
  get size(){return this._s||this.getAttribute('size')||40} set size(x){this._s=x;this.render()}
  render(){if(this.isConnected)this.innerHTML=cacho(+this.n,this.size)}
}
customElements.define('cacho-banana',Cacho);
window.MascoteChimp={draw,icon,cacho,MOODS:Object.keys(MOODS)};
})();
