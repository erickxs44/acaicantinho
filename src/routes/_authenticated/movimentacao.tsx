import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "@/lib/format";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Search, Trash2, Filter } from "lucide-react";

export const Route = createFileRoute("/_authenticated/movimentacao")({
  head: () => ({ meta: [{ title: "Movimentação — Cantinho do Açaí" }] }),
  component: Movimentacao,
});

type Row = { id: string; tipo: "entrada" | "saida"; descricao: string; valor: number; created_at: string; table: string };
type Tab = "todos" | "entradas" | "saidas" | "fiados";

function Movimentacao() {
  const [rows, setRows] = useState<Row[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("todos");

  const load = useCallback(async () => {
    const start = new Date(date + "T00:00:00").toISOString();
    const endDate = new Date(date + "T00:00:00");
    endDate.setDate(endDate.getDate() + 1);
    const end = endDate.toISOString();

    const [v, d, p] = await Promise.all([
      supabase.from("vendas").select("id,produto,valor,is_fiado,created_at,tipo_pagamento").gte("created_at", start).lt("created_at", end).order("created_at", { ascending: false }),
      supabase.from("despesas").select("id,descricao,valor,created_at").gte("created_at", start).lt("created_at", end).order("created_at", { ascending: false }),
      supabase.from("fiados_pagamentos").select("id,valor,created_at,fiado_id").gte("created_at", start).lt("created_at", end).order("created_at", { ascending: false }),
    ]);
    const all: Row[] = [
      ...(v.data ?? []).map((x) => ({
        id: x.id, tipo: "entrada" as const,
        descricao: x.is_fiado ? `Fiado: ${x.produto}` : `${x.produto} (${x.tipo_pagamento})`,
        valor: Number(x.valor), created_at: x.created_at, table: "vendas",
      })),
      ...(p.data ?? []).map((x) => ({ id: x.id, tipo: "entrada" as const, descricao: "Pagamento de fiado", valor: Number(x.valor), created_at: x.created_at, table: "fiados_pagamentos" })),
      ...(d.data ?? []).map((x) => ({ id: x.id, tipo: "saida" as const, descricao: x.descricao, valor: Number(x.valor), created_at: x.created_at, table: "despesas" })),
    ].sort((a, b) => b.created_at.localeCompare(a.created_at));
    setRows(all);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener("data:changed", handler);
    return () => window.removeEventListener("data:changed", handler);
  }, [load]);

  const remove = async (r: Row) => {
    if (!confirm("Remover esse lançamento?")) return;
    const { error } = await supabase.from(r.table as any).delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Removido"); load();
  };

  const entradas = rows.filter((r) => r.tipo === "entrada").reduce((s, r) => s + r.valor, 0);
  const saidas = rows.filter((r) => r.tipo === "saida").reduce((s, r) => s + r.valor, 0);

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
          <h1 className="text-3xl font-extrabold">Movimentação</h1>
          <p className="text-white/60">Entradas e saídas do dia</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-3 rounded-xl bg-input border border-glass-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3 }}
          className="glass-strong rounded-2xl p-4"
        >
          <div className="text-xs text-white/60 uppercase font-semibold">Entradas Totais</div>
          <div className="text-2xl font-extrabold text-emerald-brand mt-1">{brl(entradas)}</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          whileHover={{ y: -3 }}
          className="glass-strong rounded-2xl p-4"
        >
          <div className="text-xs text-white/60 uppercase font-semibold">Saídas Totais</div>
          <div className="text-2xl font-extrabold text-destructive mt-1">{brl(saidas)}</div>
        </motion.div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-black/20 p-2 rounded-2xl border border-glass-border">
        <div className="flex items-center w-full md:w-auto gap-1 bg-black/40 p-1 rounded-xl overflow-x-auto">
          {(["todos", "entradas", "saidas", "fiados"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize whitespace-nowrap transition ${
                activeTab === tab ? "bg-white text-black shadow-md" : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="Buscar lançamentos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-input border border-glass-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="glass-strong rounded-3xl p-4 space-y-2 min-h-[200px]">
        <AnimatePresence mode="popLayout">
          {filteredRows.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center text-white/40 py-16 flex flex-col items-center gap-3"
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
              className="glass rounded-xl p-3 flex items-center gap-4 hover:bg-white/5 transition-colors"
            >
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${r.tipo === "entrada" ? "bg-profit/20 text-emerald-brand" : "bg-destructive/20 text-destructive"}`}>
                {r.tipo === "entrada" ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate text-base">{r.descricao}</div>
                <div className="text-xs text-white/50">{dateBR(r.created_at)}</div>
              </div>
              <div className={`font-extrabold text-lg shrink-0 ${r.tipo === "entrada" ? "text-emerald-brand" : "text-destructive"}`}>
                {r.tipo === "entrada" ? "+" : "−"}{brl(r.valor)}
              </div>
              <button onClick={() => remove(r)} className="text-white/30 hover:text-destructive p-2 rounded-lg hover:bg-destructive/10 transition-colors shrink-0">
                <Trash2 className="h-5 w-5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
