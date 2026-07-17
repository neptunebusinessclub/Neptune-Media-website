import { isSameOrigin, json } from './security.js';
import { adminAuth, normalizeOrderPayload } from './portal-http-utils.js';
import { sendAccess } from './portal-email.js';

export async function handlePortalAdminRoute(request,env,studio){
  const url=new URL(request.url);
  if(url.pathname==='/api/admin/clients'&&request.method==='GET')return callStore(studio,'/portal/admin-list',adminAuth(request));
  if(url.pathname==='/api/admin/client-order'&&request.method==='POST'){
    if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);const payload=await request.json().catch(()=>({}));
    const response=await callStore(studio,'/portal/admin-upsert',{...adminAuth(request),payload:normalizeOrderPayload(payload,env)});const result=await response.json().catch(()=>({}));if(!response.ok)return json(result,response.status);
    if(payload.sendEmail!==false&&result.email){const sent=await sendAccess(env,request.url,result.email,payload.fullName||payload.name||'');if(!sent.ok)return json({...result,warning:sent.error});}return json(result);
  }
  if(url.pathname==='/api/admin/client-update'&&request.method==='POST')return proxyMutation(request,studio,'/portal/admin-update');
  if(url.pathname==='/api/admin/client-file'&&request.method==='POST')return proxyMutation(request,studio,'/portal/admin-file');
  if(url.pathname==='/api/admin/client-send-access'&&request.method==='POST'){
    if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);const payload=await request.json().catch(()=>({}));
    const response=await callStore(studio,'/portal/admin-access',{...adminAuth(request),email:String(payload.email||'').trim().toLowerCase()});const result=await response.json().catch(()=>({}));if(!response.ok)return json(result,response.status);
    const sent=await sendAccess(env,request.url,result.client.email,result.client.fullName||'');return sent.ok?json({ok:true}):json({error:sent.error},503);
  }
  return null;
}
async function proxyMutation(request,studio,path){if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);const payload=await request.json().catch(()=>({}));return callStore(studio,path,{...adminAuth(request),payload});}
async function callStore(studio,path,body){return studio.fetch(`https://store${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});}
