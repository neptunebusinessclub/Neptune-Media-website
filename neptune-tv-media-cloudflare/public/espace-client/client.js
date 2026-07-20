const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const BOOKING='https://media.neptunebusiness.com';
const BILLING='https://billing.stripe.com/p/login/5kQeVdelvgXw5ps4ia73G00';

const ICONS={
  reservation:'<path d="M7 3v3m10-3v3M4.5 9.5h15M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z"/><path d="m8.5 14 2 2 5-5"/>',
  preparation:'<path d="M12 3.5 13.9 8l4.6 1.9-4.6 1.9L12 16.5l-1.9-4.7-4.6-1.9L10.1 8 12 3.5Z"/><path d="m18.5 15 .9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z"/>',
  filming:'<path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h6A2.5 2.5 0 0 1 16 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-6A2.5 2.5 0 0 1 5 16.5v-9Z"/><path d="m16 10 4-2v8l-4-2v-4Z"/><circle cx="10.5" cy="11.5" r="2.5"/>',
  production:'<path d="M4 7h16M7 4v6m10-6v6M6.5 7v12h11V7"/><path d="m9 15 2 2 4-5"/>',
  delivery:'<path d="M4 6.5 12 3l8 3.5v10L12 21l-8-4.5v-10Z"/><path d="m4 6.5 8 4 8-4M12 10.5V21"/><path d="m8.5 15 2 2 4-4"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  lock:'<rect x="6" y="10" width="12" height="10" rx="2"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  file:'<path d="M7 3.5h7l4 4V20H7V3.5Z"/><path d="M14 3.5V8h4M10 12h5m-5 3h5"/>',
};

const PHASES=[
  {key:'reservation',label:'Réservation',hint:'Paiement et rendez-vous',done:'Votre réservation et votre rendez-vous sont enregistrés.',current:'Réservez ou vérifiez votre rendez-vous de préparation.',future:'Votre paiement et votre rendez-vous seront regroupés ici.'},
  {key:'preparation',label:'Préparation',hint:'Votre interview se construit',done:'Votre préparation est terminée et transmise à Neptune.',current:'Préparez votre passage et suivez la validation de la date.',future:'Vous préparerez votre intervention depuis un parcours guidé.'},
  {key:'filming',label:'Passage',hint:'Votre créneau studio',done:'Votre passage a bien été réalisé.',current:'Retrouvez la date confirmée et les informations utiles.',future:'Votre date et les informations de passage apparaîtront ici.'},
  {key:'production',label:'Production',hint:'Réception et montage',done:'Le traitement de vos contenus est terminé.',current:'Neptune réceptionne, monte et contrôle vos contenus.',future:'Vous suivrez la réception et le montage en temps réel.'},
  {key:'delivery',label:'Livraison',hint:'Vos contenus sont prêts',done:'Vos contenus sont livrés dans votre bibliothèque.',current:'Téléchargez vos contenus et préparez leur publication.',future:'Vos émissions, rushs et shorts seront réunis ici.'},
];

const STATUS={
  payment_confirmed:{label:'Paiement reçu',phase:0,progress:10},
  reservation_confirmed:{label:'Rendez-vous à réserver',phase:0,progress:18},
  preparation_booking_pending:{label:'Rendez-vous à réserver',phase:0,progress:18},
  appointment_confirmed:{label:'Préparation réservée',phase:1,progress:26},
  appointment_booked:{label:'Préparation réservée',phase:1,progress:26},
  preparation:{label:'Préparation en cours',phase:1,progress:34},
  studio_date_confirmation_pending:{label:'Date en attente de confirmation',phase:1,progress:42},
  preparation_complete:{label:'Préparation terminée',phase:1,progress:48},
  filming_scheduled:{label:'Passage confirmé',phase:2,progress:58},
  filming_confirmed:{label:'Passage confirmé',phase:2,progress:64},
  filmed:{label:'Passage réalisé',phase:2,progress:68},
  videos_pending:{label:'Vidéos du studio attendues',phase:3,progress:74},
  videos_received:{label:'Vidéos reçues par Neptune',phase:3,progress:82},
  editing:{label:'Vidéos en traitement',phase:3,progress:90},
  approval:{label:'Vidéos en traitement',phase:3,progress:94},
  delivered:{label:'Vidéos livrées',phase:4,progress:100},
  completed:{label:'Projet terminé',phase:4,progress:100},
};

