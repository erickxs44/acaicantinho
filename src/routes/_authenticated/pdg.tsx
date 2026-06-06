import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { Plus, X, ArrowDownRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pdg")({
  head: () => ({ meta: [{ title: "PDG — Cantinho do Açaí" }] }),
  component: PDG,
});

function PDG() {
  const [modalOpen, setModalOpen] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);

  const [recentDespesas, setRecentDespesas] = useState<{ id: string; descricao: string; valor: number }[]>([]);

  useEffect(() => {
    loadRecentDespesas();
  }, []);

  async function loadRecentDespesas() {
    const { data } = await supabase.from("despesas").select("id,descricao,valor").order("created_at", { ascending: false }).limit(10);
    setRecentDespesas(data ?? []);
  }

  const finalizar = async () => {
    if (!descricao.trim()) return toast.error("Informe a descrição da despesa");
    const valorNum = parseFloat(valor.replace(",", "."));
    if (!valorNum || valorNum <= 0) return toast.error("Informe um valor válido");
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user!.id;

      const { error } = await supabase.from("despesas").insert({
        user_id: userId, descricao: descricao.trim(), valor: valorNum
      });
      if (error) throw error;

      toast.success(`Despesa de ${brl(valorNum)} registrada!`);
      
      // Reset form
      setDescricao(""); setValor("");
      setModalOpen(false);
      loadRecentDespesas();
      window.dispatchEvent(new CustomEvent("data:changed"));
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, letterSpacing: "-0.5px", color: "white", margin: 0 }}>
            PDG — Despesas
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--white-70)", marginTop: 2 }}>
            Registre saídas e gastos do caixa
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setModalOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(244,97,123,0.15)",
            color: "#f4617b",
            border: "1px solid rgba(244,97,123,0.25)",
            borderRadius: 12,
            padding: "12px 20px",
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <Plus className="h-5 w-5" /> Registrar Despesa
        </motion.button>
      </div>

      <div className="panel" style={{ minHeight: 400 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "white", marginBottom: 16 }}>Despesas Recentes</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recentDespesas.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--white-70)", padding: "48px 0", fontFamily: "var(--font-sans)" }}>Nenhuma despesa recente.</p>
          ) : (
            recentDespesas.map((d) => (
              <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: "var(--white-5)", border: "1px solid rgba(244,97,123,0.1)",
                  borderRadius: 14, padding: "14px 16px",
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: "rgba(244,97,123,0.15)", color: "#f4617b",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <ArrowDownRight className="h-5 w-5" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 14, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.descricao}</div>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#f4617b", flexShrink: 0 }}>{brl(d.valor)}</div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--purple-800)", border: "1px solid var(--white-10)",
                borderRadius: 24, padding: 28, width: "100%", maxWidth: 440,
                position: "relative",
              }}
            >
              <button onClick={() => setModalOpen(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--white-70)", cursor: "pointer" }}><X className="h-5 w-5" /></button>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "white", marginBottom: 20 }}>Nova Despesa</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--white-70)", display: "block", marginBottom: 6 }}>Descrição</label>
                  <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Conta de luz" className="input-base" />
                </div>
                <div>
                  <label style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--white-70)", display: "block", marginBottom: 6 }}>Valor Total</label>
                  <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" type="text" inputMode="decimal" className="input-base" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20 }} />
                </div>
              </div>
              <button
                onClick={finalizar}
                disabled={saving}
                className="btn-destructive"
                style={{ width: "100%", padding: "14px 0", fontSize: 15, marginTop: 20, borderRadius: 12 }}
              >
                {saving ? "Salvando..." : "Confirmar Despesa"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
