import { isSameOrigin, json, timingSafeEqual } from './security.js';
import { clientToken, clientCookie, normalizeOrderPayload, safeFilename } from './portal-http-utils.js';
import { sendCode, sendOrderConfirmation } from './portal-email.js';

export async function handlePortalPublicRoute(request,env,studio){
  const url=new URL(request.url);
  if(url.pathname==='/api/client/request-code'&&request.method==='POST'){
    if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);
    const payload=await request.json().catch(()=>({}));
    const email=String(payload.email||'').trim().toLowerCase();
    const response=await callStore(studio,'/portal/request-code',{email});const result=await response.json().catch(()=>({}));
    if(!response.ok)return json(result,response.status);
    if(result.deliver&&result.code){const sent=await sendCode(env,request.url,email,result.code);if(!sent.ok)return json({error:sent.error},503);}
    return json({ok:true,retryAfter:result.retryAfter||0});
  }
  if(url.pathname==='/api/client/verify-code'&&request.method==='POST'){
    if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);
    const payload=await request.json().catch(()=>({}));const response=await callStore(studio,'/portal/verify-code',payload);const result=await response.json().catch(()=>({}));
    if(!response.ok)return json(result,response.status);
    return json({ok:true,client:result.client},200,{'Set-Cookie':clientCookie(result.token,request.url,result.expiresIn)});
  }
  if(url.pathname==='/api/client/session'&&request.method==='GET')return callStore(studio,'/portal/session',{token:clientToken(request)});
  if(url.pathname==='/api/client/logout'&&request.method==='POST'){
    if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);
    await callStore(studio,'/portal/logout',{token:clientToken(request)});
    return json({ok:true},200,{'Set-Cookie':clientCookie('',request.url,0)});
  }
  if(url.pathname.startsWith('/api/client/files/')&&request.method==='GET'){
    const fileId=decodeURIComponent(url.pathname.slice('/api/client/files/'.length));
    const response=await callStore(studio,'/portal/file-authorize',{token:clientToken(request),fileId});const result=await response.json().catch(()=>({}));
    if(!response.ok)return json(result,response.status);const file=result.file||{};
    if(file.storageKey){const object=await env.MEDIA.get(file.storageKey);if(!object)return json({error:'file_not_found'},404);const headers=new Headers({'Cache-Control':'private, no-store','Content-Disposition':`attachment; filename="${safeFilename(file.name)}"`});if(object.httpMetadata?.contentType)headers.set('Content-Type',object.httpMetadata.contentType);if(object.httpEtag)headers.set('ETag',object.httpEtag);return new Response(object.body,{headers});}
    if(file.externalUrl)return new Response(null,{status:302,headers:{Location:file.externalUrl,'Cache-Control':'private, no-store'}});
    return json({error:'file_not_found'},404);
  }
  if(url.pathname==='/api/webhooks/client-order'&&request.method==='POST'){
    const supplied=request.headers.get('X-Neptune-Webhook-Secret')||'';
    if(!env.CONVERSION_WEBHOOK_SECRET||!timingSafeEqual(supplied,env.CONVERSION_WEBHOOK_SECRET))return json({error:'unauthorized'},401);
    const payload=await request.json().catch(()=>({}));const normalized=normalizeOrderPayload(payload,env);
    const response=await callStore(studio,'/portal/order-upsert',normalized);const result=await response.json().catch(()=>({}));
    if(!response.ok)return json(result,response.status);
    if(result.created&&result.email){const sent=await sendOrderConfirmation(env,request.url,result.email,payload);if(!sent.ok)console.error('client_order_confirmation_failed',sent.error);}
    return json(result);
  }
  return null;
}
async function callStore(studio,path,body){return studio.fetch(`https://store${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});}