let email='';
let state=null;
let view='tracking';
let activeOrderId='';
const selectedPhaseByOrder=new Map();

$('#accessForm').addEventListener('submit',async(event)=>{
  event.preventDefault();
  $('#codeStep').hidden?await requestCode():await verifyCode();
});
$('#changeEmail').addEventListener('click',reset);
$('#resendCode').addEventListener('click',requestCode);
$$('[data-logout]').forEach((button)=>button.addEventListener('click',logout));
$$('[data-view]').forEach((button)=>button.addEventListener('click',()=>setView(button.dataset.view)));

const query=new URLSearchParams(location.search).get('email');
if(query&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(query)){
  email=query.trim().toLowerCase();
  $('#email').value=email;
  showCodeStep('Saisissez le code reçu. Si vous n’en avez pas encore, demandez-en un nouveau.');
}
load();

async function load(){
  try{
    state=await api('/api/client/session');
    render();
  }catch{
    showAuth();
  }
}

async function requestCode(){
  email=String($('#email').value||email||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email))return message('Saisissez une adresse e-mail valide.','error');
  const button=$('#codeStep').hidden?$('#sendCode'):$('#resendCode');
  button.disabled=true;
  message('Envoi du code sécurisé…');
  try{
    const result=await api('/api/client/request-code',{method:'POST',body:JSON.stringify({email})});
    showCodeStep(`Code envoyé à ${maskEmail(email)}. Il expire dans 10 minutes.`);
    message(
      result.retryAfter?`Un code valide a déjà été envoyé. Réessayez dans ${result.retryAfter} secondes.`:
      result.throttled?'La limite d’envoi a été atteinte. Utilisez le dernier code reçu.':
      result.delivered||result.codeExpected?'Consultez votre boîte de réception et vos courriers indésirables.':
      'Si un espace client actif correspond à cette adresse, un code vient d’être envoyé.',
      'success',
    );
    $('#code').focus();
  }catch(error){
    message(errorText(error.message),'error');
  }finally{
    button.disabled=false;
  }
}

async function verifyCode(){
  const code=String($('#code').value||'').replace(/\D/gu,'').slice(0,6);
  if(code.length!==6)return message('Le code doit contenir 6 chiffres.','error');
  const button=$('#verifyCode');
  button.disabled=true;
  message('Vérification…');
  try{
    await api('/api/client/verify-code',{method:'POST',body:JSON.stringify({email,code})});
    history.replaceState({},'','/espace-client/');
    await load();
  }catch(error){
    message(errorText(error.message),'error');
    $('#code').select();
  }finally{
    button.disabled=false;
  }
}

function showCodeStep(hint='Le code à 6 chiffres est valable 10 minutes.'){
  $('#emailStep').hidden=true;
  $('#codeStep').hidden=false;
  $('#code').required=true;
  $('#codeHint').textContent=hint;
}

function reset(){
  email='';
  $('#emailStep').hidden=false;
  $('#codeStep').hidden=true;
  $('#code').required=false;
  $('#code').value='';
  history.replaceState({},'','/espace-client/');
  message('');
  $('#email').focus();
}

async function logout(){
  await api('/api/client/logout',{method:'POST'}).catch(()=>{});
  state=null;
  activeOrderId='';
  selectedPhaseByOrder.clear();
  reset();
  showAuth();
}

function showAuth(){
  $('#publicHeader').hidden=false;
  $('#auth').hidden=false;
  $('#dashboard').hidden=true;
  document.documentElement.removeAttribute('data-phase');
}

function render(){
  const {client,orders=[]}=state||{};
  if(!client)return showAuth();
  $('#publicHeader').hidden=true;
  $('#auth').hidden=true;
  $('#dashboard').hidden=false;
  $('#welcome').textContent=`Bonjour${client.fullName?` ${client.fullName.split(/\s+/u)[0]}`:''}.`;
  if(!activeOrderId||!orders.some((order)=>order.id===activeOrderId))activeOrderId=(orders.find((order)=>order.status!=='completed')||orders[0]||{}).id||'';
  setView(view,false);
}

