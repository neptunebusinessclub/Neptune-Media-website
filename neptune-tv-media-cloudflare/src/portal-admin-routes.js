import { isSameOrigin, json } from './security.js';
import { adminAuth, normalizeOrderPayload, safeFilename } from './portal-http-utils.js';
import { sendAccess, sendStatusUpdate } from './portal-email.js';

const MAX_DIRECT_UPLOAD_BYTES=95*1024*1024;

export async function handlePortalAdminRoute(request,env,studio){
  const url=new URL(request.url);
  if(url.pathname==='/api/admin/clients'&&request.method==='GET')return callStore(studio,'/portal/admin-list',adminAuth(request));
  if(url.pathname==='/api/admin/client-order'&&request.method==='POST'){
    if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);
    const payload=await request.json().catch(()=>({}));
    const normalized=normalizeOrderPayload(payload,env);
    const response=await callStore(studio,'/portal/admin-upsert',{...adminAuth(request),payload:normalized});
    const result=await response.json().catch(()=>({}));if(!response.ok)return json(result,response.status);
    if(payload.sendEmail!==false&&result.email){
      const sent=await sendStatusUpdate(env,request.url,result.email,{...normalized,...result});
      if(!sent.ok)return json({...result,warning:sent.error});
    }
    return json(result);
  }
  if(url.pathname==='/api/admin/client-update'&&request.method==='POST'){
    if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);
    const payload=await request.json().catch(()=>({}));
    const response=await callStore(studio,'/portal/admin-update',{...adminAuth(request),payload});
    const result=await response.json().catch(()=>({}));if(!response.ok)return json(result,response.status);
    if(result.email){const sent=await sendStatusUpdate(env,request.url,result.email,result);if(!sent.ok)return json({...result,warning:sent.error});}
    return json(result);
  }
  if(url.pathname==='/api/admin/client-file'&&request.method==='POST')return proxyMutation(request,studio,'/portal/admin-file');
  if(url.pathname==='/api/admin/client-upload'&&request.method==='POST')return uploadClientFile(request,env,studio);
  if(url.pathname==='/api/admin/supplier-payment'&&request.method==='POST')return proxyMutation(request,studio,'/portal/admin-supplier-payment');
  if(url.pathname==='/api/admin/client-send-access'&&request.method==='POST'){
    if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);const payload=await request.json().catch(()=>({}));
    const response=await callStore(studio,'/portal/admin-access',{...adminAuth(request),email:String(payload.email||'').trim().toLowerCase()});const result=await response.json().catch(()=>({}));if(!response.ok)return json(result,response.status);
    const sent=await sendAccess(env,request.url,result.client.email,result.client.fullName||'');return sent.ok?json({ok:true,emailId:sent.id||null}):json({error:sent.error},503);
  }
  return null;
}

async function uploadClientFile(request,env,studio){
  if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);
  if(!env.MEDIA)return json({error:'media_storage_unavailable'},503);
  const auth=adminAuth(request);
  const validation=await callStore(studio,'/portal/admin-list',auth);
  if(!validation.ok)return validation;
  const form=await request.formData().catch(()=>null);
  const file=form?.get('file');
  const orderId=String(form?.get('orderId')||'').trim();
  const fileType=String(form?.get('fileType')||'livrable').trim();
  if(!(file instanceof File)||!orderId)return json({error:'invalid_file'},400);
  if(file.size<=0||file.size>MAX_DIRECT_UPLOAD_BYTES)return json({error:'file_too_large',maxBytes:MAX_DIRECT_UPLOAD_BYTES},413);
  const key=`clients/${orderId}/${Date.now()}-${crypto.randomUUID().slice(0,8)}-${safeFilename(file.name)}`;
  await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type||'application/octet-stream'},customMetadata:{source:'studio-client-upload',orderId,fileType}});
  const response=await callStore(studio,'/portal/admin-file',{...auth,payload:{orderId,name:file.name,fileType,storageKey:key,sizeLabel:formatBytes(file.size)}});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){await env.MEDIA.delete(key).catch(()=>{});return json(result,response.status);}
  return json({...result,key,size:file.size});
}

async function proxyMutation(request,studio,path){if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);const payload=await request.json().catch(()=>({}));return callStore(studio,path,{...adminAuth(request),payload});}
async function callStore(studio,path,body){return studio.fetch(`https://store${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});}
function formatBytes(bytes){const value=Number(bytes||0);if(value<1024)return `${value} o`;if(value<1024**2)return `${(value/1024).toFixed(1).replace('.',',')} Ko`;if(value<1024**3)return `${(value/1024**2).toFixed(1).replace('.',',')} Mo`;return `${(value/1024**3).toFixed(1).replace('.',',')} Go`;}
