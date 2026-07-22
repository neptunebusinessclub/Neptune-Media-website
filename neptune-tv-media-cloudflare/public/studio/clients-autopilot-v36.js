const $=(selector,root=document)=>root.querySelector(selector);
const escapeHtml=(value)=>String(value??'').replace(/[&<>"']/gu,(character)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
let controlState=null;
let busy=false;

prepareLayout();
refreshOverview();
window.addEventListener('focus',refreshOverview);
document.getElementById('refresh')?.addEventListener('click',()=>setTimeout(refreshOverview,120),{capture:true});

function prepareLayout(){
  const main=document.querySelector('.clients-main'),controls=document.querySelector('.controls'),pipeline=document.getElementById('pipeline');
  if(!main||!controls||!pipeline||document.getElementById('automationOverview'))return;
  const overview=document.createElement('section');overview.id='automationOverview';overview.className='automation-overview';overview.innerHTML='<div class="automation-clear"><strong>Vérification du Studio…</strong></div>';controls.before(overview);
  const details=document.createElement('details');details.className='full-monitoring';details.open=Boolean(location.hash);
  const summary=document.createElement('summary');summary.innerHTML='<span><b>Voir tous les parcours</b><small>Kanban complet, recherche et accès aux dossiers</small></span><i>＋</i>';
  details.append(summary,controls,pipeline);main.append(details);
}

async function refreshOverview(){
  if(busy)return;busy=true;
  try{controlState=await api('/api/admin/control-room');renderOverview(controlState);}catch(error){const overview=document.getElementById('automationOverview');if(overview)overview.innerHTML='<div class="automation-clear"><strong>Contrôle automatique indisponible</strong><p>Revenez à la vue d’ensemble ou actualisez la page.</p></div>';}
  finally{busy=false;}
}

function renderOverview(data){
  const overview=document.getElementById('automationOverview');if(!overview)return;
  const actions=(data.actions||[]).filter((item)=>item.type==='order');
  const summary=data.summary||{};
  const heroTitle=document.querySelector('.clients-hero-copy h1'),heroText=document.querySelector('.clients-hero-copy>p:last-child');
  if(heroTitle)heroTitle.innerHTML='Neptune surveille.<br><span>Vous validez l’exception.</span>';
  if(heroText)heroText.textContent='Les parcours avancent automatiquement. Cet écran utilise le même diagnostic que la tour de contrôle.';
  const stats=document.querySelectorAll('.stats>div');
  if(stats[0])stats[0].innerHTML=`<b>${actions.length}</b><span>actions</span>`;
  if(stats[1])stats[1].innerHTML=`<b>${Number(summary.watching||0)}</b><span>à surveiller</span>`;
  if(stats[2])stats[2].innerHTML=`<b>${Number(summary.automatic||0)}</b><span>automatiques</span>`;
  overview.className=`automation-overview ${actions.length?'has-actions':'is-clear'}`;
  overview.innerHTML=`<div class="automation-overview-head"><div class="automation-status-mark"><span>${actions.length||'✓'}</span></div><div><p class="eyebrow">DIAGNOSTIC UNIQUE DU STUDIO</p><h2>${actions.length?`${actions.length} exception${actions.length>1?'s':''} client${actions.length>1?'s':''}`:'Aucune action client'}</h2><p>${actions.length?'Traitez uniquement les dossiers ci-dessous. Tous les autres parcours continuent sans intervention.':'Tous les dossiers clients avancent normalement. Le Kanban complet reste disponible uniquement pour contrôle.'}</p></div><div class="automation-duration"><small>Temps estimé</small><strong>${actions.length?`moins de ${Math.max(1,Math.ceil(actions.length/3))} min`:'0 minute'}</strong></div></div><div class="exception-list">${actions.length?actions.slice(0,10).map(actionCard).join(''):'<div class="automation-clear"><span>✓</span><strong>Tout est sous contrôle</strong><p>Aucun client ne nécessite de validation ou de correction.</p></div>'}</div>`;
  bindActions();
}

function actionCard(item){
  const deadline=item.deadline?deadlineLabel(item.deadline):'';
  const target=item.href?safeHref(item.href):`#${encodeURIComponent(item.orderId||'')}`;
  const action=item.actionKey&&item.canAct?`<button type="button" data-client-action="${escapeHtml(item.id)}">${escapeHtml(item.actionLabel||'Valider')}</button>`:`<a href="${target}">${escapeHtml(item.actionLabel||'Vérifier')}</a>`;
  return `<article class="exception-card"><div class="exception-dot"></div><div class="exception-copy"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.subtitle||'Client Neptune Media')}</p><small>${escapeHtml(item.reason||'Une vérification est nécessaire.')}</small></div>${deadline?`<span class="exception-deadline ${new Date(item.deadline)<Date.now()?'late':''}">${escapeHtml(deadline)}</span>`:''}${action}</article>`;
}

function bindActions(){document.querySelectorAll('[data-client-action]').forEach((button)=>button.addEventListener('click',()=>runAction(button.dataset.clientAction,button)));}
async function runAction(id,button){
  const item=(controlState?.actions||[]).find((entry)=>entry.id===id);if(!item)return;
  if(!confirm(`${item.title}\n\n${item.consequence||'Le parcours client sera mis à jour.'}`))return;
  button.disabled=true;button.textContent='Validation…';
  try{if(item.externalUrl)window.open(item.externalUrl,'_blank','noopener');await api('/api/admin/autopilot/action',{method:'POST',body:JSON.stringify({orderId:item.orderId,action:item.actionKey})});toast('Décision validée. Le parcours continue automatiquement.');setTimeout(()=>location.reload(),450);}
  catch{button.disabled=false;button.textContent='Réessayer';toast('La validation a échoué. Ouvrez le dossier client.',true);}
}

async function api(url,options={}){const headers={Accept:'application/json',...(options.headers||{})};if(options.body)headers['Content-Type']='application/json';headers['X-CSRF-Token']=sessionStorage.getItem('neptune_csrf')||'';const response=await fetch(url,{...options,headers,credentials:'same-origin'});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`http_${response.status}`);return data;}
function deadlineLabel(value){const date=new Date(value);if(Number.isNaN(date.getTime()))return'';const ms=date-Date.now(),abs=Math.abs(ms),days=Math.floor(abs/86400000),hours=Math.max(1,Math.ceil((abs%86400000)/3600000));return ms<0?`Retard ${days?`${days} j`:`${hours} h`}`:days?`Dans ${days} j`:`Dans ${hours} h`;}
function safeHref(value){const text=String(value||'');return text.startsWith('/studio/clients')?text.replace('/studio/clients','')||'#':text.startsWith('/studio/')?text:'#';}
function toast(text,error=false){const element=document.getElementById('toast');if(!element)return;element.textContent=text;element.className=`toast${error?' error':''}`;element.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>element.hidden=true,3500);}