function setView(nextView,announce=true){
  view=['tracking','content','calendar','billing'].includes(nextView)?nextView:'tracking';
  $$('[data-view]').forEach((button)=>{
    const active=button.dataset.view===view;
    button.classList.toggle('active',active);
    active?button.setAttribute('aria-current','page'):button.removeAttribute('aria-current');
  });
  $('#overview').hidden=view!=='tracking';
  $('#clientContent').classList.toggle('tracking-content',view==='tracking');
  document.body.dataset.view=view;
  if(view==='tracking')renderTracking();
  if(view==='content')renderContent();
  if(view==='calendar')renderCalendarView();
  if(view==='billing')renderBilling();
  if(announce)$('#clientContent').focus({preventScroll:true});
}

function currentOrder(){
  const orders=state?.orders||[];
  return orders.find((order)=>order.id===activeOrderId)||orders[0]||null;
}

function renderTracking(){
  const orders=state?.orders||[];
  document.body.classList.toggle('has-multiple-orders',orders.length>1);
  const order=currentOrder();
  renderOverview(order);
  $('#clientContent').innerHTML=orders.length>1
    ?`<div class="project-strip">${orders.map((item)=>projectCard(item,item.id===activeOrderId)).join('')}</div>`
    :'';
  $$('[data-order-id]').forEach((button)=>button.addEventListener('click',()=>{
    activeOrderId=button.dataset.orderId;
    renderTracking();
  }));
}

function renderOverview(order){
  if(!order){
    document.documentElement.dataset.phase='reservation';
    $('#nextAction').innerHTML=`<div class="status-copy"><p class="status-kicker">Aucun passage actif</p><h2>Votre prochain projet commence ici.</h2><p class="status-description">Réservez un passage pour retrouver son suivi, ses contenus et son calendrier dans cet espace.</p><div class="hero-actions"><a class="primary" href="${BOOKING}">Réserver un passage ${icon('arrow')}</a></div></div>`;
    $('#progressStage').innerHTML='';
    return;
  }

  const meta=statusMeta(order.status);
  const deadline=deadlineFor(order);
  const files=order.files||[];
  document.documentElement.dataset.phase=PHASES[meta.phase].key;
  if(!selectedPhaseByOrder.has(order.id))selectedPhaseByOrder.set(order.id,meta.phase);
  const selected=Math.max(0,Math.min(PHASES.length-1,selectedPhaseByOrder.get(order.id)));
  const action=primaryAction(order);
  const secondary=files.length&&!['delivered','completed'].includes(order.status)?'<button class="ghost" type="button" data-open-view="content">Voir mes contenus</button>':'';
  $('#nextAction').innerHTML=`
    <div class="status-copy">
      <div class="status-kicker-row"><p class="status-kicker">${icon(PHASES[meta.phase].key)} Étape ${meta.phase+1} sur ${PHASES.length}</p><span class="status-signal"><i></i> ${esc(PHASES[meta.phase].label)}</span></div>
      <h2>${esc(meta.label)}</h2>
      <p class="status-description">${esc(order.nextAction||defaultNextAction(order.status))}</p>
      <div class="status-meta">
        ${order.format?`<span class="status-chip">${esc(order.format)}</span>`:''}
        ${order.filmingAt?`<span class="status-chip">Passage · ${date(order.filmingAt)}</span>`:''}
        ${deadline?`<span class="deadline ${deadline<Date.now()?'overdue':''}">${icon('clock')} ${esc(remainingLabel(deadline))}</span>`:''}
      </div>
      <div class="hero-actions">${action}${secondary||(!action?'<span class="status-chip calm">Aucune action requise</span>':'')}</div>
    </div>
    <div class="progress-visual" aria-label="${meta.progress}% du parcours réalisé">
      <div class="progress-ring" style="--progress:${meta.progress*3.6}deg"><strong>${meta.progress}%</strong><small>Avancement</small></div>
      <div class="mini-progress"><span style="width:${meta.progress}%"></span></div>
    </div>`;

  $('#progressStage').innerHTML=`
    <div class="progress-stage-head">
      <div><p class="eyebrow">PARCOURS INTERACTIF</p><h3>Explorez chaque étape</h3></div>
      <span class="journey-count">${meta.phase+1}/${PHASES.length}</span>
    </div>
    <div class="phase-track" role="tablist" aria-label="Étapes de votre passage">
      ${PHASES.map((phase,index)=>phaseCard(phase,index,meta.phase,selected)).join('')}
    </div>
    <div id="phaseDetail" class="phase-detail" aria-live="polite">${phaseDetailMarkup(order,selected,meta.phase)}</div>`;

  bindOverviewActions(order,meta.phase);
  centerSelectedPhase();
}

