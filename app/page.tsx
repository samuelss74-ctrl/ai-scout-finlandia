import { getSupabaseServerClient } from "../lib/supabase-server";

export const dynamic = "force-dynamic";

const TEAM_ID = 307308;
const COMPETITION_ID = 133577;

type GameRow = {
  game_id: number;
  home_team_id: number;
  away_team_id: number;
  home_team_name: string;
  away_team_name: string;
  home_goals: number | null;
  away_goals: number | null;
  match_time: string;
  is_finished: boolean;
  is_canceled: boolean;
};

type SeasonPoint = {
  matchNumber: number;
  totalPoints: number;
  matchPoints: number;
  opponent: string;
  score: string;
  date: string;
};

function formatMatchDate(value: string | null) {
  if (!value) return "Datum saknas";

  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Stockholm",
  }).format(new Date(value));
}

function formatMatchTime(value: string | null) {
  if (!value) return "Tid saknas";

  return new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  }).format(new Date(value));
}

function formatGeneratedAt(value: string | null) {
  if (!value) return "Tid saknas";

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  }).format(new Date(value));
}

function formToSwedish(value: string | null) {
  const normalized = (value ?? "").trim().toUpperCase();
  if (!normalized) return [];

  const results = normalized.includes("-")
    ? normalized.split("-")
    : normalized.split("");

  return results
    .map((result) => result.trim())
    .filter(Boolean)
    .map((result) =>
      result === "W" || result === "V"
        ? "V"
        : result === "D" || result === "O"
          ? "O"
          : "F",
    );
}

function resultClass(result: string) {
  if (result === "V") return "formResult formWin";
  if (result === "O") return "formResult formDraw";
  return "formResult formLoss";
}

function splitPlan(value: string | null) {
  if (!value) return [];

  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/^[-•]\s*/, ""))
    .map((item) => item.replace(/^\d+[.)]\s*/, ""));
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

function formatMetric(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  }).format(value);
}

function phoneLink(value: string | null) {
  if (!value) return "";
  return `tel:${value.replace(/[^\d+]/g, "")}`;
}

function buildSeasonPoints(games: GameRow[], teamId: number) {
  let totalPoints = 0;

  return games
    .filter(
      (game) =>
        !game.is_canceled &&
        game.is_finished &&
        (game.home_team_id === teamId || game.away_team_id === teamId) &&
        game.home_goals !== null &&
        game.away_goals !== null,
    )
    .map((game, index) => {
      const isHome = game.home_team_id === teamId;
      const goalsFor = isHome ? game.home_goals! : game.away_goals!;
      const goalsAgainst = isHome ? game.away_goals! : game.home_goals!;
      const matchPoints =
        goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0;

      totalPoints += matchPoints;

      return {
        matchNumber: index + 1,
        totalPoints,
        matchPoints,
        opponent: isHome ? game.away_team_name : game.home_team_name,
        score: `${goalsFor}–${goalsAgainst}`,
        date: new Intl.DateTimeFormat("sv-SE", {
          day: "numeric",
          month: "short",
          timeZone: "Europe/Stockholm",
        }).format(new Date(game.match_time)),
      } satisfies SeasonPoint;
    });
}

