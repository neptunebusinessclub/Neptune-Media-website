const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const ADVANCED_TABS=new Set(['episodes','programs','insights','finances','ads','users','ai','audit','settings']);
const ROLE_LABELS={admin:'Administrateur',editor:'Production',analyst:'Analyse'};
let csrfToken=sessionStorage.getItem('neptune_csrf')||'';
let snapshot=null;
let refreshTimer=null;
let toastTimer=null;
let pendingUndoId='';

redirectLegacyHash();
bind();
load();

function redirectLegacyHash(){
  const hash=decodeURIComponent(location.hash.slice(1));
  if(ADVANCED_TABS.has(hash))location.replace(`/studio/advanced.html#${encodeURIComponent(hash)}`);
}

function bind(){
  const resetToken=new URLSearchParams(location.search).get('reset');
  if(resetToken){
    $('#confirmField').hidden=false;
    $('#passwordField span').textContent='Nouveau mot de passe';
    $('#loginSubmit').textContent='Enregistrer mon mot de passe';
    $('#requestReset').hidden=true;
    $('#authHint').textContent='Choisissez au moins 12 caractères. Ce lien ne fonctionne qu’une fois.';
  }
  $('#login').addEventListener('submit',async(event)=>{
    event.preventDefault();
    const form=new FormData(event.currentTarget),button=$('#loginSubmit');
    button.disabled=true;$('#authMsg').textContent='Connexion sécurisée…';
    try{
      if(resetToken){
        if(form.get('password')!==form.get('confirmPassword'))throw new Error('passwords_do_not_match');
        await api('/api/auth/reset-password',{method:'POST',body:JSON.stringify({token:resetToken,password:form.get('password')})},false);
        history.replaceState({},'','/studio/');
      }
      const result=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:form.get('email'),password:form.get('password')})},false);
      csrfToken=result.csrfToken||'';sessionStorage.setItem('neptune_csrf',csrfToken);await load();
    }catch(error){
      $('#authMsg').textContent=humanError(error.message);$('#authMsg').className='message error';
    }finally{button.disabled=false;}
  });
  $('#requestReset').addEventListener('click',async()=>{
    const button=$('#requestReset');button.disabled=true;$('#authMsg').textContent='Envoi du lien sécurisé…';
    try{
      const email=String($('#login [name=email]').value||'contact@neptunebusiness.com').trim().toLowerCase();
      await api('/api/auth/request-reset',{method:'POST',body:JSON.stringify({email})},false);
      $('#authMsg').textContent='Lien envoyé. Il expire dans 20 minutes.';$('#authMsg').className='message success';
    }catch(error){
      $('#authMsg').textContent=humanError(error.message);$('#authMsg').className='message error';
    }finally{button.disabled=false;}
  });
  $('#logout').addEventListener('click',logout);
  $('#refresh').addEventListener('click',()=>load({manual:true}));
  $('#toastUndo').addEventListener('click',undoLastAction);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){clearTimeout(refreshTimer);return;}
    scheduleRefresh(500);
  });
}