function phaseCard(phase,index,current,selected){
  const stateClass=index<current?'done':index===current?'current':'future';
  const label=index<current?'Terminé':index===current?'En cours':'À venir';
  const stateIcon=index<current?'check':index>current?'lock':phase.key;
  return `<button class="phase-card ${stateClass} ${index===selected?'selected':''}" type="button" role="tab" aria-selected="${index===selected}" data-phase-index="${index}">
    <span class="phase-icon">${icon(stateIcon)}</span>
    <span class="phase-copy"><small>${label}</small><strong>${esc(phase.label)}</strong><em>${esc(phase.hint)}</em></span>
  </button>`;
}

function phaseDetailMarkup(order,index,current){
  const phase=PHASES[index];
  const isDone=index<current||(['delivered','completed'].includes(order.status)&&index===current);
  const isCurrent=index===current;
  const title=isDone?'Étape terminée':isCurrent?'Votre étape actuelle':'À venir dans votre parcours';
  const text=isDone?phase.done:isCurrent?phase.current:phase.future;
  const action=isCurrent?phaseAction(order,index):'';
  return `<div class="phase-detail-icon ${isDone?'done':''}">${icon(isDone?'check':index>current?'lock':phase.key)}</div><div class="phase-detail-copy"><small>${esc(title)}</small><strong>${esc(phase.label)}</strong><p>${esc(text)}</p></div><div class="phase-detail-action">${action||`<span class="detail-state ${isDone?'done':''}">${isDone?'Validé':isCurrent?'En cours':'Automatique'}</span>`}</div>`;
}

function bindOverviewActions(order,current){
  $$('[data-open-view]').forEach((button)=>button.addEventListener('click',()=>setView(button.dataset.openView)));
  $$('[data-phase-index]').forEach((button)=>{
    button.addEventListener('click',()=>selectPhase(order,Number(button.dataset.phaseIndex),current));
    button.addEventListener('keydown',(event)=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      const index=Number(button.dataset.phaseIndex);
      const next=event.key==='Home'?0:event.key==='End'?PHASES.length-1:event.key==='ArrowLeft'?Math.max(0,index-1):Math.min(PHASES.length-1,index+1);
      const target=$(`[data-phase-index="${next}"]`);
      target?.focus();
      selectPhase(order,next,current);
    });
  });
}

function selectPhase(order,index,current){
  selectedPhaseByOrder.set(order.id,index);
  $$('[data-phase-index]').forEach((button)=>{
    const active=Number(button.dataset.phaseIndex)===index;
    button.classList.toggle('selected',active);
    button.setAttribute('aria-selected',String(active));
  });
  $('#phaseDetail').innerHTML=phaseDetailMarkup(order,index,current);
  $('#phaseDetail').classList.remove('refreshing');
  void $('#phaseDetail').offsetWidth;
  $('#phaseDetail').classList.add('refreshing');
  $$('[data-open-view]').forEach((button)=>button.addEventListener('click',()=>setView(button.dataset.openView)));
  centerSelectedPhase();
}

