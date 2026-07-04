import { useState, useEffect } from "react";
import { Mail, Clock, Send, CheckCircle2, AlertCircle } from "lucide-react";
import {
  saveEmailSettings,
  getEmailSettings,
  getCronStatus,
  sendTestEmail,
  getProviderStats,
} from "../lib/api";
import { ErrorBanner, Button, Input, SectionHeader } from "../components/UI";
import { useToast } from "../context/ToastContext";
import { CronStatus, ProviderStat } from "../types";

// ── Timezone-proof Countdown Component ──────────────────────────────────────
function Countdown() {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();

      // 1. Get current time strictly in IST
      const istNowString = now.toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });
      const istNow = new Date(istNowString);

      // 2. Target 7:00 AM today in IST
      const targetIST = new Date(istNowString);
      targetIST.setHours(7, 0, 0, 0);

      // 3. If it's already past 7 AM, target 7 AM tomorrow
      if (istNow.getTime() >= targetIST.getTime()) {
        targetIST.setDate(targetIST.getDate() + 1);
      }

      // 4. Calculate exact difference
      const diff = targetIST.getTime() - istNow.getTime();

      if (diff <= 0) {
        setCountdown("Running now…");
        return;
      }

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(
        `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`,
      );
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      style={{
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "1.4rem",
        fontWeight: 700,
        color: "var(--ink)",
        letterSpacing: "0.02em",
      }}
    >
      {countdown}
    </span>
  );
}

