const allowedTabs=new Set(['dashboard','episodes','programs','insights','finances','ads','users','ai','audit','settings']);
const basePath='/studio/advanced.html';
function requestedTab(){const value=decodeURIComponent(location.hash.slice(1)).trim();return allowedTabs.has(value)?value:'episodes';}
function activateRequestedTab(attempt=0){const tab=requestedTab(),button=document.querySelector(`[data-tab="${CSS.escape(tab)}"]`),app=document.getElementById('app');if(button&&app&&!app.hidden){button.click();return;}if(attempt<50)setTimeout(()=>activateRequestedTab(attempt+1),100);}
document.addEventListener('click',(event)=>{const button=event.target.closest('[data-tab]');if(!button||!allowedTabs.has(button.dataset.tab))return;history.replaceState({},'',`${basePath}#${button.dataset.tab}`);},{capture:true});
window.addEventListener('hashchange',()=>activateRequestedTab());window.addEventListener('DOMContentLoaded',()=>activateRequestedTab());activateRequestedTab();
