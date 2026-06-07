import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Trash2, AlertTriangle, LogOut, Loader2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Cantinho do Açaí" }] }),
  component: Configuracoes,
});

function Configuracoes() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetText, setResetText] = useState("");

  const openModal = () => {
    setResetText("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (resetting) return;
    setResetText("");
    setModalOpen(false);
  };

  const zerarSistema = async () => {
    if (resetText !== "ZERAR") return;
    setResetting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user!.id;
      // Ordem de exclusão em cascata: pagamentos → registros → vendas → despesas → clientes
      await supabase.from("fiados_pagamentos").delete().eq("user_id", uid);
      await supabase.from("fiados_registros").delete().eq("user_id", uid);
      await supabase.from("vendas").delete().eq("user_id", uid);
      await supabase.from("despesas").delete().eq("user_id", uid);
      await supabase.from("clientes").delete().eq("user_id", uid);
      toast.success("Sistema zerado com sucesso!");
      window.dispatchEvent(new CustomEvent("data:changed"));
      setModalOpen(false);
      setResetText("");
      router.invalidate();
    } catch (e: any) {
      toast.error("Erro ao zerar: " + e.message);
    } finally {
      setResetting(false);
    }
  };

  const sair = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="space-y-6 max-w-2xl mx-auto"
      >
        <header>
          <h1 className="text-3xl font-extrabold text-foreground">Configurações</h1>
          <p className="text-foreground/60">Administração do sistema</p>
        </header>

        {/* ── Perfil / Conta ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-strong rounded-3xl p-6 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl gradient-primary glow flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Conta</h2>
              <p className="text-xs text-foreground/50">Gerenciamento de sessão</p>
            </div>
          </div>

          <button
            onClick={sair}
            className="w-full py-3 rounded-xl glass text-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-black/5 transition"
          >
            <LogOut className="h-4 w-4" /> Sair da conta
          </button>
        </motion.section>

        {/* ── Zona de Perigo ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-3xl p-6 space-y-4 border border-destructive/40 bg-destructive/5"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-destructive/30 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Zona de Perigo</h2>
              <p className="text-xs text-foreground/60">Ações irreversíveis</p>
            </div>
          </div>
          <p className="text-sm text-foreground/70">
            Zerar o sistema apaga <strong>todas as vendas, despesas, fiados, pagamentos e clientes</strong>.
            Esta ação não pode ser desfeita.
          </p>

          <button
            onClick={openModal}
            className="w-full py-3 rounded-xl bg-destructive text-destructive-foreground font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition"
          >
            <Trash2 className="h-4 w-4" /> Zerar todo o sistema
          </button>
        </motion.section>
      </motion.div>

      {/* ── Modal de Confirmação (overlay centralizado) ── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 16, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
            }}
            onClick={closeModal}
          >
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--purple-800, #1e0a3c)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 24, padding: 28, width: "100%", maxWidth: 380,
                position: "relative", display: "flex", flexDirection: "column", gap: 20,
              }}
            >
              {/* Botão fechar */}
              <button
                onClick={closeModal}
                disabled={resetting}
                style={{
                  position: "absolute", top: 16, right: 16, background: "none",
                  border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer",
                }}
              >
                <X className="h-5 w-5" />
              </button>

              {/* Ícone + Título */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, paddingTop: 8 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "rgba(239,68,68,0.15)", color: "#ef4444",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "white", margin: 0 }}>
                  Zerar o Sistema
                </h3>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>
                  Esta ação é <strong style={{ color: "#ef4444" }}>irreversível</strong>. Todas as vendas,
                  despesas, fiados e clientes serão apagados permanentemente.
                </p>
              </div>

              {/* Campo de confirmação */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center", margin: 0 }}>
                  Digite <strong style={{ color: "#ef4444", letterSpacing: "3px" }}>ZERAR</strong> para confirmar:
                </p>
                <input
                  value={resetText}
                  onChange={(e) => setResetText(e.target.value.toUpperCase())}
                  placeholder="ZERAR"
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoFocus
                  disabled={resetting}
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 12, boxSizing: "border-box",
                    background: "rgba(0,0,0,0.3)", border: "1px solid rgba(239,68,68,0.5)",
                    color: "white", fontFamily: "var(--font-display)", fontWeight: 700,
                    fontSize: 18, textTransform: "uppercase", letterSpacing: "6px",
                    textAlign: "center", outline: "none",
                  }}
                />
              </div>

              {/* Botões */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={zerarSistema}
                  disabled={resetting || resetText !== "ZERAR"}
                  style={{
                    flex: 1, padding: "13px 0", borderRadius: 12, border: "none",
                    background: resetText === "ZERAR" && !resetting ? "#dc2626" : "rgba(220,38,38,0.3)",
                    color: "white", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14,
                    cursor: resetText === "ZERAR" && !resetting ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all 0.2s",
                  }}
                >
                  {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {resetting ? "Zerando..." : "Confirmar"}
                </button>
                <button
                  onClick={closeModal}
                  disabled={resetting}
                  style={{
                    flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)", color: "white",
                    fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14,
                    cursor: resetting ? "not-allowed" : "pointer",
                  }}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
