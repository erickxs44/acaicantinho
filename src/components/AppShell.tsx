import { Link, Outlet, useRouter, useLocation } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Fab } from "./Fab";

// ── Sidebar Nav Icons (SVG stroke-based) ──────────────────────────────────
function IconDashboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function IconPDV() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
function IconPDG() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconMovimentacao() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IconFiados() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const nav = [
  { to: "/dashboard", icon: IconDashboard, label: "Início" },
  { to: "/pdv",       icon: IconPDV,       label: "PDV" },
  { to: "/pdg",       icon: IconPDG,       label: "PDG" },
  { to: "/movimentacao", icon: IconMovimentacao, label: "Caixa" },
  { to: "/fiados",    icon: IconFiados,    label: "Fiados" },
] as const;

export function AppShell() {
  const router = useRouter();
  const { pathname } = useLocation();

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Até logo!");
    router.navigate({ to: "/auth" });
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", position: "relative", zIndex: 1 }}>

      {/* ── DESKTOP SIDEBAR ───────────────────────────────────────── */}
      <aside style={{
        width: 72,
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        background: "var(--purple-900)",
        borderRight: "1px solid var(--white-10)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 0",
        gap: 8,
        zIndex: 50,
      }}
        className="hidden md:flex"
      >
        {/* Logo */}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "linear-gradient(135deg, #7c3aed, #b97ef8)",
          boxShadow: "0 8px 24px rgba(124,58,237,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          overflow: "hidden",
          flexShrink: 0,
        }}>
          <img src="/logo.png" alt="Logo" style={{ width: 36, height: 36, objectFit: "contain" }} />
        </div>

        {/* Nav Items */}
        <nav style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
          {nav.map(({ to, icon: Icon, label }, i) => {
            const active = pathname.startsWith(to);
            return (
              <motion.div
                key={to}
                className="sidebar-item"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.05 }}
                style={{ position: "relative" }}
              >
                <Link
                  to={to}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: active ? "white" : "var(--white-30)",
                    background: active
                      ? "linear-gradient(135deg, #5a2d9c, #7c3aed)"
                      : "transparent",
                    boxShadow: active ? "0 4px 16px rgba(124,58,237,0.4)" : "none",
                    transition: "all 0.2s",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "var(--white-10)";
                      (e.currentTarget as HTMLElement).style.color = "var(--white-70)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "var(--white-30)";
                    }
                  }}
                >
                  <Icon />
                </Link>
                <span className="sidebar-tooltip">{label}</span>
              </motion.div>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: "auto" }}>
          {/* Settings */}
          <div className="sidebar-item" style={{ position: "relative" }}>
            <Link
              to="/configuracoes"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: pathname.startsWith("/configuracoes") ? "white" : "var(--white-30)",
                background: pathname.startsWith("/configuracoes")
                  ? "linear-gradient(135deg, #5a2d9c, #7c3aed)"
                  : "transparent",
                transition: "all 0.2s",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                if (!pathname.startsWith("/configuracoes")) {
                  (e.currentTarget as HTMLElement).style.background = "var(--white-10)";
                  (e.currentTarget as HTMLElement).style.color = "var(--white-70)";
                }
              }}
              onMouseLeave={(e) => {
                if (!pathname.startsWith("/configuracoes")) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--white-30)";
                }
              }}
            >
              <IconSettings />
            </Link>
            <span className="sidebar-tooltip">Config</span>
          </div>

          {/* Avatar / Logout */}
          <button
            onClick={logout}
            title="Sair"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #9d5bf5, #d4aafc)",
              border: "2px solid var(--white-30)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-display)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            CA
          </button>
        </div>
      </aside>

      {/* ── MOBILE HEADER ─────────────────────────────────────────── */}
      <div
        className="md:hidden"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          background: "var(--purple-900)",
          borderBottom: "1px solid var(--white-10)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "linear-gradient(135deg, #7c3aed, #b97ef8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}>
            <img src="/logo.png" alt="Logo" style={{ width: 28, height: 28, objectFit: "contain" }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)", color: "white" }}>
            Cantinho do Açaí
          </span>
        </div>
        <button
          onClick={logout}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #9d5bf5, #d4aafc)",
            border: "2px solid var(--white-30)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          CA
        </button>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          marginLeft: 0,
          paddingTop: 80,
          paddingBottom: 112,
          padding: "80px 20px 112px",
          minWidth: 0,
          position: "relative",
          zIndex: 1,
        }}
        className="md:ml-[72px] md:pt-8 md:pb-8 md:px-9"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── MOBILE BOTTOM NAV ─────────────────────────────────────── */}
      <nav
        className="md:hidden"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          background: "var(--purple-900)",
          borderTop: "1px solid var(--white-10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "8px 0 12px",
        }}
      >
        {nav.map(({ to, icon: Icon, label }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "8px 12px",
                borderRadius: 12,
                color: active ? "white" : "var(--white-30)",
                background: active ? "linear-gradient(135deg, #5a2d9c, #7c3aed)" : "transparent",
                textDecoration: "none",
                fontSize: 9,
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                letterSpacing: "0.5px",
                transition: "all 0.2s",
              }}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          );
        })}
        <Link
          to="/configuracoes"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            padding: "8px 12px",
            borderRadius: 12,
            color: pathname.startsWith("/configuracoes") ? "white" : "var(--white-30)",
            background: pathname.startsWith("/configuracoes") ? "linear-gradient(135deg, #5a2d9c, #7c3aed)" : "transparent",
            textDecoration: "none",
            fontSize: 9,
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            transition: "all 0.2s",
          }}
        >
          <IconSettings />
          <span>Config</span>
        </Link>
      </nav>

      <Fab />
    </div>
  );
}
