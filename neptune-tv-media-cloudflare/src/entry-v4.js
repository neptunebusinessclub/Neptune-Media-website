import application,{StudioStore} from './entry-v3.js';
import {handleMultipartRoute} from './multipart-v3.js';
import {securityHeaders} from './security.js';
import {handlePortalPublicRoute} from './portal-public-routes.js';
import {handlePortalAdminRoute} from './portal-admin-routes.js';
export {StudioStore};
export default {async fetch(request,env,ctx){
  const studio=env.STUDIO.get(env.STUDIO.idFromName('neptune-media-main'));
  const portal=await handlePortalPublicRoute(request,env,studio)||await handlePortalAdminRoute(request,env,studio);if(portal)return secure(portal);
  const multipart=await handleMultipartRoute(request,env);if(multipart)return secure(multipart);
  return application.fetch(request,env,ctx);
}};
function secure(response){const headers=new Headers(response.headers);for(const [key,value] of Object.entries(securityHeaders()))headers.set(key,value);return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}
