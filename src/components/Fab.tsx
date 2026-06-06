import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";

export function Fab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="fab-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 190,
            }}
          />
        )}
      </AnimatePresence>

      {/* FAB Menu Options */}
      <AnimatePresence>
        {open && (
          <div
            className="bottom-[calc(140px+env(safe-area-inset-bottom))] md:bottom-[100px]"
            style={{
              position: "fixed",
              right: 32,
              zIndex: 200,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              alignItems: "flex-end",
            }}
          >
            {/* Nova Venda */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.05 }}
            >
              <Link
                to="/pdv"
                onClick={() => setOpen(false)}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "var(--purple-800)",
                    border: "1px solid var(--white-10)",
                    borderRadius: 14,
                    padding: "10px 16px",
                    fontFamily: "var(--font-sans)",
                    fontWeight: 500,
                    fontSize: 13,
                    color: "white",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                    cursor: "pointer",
                    transition: "background 0.2s, transform 0.2s",
                    animation: "slideUp 0.25s ease forwards",
                    animationDelay: "0.05s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--purple-700)";
                    (e.currentTarget as HTMLElement).style.transform = "translateX(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--purple-800)";
                    (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(34,211,165,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3a5" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  Nova Venda
                </div>
              </Link>
            </motion.div>

            {/* Nova Despesa */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0 }}
            >
              <Link
                to="/pdg"
                onClick={() => setOpen(false)}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "var(--purple-800)",
                    border: "1px solid var(--white-10)",
                    borderRadius: 14,
                    padding: "10px 16px",
                    fontFamily: "var(--font-sans)",
                    fontWeight: 500,
                    fontSize: 13,
                    color: "white",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                    cursor: "pointer",
                    transition: "background 0.2s, transform 0.2s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--purple-700)";
                    (e.currentTarget as HTMLElement).style.transform = "translateX(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--purple-800)";
                    (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(244,97,123,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f4617b" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  Nova Despesa
                </div>
              </Link>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FAB Main Button */}
      <motion.button
        className="bottom-[calc(70px+env(safe-area-inset-bottom))] md:bottom-8"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onClick={() => setOpen((o) => !o)}
        aria-label="Ações rápidas"
        style={{
          position: "fixed",
          right: 32,
          minWidth: 56,
          minHeight: 56,
          borderRadius: 18,
          background: "linear-gradient(135deg, #7c3aed, #9d5bf5)",
          boxShadow: open
            ? "0 12px 40px rgba(124,58,237,0.7)"
            : "0 8px 32px rgba(124,58,237,0.6)",
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          cursor: "pointer",
          transition: "box-shadow 0.3s",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </motion.button>
    </>
  );
}
