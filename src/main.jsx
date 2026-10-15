import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase, isSupabaseConfigured } from "./supabase";
import { groups, demoMatches } from "./data";
import { Trophy, ShieldCheck, Clock3, Radio, ChevronRight, LockKeyhole, LogOut, Save, RefreshCw, CircleHelp, X, CheckCircle2 } from "lucide-react";
import "./styles.css";

const ADMIN_EMAIL = "ashleesoledispavilla@gmail.com";
const allTeams = Object.entries(groups).flatMap(([group, names]) => names.map(name => ({ name, group })));
const fmt = n => n == null ? "—" : n;
const points = t => t.wins * 3 + t.draws;
function buildStandings(matches, group) {
  const table = allTeams.filter(t => t.group === group).map(t => ({
    ...t, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, pts: 0
  }));
  const byName = Object.fromEntries(table.map(t => [t.name, t]));
  matches.filter(m => m.group === group && m.status === "finished" && m.home_score != null && m.away_score != null).forEach(m => {
    const h = byName[m.home_team], a = byName[m.away_team];
    if (!h || !a) return;
    h.played++; a.played++; h.gf += Number(m.home_score); h.ga += Number(m.away_score);
    a.gf += Number(m.away_score); a.ga += Number(m.home_score);
    if (m.home_score > m.away_score) { h.wins++; a.losses++; }
    else if (m.home_score < m.away_score) { a.wins++; h.losses++; }
    else { h.draws++; a.draws++; }
  });
  table.forEach(t => { t.gd = t.gf - t.ga; t.pts = points(t); });
  return table.sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf || a.ga-b.ga || a.name.localeCompare(b.name));
}
function rankCompare(a,b) { return b.pts-a.pts || b.gd-a.gd || b.gf-a.gf || a.ga-b.ga || a.name.localeCompare(b.name); }
function getQualified(matches) {
  const tables = ["A","B","C"].map(g => buildStandings(matches,g));
  const topSix = tables.flatMap(t => t.slice(0,2));
  const third = tables.map(t => t[2]).filter(Boolean).sort(rankCompare).slice(0,2).map(t => ({...t, isThird:true}));
  return [...topSix, ...third].sort(rankCompare).map((t,i)=>({...t, seed:i+1}));
}
function knockout(matches) {
  const qualified = getQualified(matches);
  const pairings = [[1,8],[2,7],[3,6],[4,5]];
  const byId = Object.fromEntries(matches.map(m=>[m.id,m]));
  const qfs = pairings.map(([a,b],i) => {
    const saved = byId[`QF-${i+1}`] || {};
    return {
      ...saved, id:`QF-${i+1}`, round:"quarterfinal", group:null, kickoff:null, end_time:null,
      home_team:qualified.find(t=>t.seed===a)?.name || `Clasificado ${a}`,
      away_team:qualified.find(t=>t.seed===b)?.name || `Clasificado ${b}`,
      home_score:saved.home_score ?? null, away_score:saved.away_score ?? null,
      status:saved.status || "scheduled", sort_order:i+1, label:`CUARTOS · ${a} vs ${b}`
    };
  });
  // Semifinal routing: winner QF1 vs winner QF4; winner QF2 vs winner QF3.
  const winner = m => m?.status==="finished" && m.home_score != null && m.away_score != null && m.home_score!==m.away_score ? (m.home_score>m.away_score?m.home_team:m.away_team) : null;
  const sfDefaults = [
    {id:"SF-1",home_team:winner(qfs[0])||"Ganador Cuartos 1",away_team:winner(qfs[3])||"Ganador Cuartos 4",sort_order:1,label:"SEMIFINAL 1"},
    {id:"SF-2",home_team:winner(qfs[1])||"Ganador Cuartos 2",away_team:winner(qfs[2])||"Ganador Cuartos 3",sort_order:2,label:"SEMIFINAL 2"}
  ];
  const sfs = sfDefaults.map(d=>({...byId[d.id],...d,round:"semifinal",status:byId[d.id]?.status||"scheduled",home_score:byId[d.id]?.home_score??null,away_score:byId[d.id]?.away_score??null}));
  const finalDefault = {id:"FINAL",round:"final",home_team:winner(sfs[0])||"Ganador Semifinal 1",away_team:winner(sfs[1])||"Ganador Semifinal 2",sort_order:1,label:"GRAN FINAL"};
  const final = {...byId.FINAL,...finalDefault,status:byId.FINAL?.status||"scheduled",home_score:byId.FINAL?.home_score??null,away_score:byId.FINAL?.away_score??null};
  return {qfs, sfs, final, qualified};
}
function Status({status}) {
  const label = status==="live"?"EN JUEGO":status==="finished"?"FINALIZADO":"PROGRAMADO";
  return <span className={`status ${status}`}><i/>{label}</span>;
}
function Table({rows, title, compact=false}) {
  return <section className="table-card">
    <div className="section-heading"><div><span className="eyebrow">{title}</span><h3>Tabla de posiciones</h3></div><span className="live-dot-label"><i/> EN VIVO</span></div>
    <div className="table-scroll"><table><thead><tr><th>#</th><th>Equipo</th><th> PJ </th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>PTS</th></tr></thead>
      <tbody>{rows.map((t,i)=><tr key={t.name} className={i<2?"qualified-row":i===2?"third-row":""}><td><span className={`rank ${i<2?"top":""}`}>{i+1}</span></td><td className="team-cell">{t.name}</td><td>{t.played}</td><td>{t.wins}</td><td>{t.draws}</td><td>{t.losses}</td><td>{t.gf}</td><td>{t.ga}</td><td className={t.gd>0?"positive":t.gd<0?"negative":""}>{t.gd>0?`+${t.gd}`:t.gd}</td><td className="points">{t.pts}</td></tr>)}</tbody>
    </table></div>
    <div className="table-legend"><span><b className="legend-green"/> Clasificación directa</span><span><b className="legend-orange"/> Tercer puesto</span></div>
  </section>;
}
function MatchCard({match, admin=false, onSave, busy=false}) {
  const [home,setHome] = useState(match.home_score ?? "");
  const [away,setAway] = useState(match.away_score ?? "");
  const [status,setStatus] = useState(match.status || "scheduled");
  useEffect(()=>{setHome(match.home_score ?? "");setAway(match.away_score ?? "");setStatus(match.status||"scheduled");},[match.home_score,match.away_score,match.status]);
  const isGroup = match.round==="group";
  const title = match.label || (isGroup ? `GRUPO ${match.group}` : match.round==="quarterfinal"?"CUARTOS DE FINAL":match.round==="semifinal"?"SEMIFINAL":"GRAN FINAL");
  return <article className={`match-card ${status==="live"?"match-live":""}`}>
    <div className="match-meta"><span>{title}</span>{isGroup && <span><Clock3 size={12}/> {match.kickoff || "Horario por definir"}{match.end_time?` – ${match.end_time}`:""}</span>}<Status status={status}/></div>
    <div className="match-scoreline">
      <div className="match-team home"><span className="team-badge">{(match.home_team||"?").slice(0,2).toUpperCase()}</span><strong>{match.home_team}</strong></div>
      <div className="score-box"><b>{fmt(match.home_score)}</b><span>:</span><b>{fmt(match.away_score)}</b></div>
      <div className="match-team away"><strong>{match.away_team}</strong><span className="team-badge">{(match.away_team||"?").slice(0,2).toUpperCase()}</span></div>
    </div>
    {admin && <div className="score-editor">
      <label>Goles local<input type="number" min="0" max="99" value={home} onChange={e=>setHome(e.target.value)} placeholder="0"/></label>
      <label>Goles visitante<input type="number" min="0" max="99" value={away} onChange={e=>setAway(e.target.value)} placeholder="0"/></label>
      <label>Estado<select value={status} onChange={e=>setStatus(e.target.value)}><option value="scheduled">Programado</option><option value="live">En juego</option><option value="finished">Finalizado</option></select></label>
      <button className="save-btn" disabled={busy} onClick={()=>onSave(match,{home_score:home===""?null:Number(home),away_score:away===""?null:Number(away),status})}><Save size={15}/>{busy?"Guardando…":"Guardar marcador"}</button>
    </div>}
  </article>;
}
function App() {
  const [matches,setMatches] = useState(demoMatches());
  const [connected,setConnected] = useState(false);
  const [session,setSession] = useState(null);
  const [isAdmin,setIsAdmin] = useState(false);
  const [adminMode,setAdminMode] = useState(false);
  const [email,setEmail] = useState(ADMIN_EMAIL);
  const [password,setPassword] = useState("");
  const [loginError,setLoginError] = useState("");
  const [busyId,setBusyId] = useState("");
  const [toast,setToast] = useState("");
  const [tab,setTab] = useState("A");
  const [filter,setFilter] = useState("all");

  const loadMatches = useCallback(async () => {
    if (!supabase) return;
    const {data,error} = await supabase.from("matches").select("*").order("sort_order");
    if (!error && data?.length) { setMatches(data); setConnected(true); }
    else if (error) console.error("No se pudieron cargar partidos:",error.message);
  },[]);
  useEffect(()=>{
    if (!supabase) return;
    loadMatches();
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setIsAdmin(data.session?.user?.email?.toLowerCase()===ADMIN_EMAIL);});
    const {data:authSub}=supabase.auth.onAuthStateChange((_event,s)=>{setSession(s);setIsAdmin(s?.user?.email?.toLowerCase()===ADMIN_EMAIL);});
    const channel=supabase.channel("live-matches").on("postgres_changes",{event:"*",schema:"public",table:"matches"},()=>loadMatches()).subscribe();
    return ()=>{authSub.subscription.unsubscribe();supabase.removeChannel(channel);};
  },[loadMatches]);
  const standings = useMemo(()=>({A:buildStandings(matches,"A"),B:buildStandings(matches,"B"),C:buildStandings(matches,"C")}),[matches]);
  const bracket = useMemo(()=>knockout(matches),[matches]);
  const groupMatches = matches.filter(m=>m.round==="group" && m.group===tab).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const current = matches.filter(m=>m.status==="live");
  const next = matches.filter(m=>m.round==="group"&&m.status==="scheduled").sort((a,b)=>(a.kickoff||"").localeCompare(b.kickoff||""))[0];
  const updateMatch = async (match,patch) => {
    setBusyId(match.id);
    if (!supabase) {
      setMatches(prev=>prev.map(m=>m.id===match.id?{...m,...patch}:m));
      setToast("Marcador actualizado en modo demostración. Configura Supabase para publicarlo en vivo.");
      setBusyId(""); setTimeout(()=>setToast(""),4500); return;
    }
    const {error}=await supabase.from("matches").update({...patch,updated_at:new Date().toISOString()}).eq("id",match.id);
    if (error) setToast("No se pudo guardar. Verifica tu sesión de administrador y las políticas SQL.");
    else { setToast("Marcador actualizado."); await loadMatches(); }
    setBusyId(""); setTimeout(()=>setToast(""),4500);
  };
  const signIn = async e => {
    e.preventDefault(); setLoginError("");
    if (!supabase) {setLoginError("Primero configura las variables de Supabase en el archivo .env.");return;}
    const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
    if(error){setLoginError("No se pudo iniciar sesión. Revisa el correo y la contraseña.");return;}
    if(data.user?.email?.toLowerCase()!==ADMIN_EMAIL){await supabase.auth.signOut();setLoginError("Este usuario no está autorizado como administrador.");return;}
    setSession(data.session);setIsAdmin(true);setAdminMode(true);
  };
  const signOut = async()=>{if(supabase) await supabase.auth.signOut();setSession(null);setIsAdmin(false);setAdminMode(false);};
  const adminLogin = adminMode && !isAdmin;
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark"><Trophy size={21}/></span><span>UMIÑA <b>WORLD CUP</b><small>TORNEO BENÉFICO · ROTARACT UMIÑA</small></span></a><div className="top-actions"><span className={`connection ${connected?"online":""}`}><i/>{connected?"EN VIVO":"MARCADOR"}</span>{isAdmin?<button className="admin-pill" onClick={()=>setAdminMode(!adminMode)}><ShieldCheck size={15}/> Panel admin</button>:null}</div></header>
    {adminMode && <div className="admin-strip"><span><ShieldCheck size={16}/> MODO ADMINISTRADOR</span><span>{session?.user?.email || "Configuración pendiente"}</span>{isAdmin&&<button onClick={signOut}><LogOut size={14}/> Cerrar sesión</button>}</div>}
    {adminLogin && <div className="login-overlay"><form className="login-card" onSubmit={signIn}><button type="button" className="close-login" onClick={()=>setAdminMode(false)}><X size={18}/></button><span className="login-icon"><LockKeyhole size={24}/></span><span className="eyebrow">ACCESO RESTRINGIDO</span><h2>Panel del árbitro</h2><p>Inicia sesión con la cuenta autorizada para actualizar los marcadores del torneo.</p><label>Correo electrónico<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Contraseña<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{loginError&&<p className="error-text">{loginError}</p>}<button className="primary-btn" type="submit">Entrar al panel <ChevronRight size={16}/></button><small>Solo la cuenta autorizada puede editar los resultados.</small></form></div>}
    <main>
      <section className="hero"><div className="hero-image-overlay"/><div className="hero-content"><div className="hero-kicker"><span/> SÁBADO 17 OCT · 11 AM – 6 PM</div><h1>EL FÚTBOL<br/><em>UNE.</em> LA CAUSA<br/>NOS MUEVE.</h1><p>Doce equipos. Una sola gloria.<br/>Un torneo que transforma.</p><div className="hero-footer"><span><b>12</b> EQUIPOS</span><span><b>3</b> GRUPOS</span><span><b>1</b> CAMPEÓN</span></div></div><div className="hero-stamp"><Trophy size={23}/><span>UMIÑA<br/><b>WORLD CUP</b></span></div></section>
      <section className="status-banner"><div className="broadcast-icon"><Radio size={20}/></div><div><b>{current.length?`${current.length} PARTIDO${current.length>1?"S":""} EN JUEGO`:"SEGUIMIENTO EN TIEMPO REAL"}</b><span>{current.length?current.map(m=>`${m.home_team} ${fmt(m.home_score)} – ${fmt(m.away_score)} ${m.away_team}`).join(" · "):"Los resultados y las tablas se actualizan al guardar cada marcador."}</span></div><span className="pulse">LIVE</span></section>
      <section className="section-block"><div className="section-heading main-heading"><div><span className="eyebrow">FASE DE GRUPOS</span><h2>La tabla <em>en vivo.</em></h2></div><p>Los 2 primeros de cada grupo clasifican directamente. Los 2 mejores terceros completan los ocho.</p></div>
        <div className="group-tabs">{["A","B","C"].map(g=><button key={g} className={tab===g?"active":""} onClick={()=>setTab(g)}>GRUPO {g}<small>{standings[g].filter(t=>t.played>0).length?`${standings[g].filter(t=>t.played>0).length} equipos con resultados`:"4 equipos"}</small></button>)}</div>
        <Table rows={standings[tab]} title={`GRUPO ${tab}`}/>
        <div className="legend-note"><CheckCircle2 size={16}/><span><b>Clasificación:</b> puntos → diferencia de goles → goles a favor → goles en contra. Los resultados empatados suman un punto por equipo.</span></div>
      </section>
      <section className="section-block schedule-section"><div className="section-heading main-heading"><div><span className="eyebrow">CALENDARIO OFICIAL</span><h2>Partidos <em>del día.</em></h2></div><div className="match-filters"><button className={filter==="all"?"selected":""} onClick={()=>setFilter("all")}>Todos</button><button className={filter==="live"?"selected":""} onClick={()=>setFilter("live")}>En juego</button><button className={filter==="finished"?"selected":""} onClick={()=>setFilter("finished")}>Finalizados</button></div></div>
        {next&&<div className="next-match"><div><span className="eyebrow">PRÓXIMO PARTIDO</span><strong>{next.home_team} <i>vs</i> {next.away_team}</strong></div><span><Clock3 size={15}/> {next.kickoff}</span></div>}
        <div className="match-list">{matches.filter(m=>m.round==="group"&&(filter==="all"||m.status===filter)).sort((a,b)=>(a.kickoff||"").localeCompare(b.kickoff||"")).map(m=><MatchCard key={m.id} match={m}/>)}
        {!matches.some(m=>m.round==="group"&&(filter==="all"||m.status===filter))&&<div className="empty-state">Todavía no hay partidos en esta categoría.</div>}</div>
      </section>
      <section className="section-block thirds-section"><div className="section-heading main-heading"><div><span className="eyebrow">ÚLTIMA OPORTUNIDAD</span><h2>La tabla de <em>terceros.</em></h2></div><p>Los dos mejores terceros por puntos y criterios de desempate avanzan a cuartos de final.</p></div><Table title="MEJORES TERCEROS" rows={["A","B","C"].map(g=>({...standings[g][2],group:g})).filter(Boolean).sort(rankCompare).map((t,i)=>({...t,name:`${t.name} · Grupo ${t.group}`}))}/></section>
      <section className="section-block bracket-section"><div className="section-heading main-heading"><div><span className="eyebrow">FASE ELIMINATORIA</span><h2>El camino <em>a la gloria.</em></h2></div><p>Los cruces se calculan automáticamente con la clasificación general de los ocho equipos.</p></div>
        <div className="bracket-grid"><div className="bracket-column"><h3>01 / CUARTOS DE FINAL</h3>{bracket.qfs.map((m,i)=><MatchCard key={m.id} match={{...m,label:`CUARTOS ${i+1}`}} admin={isAdmin} onSave={updateMatch} busy={busyId===m.id}/>)}</div><div className="bracket-column"><h3>02 / SEMIFINALES</h3>{bracket.sfs.map((m,i)=><MatchCard key={m.id} match={{...m,label:`SEMIFINAL ${i+1}`}} admin={isAdmin} onSave={updateMatch} busy={busyId===m.id}/>)}</div><div className="bracket-column final-column"><h3>03 / GRAN FINAL</h3><MatchCard match={{...bracket.final,label:"GRAN FINAL"}} admin={isAdmin} onSave={updateMatch} busy={busyId==="FINAL"}/><div className="champion-note"><Trophy size={23}/><b>EL PRÓXIMO CAMPEÓN<br/>SE ESCRIBE AQUÍ.</b></div></div></div>
      </section>
      {isAdmin && <section className="section-block admin-workspace"><div className="section-heading main-heading"><div><span className="eyebrow">GESTIÓN DEL TORNEO</span><h2>Control de <em>marcadores.</em></h2></div><span className="admin-ready"><ShieldCheck size={16}/> ADMIN ACTIVO</span></div><p className="admin-intro">Actualiza el estado y los goles de cada partido. Al guardar, la tabla se recalcula y los cambios se publican para todos los espectadores conectados.</p><div className="admin-match-grid">{matches.filter(m=>m.round==="group").sort((a,b)=>(a.kickoff||"").localeCompare(b.kickoff||"")).map(m=><MatchCard key={m.id} match={m} admin onSave={updateMatch} busy={busyId===m.id}/>)}</div></section>}
      <section className="rules-strip"><div><span className="eyebrow">REGLAS DE CLASIFICACIÓN</span><h2>Un torneo.<br/><em>Una causa.</em></h2></div><ol><li><b>01</b><span>Los 2 mejores de cada grupo clasifican directamente.</span></li><li><b>02</b><span>Los 2 mejores terceros completan los 8 clasificados.</span></li><li><b>03</b><span>Cuartos: 1.º vs 8.º, 2.º vs 7.º, 3.º vs 6.º y 4.º vs 5.º.</span></li><li><b>04</b><span>Semifinales cruzadas: ganador C1 vs ganador C4; ganador C2 vs ganador C3.</span></li></ol></section>
    </main>
    <footer><div className="footer-brand">UMIÑA <b>WORLD CUP</b></div><p>TORNEO BENÉFICO ORGANIZADO POR ROTARACT UMIÑA</p><div className="footer-bottom"><span>EL FÚTBOL NOS UNE.</span><span>© 2026 · TODOS LOS MARCADORES EN UN SOLO LUGAR</span></div><button className="admin-secret" onClick={()=>setAdminMode(true)} aria-label="Abrir administración">admin</button></footer>
    {toast&&<div className="toast"><CheckCircle2 size={17}/>{toast}<button onClick={()=>setToast("")}><X size={15}/></button></div>}
  </div>;
}
createRoot(document.getElementById("root")).render(<App/>);
