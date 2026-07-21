const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const PLATFORM_URLS={youtube:'https://www.youtube.com/upload',tiktok:'https://www.tiktok.com/upload',instagram:'https://www.instagram.com/'};
const PLATFORM_LABELS={youtube:'YouTube',tiktok:'TikTok',instagram:'Instagram'};
let data={items:[],publications:[]};
let selectedId='';
let currentMonth=new Date();

$('#previousMonth').addEventListener('click',()=>changeMonth(-1));
$('#nextMonth').addEventListener('click',()=>changeMonth(1));
$('#closeEditor').addEventListener('click',closeEditor);
$('#editorBackdrop').addEventListener('click',closeEditor);
document.addEventListener('keydown',(event)=>{if(event.key==='Escape')closeEditor();});
load();

async function load(){
  try{
    data=await api('/api/client/content-calendar');
    const first=data.items.find((item)=>item.publishAt)?.publishAt;
    if(first&&!selectedId)currentMonth=new Date(first);
    render();
  }catch(error){
    if(['unauthorized','http_401'].includes(error.message)){location.href='/espace-client/';return;}
    $('#shortRail').innerHTML=`<div class="empty-state">${esc(errorText(error.message))}</div>`;
    $('#calendarGrid').innerHTML='<div class="empty-state">Impossible de charger le calendrier.</div>';
  }
}

function render(){
  const items=data.items||[];
  $('#shortCount').textContent=items.length;
  $('#scheduledCount').textContent=items.filter((item)=>item.publishAt).length;
  $('#publishedCount').textContent=(data.publications||[]).filter((item)=>['prepared','published'].includes(item.status)).length;
  renderRail(items);
  renderCalendar(items);
}

function renderRail(items){
  $('#shortRail').innerHTML=items.length?items.map((item,index)=>{
    const title=item.aiTitle||cleanName(item.name)||'Short Neptune Media';
    const description=item.aiDescription||item.caption||'Le texte Neptune IA apparaîtra ici.';
    return `<article class="short-card ${item.fileId===selectedId?'active':''}" data-short-id="${esc(item.fileId)}" tabindex="0" role="button" aria-label="Ouvrir ${esc(title)}">
      <div class="short-card-top"><span class="short-number">${String(index+1).padStart(2,'0')}</span><span class="short-date">${item.publishAt?dateShort(item.publishAt):'À planifier'}</span></div>
      <h3>${esc(title)}</h3><p>${esc(description)}</p>
      <footer><span class="network-dots">${(item.networks||[]).map((network)=>`<i title="${esc(PLATFORM_LABELS[network]||network)}">${network.slice(0,1).toUpperCase()}</i>`).join('')}</span><span class="short-status">${item.generationStatus==='generated'?'IA prête':item.generationStatus==='edited'?'Modifié':'Préparé'}</span></footer>
    </article>`;
  }).join(''):'<div class="empty-state">Vos shorts apparaîtront ici dès leur import par l’équipe Neptune.</div>';
  $$('[data-short-id]').forEach((card)=>{
    card.addEventListener('click',()=>openEditor(card.dataset.shortId));
    card.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openEditor(card.dataset.shortId);}});
  });
}

function renderCalendar(items){
  const year=currentMonth.getFullYear(),month=currentMonth.getMonth();
  $('#monthLabel').textContent=new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(currentMonth);
  const first=new Date(year,month,1),last=new Date(year,month+1,0),offset=(first.getDay()+6)%7;
  const cells=[];
  for(let index=0;index<offset;index+=1){const date=new Date(year,month,-offset+index+1);cells.push(dayCell(date,items,true));}
  for(let day=1;day<=last.getDate();day+=1)cells.push(dayCell(new Date(year,month,day),items,false));
  while(cells.length%7!==0){const day=cells.length-offset-last.getDate()+1;cells.push(dayCell(new Date(year,month+1,day),items,true));}
  $('#calendarGrid').innerHTML=`${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((name)=>`<div class="calendar-head">${name}</div>`).join('')}${cells.join('')}`;
  $$('[data-calendar-short]').forEach((entry)=>entry.addEventListener('click',()=>openEditor(entry.dataset.calendarShort)));
}

