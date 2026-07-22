const hashParams=new URLSearchParams(location.hash.slice(1));
const code=String(hashParams.get('code')||'').replace(/\D/gu,'').slice(0,6);
const email=String(new URLSearchParams(location.search).get('email')||'').trim().toLowerCase();

if(code.length===6&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)){
  const cleanUrl=`${location.pathname}${location.search}`;
  history.replaceState({},'',cleanUrl);
  connectFromEmail(email,code);
}

async function connectFromEmail(clientEmail,securityCode){
  const emailInput=document.getElementById('email');
  const codeInput=document.getElementById('code');
  const emailStep=document.getElementById('emailStep');
  const codeStep=document.getElementById('codeStep');
  const codeHint=document.getElementById('codeHint');
  const message=document.getElementById('authMessage');
  const verifyButton=document.getElementById('verifyCode');

  if(emailInput)emailInput.value=clientEmail;
  if(codeInput)codeInput.value=securityCode;
  if(emailStep)emailStep.hidden=true;
  if(codeStep)codeStep.hidden=false;
  if(codeHint)codeHint.textContent='Connexion sécurisée en cours…';
  if(message){message.textContent='Ouverture automatique de votre espace…';message.className='message';}
  if(verifyButton){verifyButton.disabled=true;verifyButton.textContent='Connexion…';}

  try{
    const existing=await fetch('/api/client/session',{headers:{Accept:'application/json'},credentials:'same-origin'});
    if(existing.ok){location.replace('/espace-client/');return;}

    const response=await fetch('/api/client/verify-code',{
      method:'POST',
      headers:{Accept:'application/json','Content-Type':'application/json'},
      credentials:'same-origin',
      body:JSON.stringify({email:clientEmail,code:securityCode}),
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||`http_${response.status}`);
    location.replace('/espace-client/');
  }catch(error){
    if(codeHint)codeHint.textContent='Le lien automatique a expiré ou a déjà été utilisé.';
    if(message){message.textContent='Demandez un nouveau code pour vous connecter.';message.className='message error';}
    if(verifyButton){verifyButton.disabled=false;verifyButton.textContent='Accéder à mon espace';}
  }
}
