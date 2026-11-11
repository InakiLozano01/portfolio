// Browser code. CLIENT_JS is injected into every HTML file served from the content origin;
// SHELL_JS runs on the app origin and is the only code that holds the session/CSRF token.

// Inside the sandboxed iframe (opaque origin): exposes window.artifact, talks to the parent shell via postMessage.
export const clientJs = (appOrigin) => `(()=>{"use strict";
const P=${JSON.stringify(appOrigin)},pend=new Map(),subs=new Set();let n=0;
addEventListener("message",e=>{if(e.source!==parent||e.origin!==P)return;const d=e.data;if(!d||d.__artifact!==1)return;
if(d.event==="session"){subs.forEach(f=>{try{f(d.info)}catch(x){console.error(x)}});return}
const p=pend.get(d.id);if(!p)return;pend.delete(d.id);
if(d.ok)p.res(d.result);else{const x=new Error(d.error&&d.error.message||"error");Object.assign(x,d.error);p.rej(x)}});
const call=(op,args)=>new Promise((res,rej)=>{if(parent===window){const x=new Error("Artifact is not inside its viewer");x.code="not_framed";return rej(x)}
const id=++n;pend.set(id,{res,rej});parent.postMessage({__artifact:1,id,op,args},P)});
const ready=call("info");ready.catch(()=>{});
window.artifact=Object.freeze({ready,info:()=>call("info"),getState:(o)=>call("getState",o||{}),
saveState:(state,o)=>call("saveState",{state,baseRev:o&&o.baseRev}),history:()=>call("history"),
login:()=>call("login"),logout:()=>call("logout"),onSession:f=>{subs.add(f);return()=>subs.delete(f)}});})();`;

// On the app origin, around the iframe. Reads its boot data from <script type="application/json" id="boot">.
export const SHELL_JS = `(()=>{"use strict";
const B=JSON.parse(document.getElementById("boot").textContent);let S=B.session,waiting=null;
const $=id=>document.getElementById(id),f=$("f"),dlg=$("login"),form=$("lf"),err=$("err"),go=$("go"),pill=$("pill");
const fail=(code,message,extra)=>Object.assign(new Error(message),{code},extra||{});
async function api(method,p,body){const h={"X-Artifact-Shell":"1"};if(S)h["X-Artifact-CSRF"]=S.csrf;
if(body!==undefined)h["Content-Type"]="application/json";
const r=await fetch("/api/a/"+B.id+p,{method,headers:h,credentials:"same-origin",body:body===undefined?undefined:JSON.stringify(body)});
const j=await r.json().catch(()=>({}));
if(!r.ok){if(r.status===401&&S){S=null;sync()}const e=j.error||{};throw fail(e.code||"http_"+r.status,e.message||r.statusText,{status:r.status,currentRev:e.currentRev})}
return j}
const info=()=>({id:B.id,slug:B.slug,title:B.title,version:B.version,visibility:B.visibility,hasCredentials:B.hasCreds,user:S?S.user:null,canEdit:!!S});
function sync(){if(pill){pill.textContent=S?S.user+" · Salir":"Ingresar para editar";pill.hidden=false}
if(f&&f.contentWindow)f.contentWindow.postMessage({__artifact:1,event:"session",info:info()},"*")}
function openLogin(){if(!B.hasCreds)return Promise.reject(fail("no_credentials","This artifact has no editors"));
if(waiting)return waiting.p;let res,rej;const p=new Promise((a,b)=>{res=a;rej=b});waiting={p,res,rej};
err.textContent="";dlg.showModal();return p}
function cancel(){dlg.close();if(waiting){waiting.rej(fail("cancelled","Login cancelled"));waiting=null}}
form.addEventListener("submit",async e=>{e.preventDefault();go.disabled=true;err.textContent="";
try{const fd=new FormData(form);const j=await api("POST","/login",{username:fd.get("username"),password:fd.get("password")});
S={user:j.user,csrf:j.csrf};form.reset();dlg.close();if(!f)return location.reload();sync();if(waiting){waiting.res(info());waiting=null}}
catch(x){err.textContent=x.status===429?"Demasiados intentos. Probá de nuevo en unos minutos.":"Usuario o contraseña incorrectos."}
finally{go.disabled=false}});
$("cancel").addEventListener("click",cancel);
dlg.addEventListener("cancel",e=>{if(!f)e.preventDefault();else{e.preventDefault();cancel()}});
async function logout(){await api("POST","/logout").catch(()=>{});S=null;if(B.visibility==="private")location.reload();else sync();return info()}
if(pill)pill.addEventListener("click",()=>S?logout():openLogin().catch(()=>{}));
const ops={info:async()=>info(),
getState:a=>api("GET","/state"+(a&&a.rev?"?rev="+Number(a.rev):"")),
saveState:async a=>{if(!S)await openLogin();return api("PUT","/state",{state:a.state,baseRev:a.baseRev})},
history:()=>api("GET","/state/history"),login:()=>S?Promise.resolve(info()):openLogin(),logout};
addEventListener("message",async e=>{if(!f||e.source!==f.contentWindow||e.origin!=="null")return;const d=e.data;
if(!d||d.__artifact!==1||typeof d.op!=="string"||!Object.hasOwn(ops,d.op))return;let m;
try{m={__artifact:1,id:d.id,ok:true,result:await ops[d.op](d.args||{})}}
catch(x){m={__artifact:1,id:d.id,ok:false,error:{code:x.code||"error",message:String(x.message),status:x.status,currentRev:x.currentRev}}}
e.source.postMessage(m,"*")});
if(pill&&B.hasCreds)sync();if(!f)dlg.showModal();})();`;

export const SHELL_CSS = `*{box-sizing:border-box}html,body{margin:0;height:100%;background:#fff;font:15px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111}
#f{position:fixed;inset:0;width:100%;height:100%;border:0;display:block}
#pill{position:fixed;right:10px;bottom:10px;z-index:2;font:12px/1 system-ui,sans-serif;padding:7px 10px;border-radius:999px;border:1px solid #0002;background:#ffffffe6;color:#222;cursor:pointer;box-shadow:0 1px 4px #0002}
#pill:hover{background:#fff}#pill:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
dialog{border:0;border-radius:12px;padding:0;box-shadow:0 10px 40px #0004;width:min(92vw,360px)}dialog::backdrop{background:#0006}
form{display:grid;gap:12px;padding:22px}h1{font-size:17px;margin:0 0 4px}label{display:grid;gap:4px;font-size:13px;color:#444}
input{font:inherit;padding:9px 10px;border:1px solid #ccc;border-radius:8px}#err{min-height:1.2em;margin:0;color:#b91c1c;font-size:13px}
.row{display:flex;gap:8px;justify-content:flex-end}button{font:inherit;padding:8px 14px;border-radius:8px;border:1px solid #ccc;background:#fff;cursor:pointer}
#go{background:#111;color:#fff;border-color:#111}#go:disabled{opacity:.6}.priv #cancel{display:none}`;