function phaseAction(order,index){
  const current=statusMeta(order.status).phase;
  if(index!==current)return '';
  if(index===0&&!order.appointmentAt)return `<a class="phase-action" href="${href(order.bookingUrl||BOOKING)}" target="_blank" rel="noopener">Réserver ${icon('arrow')}</a>`;
  if(index===1&&order.preparationUrl&&!['filmed','videos_pending','videos_received','editing','approval','delivered','completed'].includes(order.status))return `<a class="phase-action" href="${href(order.preparationUrl)}" target="_blank" rel="noopener">Préparer ${icon('arrow')}</a>`;
  if(index===4&&['delivered','completed'].includes(order.status))return `<button class="phase-action" type="button" data-open-view="content">Ouvrir mes contenus ${icon('arrow')}</button>`;
  return '';
}

function projectCard(order,active){
  const meta=statusMeta(order.status);
  return `<button class="project-card ${active?'active':''}" type="button" data-order-id="${esc(order.id)}" aria-pressed="${active}"><span><strong>${esc(order.title||'Passage Neptune Media')}</strong><small>${order.format?`${esc(order.format)} · `:''}${order.filmingAt?`Passage le ${date(order.filmingAt)}`:'Suivi en cours'}</small></span><span class="status ${['delivered','completed'].includes(order.status)?'done':''}">${esc(meta.label)}</span></button>`;
}

function primaryAction(order){
  const status=order.status;
  if(!order.appointmentAt&&(order.bookingUrl||BOOKING))return `<a class="primary" href="${href(order.bookingUrl||BOOKING)}" target="_blank" rel="noopener">Réserver mon rendez-vous ${icon('arrow')}</a>`;
  if(order.preparationUrl&&!['filmed','videos_pending','videos_received','editing','approval','delivered','completed'].includes(status))return `<a class="primary" href="${href(order.preparationUrl)}" target="_blank" rel="noopener">Préparer mon passage ${icon('arrow')}</a>`;
  if(['delivered','completed'].includes(status))return `<button class="primary" type="button" data-open-view="content">Voir mes contenus ${icon('arrow')}</button>`;
  return '';
}

function renderContent(){
  const items=(state?.orders||[]).flatMap((order)=>(order.files||[]).map((file)=>({...file,orderTitle:order.title,format:order.format})));
  $('#clientContent').innerHTML=`
    <div class="section-head"><div><p class="eyebrow">BIBLIOTHÈQUE PRIVÉE</p><h2>Mes contenus</h2><p>Émissions complètes, rushs, shorts et documents.</p></div><span class="section-count">${items.length} fichier${items.length>1?'s':''}</span></div>
    <div class="library">${items.length?items.map((file)=>`<article class="file-card"><span class="file-icon">${icon('file')}</span><span class="file-type">${esc(fileLabel(file.fileType))}</span><strong>${esc(file.name)}</strong><small>${esc(file.orderTitle||'Neptune Media')}${file.sizeLabel?` · ${esc(file.sizeLabel)}`:''}</small><a class="primary" href="${href(file.downloadUrl)}">Télécharger ${icon('arrow')}</a></article>`).join(''):'<p class="empty">Vos contenus apparaîtront ici dès leur livraison.</p>'}</div>`;
}

function renderCalendarView(){
  const schedules=(state?.orders||[]).flatMap((order)=>(order.schedules||[]).map((item)=>({...item,files:order.files||[],orderTitle:order.title})));
  const month=schedules[0]?.publishAt?new Date(schedules[0].publishAt):new Date();
  $('#clientContent').innerHTML=`
    <div class="section-head"><div><p class="eyebrow">PUBLICATION</p><h2>Mon calendrier éditorial</h2><p>${new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(month)}</p></div></div>
    <div class="calendar-wrap">${calendar(month,schedules)}</div>
    <p class="calendar-note">Le bouton « Préparer » télécharge le média et copie sa légende. La publication directe sera disponible après connexion de vos comptes sociaux.</p>`;
  $$('[data-prepare-post]').forEach((button)=>button.addEventListener('click',()=>preparePost(button.dataset.preparePost,button.dataset.fileId)));
}