function dayCell(date,items,outside){
  const entries=items.filter((item)=>sameDay(item.publishAt,date));
  const today=sameDay(new Date(),date);
  return `<div class="calendar-day${outside?' outside':''}${today?' today':''}"><span class="calendar-day-number">${date.getDate()}</span>${entries.map((item)=>`<article class="calendar-entry" data-calendar-short="${esc(item.fileId)}"><strong>${esc(item.aiTitle||cleanName(item.name)||'Short')}</strong><small>${(item.networks||[]).map((network)=>PLATFORM_LABELS[network]||network).join(' · ')}</small></article>`).join('')}</div>`;
}

function openEditor(fileId){
  const item=(data.items||[]).find((entry)=>entry.fileId===fileId);if(!item)return;
  selectedId=fileId;renderRail(data.items||[]);
  const title=item.aiTitle||cleanName(item.name)||'Short Neptune Media';
  const description=item.aiDescription||item.caption||'';
  const hashtags=(item.hashtags||[]).join(' ');
  const publishAt=toLocalInput(item.publishAt||new Date(Date.now()+86400000).toISOString());
  const sources=(item.trendSources||[]).length?item.trendSources.join(' · '):'Contexte du short et principes éditoriaux Neptune';
  $('#editorTitle').textContent=title;
  $('#editorBody').innerHTML=`<div class="editor-preview"><strong>${esc(item.name||'Short Neptune Media')}</strong><span>${esc(item.orderTitle||'Production Neptune Media')} · ${item.publishAt?dateTime(item.publishAt):'Date à choisir'}</span></div>
    <form id="contentForm" class="editor-form">
      <label><span>Titre accrocheur</span><input name="title" maxlength="140" value="${esc(title)}" required></label>
      <label><span>Description qui appelle une réponse</span><textarea name="description" maxlength="1800" required>${esc(description)}</textarea></label>
      <label><span>Hashtags</span><input name="hashtags" value="${esc(hashtags)}" placeholder="entrepreneuriat interview conseils"></label>
      <label><span>Date et heure de publication</span><input name="publishAt" type="datetime-local" value="${esc(publishAt)}" required></label>
      <div><span class="field-label">Canaux de diffusion</span><div class="network-options">${['youtube','tiktok','instagram'].map((network)=>`<label class="network-option"><input name="networks" type="checkbox" value="${network}" ${(item.networks||[]).includes(network)?'checked':''}><span>${PLATFORM_LABELS[network]}</span></label>`).join('')}</div></div>
      <div class="ai-signal"><strong>Neptune IA</strong><br>${esc(item.trendSummary||'Texte préparé à partir du contenu disponible.')}<br><b>Sources :</b> ${esc(sources)}</div>
      <button class="editor-save" type="submit">Enregistrer les modifications</button>
    </form>
    <section class="publish-grid"><h3>Publier en mode express</h3><p>Un clic copie la légende, prépare le fichier et ouvre le canal choisi. Sur mobile compatible, le short est envoyé directement au menu de partage.</p><div class="publish-buttons">${['youtube','tiktok','instagram'].map((platform)=>`<button class="publish-button" type="button" data-publish-platform="${platform}">${PLATFORM_LABELS[platform]}</button>`).join('')}</div></section>`;
  $('#contentForm').addEventListener('submit',(event)=>saveItem(event,item));
  $$('[data-publish-platform]').forEach((button)=>button.addEventListener('click',()=>publishExpress(item,button.dataset.publishPlatform,button)));
  $('#editorBackdrop').hidden=false;$('#editor').hidden=false;document.body.style.overflow='hidden';
}

function closeEditor(){
  $('#editorBackdrop').hidden=true;$('#editor').hidden=true;document.body.style.overflow='';selectedId='';renderRail(data.items||[]);
}

async function saveItem(event,item){
  event.preventDefault();const form=event.currentTarget,button=$('button[type=submit]',form),values=new FormData(form);
  const networks=values.getAll('networks');if(!networks.length)return toast('Choisissez au moins un canal.',true);
  button.disabled=true;button.textContent='Enregistrement…';
  try{
    const result=await api('/api/client/content-calendar/update',{method:'POST',body:JSON.stringify({scheduleId:item.scheduleId,title:values.get('title'),description:values.get('description'),hashtags:values.get('hashtags'),publishAt:new Date(values.get('publishAt')).toISOString(),networks})});
    Object.assign(item,{aiTitle:result.title,aiDescription:result.description,hashtags:result.hashtags,publishAt:result.publishAt,networks:result.networks,caption:result.caption,generationStatus:'edited'});
    currentMonth=new Date(result.publishAt);render();openEditor(item.fileId);toast('Publication mise à jour.');
  }catch(error){toast(errorText(error.message),true);}finally{button.disabled=false;button.textContent='Enregistrer les modifications';}
}

