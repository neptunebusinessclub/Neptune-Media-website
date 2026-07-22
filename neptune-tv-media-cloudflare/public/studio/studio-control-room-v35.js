const $=(selector,root=document)=>root.querySelector(selector);
const escapeHtml=(value)=>String(value??'').replace(/[&<>"']/gu,(character)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

const nextStatuses={
  payment_confirmed:'reservation_confirmed',reservation_confirmed:'appointment_confirmed',preparation_booking_pending:'appointment_confirmed',
  appointment_confirmed:'studio_date_confirmation_pending',appointment_booked:'studio_date_confirmation_pending',preparation:'preparation_complete',
  studio_date_confirmation_pending:'preparation_complete',preparation_complete:'filming_scheduled',filming_scheduled:'filmed',filming_confirmed:'filmed',
  filmed:'videos_pending',videos_pending:'videos_received',videos_received:'editing',editing:'delivered',approval:'delivered',delivered:'completed'
};
const nextLabels={
  studio_date_confirmation_pending:'Confirmer la préparation',preparation_complete:'Confirmer le passage',filming_scheduled:'Marquer le passage réalisé',
  filming_confirmed:'Marquer le passage réalisé',filmed:'Attendre les vidéos',videos_pending:'Confirmer la réception',videos_received:'Lancer le traitement',
  editing:'Confirmer la livraison',approval:'Confirmer la livraison',delivered:'Clôturer le dossier'
};
const statusLabels={
  payment_confirmed:'Paiement reçu',reservation_confirmed:'Rendez-vous à réserver',preparation_booking_pending:'Rendez-vous à réserver',
  appointment_confirmed:'Préparation réservée',appointment_booked:'Préparation réservée',preparation:'Préparation en cours',
  studio_date_confirmation_pending:'Date à confirmer',preparation_complete:'Préparation terminée',filming_scheduled:'Passage confirmé',
  filming_confirmed:'Passage confirmé',filmed:'Passage réalisé',videos_pending:'Vidéos attendues',videos_received:'Vidéos reçues',
  editing:'Traitement en cours',approval:'Validation en cours',delivered:'Livré',completed:'Terminé'
};
const manualStatuses=new Set(['studio_date_confirmation_pending','preparation_complete','filmed','videos_pending','videos_received','editing','approval','delivered']);

let renderToken=0;
let busy=false;
const content=document.getElementById('content');
const title=document.getElementById('title');

function isDashboard(){
  return Boolean(document.querySelector('[data-tab="dashboard"].active')) || (!location.hash && title?.textContent.trim()==='Aujourd’hui');
}

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

function isWatching(order){
  if(requiresAction(order))return false;
  const deadline=deadlineFor(order);
  return Boolean(deadline&&deadline-Date.now()<7*86400000);
}

function remainingLabel(deadline){
  if(!deadline)return '';
  const ms=deadline-Date.now(),abs=Math.abs(ms),days=Math.floor(abs/86400000),hours=Math.max(1,Math.ceil((abs%86400000)/3600000));
  return ms<0?`En retard de ${days?`${days} j`:`${hours} h`}`:days?`Dans ${days} j`:`Dans ${hours} h`;
}

function formatDate(value){
  if(!value)return '—';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(date);
}

function formatCurrency(cents){
  return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(cents||0)/100);
}

async function api(url,options={}){
  const headers={Accept:'application/json',...(options.headers||{})};
  if(options.body)headers['Content-Type']='application/json';
  const csrf=sessionStorage.getItem('neptune_csrf')||'';
  if(options.method&&options.method!=='GET')headers['X-CSRF-Token']=csrf;
  const response=await fetch(url,{...options,headers,credentials:'same-origin'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||`http_${response.status}`);
  return data;
}

function orderActionCard(order){
  const deadline=deadlineFor(order);
  const needsDate=order.status==='preparation_complete'&&!order.filmingAt;
  const next=nextStatuses[order.status];
  const canAdvance=next&&!needsDate;
  return `<article class="control-action-card">
    <div class="control-action-status"><i></i><span>VALIDATION RAPIDE</span></div>
    <div class="control-action-copy">
      <strong>${escapeHtml(order.fullName||order.email)}</strong>
      <p>${escapeHtml(statusLabels[order.status]||order.status)} · ${escapeHtml(order.format||'Format')}</p>
      <small>${escapeHtml(order.nextAction||'Vérifier puis valider cette étape.')}</small>
    </div>
    ${deadline?`<span class="control-deadline ${deadline<Date.now()?'late':''}">${escapeHtml(remainingLabel(deadline))}</span>`:''}
    ${canAdvance?`<button class="control-action-button" data-control-advance="${escapeHtml(order.id)}">${escapeHtml(nextLabels[order.status]||'Valider')}</button>`:`<a class="control-action-button" href="/studio/clients#${encodeURIComponent(order.id)}">Vérifier</a>`}
  </article>`;
}

function requestCard(label,count,tab='finances'){
  if(!count)return '';
  return `<article class="control-action-card">
    <div class="control-action-status"><i></i><span>ACTION REQUISE</span></div>
    <div class="control-action-copy"><strong>${count} ${escapeHtml(label)}</strong><p>Une décision administrative est nécessaire.</p><small>Le dossier complet est prêt à être vérifié.</small></div>
    <a class="control-action-button" href="/studio/#${tab}">Ouvrir</a>
  </article>`;
}

function supplierCard(payment){
  return `<article class="control-action-card">
    <div class="control-action-status"><i></i><span>PAIEMENT À VALIDER</span></div>
    <div class="control-action-copy"><strong>${escapeHtml(payment.fullName||payment.company||payment.title||'Fournisseur')}</strong><p>${formatCurrency(payment.amountTotal)} · ${escapeHtml(payment.title||'Prestation studio')}</p><small>Un clic suffit après vérification du paiement.</small></div>
    <button class="control-action-button" data-control-pay="${escapeHtml(payment.id)}">Marquer payé</button>
  </article>`;
}

function upcomingEvents(orders){
  const now=Date.now();
  return orders.flatMap((order)=>[
    order.appointmentAt?{date:new Date(order.appointmentAt),type:'Préparation',order}:null,
    order.filmingAt?{date:new Date(order.filmingAt),type:'Passage studio',order}:null
  ].filter(Boolean)).filter((item)=>item.date.getTime()>=now).sort((a,b)=>a.date-b.date).slice(0,4);
}

function renderControlRoom(portal){
  if(!isDashboard())return;
  const orders=portal.orders||[];
  const active=orders.filter((order)=>order.status!=='completed');
  const actionOrders=active.filter(requiresAction).sort((a,b)=>(deadlineFor(a)?.getTime()??Infinity)-(deadlineFor(b)?.getTime()??Infinity));
  const watching=active.filter(isWatching);
  const automatic=active.filter((order)=>!requiresAction(order)&&!isWatching(order));
  const duePayments=(portal.supplierPayments||[]).filter((payment)=>payment.status==='due');
  const refundCount=(portal.refundRequests||[]).filter((item)=>item.status==='pending').length;
  const deletionCount=(portal.deletionRequests||[]).filter((item)=>item.status==='pending').length;
  const totalActions=actionOrders.length+duePayments.length+refundCount+deletionCount;
  const events=upcomingEvents(active);
  const inProduction=active.filter((order)=>['filmed','videos_pending','videos_received','editing','approval'].includes(order.status)).length;
  const stateClass=totalActions?'action':'ok';
  const stateTitle=totalActions?`${totalActions} validation${totalActions>1?'s':''} rapide${totalActions>1?'s':''}`:'Vous n’avez rien à faire';
  const stateText=totalActions?'Tout le reste continue automatiquement. Traitez uniquement les exceptions ci-dessous.':'Neptune surveille les parcours, les délais et les prochaines étapes. Revenez seulement lorsqu’une exception apparaît.';
  const actionMarkup=[...actionOrders.slice(0,6).map(orderActionCard),...duePayments.slice(0,3).map(supplierCard),requestCard('demande de remboursement',refundCount),requestCard('demande de suppression',deletionCount)].join('');
  title.textContent='Contrôle automatique';
  content.innerHTML=`<div class="control-room" data-control-room>
    <section class="control-hero control-hero--${stateClass}">
      <div class="control-signal"><span>${totalActions||'✓'}</span><i></i></div>
      <div class="control-hero-copy"><p class="eyebrow">ÉTAT DU STUDIO EN TEMPS RÉEL</p><h2>${stateTitle}</h2><p>${stateText}</p></div>
      <div class="control-time"><small>Temps estimé</small><strong>${totalActions?`moins de ${Math.max(1,Math.ceil(totalActions/3))} min`:'0 minute'}</strong><span>Mise à jour automatique</span></div>
    </section>

    <section class="control-health" aria-label="État général">
      <article><span class="health-icon health-icon--ok">✓</span><div><small>PARCOURS ACTIFS</small><strong>${active.length}</strong><p>suivis automatiquement</p></div></article>
      <article><span class="health-icon health-icon--watch">◷</span><div><small>À SURVEILLER</small><strong>${watching.length}</strong><p>échéances proches</p></div></article>
      <article><span class="health-icon health-icon--auto">↻</span><div><small>SANS INTERVENTION</small><strong>${automatic.length}</strong><p>parcours autonomes</p></div></article>
      <article><span class="health-icon health-icon--production">▶</span><div><small>EN PRODUCTION</small><strong>${inProduction}</strong><p>contenus en traitement</p></div></article>
    </section>

    <section class="control-section ${totalActions?'':'control-section--quiet'}">
      <header><div><p class="eyebrow">EXCEPTIONS UNIQUEMENT</p><h3>${totalActions?'À valider maintenant':'Aucune exception détectée'}</h3></div><a href="/studio/clients">Voir la surveillance complète</a></header>
      <div class="control-actions">${actionMarkup||'<div class="control-empty"><span>✓</span><strong>Tout fonctionne normalement</strong><p>Aucune validation, aucun retard et aucune demande administrative ne nécessitent votre attention.</p></div>'}</div>
    </section>

    <div class="control-lower-grid">
      <section class="control-section control-radar">
        <header><div><p class="eyebrow">PROCHAINS POINTS DE CONTRÔLE</p><h3>Les 7 prochains jours</h3></div><a href="/studio/clients#calendrier">Calendrier</a></header>
        <div class="control-events">${events.length?events.map((item)=>`<a href="/studio/clients#${encodeURIComponent(item.order.id)}"><time>${escapeHtml(formatDate(item.date))}</time><div><strong>${escapeHtml(item.type)}</strong><span>${escapeHtml(item.order.fullName||item.order.email)} · ${escapeHtml(item.order.format||'Format')}</span></div><i>→</i></a>`).join(''):'<div class="control-empty control-empty--small"><span>✓</span><strong>Aucun rendez-vous imminent</strong><p>Le calendrier ne demande aucune surveillance particulière.</p></div>'}</div>
      </section>

      <section class="control-section control-automation">
        <header><div><p class="eyebrow">CE QUE NEPTUNE GÈRE</p><h3>Automatisation active</h3></div></header>
        <div class="automation-list"><div><i>✓</i><span><strong>Délais calculés</strong><small>Les échéances et retards sont détectés automatiquement.</small></span></div><div><i>✓</i><span><strong>Clients informés</strong><small>Chaque validation déclenche les communications prévues.</small></span></div><div><i>✓</i><span><strong>Parcours synchronisés</strong><small>Le Studio et l’espace client restent alignés.</small></span></div></div>
      </section>
    </div>
  </div>`;
  bindControlActions();
}

function showToast(message,error=false){
  const toast=document.getElementById('toast');
  if(!toast)return;
  toast.textContent=message;
  toast.className=`toast${error?' error':''}`;
  toast.hidden=false;
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(()=>toast.hidden=true,3500);
}

async function refreshControlRoom(){
  if(busy||!isDashboard())return;
  busy=true;
  const token=++renderToken;
  try{
    const portal=await api('/api/admin/clients');
    if(token===renderToken&&isDashboard())renderControlRoom(portal);
  }catch(error){
    if(content&&!content.querySelector('[data-control-room]'))content.innerHTML='<div class="control-empty"><strong>Impossible de vérifier le Studio</strong><p>Actualisez la page ou reconnectez-vous.</p></div>';
  }finally{busy=false;}
}

function bindControlActions(){
  document.querySelectorAll('[data-control-advance]').forEach((button)=>button.addEventListener('click',async()=>{
    const portal=await api('/api/admin/clients');
    const order=(portal.orders||[]).find((item)=>item.id===button.dataset.controlAdvance);
    const status=nextStatuses[order?.status];
    if(!order||!status)return;
    button.disabled=true;button.textContent='Validation…';
    try{
      const result=await api('/api/admin/client-update',{method:'POST',body:JSON.stringify({orderId:order.id,status,appointmentAt:order.appointmentAt,filmingAt:order.filmingAt,preparationUrl:order.preparationUrl})});
      showToast(result.warning?'Étape enregistrée. La communication doit être vérifiée.':'Validé. Le parcours continue automatiquement.');
      await refreshControlRoom();
    }catch{showToast('La validation a échoué. Ouvrez le dossier client.',true);button.disabled=false;}
  }));
  document.querySelectorAll('[data-control-pay]').forEach((button)=>button.addEventListener('click',async()=>{
    button.disabled=true;button.textContent='Validation…';
    try{await api('/api/admin/supplier-payment',{method:'POST',body:JSON.stringify({paymentId:button.dataset.controlPay})});showToast('Paiement marqué comme effectué.');await refreshControlRoom();}
    catch{showToast('Impossible de valider le paiement.',true);button.disabled=false;}
  }));
}

const observer=new MutationObserver(()=>{
  if(!isDashboard()||content?.querySelector('[data-control-room]'))return;
  clearTimeout(observer.timer);
  observer.timer=setTimeout(refreshControlRoom,40);
});
if(content)observer.observe(content,{childList:true});
document.addEventListener('click',(event)=>{if(event.target.closest('[data-tab="dashboard"]'))setTimeout(refreshControlRoom,60);},{capture:true});
window.addEventListener('focus',()=>{if(isDashboard())refreshControlRoom();});
setTimeout(refreshControlRoom,120);