async function load({manual=false}={}){
  clearTimeout(refreshTimer);setSync(manual?'Contrôle approfondi…':'Vérification…');
  try{
    const auth=await api('/api/auth/status',{},false);
    csrfToken=auth.csrfToken||csrfToken;sessionStorage.setItem('neptune_csrf',csrfToken);
    $('#auth').hidden=true;$('#app').hidden=false;
    const role=auth.user?.role||'analyst';
    $('#accountName').textContent=auth.user?.fullName||auth.user?.email||'Neptune Media';
    $('#accountRole').textContent=ROLE_LABELS[role]||role;
    $('#roleBadge').textContent=ROLE_LABELS[role]||role;

    let reconcileWarning='';
    if(manual){
      try{await api('/api/admin/autopilot/reconcile',{method:'POST',body:'{}'});}
      catch(error){reconcileWarning=error.message;}
    }

    snapshot=await api('/api/admin/control-room');
    if(reconcileWarning)snapshot.health=[{id:'manual_reconcile',label:'Vérification approfondie',level:'warning',detail:`La lecture reste disponible, mais la réconciliation a échoué (${reconcileWarning}).`},...(snapshot.health||[])];
    render(snapshot);
    setSync(snapshot.degraded?'Mode sécurisé':manual?'Vérifié maintenant':'Synchronisé',Boolean(snapshot.degraded));
    scheduleRefresh(90000);
  }catch(error){
    if(['unauthorized','http_401'].includes(error.message)){
      $('#auth').hidden=false;$('#app').hidden=true;$('#authMsg').textContent='';return;
    }
    setSync('Contrôle indisponible',true);
    const diagnostic=[error.message,error.stage,error.status].filter(Boolean).join(' · ');
    $('#content').innerHTML=`<div class="loading-card"><strong>Impossible de vérifier le Studio</strong><p>${esc(humanError(error.message))}</p><small>Diagnostic : ${esc(diagnostic||'erreur inconnue')}</small><button class="secondary" type="button" data-retry>Réessayer</button></div>`;
    $('[data-retry]')?.addEventListener('click',()=>load({manual:true}));
  }
}

function render(data){
  const actions=data.actions||[],health=data.health||[];
  const systemIssues=health.filter((item)=>item.level!=='ok').length;
  const totalAttention=actions.length+systemIssues;
  const critical=actions.filter((item)=>item.severity==='critical').length+health.filter((item)=>item.level==='error').length;
  const stateClass=critical?'error':totalAttention?'attention':'ok';
  const stateTitle=critical?`${totalAttention} point${totalAttention>1?'s':''} à sécuriser`:totalAttention?`${totalAttention} élément${totalAttention>1?'s':''} à vérifier`:'Tout fonctionne. Rien à faire.';
  const stateText=data.degraded
    ? 'Les données clients restent accessibles. Le moteur principal est isolé en mode sécurisé et apparaît dans la santé du système.'
    : totalAttention
      ? 'Le Studio a isolé uniquement les exceptions qui nécessitent une décision humaine. Tout le reste continue automatiquement.'
      : 'Les parcours, les délais, les e-mails et les intégrations sont surveillés. Vous pouvez fermer le Studio.';
  const estimatedMinutes=actions.length?Math.max(1,Math.ceil(actions.length/3)):0,summary=data.summary||{};
  $('#content').innerHTML=`<div class="control-grid">
    <section class="state-hero ${stateClass}"><div class="state-signal"><strong>${totalAttention||'✓'}</strong></div><div class="state-copy"><p class="eyebrow">COMPRÉHENSIBLE EN QUELQUES SECONDES</p><h2>${esc(stateTitle)}</h2><p>${esc(stateText)}</p></div><div class="time-card"><small>Temps estimé</small><strong>${estimatedMinutes?`moins de ${estimatedMinutes} min`:'0 minute'}</strong><span>${esc(formatGeneratedAt(data.generatedAt))}</span></div></section>
    <section class="summary-grid" aria-label="Résumé du Studio">${summaryCard(summary.actions||0,'Actions humaines','seulement les exceptions','!',summary.actions?'warning':'automatic')}${summaryCard(summary.watching||0,'À surveiller','échéances proches','◷','warning')}${summaryCard(summary.automatic||0,'Autonomes','aucune intervention','↻','automatic')}${summaryCard(summary.production||0,'En production','traitement en cours','▶','production')}</section>
    <section class="section-card"><header class="section-head"><div><p class="eyebrow">EXCEPTIONS UNIQUEMENT</p><h3>${actions.length?'À traiter maintenant':'Aucune action humaine'}</h3><p>${actions.length?'Chaque carte explique la raison, la conséquence du clic et le risque de ne rien faire.':'Aucun client, paiement ou système ne nécessite votre intervention.'}</p></div><a href="/studio/clients">Surveillance complète</a></header><div class="action-list">${actions.length?actions.map(actionCard).join(''):emptyState()}</div></section>
    <div class="lower-grid"><section class="section-card"><header class="section-head"><div><p class="eyebrow">PROCHAINS POINTS DE CONTRÔLE</p><h3>Ce qui arrive ensuite</h3><p>Rendez-vous et passages déjà planifiés.</p></div><a href="/studio/clients#calendrier">Calendrier</a></header><div class="event-list">${(data.upcoming||[]).length?data.upcoming.map(eventCard).join(''):'<div class="empty-state"><span>✓</span><strong>Aucun rendez-vous imminent</strong><p>Le calendrier ne demande aucune surveillance particulière.</p></div>'}</div></section>
    <section class="section-card"><header class="section-head"><div><p class="eyebrow">SANTÉ DU SYSTÈME</p><h3>Intégrations surveillées</h3><p>Une panne technique apparaît ici avant de bloquer l’équipe.</p></div><a href="/studio/advanced.html#settings">Réglages</a></header><div class="health-list">${health.length?health.map(healthCard).join(''):'<div class="empty-state"><span>◷</span><strong>Diagnostic en attente</strong></div>'}</div></section></div>
    <section class="section-card"><header class="section-head"><div><p class="eyebrow">AUTOMATISATIONS RÉCENTES</p><h3>Ce que Neptune a fait seul</h3><p>Les transitions automatiques restent visibles sans demander d’action.</p></div><a href="/studio/advanced.html#audit">Journal complet</a></header><div class="automation-log">${(data.recentAutomation||[]).length?data.recentAutomation.map(automationCard).join(''):'<div class="empty-state"><span>↻</span><strong>Aucune transition récente</strong><p>Les prochaines automatisations apparaîtront ici.</p></div>'}</div></section>
  </div>`;
  bindRenderedActions();
}

