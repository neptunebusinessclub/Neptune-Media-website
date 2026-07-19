function sender(env){return env.AUTH_FROM_EMAIL||'Neptune Media <onboarding@resend.dev>';}
async function send(env,payload){
  if(!env.RESEND_API_KEY){console.error('resend_not_configured');return {ok:false,error:'email_service_not_configured'};}
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify(payload),
  });
  const raw=await response.text();
  const result=parseJson(raw);
  if(!response.ok){
    console.error('resend_failed',{
      status:response.status,
      code:result.name||result.code||'',
      message:result.message||raw.slice(0,300),
      from:payload.from,
      to:payload.to,
    });
    return {ok:false,error:'email_send_failed'};
  }
  if(!result.id){
    console.error('resend_id_missing',{status:response.status,response:result,to:payload.to});
    return {ok:false,error:'email_send_unconfirmed'};
  }
  console.log('resend_email_sent',{emailId:result.id,to:payload.to,subject:payload.subject});
  return {ok:true,id:result.id};
}
export function portalUrl(requestUrl,email){return `${new URL(requestUrl).origin}/espace-client/?email=${encodeURIComponent(email)}`;}
export async function sendCode(env,requestUrl,email,code){const url=portalUrl(requestUrl,email);return send(env,{from:sender(env),to:[email],subject:`${code} · Votre code Neptune Media`,html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:34px"><p style="letter-spacing:.16em;color:#6d55e8;font-weight:700">NEPTUNE MEDIA</p><h1>Votre code sécurisé</h1><p style="font-size:34px;letter-spacing:.22em;font-weight:800">${code}</p><p>Ce code expire dans 10 minutes et ne peut être utilisé qu’une fois.</p><p><a href="${url}">Ouvrir mon espace client</a></p></div>`,text:`Votre code Neptune Media : ${code}. Il expire dans 10 minutes. ${url}`});}
export async function sendAccess(env,requestUrl,email,name=''){const url=portalUrl(requestUrl,email);return send(env,{from:sender(env),to:[email],subject:'Accédez à votre espace Neptune Media',html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:34px"><p style="letter-spacing:.16em;color:#6d55e8;font-weight:700">NEPTUNE MEDIA</p><h1>Votre espace client est prêt</h1><p>${name?`Bonjour ${escapeHtml(name)}, `:''}retrouvez vos réservations, votre préparation, votre suivi, vos rushs et vos livrables dans un seul espace permanent.</p><p><a href="${url}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#654cff;color:#fff;text-decoration:none;font-weight:700">Accéder à mon espace</a></p><p>Votre connexion se fait avec un code reçu par e-mail, sans mot de passe.</p></div>`,text:`Votre espace Neptune Media est prêt : ${url}`});}
export async function sendOrderConfirmation(env,requestUrl,email,payload={}){const url=portalUrl(requestUrl,email),title=String(payload.title||payload.productName||payload.format||'Votre passage Neptune Media');return send(env,{from:sender(env),to:[email],subject:'Votre réservation Neptune Media est confirmée',html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:34px"><p style="letter-spacing:.16em;color:#6d55e8;font-weight:700">NEPTUNE MEDIA</p><h1>Votre réservation est confirmée</h1><p><strong>${escapeHtml(title)}</strong> a été ajouté à votre compte permanent.</p><p>Vous pouvez maintenant choisir ou consulter votre rendez-vous, préparer l’interview et suivre votre passage jusqu’à la livraison.</p><p><a href="${url}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#654cff;color:#fff;text-decoration:none;font-weight:700">Accéder à mon espace</a></p></div>`,text:`Votre réservation ${title} est confirmée. Accédez à votre espace : ${url}`});}
export async function sendAppointmentConfirmation(env,requestUrl,email,payload={}){const url=portalUrl(requestUrl,email),appointment=formatAppointment(payload.appointmentAt),title=String(payload.title||payload.format||'Votre passage Neptune Media');return send(env,{from:sender(env),to:[email],subject:'Votre rendez-vous Neptune Media est confirmé',html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:34px"><p style="letter-spacing:.16em;color:#6d55e8;font-weight:700">NEPTUNE MEDIA</p><h1>Votre rendez-vous est confirmé</h1><p><strong>${escapeHtml(title)}</strong></p><p style="font-size:20px;font-weight:700">${escapeHtml(appointment)}</p><p>Votre espace client est à jour. Vous pouvez maintenant découvrir la construction de l’interview et commencer votre préparation.</p><p><a href="${url}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#654cff;color:#fff;text-decoration:none;font-weight:700">Préparer mon passage</a></p></div>`,text:`Votre rendez-vous Neptune Media est confirmé : ${appointment}. Préparez votre passage : ${url}`});}
function formatAppointment(value){const date=new Date(value||'');if(Number.isNaN(date.getTime()))return 'Le créneau confirmé est disponible dans votre espace client.';return new Intl.DateTimeFormat('fr-FR',{dateStyle:'full',timeStyle:'short',timeZone:'Europe/Paris'}).format(date);}
function escapeHtml(value){return String(value||'').replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function parseJson(value){try{return JSON.parse(String(value||'{}'));}catch{return {};}}