function calendar(monthDate,schedules){
  const first=new Date(monthDate.getFullYear(),monthDate.getMonth(),1);
  const last=new Date(monthDate.getFullYear(),monthDate.getMonth()+1,0);
  const offset=(first.getDay()+6)%7;
  const cells=[];
  for(let index=0;index<offset;index+=1)cells.push('<div class="day"></div>');
  for(let day=1;day<=last.getDate();day+=1){
    const entries=schedules.filter((item)=>{
      const value=new Date(item.publishAt);
      return value.getFullYear()===first.getFullYear()&&value.getMonth()===first.getMonth()&&value.getDate()===day;
    });
    cells.push(`<div class="day"><span>${day}</span>${entries.map((entry)=>{
      const file=entry.files.find((item)=>item.id===entry.fileId);
      return `<div class="calendar-item"><strong>${esc(file?.name||entry.orderTitle||'Contenu')}</strong><small>${esc(entry.network||'Réseau à choisir')}</small><button type="button" data-prepare-post="${esc(entry.caption)}" data-file-id="${esc(entry.fileId)}">Préparer</button></div>`;
    }).join('')}</div>`);
  }
  return `<div class="calendar">${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((day)=>`<div class="calendar-head">${day}</div>`).join('')}${cells.join('')}</div>`;
}

async function preparePost(caption,fileId){
  try{
    await navigator.clipboard.writeText(caption||'');
    const file=(state?.orders||[]).flatMap((order)=>order.files||[]).find((item)=>item.id===fileId);
    if(file)location.href=file.downloadUrl;
    toast('Légende copiée et téléchargement lancé.');
  }catch{
    toast('Le téléchargement reste disponible dans Mes contenus.',true);
  }
}

function renderBilling(){
  const orders=state?.orders||[];
  const total=orders.reduce((sum,order)=>sum+Number(order.amountTotal||0),0);
  const paid=orders.filter((order)=>Number(order.amountTotal)>0).length;
  const deletion=state?.deletionRequest;
  $('#clientContent').innerHTML=`
    <div class="section-head"><div><p class="eyebrow">PAIEMENTS ET FACTURES</p><h2>Ma facturation</h2><p>Retrouvez vos paiements et factures Stripe.</p></div></div>
    <div class="billing-grid">
      <div class="billing-card"><b>${money(total,'eur')}</b><span>Total des passages</span></div>
      <div class="billing-card"><b>${paid}</b><span>Commande${paid>1?'s':''} payée${paid>1?'s':''}</span></div>
      <div class="billing-card"><b>${deletion?.status==='pending'?'En cours':'Actif'}</b><span>Statut du compte</span></div>
    </div>
    <div class="billing-actions"><a class="primary" href="${BILLING}" target="_blank" rel="noopener">Ouvrir mon portail Stripe ${icon('arrow')}</a><a class="ghost" href="${BOOKING}">Réserver un nouveau passage</a></div>
    <section class="danger-zone"><h3>Suppression du compte</h3>${deletion?.status==='pending'?`<p>Votre demande a été enregistrée le ${dateTime(deletion.requestedAt)}. Neptune Media vous informera après vérification des obligations légales de conservation.</p>`:`<p>Cette demande lance une vérification avant suppression ou anonymisation des données qui ne doivent pas être conservées légalement.</p><button class="danger-button" id="deleteAccount" type="button">Demander la suppression de mon compte</button>`}<p id="deleteMessage" class="message"></p></section>`;
  if($('#deleteAccount'))$('#deleteAccount').addEventListener('click',requestDeletion);
}

async function requestDeletion(){
  if(!confirm('Confirmer la demande de suppression de votre compte Neptune Media ?'))return;
  const button=$('#deleteAccount');
  button.disabled=true;
  try{
    const result=await api('/api/client/delete-request',{method:'POST',body:JSON.stringify({note:'Demande effectuée depuis l’espace client'})});
    state.deletionRequest=result.request;
    toast(result.warning?'Demande enregistrée. L’e-mail de confirmation doit être vérifié.':'Demande enregistrée et confirmée par e-mail.');
    renderBilling();
  }catch(error){
    $('#deleteMessage').textContent=errorText(error.message);
    button.disabled=false;
  }
}

