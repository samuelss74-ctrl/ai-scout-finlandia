import { getSupabaseServerClient } from "../lib/supabase-server";
export const dynamic="force-dynamic";
const fmt=(v:string|null)=>v?new Intl.DateTimeFormat("sv-SE",{weekday:"long",day:"numeric",month:"long",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Stockholm"}).format(new Date(v)):"Tid saknas";
const sv=(v:string|null)=>(v??"").split("-").filter(Boolean).map(x=>x==="W"?"V":x==="D"?"O":"F");
const cls=(x:string)=>x==="V"?"form win":x==="O"?"form draw":"form loss";
function insights(a:any){
 const r:string[]=[]; const gf=Number(a?.goals_scored_per_game??0),ga=Number(a?.goals_conceded_per_game??0);
 if(ga>=2.5) r.push("Motståndaren har släppt in minst 2,5 mål per match över de fem senaste. Det finns statistiskt stöd för ett offensivt matchfokus.");
 else if(ga<=1.5) r.push("Motståndaren har släppt in relativt få mål över de fem senaste. Målchanser kan behöva skapas med tålamod.");
 if(gf>=2.5) r.push("Motståndarens målproduktion är hög. Prioritera balans och kontroll när Finlandia tappar boll.");
 else if(gf<=1.5) r.push("Motståndaren har haft låg målproduktion under de fem senaste matcherna.");
 if(Number(a?.wins??0)>=3) r.push("Resultatformen är stark med minst tre segrar på fem matcher.");
 if(Number(a?.losses??0)>=3) r.push("Resultatformen är svag med minst tre förluster på fem matcher.");
 if(!r.length) r.push("Ingen tydlig statistisk extrem syns i femmatchersformen. Matchplanen bör inte byggas på formdata ensam.");
 return r.slice(0,3);
}
export default async function Home(){
 const s=getSupabaseServerClient();
 const [dr,ar]=await Promise.all([
  s.from("ai_scout_dashboard").select("*").limit(1).maybeSingle(),
  s.from("ai_scout_opponent_analysis").select("*").limit(1).maybeSingle()
 ]);
 if(dr.error||ar.error) return <main className="page"><div className="container"><h1>AI Scout</h1><section className="card"><h2>Databasfel</h2><p>{dr.error?.message??ar.error?.message}</p></section></div></main>;
 const d:any=dr.data,a:any=ar.data;
 if(!d) return <main className="page"><div className="container"><h1>AI Scout</h1><section className="card"><h2>Ingen kommande match</h2></section></div></main>;
 const ff=sv(d.finlandia_form),of=sv(a?.form);
 return <main className="page"><div className="container">
  <header><p className="eyebrow">FINLANDIA PALLO AIF P2011</p><h1>AI Scout</h1><p className="muted">Matchbrief direkt från SvFF-data</p></header>
  <section className="card"><p className="label">Nästa match</p><h2>{d.opponent_name}</h2><b>{fmt(d.match_time)} • {d.finlandia_home_away==="HOME"?"Hemma":"Borta"}</b><p className="muted">{d.venue_name}{d.venue_surface?` · ${d.venue_surface}`:""}</p></section>
  <div className="grid"><section className="card"><p className="label">Finlandia</p><div className="big">{d.finlandia_position}</div><p>tabellplats</p><div className="stats"><b>{d.finlandia_points} p</b><b>{d.finlandia_wins} vinster</b><b>{d.finlandia_goal_difference} målskillnad</b></div></section>
  <section className="card"><p className="label">Motståndare</p><div className="big">{d.opponent_position}</div><p>tabellplats</p><div className="stats"><b>{d.opponent_points} p</b><b>{d.opponent_wins} vinster</b><b>{d.opponent_goal_difference} målskillnad</b></div></section></div>
  <section className="card"><p className="label">Finlandia – senaste 5</p><div className="forms">{ff.map((x,i)=><span className={cls(x)} key={i}>{x}</span>)}</div></section>
  <section className="card"><p className="label">{a?.opponent_name??d.opponent_name} – senaste 5</p><div className="forms">{of.map((x,i)=><span className={cls(x)} key={i}>{x}</span>)}</div><div className="profile"><div><small>Vinster</small><b>{a?.wins??"–"}</b></div><div><small>Oavgjorda</small><b>{a?.draws??"–"}</b></div><div><small>Förluster</small><b>{a?.losses??"–"}</b></div><div><small>Mål/match</small><b>{a?.goals_scored_per_game??"–"}</b></div><div><small>Insläppta/match</small><b>{a?.goals_conceded_per_game??"–"}</b></div></div></section>
  <section className="card scout"><p className="label">Scout-rapport 1.0</p><h2>{a?.opponent_name??d.opponent_name}</h2><p className="muted">Statistiska slutsatser baserade på SvFF-data för de fem senaste seriematcherna.</p><ul>{insights(a).map((x,i)=><li key={i}>{x}</li>)}</ul><hr/><p>Tidigare seriemöten mot Finlandia i lagrad data: <b>{a?.previous_meetings_finlandia??0}</b></p></section>
 </div></main>
}