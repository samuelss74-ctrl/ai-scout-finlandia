import { getSupabaseServerClient } from "../lib/supabase-server";

export const dynamic = "force-dynamic";

type DashboardRow = {
  game_id: number | null;
  match_time: string | null;
  round_number: number | null;
  round_name: string | null;
  opponent_team_id: number | null;
  opponent_name: string | null;
  finlandia_home_away: string | null;
  venue_name: string | null;
  venue_surface: string | null;
  finlandia_position: number | null;
  finlandia_points: number | null;
  finlandia_games: number | null;
  finlandia_wins: number | null;
  finlandia_draws: number | null;
  finlandia_losses: number | null;
  finlandia_table_goals_scored: number | null;
  finlandia_table_goals_conceded: number | null;
  finlandia_goal_difference: number | null;
  form_matches: number | null;
  form_wins: number | null;
  form_draws: number | null;
  form_losses: number | null;
  form_goals_scored: number | null;
  form_goals_conceded: number | null;
  finlandia_form: string | null;
  opponent_position: number | null;
  opponent_points: number | null;
  opponent_games: number | null;
  opponent_wins: number | null;
  opponent_draws: number | null;
  opponent_losses: number | null;
  opponent_goals_scored: number | null;
  opponent_goals_conceded: number | null;
  opponent_goal_difference: number | null;
  opponent_games_home: number | null;
  opponent_games_away: number | null;
  opponent_points_home: number | null;
  opponent_points_away: number | null;
};

function formatMatchTime(value: string | null) {
  if (!value) return "Tid saknas";

  const date = new Date(value);

  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  }).format(date);
}

function resultClass(result: string) {
  if (result === "W") return "form formWin";
  if (result === "D") return "form formDraw";
  return "form formLoss";
}

export default async function Home() {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("ai_scout_dashboard")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    return (
      <main className="page">
        <div className="container">
          <p className="eyebrow">FINLANDIA PALLO AIF P2011</p>
          <h1>AI Scout</h1>

          <section className="card errorCard">
            <p className="label">Databasfel</p>
            <h2>Kunde inte läsa AI Scout-data</h2>
            <p>{error.message}</p>
          </section>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="page">
        <div className="container">
          <p className="eyebrow">FINLANDIA PALLO AIF P2011</p>
          <h1>AI Scout</h1>

          <section className="card">
            <p className="label">Status</p>
            <h2>Ingen kommande match hittades</h2>
            <p>Kontrollera att sync-svff har körts och att dashboard-vyn innehåller en rad.</p>
          </section>
        </div>
      </main>
    );
  }

  const d = data as DashboardRow;
  const form = (d.finlandia_form ?? "").split("-").filter(Boolean);

  return (
    <main className="page">
      <div className="container">
        <header className="hero">
          <p className="eyebrow">FINLANDIA PALLO AIF P2011</p>
          <h1>AI Scout</h1>
          <p className="subtitle">Matchbrief direkt från SvFF-data</p>
        </header>

        <section className="card matchCard">
          <p className="label">Nästa match</p>
          <h2>{d.opponent_name ?? "Motståndare saknas"}</h2>

          <div className="matchMeta">
            <span>{formatMatchTime(d.match_time)}</span>
            <span>•</span>
            <span>{d.finlandia_home_away === "HOME" ? "Hemma" : "Borta"}</span>
          </div>

          <p className="venue">
            {d.venue_name ?? "Spelplats saknas"}
            {d.venue_surface ? ` · ${d.venue_surface}` : ""}
          </p>
        </section>

        <section className="gridTwo">
          <article className="card">
            <p className="label">Finlandia</p>
            <div className="bigStat">{d.finlandia_position ?? "–"}</div>
            <p className="muted">tabellplats</p>

            <div className="statsRow">
              <div>
                <strong>{d.finlandia_points ?? "–"}</strong>
                <span>Poäng</span>
              </div>
              <div>
                <strong>{d.finlandia_wins ?? "–"}</strong>
                <span>Vinster</span>
              </div>
              <div>
                <strong>{d.finlandia_goal_difference ?? "–"}</strong>
                <span>Målskillnad</span>
              </div>
            </div>
          </article>

          <article className="card">
            <p className="label">Motståndare</p>
            <div className="bigStat">{d.opponent_position ?? "–"}</div>
            <p className="muted">tabellplats</p>

            <div className="statsRow">
              <div>
                <strong>{d.opponent_points ?? "–"}</strong>
                <span>Poäng</span>
              </div>
              <div>
                <strong>{d.opponent_wins ?? "–"}</strong>
                <span>Vinster</span>
              </div>
              <div>
                <strong>{d.opponent_goal_difference ?? "–"}</strong>
                <span>Målskillnad</span>
              </div>
            </div>
          </article>
        </section>

        <section className="card">
          <p className="label">Finlandia – senaste 5</p>

          <div className="formRow">
            {form.length > 0 ? (
              form.map((result, index) => (
                <span className={resultClass(result)} key={`${result}-${index}`}>
                  {result}
                </span>
              ))
            ) : (
              <span className="muted">Ingen formdata ännu</span>
            )}
          </div>

          <div className="statsRow formStats">
            <div>
              <strong>{d.form_wins ?? 0}</strong>
              <span>V</span>
            </div>
            <div>
              <strong>{d.form_draws ?? 0}</strong>
              <span>O</span>
            </div>
            <div>
              <strong>{d.form_losses ?? 0}</strong>
              <span>F</span>
            </div>
            <div>
              <strong>{d.form_goals_scored ?? 0}–{d.form_goals_conceded ?? 0}</strong>
              <span>Mål</span>
            </div>
          </div>
        </section>

        <section className="card">
          <p className="label">Motståndarprofil</p>

          <div className="profileGrid">
            <div>
              <span>Matcher</span>
              <strong>{d.opponent_games ?? "–"}</strong>
            </div>
            <div>
              <span>Gjorda mål</span>
              <strong>{d.opponent_goals_scored ?? "–"}</strong>
            </div>
            <div>
              <span>Insläppta mål</span>
              <strong>{d.opponent_goals_conceded ?? "–"}</strong>
            </div>
            <div>
              <span>Poäng hemma</span>
              <strong>{d.opponent_points_home ?? "–"}</strong>
            </div>
            <div>
              <span>Poäng borta</span>
              <strong>{d.opponent_points_away ?? "–"}</strong>
            </div>
          </div>
        </section>

        <section className="card aiCard">
          <p className="label">AI-analys</p>
          <h2>Nästa steg</h2>
          <p>
            Datagrunden är nu kopplad. I nästa version lägger vi till en
            automatiskt genererad motståndarrapport och konkreta punkter inför match.
          </p>
        </section>
      </div>
    </main>
  );
}
