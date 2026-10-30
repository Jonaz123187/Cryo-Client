// Public profiles still require a one-use Minecraft session proof; UUID claims alone never authenticate.
const MAX_BODY = 8192;
const enc = new TextEncoder();
export function uuid(value) {
  if (typeof value !== 'string' || !/^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(value)) throw new Failure(400, 'invalid_uuid');
  return value.replaceAll('-', '').toLowerCase();
}
export class Failure extends Error { constructor(status, code, upstreamStatus) { super(code); this.status = status;if(Number.isInteger(upstreamStatus)&&upstreamStatus>=100&&upstreamStatus<=599)this.upstreamStatus=upstreamStatus; } }
function allowed(env, id) {
  return env.PRIVATE_TEST === 'true'
    ? (env.ALLOWED_UUIDS || '').split(',').some(s => s.trim().replaceAll('-', '').toLowerCase() === id)
    : /^[a-f0-9]{32}$/.test(id);
}
export function sanitizeProfile(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Failure(400, 'invalid_profile');
  const result = {};
  if (!['ORIGINAL','SOLID','GRADIENT','RAINBOW','PULSE','SHIMMER','AURORA','CHROME','FROST','WAVE','STATIC_GRADIENT'].includes(p.effect)) throw new Failure(400, 'invalid_effect');
  result.effect = p.effect;
  for (const k of ['firstColor','secondColor']) {
    if (typeof p[k] !== 'string' || !/^#[a-f0-9]{6}$/i.test(p[k])) throw new Failure(400, 'invalid_color');
    result[k] = p[k].toUpperCase();
  }
  if (typeof p.speed !== 'number' || !Number.isFinite(p.speed) || p.speed < .2 || p.speed > 3) throw new Failure(400, 'invalid_speed');
  result.speed = p.speed;
  for (const k of ['bold','shadow','outline','aboveHead','inChat','inTab','reducedMotion']) {
    if (typeof p[k] !== 'boolean') throw new Failure(400, 'invalid_flag');
    result[k] = p[k];
  }
  for(const [k,fallback] of Object.entries({thirdColor:'#E7F3FF',outlineColor:'#080A10',shadowColor:'#000000',highlightColor:'#E3F2FF'})){
    const v=p[k]??fallback;if(typeof v!=='string'||!/^#[a-f0-9]{6}$/i.test(v))throw new Failure(400,'invalid_color');result[k]=v.toUpperCase();
  }
  for(const [k,fallback,min,max] of [['intensity',.75,0,1],['pause',2,0,10],['shadowOpacity',.8,0,1]]){
    const v=p[k]??fallback;if(typeof v!=='number'||!Number.isFinite(v)||v<Number(min)||v>Number(max))throw new Failure(400,'invalid_value');result[k]=v;
  }
  for(const k of ['useThirdColor','reverse','quietChat','highlight']){const v=p[k]??false;if(typeof v!=='boolean')throw new Failure(400,'invalid_flag');result[k]=v;}
  const stroke=p.outlineWidth??1;if(!Number.isInteger(stroke)||stroke<1||stroke>3)throw new Failure(400,'invalid_value');result.outlineWidth=stroke;
  result.banner=['midnight','aurora','sunset','custom'].includes(p.banner)?p.banner:'midnight';
  const back=p.backBanner??'none';
  if(!['none','nivo','ice','aurora','sunset','custom'].includes(back))throw new Failure(400,'invalid_back_banner');
  const asset=p.backBannerAsset??'';if(asset!==''&&(typeof asset!=='string'||!/^[a-f0-9]{64}$/.test(asset)))throw new Failure(400,'invalid_banner_asset');
  result.backBanner=back;result.backBannerAsset=back==='custom'?asset:'';
  for(const k of ['cosmeticBanner','cosmeticWings','cosmeticShield']){const v=p[k]??'none';const allowed=k==='cosmeticShield'?['none','zzv4','million','green','blue','red','purple','gold','cyan','pink']:['none','zzv4','500k','million'];if(!allowed.includes(v))throw new Failure(400,'invalid_cosmetic');result[k]=v;}
  return result; // Never store arbitrary names, tokens, URLs, skin data or HUD layouts.
}
async function digest(s) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))].map(b => b.toString(16).padStart(2,'0')).join(''); }
export async function usageKey(env,id) {
  if(typeof env.USAGE_SECRET!=='string'||env.USAGE_SECRET.length<32)throw new Failure(503,'statistics_not_configured');
  const key=await crypto.subtle.importKey('raw',enc.encode(env.USAGE_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(`nivo-usage-v1:${id}`)))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function recordUsage(env,id,b,now) {
  const key=await usageKey(env,id);
  if(b.consent===false){await env.DB.batch([env.DB.prepare('DELETE FROM usage_daily WHERE user_key=?').bind(key),env.DB.prepare('DELETE FROM usage_users WHERE user_key=?').bind(key)]);return;}
  if(b.consent!==true||!['launcher','game'].includes(b.kind)||typeof b.version!=='string'||!/^\d+\.\d+\.\d+(?:[-.a-zA-Z0-9]*)$/.test(b.version)||b.version.length>48)throw new Failure(400,'invalid_usage');
  const day=new Date(now*1000).toISOString().slice(0,10);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO usage_users(user_key,first_seen,last_seen) VALUES(?,?,?) ON CONFLICT(user_key) DO UPDATE SET last_seen=excluded.last_seen').bind(key,now,now),
    env.DB.prepare('INSERT INTO usage_daily(day,user_key,kind,version,last_seen) VALUES(?,?,?,?,?) ON CONFLICT(day,user_key,kind) DO UPDATE SET version=excluded.version,last_seen=excluded.last_seen').bind(day,key,b.kind,b.version,now)
  ]);
}
async function statistics(env,id,now){
  if(!env.STATS_OWNER_UUID||uuid(env.STATS_OWNER_UUID)!==id)throw new Failure(403,'owner_only');
  const today=new Date(now*1000).toISOString().slice(0,10),month=new Date((now-29*86400)*1000).toISOString().slice(0,10);
  const active=await env.DB.prepare('SELECT COUNT(*) AS count FROM profiles WHERE seen>?').bind(now-120).first();
  const registered=await env.DB.prepare('SELECT COUNT(*) AS count,MIN(first_seen) AS since FROM registered_users').first();
  const peak=await env.DB.prepare('SELECT peak,sampled FROM statistics_peak WHERE id=1').first();
  const total=await env.DB.prepare('SELECT COUNT(*) AS count FROM usage_users').first();
  const daily=await env.DB.prepare('SELECT day,COUNT(DISTINCT user_key) AS users FROM usage_daily WHERE day>=? GROUP BY day ORDER BY day').bind(month).all();
  const monthly=await env.DB.prepare('SELECT COUNT(DISTINCT user_key) AS count FROM usage_daily WHERE day>=?').bind(month).first();
  const versions=await env.DB.prepare('SELECT kind,version,COUNT(*) AS users FROM usage_daily WHERE day=? GROUP BY kind,version ORDER BY users DESC LIMIT 40').bind(today).all();
  return {measuredAt:now,registered:registered.count,registrationSince:registered.since,activeGame:active.count,peakOnline:Math.max(peak?.peak??0,active.count),peakSampled:peak?.sampled??null,participatingTotal:total.count,participating30Days:monthly.count,daily:daily.results,versions:versions.results,historyDays:35};
}
function random() { return [...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join(''); }
function reply(data, status=200) { return new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}}); }
async function body(request,max=MAX_BODY) {
  if (!(request.headers.get('content-type') || '').startsWith('application/json')) throw new Failure(415, 'json_required');
  if (Number(request.headers.get('content-length')) > max) throw new Failure(413,'body_too_large');
  const reader = request.body?.getReader(); if (!reader) throw new Failure(400,'body_required');
  let size=0, chunks=[];
  for (;;) { const {value,done}=await reader.read(); if(done)break; size+=value.length; if(size>max){await reader.cancel();throw new Failure(413,'body_too_large');} chunks.push(value); }
  const bytes=new Uint8Array(size); let offset=0; for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new Failure(400,'invalid_json');}
}
async function rate(request, env, now, path) {
  const ip=request.headers.get('CF-Connecting-IP') || 'local';
  const bucket=await digest(`${ip}:${Math.floor(now/60)}:${path === '/v1/challenge' ? 'auth' : 'api'}`);
  const row=await env.DB.prepare('INSERT INTO limits(bucket,count,expires) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(bucket,now+120).first();
  if(row.count > (path === '/v1/challenge' ? 6 : 120))throw new Failure(429,'rate_limited');
}
async function session(request,env,now) {
  const header=request.headers.get('authorization')||'';
  if(!/^Bearer [a-f0-9]{64}$/.test(header))throw new Failure(401,'authentication_required');
  const s=await env.DB.prepare('SELECT uuid FROM sessions WHERE token_hash=? AND expires>?').bind(await digest(header.slice(7)),now).first();
  if(!s || !allowed(env,s.uuid))throw new Failure(401,'session_expired');
  return s.uuid;
}
async function sessionResponse(challenge,env,upstream){
  const target=env.MINECRAFT_VERIFIER_URL,key=env.MINECRAFT_VERIFIER_PUBLIC_KEY;
  if(target||key){
    if(typeof target!=='string'||!/^https:\/\/[a-z0-9]{20}\.supabase\.co\/functions\/v1\/nivo-minecraft-verify$/.test(target)||typeof key!=='string'||!/^sb_publishable_[a-zA-Z0-9_-]+$/.test(key))throw new Failure(503,'minecraft_verifier_not_configured');
    let response;try{response=await upstream(target,{method:'POST',redirect:'manual',signal:AbortSignal.timeout(8000),headers:{'content-type':'application/json',apikey:key,authorization:'Bearer '+key},body:JSON.stringify({username:challenge.username,serverId:challenge.server_hash})});}catch{throw new Failure(502,'minecraft_verifier_unreachable');}
    if(response.status!==200)throw new Failure(502,'minecraft_verifier_unavailable',response.status);
    let data;try{data=await body(response);}catch{throw new Failure(502,'minecraft_invalid_response');}
    if(data.verified===true&&data.profile&&typeof data.profile.id==='string')return Response.json(data.profile);
    if(data.verified===false&&Number.isInteger(data.upstreamStatus)&&data.upstreamStatus>=201&&data.upstreamStatus<=599)return new Response(null,{status:data.upstreamStatus});
    throw new Failure(502,'minecraft_invalid_response');
  }
  const url=new URL('https://sessionserver.mojang.com/session/minecraft/hasJoined');url.searchParams.set('username',challenge.username);url.searchParams.set('serverId',challenge.server_hash);
  try{return await upstream(url.toString(),{signal:AbortSignal.timeout(8000),redirect:'manual',headers:{accept:'application/json','user-agent':'NivoProfileService/0.1 (+https://cryo-client.pages.dev)','cache-control':'no-cache'}});}catch{throw new Failure(502,'minecraft_service_unreachable');}
}
export async function handle(request, env, upstream=fetch) {
  const path=new URL(request.url).pathname, now=Math.floor(Date.now()/1000);
  if(path==='/health' && request.method==='GET')return reply({service:'nivo-profiles',version:1,revision:'public-profiles-4',statistics:1,cosmetics:1,registration:env.PRIVATE_TEST==='true'?'private':'minecraft-verified',verifier:env.MINECRAFT_VERIFIER_URL?'supabase':'direct'});
  if(/^\/v1\/banners\/[a-f0-9]{64}$/.test(path)&&request.method==='GET'){
    if(!env.DB)throw new Failure(503,'database_not_configured');await rate(request,env,now,path);
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS banner_assets (owner TEXT PRIMARY KEY, hash TEXT NOT NULL, data BLOB NOT NULL)').run();
    const row=await env.DB.prepare('SELECT data FROM banner_assets WHERE hash=? LIMIT 1').bind(path.split('/').at(-1)).first();
    if(!row)throw new Failure(404,'banner_not_found');
    // D1 JSON results represent BLOBs as arrays, which Response would stringify.
    const bytes=row.data instanceof ArrayBuffer?new Uint8Array(row.data):ArrayBuffer.isView(row.data)?new Uint8Array(row.data.buffer,row.data.byteOffset,row.data.byteLength):Array.isArray(row.data)&&row.data.every(v=>Number.isInteger(v)&&v>=0&&v<=255)?new Uint8Array(row.data):null;
    if(!bytes||bytes.byteLength!==491520)throw new Failure(500,'invalid_banner_asset');
    return new Response(bytes,{headers:{'content-type':'application/octet-stream','cache-control':'public, max-age=86400, immutable','x-content-type-options':'nosniff'}});
  }
  if(!['/v1/challenge','/v1/verify','/v1/presence','/v1/profiles','/v1/logout','/v1/banner','/v1/usage','/v1/stats'].includes(path))throw new Failure(404,'not_found');
  if(request.method!=='POST')throw new Failure(405,'post_required');
  if(!env.DB)throw new Failure(503,'database_not_configured');
  await rate(request,env,now,path);
  const b=await body(request,path==='/v1/banner'?700000:MAX_BODY);
  if(!b || typeof b!=='object' || Array.isArray(b))throw new Failure(400,'invalid_body');
  if(path==='/v1/challenge') {
    const id=uuid(b.uuid);
    if(!allowed(env,id))throw new Failure(403,'tester_not_allowed');
    if(typeof b.username!=='string' || !/^[A-Za-z0-9_]{1,16}$/.test(b.username))throw new Failure(400,'invalid_username');
    const challenge=random(), hash=random().slice(0,40);
    await env.DB.prepare('INSERT INTO challenges(id,uuid,username,server_hash,expires) VALUES(?,?,?,?,?)').bind(challenge,id,b.username,hash,now+90).run();
    return reply({challenge,serverId:hash,expiresIn:90});
  }
  if(path==='/v1/verify') {
    if(typeof b.challenge!=='string'||!/^[a-f0-9]{64}$/.test(b.challenge))throw new Failure(400,'invalid_challenge');
    const c=await env.DB.prepare('SELECT * FROM challenges WHERE id=? AND expires>?').bind(b.challenge,now).first();
    if(!c || !allowed(env,c.uuid))throw new Failure(401,'invalid_challenge');
    const response=await sessionResponse(c,env,upstream);
    if(response.status!==200){
      // Status only: never log challenge, username, UUID, URL or credentials.
      console.warn('Nivo Minecraft verification upstream status',response.status);
      throw new Failure(401,'minecraft_verification_failed',response.status);
    }
    let identity;
    try { identity=await response.json(); }
    catch { throw new Failure(502,'minecraft_invalid_response'); }
    if(!identity || typeof identity!=='object' || typeof identity.id!=='string')throw new Failure(401,'minecraft_verification_failed');
    // Current Authlib's HasJoinedMinecraftServerResponse does not require a name.
    // The exact authenticated UUID is authoritative; never infer identity from a name.
    if(uuid(identity.id)!==c.uuid || (identity.name!==undefined && (typeof identity.name!=='string'||identity.name.toLowerCase()!==c.username.toLowerCase())))throw new Failure(401,'identity_mismatch');
    const consumed=await env.DB.prepare('DELETE FROM challenges WHERE id=? AND expires>? RETURNING id').bind(b.challenge,Math.floor(Date.now()/1000)).first();
    if(!consumed)throw new Failure(401,'challenge_used');
    const token=random();
    await env.DB.prepare('INSERT INTO sessions(token_hash,uuid,expires) VALUES(?,?,?)').bind(await digest(token),c.uuid,now+86400).run();
    if(typeof env.USAGE_SECRET==='string'&&env.USAGE_SECRET.length>=32)await env.DB.prepare('INSERT OR IGNORE INTO registered_users(user_key,first_seen) VALUES(?,?)').bind(await usageKey(env,c.uuid),now).run();
    return reply({token,expiresIn:86400});
  }
  const id=await session(request,env,now);
  if(path==='/v1/stats')return reply(await statistics(env,id,now));
  if(path==='/v1/usage'){await recordUsage(env,id,b,now);return reply({ok:true});}
  if(path==='/v1/banner'){
    if(typeof b.pixels!=='string'||!/^[A-Za-z0-9+/]{655360}$/.test(b.pixels))throw new Failure(400,'invalid_banner_pixels');
    const raw=Uint8Array.from(atob(b.pixels),c=>c.charCodeAt(0));if(raw.length!==320*512*3)throw new Failure(400,'invalid_banner_pixels');
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',raw))].map(b=>b.toString(16).padStart(2,'0')).join('');
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS banner_assets (owner TEXT PRIMARY KEY, hash TEXT NOT NULL, data BLOB NOT NULL)').run();
    await env.DB.prepare('INSERT INTO banner_assets(owner,hash,data) VALUES(?,?,?) ON CONFLICT(owner) DO UPDATE SET hash=excluded.hash,data=excluded.data').bind(id,hash,raw.buffer).run();
    return reply({asset:hash,width:320,height:512});
  }
  if(path==='/v1/presence') {
    const p=sanitizeProfile(b.profile);
    if(p.backBanner==='custom'&&p.backBannerAsset){const row=await env.DB.prepare('SELECT hash FROM banner_assets WHERE owner=? AND hash=?').bind(id,p.backBannerAsset).first();if(!row)throw new Failure(400,'banner_not_owned');}
    await env.DB.prepare('INSERT INTO profiles(uuid,profile,seen) VALUES(?,?,?) ON CONFLICT(uuid) DO UPDATE SET profile=excluded.profile,seen=excluded.seen').bind(id,JSON.stringify(p),now).run();
    await env.DB.prepare('UPDATE statistics_peak SET peak=MAX(peak,(SELECT COUNT(*) FROM profiles WHERE seen>?)),sampled=? WHERE id=1 AND sampled<?').bind(now-120,now,now-60).run();
    return reply({ok:true,expiresIn:120});
  }
  if(path==='/v1/logout') {
    await env.DB.batch([env.DB.prepare('DELETE FROM profiles WHERE uuid=?').bind(id),env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(request.headers.get('authorization').slice(7)))]);
    return reply({ok:true});
  }
  if(!Array.isArray(b.uuids)||b.uuids.length>64)throw new Failure(400,'max_64_players');
  const ids=[...new Set(b.uuids.map(uuid))].filter(x=>allowed(env,x));
  if(!ids.length)return reply({profiles:[]});
  const rows=await env.DB.prepare(`SELECT uuid,profile,seen FROM profiles WHERE seen>? AND uuid IN (${ids.map(()=>'?').join(',')})`).bind(now-120,...ids).all();
  return reply({profiles:rows.results.map(r=>({uuid:r.uuid,profile:JSON.parse(r.profile),expiresIn:Math.max(0,r.seen+120-now)}))});
}
export default {
  async fetch(request,env) {
    try{return await handle(request,env);}
    catch(e){
      // Never expose SQL, request bodies, challenge values or credentials in error responses.
      const databaseError=!(e instanceof Failure) && /D1|SQLITE|no such table|no such column/i.test(String(e?.message));
      return reply({error:e instanceof Failure ? e.message : databaseError ? 'database_schema_error' : 'service_unavailable',...(e instanceof Failure&&e.upstreamStatus?{upstreamStatus:e.upstreamStatus}:{})},e instanceof Failure ? e.status : 503);
    }
  },
  async scheduled(event,env) {
    const now=Math.floor(Date.now()/1000);
    await env.DB.batch(['challenges','sessions','limits'].map(t=>env.DB.prepare(`DELETE FROM ${t} WHERE expires<?`).bind(now)).concat([env.DB.prepare('DELETE FROM profiles WHERE seen<?').bind(now-86400),env.DB.prepare('DELETE FROM usage_daily WHERE day<?').bind(new Date((now-35*86400)*1000).toISOString().slice(0,10)),env.DB.prepare('DELETE FROM usage_users WHERE last_seen<?').bind(now-365*86400)]));
  }
};
