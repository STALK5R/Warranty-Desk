import * as records from '../app/api/contracts/route';
import * as record from '../app/api/contracts/[id]/route';
import * as files from '../app/api/contracts/[id]/file/route';
import * as analyze from '../app/api/analyze/route';
import * as coverage from '../app/api/coverage/route';
import * as config from '../app/api/config/route';
import {authorized,equal,session,login} from './auth';
import {sameOrigin} from '../lib/db';
export default {async fetch(r:Request,env:any):Promise<Response>{
 const url=new URL(r.url),path=url.pathname;let response:Response;
 if(!env.APP_PASSWORD||env.APP_PASSWORD.length<16)return new Response('Warranty Desk is locked. Configure an APP_PASSWORD secret of at least 16 characters in Cloudflare to open this workspace.',{status:503});
 if(['POST','PATCH','DELETE','PUT'].includes(r.method)&&!sameOrigin(r))return new Response('Forbidden',{status:403});
 if(Number(r.headers.get('content-length')||0)>28*1024*1024)return new Response('Upload too large',{status:413});
 const secure=url.protocol==='https:'?'; Secure':'';
 if(path==='/login'&&r.method==='POST'){if(env.LOGIN_LIMITER){const limit=await env.LOGIN_LIMITER.limit({key:r.headers.get('CF-Connecting-IP')||'unknown'});if(!limit.success)return new Response(login('Too many attempts. Try again in one minute.'),{status:429,headers:{'Content-Type':'text/html;charset=utf-8'}});}const f=await r.formData();if(await equal(String(f.get('password')||''),env.APP_PASSWORD)){return new Response(null,{status:303,headers:{Location:'/', 'Set-Cookie':`wd_session=${await session(env.APP_PASSWORD)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure}`}});}return new Response(login('Incorrect password. Please try again.'),{status:401,headers:{'Content-Type':'text/html;charset=utf-8'}});}
 if(path==='/logout')return new Response(null,{status:303,headers:{Location:'/', 'Set-Cookie':`wd_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`}});
 if(!await authorized(r,env.APP_PASSWORD))return path.startsWith('/api/')?Response.json({error:'Sign in required'},{status:401}):new Response(login(),{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}});
 try{
 if((path==='/api/analyze'||path==='/api/coverage')&&r.method==='POST'&&env.AI_LIMITER){const limit=await env.AI_LIMITER.limit({key:'workspace'});if(!limit.success)return Response.json({error:'Please wait a minute before another AI request.'},{status:429});}
 if(path==='/api/contracts'&&r.method==='GET')response=await records.GET();
 else if(path==='/api/contracts'&&r.method==='POST')response=await records.POST(r);
 else if(path==='/api/analyze'&&r.method==='POST')response=await analyze.POST(r);
 else if(path==='/api/coverage'&&r.method==='POST')response=await coverage.POST(r);
 else if(path==='/api/config'&&r.method==='GET')response=config.GET();
 else {const match=path.match(/^\/api\/contracts\/([a-zA-Z0-9-]+)(\/file)?$/);if(match){const params={params:Promise.resolve({id:match[1]})};if(match[2]&&r.method==='GET')response=await files.GET(r,params);else if(!match[2]&&r.method==='GET')response=await record.GET(r,params);else if(!match[2]&&r.method==='PATCH')response=await record.PATCH(r,params);else response=new Response('Method not allowed',{status:405});}else if(path.startsWith('/api/'))response=Response.json({error:'Not found'},{status:404});else response=await env.ASSETS.fetch(r);}
 const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','same-origin');headers.set('X-Frame-Options','DENY');if(path.startsWith('/api/'))headers.set('Cache-Control','no-store');return new Response(response.body,{status:response.status,headers});
 }catch(e){console.error(e);return Response.json({error:'The request failed. Please try again.'},{status:500})}
}};