function summaryCard(value,label,detail,icon,className=''){return `<article class="summary-card ${className}"><span class="summary-icon">${icon}</span><div><small>${esc(label)}</small><strong>${Number(value||0)}</strong><span>${esc(detail)}</span></div></article>`;}
function actionCard(item){
  const deadline=item.deadline?deadlineLabel(item.deadline):'';
  const primary=item.href
    ?`<a class="primary" href="${safeHref(item.href)}">${esc(item.actionLabel||'Ouvrir')}</a>`
    :item.actionKey&&item.canAct
      ?`<button class="primary" type="button" data-prepare-action="${esc(item.id)}">${esc(item.actionLabel||'Valider')}</button>`
      :`<a class="secondary" href="/studio/clients${item.orderId?`#${encodeURIComponent(item.orderId)}`:''}">Consulter</a>`;
  return `<article class="action-card ${item.severity==='critical'?'critical':''}" data-action-card="${esc(item.id)}"><div class="action-main"><span class="action-dot"></span><div class="action-copy"><strong>${esc(item.title)}</strong><span>${esc(item.subtitle||'Neptune Media')}</span></div>${deadline?`<span class="deadline ${isPast(item.deadline)?'late':''}">${esc(deadline)}</span>`:''}</div><div class="action-explanation"><div class="explain"><b>Pourquoi maintenant</b><p>${esc(item.reason||'Une vérification humaine est nécessaire.')}</p></div><div class="explain"><b>Après votre clic</b><p>${esc(item.consequence||'Le parcours continuera automatiquement.')}</p></div><div class="explain"><b>Sans action</b><p>${esc(item.inaction||'Le dossier restera en attente.')}</p></div></div><div class="action-footer">${primary}</div><div class="action-confirm" data-confirm-box hidden><p><strong>Confirmer cette décision ?</strong><br>${esc(item.consequence||'Le parcours sera mis à jour et le client pourra être informé.')}</p><div><button class="secondary" type="button" data-cancel-action>Annuler</button><button class="danger-confirm" type="button" data-run-action="${esc(item.id)}">Confirmer</button></div></div></article>`;
}
function eventCard(item){return `<a class="event-item" href="/studio/clients#${encodeURIComponent(item.orderId)}"><time>${esc(formatDate(item.at))}</time><div><strong>${esc(item.type)}</strong><span>${esc(item.client)}${item.format?` · ${esc(item.format)}`:''}</span></div><i>→</i></a>`;}
function healthCard(item){const mark=item.level==='ok'?'✓':item.level==='error'?'!':'◷';return `<article class="health-item ${esc(item.level)}"><span class="health-mark">${mark}</span><div><strong>${esc(item.label)}</strong><small>${esc(item.detail)}</small></div></article>`;}
function automationCard(item){return `<article class="automation-item"><span>✓</span><div><strong>${esc(item.client)} · ${esc(statusLabel(item.toStatus))}</strong><small>${esc(statusLabel(item.fromStatus))} → ${esc(statusLabel(item.toStatus))}</small></div><time>${esc(relativeTime(item.createdAt))}</time></article>`;}
function emptyState(){return '<div class="empty-state"><span>✓</span><strong>Tout est sous contrôle</strong><p>Aucun retard, aucune validation et aucune demande administrative ne nécessitent votre attention.</p></div>';}

