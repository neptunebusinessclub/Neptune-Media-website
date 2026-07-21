import application,{StudioStore} from './entry-v3.js';
import {handleMultipartRoute} from './multipart-v3.js';
import {isSameOrigin,json,securityHeaders} from './security.js';
import {handlePortalPublicRoute} from './portal-public-routes.js';
import {handlePortalAdminRoute} from './portal-admin-routes.js';
import {runPortalScheduled} from './portal-scheduled.js';
export {StudioStore};
const TRACKING_PATHS=new Set(['/api/track','/api/ad-track']);
const MAX_TRACKING_BYTES=16*1024;
const ADMIN_EMAIL='contact@neptunebusiness.com';
export default {
  async fetch(request,env,ctx){
    try{
      const url=new URL(request.url);
      if(TRACKING_PATHS.has(url.pathname)&&request.method==='POST'){
        const type=request.headers.get('Content-Type')||'';
        if(!/^application\/json(?:\s*;|$)/i.test(type))return secure(json({error:'unsupported_media_type'},415));
        const declared=Number(request.headers.get('Content-Length')||0);
        if(Number.isFinite(declared)&&declared>MAX_TRACKING_BYTES)return secure(json({error:'payload_too_large'},413));
        const body=await request.arrayBuffer();
        if(body.byteLength>MAX_TRACKING_BYTES)return secure(json({error:'payload_too_large'},413));
        try{JSON.parse(new TextDecoder().decode(body));}
        catch{return secure(json({error:'invalid_json'},400));}
        request=new Request(request,{body});
      }
      const studio=env.STUDIO.get(env.STUDIO.idFromName('neptune-media-main'));
      if(url.pathname==='/api/public/connexio-availability'&&request.method==='GET'){
        return secure(await studio.fetch('https://store/public/connexio-availability'));
      }
      if(url.pathname==='/api/auth/request-reset'&&request.method==='POST'){
        return secure(await handleAdminPasswordReset(request,env,studio));
      }
      const portal=await handlePortalPublicRoute(request,env,studio)||await handlePortalAdminRoute(request,env,studio);if(portal)return secure(portal);
      const multipart=await handleMultipartRoute(request,env);if(multipart)return secure(multipart);
      const response=await application.fetch(request,env,ctx);
      if(url.pathname==='/api/public/catalog'&&response.ok){
        if(request.method==='GET')return secure(await filterPublicCatalog(response));
        if(request.method==='HEAD')return secure(withNoStoreCatalogHeaders(response));
      }
      return response;
    }catch(error){
      console.error('entry_v4_failed',error);
      return secure(json({error:'internal_error'},500));
    }
  },
  async scheduled(controller,env,ctx){
    const studio=env.STUDIO.get(env.STUDIO.idFromName('neptune-media-main'));
    ctx.waitUntil(runPortalScheduled(env,studio).catch((error)=>console.error('portal_scheduled_failed',error)));
  },
};
async function handleAdminPasswordReset(request,env,studio){
  if(!isSameOrigin(request))return json({error:'origin_forbidden'},403);
  const payload=await request.json().catch(()=>({}));
  const email=String(payload.email||'').trim().toLowerCase();
  if(email!==ADMIN_EMAIL)return json({ok:true});
  const storeResponse=await studio.fetch('https://store/auth/request-reset',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email}),
  });
  const storeBody=await storeResponse.text();
  const reset=parseJson(storeBody);
  if(!storeResponse.ok){
    console.error('admin_reset_store_failed',{status:storeResponse.status,error:reset.error||'unknown'});
    return json({error:'reset_creation_failed'},502);
  }
  if(!reset.token){
    console.error('admin_reset_token_missing',{email,storeResult:reset});
    return json({error:'reset_creation_failed'},502);
  }
  if(!env.RESEND_API_KEY){
    console.error('admin_reset_email_not_configured');
    return json({error:'email_service_not_configured'},503);
  }
  const origin=new URL(request.url).origin;
  const resetUrl=`${origin}/studio/?reset=${encodeURIComponent(reset.token)}`;
  const from=env.AUTH_FROM_EMAIL||'Neptune Media <onboarding@resend.dev>';
  const resendResponse=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{
      Authorization:`Bearer ${env.RESEND_API_KEY}`,
      'Content-Type':'application/json',
    },
    body:JSON.stringify({
      from,
      to:[email],
      subject:'Accès sécurisé au Studio Neptune Media',
      html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px"><p style="font-weight:800;letter-spacing:.14em;color:#684cff">NEPTUNE MEDIA</p><h1>Accès sécurisé au Studio</h1><p>Utilisez ce lien pour créer ou réinitialiser votre mot de passe.</p><p><a href="${resetUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#5b42ff;color:#fff;text-decoration:none;font-weight:700">Choisir mon mot de passe</a></p><p>Ce lien expire dans 20 minutes et ne peut être utilisé qu’une fois.</p></div>`,
      text:`Créez ou réinitialisez votre mot de passe Studio Neptune Media : ${resetUrl}\nCe lien expire dans 20 minutes.`,
    }),
  });
  const resendBody=await resendResponse.text();
  const resendResult=parseJson(resendBody);
  if(!resendResponse.ok){
    console.error('admin_reset_resend_failed',{
      status:resendResponse.status,
      code:resendResult.name||resendResult.code||'',
      message:resendResult.message||resendBody.slice(0,300),
      from,
      to:email,
    });
    return json({error:'email_send_failed'},503);
  }
  if(!resendResult.id){
    console.error('admin_reset_resend_id_missing',{status:resendResponse.status,response:resendResult});
    return json({error:'email_send_unconfirmed'},502);
  }
  console.log('admin_reset_email_sent',{emailId:resendResult.id,to:email,from});
  return json({ok:true,emailId:resendResult.id});
}
async function filterPublicCatalog(response){
  const catalog=await response.json();
  const programs=(catalog.programs||[]).filter(isActiveProgram);
  const programIds=new Set(programs.map((program)=>program.id));
  const episodes=(catalog.episodes||[]).filter((episode)=>programIds.has(episode.programId)&&episode.status==='published'&&Boolean(episode.slug&&episode.videoUrl&&episode.posterUrl));
  const headers=cleanCatalogHeaders(response.headers);
  headers.set('Content-Type','application/json; charset=utf-8');
  return new Response(JSON.stringify({...catalog,programs,episodes}),{status:response.status,statusText:response.statusText,headers});
}
function withNoStoreCatalogHeaders(response){
  return new Response(null,{status:response.status,statusText:response.statusText,headers:cleanCatalogHeaders(response.headers)});
}
function cleanCatalogHeaders(source){
  const headers=new Headers(source);
  headers.set('Cache-Control','no-store');
  headers.delete('Content-Length');
  headers.delete('ETag');
  headers.delete('Last-Modified');
  return headers;
}
function parseJson(value){try{return JSON.parse(String(value||'{}'));}catch{return {};}}
function isActiveProgram(program){return Boolean(program?.slug)&&program.active!==false&&Number(program.active??1)!==0;}
function secure(response){const headers=new Headers(response.headers);for(const [key,value] of Object.entries(securityHeaders()))headers.set(key,value);return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}
