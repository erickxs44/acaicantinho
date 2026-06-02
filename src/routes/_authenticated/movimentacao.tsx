import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "@/lib/format";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/movimentacao")({
  head: () => ({ meta: [{ title: "Movimentação — Cantinho do Açaí" }] }),
  component: Movimentacao,
});

type Row = { id: string; tipo: "entrada" | "saida"; descricao: string; valor: number; created_at: string; table: string };

function Movimentacao() {
  const [rows, setRows] = useState<Row[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [openDesp, setOpenDesp] = useState(false);
  const [desc, setDesc] = useState(""); const [valor, setValor] = useState("");

  useEffect(() => { load(); }, [date]);

  async function load() {
    const start = new Date(date + "T00:00:00").toISOString();
    const end = new Date(date + "T23:59:59").toISOString();
    const [v, d, p] = await Promise.all([
      supabase.from("vendas").select("id,produto,valor,is_fiado,created_at,tipo_pagamento").gte("created_at", start).lte("created_at", end).order("created_at", { ascending: false }),
      supabase.from("despesas").select("id,descricao,valor,created_at").gte("created_at", start).lte("created_at", end).order("created_at", { ascending: false }),
      supabase.from("fiados_pagamentos").select("id,valor,created_at,fiado_id").gte("created_at", start).lte("created_at", end).order("created_at", { ascending: false }),
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
  }

  const addDespesa = async () => {
    const n = parseFloat(valor.replace(",", "."));
    if (!desc.trim() || !n) return toast.error("Preencha os campos");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("despesas").insert({ user_id: user!.id, descricao: desc.trim(), valor: n });
    if (error) return toast.error(error.message);
    toast.success("Despesa registrada");
    setOpenDesp(false); setDesc(""); setValor(""); load();
  };

  const remove = async (r: Row) => {
    if (!confirm("Remover esse lançamento?")) return;
    const { error } = await supabase.from(r.table as any).delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Removido"); load();
  };

  const entradas = rows.filter((r) => r.tipo === "entrada").reduce((s, r) => s + r.valor, 0);
  const saidas = rows.filter((r) => r.tipo === "saida").reduce((s, r) => s + r.valor, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Movimentação</h1>
          <p className="text-white/60">Entradas e saídas do dia</p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-input border border-glass-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button onClick={() => setOpenDesp(true)} className="px-4 py-2.5 rounded-xl gradient-primary font-semibold text-sm flex items-center gap-2 glow">
            <Plus className="h-4 w-4" /> Despesa
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-strong rounded-2xl p-4">
          <div className="text-xs text-white/60 uppercase font-semibold">Entradas</div>
          <div className="text-2xl font-extrabold text-emerald-brand mt-1">{brl(entradas)}</div>
        </div>
        <div className="glass-strong rounded-2xl p-4">
          <div className="text-xs text-white/60 uppercase font-semibold">Saídas</div>
          <div className="text-2xl font-extrabold text-destructive mt-1">{brl(saidas)}</div>
        </div>
      </div>

      <div className="glass-strong rounded-3xl p-4 space-y-2">
        {rows.length === 0 ? (
          <p className="text-center text-white/40 py-12">Sem movimentações neste dia</p>
        ) : rows.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="glass rounded-xl p-3 flex items-center gap-3"
          >
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${r.tipo === "entrada" ? "bg-profit/20 text-emerald-brand" : "bg-destructive/20 text-destructive"}`}>
              {r.tipo === "entrada" ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{r.descricao}</div>
              <div className="text-xs text-white/50">{dateBR(r.created_at)}</div>
            </div>
            <div className={`font-extrabold ${r.tipo === "entrada" ? "text-emerald-brand" : "text-destructive"}`}>
              {r.tipo === "entrada" ? "+" : "−"}{brl(r.valor)}
            </div>
            <button onClick={() => remove(r)} className="text-white/30 hover:text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
          </motion.div>
        ))}
      </div>

      {openDesp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setOpenDesp(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-3xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl font-bold">Nova Despesa</h3>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição" className="w-full px-4 py-3 rounded-xl bg-input text-sm" />
            <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Valor (R$)" type="text" inputMode="decimal" className="w-full px-4 py-3 rounded-xl bg-input text-sm" />
            <div className="flex gap-2">
              <button onClick={addDespesa} className="flex-1 py-3 rounded-xl gradient-primary font-semibold">Salvar</button>
              <button onClick={() => setOpenDesp(false)} className="px-4 py-3 rounded-xl glass">Cancelar</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
