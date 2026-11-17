// Browser code. CLIENT_JS is injected into every HTML file served from the content origin;
// SHELL_JS runs on the app origin and is the only code that holds the session and CSRF token.

// Inside the sandboxed iframe (opaque origin): exposes window.artifact, talks to the parent shell via postMessage,
// and turns <video data-artifact-video="path"> into an HLS player for an uploaded video.
export const clientJs = (appOrigin: string) => `(()=>{"use strict";
const P=${JSON.stringify(appOrigin)},pend=new Map(),subs=new Set();let n=0;
addEventListener("message",e=>{if(e.source!==parent||e.origin!==P)return;const d=e.data;if(!d||d.__artifact!==1)return;
if(d.event==="session"){subs.forEach(f=>{try{f(d.info)}catch(x){console.error(x)}});return}
const p=pend.get(d.id);if(!p)return;pend.delete(d.id);
if(d.ok)p.res(d.result);else{const x=new Error(d.error&&d.error.message||"error");Object.assign(x,d.error);p.rej(x)}});
const call=(op,args)=>new Promise((res,rej)=>{if(parent===window){const x=new Error("Artifact is not inside its viewer");x.code="not_framed";return rej(x)}
const id=++n;pend.set(id,{res,rej});parent.postMessage({__artifact:1,id,op,args},P)});
const ready=call("info");ready.catch(()=>{});
let hls=null;const loadHls=()=>hls||(hls=new Promise((res,rej)=>{const s=document.createElement("script");s.src=new URL("/_/hls.js",location.href).href;s.onload=()=>res(window.Hls);s.onerror=rej;document.head.appendChild(s)}));
async function wire(v){if(v.__artifactVideo)return;v.__artifactVideo=1;const p=v.getAttribute("data-artifact-video"),base=new URL(p,location.href).href;
let st;try{st=await call("videoStatus",{path:p})}catch(x){st={status:"failed"}}
if(st.status!=="ready"){const m=document.createElement("p");m.className="artifact-video-note";m.setAttribute("role","status");
m.textContent=st.status==="pending"?"El video se está procesando. Volvé a cargar la página en unos minutos.":"El video no está disponible.";v.after(m);return}
if(!v.poster)v.poster=base+"/hls/poster.jpg";const src=base+"/hls/master.m3u8";
if(v.canPlayType("application/vnd.apple.mpegurl")){v.src=src;return}
try{const H=await loadHls();if(H&&H.isSupported()){const h=new H({enableWorker:false});h.loadSource(src);h.attachMedia(v);return}}catch(x){}
v.src=src}
const scan=()=>document.querySelectorAll("video[data-artifact-video]").forEach(wire);
if(document.readyState==="loading")addEventListener("DOMContentLoaded",scan);else scan();
new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
window.artifact=Object.freeze({ready,info:()=>call("info"),getState:(o)=>call("getState",o||{}),
saveState:(state,o)=>call("saveState",{state,baseRev:o&&o.baseRev}),history:()=>call("history"),
getResponse:()=>call("getResponse"),submitResponse:(answers,o)=>call("submitResponse",{answers,name:o&&o.name,email:o&&o.email}),
videoStatus:(path)=>call("videoStatus",{path}),
login:()=>call("login"),logout:()=>call("logout"),onSession:f=>{subs.add(f);return()=>subs.delete(f)}});})();`

