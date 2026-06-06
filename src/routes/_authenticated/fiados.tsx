import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
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

// Formatação local para Data e Hora Exata
function dateTimeBR(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function Fiados() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [fiados, setFiados] = useState<Fiado[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  
  const [reportOpen, setReportOpen] = useState<string | null>(null);
  
  // Pagar (Baixa Parcial ou Total)
  const [payOpen, setPayOpen] = useState<{ cli: Cliente; total: number } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  
  // Nova Dívida Direta
  const [newDebtOpen, setNewDebtOpen] = useState<{ cli: Cliente } | null>(null);
  const [debtDesc, setDebtDesc] = useState("");
  const [debtValor, setDebtValor] = useState("");
  const [savingDebt, setSavingDebt] = useState(false);

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
    
    // Filtrar clientes "excluídos" por Soft Delete
    const activeClients = clientes.filter(c => !c.nome.startsWith("[EXCLUÍDO]"));

    for (const cli of activeClients) {
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
    if (n > payOpen.total + 0.001) return toast.error("Valor inserido é maior que o saldo devedor");

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user!.id;
    let restante = n;
    
    // Distribui o pagamento entre os registros abertos (dos mais antigos para os mais novos)
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
    toast.success(`Pagamento de ${brl(n)} registrado com sucesso!`);
    setPayOpen(null); setPayAmount(""); 
    if (reportOpen) { setReportOpen(null); }
    load();
    window.dispatchEvent(new CustomEvent("data:changed"));
  };

  const criarDivida = async () => {
    if (!newDebtOpen) return;
    const { cli } = newDebtOpen;
    if (!debtDesc.trim()) return toast.error("Preencha a descrição da dívida");
    const v = parseFloat(debtValor.replace(",", "."));
    if (!v || v <= 0) return toast.error("Informe um valor válido para a dívida");

    setSavingDebt(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user!.id;

      const { data: venda, error: e1 } = await supabase.from("vendas").insert({
        user_id: userId, produto: debtDesc.trim(), valor: v, tipo_pagamento: "fiado",
        cliente_id: cli.id, is_fiado: true,
      }).select().single();
      if (e1) throw e1;

      const { error: e2 } = await supabase.from("fiados_registros").insert({
        user_id: userId, cliente_id: cli.id, venda_id: venda.id,
        descricao: debtDesc.trim(), valor_total: v, status: "aberto"
      });
      if (e2) throw e2;

      toast.success(`Dívida de ${brl(v)} adicionada para ${cli.nome}!`);
      setNewDebtOpen(null); setDebtDesc(""); setDebtValor("");
      load();
      window.dispatchEvent(new CustomEvent("data:changed"));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingDebt(false);
    }
  };

  const excluirCliente = async (clienteId: string, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cliente "${nome}"? O registro desaparecerá, mas o histórico financeiro será mantido nas Movimentações.`)) {
      return;
    }
    try {
      // Soft Delete: renomeia o cliente e oculta-o. Cancela as dívidas em aberto para não sujar o dashboard.
      await supabase.from("fiados_registros").update({ status: "cancelado" }).eq("cliente_id", clienteId).eq("status", "aberto");
      const { error } = await supabase.from("clientes").update({ nome: `[EXCLUÍDO] ${nome}` }).eq("id", clienteId);
      
      if (error) throw error;
      
      toast.success("Cliente excluído com sucesso");
      load();
      window.dispatchEvent(new CustomEvent("data:changed"));
    } catch (e: any) {
      toast.error("Erro ao excluir: " + e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">CRM & Fiados</h1>
          <p className="text-foreground/60">Gestão de clientes e dívidas</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setNewClientOpen(true)}
          className="px-5 py-3 rounded-2xl gradient-primary font-bold text-sm text-white flex items-center gap-2 glow hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> Registrar cliente
        </motion.button>
      </header>

      <div className="space-y-3">
        {grouped.length === 0 ? (
          <div className="glass-strong rounded-3xl p-12 text-center text-foreground/50">
            Nenhum cliente cadastrado ainda 🎉
          </div>
        ) : grouped.map((g, i) => (
          <motion.div
            key={g.cli.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="glass-strong rounded-2xl p-4 flex flex-col items-start hover:bg-white/5 transition-colors gap-4"
          >
            {/* Header do Card */}
            <div className="flex w-full justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl gradient-primary glow flex items-center justify-center font-bold text-lg text-white">
                  {g.cli.nome[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-bold truncate text-lg text-foreground">{g.cli.nome}</div>
                  {g.cli.telefone && <div className="text-xs text-foreground/50">{g.cli.telefone}</div>}
                </div>
              </div>
              <button
                onClick={() => excluirCliente(g.cli.id, g.cli.nome)}
                className="p-2 rounded-xl text-foreground/40 hover:text-destructive hover:bg-destructive/10 transition"
                title="Excluir cliente"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>

            {/* Status e Ações do Card */}
            <div className="flex w-full flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t border-glass-border pt-4">
              <div>
                <div className="text-[10px] text-foreground/40 uppercase font-bold mb-1">Saldo Devedor Atual</div>
                <div className={`font-extrabold text-2xl leading-none ${g.emAberto > 0 ? "text-fiado-foreground" : "text-emerald-brand"}`}>
                  {g.emAberto > 0 ? brl(g.emAberto) : "Quitado"}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => setReportOpen(g.cli.id)}
                  className="px-4 py-2.5 rounded-xl glass hover:bg-black/5 text-foreground text-sm font-semibold flex items-center gap-2 transition flex-1 md:flex-auto justify-center"
                >
                  <FileText className="h-4 w-4" /> Relatório
                </button>
                <button
                  onClick={() => setNewDebtOpen({ cli: g.cli })}
                  className="px-4 py-2.5 rounded-xl border border-fiado/20 text-fiado-foreground hover:bg-fiado/10 text-sm font-bold flex items-center gap-2 transition flex-1 md:flex-auto justify-center"
                >
                  <Plus className="h-4 w-4" /> Dívida
                </button>
                {g.emAberto > 0 && (
                  <button
                    onClick={() => { setPayOpen({ cli: g.cli, total: g.emAberto }); setPayAmount(g.emAberto.toFixed(2)); }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-brand/10 text-emerald-brand hover:bg-emerald-brand/20 text-sm font-bold flex items-center gap-2 transition flex-1 md:flex-auto justify-center"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Pagar
                  </button>
                )}
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
                    <h3 className="text-2xl font-bold text-foreground">{g.cli.nome}</h3>
                    <p className="text-foreground/50 text-sm">Relatório Completo de Transações</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="glass rounded-xl p-3 text-center">
                      <div className="text-[10px] uppercase text-foreground/50 font-bold">Comprou</div>
                      <div className="font-bold text-base mt-1 text-foreground">{brl(g.totalComprado)}</div>
                    </div>
                    <div className="glass rounded-xl p-3 text-center">
                      <div className="text-[10px] uppercase text-foreground/50 font-bold">Pagou</div>
                      <div className="font-bold text-base mt-1 text-emerald-brand">{brl(g.totalPago)}</div>
                    </div>
                    <div className="glass rounded-xl p-3 text-center">
                      <div className="text-[10px] uppercase text-foreground/50 font-bold">Deve</div>
                      <div className="font-bold text-base mt-1 text-fiado-foreground">{brl(g.emAberto)}</div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-auto pr-1">
                    <div className="text-[10px] uppercase font-bold text-foreground/40 pt-2 sticky top-0 bg-background/90 backdrop-blur pb-1 z-10">Histórico (Data e Hora)</div>
                    {eventos(g).length === 0 ? (
                      <p className="text-xs text-foreground/40 text-center py-4">Nenhum evento registrado.</p>
                    ) : eventos(g).map((ev) => (
                      <div key={ev.id} className="glass rounded-xl p-3 flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                          ev.tipo === "pagamento" ? "bg-emerald-brand/10 text-emerald-brand" : "bg-fiado/10 text-fiado-foreground"
                        }`}>
                          {ev.tipo === "pagamento" ? <Wallet className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate text-foreground">{ev.descricao}</div>
                          <div className="text-[10px] text-foreground/50 font-mono tracking-tighter mt-0.5">{dateTimeBR(ev.created_at)}</div>
                        </div>
                        <div className={`font-bold text-base ${ev.tipo === "pagamento" ? "text-emerald-brand" : "text-fiado-foreground"}`}>
                          {ev.tipo === "pagamento" ? "−" : "+"}{brl(ev.valor)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </Modal>
        )}

        {/* Modal: Receber Pagamento */}
        {payOpen && (
          <Modal onClose={() => setPayOpen(null)}>
            <h3 className="text-xl font-bold text-foreground">Receber Pagamento</h3>
            <p className="text-sm text-foreground/60">{payOpen.cli.nome}</p>
            <div className="bg-black/10 p-3 rounded-lg flex justify-between items-center mt-2 border border-glass-border">
              <span className="text-sm font-bold text-foreground/70">Saldo Devedor</span>
              <span className="text-lg font-extrabold text-fiado-foreground">{brl(payOpen.total)}</span>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-foreground/60 ml-1 uppercase">Valor Recebido (R$)</label>
              <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} type="text" inputMode="decimal" placeholder="0.00" className="w-full mt-1 px-4 py-3 rounded-xl bg-input text-lg font-bold text-foreground focus:ring-2 focus:ring-emerald-brand focus:outline-none" />
            </div>

            {/* Preview do novo saldo */}
            {parseFloat(payAmount.replace(",", ".")) > 0 && parseFloat(payAmount.replace(",", ".")) <= payOpen.total && (
              <div className="text-center text-sm font-medium mt-2">
                Total a pagar: <strong className="text-emerald-brand text-lg">{brl(payOpen.total - parseFloat(payAmount.replace(",", ".")))}</strong>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={pagar} className="flex-1 py-3 rounded-xl gradient-emerald font-bold text-white glow">Pagar agora</button>
              <button onClick={() => setPayOpen(null)} className="px-4 py-3 rounded-xl glass text-foreground font-medium">Cancelar</button>
            </div>
          </Modal>
        )}

        {/* Modal: Adicionar Dívida Direta */}
        {newDebtOpen && (
          <Modal onClose={() => setNewDebtOpen(null)}>
            <h3 className="text-xl font-bold text-foreground">Adicionar Dívida</h3>
            <p className="text-sm text-foreground/60">{newDebtOpen.cli.nome}</p>
            
            <div className="space-y-3 pt-4">
              <div>
                <label className="text-xs font-semibold text-foreground/60 ml-1 uppercase">Descrição da Dívida</label>
                <input value={debtDesc} onChange={(e) => setDebtDesc(e.target.value)} placeholder="Ex: Adicional, Pedido pelo WhatsApp..." className="w-full mt-1 px-4 py-3 rounded-xl bg-input text-sm text-foreground focus:ring-2 focus:ring-fiado-foreground focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground/60 ml-1 uppercase">Valor da Dívida</label>
                <input value={debtValor} onChange={(e) => setDebtValor(e.target.value)} placeholder="0.00" type="text" inputMode="decimal" className="w-full mt-1 px-4 py-3 rounded-xl bg-input font-bold text-lg text-foreground focus:ring-2 focus:ring-fiado-foreground focus:outline-none" />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button onClick={criarDivida} disabled={savingDebt} className="flex-1 py-3 rounded-xl bg-fiado text-fiado-foreground hover:brightness-110 font-bold glow shadow-lg disabled:opacity-50">
                {savingDebt ? "Salvando..." : "Registrar Dívida"}
              </button>
              <button onClick={() => setNewDebtOpen(null)} className="px-4 py-3 rounded-xl glass text-foreground font-medium">Cancelar</button>
            </div>
          </Modal>
        )}

        {/* Modal: Novo Cliente */}
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
        <button onClick={onClose} className="absolute top-4 right-4 text-foreground/50 hover:text-foreground"><X className="h-5 w-5" /></button>
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
      <h3 className="text-xl font-bold text-foreground">Novo Cliente</h3>
      <div className="space-y-3 pt-2">
        <div>
          <label className="text-xs font-semibold text-foreground/60 ml-1 uppercase">Nome Completo</label>
          <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: João da Silva" className="w-full mt-1 px-4 py-3 rounded-xl bg-input text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground/60 ml-1 uppercase">Telefone (Opcional)</label>
          <input value={novoTel} onChange={(e) => setNovoTel(e.target.value)} placeholder="(00) 00000-0000" className="w-full mt-1 px-4 py-3 rounded-xl bg-input text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
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
