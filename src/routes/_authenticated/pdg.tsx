import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { saveState, loadState } from "@/lib/offline-storage";
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



  const finalizar = async () => {
    if (saving) return;
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
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 24 }}>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setModalOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "rgba(244,97,123,0.15)",
            color: "#f4617b",
            border: "1px solid rgba(244,97,123,0.25)",
            borderRadius: 24, padding: "24px 40px",
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20,
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          <Plus className="h-8 w-8" /> Registrar Nova Despesa
        </motion.button>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--white-70)", textAlign: "center" }}>
          Clique no botão acima para registrar um gasto
        </p>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--purple-800)", border: "1px solid var(--white-10)",
                borderRadius: 20, padding: 20, width: "100%", maxWidth: 380,
                position: "relative",
              }}
            >
              <button onClick={() => setModalOpen(false)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "var(--white-70)", cursor: "pointer" }}><X className="h-5 w-5" /></button>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "white", marginBottom: 16 }}>Nova Despesa</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", color: "var(--white-70)", display: "block", marginBottom: 4 }}>Descrição</label>
                  <input value={descricao} onChange={(e) => setDescricao(e.target.value)} onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)} placeholder="Ex: Conta de luz" className="input-base" style={{ padding: "10px 14px", fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", color: "var(--white-70)", display: "block", marginBottom: 4 }}>Valor Total</label>
                  <input value={valor} onChange={(e) => setValor(e.target.value)} onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)} placeholder="0.00" type="text" inputMode="decimal" className="input-base" style={{ padding: "10px 14px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }} />
                </div>
              </div>
              <button
                onClick={finalizar}
                disabled={saving}
                className="btn-destructive"
                style={{ width: "100%", padding: "12px 0", fontSize: 14, marginTop: 16, borderRadius: 10 }}
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
