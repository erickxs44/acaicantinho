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
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold mb-1 text-foreground">PDG Simplificado</h1>
          <p className="text-foreground/60">Registros rápidos de gastos/despesas</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setModalOpen(true)}
          className="px-6 py-3 rounded-2xl bg-destructive text-destructive-foreground font-bold flex items-center gap-2 hover:brightness-110 shadow-[0_0_20px_rgba(255,100,100,0.4)] transition"
        >
          <Plus className="h-5 w-5" /> Registrar Despesa
        </motion.button>
      </header>

      <div className="glass-strong rounded-3xl p-6 min-h-[400px]">
        <h2 className="text-xl font-bold mb-4 text-foreground">Despesas Recentes</h2>
        <div className="space-y-3">
          {recentDespesas.length === 0 ? (
            <p className="text-center text-foreground/40 py-12">Nenhuma despesa recente.</p>
          ) : (
            recentDespesas.map((d) => (
              <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4 flex items-center gap-4 border border-destructive/10">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                  <ArrowDownRight className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate text-foreground">{d.descricao}</div>
                </div>
                <div className="font-extrabold text-destructive text-lg">{brl(d.valor)}</div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-3xl p-6 w-full max-w-md space-y-5 relative max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-foreground/50 hover:text-foreground"><X className="h-5 w-5" /></button>
              
              <h2 className="text-2xl font-bold text-foreground">Nova Despesa</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-foreground/60 ml-1 uppercase">Descrição</label>
                  <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Conta de luz" className="w-full mt-1 px-4 py-3 rounded-xl bg-input border border-glass-border focus:ring-2 focus:ring-destructive focus:outline-none text-foreground" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/60 ml-1 uppercase">Valor Total</label>
                  <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" type="text" inputMode="decimal" className="w-full mt-1 px-4 py-3 rounded-xl bg-input border border-glass-border focus:ring-2 focus:ring-destructive focus:outline-none font-bold text-lg text-foreground" />
                </div>
              </div>

              <button
                onClick={finalizar}
                disabled={saving}
                className="w-full py-4 rounded-xl bg-destructive text-destructive-foreground font-bold text-lg hover:brightness-110 active:scale-[0.98] transition disabled:opacity-40 mt-4 shadow-[0_0_20px_rgba(255,100,100,0.4)]"
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
