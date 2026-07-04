import { useState } from "react";
import { ArrowRight, Plus, Minus, RefreshCw, GitCompare } from "lucide-react";
import { format, parseISO } from "date-fns";
import { compareDigests } from "../lib/api";
import { CompareData } from "../types";
import { Spinner, ErrorBanner, SectionHeader } from "../components/UI";

function todayIST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}
function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default function ComparePage() {
  const [date1, setDate1] = useState(yesterday());
  const [date2, setDate2] = useState(todayIST());
  const [result, setResult] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCompare = async () => {
    if (date1 === date2) {
      setError("Please select two different dates");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await compareDigests(date1, date2));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      return format(parseISO(d), "MMMM d, yyyy");
    } catch {
      return d;
    }
  };

  return (
    <div
      className="page-container fade-in"
      style={{ paddingTop: "40px", paddingBottom: "80px" }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: "32px",
          borderBottom: "3px double var(--rule)",
          paddingBottom: "24px",
        }}
      >
        <h1
          style={{
            fontFamily: "Playfair Display, serif",
            fontWeight: 900,
            fontSize: "2rem",
            color: "var(--ink)",
            marginBottom: "4px",
          }}
        >
          Edition Comparison
        </h1>
        <p style={{ fontSize: "13px", color: "var(--ink-3)" }}>
          Analyse how news coverage evolved between two dates
        </p>
      </div>

      {/* Date selectors */}
      <div
        className="ed-card"
        style={{ padding: "28px 32px", marginBottom: "32px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink-4)",
              }}
            >
              Earlier Edition
            </label>
            <input
              type="date"
              value={date1}
              max={todayIST()}
              onChange={(e) => setDate1(e.target.value)}
              className="ed-input"
              style={{
                width: "auto",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "13px",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              paddingBottom: "10px",
              color: "var(--ink-4)",
            }}
          >
            <ArrowRight size={16} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink-4)",
              }}
            >
              Later Edition
            </label>
            <input
              type="date"
              value={date2}
              max={todayIST()}
              onChange={(e) => setDate2(e.target.value)}
              className="ed-input"
              style={{
                width: "auto",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "13px",
              }}
            />
          </div>

          <button
            onClick={handleCompare}
            disabled={loading}
            className="btn-primary"
            style={{ paddingBottom: "10px", alignSelf: "flex-end" }}
          >
            {loading ? <Spinner size={13} /> : <GitCompare size={14} />}
            {loading ? "Comparing…" : "Compare Editions"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: "24px" }}>
          <ErrorBanner message={error} />
        </div>
      )}
      {loading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "60px 0",
          }}
        >
          <Spinner size={22} />
        </div>
      )}

      {result && !loading && (
        <div className="fade-in">
          {/* Edition headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              gap: "0",
              marginBottom: "32px",
              border: "1px solid var(--rule)",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                background: "var(--card)",
                borderRight: "1px solid var(--rule)",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink-4)",
                  marginBottom: "4px",
                }}
              >
                Earlier
              </div>
              <div
                style={{
                  fontFamily: "Playfair Display, serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "var(--ink)",
                }}
              >
                {formatDate(result.date1)}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--ink-4)",
                  fontFamily: "JetBrains Mono, monospace",
                  marginTop: "4px",
                }}
              >
                {result.date1Provider}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "20px",
                background: "var(--paper-alt)",
              }}
            >
              <GitCompare size={18} style={{ color: "var(--ink-4)" }} />
            </div>
            <div
              style={{
                padding: "20px 24px",
                background: "var(--card)",
                borderLeft: "1px solid var(--rule)",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink-4)",
                  marginBottom: "4px",
                }}
              >
                Later
              </div>
              <div
                style={{
                  fontFamily: "Playfair Display, serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "var(--ink)",
                }}
              >
                {formatDate(result.date2)}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--ink-4)",
                  fontFamily: "JetBrains Mono, monospace",
                  marginTop: "4px",
                }}
              >
                {result.date2Provider}
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1px",
              background: "var(--rule)",
              border: "1px solid var(--rule)",
              marginBottom: "32px",
            }}
          >
            {[
              {
                label: "New Stories",
                value: result.onlyInDate2,
                icon: <Plus size={14} />,
                color: "var(--positive)",
                sub: `only in ${result.date2}`,
              },
              {
                label: "Continuing",
                value: result.inBoth,
                icon: <RefreshCw size={14} />,
                color: "var(--ink-3)",
                sub: "in both editions",
              },
              {
                label: "Dropped",
                value: result.onlyInDate1,
                icon: <Minus size={14} />,
                color: "var(--negative)",
                sub: `only in ${result.date1}`,
              },
            ].map(({ label, value, icon, color, sub }) => (
              <div
                key={label}
                style={{
                  padding: "20px 24px",
                  background: "var(--card)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    marginBottom: "8px",
                    color,
                  }}
                >
                  {icon}
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "Playfair Display, serif",
                    fontWeight: 700,
                    fontSize: "2.5rem",
                    color: "var(--ink)",
                    lineHeight: 1,
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--ink-4)",
                    marginTop: "6px",
                  }}
                >
                  {sub}
                </div>
              </div>
            ))}
          </div>

          {/* Story lists */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
            }}
          >
            {result.newStoriesInDate2.length > 0 && (
              <div>
                <SectionHeader
                  title={`New in ${result.date2} (${result.newStoriesInDate2.length})`}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1px",
                    background: "var(--rule)",
                    border: "1px solid var(--rule)",
                  }}
                >
                  {result.newStoriesInDate2.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        padding: "12px 16px",
                        background: "var(--card)",
                      }}
                    >
                      <Plus
                        size={11}
                        style={{
                          color: "var(--positive)",
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "13px",
                          color: "var(--ink-2)",
                          textTransform: "capitalize",
                          lineHeight: 1.5,
                        }}
                      >
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.continuingStories.length > 0 && (
              <div>
                <SectionHeader
                  title={`Continuing (${result.continuingStories.length})`}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1px",
                    background: "var(--rule)",
                    border: "1px solid var(--rule)",
                  }}
                >
                  {result.continuingStories.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        padding: "12px 16px",
                        background: "var(--card)",
                      }}
                    >
                      <RefreshCw
                        size={11}
                        style={{
                          color: "var(--ink-4)",
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "13px",
                          color: "var(--ink-3)",
                          textTransform: "capitalize",
                          lineHeight: 1.5,
                        }}
                      >
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.droppedFromDate1.length > 0 && (
              <div>
                <SectionHeader
                  title={`Dropped from ${result.date1} (${result.droppedFromDate1.length})`}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1px",
                    background: "var(--rule)",
                    border: "1px solid var(--rule)",
                  }}
                >
                  {result.droppedFromDate1.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        padding: "12px 16px",
                        background: "var(--card)",
                      }}
                    >
                      <Minus
                        size={11}
                        style={{
                          color: "var(--negative)",
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "13px",
                          color: "var(--ink-2)",
                          textTransform: "capitalize",
                          lineHeight: 1.5,
                        }}
                      >
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
