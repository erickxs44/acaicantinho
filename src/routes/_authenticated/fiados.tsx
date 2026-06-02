import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "@/lib/format";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, Plus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/fiados")({
  head: () => ({ meta: [{ title: "Fiados — Cantinho do Açaí" }] }),
  component: Fiados,
});

type Cliente = { id: string; nome: string; telefone: string | null };
type Fiado = { id: string; cliente_id: string; descricao: string; valor_total: number; valor_pago: number; status: string; created_at: string };

function Fiados() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [fiados, setFiados] = useState<Fiado[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState<{ cli: Cliente; total: number } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const [c, f] = await Promise.all([
      supabase.from("clientes").select("id,nome,telefone").order("nome"),
      supabase.from("fiados_registros").select("*").eq("status", "aberto").order("created_at", { ascending: false }),
    ]);
    setClientes(c.data ?? []);
    setFiados(f.data ?? []);
  }

  // Group by cliente
  const grouped = useMemo(() => {
    const map = new Map<string, { cli: Cliente; items: Fiado[]; total: number }>();
    for (const f of fiados) {
      const cli = clientes.find((c) => c.id === f.cliente_id);
      if (!cli) continue;
      const e = map.get(cli.id) ?? { cli, items: [], total: 0 };
      e.items.push(f);
      e.total += Number(f.valor_total) - Number(f.valor_pago);
      map.set(cli.id, e);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [fiados, clientes]);

  const totalGeral = grouped.reduce((s, g) => s + g.total, 0);

  const pagar = async () => {
    if (!payOpen) return;
    const n = parseFloat(payAmount.replace(",", "."));
    if (!n || n <= 0) return toast.error("Valor inválido");
    if (n > payOpen.total + 0.001) return toast.error("Valor maior que o saldo");

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user!.id;
    let restante = n;
    // Pagar do mais antigo
    const items = [...fiados.filter((f) => f.cliente_id === payOpen.cli.id)].sort((a, b) => a.created_at.localeCompare(b.created_at));

    for (const f of items) {
      if (restante <= 0) break;
      const saldo = Number(f.valor_total) - Number(f.valor_pago);
      const aplicar = Math.min(restante, saldo);
      const novoPago = Number(f.valor_pago) + aplicar;
      const fechou = novoPago >= Number(f.valor_total) - 0.001;
      await supabase.from("fiados_registros").update({
        valor_pago: novoPago,
        status: fechou ? "pago" : "aberto",
        paid_at: fechou ? new Date().toISOString() : null,
      }).eq("id", f.id);
      await supabase.from("fiados_pagamentos").insert({ user_id: userId, fiado_id: f.id, valor: aplicar });
      restante -= aplicar;
    }
    toast.success(`Pagamento de ${brl(n)} registrado!`);
    setPayOpen(null); setPayAmount(""); load();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Fiados</h1>
          <p className="text-white/60">Gestão de clientes devedores</p>
        </div>
        <button onClick={() => setNewOpen(true)} className="px-4 py-2.5 rounded-xl gradient-primary font-semibold text-sm flex items-center gap-2 glow">
          <Plus className="h-4 w-4" /> Novo Fiado
        </button>
      </header>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-fiado text-fiado-foreground rounded-2xl p-5 shadow-xl">
        <div className="text-xs font-bold uppercase opacity-80">Saldo total em aberto</div>
        <div className="text-4xl font-extrabold mt-1">{brl(totalGeral)}</div>
        <div className="text-sm mt-1 opacity-80">{grouped.length} cliente(s) devedor(es)</div>
      </motion.div>

      <div className="space-y-2">
        {grouped.length === 0 ? (
          <div className="glass-strong rounded-3xl p-12 text-center text-white/50">Nenhum fiado em aberto 🎉</div>
        ) : grouped.map((g, i) => (
          <motion.div key={g.cli.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-strong rounded-2xl overflow-hidden">
            <button onClick={() => setExpanded(expanded === g.cli.id ? null : g.cli.id)} className="w-full p-4 flex items-center gap-3 hover:bg-white/5">
              <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center font-bold text-lg">
                {g.cli.nome[0].toUpperCase()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-bold truncate">{g.cli.nome}</div>
                <div className="text-xs text-white/50">{g.items.length} compra(s)</div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-fiado">{brl(g.total)}</div>
                <div className="text-[10px] text-white/40 uppercase">em aberto</div>
              </div>
              <ChevronDown className={`h-5 w-5 text-white/40 transition-transform ${expanded === g.cli.id ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {expanded === g.cli.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="p-4 pt-0 space-y-2 border-t border-glass-border">
                    {g.items.map((f) => (
                      <div key={f.id} className="glass rounded-xl p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{f.descricao}</div>
                          <div className="text-xs text-white/50">{dateBR(f.created_at)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{brl(Number(f.valor_total) - Number(f.valor_pago))}</div>
                          {Number(f.valor_pago) > 0 && <div className="text-[10px] text-white/40">pago {brl(Number(f.valor_pago))}</div>}
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => { setPayOpen({ cli: g.cli, total: g.total }); setPayAmount(g.total.toFixed(2)); }}
                      className="w-full py-3 rounded-xl gradient-emerald text-white font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Dar Baixa
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {payOpen && (
        <Modal onClose={() => setPayOpen(null)}>
          <h3 className="text-xl font-bold">Receber pagamento</h3>
          <p className="text-sm text-white/60">{payOpen.cli.nome} — saldo {brl(payOpen.total)}</p>
          <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} type="text" inputMode="decimal" placeholder="Valor" className="w-full px-4 py-3 rounded-xl bg-input text-lg font-bold" />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setPayAmount((payOpen.total / 2).toFixed(2))} className="py-2 rounded-xl glass text-sm">Metade</button>
            <button onClick={() => setPayAmount(payOpen.total.toFixed(2))} className="py-2 rounded-xl glass text-sm">Total</button>
          </div>
          <div className="flex gap-2">
            <button onClick={pagar} className="flex-1 py-3 rounded-xl gradient-emerald font-bold">Confirmar</button>
            <button onClick={() => setPayOpen(null)} className="px-4 py-3 rounded-xl glass">Cancelar</button>
          </div>
        </Modal>
      )}

      {newOpen && <NewFiadoModal clientes={clientes} onClose={() => setNewOpen(false)} onSaved={() => { setNewOpen(false); load(); }} onClienteCreated={(c) => setClientes((cs) => [...cs, c])} />}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-3xl p-6 w-full max-w-md space-y-4">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50"><X className="h-4 w-4" /></button>
        {children}
      </motion.div>
    </div>
  );
}

function NewFiadoModal({ clientes, onClose, onSaved, onClienteCreated }: { clientes: Cliente[]; onClose: () => void; onSaved: () => void; onClienteCreated: (c: Cliente) => void }) {
  const [cliId, setCliId] = useState("");
  const [desc, setDesc] = useState("");
  const [valor, setValor] = useState("");
  const [novo, setNovo] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTel, setNovoTel] = useState("");

  const criarCliente = async () => {
    if (!novoNome.trim()) return toast.error("Nome obrigatório");
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("clientes").insert({ user_id: user!.id, nome: novoNome.trim(), telefone: novoTel || null }).select().single();
    if (error) return toast.error(error.message);
    onClienteCreated(data); setCliId(data.id); setNovo(false);
  };

  const salvar = async () => {
    const n = parseFloat(valor.replace(",", "."));
    if (!cliId || !desc.trim() || !n) return toast.error("Preencha tudo");
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user!.id;
    const { data: venda, error: e1 } = await supabase.from("vendas").insert({
      user_id: userId, produto: desc.trim(), valor: n, tipo_pagamento: "fiado", cliente_id: cliId, is_fiado: true,
    }).select().single();
    if (e1) return toast.error(e1.message);
    const { error: e2 } = await supabase.from("fiados_registros").insert({
      user_id: userId, cliente_id: cliId, venda_id: venda.id, descricao: desc.trim(), valor_total: n,
    });
    if (e2) return toast.error(e2.message);
    toast.success("Fiado registrado");
    onSaved();
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="text-xl font-bold">Novo Fiado</h3>

      {novo ? (
        <div className="space-y-2">
          <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome do cliente" className="w-full px-3 py-2 rounded-lg bg-input text-sm" />
          <input value={novoTel} onChange={(e) => setNovoTel(e.target.value)} placeholder="Telefone (opcional)" className="w-full px-3 py-2 rounded-lg bg-input text-sm" />
          <div className="flex gap-2">
            <button onClick={criarCliente} className="flex-1 py-2 rounded-lg gradient-primary font-semibold text-sm">Cadastrar</button>
            <button onClick={() => setNovo(false)} className="px-3 py-2 rounded-lg glass text-sm">Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <select value={cliId} onChange={(e) => setCliId(e.target.value)} className="w-full px-3 py-3 rounded-xl bg-input text-sm">
            <option value="">Selecione um cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <button onClick={() => setNovo(true)} className="w-full py-2 rounded-xl glass text-sm text-white/70 hover:text-white flex items-center justify-center gap-1">
            <Plus className="h-3 w-3" /> Novo cliente
          </button>
        </div>
      )}

      <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição (ex: 2x Açaí 500ml)" className="w-full px-4 py-3 rounded-xl bg-input text-sm" />
      <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Valor (R$)" type="text" inputMode="decimal" className="w-full px-4 py-3 rounded-xl bg-input text-sm" />

      <div className="flex gap-2">
        <button onClick={salvar} className="flex-1 py-3 rounded-xl gradient-primary font-semibold">Registrar</button>
        <button onClick={onClose} className="px-4 py-3 rounded-xl glass">Cancelar</button>
      </div>
    </Modal>
  );
}
