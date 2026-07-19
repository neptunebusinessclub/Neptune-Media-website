import { json, randomToken, sha256 } from './security.js';
import { CODE_TTL, SESSION_TTL, normalizeEmail } from './portal-utils.js';

const INTERNAL_PORTAL_EMAIL = 'contact@neptunebusiness.com';

export async function requestCode(store,body){
  const email=normalizeEmail(body.email);if(!email)return json({ok:true,deliver:false,reason:'invalid_email'});
  let client=store.sql.exec('SELECT id,active FROM portal_clients WHERE email=?',email).toArray()[0];
  if(email===INTERNAL_PORTAL_EMAIL&&(!client||Number(client.active)!==1)){
    const now=new Date().toISOString();
    if(client){
      store.sql.exec('UPDATE portal_clients SET active=1,updated_at=? WHERE id=?',now,client.id);
    }else{
      store.sql.exec('INSERT INTO portal_clients (id,email,full_name,company,active,created_at,updated_at,last_access_at) VALUES (?,?,?,?,?,?,?,NULL)',crypto.randomUUID(),email,'Neptune Business','Neptune Business',1,now,now);
    }
    client=store.sql.exec('SELECT id,active FROM portal_clients WHERE email=?',email).toArray()[0];
  }
  if(!client||Number(client.active)!==1)return json({ok:true,deliver:false,reason:'client_not_found'});
  const now=new Date(),hourAgo=new Date(now.getTime()-3600000).toISOString();
  const recent=store.sql.exec('SELECT created_at AS createdAt FROM portal_codes WHERE email=? AND created_at>? ORDER BY created_at DESC',email,hourAgo).toArray();
  if(recent.length>=5)return json({ok:true,deliver:false,throttled:true});
  const last=recent[0]?.createdAt?new Date(recent[0].createdAt).getTime():0;
  if(last&&now.getTime()-last<60000)return json({ok:true,deliver:false,retryAfter:Math.ceil((60000-(now.getTime()-last))/1000)});
  const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0');
  store.sql.exec('UPDATE portal_codes SET used_at=? WHERE email=? AND used_at IS NULL',now.toISOString(),email);
  store.sql.exec('INSERT INTO portal_codes (id,email,code_hash,expires_at,created_at,used_at) VALUES (?,?,?,?,?,NULL)',crypto.randomUUID(),email,await sha256(`${email}:${code}`),new Date(now.getTime()+CODE_TTL*1000).toISOString(),now.toISOString());
  cleanup(store);return json({ok:true,deliver:true,code,expiresIn:CODE_TTL});
}
export async function verifyCode(store,body){
  const email=normalizeEmail(body.email),code=String(body.code||'').replace(/\D/gu,'').slice(0,6),now=new Date();
  if(!email||code.length!==6)return json({error:'invalid_code'},400);
  const attempts=store.sql.exec('SELECT count,locked_until AS lockedUntil,window_started_at AS windowStartedAt FROM portal_auth_attempts WHERE email=?',email).toArray()[0];
  if(attempts?.lockedUntil&&new Date(attempts.lockedUntil)>now)return json({error:'too_many_attempts'},429);
  const hash=await sha256(`${email}:${code}`);
  const row=store.sql.exec('SELECT id FROM portal_codes WHERE email=? AND code_hash=? AND used_at IS NULL AND expires_at>? ORDER BY created_at DESC LIMIT 1',email,hash,now.toISOString()).toArray()[0];
  const client=store.sql.exec('SELECT id,email,full_name AS fullName,company FROM portal_clients WHERE email=? AND active=1',email).toArray()[0];
  if(!row||!client){recordFailure(store,email,now,attempts);return json({error:'invalid_or_expired_code'},401);}
  store.sql.exec('UPDATE portal_codes SET used_at=? WHERE id=?',now.toISOString(),row.id);store.sql.exec('DELETE FROM portal_auth_attempts WHERE email=?',email);
  const token=randomToken(32),expiresAt=new Date(now.getTime()+SESSION_TTL*1000).toISOString();
  store.sql.exec('INSERT INTO portal_sessions (id,client_id,token_hash,expires_at,created_at,last_seen_at) VALUES (?,?,?,?,?,?)',crypto.randomUUID(),client.id,await sha256(token),expiresAt,now.toISOString(),now.toISOString());
  store.sql.exec('UPDATE portal_clients SET last_access_at=?,updated_at=? WHERE id=?',now.toISOString(),now.toISOString(),client.id);cleanup(store);
  return json({ok:true,token,expiresIn:SESSION_TTL,client});
}
export async function portalSession(store,body){
  const client=await requireClient(store,body.token);if(!client)return json({authenticated:false},401);
  const now=new Date().toISOString();store.sql.exec('UPDATE portal_sessions SET last_seen_at=? WHERE id=?',now,client.sessionId);
  const orders=store.sql.exec(`SELECT id,order_reference AS orderReference,product_code AS productCode,title,format,payment_status AS paymentStatus,amount_total AS amountTotal,currency,status,appointment_at AS appointmentAt,filming_at AS filmingAt,next_action AS nextAction,preparation_url AS preparationUrl,booking_url AS bookingUrl,created_at AS createdAt,updated_at AS updatedAt FROM portal_orders WHERE client_id=? ORDER BY created_at DESC`,client.id).toArray();
  for(const order of orders){order.steps=store.sql.exec('SELECT step_key AS stepKey,label,state,display_order AS displayOrder,completed_at AS completedAt,note FROM portal_steps WHERE order_id=? ORDER BY display_order',order.id).toArray();order.files=store.sql.exec(`SELECT id,name,file_type AS fileType,size_label AS sizeLabel,created_at AS createdAt FROM portal_files WHERE order_id=? ORDER BY created_at DESC`,order.id).toArray().map(file=>({...file,downloadUrl:`/api/client/files/${encodeURIComponent(file.id)}`}));}
  delete client.sessionId;delete client.expiresAt;return json({authenticated:true,client,orders});
}
export async function logout(store,body){if(body.token)store.sql.exec('DELETE FROM portal_sessions WHERE token_hash=?',await sha256(String(body.token)));return json({ok:true});}
export async function requireClient(store,token){if(!token)return null;const now=new Date().toISOString();const row=store.sql.exec(`SELECT s.id AS sessionId,s.expires_at AS expiresAt,c.id,c.email,c.full_name AS fullName,c.company,c.active FROM portal_sessions s JOIN portal_clients c ON c.id=s.client_id WHERE s.token_hash=?`,await sha256(String(token))).toArray()[0];if(!row||Number(row.active)!==1||row.expiresAt<=now){if(row?.sessionId)store.sql.exec('DELETE FROM portal_sessions WHERE id=?',row.sessionId);return null;}return row;}
function recordFailure(store,email,now,row){if(!row||now-new Date(row.windowStartedAt)>900000){store.sql.exec('INSERT OR REPLACE INTO portal_auth_attempts (email,count,window_started_at,locked_until) VALUES (?,?,?,NULL)',email,1,now.toISOString());return;}const count=Number(row.count)+1;store.sql.exec('UPDATE portal_auth_attempts SET count=?,locked_until=? WHERE email=?',count,count>=6?new Date(now.getTime()+900000).toISOString():null,email);}
function cleanup(store){const now=new Date().toISOString();store.sql.exec('DELETE FROM portal_sessions WHERE expires_at<=?',now);store.sql.exec('DELETE FROM portal_codes WHERE expires_at<=? OR used_at IS NOT NULL',new Date(Date.now()-86400000).toISOString());}