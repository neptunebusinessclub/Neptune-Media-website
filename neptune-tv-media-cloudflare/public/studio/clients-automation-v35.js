const $=(selector,root=document)=>root.querySelector(selector);
const escapeHtml=(value)=>String(value??'').replace(/[&<>"']/gu,(character)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

const nextStatuses={studio_date_confirmation_pending:'preparation_complete',preparation_complete:'filming_scheduled',filming_scheduled:'filmed',filming_confirmed:'filmed',filmed:'videos_pending',videos_pending:'videos_received',videos_received:'editing',editing:'delivered',approval:'delivered',delivered:'completed'};
const nextLabels={studio_date_confirmation_pending:'Confirmer la préparation',preparation_complete:'Confirmer le passage',filming_scheduled:'Marquer réalisé',filming_confirmed:'Marquer réalisé',filmed:'Passer aux vidéos',videos_pending:'Confirmer réception',videos_received:'Lancer le traitement',editing:'Confirmer livraison',approval:'Confirmer livraison',delivered:'Clôturer'};
const statusLabels={studio_date_confirmation_pending:'Date à confirmer',preparation_complete:'Préparation terminée',filming_scheduled:'Passage confirmé',filming_confirmed:'Passage confirmé',filmed:'Passage réalisé',videos_pending:'Vidéos attendues',videos_received:'Vidéos reçues',editing:'Traitement en cours',approval:'Validation en cours',delivered:'Livré'};
const manualStatuses=new Set(['studio_date_confirmation_pending','preparation_complete','filmed','videos_pending','videos_received','editing','approval','delivered']);

function deadlineFor(order){
  const base=new Date(order.updatedAt||order.createdAt||Date.now());
  if(order.status==='studio_date_confirmation_pending')return new Date(base.getTime()+48*3600000);
  if(order.status==='videos_pending')return new Date(new Date(order.filmingAt||base).getTime()+7*86400000);
  if(['videos_received','editing','approval'].includes(order.status))return new Date(new Date(order.filmingAt||base).getTime()+15*86400000);
  if(['preparation_complete','filming_scheduled','filming_confirmed'].includes(order.status)&&order.filmingAt)return new Date(order.filmingAt);
  return null;
}

function requiresAction(order){
  if(manualStatuses.has(order.status))return true;
  if(['filming_scheduled','filming_confirmed'].includes(order.status)&&order.filmingAt)return new Date(order.filmingAt)<=new Date();
  const deadline=deadlineFor(order);
  return Boolean(deadline&&deadline<Date.now());
}

function watching(order){
  if(requiresAction(order))return false;
  const deadline=deadlineFor(order);
  return Boolean(deadline&&deadline-Date.now()<7*86400000);
}

function remainingLabel(deadline){
  if(!deadline)return '';
  const ms=deadline-Date.now(),abs=Math.abs(ms),days=Math.floor(abs/86400000),hours=Math.max(1,Math.ceil((abs%86400000)/3600000));
  return ms<0?`Retard ${days?`${days} j`:`${hours} h`}`:days?`Dans ${days} j`:`Dans ${hours} h`;
}

async function api(url,options={}){
  const headers={Accept:'application/json',...(options.headers||{})};
  if(options.body)headers['Content-Type']='application/json';
  if(options.method&&options.method!=='GET')headers['X-CSRF-Token']=sessionStorage.getItem('neptune_csrf')||'';
  const response=await fetch(url,{...options,headers,credentials:'same-origin'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||`http_${response.status}`);
  return data;
}

function actionCard(order){
  const deadline=deadlineFor(order);
  const next=nextStatuses[order.status];
  const needsDate=order.status==='preparation_complete'&&!order.filmingAt;
  return `<article class="exception-card">
    <div class="exception-dot"></div>
    <div class="exception-copy"><strong>${escapeHtml(order.fullName||order.email)}</strong><p>${escapeHtml(statusLabels[order.status]||order.status)} · ${escapeHtml(order.format||'Format')}</p><small>${escapeHtml(order.nextAction||'Une validation suffit pour poursuivre automatiquement.')}</small></div>
    ${deadline?`<span class="exception-deadline ${deadline<Date.now()?'late':''}">${escapeHtml(remainingLabel(deadline))}</span>`:''}
    ${next&&!needsDate?`<button data-exception-advance="${escapeHtml(order.id)}">${escapeHtml(nextLabels[order.status]||'Valider')}</button>`:`<a href="#${encodeURIComponent(order.id)}">Vérifier</a>`}
  </article>`;
}

function renderOverview(portal){
  const orders=portal.orders||[];
  const active=orders.filter((order)=>order.status!=='completed');
  const actions=active.filter(requiresAction).sort((a,b)=>(deadlineFor(a)?.getTime()??Infinity)-(deadlineFor(b)?.getTime()??Infinity));
  const watched=active.filter(watching);
  const automatic=active.filter((order)=>!requiresAction(order)&&!watching(order));
  const overview=document.getElementById('automationOverview');
  if(!overview)return;

  const heroTitle=document.querySelector('.clients-hero-copy h1');
  const heroText=document.querySelector('.clients-hero-copy>p:last-child');
  if(heroTitle)heroTitle.innerHTML='Neptune surveille.<br><span>Vous validez l’exception.</span>';
  if(heroText)heroText.textContent='Les parcours avancent automatiquement. Cet écran ne remonte que les éléments qui méritent réellement votre attention.';

  const stats=document.querySelectorAll('.stats>div');
  if(stats[0])stats[0].innerHTML=`<b>${actions.length}</b><span>actions</span>`;
  if(stats[1])stats[1].innerHTML=`<b>${watched.length}</b><span>à surveiller</span>`;
  if(stats[2])stats[2].innerHTML=`<b>${automatic.length}</b><span>automatiques</span>`;

  overview.className=`automation-overview ${actions.length?'has-actions':'is-clear'}`;
  overview.innerHTML=`<div class="automation-overview-head">
    <div class="automation-status-mark"><span>${actions.length||'✓'}</span></div>
    <div><p class="eyebrow">SURVEILLANCE AUTOMATIQUE</p><h2>${actions.length?`${actions.length} validation${actions.length>1?'s':''} rapide${actions.length>1?'s':''}`:'Aucune action nécessaire'}</h2><p>${actions.length?'Traitez uniquement ces exceptions. Le reste du parcours continue sans intervention.':'Tous les dossiers avancent normalement. Le parcours complet reste disponible uniquement pour contrôle.'}</p></div>
    <div class="automation-duration"><small>Temps estimé</small><strong>${actions.length?`moins de ${Math.max(1,Math.ceil(actions.length/3))} min`:'0 minute'}</strong></div>
  </div>
  <div class="exception-list">${actions.length?actions.slice(0,8).map(actionCard).join(''):'<div class="automation-clear"><span>✓</span><strong>Tout est sous contrôle</strong><p>Aucun client ne nécessite de validation ou de correction.</p></div>'}</div>`;
  bindActions();
}

function bindActions(){
  document.querySelectorAll('[data-exception-advance]').forEach((button)=>button.addEventListener('click',async()=>{
    button.disabled=true;button.textContent='Validation…';
    try{
      const portal=await api('/api/admin/clients');
      const order=(portal.orders||[]).find((item)=>item.id===button.dataset.exceptionAdvance);
      const status=nextStatuses[order?.status];
      if(!order||!status)throw new Error('invalid_order');
      await api('/api/admin/client-update',{method:'POST',body:JSON.stringify({orderId:order.id,status,appointmentAt:order.appointmentAt,filmingAt:order.filmingAt,preparationUrl:order.preparationUrl})});
      location.reload();
    }catch{button.disabled=false;button.textContent='Réessayer';}
  }));
}

function prepareExceptionFirstLayout(){
  const main=document.querySelector('.clients-main');
  const controls=document.querySelector('.controls');
  const pipeline=document.getElementById('pipeline');
  if(!main||!controls||!pipeline||document.getElementById('automationOverview'))return;
  const overview=document.createElement('section');
  overview.id='automationOverview';
  overview.className='automation-overview';
  overview.innerHTML='<div class="automation-clear"><strong>Vérification du Studio…</strong></div>';
  controls.before(overview);

  const details=document.createElement('details');
  details.className='full-monitoring';
  if(location.hash)details.open=true;
  const summary=document.createElement('summary');
  summary.innerHTML='<span><b>Voir tous les parcours</b><small>Kanban complet, recherche et accès aux dossiers</small></span><i>＋</i>';
  details.append(summary,controls,pipeline);
  main.append(details);
}

async function initialise(){
  prepareExceptionFirstLayout();
  try{renderOverview(await api('/api/admin/clients'));}catch{}
}

window.addEventListener('DOMContentLoaded',()=>setTimeout(initialise,80));
setTimeout(initialise,180);