// On the app origin, around the iframe. Reads its boot data from <script type="application/json" id="boot">.
export const SHELL_JS = `(()=>{"use strict";
let B=JSON.parse(document.getElementById("boot").textContent),waiting=null;
const $=id=>document.getElementById(id),f=$("f"),dlg=$("login"),form=$("lf"),err=$("err"),go=$("go"),pill=$("pill"),
udlg=$("unlock"),uform=$("uf"),uerr=$("uerr");
const fail=(code,message,extra)=>Object.assign(new Error(message),{code},extra||{});
const rank={viewer:1,responder:2,editor:3,owner:4},can=r=>!!B.role&&rank[B.role]>=rank[r];
async function api(method,p,body){const h={"X-Artifact-Shell":"1"};if(B.csrf)h["X-Artifact-CSRF"]=B.csrf;
if(body!==undefined)h["Content-Type"]="application/json";
const r=await fetch(p,{method,headers:h,credentials:"same-origin",body:body===undefined?undefined:JSON.stringify(body)});
const j=await r.json().catch(()=>({}));
if(!r.ok){const e=j.error||{};throw fail(e.code||"http_"+r.status,e.message||r.statusText,{status:r.status,currentRev:e.currentRev})}
return j}
const A=p=>"/api/a/"+B.id+p;
const info=()=>({id:B.id,slug:B.slug,title:B.title,version:B.version,role:B.role,user:B.user,owner:B.role==="owner",
canEdit:can("editor"),canRespond:can("responder"),access:B.access,responses:B.responses});
function sync(){if(pill){pill.textContent=B.user?B.user+" · Salir":"Ingresar";pill.hidden=false}
if(f&&f.contentWindow)f.contentWindow.postMessage({__artifact:1,event:"session",info:info()},"*")}
async function refresh(){const j=await api("GET",A("/info"));const had=!!B.role;B=Object.assign(B,j);if(!f||!had&&B.role)return location.reload();sync()}
function openLogin(){if(waiting)return waiting.p;let res,rej;const p=new Promise((a,b)=>{res=a;rej=b});waiting={p,res,rej};
err.textContent="";if(udlg&&udlg.open)udlg.close();dlg.showModal();return p}
function cancel(d){d.close();if(waiting){waiting.rej(fail("cancelled","Login cancelled"));waiting=null}}
form.addEventListener("submit",async e=>{e.preventDefault();go.disabled=true;err.textContent="";
try{const fd=new FormData(form);await api("POST","/api/session",{email:fd.get("email"),password:fd.get("password")});
form.reset();dlg.close();await refresh();if(waiting){waiting.res(info());waiting=null}}
catch(x){err.textContent=x.status===429?"Demasiados intentos. Probá de nuevo en unos minutos.":"Email o contraseña incorrectos."}
finally{go.disabled=false}});
$("cancel").addEventListener("click",()=>cancel(dlg));
dlg.addEventListener("cancel",e=>{e.preventDefault();if(f)cancel(dlg)});
if(uform){uform.addEventListener("submit",async e=>{e.preventDefault();uerr.textContent="";
try{await api("POST",A("/unlock"),{password:new FormData(uform).get("password")});location.reload()}
catch(x){uerr.textContent=x.status===429?"Demasiados intentos. Probá de nuevo en unos minutos.":"Contraseña incorrecta."}});
$("toLogin").addEventListener("click",()=>openLogin().catch(()=>{}));udlg.addEventListener("cancel",e=>e.preventDefault())}
async function logout(){await api("DELETE","/api/session").catch(()=>{});location.reload();return info()}
if(pill)pill.addEventListener("click",()=>B.user?logout():openLogin().catch(()=>{}));
const need=async r=>{if(can(r))return;if(!B.user&&B.role!=="owner")await openLogin();if(!can(r))throw fail("forbidden","Tu acceso no lo permite",{status:403})};
const ops={info:async()=>info(),
getState:a=>api("GET",A("/state"+(a&&a.rev?"?rev="+Number(a.rev):""))),
saveState:async a=>{await need("editor");return api("PUT",A("/state"),{state:a.state,baseRev:a.baseRev})},
history:()=>api("GET",A("/state/history")),
getResponse:()=>api("GET",A("/response")),
submitResponse:async a=>{if(B.responses.who==="account"&&!B.user&&B.role!=="owner")await openLogin();await need("responder");
return api("PUT",A("/response"),{answers:a.answers,name:a.name,email:a.email})},
videoStatus:a=>api("GET",A("/video?path="+encodeURIComponent(String(a&&a.path||"")))),
login:()=>B.user?Promise.resolve(info()):openLogin(),logout};
addEventListener("message",async e=>{if(!f||e.source!==f.contentWindow||e.origin!=="null")return;const d=e.data;
if(!d||d.__artifact!==1||typeof d.op!=="string"||!Object.hasOwn(ops,d.op))return;let m;
try{m={__artifact:1,id:d.id,ok:true,result:await ops[d.op](d.args||{})}}
catch(x){m={__artifact:1,id:d.id,ok:false,error:{code:x.code||"error",message:String(x.message),status:x.status,currentRev:x.currentRev}}}
e.source.postMessage(m,"*")});
if(f)sync();else if(udlg)udlg.showModal();else dlg.showModal();})();`

export const SHELL_CSS = `*{box-sizing:border-box}html,body{margin:0;height:100%;background:#fff;font:15px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111}
#f{position:fixed;inset:0;width:100%;height:100%;border:0;display:block}
.bar{position:fixed;right:10px;bottom:10px;z-index:2;display:flex;gap:6px}
.bar a,.bar button{font:12px/1 system-ui,sans-serif;padding:7px 10px;border-radius:999px;border:1px solid #0002;background:#ffffffe6;color:#222;cursor:pointer;box-shadow:0 1px 4px #0002;text-decoration:none}
.bar a:hover,.bar button:hover{background:#fff}:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
dialog{border:0;border-radius:12px;padding:0;box-shadow:0 10px 40px #0004;width:min(92vw,360px)}dialog::backdrop{background:#0006}
form{display:grid;gap:12px;padding:22px}h1{font-size:17px;margin:0 0 4px}label{display:grid;gap:4px;font-size:13px;color:#444}
input{font:inherit;padding:9px 10px;border:1px solid #ccc;border-radius:8px}[role=alert]{min-height:1.2em;margin:0;color:#b91c1c;font-size:13px}
.row{display:flex;gap:8px;justify-content:flex-end;align-items:center}.row a,.link{margin-right:auto;font-size:13px;color:#2563eb;background:none;border:0;padding:0;cursor:pointer}
button{font:inherit;padding:8px 14px;border-radius:8px;border:1px solid #ccc;background:#fff;cursor:pointer}
.go{background:#111;color:#fff;border-color:#111}.go:disabled{opacity:.6}.locked #cancel{display:none}
main{max-width:380px;margin:12vh auto;padding:0 16px}main form{padding:0}`
