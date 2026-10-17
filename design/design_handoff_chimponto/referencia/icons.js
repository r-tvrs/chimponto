(function(){
if (customElements.get('lc-icon')) return;
const SRC='https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js';
const ready=window.lucide?Promise.resolve():new Promise(r=>{const s=document.createElement('script');s.src=SRC;s.onload=r;s.onerror=r;document.head.appendChild(s)});
const pas=n=>String(n).replace(/(^|-)([a-z0-9])/g,(_,a,b)=>b.toUpperCase());
function svg(name,size,sw){
  const L=window.lucide;if(!L||!name)return '';
  const node=L.icons&&(L.icons[pas(name)]||L.icons[name]);if(!node)return '';
  const kids=node[0]==='svg'?(node[2]||[]):node;
  const inner=kids.map(([t,a])=>`<${t} ${Object.entries(a||{}).filter(([k])=>k!=='key').map(([k,v])=>`${k}="${v}"`).join(' ')}/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="display:block" aria-hidden="true">${inner}</svg>`;
}
class I extends HTMLElement{
  static get observedAttributes(){return['icon','name','size','stroke']}
  connectedCallback(){this.style.display='inline-flex';this.style.flex='none';this.r()}
  attributeChangedCallback(){this.r()}
  get icon(){return this._n||this.getAttribute('icon')||this.getAttribute('name')} set icon(v){this._n=v;this.r()}
  get size(){return this._s||this.getAttribute('size')||20} set size(v){this._s=v;this.r()}
  get stroke(){return this._w||this.getAttribute('stroke')||2} set stroke(v){this._w=v;this.r()}
  r(){if(!this.isConnected)return;ready.then(()=>{this.innerHTML=svg(this.icon,this.size,this.stroke)})}
}
customElements.define('lc-icon',I);
})();
