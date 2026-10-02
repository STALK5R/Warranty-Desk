import {env} from 'cloudflare:workers';
export function GET(){return Response.json({ai:!!(env as any).OPENAI_API_KEY});}
