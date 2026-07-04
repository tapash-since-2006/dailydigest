import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO, addDays, subDays } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Zap,
  Share2,
  Clock,
  BookmarkPlus,
  BookmarkCheck,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import {
  getDigest,
  generateDigest,
  checkBookmark,
  addBookmark,
  removeBookmark,
  rateDigest,
  getDigestRating,
  getMyRating,
  logView,
} from "../lib/api";
import { DigestFull, GenerateResponse, RatingData } from "../types";
import {
  Spinner,
  ProviderBadge,
  LevelBadge,
  ErrorBanner,
  Button,
} from "../components/UI";
import MarketTicker from "../components/MarketTicker";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

// Safely generate today's date strictly in IST without manual timezone offset math
function todayIST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

const SECTION_MAP: Record<string, string> = {
  Markets: "Markets",
  "Global News": "World",
  India: "India",
  "AI & Tech": "Technology",
  "Investing & Predictions": "Investing",
  "Startups & Funding": "Startups",
  "Career & Opportunities": "Career",
  "Personal Finance": "Finance",
  "Further Reading": "Reading",
};

function extractSections(html: string): string[] {
  return Array.from(html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)).map((m) =>
    m[1].trim(),
  );
}
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
function injectIds(html: string): string {
  return html.replace(
    /<h2([^>]*)>([^<]+)<\/h2>/gi,
    (_, a, t) => `<h2${a} id="${slugify(t.trim())}">${t}</h2>`,
  );
}
function extractBody(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return m ? m[1] : html;
}