function bindRenderedActions(){
  $$('[data-prepare-action]').forEach((button)=>button.addEventListener('click',()=>{const card=button.closest('[data-action-card]');card.querySelector('[data-confirm-box]').hidden=false;button.hidden=true;}));
  $$('[data-cancel-action]').forEach((button)=>button.addEventListener('click',()=>{const card=button.closest('[data-action-card]');card.querySelector('[data-confirm-box]').hidden=true;card.querySelector('[data-prepare-action]')?.removeAttribute('hidden');}));
  $$('[data-run-action]').forEach((button)=>button.addEventListener('click',()=>runAction(button.dataset.runAction,button)));
}

async function runAction(actionId,button){
  const item=(snapshot?.actions||[]).find((entry)=>entry.id===actionId);if(!item)return;
  button.disabled=true;button.textContent='Validation…';
  try{
    if(item.type==='supplier'){
      await api('/api/admin/supplier-payment',{method:'POST',body:JSON.stringify({paymentId:item.paymentId})});
      showToast('Paiement fournisseur marqué comme effectué.');
    }else{
      if(item.externalUrl)window.open(item.externalUrl,'_blank','noopener');
      const result=await api('/api/admin/autopilot/action',{method:'POST',body:JSON.stringify({orderId:item.orderId,action:item.actionKey})});
      showToast(result.warning?'Étape validée, mais l’e-mail doit être contrôlé.':'Décision validée. Le parcours continue automatiquement.',false,result.historyId||'');
    }
    await load();
  }catch(error){showToast(humanError(error.message),true);button.disabled=false;button.textContent='Réessayer';}
}
async function undoLastAction(){
  if(!pendingUndoId)return;const button=$('#toastUndo');button.disabled=true;
  try{
    const result=await api('/api/admin/autopilot/undo',{method:'POST',body:JSON.stringify({historyId:pendingUndoId})});
    pendingUndoId='';showToast(result.warning?'Action annulée, e-mail à contrôler.':'Action annulée. Le dossier est revenu à l’état précédent.');await load();
  }catch(error){showToast(humanError(error.message),true);}finally{button.disabled=false;}
}
async function logout(){await api('/api/auth/logout',{method:'POST'},false).catch(()=>{});sessionStorage.removeItem('neptune_csrf');location.reload();}
function scheduleRefresh(delay){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{if(!document.hidden&&!$('[data-confirm-box]:not([hidden])'))load();},delay);}
function setSync(text,error=false){$('#syncState span').textContent=text;$('#syncState').classList.toggle('error',error);}
function showToast(text,error=false,undoId=''){clearTimeout(toastTimer);pendingUndoId=undoId;$('#toastText').textContent=text;$('#toast').className=`toast${error?' error':''}`;$('#toast').hidden=false;$('#toastUndo').hidden=!undoId;toastTimer=setTimeout(()=>{$('#toast').hidden=true;pendingUndoId='';},undoId?300000:4200);}
async function api(url,options={},addCsrf=true){
  const headers={Accept:'application/json',...(options.headers||{})};if(options.body)headers['Content-Type']='application/json';if(addCsrf)headers['X-CSRF-Token']=csrfToken;
  const response=await fetch(url,{...options,headers,credentials:'same-origin'});const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(data.error||`http_${response.status}`);error.status=response.status;error.stage=data.stage||'';throw error;}
  return data;
}
function deadlineLabel(value){const date=new Date(value);if(Number.isNaN(date.getTime()))return '';const ms=date.getTime()-Date.now(),abs=Math.abs(ms),days=Math.floor(abs/86400000),hours=Math.max(1,Math.ceil((abs%86400000)/3600000));return ms<0?`Retard ${days?`${days} j`:`${hours} h`}`:days?`J-${days}`:`${hours} h`;}
function formatDate(value){const date=new Date(value||'');return Number.isNaN(date.getTime())?'Date à vérifier':new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short'}).format(date);}
function formatGeneratedAt(value){return value?`Vérifié ${relativeTime(value)}`:'Mise à jour automatique';}
function relativeTime(value){const date=new Date(value||'');if(Number.isNaN(date.getTime()))return 'récemment';const minutes=Math.max(0,Math.round((Date.now()-date.getTime())/60000));if(minutes<2)return 'à l’instant';if(minutes<60)return `il y a ${minutes} min`;return `il y a ${Math.round(minutes/60)} h`;}
function statusLabel(status){return ({payment_confirmed:'Paiement reçu',reservation_confirmed:'Rendez-vous à réserver',preparation_booking_pending:'Rendez-vous à réserver',appointment_confirmed:'Préparation réservée',appointment_booked:'Préparation réservée',preparation:'Préparation en cours',studio_date_confirmation_pending:'Date à confirmer',preparation_complete:'Préparation terminée',filming_scheduled:'Passage confirmé',filming_confirmed:'Passage confirmé',filmed:'Passage réalisé',videos_pending:'Vidéos attendues',videos_received:'Vidéos reçues',editing:'Montage en cours',approval:'Validation en cours',delivered:'Livré',completed:'Terminé'})[status]||status||'En cours';}
function safeHref(value){const text=String(value||'');return text.startsWith('/studio/')||/^https:\/\//u.test(text)?esc(text):'/studio/';}
function isPast(value){const date=new Date(value||'');return !Number.isNaN(date.getTime())&&date.getTime()<Date.now();}
function humanError(code){return ({passwords_do_not_match:'Les mots de passe ne correspondent pas.',invalid_credentials:'Identifiants incorrects.',too_many_attempts:'Trop de tentatives. Réessayez plus tard.',csrf_failed:'La session a expiré. Rechargez la page.',unauthorized:'Votre session a expiré.',forbidden:'Votre rôle permet uniquement la consultation.',action_not_available:'Cette action n’est plus disponible : le dossier a déjà évolué.',undo_unavailable:'Cette action ne peut plus être annulée.',undo_expired:'Le délai d’annulation de 5 minutes est dépassé.',undo_conflict:'Le dossier a évolué depuis cette action.',email_service_not_configured:'Resend n’est pas configuré.',email_send_failed:'La mise à jour est enregistrée, mais l’e-mail n’a pas été envoyé.',supplier_payment_not_found:'Ce paiement fournisseur est introuvable.',control_room_unavailable:'Le diagnostic principal et son parcours de secours sont indisponibles.',internal_error:'Le moteur de contrôle a rencontré une erreur interne.'})[code]||'Une erreur est survenue. Réessayez.';}
function esc(value){return String(value??'').replace(/[&<>"']/gu,(character)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));}
