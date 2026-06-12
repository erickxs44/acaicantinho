import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "@/lib/format";
import { saveState, loadState } from "@/lib/offline-storage";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Search, Trash2, Filter, X, ReceiptText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/movimentacao")({
  head: () => ({ meta: [{ title: "Movimentações — Cantinho do Açaí" }] }),
  component: Movimentacao,
});

type Row = { id: string; tipo: "entrada" | "saida"; descricao: string; valor: number; created_at: string; table: string; fiado_id?: string; is_fiado?: boolean; };
type Tab = "todos" | "entradas" | "saidas" | "fiados";

function Movimentacao() {
  const [rows, setRows] = useState<Row[]>(() => loadState("movimentacaoRows", []));
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("todos");
  
  // Controle do Modal de Exclusão
  const [rowToDelete, setRowToDelete] = useState<Row | null>(null);
  const [savingRemove, setSavingRemove] = useState(false);

  const load = useCallback(async () => {
    // Busca os últimos 100 registros de cada tabela para popular o histórico recente
    const [v, d, p] = await Promise.all([
      supabase.from("vendas").select("id,produto,valor,is_fiado,created_at,tipo_pagamento").order("created_at", { ascending: false }).limit(100),
      supabase.from("despesas").select("id,descricao,valor,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("fiados_pagamentos").select("id,valor,created_at,fiado_id").order("created_at", { ascending: false }).limit(100),
    ]);
    const all: Row[] = [
      ...(v.data ?? []).map((x) => ({
        id: x.id, tipo: "entrada" as const,
        descricao: x.is_fiado ? `Fiado: ${x.produto}` : `${x.produto} (${x.tipo_pagamento})`,
        valor: Number(x.valor), created_at: x.created_at, table: "vendas", is_fiado: x.is_fiado
      })),
      ...(p.data ?? []).map((x) => ({ id: x.id, tipo: "entrada" as const, descricao: "Pagamento de fiado", valor: Number(x.valor), created_at: x.created_at, table: "fiados_pagamentos", fiado_id: x.fiado_id })),
      ...(d.data ?? []).map((x) => ({ id: x.id, tipo: "saida" as const, descricao: x.descricao, valor: Number(x.valor), created_at: x.created_at, table: "despesas" })),
    ];
    const sortedAll = all.sort((a, b) => b.created_at.localeCompare(a.created_at));
    setRows(sortedAll);
    saveState("movimentacaoRows", sortedAll);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener("data:changed", handler);
    return () => window.removeEventListener("data:changed", handler);
  }, [load]);

  const remove = async () => {
    if (!rowToDelete || savingRemove) return;
    const r = rowToDelete;
    setSavingRemove(true);
    try {
      if (r.table === "vendas") {
        // Exclusão em cascata manual (Pagamentos -> Fiado -> Venda)
        const { data: fiado } = await supabase.from("fiados_registros").select("id").eq("venda_id", r.id).maybeSingle();
        if (fiado) {
          await supabase.from("fiados_pagamentos").delete().eq("fiado_id", fiado.id);
          await supabase.from("fiados_registros").delete().eq("id", fiado.id);
        }
        const { error } = await supabase.from("vendas").delete().eq("id", r.id);
        if (error) throw error;
      } else if (r.table === "fiados_pagamentos") {
        // Estorno de pagamento: remover o pagamento e subtrair do valor_pago no fiado_registro
        if (r.fiado_id) {
            const { data: fiado } = await supabase.from("fiados_registros").select("id, valor_pago, valor_total, status").eq("id", r.fiado_id).single();
            if (fiado) {
                const novoPago = Number(fiado.valor_pago) - r.valor;
                const novoStatus = novoPago < Number(fiado.valor_total) ? "aberto" : fiado.status;
                await supabase.from("fiados_registros").update({ 
                    valor_pago: Math.max(0, novoPago), 
                    status: novoStatus, 
                    paid_at: novoStatus === "aberto" ? null : undefined 
                }).eq("id", fiado.id);
            }
        }
        const { error } = await supabase.from("fiados_pagamentos").delete().eq("id", r.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(r.table as any).delete().eq("id", r.id);
        if (error) throw error;
      }
      
      toast.success("Estorno realizado com sucesso!"); 
      setRowToDelete(null);
      load();
      window.dispatchEvent(new CustomEvent("data:changed"));
    } catch (error: any) {
      toast.error("Erro ao estornar: " + error.message);
    } finally {
      setSavingRemove(false);
    }
  };

  // Lógica de Filtros
  const filteredRows = rows.filter((r) => {
    // Aba
    if (activeTab === "entradas" && r.tipo !== "entrada") return false;
    if (activeTab === "saidas" && r.tipo !== "saida") return false;
    if (activeTab === "fiados" && !r.descricao.toLowerCase().includes("fiado")) return false;

    // Busca
    if (search.trim() !== "") {
      const q = search.toLowerCase();
      if (!r.descricao.toLowerCase().includes(q) && !r.valor.toString().includes(q)) {
        return false;
      }
    }
    
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">Movimentações</h1>
          <p className="text-foreground/60">Histórico e estornos</p>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-black/5 p-2 rounded-2xl border border-glass-border">
        <div className="flex items-center w-full md:w-auto gap-1 bg-black/5 p-1 rounded-xl overflow-x-auto">
          {(["todos", "entradas", "saidas", "fiados"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize whitespace-nowrap transition ${
                activeTab === tab ? "bg-primary text-primary-foreground shadow-md" : "text-foreground/60 hover:text-foreground hover:bg-black/5"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
          <input
            type="text"
            placeholder="Buscar lançamentos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-input border border-glass-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="glass-strong rounded-3xl p-4 space-y-2 min-h-[200px]">
        <AnimatePresence mode="popLayout">
          {filteredRows.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center text-foreground/40 py-16 flex flex-col items-center gap-3"
            >
              <Filter className="h-8 w-8 opacity-20" />
              <p>Nenhuma movimentação encontrada.</p>
            </motion.div>
          ) : filteredRows.map((r, i) => (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.025 }}
              className="glass rounded-xl p-3 flex items-center gap-3 bg-background hover:bg-black/5 transition-colors w-full"
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${r.is_fiado ? "bg-fiado/10 text-fiado-foreground" : r.tipo === "entrada" ? "bg-emerald-brand/10 text-emerald-brand" : "bg-destructive/10 text-destructive"}`}>
                {r.is_fiado ? <ReceiptText className="h-5 w-5" /> : r.tipo === "entrada" ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate text-sm text-foreground">{r.descricao}</div>
                <div className="text-xs text-foreground/50">{dateBR(r.created_at)}</div>
              </div>
              <div className={`font-extrabold text-base shrink-0 ${r.is_fiado ? "text-fiado-foreground" : r.tipo === "entrada" ? "text-emerald-brand" : "text-destructive"}`}>
                {r.is_fiado ? "" : (r.tipo === "entrada" ? "+" : "−")}{brl(r.valor)}
              </div>
              <button
                onClick={() => setRowToDelete(r)}
                title="Estornar"
                className="text-foreground/30 hover:text-destructive p-2 rounded-lg hover:bg-destructive/10 transition-colors shrink-0"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {rowToDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setRowToDelete(null)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-3xl p-6 w-full max-w-sm space-y-4 relative"
            >
              <button onClick={() => setRowToDelete(null)} className="absolute top-4 right-4 text-foreground/50 hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
              
              <div className="flex flex-col items-center text-center space-y-2 pt-2">
                <div className="h-16 w-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
                  <Trash2 className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Remover Movimentação</h3>
                <p className="text-sm text-foreground/60">
                  Você deseja remover essa movimentação?
                </p>
                <div className="bg-black/20 p-3 rounded-xl w-full mt-2 text-left flex items-center justify-between border border-glass-border">
                  <span className="text-sm font-semibold text-foreground/80 truncate pr-2">{rowToDelete.descricao}</span>
                  <span className={`font-bold shrink-0 ${rowToDelete.tipo === "entrada" ? "text-emerald-brand" : "text-destructive"}`}>
                    {brl(rowToDelete.valor)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={remove}
                  disabled={savingRemove}
                  className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold hover:brightness-110 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingRemove ? "Removendo..." : "Sim"}
                </button>
                <button
                  onClick={() => setRowToDelete(null)}
                  disabled={savingRemove}
                  className="flex-1 py-3 rounded-xl glass text-foreground font-bold hover:bg-black/10 transition disabled:opacity-40"
                >
                  Não
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