const KNOWN_PROVIDERS = [
  { key: "gemini", label: "Gemini", envKey: "GEMINI_API_KEY" },
  { key: "groq", label: "Groq", envKey: "GROQ_API_KEY" },
  { key: "openai", label: "OpenAI", envKey: "OPENAI_API_KEY" },
  { key: "claude", label: "Claude", envKey: "ANTHROPIC_API_KEY" },
  { key: "mistral", label: "Mistral", envKey: "MISTRAL_API_KEY" },
  { key: "deepseek", label: "DeepSeek", envKey: "DEEPSEEK_API_KEY" },
  { key: "openrouter", label: "OpenRouter", envKey: "OPENROUTER_API_KEY" },
  { key: "fireworks", label: "Fireworks", envKey: "FIREWORKS_API_KEY" },
];

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [error, setError] = useState("");
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [providerStats, setProviderStats] = useState<ProviderStat[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    getEmailSettings().then((s) => {
      if (s) {
        setEmail(s.email);
        setEmailEnabled(s.enabled);
      }
    });
    getCronStatus().then((s) => {
      if (s) setCronStatus(s);
    });
    getProviderStats()
      .then(setProviderStats)
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Invalid email format");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveEmailSettings(email, emailEnabled);
      showToast("Settings saved", "success");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    try {
      const msg = await sendTestEmail();
      showToast(msg ?? "Test email sent", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setTestLoading(false);
    }
  };

  const usedProviders = new Set(providerStats.map((s) => s.provider));

  return (
    <div
      className="page-container fade-in"
      style={{ paddingTop: "40px", paddingBottom: "80px", maxWidth: "760px" }}
    >
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
          Account Settings
        </h1>
        <p style={{ fontSize: "13px", color: "var(--ink-3)" }}>
          Email delivery, schedule, and provider configuration
        </p>
      </div>

      {/* ── Email delivery ───────────────────────────── */}
      <section style={{ marginBottom: "40px" }}>
        <SectionHeader title="Email Delivery" />
        <div className="ed-card" style={{ padding: "28px 32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <Mail
              size={16}
              style={{
                color: "var(--accent)",
                marginTop: "2px",
                flexShrink: 0,
              }}
            />
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "14px",
                  color: "var(--ink)",
                  marginBottom: "4px",
                }}
              >
                Daily Briefing Email
              </div>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--ink-3)",
                  lineHeight: 1.6,
                }}
              >
                Receive each morning's digest in your inbox at 07:00 IST,
                immediately after generation.
              </p>
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: "20px" }}>
              <ErrorBanner message={error} />
            </div>
          )}

          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
              }}
            >
              <div
                onClick={() => setEmailEnabled((v) => !v)}
                style={{
                  width: "40px",
                  height: "22px",
                  borderRadius: "11px",
                  background: emailEnabled
                    ? "var(--ink)"
                    : "var(--rule-strong)",
                  position: "relative",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "3px",
                    left: emailEnabled ? "21px" : "3px",
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              </div>
              <span style={{ fontSize: "13px", color: "var(--ink-2)" }}>
                {emailEnabled
                  ? "Email delivery enabled"
                  : "Email delivery disabled"}
              </span>
            </label>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Button onClick={handleSave} loading={saving} variant="primary">
                Save Settings
              </Button>
              <Button
                onClick={handleTest}
                loading={testLoading}
                variant="secondary"
              >
                <Send size={12} /> Send Test Email
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Schedule ──────────────────────────────────── */}
      <section style={{ marginBottom: "40px" }}>
        <SectionHeader title="Auto-Generation Schedule" />
        <div className="ed-card" style={{ padding: "28px 32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <Clock
              size={16}
              style={{
                color: "var(--accent)",
                marginTop: "2px",
                flexShrink: 0,
              }}
            />
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "14px",
                  color: "var(--ink)",
                  marginBottom: "4px",
                }}
              >
                Daily at 07:00 IST
              </div>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--ink-3)",
                  lineHeight: 1.6,
                }}
              >
                The pipeline runs automatically every morning. No manual
                intervention required.
              </p>
            </div>
          </div>

          {cronStatus ? (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: cronStatus.enabled
                      ? "var(--positive)"
                      : "var(--negative)",
                    boxShadow: cronStatus.enabled
                      ? "0 0 6px var(--positive)"
                      : "none",
                  }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--ink-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {cronStatus.enabled
                    ? "Scheduler Active"
                    : "Scheduler Inactive"}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1px",
                  background: "var(--rule)",
                  border: "1px solid var(--rule)",
                }}
              >
                <div
                  style={{
                    padding: "16px 20px",
                    background: "var(--paper-alt)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--ink-4)",
                      marginBottom: "8px",
                    }}
                  >
                    Next Run In
                  </div>
                  {/* Removed nextRun prop to use our clean IST math */}
                  <Countdown />
                </div>
                <div
                  style={{
                    padding: "16px 20px",
                    background: "var(--paper-alt)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--ink-4)",
                      marginBottom: "8px",
                    }}
                  >
                    Last Run
                  </div>
                  <span
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--ink)",
                    }}
                  >
                    {cronStatus.lastRun
                      ? new Date(cronStatus.lastRun).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "short",
                        })
                      : "—  Not yet run"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--ink-4)",
                fontSize: "13px",
              }}
            >
              <AlertCircle size={14} /> Could not fetch cron status. Is the
              backend running?
            </div>
          )}
        </div>
      </section>

      {/* ── Provider status ───────────────────────────── */}
      <section>
        <SectionHeader title="Provider Configuration" />
        <div className="ed-card" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <p style={{ fontSize: "13px", color: "var(--ink-3)" }}>
              Providers that have been active in at least one generation
              attempt. Configure via{" "}
              <code
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "12px",
                  background: "var(--paper-alt)",
                  padding: "1px 5px",
                  borderRadius: "2px",
                }}
              >
                .env
              </code>{" "}
              in the backend folder.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "1px",
              background: "var(--rule)",
            }}
          >
            {KNOWN_PROVIDERS.map(({ key, label, envKey }) => {
              const used = providerStats.some((s) =>
                s.provider.startsWith(key),
              );
              const stat = providerStats.find((s) =>
                s.provider.startsWith(key),
              );
              return (
                <div
                  key={key}
                  style={{
                    padding: "14px 18px",
                    background: "var(--card)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: used
                          ? "var(--positive)"
                          : "var(--rule-strong)",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--ink)",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  {stat ? (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--ink-4)",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {stat.successes}/{stat.total}
                    </span>
                  ) : (
                    <span style={{ fontSize: "11px", color: "var(--ink-5)" }}>
                      {used ? "active" : "not set"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
