import { isSameOrigin, json } from './security.js';
import { adminAuth, normalizeOrderPayload, safeFilename } from './portal-http-utils.js';
import { sendAccess, sendStatusUpdate } from './portal-email.js';
import { sendFeedbackForOrder } from './portal-scheduled.js';
import { generateContentMetadata } from './portal-content-ai.js';
import { isShortType } from './portal-content.js';

const MAX_DIRECT_UPLOAD_BYTES=95*1024*1024;

export async function handlePortalAdminRoute(request,env,studio){
  const url=new URL(request.url);
  if(url.pathname==='/api/admin/clients'&&request.method==='GET')return callStore(studio,'/portal/admin-list',adminAuth(request));
  if(url.pathname==='/api/admin/client-feedback'&&request.method==='GET')return getAdminFeedback(request,studio);
  if(url.pathname==='/api/admin/client-referrals'&&request.method==='GET')return getAdminReferrals(request,studio);
  if(url.pathname==='/api/admin/client-order'&&request.method==='POST'){
    if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);
    const payload=await request.json().catch(()=>({}));
    const normalized=normalizeOrderPayload(payload,env);
    const response=await callStore(studio,'/portal/admin-upsert',{...adminAuth(request),payload:normalized});
    const result=await response.json().catch(()=>({}));if(!response.ok)return json(result,response.status);
    const warnings=[];
    if(payload.sendEmail!==false&&result.email){
      const sent=await sendStatusUpdate(env,request.url,result.email,{...normalized,...result});
      if(!sent.ok)warnings.push(sent.error);
    }
    if(['delivered','completed'].includes(result.status)){
      const feedback=await sendFeedbackForOrder(env,request.url,studio,result.orderId);
      if(!feedback.ok)warnings.push(feedback.error);
    }
    return json(warnings.length?{...result,warning:warnings.join(',')} : result);
  }
  if(url.pathname==='/api/admin/client-update'&&request.method==='POST'){
    if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);
    const payload=await request.json().catch(()=>({}));
    const response=await callStore(studio,'/portal/admin-update',{...adminAuth(request),payload});
    const result=await response.json().catch(()=>({}));if(!response.ok)return json(result,response.status);
    const warnings=[];
    if(result.email){
      const sent=await sendStatusUpdate(env,request.url,result.email,result);
      if(!sent.ok)warnings.push(sent.error);
    }
    if(['delivered','completed'].includes(result.status)){
      const feedback=await sendFeedbackForOrder(env,request.url,studio,result.orderId);
      if(!feedback.ok)warnings.push(feedback.error);
    }
    return json(warnings.length?{...result,warning:warnings.join(',')} : result);
  }
  if(url.pathname==='/api/admin/client-file'&&request.method==='POST')return addExternalClientFile(request,env,studio);
  if(url.pathname==='/api/admin/client-upload'&&request.method==='POST')return uploadClientFile(request,env,studio);
  if(url.pathname==='/api/admin/content-regenerate'&&request.method==='POST')return regenerateContent(request,env,studio);
  if(url.pathname==='/api/admin/supplier-payment'&&request.method==='POST')return proxyMutation(request,studio,'/portal/admin-supplier-payment');
  if(url.pathname==='/api/admin/client-send-access'&&request.method==='POST'){
    if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);const payload=await request.json().catch(()=>({}));
    const response=await callStore(studio,'/portal/admin-access',{...adminAuth(request),email:String(payload.email||'').trim().toLowerCase()});const result=await response.json().catch(()=>({}));if(!response.ok)return json(result,response.status);
    const sent=await sendAccess(env,request.url,result.client.email,result.client.fullName||'');return sent.ok?json({ok:true,emailId:sent.id||null}):json({error:sent.error},503);
  }
  return null;
}

async function getAdminFeedback(request,studio){
  const auth=adminAuth(request);
  const validation=await callStore(studio,'/portal/admin-list',auth);
  if(!validation.ok)return validation;
  return callStore(studio,'/portal/feedback-admin-list',auth);
}

async function getAdminReferrals(request,studio){
  const auth=adminAuth(request);
  const validation=await callStore(studio,'/portal/admin-list',auth);
  if(!validation.ok)return validation;
  return callStore(studio,'/portal/referral-admin-list',auth);
}

async function addExternalClientFile(request,env,studio){
  if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);
  const payload=await request.json().catch(()=>({}));
  const auth=adminAuth(request);
  const response=await callStore(studio,'/portal/admin-file',{...auth,payload});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)return json(result,response.status);
  const ai=await maybeGenerateContent(env,studio,auth,result.fileId,payload.fileType,payload.contentContext||payload.editorialContext||'');
  return json({...result,ai});
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
  const contentContext=String(form?.get('contentContext')||'').trim().slice(0,3000);
  if(!(file instanceof File)||!orderId)return json({error:'invalid_file'},400);
  if(file.size<=0||file.size>MAX_DIRECT_UPLOAD_BYTES)return json({error:'file_too_large',maxBytes:MAX_DIRECT_UPLOAD_BYTES},413);
  const key=`clients/${orderId}/${Date.now()}-${crypto.randomUUID().slice(0,8)}-${safeFilename(file.name)}`;
  await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type||'application/octet-stream'},customMetadata:{source:'studio-client-upload',orderId,fileType}});
  const response=await callStore(studio,'/portal/admin-file',{...auth,payload:{orderId,name:file.name,fileType,storageKey:key,sizeLabel:formatBytes(file.size)}});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){await env.MEDIA.delete(key).catch(()=>{});return json(result,response.status);}
  const ai=await maybeGenerateContent(env,studio,auth,result.fileId,fileType,contentContext);
  return json({...result,key,size:file.size,ai});
}

async function regenerateContent(request,env,studio){
  if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);
  const payload=await request.json().catch(()=>({}));
  const auth=adminAuth(request);
  const result=await maybeGenerateContent(env,studio,auth,String(payload.fileId||''),String(payload.fileType||'short'),String(payload.contentContext||''));
  return result?.ok===false?json(result,502):json({ok:true,ai:result});
}

async function maybeGenerateContent(env,studio,auth,fileId,fileType,editorialContext){
  if(!fileId||!isShortType(fileType))return null;
  try{
    const contextResponse=await callStore(studio,'/portal/content-admin-context',{...auth,payload:{fileId}});
    const context=await contextResponse.json().catch(()=>({}));
    if(!contextResponse.ok||!context.item)return {ok:false,error:context.error||'content_context_failed'};
    const metadata=await generateContentMetadata(env,{...context.item,filename:context.item.name,editorialContext});
    const saveResponse=await callStore(studio,'/portal/content-admin-save',{...auth,payload:{fileId,...metadata}});
    const saved=await saveResponse.json().catch(()=>({}));
    if(!saveResponse.ok)return {ok:false,error:saved.error||'content_save_failed'};
    return {ok:true,...metadata};
  }catch(error){
    console.error('content_generation_pipeline_failed',error);
    return {ok:false,error:'content_generation_failed'};
  }
}

async function proxyMutation(request,studio,path){if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);const payload=await request.json().catch(()=>({}));return callStore(studio,path,{...adminAuth(request),payload});}
async function callStore(studio,path,body){return studio.fetch(`https://store${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});}
function formatBytes(bytes){const value=Number(bytes||0);if(value<1024)return `${value} o`;if(value<1024**2)return `${(value/1024).toFixed(1).replace('.',',')} Ko`;if(value<1024**3)return `${(value/1024**2).toFixed(1).replace('.',',')} Mo`;return `${(value/1024**3).toFixed(1).replace('.',',')} Go`;}