async function publishExpress(item,platform,button){
  const title=item.aiTitle||cleanName(item.name)||'Short Neptune Media';
  const caption=[title,item.aiDescription||item.caption,(item.hashtags||[]).map((tag)=>`#${tag}`).join(' ')].filter(Boolean).join('\n\n');
  const popup=window.open('about:blank','_blank');
  if(popup)popup.opener=null;
  button.disabled=true;
  try{
    await copyText(caption);
    const shared=await shareFileWhenPossible(item,caption);
    if(shared){try{popup?.close();}catch{} }
    else{
      download(item.downloadUrl,item.name||'short-neptune.mp4');
      if(popup)popup.location.replace(PLATFORM_URLS[platform]);else window.open(PLATFORM_URLS[platform],'_blank','noopener');
    }
    await api('/api/client/content-calendar/publish',{method:'POST',body:JSON.stringify({scheduleId:item.scheduleId,platform})});
    data.publications=[...(data.publications||[]).filter((entry)=>!(entry.scheduleId===item.scheduleId&&entry.platform===platform)),{scheduleId:item.scheduleId,platform,status:'prepared',updatedAt:new Date().toISOString()}];
    render();toast(shared?'Short envoyé au menu de partage.':'Légende copiée, short téléchargé et canal ouvert.');
  }catch(error){try{popup?.close();}catch{}toast(errorText(error.message),true);}finally{button.disabled=false;}
}

async function shareFileWhenPossible(item,caption){
  if(typeof navigator.share!=='function'||typeof navigator.canShare!=='function')return false;
  try{
    const response=await fetch(item.downloadUrl,{credentials:'same-origin'});if(!response.ok)return false;
    const blob=await response.blob();const file=new File([blob],item.name||'short-neptune.mp4',{type:blob.type||'video/mp4'});
    if(!navigator.canShare({files:[file]}))return false;
    await navigator.share({title:item.aiTitle||'Short Neptune Media',text:caption,files:[file]});return true;
  }catch(error){if(error?.name==='AbortError')return true;return false;}
}

function changeMonth(delta){currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()+delta,1);renderCalendar(data.items||[]);}
async function copyText(value){if(navigator.clipboard?.writeText&&window.isSecureContext){await navigator.clipboard.writeText(value);return;}const area=document.createElement('textarea');area.value=value;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();document.execCommand('copy');area.remove();}
function download(url,name){const anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.append(anchor);anchor.click();anchor.remove();}
async function api(url,options={}){const headers={Accept:'application/json',...(options.headers||{})};if(options.body)headers['Content-Type']='application/json';const response=await fetch(url,{...options,headers,credentials:'same-origin'});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||`http_${response.status}`);return payload;}
function sameDay(value,date){const first=new Date(value||'');if(Number.isNaN(first.getTime()))return false;return first.getFullYear()===date.getFullYear()&&first.getMonth()===date.getMonth()&&first.getDate()===date.getDate();}
function cleanName(value){return String(value||'').replace(/\.[a-z0-9]{2,5}$/iu,'').replace(/[_-]+/gu,' ').trim();}
function dateShort(value){const date=new Date(value);return Number.isNaN(date.getTime())?'À planifier':new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short'}).format(date);}
function dateTime(value){const date=new Date(value);return Number.isNaN(date.getTime())?'À planifier':new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeStyle:'short'}).format(date);}
function toLocalInput(value){const date=new Date(value);if(Number.isNaN(date.getTime()))return '';const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);return local.toISOString().slice(0,16);}
function toast(text,error=false){const element=$('#toast');element.textContent=text;element.className=`toast${error?' error':''}`;element.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>element.hidden=true,4200);}
function errorText(code){return ({unauthorized:'Votre session a expiré.',content_not_found:'Ce short est introuvable.',invalid_publish_date:'Choisissez une date valide.',invalid_platform:'Ce canal n’est pas disponible.'})[code]||'Une erreur est survenue. Réessayez.';}
function esc(value){return String(value??'').replace(/[&<>"']/gu,(character)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));}
