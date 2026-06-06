import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ShoppingCart, Banknote, X } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function Fab() {
  const [open, setOpen] = useState(false);
  const [despOpen, setDespOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const salvarDespesa = async () => {
    const n = parseFloat(valor.replace(",", "."));
    if (!desc.trim() || !n) return toast.error("Preencha descrição e valor");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("despesas")
      .insert({ user_id: user!.id, descricao: desc.trim(), valor: n });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Despesa registrada");
    setDesc(""); setValor(""); setDespOpen(false); setOpen(false);
    window.dispatchEvent(new CustomEvent("data:changed"));
    router.invalidate();
  };

  return (
    <>
      <div className="fixed z-40 bottom-24 right-4 md:bottom-8 md:right-8 flex flex-col items-end gap-3">
        <AnimatePresence>
          {open && (
            <>
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ delay: 0.05 }}
                onClick={() => { setDespOpen(true); }}
                className="glass-strong rounded-full pl-4 pr-5 py-3 flex items-center gap-2 font-semibold text-sm shadow-xl"
              >
                <span className="h-8 w-8 rounded-full bg-destructive/30 flex items-center justify-center">
                  <Banknote className="h-4 w-4 text-destructive" />
                </span>
                Nova Despesa
              </motion.button>
              <Link
                to="/pdv"
                onClick={() => setOpen(false)}
                className="block"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  className="glass-strong rounded-full pl-4 pr-5 py-3 flex items-center gap-2 font-semibold text-sm shadow-xl"
                >
                  <span className="h-8 w-8 rounded-full bg-emerald-brand/30 flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 text-emerald-brand" />
                  </span>
                  Nova Venda
                </motion.div>
              </Link>
            </>
          )}
        </AnimatePresence>
        <motion.button
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => setOpen((o) => !o)}
          animate={{ rotate: open ? 135 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="h-14 w-14 rounded-full gradient-primary glow flex items-center justify-center shadow-2xl"
          aria-label="Ações rápidas"
        >
          <Plus className="h-7 w-7 text-white" />
        </motion.button>
      </div>

      <AnimatePresence>
        {despOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setDespOpen(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-3xl p-6 w-full max-w-md space-y-4 relative"
            >
              <button onClick={() => setDespOpen(false)} className="absolute top-4 right-4 text-foreground/50 hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
              <div>
                <h3 className="text-xl font-extrabold text-foreground">Nova Despesa</h3>
                <p className="text-sm text-foreground/60">Registre uma saída de caixa</p>
              </div>
              <input
                value={desc} onChange={(e) => setDesc(e.target.value)}
                placeholder="Descrição"
                className="w-full px-4 py-3 rounded-xl bg-input border border-glass-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                value={valor} onChange={(e) => setValor(e.target.value)}
                placeholder="Valor (R$)" type="text" inputMode="decimal"
                className="w-full px-4 py-3 rounded-xl bg-input border border-glass-border text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-2">
                <button
                  onClick={salvarDespesa}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl gradient-primary text-white font-semibold glow hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button onClick={() => setDespOpen(false)} className="px-4 py-3 rounded-xl glass text-foreground font-medium">Cancelar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
