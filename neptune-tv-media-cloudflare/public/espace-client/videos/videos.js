const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const VIDEO_TYPES=new Set(['final','emission','full','short','shorts','reel','teaser','rushes','rush']);
const FINAL_TYPES=new Set(['final','emission','full']);
const SHORT_TYPES=new Set(['short','shorts','reel','teaser']);
let items=[];
let activeFilter='all';

$('#filters').addEventListener('click',(event)=>{
  const button=event.target.closest('[data-filter]');
  if(!button)return;
  activeFilter=button.dataset.filter;
  $$('[data-filter]').forEach((entry)=>entry.classList.toggle('active',entry===button));
  renderGrid();
});

load();

async function load(){
  try{
    const state=await api('/api/client/session');
    const orders=Array.isArray(state.orders)?state.orders:[];
    items=orders.flatMap((order)=>(order.files||[]).map((file)=>({
      ...file,
      orderId:order.id,
      orderTitle:order.title||'Production Neptune Media',
      orderFormat:order.format||'',
    }))).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
    renderSummary(orders);
    renderFeatured();
    renderGrid();
  }catch(error){
    if(['unauthorized','http_401'].includes(error.message)){location.href='/espace-client/';return;}
    $('#resultLabel').textContent='Impossible de charger votre bibliothèque.';
    $('#contentGrid').innerHTML='<div class="empty-state"><div><strong>Bibliothèque indisponible</strong>Rechargez la page ou revenez au tableau de bord.</div></div>';
  }
}

function renderSummary(orders){
  $('#contentCount').textContent=items.length;
  $('#shortCount').textContent=items.filter((item)=>SHORT_TYPES.has(typeOf(item))).length;
  $('#projectCount').textContent=new Set(orders.map((order)=>order.id)).size;
}

function renderFeatured(){
  const featured=items.find((item)=>FINAL_TYPES.has(typeOf(item))&&isVideo(item));
  const section=$('#featuredSection');
  if(!featured){section.hidden=true;return;}
  section.hidden=false;
  const url=safeUrl(featured.downloadUrl);
  $('#featuredContent').innerHTML=`<article class="featured-card">
    <div class="featured-player"><video controls playsinline preload="metadata" src="${esc(url)}" aria-label="${esc(cleanName(featured.name)||'Votre émission')}"></video></div>
    <div class="featured-copy"><span class="pill">${esc(labelFor(featured))}</span><h3>${esc(cleanName(featured.name)||'Votre dernière émission')}</h3><p>${esc(featured.orderTitle)}${featured.sizeLabel?` · ${esc(featured.sizeLabel)}`:''}</p><div class="featured-actions"><a class="primary-action" href="${esc(url)}" download>Télécharger le fichier</a><a class="secondary-action" href="/espace-client/calendrier/">Préparer les publications</a></div></div>
  </article>`;
}

function renderGrid(){
  const visible=items.filter(matchesFilter);
  $('#resultLabel').textContent=visible.length
    ? `${visible.length} contenu${visible.length>1?'s':''} affiché${visible.length>1?'s':''}`
    : 'Aucun contenu dans cette catégorie';
  $('#contentGrid').innerHTML=visible.length
    ? visible.map(cardMarkup).join('')
    : '<div class="empty-state"><div><strong>Rien à afficher ici</strong>Les fichiers apparaîtront automatiquement après leur livraison par Neptune.</div></div>';
}

function matchesFilter(item){
  if(activeFilter==='all')return true;
  const type=typeOf(item);
  if(activeFilter==='final')return FINAL_TYPES.has(type);
  if(activeFilter==='short')return SHORT_TYPES.has(type);
  if(activeFilter==='rushes')return ['rush','rushes'].includes(type);
  if(activeFilter==='document')return !VIDEO_TYPES.has(type);
  return true;
}

function cardMarkup(item){
  const url=safeUrl(item.downloadUrl);
  const video=isVideo(item);
  const type=typeOf(item);
  const preview=video
    ? `<video controls playsinline preload="none" src="${esc(url)}" aria-label="${esc(cleanName(item.name)||'Vidéo Neptune Media')}"></video>`
    : imageFile(item)
      ? `<img loading="lazy" src="${esc(url)}" alt="${esc(cleanName(item.name)||'Visuel Neptune Media')}">`
      : `<div class="file-placeholder"><span>${type==='document'?'▤':'↓'}</span></div>`;
  const calendarAction=SHORT_TYPES.has(type)?'<a class="calendar-link" href="/espace-client/calendrier/">Planifier</a>':'';
  return `<article class="media-card">
    <div class="media-preview">${preview}</div>
    <div class="media-body"><div class="media-topline"><span class="type-pill">${esc(labelFor(item))}</span><span class="media-date">${esc(formatDate(item.createdAt))}</span></div><h3>${esc(cleanName(item.name)||'Contenu Neptune Media')}</h3><p>${esc(item.orderTitle)}${item.sizeLabel?` · ${esc(item.sizeLabel)}`:''}</p><div class="media-actions"><a class="download" href="${esc(url)}" download>Télécharger</a>${calendarAction}</div></div>
  </article>`;
}

function typeOf(item){return String(item.fileType||'livrable').trim().toLowerCase();}
function isVideo(item){return VIDEO_TYPES.has(typeOf(item))||/\.(mp4|webm|mov|m4v)(\?|$)/iu.test(String(item.name||''));}
function imageFile(item){return /\.(png|jpe?g|webp|gif)(\?|$)/iu.test(String(item.name||''));}
function labelFor(item){
  return ({final:'Émission complète',emission:'Émission complète',full:'Émission complète',short:'Short / Reel',shorts:'Short / Reel',reel:'Short / Reel',teaser:'Teaser',rush:'Rushs',rushes:'Rushs',document:'Document'})[typeOf(item)]||'Livrable';
}
function cleanName(value){return String(value||'').replace(/\.[a-z0-9]{2,5}$/iu,'').replace(/[_-]+/gu,' ').replace(/\s+/gu,' ').trim();}
function formatDate(value){const date=new Date(value||'');return Number.isNaN(date.getTime())?'Disponible':new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',year:'numeric'}).format(date);}
function safeUrl(value){const text=String(value||'');return /^(https?:\/\/|\/)/iu.test(text)?text:'#';}
async function api(url){const response=await fetch(url,{headers:{Accept:'application/json'},credentials:'same-origin'});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||`http_${response.status}`);return payload;}
function esc(value){return String(value??'').replace(/[&<>"']/gu,(character)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));}