export default function DigestPage() {
  const { date: paramDate } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const date = paramDate ?? todayIST();

  const [digest, setDigest] = useState<DigestFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [genResult, setGenResult] = useState<GenerateResponse | null>(null);
  const [sections, setSections] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState("");
  const [bookmarked, setBookmarked] = useState(false);
  const [rating, setRating] = useState<RatingData | null>(null);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);

  // ── Apply digest data to state ───────────────────────────────────────
  const applyDigest = useCallback((data: DigestFull) => {
    setDigest(data);
    setError("");
    const found = extractSections(data.html);
    setSections(found);
    if (found.length > 0) setActiveSection(found[0]);
    getDigestRating(data.date)
      .then(setRating)
      .catch(() => {});
  }, []);

  // ── Fetch digest for a date ──────────────────────────────────────────
  const fetchDigest = useCallback(
    async (d: string) => {
      setLoading(true);
      setError("");
      setDigest(null);
      setSections([]);
      setGenResult(null);
      try {
        const data = await getDigest(d);
        applyDigest(data);
        if (isAuthenticated) logView(d);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setError(`No edition found for ${d}. Click Generate to create one.`);
        } else {
          setError(err.message ?? "Failed to fetch digest");
        }
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, applyDigest],
  );

  // ── Load on date change ──────────────────────────────────────────────
  useEffect(() => {
    fetchDigest(date);
  }, [date, fetchDigest]);

  // ── Load bookmark + rating state ─────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !date) return;
    checkBookmark(date)
      .then(setBookmarked)
      .catch(() => {});
    getMyRating(date)
      .then((r) => setMyRating(r?.rating ?? null))
      .catch(() => {});
  }, [date, isAuthenticated]);

  // ── Reading progress ─────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      setReadingProgress(total > 0 ? (doc.scrollTop / total) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // ── Advanced Auto-scroll and highlight for Search Deep Linking ───────
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && digest) {
      const params = new URLSearchParams(window.location.search);
      const highlightWord = params.get("hl");

      if (highlightWord) {
        setTimeout(() => {
          const contentDiv = document.querySelector(".prose"); // Target only the news content
          if (!contentDiv) return;

          const walker = document.createTreeWalker(
            contentDiv,
            NodeFilter.SHOW_TEXT,
          );
          let node;
          let firstMatch = null;

          // Walk through every single text node in the article
          while ((node = walker.nextNode())) {
            const text = node.nodeValue;
            if (
              text &&
              text.toLowerCase().includes(highlightWord.toLowerCase())
            ) {
              // We found a match! Save the first one we find so we can scroll to it later
              const parentEl = node.parentElement;
              if (parentEl && !firstMatch) {
                firstMatch = parentEl;
              }

              // Highlight the text (this wraps the specific word in a highlighted <span>)
              if (
                parentEl &&
                !parentEl.classList.contains("highlighted-search")
              ) {
                const regex = new RegExp(`(${highlightWord})`, "gi");
                parentEl.innerHTML = parentEl.innerHTML.replace(
                  regex,
                  '<span class="highlighted-search" style="background-color: var(--accent-light); color: var(--ink); border-radius: 2px; padding: 0 2px;">$1</span>',
                );
                parentEl.classList.add("highlighted-search"); // Mark it so we don't double-highlight
              }
            }
          }

          // Scroll smoothly to the very first match we found
          if (firstMatch) {
            (firstMatch as HTMLElement).scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        }, 150);
      }
    }
  }, [loading, digest]);

  // ── Generate ─────────────────────────────────────────────────────────
  const handleGenerate = async (force = false) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setGenerating(true);
    setError("");
    setGenResult(null);
    try {
      const result = await generateDigest(date, force);
      setGenResult(result);
      showToast(`Edition generated via ${result.providerUsed}`, "success");

      // Fetch the freshly generated digest and display it immediately
      const fresh = await getDigest(date);
      applyDigest(fresh);
      if (isAuthenticated) logView(date);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        // Already exists — just load it
        fetchDigest(date);
      } else {
        const msg =
          err?.response?.data?.error ?? err.message ?? "Generation failed";
        setError(msg);
        showToast(msg, "error");
      }
    } finally {
      setGenerating(false);
    }
  };

  // ── Bookmark ─────────────────────────────────────────────────────────
  const handleBookmark = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    try {
      if (bookmarked) {
        await removeBookmark(date);
        setBookmarked(false);
        showToast("Removed from reading list", "info");
      } else {
        await addBookmark(date);
        setBookmarked(true);
        showToast("Added to reading list", "success");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // ── Rate ─────────────────────────────────────────────────────────────
  const handleRate = async (r: 1 | -1) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    try {
      await rateDigest(date, r);
      setMyRating(r);
      showToast(
        r === 1 ? "Thanks for your feedback" : "Feedback recorded",
        "success",
      );
      getDigestRating(date)
        .then(setRating)
        .catch(() => {});
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const scrollToSection = (s: string) => {
    setActiveSection(s);
    document
      .getElementById(slugify(s))
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Link copied to clipboard", "success");
  };

  const prev = () =>
    navigate(`/digest/${format(subDays(parseISO(date), 1), "yyyy-MM-dd")}`);
  const next = () => {
    const n = format(addDays(parseISO(date), 1), "yyyy-MM-dd");
    if (n <= todayIST()) navigate(`/digest/${n}`);
  };

  return (
    <div>
      {/* Reading progress bar */}
      <div
        className="reading-progress-bar"
        style={{ width: `${readingProgress}%` }}
      />

      {/* Market ticker */}
      {digest?.marketData && Object.keys(digest.marketData).length > 0 && (
        <MarketTicker marketData={digest.marketData} />
      )}

      {/* Section nav */}
      {sections.length > 0 && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            background: "var(--paper)",
            borderBottom: "1px solid var(--rule)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <div className="page-container">
            <div className="section-nav">
              {sections.map((s) => (
                <button
                  key={s}
                  className={`section-tab ${activeSection === s ? "active" : ""}`}
                  onClick={() => scrollToSection(s)}
                >
                  {SECTION_MAP[s] ?? s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div
        className="page-container"
        style={{ paddingTop: "28px", paddingBottom: "64px" }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          {/* Date navigator */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={prev}
              className="btn-secondary"
              style={{ padding: "6px 10px" }}
            >
              <ChevronLeft size={14} />
            </button>
            <input
              type="date"
              value={date}
              max={todayIST()}
              onChange={(e) => navigate(`/digest/${e.target.value}`)}
              className="ed-input"
              style={{
                width: "auto",
                padding: "6px 10px",
                fontSize: "12px",
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
            <button
              onClick={next}
              disabled={date >= todayIST()}
              className="btn-secondary"
              style={{ padding: "6px 10px" }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {digest && (
              <>
                <button
                  onClick={handleBookmark}
                  className="btn-ghost"
                  style={{
                    color: bookmarked ? "var(--accent)" : "var(--ink-3)",
                  }}
                  title={bookmarked ? "Remove bookmark" : "Bookmark"}
                >
                  {bookmarked ? (
                    <BookmarkCheck size={15} />
                  ) : (
                    <BookmarkPlus size={15} />
                  )}
                  <span style={{ fontSize: "11px", marginLeft: "4px" }}>
                    {bookmarked ? "Saved" : "Save"}
                  </span>
                </button>
                <button onClick={handleShare} className="btn-ghost">
                  <Share2 size={14} />
                  <span style={{ fontSize: "11px", marginLeft: "4px" }}>
                    Share
                  </span>
                </button>
                <button
                  onClick={() => handleGenerate(true)}
                  disabled={generating}
                  className="btn-secondary"
                  style={{ fontSize: "11px" }}
                >
                  {generating ? <Spinner size={12} /> : <RefreshCw size={12} />}
                  {generating ? "Regenerating…" : "Regenerate"}
                </button>
              </>
            )}
            {!digest && !loading && (
              <button
                onClick={() => handleGenerate(false)}
                disabled={generating}
                className="btn-primary"
              >
                {generating ? <Spinner size={12} /> : <Zap size={13} />}
                {generating ? "Generating…" : "Generate Edition"}
              </button>
            )}
          </div>
        </div>

        {/* Error state */}
        {error && !loading && (
          <div style={{ marginBottom: "24px" }}>
            <ErrorBanner message={error} />
            {error.includes("No edition") && !generating && (
              <div style={{ marginTop: "12px" }}>
                <button
                  onClick={() => handleGenerate(false)}
                  disabled={generating}
                  className="btn-primary"
                >
                  {generating ? <Spinner size={12} /> : <Zap size={13} />}
                  {generating ? "Generating…" : "Generate this edition"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Generation in progress */}
        {generating && !genResult && (
          <div
            style={{
              padding: "20px 24px",
              background: "var(--card)",
              border: "1px solid var(--rule)",
              borderLeft: "4px solid var(--ink-3)",
              borderRadius: "2px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <Spinner size={16} />
            <div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--ink)",
                }}
              >
                Generating edition…
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--ink-4)",
                  marginTop: "2px",
                }}
              >
                Fetching news from 40+ sources, running AI fallback chain. This
                takes 10–30 seconds.
              </p>
            </div>
          </div>
        )}

        {/* Generation result banner */}
        {genResult && !generating && (
          <div
            style={{
              padding: "14px 16px",
              background: "var(--card)",
              border: "1px solid var(--rule)",
              borderLeft: "4px solid var(--positive)",
              borderRadius: "2px",
              marginBottom: "24px",
              fontSize: "13px",
              color: "var(--ink-2)",
            }}
          >
            Generated in {(genResult.generationDurationMs / 1000).toFixed(1)}s
            via <strong>{genResult.providerUsed}</strong>
            <span style={{ color: "var(--ink-4)", marginLeft: "8px" }}>
              ({genResult.attempts.filter((a) => a.success).length}/
              {genResult.attempts.length} providers tried)
            </span>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "80px 0",
            }}
          >
            <Spinner size={24} />
          </div>
        )}

        {/* Digest content */}
        {digest && !loading && (
          <div className="fade-in">
            {/* Editorial header */}
            <div
              style={{
                borderBottom: "3px double var(--rule)",
                paddingBottom: "24px",
                marginBottom: "32px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "10px",
                  flexWrap: "wrap",
                }}
              >
                <span className="category-label">Morning Edition</span>
                <span style={{ color: "var(--rule-strong)" }}>·</span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--ink-4)",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {format(
                    parseISO(`${digest.date}T00:00:00Z`),
                    "EEEE, MMMM d, yyyy",
                  )}
                </span>
                <span style={{ color: "var(--rule-strong)" }}>·</span>
                <span className="reading-time">
                  <Clock
                    size={10}
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginRight: "3px",
                    }}
                  />
                  {digest.readingTimeMinutes} min read
                </span>
              </div>

              <h1
                style={{
                  fontFamily: "Playfair Display, serif",
                  fontWeight: 900,
                  fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                  color: "var(--ink)",
                  lineHeight: 1.1,
                  marginBottom: "16px",
                }}
              >
                The Daily Digest
                <br />
                <em
                  style={{
                    fontWeight: 400,
                    fontSize: "65%",
                    color: "var(--ink-3)",
                  }}
                >
                  {digest.dateHuman}
                </em>
              </h1>

              {digest.summary && (
                <blockquote className="pull-quote">{digest.summary}</blockquote>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "16px",
                  flexWrap: "wrap",
                }}
              >
                <ProviderBadge provider={digest.providerUsed} />
                <LevelBadge level={digest.fallbackLevel} />
                <span style={{ fontSize: "11px", color: "var(--ink-4)" }}>
                  Published {format(parseISO(digest.createdAt), "HH:mm")} IST
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="content-width">
              <div
                className="prose"
                dangerouslySetInnerHTML={{
                  __html: injectIds(extractBody(digest.html)),
                }}
              />
            </div>

            {/* Rating footer */}
            <div
              className="content-width"
              style={{
                marginTop: "48px",
                paddingTop: "24px",
                borderTop: "1px solid var(--rule)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--ink-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "4px",
                    }}
                  >
                    Was this edition useful?
                  </p>
                  {rating && parseInt(rating.total) > 0 && (
                    <p style={{ fontSize: "12px", color: "var(--ink-4)" }}>
                      {rating.thumbs_up} found it useful · {rating.thumbs_down}{" "}
                      did not · {rating.total} total
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => handleRate(1)}
                    className="btn-secondary"
                    style={{
                      borderColor:
                        myRating === 1 ? "var(--positive)" : undefined,
                      color: myRating === 1 ? "var(--positive)" : undefined,
                      fontSize: "12px",
                    }}
                  >
                    <ThumbsUp size={13} /> Useful
                  </button>
                  <button
                    onClick={() => handleRate(-1)}
                    className="btn-secondary"
                    style={{
                      borderColor:
                        myRating === -1 ? "var(--negative)" : undefined,
                      color: myRating === -1 ? "var(--negative)" : undefined,
                      fontSize: "12px",
                    }}
                  >
                    <ThumbsDown size={13} /> Not useful
                  </button>
                </div>
              </div>
              <div
                style={{
                  marginTop: "16px",
                  fontSize: "11px",
                  color: "var(--ink-4)",
                }}
              >
                <a
                  href="/api/feed.rss"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "var(--ink-4)",
                    textDecoration: "underline dotted",
                  }}
                >
                  Subscribe via RSS
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
