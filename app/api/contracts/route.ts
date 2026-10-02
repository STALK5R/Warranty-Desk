import {database,bucket,failure,sameOrigin} from '@/lib/db';
export async function GET(){try { const r=await database().prepare('SELECT id, customer, vin, data, created FROM contracts ORDER BY created DESC').all(); return Response.json({records:r.results.map((x:any)=>({...x,data:JSON.parse(x.data)}))},{headers:{'Cache-Control':'no-store'}}); }catch(e){return failure(e)}}
export async function POST(r:Request){
 if(!sameOrigin(r))return new Response('Forbidden',{status:403});
 const keys:string[]=[];
 try{
 const form=await r.formData(); const data=JSON.parse(String(form.get('data'))); const pages=JSON.parse(String(form.get('pages')));
 if(!data.customer?.trim() || !/^[A-HJ-NPR-Z0-9]{17}$/.test(data.vin || ''))return Response.json({error:'Enter a customer name and a valid 17-character VIN.'},{status:400});
 if(!Array.isArray(pages)||!pages.length||pages.length>100||JSON.stringify(pages).length>1500000||pages.some(p=>typeof p.text!=='string'||typeof p.page!=='number'||typeof p.file!=='string'))return Response.json({error:'The document text is missing or too large.'},{status:400});
 const files=form.getAll('files') as File[];
 if(files.length>20||files.some(f=>!(f instanceof File)||!['application/pdf','image/jpeg','image/png','image/webp'].includes(f.type))||files.reduce((n,f)=>n+f.size,0)>20*1024*1024)return Response.json({error:'Use PDF, JPG, PNG or WebP files, up to 20 MB total.'},{status:400});
 const id=crypto.randomUUID(), saved=[];
 for(let i=0;i<files.length;i++){const f=files[i],key=`contracts/${id}/${i}`;await bucket().put(key,await f.arrayBuffer(),{httpMetadata:{contentType:f.type}});keys.push(key);saved.push({key,name:f.name,type:f.type});}
 await database().prepare('INSERT INTO contracts (id,customer,vin,data,pages,files,created) VALUES (?,?,?,?,?,?,?)').bind(id,data.customer.trim(),data.vin,JSON.stringify(data),JSON.stringify(pages),JSON.stringify(saved),new Date().toISOString()).run();
 return Response.json({id},{status:201});
 }catch(e){for(const key of keys){try{await bucket().delete(key)}catch{}}return failure(e)}
}
