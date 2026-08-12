import { getSupabaseServerClient } from "../lib/supabase-server";

export const dynamic = "force-dynamic";

function formatMatchTime(value: string | null) {
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
    .map((r) => (r === "W" ? "V" : r === "D" ? "O" : "F"));
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
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.replace(/^\d+[.)]\s*/, ""));
}

export default async function Home() {
  const supabase = getSupabaseServerClient();

  // =========================================================
  // DASHBOARD
  // =========================================================

  const {
    data: dashboard,
    error: dashboardError,
  } = await supabase
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

  // =========================================================
  // MOTSTÅNDARANALYS + AI-RAPPORT
  // =========================================================

  const [
    {
      data: opponent,
      error: opponentError,
    },
    {
      data: aiReport,
      error: reportError,
    },
  ] = await Promise.all([
    supabase
      .from("ai_scout_opponent_analysis")
      .select("*")
      .eq(
        "opponent_team_id",
        dashboard.opponent_team_id
      )
      .limit(1)
      .maybeSingle(),

    supabase
      .from("ai_reports")
      .select("*")
      .eq(
        "game_id",
        dashboard.game_id
      )
      .eq(
        "report_type",
        "pre_match"
      )
      .order(
        "generated_at",
        { ascending: false }
      )
      .limit(1)
      .maybeSingle(),
  ]);

  const finlandiaForm =
    formToSwedish(
      dashboard.finlandia_form
    );

  const limitedOpponentForm =
    formToSwedish(
      opponent?.form ?? null
    );

  const matchPlan =
    splitPlan(
      aiReport?.match_plan ?? null
    );

  return (
    <main className="page">
      <div className="container">

        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="hero">
          <p className="eyebrow">
            FINLANDIA PALLO AIF P2011
          </p>

          <h1>AI Scout</h1>

          <p className="muted">
            Matchbrief direkt från SvFF-data + AI-rapport
          </p>
        </header>

        {/* ===================================================
            NÄSTA MATCH
        =================================================== */}

        <section className="card matchCard">
          <p className="label">
            Nästa match
          </p>

          <h2>
            {dashboard.opponent_name}
          </h2>

          <div className="matchMeta">
            <
