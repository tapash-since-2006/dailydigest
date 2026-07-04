import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Sun, Moon, Search, LogOut, Menu, X, Bookmark } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { listDigests } from "../lib/api";

function formatISTDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function todayIST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headlines, setHeadlines] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    listDigests(3)
      .then((d: any[]) => {
        setHeadlines(d.map((x: any) => x.summary).filter(Boolean));
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  const navLinks = [
    { path: "/", label: "Home" },
    { path: `/digest/${todayIST()}`, label: "Today's Edition" },
    { path: "/search", label: "Archive" },
    { path: "/compare", label: "Compare" },
    { path: "/dashboard", label: "Operations" },
    { path: "/settings", label: "Settings" },
  ];

  return (
    <>
      {/* Accent bar */}
      <div className="masthead-accent-bar" />

      {/* Masthead */}
      <header className="masthead">
        <div className="page-container">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 0",
            }}
          >
            {/* Left — date */}
            <div
              style={{ display: "none", minWidth: "200px" }}
              className="md-date"
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--ink-4)",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {formatISTDate()}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--ink-5)",
                  marginTop: "2px",
                  fontFamily: "JetBrains Mono, monospace",
                  letterSpacing: "0.05em",
                }}
              >
                Morning Edition
              </div>
            </div>

            {/* Center — Logo */}
            <Link to="/" style={{ flex: 1, textAlign: "center" }}>
              <div className="masthead-logo">The Daily Digest</div>
              <div className="masthead-tagline">
                Markets · News · Analysis · Every Morning
              </div>
            </Link>

            {/* Right — actions */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                minWidth: "200px",
                justifyContent: "flex-end",
              }}
            >
              {searchOpen ? (
                <form
                  onSubmit={handleSearch}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search the archive..."
                    style={{
                      width: "180px",
                      padding: "6px 10px",
                      border: "1px solid var(--rule-strong)",
                      borderRadius: "2px",
                      background: "var(--paper-alt)",
                      color: "var(--ink)",
                      fontSize: "12px",
                      outline: "none",
                      fontFamily: "Inter, sans-serif",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setSearchOpen(false)}
                    className="btn-ghost"
                    style={{ padding: "6px" }}
                  >
                    <X size={14} />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="btn-ghost"
                  style={{ padding: "6px" }}
                >
                  <Search size={15} />
                </button>
              )}

              <button
                onClick={toggle}
                className="btn-ghost"
                style={{ padding: "6px" }}
                title="Toggle theme"
              >
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              {isAuthenticated ? (
                <>
                  <Link
                    to="/bookmarks"
                    className="btn-ghost"
                    style={{ padding: "6px" }}
                    title="Bookmarks"
                  >
                    <Bookmark size={15} />
                  </Link>
                  <button
                    onClick={logout}
                    className="btn-ghost"
                    style={{ padding: "6px", fontSize: "11px" }}
                    title="Sign out"
                  >
                    <LogOut size={14} />
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="btn-primary"
                  style={{ fontSize: "10px", padding: "6px 14px" }}
                >
                  Sign In
                </Link>
              )}

              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="btn-ghost"
                style={{ padding: "6px", display: "none" }}
                id="mobile-menu-btn"
              >
                {mobileOpen ? <X size={15} /> : <Menu size={15} />}
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--rule)", marginTop: "2px" }} />

        {/* Nav bar */}
        <div className="nav-bar">
          <div className="page-container">
            <nav
              style={{
                display: "flex",
                alignItems: "stretch",
                height: "36px",
                gap: "0",
                overflowX: "auto",
              }}
            >
              {navLinks.map(({ path, label }) => (
                <Link
                  key={path}
                  to={path}
                  className={`nav-link ${isActive(path) ? "active" : ""}`}
                >
                  {label}
                </Link>
              ))}
              {isAuthenticated && (
                <Link
                  to="/bookmarks"
                  className={`nav-link ${isActive("/bookmarks") ? "active" : ""}`}
                >
                  Reading List
                </Link>
              )}
              <div style={{ flex: 1 }} />
              {user && (
                <span
                  className="nav-link"
                  style={{
                    cursor: "default",
                    color: "#6B7280",
                    fontSize: "10px",
                  }}
                >
                  {user.email.split("@")[0]}
                </span>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          style={{
            background: "var(--card)",
            borderBottom: "1px solid var(--rule)",
          }}
        >
          {navLinks.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              style={{
                display: "block",
                padding: "12px 16px",
                borderBottom: "1px solid var(--rule)",
                fontSize: "13px",
                fontWeight: 500,
                color: isActive(path) ? "var(--accent)" : "var(--ink-2)",
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
