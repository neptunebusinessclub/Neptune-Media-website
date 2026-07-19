import application,{StudioStore} from './entry-v3.js';
import {handleMultipartRoute} from './multipart-v3.js';
import {json,securityHeaders} from './security.js';
import {handlePortalPublicRoute} from './portal-public-routes.js';
import {handlePortalAdminRoute} from './portal-admin-routes.js';
export {StudioStore};
const TRACKING_PATHS=new Set(['/api/track','/api/ad-track']);
const MAX_TRACKING_BYTES=16*1024;
export default {async fetch(request,env,ctx){
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
}};
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
function isActiveProgram(program){return Boolean(program?.slug)&&program.active!==false&&Number(program.active??1)!==0;}
function secure(response){const headers=new Headers(response.headers);for(const [key,value] of Object.entries(securityHeaders()))headers.set(key,value);return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}
