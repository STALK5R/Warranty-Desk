import { env } from 'cloudflare:workers';
export function database(){ if(!env.DB) throw new Error('Database unavailable'); return env.DB; }
export function bucket(){ if(!env.BUCKET) throw new Error('Document storage unavailable'); return env.BUCKET; }
export function failure(e: unknown){console.error(e); return Response.json({error:'Could not access saved contracts. Please try again. Your unsaved entries have been kept.'},{status:503});}
export function sameOrigin(r:Request){const origin=r.headers.get('origin');return !origin || origin===new URL(r.url).origin;}
