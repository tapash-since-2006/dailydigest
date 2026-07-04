import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowRight, Clock, Database, Zap, Mail } from "lucide-react";
import { listDigests, getDigest } from "../lib/api";
import { DigestSummary, DigestFull } from "../types";
import {
  Spinner,
  ProviderBadge,
  LevelBadge,
  ErrorBanner,
  SectionHeader,
} from "../components/UI";
import MarketTicker from "../components/MarketTicker";

function todayIST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function formatDateLong(dateStr: string) {
  try {
    return format(parseISO(dateStr), "EEEE, MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}
function formatDateShort(dateStr: string) {
  try {
    return format(parseISO(dateStr), "MMM d");
  } catch {
    return dateStr;
  }
}
function formatDayOfWeek(dateStr: string) {
  try {
    return format(parseISO(dateStr), "EEEE").toUpperCase();
  } catch {
    return "";
  }
}

export default function HomePage() {
  const [digests, setDigests] = useState<DigestSummary[]>([]);
  const [todayDigest, setTodayDigest] = useState<DigestFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const today = todayIST();

  useEffect(() => {
    Promise.all([listDigests(10), getDigest(today).catch(() => null)])
      .then(([list, td]) => {
        setDigests(list);
        setTodayDigest(td);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [today]);

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <Spinner size={24} />
      </div>
    );

  const recentDigests = digests.filter((d) => d.date !== today).slice(0, 6);

  return (
    <div className="fade-in">
      {/* Market ticker */}
      {todayDigest?.marketData &&
        Object.keys(todayDigest.marketData).length > 0 && (
          <MarketTicker marketData={todayDigest.marketData} />
        )}

      <div
        className="page-container"
        style={{ paddingTop: "32px", paddingBottom: "64px" }}
      >
        {error && (
          <div style={{ marginBottom: "24px" }}>
            <ErrorBanner message={error} />
          </div>
        )}

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "24px",
            marginBottom: "48px",
          }}
          className="hero-grid"
        >
          {/* Featured story */}
          <div>
            {todayDigest ? (
              <Link
                to={`/digest/${today}`}
                className="ed-card ed-card-featured ed-card-link"
                style={{
                  display: "block",
                  padding: "36px 40px",
                  textDecoration: "none",
                }}
              >
                <div style={{ marginBottom: "12px" }}>
                  <span className="category-label">Today's Edition</span>
                  <span
                    style={{ margin: "0 8px", color: "var(--rule-strong)" }}
                  >
                    ·
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--ink-4)",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {formatDateLong(today)}
                  </span>
                </div>

                <h1
                  style={{
                    fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
                    fontWeight: 800,
                    color: "var(--ink)",
                    lineHeight: 1.1,
                    marginBottom: "16px",
                  }}
                >
                  The Daily Digest
                  <br />
                  <span
                    style={{
                      color: "var(--ink-3)",
                      fontWeight: 400,
                      fontSize: "75%",
                    }}
                  >
                    Morning Briefing
                  </span>
                </h1>

                {todayDigest.summary && (
                  <blockquote
                    className="pull-quote"
                    style={{ marginBottom: "24px", fontSize: "1.05rem" }}
                  >
                    {todayDigest.summary}
                  </blockquote>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <ProviderBadge provider={todayDigest.providerUsed} />
                  <LevelBadge level={todayDigest.fallbackLevel} />
                  <span className="reading-time">
                    <Clock
                      size={11}
                      style={{
                        display: "inline",
                        marginRight: "4px",
                        verticalAlign: "middle",
                      }}
                    />
                    {todayDigest.readingTimeMinutes} min read
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--accent)",
                    }}
                  >
                    Read full edition <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ) : (
              <div
                className="ed-card ed-card-featured"
                style={{ padding: "48px 40px", textAlign: "center" }}
              >
                <h2
                  style={{
                    fontSize: "1.5rem",
                    marginBottom: "12px",
                    color: "var(--ink)",
                  }}
                >
                  No edition yet today
                </h2>
                <p
                  style={{
                    color: "var(--ink-3)",
                    marginBottom: "24px",
                    fontSize: "14px",
                  }}
                >
                  Sign in to generate today's morning briefing
                </p>
                <Link to="/login" className="btn-primary">
                  Sign in to generate
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar — recent editions */}
          <div>
            <SectionHeader title="Recent Editions" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              {digests.slice(0, 5).map((d, i) => (
                <Link
                  key={d.id}
                  to={`/digest/${d.date}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                    padding: "14px 0",
                    borderBottom: i < 4 ? "1px solid var(--rule)" : "none",
                    textDecoration: "none",
                    transition: "opacity 0.15s",
                  }}
                  className="archive-row"
                >
                  <div style={{ minWidth: "44px", textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        color: "var(--ink-4)",
                        textTransform: "uppercase",
                      }}
                    >
                      {formatDateShort(d.date).split(" ")[0]}
                    </div>
                    <div
                      style={{
                        fontFamily: "Playfair Display, serif",
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        color: "var(--ink)",
                        lineHeight: 1,
                      }}
                    >
                      {formatDateShort(d.date).split(" ")[1]}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        color: "var(--ink-4)",
                        textTransform: "uppercase",
                        marginBottom: "4px",
                      }}
                    >
                      {formatDayOfWeek(d.date)}
                    </div>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--ink-2)",
                        lineHeight: 1.5,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {d.summary || "Morning briefing"}
                    </p>
                    <span
                      className="reading-time"
                      style={{ marginTop: "4px", display: "block" }}
                    >
                      ~{d.readingTimeMinutes} min
                    </span>
                  </div>
                  <ArrowRight
                    size={13}
                    style={{
                      color: "var(--ink-5)",
                      flexShrink: 0,
                      marginTop: "4px",
                    }}
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Archive grid ──────────────────────────────────────── */}
        {recentDigests.length > 0 && (
          <section style={{ marginBottom: "64px" }}>
            <SectionHeader title="Archive" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1px",
                background: "var(--rule)",
                border: "1px solid var(--rule)",
              }}
            >
              {recentDigests.map((d) => (
                <Link
                  key={d.id}
                  to={`/digest/${d.date}`}
                  className="ed-card-link"
                  style={{
                    display: "block",
                    padding: "20px 24px",
                    background: "var(--card)",
                    textDecoration: "none",
                    transition: "background 0.15s",
                  }}
                >
                  <div className="archive-date" style={{ marginBottom: "6px" }}>
                    {formatDayOfWeek(d.date)} ·{" "}
                    {format(parseISO(d.date), "MMM d, yyyy")}
                  </div>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--ink-2)",
                      lineHeight: 1.5,
                      marginBottom: "10px",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {d.summary || "Morning briefing"}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span className="meta-badge">{d.provider_used}</span>
                    <span className="reading-time">
                      ~{d.readingTimeMinutes} min
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── How it works ──────────────────────────────────────── */}
        <section>
          <SectionHeader title="How It Works" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1px",
              background: "var(--rule)",
              border: "1px solid var(--rule)",
            }}
          >
            {[
              {
                n: "01",
                icon: <Database size={18} />,
                title: "Data Aggregation",
                desc: "40+ news sources, 30 RSS feeds, Hacker News, financial APIs — fetched concurrently in under 90 seconds every morning.",
              },
              {
                n: "02",
                icon: <Zap size={18} />,
                title: "6-Level AI Fallback",
                desc: "15 AI providers tried in order. Falls back to direct assembly from pre-fetched data if all providers fail — always delivers.",
              },
              {
                n: "03",
                icon: <Mail size={18} />,
                title: "Delivered at 7AM IST",
                desc: "Every digest saved to a searchable archive. Delivered to your inbox. Ratings and bookmarks tracked per edition.",
              },
            ].map(({ n, icon, title, desc }) => (
              <div
                key={n}
                style={{ padding: "28px 28px", background: "var(--card)" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: "10px",
                      color: "var(--ink-4)",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {n}
                  </span>
                  <div style={{ color: "var(--accent)" }}>{icon}</div>
                  <span
                    style={{
                      fontFamily: "Playfair Display, serif",
                      fontWeight: 700,
                      fontSize: "1rem",
                      color: "var(--ink)",
                    }}
                  >
                    {title}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--ink-3)",
                    lineHeight: 1.7,
                  }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer
          style={{
            marginTop: "64px",
            paddingTop: "24px",
            borderTop: "1px solid var(--rule)",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Playfair Display, serif",
                fontWeight: 700,
                fontSize: "1rem",
                color: "var(--ink)",
                marginBottom: "4px",
              }}
            >
              The Daily Digest
            </div>
            <div style={{ fontSize: "11px", color: "var(--ink-4)" }}>
              TypeScript · Node.js · Express · PostgreSQL · React
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            {[
              { path: "/dashboard", label: "Operations" },
              { path: "/search", label: "Archive" },
              { path: "/settings", label: "Settings" },
              { path: "/api/feed.rss", label: "RSS Feed", external: true },
            ].map(({ path, label, external }) =>
              external ? (
                <a
                  key={path}
                  href={path}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "11px",
                    color: "var(--ink-4)",
                    textDecoration: "underline dotted",
                  }}
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={path}
                  to={path}
                  style={{ fontSize: "11px", color: "var(--ink-4)" }}
                >
                  {label}
                </Link>
              ),
            )}
          </div>
        </footer>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .hero-grid { grid-template-columns: 3fr 2fr !important; }
          .md-date { display: block !important; }
        }
        .archive-row:hover { opacity: 0.75; }
      `}</style>
    </div>
  );
}
