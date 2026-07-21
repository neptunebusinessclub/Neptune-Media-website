document.addEventListener('click',(event)=>{
  const trigger=event.target.closest('[data-open-panel="calendar"]');
  if(!trigger)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  location.href='/espace-client/calendrier/';
},{capture:true});

document.querySelectorAll('[data-open-panel="calendar"]').forEach((trigger)=>{
  trigger.setAttribute('aria-label','Ouvrir mon calendrier de contenu');
  const label=trigger.querySelector('.metric-copy > span');
  if(label)label.textContent='Calendrier de contenu';
});
