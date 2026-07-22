const allowedTabs=new Set(['dashboard','episodes','programs','insights','finances','ads','users','ai','audit','settings']);

function requestedTab(){
  const value=decodeURIComponent(location.hash.slice(1)).trim();
  return allowedTabs.has(value)?value:'';
}

function activateRequestedTab(attempt=0){
  const tab=requestedTab();
  if(!tab)return;
  const button=document.querySelector(`[data-tab="${CSS.escape(tab)}"]`);
  const app=document.getElementById('app');
  if(button&&app&&!app.hidden){
    button.click();
    return;
  }
  if(attempt<40)setTimeout(()=>activateRequestedTab(attempt+1),100);
}

document.addEventListener('click',(event)=>{
  const button=event.target.closest('[data-tab]');
  if(!button||!allowedTabs.has(button.dataset.tab))return;
  history.replaceState({},'',button.dataset.tab==='dashboard'?'/studio/':`/studio/#${button.dataset.tab}`);
},{capture:true});

window.addEventListener('hashchange',()=>activateRequestedTab());
window.addEventListener('DOMContentLoaded',()=>activateRequestedTab());
activateRequestedTab();
