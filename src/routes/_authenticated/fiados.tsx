import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "@/lib/format";
import { toast } from "sonner";
import { CheckCircle2, FileText, Plus, X, ShoppingBag, Wallet, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/fiados")({
  head: () => ({ meta: [{ title: "Fiados — Cantinho do Açaí" }] }),
  component: Fiados,
});

type Cliente = { id: string; nome: string; telefone: string | null };
type Fiado = { id: string; cliente_id: string; descricao: string; valor_total: number; valor_pago: number; status: string; created_at: string };
type Pagamento = { id: string; fiado_id: string; valor: number; created_at: string };

type Evento = {
  id: string;
  tipo: "compra" | "pagamento";
  descricao: string;
  valor: number;
  created_at: string;
};

function Fiados() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [fiados, setFiados] = useState<Fiado[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  
  const [reportOpen, setReportOpen] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState<{ cli: Cliente; total: number } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  
  const [newClientOpen, setNewClientOpen] = useState(false);

  const load = useCallback(async () => {
    const [c, f, p] = await Promise.all([
      supabase.from("clientes").select("id,nome,telefone").order("nome"),
      supabase.from("fiados_registros").select("*").order("created_at", { ascending: false }),
      supabase.from("fiados_pagamentos").select("id,fiado_id,valor,created_at").order("created_at", { ascending: false }),
    ]);
    setClientes(c.data ?? []);
    setFiados(f.data ?? []);
    setPagamentos(p.data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, { cli: Cliente; itens: Fiado[]; pagos: Pagamento[]; emAberto: number; totalComprado: number; totalPago: number }>();
    for (const cli of clientes) {
      map.set(cli.id, { cli, itens: [], pagos: [], emAberto: 0, totalComprado: 0, totalPago: 0 });
    }
    for (const f of fiados) {
      const e = map.get(f.cliente_id);
      if (!e) continue;
      e.itens.push(f);
      e.totalComprado += Number(f.valor_total);
      e.totalPago += Number(f.valor_pago);
      if (f.status === "aberto") e.emAberto += Number(f.valor_total) - Number(f.valor_pago);
    }
    for (const p of pagamentos) {
      const f = fiados.find((x) => x.id === p.fiado_id);
      if (!f) continue;
      const e = map.get(f.cliente_id);
      if (!e) continue;
      e.pagos.push(p);
    }
    return [...map.values()].sort((a, b) => b.emAberto - a.emAberto);
  }, [fiados, clientes, pagamentos]);

  const totalGeral = grouped.reduce((s, g) => s + g.emAberto, 0);

  const eventos = (g: typeof grouped[number]): Evento[] => {
    const evs: Evento[] = [
      ...g.itens.map((f) => ({
        id: "c-" + f.id, tipo: "compra" as const,
        descricao: f.descricao, valor: Number(f.valor_total),
        created_at: f.created_at,
      })),
      ...g.pagos.map((p) => ({
        id: "p-" + p.id, tipo: "pagamento" as const,
        descricao: "Pagamento recebido", valor: Number(p.valor),
        created_at: p.created_at,
      })),
    ];
    return evs.sort((a, b) => b.created_at.localeCompare(a.created_at));
  };

  const pagar = async () => {
    if (!payOpen) return;
    const n = parseFloat(payAmount.replace(",", "."));
    if (!n || n <= 0) return toast.error("Valor inválido");
    if (n > payOpen.total + 0.001) return toast.error("Valor maior que o saldo");

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user!.id;
    let restante = n;
    const itens = [...fiados.filter((f) => f.cliente_id === payOpen.cli.id && f.status === "aberto")]
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    for (const f of itens) {
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
    setPayOpen(null); setPayAmount(""); 
    if (reportOpen) { setReportOpen(null); } // close report if open to refresh cleanly
    load();
    window.dispatchEvent(new CustomEvent("data:changed"));
  };

  const excluirCliente = async (clienteId: string, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cliente "${nome}"? Todo o histórico dele será apagado definitivamente.`)) {
      return;
    }
    try {
      const { error } = await supabase.from("clientes").delete().eq("id", clienteId);
      if (error) throw error;
      toast.success("Cliente excluído com sucesso");
      load();
    } catch (e: any) {
      toast.error("Erro ao excluir: " + e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">CRM & Fiados</h1>
          <p className="text-white/60">Gestão de clientes e saldos</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setNewClientOpen(true)}
          className="px-5 py-3 rounded-2xl gradient-primary font-bold text-sm text-white flex items-center gap-2 glow"
        >
          <Plus className="h-4 w-4" /> Novo Cliente
        </motion.button>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-fiado text-fiado-foreground rounded-2xl p-5 shadow-xl"
      >
        <div className="text-xs font-bold uppercase opacity-80">Saldo total em aberto</div>
        <div className="text-4xl font-extrabold mt-1">{brl(totalGeral)}</div>
        <div className="text-sm mt-1 opacity-80">
          {grouped.filter((g) => g.emAberto > 0).length} devedor(es) · {grouped.length} cliente(s) cadastrados
        </div>
      </motion.div>

      <div className="space-y-3">
        {grouped.length === 0 ? (
          <div className="glass-strong rounded-3xl p-12 text-center text-white/50">
            Nenhum cliente cadastrado ainda 🎉
          </div>
        ) : grouped.map((g, i) => (
          <motion.div
            key={g.cli.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="glass-strong rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center gap-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <div className="h-11 w-11 rounded-xl gradient-primary glow flex items-center justify-center font-bold text-lg">
                {g.cli.nome[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate text-lg">{g.cli.nome}</div>
                {g.cli.telefone && <div className="text-xs text-white/50">{g.cli.telefone}</div>}
              </div>
            </div>

            <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-glass-border pt-4 md:pt-0">
              <div className="text-left md:text-right">
                <div className="text-[10px] text-white/40 uppercase font-bold mb-1">Situação</div>
                <div className={`font-extrabold text-lg leading-none ${g.emAberto > 0 ? "text-fiado" : "text-emerald-brand"}`}>
                  {g.emAberto > 0 ? brl(g.emAberto) : "Quitado"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReportOpen(g.cli.id)}
                  className="px-4 py-2 rounded-xl glass hover:bg-white/10 text-sm font-semibold flex items-center gap-2 transition"
                >
                  <FileText className="h-4 w-4" /> Relatório
                </button>
                <button
                  onClick={() => excluirCliente(g.cli.id, g.cli.nome)}
                  className="p-2 rounded-xl text-white/40 hover:text-destructive hover:bg-destructive/10 transition"
                  title="Excluir cliente"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {reportOpen && (
          <Modal onClose={() => setReportOpen(null)}>
            {(() => {
              const g = grouped.find((x) => x.cli.id === reportOpen);
              if (!g) return null;
              return (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold">{g.cli.nome}</h3>
                    <p className="text-white/50 text-sm">Relatório Completo</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="glass rounded-xl p-3 text-center">
                      <div className="text-[10px] uppercase text-white/50 font-bold">Comprou</div>
                      <div className="font-bold text-base mt-1">{brl(g.totalComprado)}</div>
                    </div>
                    <div className="glass rounded-xl p-3 text-center">
                      <div className="text-[10px] uppercase text-white/50 font-bold">Pagou</div>
                      <div className="font-bold text-base mt-1 text-emerald-brand">{brl(g.totalPago)}</div>
                    </div>
                    <div className="glass rounded-xl p-3 text-center">
                      <div className="text-[10px] uppercase text-white/50 font-bold">Deve</div>
                      <div className="font-bold text-base mt-1 text-fiado">{brl(g.emAberto)}</div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-auto pr-1">
                    <div className="text-[10px] uppercase font-bold text-white/40 pt-2 sticky top-0 bg-[#0d0912]/90 backdrop-blur pb-1 z-10">Histórico de Eventos</div>
                    {eventos(g).length === 0 ? (
                      <p className="text-xs text-white/40 text-center py-4">Nenhum evento registrado.</p>
                    ) : eventos(g).map((ev, idx) => (
                      <div key={ev.id} className="glass rounded-xl p-3 flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                          ev.tipo === "pagamento" ? "bg-profit/20 text-emerald-brand" : "bg-fiado/20 text-fiado"
                        }`}>
                          {ev.tipo === "pagamento" ? <Wallet className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{ev.descricao}</div>
                          <div className="text-xs text-white/50">{dateBR(ev.created_at)}</div>
                        </div>
                        <div className={`font-bold text-base ${ev.tipo === "pagamento" ? "text-emerald-brand" : "text-fiado"}`}>
                          {ev.tipo === "pagamento" ? "−" : "+"}{brl(ev.valor)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {g.emAberto > 0 && (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setPayOpen({ cli: g.cli, total: g.emAberto }); setPayAmount(g.emAberto.toFixed(2)); }}
                      className="w-full py-4 mt-2 rounded-xl gradient-emerald text-white font-bold flex items-center justify-center gap-2 hover:brightness-110 transition glow"
                    >
                      <CheckCircle2 className="h-5 w-5" /> Dar Baixa (Pagar)
                    </motion.button>
                  )}
                </div>
              );
            })()}
          </Modal>
        )}

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
              <button onClick={pagar} className="flex-1 py-3 rounded-xl gradient-emerald font-bold text-white">Confirmar Pagamento</button>
              <button onClick={() => setPayOpen(null)} className="px-4 py-3 rounded-xl glass">Cancelar</button>
            </div>
          </Modal>
        )}

        {newClientOpen && (
          <NewClientModal
            onClose={() => setNewClientOpen(false)}
            onSaved={() => { setNewClientOpen(false); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-3xl p-6 w-full max-w-md space-y-4 relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
        {children}
      </motion.div>
    </motion.div>
  );
}

function NewClientModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [novoNome, setNovoNome] = useState("");
  const [novoTel, setNovoTel] = useState("");
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    if (!novoNome.trim()) return toast.error("Nome obrigatório");
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("clientes").insert({ user_id: user!.id, nome: novoNome.trim(), telefone: novoTel || null });
      if (error) throw error;
      toast.success("Cliente cadastrado");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="text-xl font-bold">Novo Cliente</h3>
      <div className="space-y-3 pt-2">
        <div>
          <label className="text-xs font-semibold text-white/60 ml-1 uppercase">Nome Completo</label>
          <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: João da Silva" className="w-full mt-1 px-4 py-3 rounded-xl bg-input text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-white/60 ml-1 uppercase">Telefone (Opcional)</label>
          <input value={novoTel} onChange={(e) => setNovoTel(e.target.value)} placeholder="(00) 00000-0000" className="w-full mt-1 px-4 py-3 rounded-xl bg-input text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={salvar} disabled={saving} className="flex-1 py-3 rounded-xl gradient-primary font-bold text-white glow">
          {saving ? "Salvando..." : "Cadastrar Cliente"}
        </button>
      </div>
    </Modal>
  );
}