function statusMeta(status){return STATUS[status]||{label:'Suivi en cours',phase:0,progress:12};}
function defaultNextAction(status){
  if(['delivered','completed'].includes(status))return 'Vos contenus sont disponibles dans votre bibliothèque.';
  if(['editing','approval','videos_received'].includes(status))return 'Aucune action n’est requise : Neptune Media finalise vos contenus.';
  if(status==='videos_pending')return 'Les vidéos du studio sont attendues avant le début du traitement.';
  if(['filming_scheduled','filming_confirmed'].includes(status))return 'Votre passage est confirmé. Retrouvez la date ci-dessous.';
  return 'Consultez l’étape actuelle et réalisez l’action indiquée.';
}

function deadlineFor(order){
  const base=new Date(order.updatedAt||order.createdAt||Date.now());
  if(order.status==='studio_date_confirmation_pending')return new Date(base.getTime()+48*3600000);
  if(order.status==='videos_pending')return new Date(new Date(order.filmingAt||base).getTime()+7*86400000);
  if(['videos_received','editing','approval'].includes(order.status))return new Date(new Date(order.filmingAt||base).getTime()+15*86400000);
  if(['preparation_complete','filming_scheduled','filming_confirmed'].includes(order.status)&&order.filmingAt)return new Date(order.filmingAt);
  return null;
}

function remainingLabel(deadline){
  const ms=deadline-Date.now();
  const abs=Math.abs(ms);
  const days=Math.floor(abs/86400000);
  const hours=Math.max(1,Math.ceil((abs%86400000)/3600000));
  return ms<0
    ?`Délai dépassé de ${days?`${days} jour${days>1?'s':''}`:`${hours} h`}`
    :days?`${days} jour${days>1?'s':''} restant${days>1?'s':''}`:`${hours} h restantes`;
}

function centerSelectedPhase(){
  requestAnimationFrame(()=>{
    const track=$('.phase-track');
    const selected=$('.phase-card.selected');
    if(!track||!selected||track.scrollWidth<=track.clientWidth)return;
    const left=selected.offsetLeft-(track.clientWidth-selected.clientWidth)/2;
    track.scrollTo({left:Math.max(0,left),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  });
}

function icon(name){
  return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.file}</svg>`;
}

async function api(url,options={}){
  const headers={Accept:'application/json',...(options.headers||{})};
  if(options.body)headers['Content-Type']='application/json';
  const response=await fetch(url,{...options,headers,credentials:'same-origin'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||`http_${response.status}`);
  return data;
}

function message(text,type=''){
  $('#authMessage').textContent=text;
  $('#authMessage').className=`message${type?` ${type}`:''}`;
}
function toast(text,error=false){
  const element=$('#toast');
  element.textContent=text;
  element.className=`toast${error?' error':''}`;
  element.hidden=false;
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>element.hidden=true,3800);
}
function errorText(code){return ({invalid_code:'Saisissez les 6 chiffres reçus.',invalid_or_expired_code:'Ce code est incorrect ou a expiré.',too_many_attempts:'Trop de tentatives. Réessayez dans 15 minutes.',email_service_not_configured:'Le service e-mail doit être configuré.',email_send_failed:'L’e-mail n’a pas pu être envoyé. Contactez Neptune Media.',email_send_unconfirmed:'L’envoi du code n’a pas été confirmé.',unauthorized:'Votre session a expiré. Reconnectez-vous.'})[code]||'Une erreur est survenue. Réessayez.';}
function fileLabel(type){return ({final:'Émission complète',rushes:'Rushs',short:'Short / Reel',shorts:'Shorts',teaser:'Teaser',document:'Document'})[type]||'Livrable';}
function date(value){const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'Date à confirmer':new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium'}).format(parsed);}
function dateTime(value){const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'Date à confirmer':new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeStyle:'short'}).format(parsed);}
function money(value,currency='eur'){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:String(currency).toUpperCase()}).format(Number(value||0)/100);}
function maskEmail(value){const [account,domain]=value.split('@');return `${account.slice(0,2)}${'*'.repeat(Math.max(2,account.length-2))}@${domain}`;}
function href(value){const text=String(value||'');return /^(https?:\/\/|\/)/iu.test(text)?esc(text):'#';}
function esc(value){return String(value??'').replace(/[&<>"']/gu,(character)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));}
