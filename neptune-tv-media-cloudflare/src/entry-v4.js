import application,{StudioStore} from './entry-v3.js';
import {handleMultipartRoute} from './multipart-v3.js';
import {json,securityHeaders} from './security.js';
import {handlePortalPublicRoute} from './portal-public-routes.js';
import {handlePortalAdminRoute} from './portal-admin-routes.js';
export {StudioStore};
const TRACKING_PATHS=new Set(['/api/track','/api/ad-track']);
const MAX_TRACKING_BYTES=16*1024;
export default {async fetch(request,env,ctx){
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
  return application.fetch(request,env,ctx);
}};
function secure(response){const headers=new Headers(response.headers);for(const [key,value] of Object.entries(securityHeaders()))headers.set(key,value);return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}