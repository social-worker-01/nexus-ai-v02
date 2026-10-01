import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';

const app=express();
app.use(helmet({crossOriginResourcePolicy:false}));
app.use(cors({origin:process.env.FRONTEND_ORIGIN||true}));
app.use(express.json({limit:'1mb'}));
app.use(rateLimit({windowMs:60_000,max:40,standardHeaders:true,legacyHeaders:false}));

const openai=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;

function cleanPrompt(p){if(typeof p!=='string'||!p.trim())throw new Error('Prompt is required');return p.trim().slice(0,12000)}

async function gemini(prompt){
 const key=process.env.GEMINI_API_KEY;if(!key)throw new Error('Gemini is not configured');
 const model=process.env.GEMINI_MODEL||'gemini-2.5-flash';
 const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
 const j=await r.json();if(!r.ok)throw new Error(j?.error?.message||'Gemini request failed');
 return j.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||'';
}
async function openaiAsk(prompt){
 if(!openai)throw new Error('OpenAI is not configured');
 const r=await openai.responses.create({model:process.env.OPENAI_MODEL||'gpt-5',input:prompt});return r.output_text||'';
}
async function grok(prompt){
 const key=process.env.XAI_API_KEY;if(!key)throw new Error('xAI is not configured');
 const model=process.env.XAI_MODEL||'grok-4.1-fast';
 const r=await fetch('https://api.x.ai/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model,input:prompt})});
 const j=await r.json();if(!r.ok)throw new Error(j?.error?.message||'xAI request failed');
 return j.output_text||j.output?.map(x=>x.content?.map(y=>y.text||'').join('')).join('')||'';
}
app.get('/health',(req,res)=>res.json({ok:true,service:'nexus-ai-v2'}));
app.post('/api/ai',async(req,res)=>{try{const prompt=cleanPrompt(req.body.prompt),provider=req.body.provider;const text=provider==='gemini'?await gemini(prompt):provider==='openai'?await openaiAsk(prompt):provider==='grok'?await grok(prompt):(()=>{throw new Error('Unknown provider')})();res.json({provider,text})}catch(e){res.status(400).json({error:e.message})}});
const port=process.env.PORT||8787;app.listen(port,()=>console.log(`NEXUS backend listening on ${port}`));
