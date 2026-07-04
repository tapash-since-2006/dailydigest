import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, Clock, ArrowRight } from "lucide-react";
import { searchDigests } from "../lib/api";
import { SearchResult } from "../types";
import {
  Spinner,
  ErrorBanner,
  EmptyState,
  SectionHeader,
} from "../components/UI";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("dd_searches") ?? "[]");
    } catch {
      return [];
    }
  });

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const data = await searchDigests(q.trim());
      setResults(data);
      const updated = [
        q.trim(),
        ...recentSearches.filter((s) => s !== q.trim()),
      ].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem("dd_searches", JSON.stringify(updated));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      doSearch(q);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: query });
    doSearch(query);
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
            marginBottom: "6px",
          }}
        >
          Publication Archive
        </h1>
        <p style={{ fontSize: "13px", color: "var(--ink-3)" }}>
          Full-text search across every edition
        </p>
      </div>

      {/* Search bar */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "0",
          marginBottom: "32px",
          maxWidth: "640px",
        }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ink-4)",
            }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics, companies, events…"
            className="ed-input"
            style={{
              paddingLeft: "36px",
              borderRight: "none",
              borderRadius: "2px 0 0 2px",
              fontSize: "14px",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="btn-primary"
          style={{ borderRadius: "0 2px 2px 0", minWidth: "80px" }}
        >
          {loading ? <Spinner size={13} /> : "Search"}
        </button>
      </form>

      {/* Recent searches */}
      {!searched && recentSearches.length > 0 && (
        <div style={{ marginBottom: "40px" }}>
          <SectionHeader title="Recent Searches" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {recentSearches.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQuery(s);
                  setSearchParams({ q: s });
                  doSearch(s);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  background: "var(--card)",
                  border: "1px solid var(--rule)",
                  borderRadius: "2px",
                  fontSize: "12px",
                  color: "var(--ink-3)",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
              >
                <Clock size={10} /> {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <ErrorBanner message={error} />}
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

      {/* Results */}
      {!loading && searched && results.length === 0 && (
        <EmptyState
          title={`No results for "${query}"`}
          subtitle="Try different keywords or browse the archive"
        />
      )}

      {!loading && results.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--ink-4)",
              marginBottom: "20px",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {results.length} result{results.length !== 1 ? "s" : ""} for "
            {query}"
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1px",
              background: "var(--rule)",
              border: "1px solid var(--rule)",
            }}
          >
            {results.map((r, i) => (
              // ─────────────────────────────────────────────────────────────────
              // FIX: Link now includes the `?hl=` highlight query parameter
              // ─────────────────────────────────────────────────────────────────
              <Link
                key={i}
                to={`/digest/${r.date}?hl=${encodeURIComponent(query)}`}
                style={{
                  display: "flex",
                  gap: "20px",
                  padding: "20px 24px",
                  background: "var(--card)",
                  textDecoration: "none",
                  transition: "background 0.15s",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ minWidth: "80px", flexShrink: 0 }}>
                  <div
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: "10px",
                      color: "var(--ink-4)",
                      lineHeight: 1.5,
                    }}
                  >
                    {r.date}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "Playfair Display, serif",
                      fontWeight: 700,
                      fontSize: "1rem",
                      color: "var(--ink)",
                      marginBottom: "8px",
                    }}
                  >
                    {r.dateHuman?.trim()}
                  </div>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--ink-3)",
                      lineHeight: 1.6,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: r.excerpt.replace(
                        /<mark>/g,
                        '<mark style="background:var(--accent-light);color:var(--ink);padding:1px 3px;border-radius:1px;">',
                      ),
                    }}
                  />
                </div>
                <ArrowRight
                  size={14}
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
      )}

      {!searched && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            borderTop: "1px solid var(--rule)",
          }}
        >
          <p
            style={{ fontSize: "13px", color: "var(--ink-4)", lineHeight: 1.7 }}
          >
            Try: <em>"Federal Reserve"</em> · <em>"OpenAI"</em> ·{" "}
            <em>"India GDP"</em> · <em>"startup funding"</em>
          </p>
        </div>
      )}
    </div>
  );
}