function SeasonProgressChart({
  finlandia,
  opponent,
  opponentName,
  opponentExpectedGames,
  opponentPointsTotal,
}: {
  finlandia: SeasonPoint[];
  opponent: SeasonPoint[];
  opponentName: string;
  opponentExpectedGames: number;
  opponentPointsTotal: number;
}) {
  const width = 900;
  const height = 330;
  const padding = { top: 28, right: 24, bottom: 48, left: 54 };
  const hasCompleteOpponentSeries =
    opponentExpectedGames > 0 && opponent.length >= opponentExpectedGames;
  const visibleOpponent = hasCompleteOpponentSeries ? opponent : [];
  const maxMatches = Math.max(finlandia.length, visibleOpponent.length, 1);
  const highestPoints = Math.max(
    finlandia.at(-1)?.totalPoints ?? 0,
    visibleOpponent.at(-1)?.totalPoints ?? 0,
    3,
  );
  const axisMax = Math.max(3, Math.ceil(highestPoints / 3) * 3);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const x = (matchNumber: number) =>
    padding.left + (matchNumber / maxMatches) * plotWidth;
  const y = (points: number) =>
    padding.top + plotHeight - (points / axisMax) * plotHeight;

  const linePoints = (points: SeasonPoint[]) =>
    [
      `${x(0)},${y(0)}`,
      ...points.map(
        (point) => `${x(point.matchNumber)},${y(point.totalPoints)}`,
      ),
    ].join(" ");

  const yTicks = Array.from({ length: 5 }, (_, index) =>
    Math.round((axisMax / 4) * index),
  );
  const xTicks = Array.from({ length: maxMatches }, (_, index) => index + 1);

  return (
    <article className="seasonProgressCard">
      <div className="seasonChartHeader">
        <div>
          <span className="overline">Poängutveckling</span>
          <h3>Säsongens matcher</h3>
          <p>Sammanlagda poäng efter varje färdigspelad match.</p>
        </div>

        <div className="seasonLegend" aria-label="Grafens linjer">
          <span><i className="finlandiaLine" />Finlandia</span>
          {hasCompleteOpponentSeries ? (
            <span><i className="opponentLine" />{opponentName}</span>
          ) : (
            <span className="warningBadge">Motståndarkurva väntar på data</span>
          )}
        </div>
      </div>

      <div className="seasonChartScroll">
        <svg
          className="seasonChartSvg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Poängutveckling för Finlandia och ${opponentName}`}
        >
          <g className="chartGridLines">
            {yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y(tick)}
                  y2={y(tick)}
                />
                <text x={padding.left - 13} y={y(tick) + 4} textAnchor="end">
                  {tick}
                </text>
              </g>
            ))}
          </g>

          <g className="chartXAxis">
            {xTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={x(tick)}
                  x2={x(tick)}
                  y1={height - padding.bottom}
                  y2={height - padding.bottom + 5}
                />
                <text
                  x={x(tick)}
                  y={height - padding.bottom + 22}
                  textAnchor="middle"
                >
                  {tick}
                </text>
              </g>
            ))}
            <text
              className="axisLabel"
              x={padding.left + plotWidth / 2}
              y={height - 6}
              textAnchor="middle"
            >
              Matchnummer
            </text>
          </g>

          <text
            className="axisLabel"
            x={14}
            y={padding.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 14 ${padding.top + plotHeight / 2})`}
          >
            Poäng
          </text>

          <polyline
            className="seasonLine seasonLineFinlandia"
            points={linePoints(finlandia)}
            fill="none"
            stroke="#1769e0"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {hasCompleteOpponentSeries && (
            <polyline
              className="seasonLine seasonLineOpponent"
              points={linePoints(visibleOpponent)}
              fill="none"
              stroke="#ef8a29"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          <circle
            className="seasonStartPoint"
            cx={x(0)}
            cy={y(0)}
            r="4"
            fill="#94a3b8"
            stroke="#ffffff"
            strokeWidth="2"
          />

          {finlandia.map((point) => (
            <circle
              className="seasonPoint seasonPointFinlandia"
              cx={x(point.matchNumber)}
              cy={y(point.totalPoints)}
              r="5"
              fill="#1769e0"
              stroke="#ffffff"
              strokeWidth="3"
              key={`finlandia-${point.matchNumber}`}
            >
              <title>
                {`Finlandia – match ${point.matchNumber}: ${point.opponent}, ${point.score}, ${point.matchPoints} poäng (${point.date}). Totalt ${point.totalPoints}.`}
              </title>
            </circle>
          ))}

          {visibleOpponent.map((point) => (
            <circle
              className="seasonPoint seasonPointOpponent"
              cx={x(point.matchNumber)}
              cy={y(point.totalPoints)}
              r="5"
              fill="#ef8a29"
              stroke="#ffffff"
              strokeWidth="3"
              key={`opponent-${point.matchNumber}`}
            >
              <title>
                {`${opponentName} – match ${point.matchNumber}: ${point.opponent}, ${point.score}, ${point.matchPoints} poäng (${point.date}). Totalt ${point.totalPoints}.`}
              </title>
            </circle>
          ))}
        </svg>
      </div>

      <div className="seasonChartSummary">
        <div>
          <span className="summaryLine finlandiaLine" />
          <p>Finlandia</p>
          <strong>{finlandia.at(-1)?.totalPoints ?? 0} poäng</strong>
          <small>{finlandia.length} matcher</small>
        </div>
        <div>
          <span className="summaryLine opponentLine" />
          <p>{opponentName}</p>
          <strong>{opponentPointsTotal} poäng</strong>
          <small>
            {hasCompleteOpponentSeries
              ? `${opponentExpectedGames} matcher`
              : `Kurva saknas: ${opponent.length} av ${opponentExpectedGames} matchresultat tillgängliga`}
          </small>
        </div>
      </div>

      <p className="seasonChartCaption">
        Kurvan stiger med 3 poäng vid vinst, 1 vid oavgjort och står still
        vid förlust. Motståndarkurvan visas först när hela matchföljden finns,
        så att jämförelsen inte blir missvisande.
      </p>
    </article>
  );
}

function StatItem({
  value,
  label,
}: {
  value: unknown;
  label: string;
}) {
  return (
    <div className="statItem">
      <strong>{displayValue(value)}</strong>
      <span>{label}</span>
    </div>
  );
}

function MetricBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "attack" | "risk";
}) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div className="metricBar">
      <div className="metricBarHeader">
        <span>{label}</span>
        <strong>{formatMetric(value)}</strong>
      </div>

      <div
        className="metricTrack"
        role="progressbar"
        aria-label={`${label}: ${formatMetric(value)}`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div
          className={`metricFill ${tone}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default async function Home() {
  const supabase = getSupabaseServerClient();

  const { data: dashboard, error: dashboardError } = await supabase
    .from("ai_scout_dashboard")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (dashboardError) {
    return (
      <main className="page">
        <div className="container narrowContainer">
          <div className="brandLockup">
            <span className="brandMark">F</span>
            <span>AI Scout</span>
          </div>

          <section className="card stateCard">
            <span className="stateIcon">!</span>
            <h1>Databasen kunde inte läsas</h1>
            <p>{dashboardError.message}</p>
          </section>
        </div>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="page">
        <div className="container narrowContainer">
          <div className="brandLockup">
            <span className="brandMark">F</span>
            <span>AI Scout</span>
          </div>

          <section className="card stateCard">
            <span className="stateIcon">i</span>
            <h1>Ingen kommande match hittades</h1>
            <p>Ny match visas här när den finns i SvFF-datan.</p>
          </section>
        </div>
      </main>
    );
  }

  const [opponentResult, reportResult, contactResult, gamesResult] =
    await Promise.all([
    supabase
      .from("ai_scout_opponent_analysis")
      .select("*")
      .eq("opponent_team_id", dashboard.opponent_team_id)
      .limit(1)
      .maybeSingle(),

    supabase
      .from("ai_scout_current_report")
      .select("*")
      .limit(1)
      .maybeSingle(),

    supabase
      .from("opponent_contacts")
      .select("*")
      .eq("opponent_team_id", dashboard.opponent_team_id)
      .limit(1)
      .maybeSingle(),

    supabase
      .from("games")
      .select(
        "game_id, home_team_id, away_team_id, home_team_name, away_team_name, home_goals, away_goals, match_time, is_finished, is_canceled",
      )
      .eq("competition_id", dashboard.competition_id ?? COMPETITION_ID)
      .eq("is_finished", true)
      .order("match_time", { ascending: true }),
  ]);

  const opponent = opponentResult.data;
  const opponentError = opponentResult.error;
  const aiReport = reportResult.data;
  const reportError = reportResult.error;
  const opponentContact = contactResult.data;
  const contactError = contactResult.error;
  const gamesError = gamesResult.error;

  const seasonGames = (gamesResult.data ?? []) as GameRow[];
  const finlandiaSeasonPoints = buildSeasonPoints(seasonGames, TEAM_ID);
  const opponentSeasonPoints = buildSeasonPoints(
    seasonGames,
    Number(dashboard.opponent_team_id),
  );

  const finlandiaForm = formToSwedish(dashboard.finlandia_form);
  const opponentForm = formToSwedish(opponent?.form ?? null);
  const matchPlan = splitPlan(aiReport?.match_plan ?? null);

  const isFinlandiaHome = dashboard.finlandia_home_away === "HOME";
  const homeTeam = isFinlandiaHome
    ? "Finlandia Pallo AIF"
    : dashboard.opponent_name;
  const awayTeam = isFinlandiaHome
    ? dashboard.opponent_name
    : "Finlandia Pallo AIF";

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

  const opponentContext =
    opponent?.opponent_match_context === "AWAY"
      ? "Motståndaren på bortaplan"
      : "Motståndaren på hemmaplan";

  const formMatches = toNumber(opponent?.form_matches);
  const formIsLimited = formMatches > 0 && formMatches < 3;

  return (
    <main className="page">
      <div className="topGlow" aria-hidden="true" />

      <div className="container">
        <header className="siteHeader">
          <div className="brandLockup">
            <span className="brandMark">F</span>
            <div>
              <strong>AI Scout</strong>
              <span>Finlandia Pallo AIF P2011</span>
            </div>
          </div>

          <span className="sourceBadge">
            <i aria-hidden="true" />
            SvFF-data
          </span>
        </header>

        <nav className="sectionNav" aria-label="Sidans innehåll">
          <a href="#match">Match</a>
          <a href="#fakta">Fakta</a>
          <a href="#motstandare">Motståndare</a>
          <a href="#kontakt">Kontakt</a>
          <a href="#analys">AI-analys</a>
        </nav>

        <section className="matchHero" id="match">
          <div className="matchHeroTop">
            <span className="overline lightOverline">Nästa match</span>
            <span className="homeAwayBadge">
              {isFinlandiaHome ? "Finlandia hemma" : "Finlandia borta"}
            </span>
          </div>

          <div className="versusGrid">
            <div className="teamBlock homeTeam">
              <span className="teamRole">Hemma</span>
              <h1>{homeTeam}</h1>
            </div>

            <div className="versusMark" aria-label="mot">
              <span>VS</span>
            </div>

            <div className="teamBlock awayTeam">
              <span className="teamRole">Borta</span>
              <h1>{awayTeam}</h1>
            </div>
          </div>

          <div className="matchDetails">
            <div>
              <span>Datum</span>
              <strong className="capitalize">
                {formatMatchDate(dashboard.match_time)}
              </strong>
            </div>
            <div>
              <span>Avspark</span>
              <strong>{formatMatchTime(dashboard.match_time)}</strong>
            </div>
            <div>
              <span>Spelplats</span>
              <strong>{dashboard.venue_name ?? "Saknas"}</strong>
            </div>
            <div>
              <span>Underlag</span>
              <strong>{dashboard.venue_surface ?? "Saknas"}</strong>
            </div>
          </div>
        </section>

        {aiReport?.summary && (
          <section className="briefCard" aria-labelledby="brief-title">
            <div className="briefIcon" aria-hidden="true">
              AI
            </div>
            <div>
              <span className="overline">Scoutens huvudbild</span>
              <h2 id="brief-title">Det viktigaste inför matchen</h2>
              <p>{aiReport.summary}</p>

              {matchPlan[0] && (
                <div className="keyMessage">
                  <span>Första fokus</span>
                  <strong>{matchPlan[0]}</strong>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="sectionBlock" id="fakta">
          <div className="sectionHeading">
            <div>
              <span className="overline">Fakta</span>
              <h2>Tabelläget</h2>
            </div>
            <p>Aktuell seriestatistik inför nästa match.</p>
          </div>

          <div className="teamComparison">
            <article className="teamCard finlandiaCard">
              <div className="teamCardHeader">
                <div>
                  <span className="teamMiniLabel">Vårt lag</span>
                  <h3>Finlandia</h3>
                </div>
                <div className="positionBadge">
                  <strong>{displayValue(dashboard.finlandia_position)}</strong>
                  <span>plats</span>
                </div>
              </div>

              <div className="statGrid">
                <StatItem value={dashboard.finlandia_points} label="Poäng" />
                <StatItem value={dashboard.finlandia_wins} label="Vinster" />
                <StatItem
                  value={dashboard.finlandia_goal_difference}
                  label="Målskillnad"
                />
              </div>
            </article>

            <article className="teamCard opponentCard">
              <div className="teamCardHeader">
                <div>
                  <span className="teamMiniLabel">Motståndare</span>
                  <h3>{dashboard.opponent_name}</h3>
                </div>
                <div className="positionBadge neutralPosition">
                  <strong>{displayValue(dashboard.opponent_position)}</strong>
                  <span>plats</span>
                </div>
              </div>

              <div className="statGrid">
                <StatItem value={dashboard.opponent_points} label="Poäng" />
                <StatItem value={dashboard.opponent_wins} label="Vinster" />
                <StatItem
                  value={dashboard.opponent_goal_difference}
                  label="Målskillnad"
                />
              </div>
            </article>
          </div>

          <article className="formCard">
            <div className="formCardIntro">
              <span className="overline">Finlandias form</span>
              <h3>Senaste matcherna</h3>
              <div className="formLegend" aria-label="Förklaring">
                <span><i className="legendWin" />Vinst</span>
                <span><i className="legendDraw" />Oavgjord</span>
                <span><i className="legendLoss" />Förlust</span>
              </div>
            </div>

            <div className="formResults">
              {finlandiaForm.length > 0 ? (
                finlandiaForm.map((result, index) => (
                  <span
                    className={resultClass(result)}
                    key={`${result}-${index}`}
                    title={
                      result === "V"
                        ? "Vinst"
                        : result === "O"
                          ? "Oavgjord"
                          : "Förlust"
                    }
                  >
                    {result}
                  </span>
                ))
              ) : (
                <span className="muted">Ingen formdata</span>
              )}
            </div>

            <div className="formTotals">
              <StatItem value={dashboard.form_wins ?? 0} label="Vinster" />
              <StatItem value={dashboard.form_draws ?? 0} label="Oavgjorda" />
              <StatItem value={dashboard.form_losses ?? 0} label="Förluster" />
              <StatItem
                value={`${dashboard.form_goals_scored ?? 0}–${dashboard.form_goals_conceded ?? 0}`}
                label="Mål"
              />
            </div>
          </article>

          {gamesError ? (
            <div className="card inlineState seasonChartState">
              Kunde inte läsa matcherna till poänggrafen: {gamesError.message}
            </div>
          ) : finlandiaSeasonPoints.length > 0 ||
            opponentSeasonPoints.length > 0 ? (
            <SeasonProgressChart
              finlandia={finlandiaSeasonPoints}
              opponent={opponentSeasonPoints}
              opponentName={dashboard.opponent_name}
              opponentExpectedGames={toNumber(
                opponent?.season_games ?? dashboard.opponent_games,
              )}
              opponentPointsTotal={toNumber(dashboard.opponent_points)}
            />
          ) : (
            <div className="card inlineState seasonChartState">
              Det finns ännu inga färdigspelade matcher till poänggrafen.
            </div>
          )}
        </section>

        <section className="sectionBlock" id="motstandare">
          <div className="sectionHeading">
            <div>
              <span className="overline">Motståndarprofil</span>
              <h2>{dashboard.opponent_name}</h2>
            </div>
            {opponent && <span className="contextBadge">{opponentContext}</span>}
          </div>

          {opponentError ? (
            <div className="card inlineState">
              Kunde inte läsa motståndarprofilen: {opponentError.message}
            </div>
          ) : opponent ? (
            <>
              <div className="profileStats">
                <StatItem
                  value={opponent.season_games ?? dashboard.opponent_games}
                  label="Säsongsmatcher"
                />
                <StatItem
                  value={opponent.season_points_per_game}
                  label="Poäng/match"
                />
                <StatItem
                  value={opponent.relevant_points_per_game}
                  label={
                    opponent.opponent_match_context === "AWAY"
                      ? "Bortapoäng/match"
                      : "Hemmapoäng/match"
                  }
                />
                <StatItem
                  value={opponent.previous_meetings_finlandia ?? 0}
                  label="Tidigare möten"
                />
              </div>

              <article className="chartCard">
                <div className="chartHeader">
                  <div>
                    <span className="overline">Mål per match</span>
                    <h3>Anfall och försvar</h3>
                  </div>
                  <div className="chartLegend">
                    <span><i className="attackDot" />Gjorda mål</span>
                    <span><i className="riskDot" />Insläppta mål</span>
                  </div>
                </div>

                <div className="chartGrid">
                  <div className="chartGroup">
                    <div className="chartGroupHeader">
                      <strong>Hela säsongen</strong>
                      <span>{displayValue(opponent.season_games)} matcher</span>
                    </div>
                    <MetricBar
                      label="Gjorda"
                      value={seasonScored}
                      max={chartMax}
                      tone="attack"
                    />
                    <MetricBar
                      label="Insläppta"
                      value={seasonConceded}
                      max={chartMax}
                      tone="risk"
                    />
                  </div>

                  <div className="chartGroup highlightedChartGroup">
                    <div className="chartGroupHeader">
                      <strong>{opponentContext}</strong>
                      <span>Relevant för matchen</span>
                    </div>
                    <MetricBar
                      label="Gjorda"
                      value={relevantScored}
                      max={chartMax}
                      tone="attack"
                    />
                    <MetricBar
                      label="Insläppta"
                      value={relevantConceded}
                      max={chartMax}
                      tone="risk"
                    />
                  </div>
                </div>

                <p className="chartCaption">
                  Samma skala används i båda rutorna. Blått visar offensiv
                  produktion och orange visar insläppta mål.
                </p>
              </article>

              {opponentForm.length > 0 && (
                <article className="opponentFormCard">
                  <div>
                    <span className="overline">Senaste formdata</span>
                    <h3>{dashboard.opponent_name}</h3>
                    <p>
                      Underlaget omfattar {formMatches} match
                      {formMatches === 1 ? "" : "er"}.
                    </p>
                  </div>

                  <div className="formResults compactFormResults">
                    {opponentForm.map((result, index) => (
                      <span
                        className={resultClass(result)}
                        key={`${result}-${index}`}
                      >
                        {result}
                      </span>
                    ))}
                  </div>

                  {formIsLimited && (
                    <span className="warningBadge">Begränsat underlag</span>
                  )}
                </article>
              )}
            </>
          ) : (
            <div className="card inlineState">Ingen motståndarprofil hittades.</div>
          )}
        </section>

        <section className="sectionBlock" id="kontakt">
          <div className="sectionHeading">
            <div>
              <span className="overline">Matchadministration</span>
              <h2>Kontakt med motståndaren</h2>
            </div>
            <p>Offentliga kontaktuppgifter för praktiska matchfrågor.</p>
          </div>

          {contactError ? (
            <div className="card inlineState">
              Kunde inte läsa kontaktuppgifterna: {contactError.message}
            </div>
          ) : opponentContact ? (
            <article className="contactCard">
              <div className="contactIdentity">
                <div className="contactMonogram" aria-hidden="true">
                  {String(opponentContact.club_name ?? "M").charAt(0)}
                </div>

                <div>
                  <span className="teamMiniLabel">Officiell kontakt</span>
                  <h3>{opponentContact.contact_name}</h3>
                  <p>
                    {opponentContact.contact_role}
                    {opponentContact.club_name
                      ? ` · ${opponentContact.club_name}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="contactActions">
                {opponentContact.phone && (
                  <a
                    className="contactButton primaryContactButton"
                    href={phoneLink(opponentContact.phone)}
                  >
                    <span>Ring</span>
                    <strong>{opponentContact.phone}</strong>
                  </a>
                )}

                {opponentContact.email && (
                  <a
                    className="contactButton"
                    href={`mailto:${opponentContact.email}`}
                  >
                    <span>Mejla</span>
                    <strong>{opponentContact.email}</strong>
                  </a>
                )}

                {opponentContact.website && (
                  <a
                    className="contactButton"
                    href={opponentContact.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>Öppna</span>
                    <strong>Lagets webbplats ↗</strong>
                  </a>
                )}
              </div>

              {opponentContact.source_url && (
                <a
                  className="contactSource"
                  href={opponentContact.source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Källa: officiell kontaktsida ↗
                </a>
              )}
            </article>
          ) : (
            <div className="card inlineState">
              Ingen offentlig kontakt har lagts in för den här motståndaren ännu.
            </div>
          )}
        </section>

        <section className="analysisSection" id="analys">
          <div className="analysisHeader">
            <div>
              <span className="overline lightOverline">AI-analys</span>
              <h2>Tränarbrief</h2>
              <p>{dashboard.opponent_name}</p>
            </div>

            {aiReport && (
              <div className="reportMeta">
                <span>{aiReport.model_name ?? "AI"}</span>
                <span>Prompt {aiReport.prompt_version ?? "–"}</span>
              </div>
            )}
          </div>

          {reportError ? (
            <div className="analysisState">
              Kunde inte läsa AI-rapporten: {reportError.message}
            </div>
          ) : !aiReport ? (
            <div className="analysisState">
              <h3>Ingen AI-rapport ännu</h3>
              <p>Kör Edge Function <code>generate-scout-report</code> i Supabase.</p>
            </div>
          ) : (
            <div className="reportContent">
              <section className="summarySection">
                <span className="reportNumber">01</span>
                <div>
                  <h3>Sammanfattning</h3>
                  <p className="preWrap">{aiReport.summary}</p>
                </div>
              </section>

              <section className="strengthWeaknessGrid">
                <div className="reportPanel strengthPanel">
                  <span className="panelLabel">Styrkor</span>
                  <h3>Det vi behöver respektera</h3>
                  <p className="preWrap">{aiReport.strengths}</p>
                </div>

                <div className="reportPanel weaknessPanel">
                  <span className="panelLabel">Svagheter</span>
                  <h3>Det vi kan utnyttja</h3>
                  <p className="preWrap">{aiReport.weaknesses}</p>
                </div>
              </section>

              <section className="planSection">
                <div className="planHeading">
                  <span className="reportNumber">02</span>
                  <div>
                    <h3>Matchplan</h3>
                    <p>Konkreta fokus för tränarstaben.</p>
                  </div>
                </div>

                {matchPlan.length > 0 ? (
                  <ol className="matchPlan">
                    {matchPlan.map((item, index) => (
                      <li key={index}>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <p>{item}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="preWrap">{aiReport.match_plan}</p>
                )}
              </section>

              <aside className="uncertaintyBox">
                <div className="uncertaintyIcon" aria-hidden="true">!</div>
                <div>
                  <h3>Osäkerheter och begränsningar</h3>
                  <p className="preWrap">{aiReport.uncertainty}</p>
                </div>
              </aside>

              <div className="generatedRow">
                <span>Rapport genererad</span>
                <time dateTime={aiReport.generated_at ?? undefined}>
                  {formatGeneratedAt(aiReport.generated_at)}
                </time>
              </div>
            </div>
          )}
        </section>

        <footer className="siteFooter">
          <div className="brandLockup footerBrand">
            <span className="brandMark smallBrandMark">F</span>
            <div>
              <strong>AI Scout</strong>
              <span>Beslutsstöd för Finlandia Pallo AIF P2011</span>
            </div>
          </div>
          <p>Fakta från SvFF · Analys från strukturerad matchdata</p>
        </footer>
      </div>
    </main>
  );
}
