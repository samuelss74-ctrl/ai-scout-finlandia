import { getSupabaseServerClient } from "../lib/supabase-server";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "Tid saknas";

  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  }).format(new Date(value));
}

function formToSwedish(value: string | null) {
  return (value ?? "")
    .split("-")
    .filter(Boolean)
    .map((result) =>
      result === "W" ? "V" : result === "D" ? "O" : "F",
    );
}

function resultClass(result: string) {
  if (result === "V") return "form win";
  if (result === "O") return "form draw";
  return "form loss";
}

function splitPlan(value: string | null) {
  if (!value) return [];

  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/^\d+[.)]\s*/, ""));
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function MetricBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: "blue" | "red";
}) {
  const width =
    max > 0
      ? Math.max(4, Math.min(100, (value / max) * 100))
      : 0;

  return (
    <div className="metricBar">
      <div className="metricBarHeader">
        <span>{label}</span>
        <strong>{value.toFixed(2)}</strong>
      </div>

      <div className="metricTrack">
        <div
          className={`metricFill ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default async function Home() {
  const supabase = getSupabaseServerClient();

  const { data: dashboard, error: dashboardError } =
    await supabase
      .from("ai_scout_dashboard")
      .select("*")
      .limit(1)
      .maybeSingle();

  if (dashboardError) {
    return (
      <main className="page">
        <div className="container">
          <h1>AI Scout</h1>

          <section className="card">
            <h2>Databasfel</h2>
            <p>{dashboardError.message}</p>
          </section>
        </div>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="page">
        <div className="container">
          <h1>AI Scout</h1>

          <section className="card">
            <h2>Ingen kommande match hittades</h2>
          </section>
        </div>
      </main>
    );
  }

  const [opponentResult, reportResult] = await Promise.all([
    supabase
      .from("ai_scout_opponent_analysis")
      .select("*")
      .eq(
        "opponent_team_id",
        dashboard.opponent_team_id,
      )
      .limit(1)
      .maybeSingle(),

    supabase
      .from("ai_scout_current_report")
      .select("*")
      .limit(1)
      .maybeSingle(),
  ]);

  const opponent = opponentResult.data;
  const opponentError = opponentResult.error;

  const aiReport = reportResult.data;
  const reportError = reportResult.error;

  const finlandiaForm = formToSwedish(
    dashboard.finlandia_form,
  );

  const opponentForm = formToSwedish(
    opponent?.form ?? null,
  );

  const matchPlan = splitPlan(
    aiReport?.match_plan ?? null,
  );

  const seasonScored = toNumber(
    opponent?.season_goals_scored_per_game,
  );

  const seasonConceded = toNumber(
    opponent?.season_goals_conceded_per_game,
  );

  const relevantScored = toNumber(
    opponent?.relevant_goals_scored_per_game,
  );

  const relevantConceded = toNumber(
    opponent?.relevant_goals_conceded_per_game,
  );

  const chartMax = Math.max(
    seasonScored,
    seasonConceded,
    relevantScored,
    relevantConceded,
    1,
  );

  const contextLabel =
    opponent?.opponent_match_context === "AWAY"
      ? "Bortaplan"
      : "Hemmaplan";

  return (
    <main className="page">
      <div className="container">
        <header className="hero">
          <p className="eyebrow">
            FINLANDIA PALLO AIF P2011
          </p>

          <h1>AI Scout</h1>

          <p className="muted">
            Matchbrief direkt från SvFF-data + AI-rapport
          </p>
        </header>

        <section className="card matchCard">
          <p className="label">Nästa match</p>

          <h2>{dashboard.opponent_name}</h2>

          <div className="matchMeta">
            <span>
              {formatDate(dashboard.match_time)}
            </span>

            <span>•</span>

            <span>
              {dashboard.finlandia_home_away === "HOME"
                ? "Hemma"
                : "Borta"}
            </span>
          </div>

          <p className="muted">
            {dashboard.venue_name ?? "Spelplats saknas"}

            {dashboard.venue_surface
              ? ` · ${dashboard.venue_surface}`
              : ""}
          </p>
        </section>

        <section className="gridTwo">
          <article className="card">
            <p className="label">Finlandia</p>

            <div className="bigStat">
              {dashboard.finlandia_position ?? "–"}
            </div>

            <p className="muted">tabellplats</p>

            <div className="statsRow">
              <div>
                <strong>
                  {dashboard.finlandia_points ?? "–"}
                </strong>
                <span>Poäng</span>
              </div>

              <div>
                <strong>
                  {dashboard.finlandia_wins ?? "–"}
                </strong>
                <span>Vinster</span>
              </div>

              <div>
                <strong>
                  {dashboard.finlandia_goal_difference ??
                    "–"}
                </strong>
                <span>Målskillnad</span>
              </div>
            </div>
          </article>

          <article className="card">
            <p className="label">Motståndare</p>

            <div className="bigStat">
              {dashboard.opponent_position ?? "–"}
            </div>

            <p className="muted">tabellplats</p>

            <div className="statsRow">
              <div>
                <strong>
                  {dashboard.opponent_points ?? "–"}
                </strong>
                <span>Poäng</span>
              </div>

              <div>
                <strong>
                  {dashboard.opponent_wins ?? "–"}
                </strong>
                <span>Vinster</span>
              </div>

              <div>
                <strong>
                  {dashboard.opponent_goal_difference ??
                    "–"}
                </strong>
                <span>Målskillnad</span>
              </div>
            </div>
          </article>
        </section>

        <section className="card">
          <p className="label">
            Finlandia – senaste 5
          </p>

          <div className="formRow">
            {finlandiaForm.map((result, index) => (
              <span
                className={resultClass(result)}
                key={`${result}-${index}`}
              >
                {result}
              </span>
            ))}
          </div>

          <div className="statsRow formStats">
            <div>
              <strong>
                {dashboard.form_wins ?? 0}
              </strong>
              <span>V</span>
            </div>

            <div>
              <strong>
                {dashboard.form_draws ?? 0}
              </strong>
              <span>O</span>
            </div>

            <div>
              <strong>
                {dashboard.form_losses ?? 0}
              </strong>
              <span>F</span>
            </div>

            <div>
              <strong>
                {dashboard.form_goals_scored ?? 0}–
                {dashboard.form_goals_conceded ?? 0}
              </strong>
              <span>Mål</span>
            </div>
          </div>
        </section>

        <section className="card">
          <p className="label">
            Motståndarprofil 2.0
          </p>

          <h2>{dashboard.opponent_name}</h2>

          {opponentError ? (
            <p>
              Kunde inte läsa motståndarprofilen:{" "}
              {opponentError.message}
            </p>
          ) : opponent ? (
            <>
              <div className="profileGrid">
                <div>
                  <span>Säsongsmatcher</span>
                  <strong>
                    {opponent.season_games ??
                      dashboard.opponent_games ??
                      "–"}
                  </strong>
                </div>

                <div>
                  <span>Poäng/match</span>
                  <strong>
                    {opponent.season_points_per_game ??
                      "–"}
                  </strong>
                </div>

                <div>
                  <span>Mål/match</span>
                  <strong>
                    {opponent
                      .season_goals_scored_per_game ??
                      "–"}
                  </strong>
                </div>

                <div>
                  <span>Insläppta/match</span>
                  <strong>
                    {opponent
                      .season_goals_conceded_per_game ??
                      "–"}
                  </strong>
                </div>

                <div>
                  <span>
                    {opponent.opponent_match_context ===
                    "AWAY"
                      ? "Bortapoäng/match"
                      : "Hemmapoäng/match"}
                  </span>

                  <strong>
                    {opponent.relevant_points_per_game ??
                      "–"}
                  </strong>
                </div>

                <div>
                  <span>Relevant mål/match</span>
                  <strong>
                    {opponent
                      .relevant_goals_scored_per_game ??
                      "–"}
                  </strong>
                </div>

                <div>
                  <span>
                    Relevant insläppta/match
                  </span>
                  <strong>
                    {opponent
                      .relevant_goals_conceded_per_game ??
                      "–"}
                  </strong>
                </div>

                <div>
                  <span>Tidigare möten</span>
                  <strong>
                    {opponent
                      .previous_meetings_finlandia ?? 0}
                  </strong>
                </div>
              </div>

              {opponentForm.length > 0 && (
                <div className="limitedForm">
                  <p className="muted">
                    Begränsad matchhistorik i databasen (
                    {opponent.form_matches ?? 0}{" "}
                    match/matcher):
                  </p>

                  <div className="formRow">
                    {opponentForm.map(
                      (result, index) => (
                        <span
                          className={resultClass(result)}
                          key={`${result}-${index}`}
                        >
                          {result}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p>Ingen motståndarprofil hittades.</p>
          )}
        </section>

        {opponent && (
          <section className="card chartCard">
            <div className="chartHeading">
              <div>
                <p className="label">
                  Anfall och försvar
                </p>

                <h2>{dashboard.opponent_name}</h2>
              </div>

              <div className="chartLegend">
                <span>
                  <i className="legendDot blueDot" />
                  Gjorda
                </span>

                <span>
                  <i className="legendDot redDot" />
                  Insläppta
                </span>
              </div>
            </div>

            <p className="muted">
              Genomsnittligt antal mål per match
            </p>

            <div className="chartGrid">
              <div className="chartGroup">
                <h3>Hela säsongen</h3>

                <MetricBar
                  label="Gjorda mål"
                  value={seasonScored}
                  max={chartMax}
                  color="blue"
                />

                <MetricBar
                  label="Insläppta mål"
                  value={seasonConceded}
                  max={chartMax}
                  color="red"
                />
              </div>

              <div className="chartGroup">
                <h3>{contextLabel}</h3>

                <MetricBar
                  label="Gjorda mål"
                  value={relevantScored}
                  max={chartMax}
                  color="blue"
                />

                <MetricBar
                  label="Insläppta mål"
                  value={relevantConceded}
                  max={chartMax}
                  color="red"
                />
              </div>
            </div>

            <p className="chartNote">
              Staplarna använder samma skala för att göra
              jämförelsen rättvis.
            </p>
          </section>
        )}

        <section className="card aiReportCard">
          <div className="reportHeader">
            <div>
              <p className="label">
                AI Scout – Rapport 2.0
              </p>

              <h2>{dashboard.opponent_name}</h2>
            </div>

            {aiReport && (
              <div className="modelBadge">
                {aiReport.model_name ?? "AI"} · prompt{" "}
                {aiReport.prompt_version ?? "–"}
              </div>
            )}
          </div>

          {reportError ? (
            <p>
              Kunde inte läsa AI-rapporten:{" "}
              {reportError.message}
            </p>
          ) : !aiReport ? (
            <div className="emptyReport">
              <p>
                Ingen AI-rapport är genererad för den här
                matchen ännu.
              </p>

              <p className="muted">
                Kör Edge Function{" "}
                <code>generate-scout-report</code> i
                Supabase.
              </p>
            </div>
          ) : (
            <div className="reportSections">
              <section>
                <h3>Sammanfattning</h3>

                <p className="preWrap">
                  {aiReport.summary}
                </p>
              </section>

              <section className="gridTwo">
                <div className="reportBox">
                  <h3>Styrkor</h3>

                  <p className="preWrap">
                    {aiReport.strengths}
                  </p>
                </div>

                <div className="reportBox">
                  <h3>Svagheter</h3>

                  <p className="preWrap">
                    {aiReport.weaknesses}
                  </p>
                </div>
              </section>

              <section>
                <h3>Matchplan</h3>

                {matchPlan.length > 0 ? (
                  <ol className="matchPlan">
                    {matchPlan.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="preWrap">
                    {aiReport.match_plan}
                  </p>
                )}
              </section>

              <section className="uncertaintyBox">
                <h3>Osäkerhet / begränsningar</h3>

                <p className="preWrap">
                  {aiReport.uncertainty}
                </p>
              </section>

              <p className="generatedAt">
                Genererad:{" "}
                {formatDate(aiReport.generated_at)}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
