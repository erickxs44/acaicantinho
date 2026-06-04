import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "@/lib/format";
import { toast } from "sonner";
import { Plus, X, Search, CreditCard, Banknote, Smartphone, ReceiptText, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pdv")({
  head: () => ({ meta: [{ title: "PDV — Cantinho do Açaí" }] }),
  component: PDV,
});

type Pgto = "pix" | "cartao" | "dinheiro" | "fiado";
type Cliente = { id: string; nome: string; telefone: string | null };
type Venda = { id: string; produto: string; valor: number; tipo_pagamento: string; created_at: string };

function PDV() {
  const [pgto, setPgto] = useState<Pgto>("pix");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [novoCliente, setNovoCliente] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTel, setNovoTel] = useState("");
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [pedidoNome, setPedidoNome] = useState("");
  const [pedidoValor, setPedidoValor] = useState("");

  const [recentSales, setRecentSales] = useState<Venda[]>([]);

  useEffect(() => { 
    loadClientes(); 
    loadRecentSales();
  }, []);

  async function loadClientes() {
    const { data } = await supabase.from("clientes").select("id,nome,telefone").order("nome");
    setClientes(data ?? []);
  }

  async function loadRecentSales() {
    const { data } = await supabase.from("vendas").select("id,produto,valor,tipo_pagamento,created_at").order("created_at", { ascending: false }).limit(10);
    setRecentSales(data ?? []);
  }

  const filtered = busca ? clientes.filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase())) : clientes;

  const criarCliente = async () => {
    if (!novoNome.trim()) return toast.error("Nome obrigatório");
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("clientes").insert({ user_id: user!.id, nome: novoNome.trim(), telefone: novoTel || null }).select().single();
    if (error) return toast.error(error.message);
    setClientes((c) => [...c, data]);
    setClienteSel(data);
    setNovoCliente(false); setNovoNome(""); setNovoTel("");
    toast.success("Cliente cadastrado");
  };

  const finalizar = async () => {
    if (!pedidoNome.trim()) return toast.error("Informe o nome do pedido");
    const valorNum = parseFloat(pedidoValor.replace(",", "."));
    if (!valorNum || valorNum <= 0) return toast.error("Informe um valor válido");
    if (pgto === "fiado" && !clienteSel) return toast.error("Selecione um cliente para o fiado");
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user!.id;
      const isFiado = pgto === "fiado";

      const { data: venda, error: e1 } = await supabase.from("vendas").insert({
        user_id: userId, produto: pedidoNome.trim(), valor: valorNum, tipo_pagamento: pgto,
        cliente_id: clienteSel?.id ?? null, is_fiado: isFiado,
      }).select().single();
      if (e1) throw e1;

      if (isFiado) {
        const { error: e2 } = await supabase.from("fiados_registros").insert({
          user_id: userId, cliente_id: clienteSel!.id, venda_id: venda.id,
          descricao: pedidoNome.trim(), valor_total: valorNum,
        });
        if (e2) throw e2;
      }
      toast.success(`Venda de ${brl(valorNum)} registrada!`);
      
      // Reset form
      setPedidoNome(""); setPedidoValor(""); setClienteSel(null); setPgto("pix");
      setModalOpen(false);
      loadRecentSales();
      window.dispatchEvent(new CustomEvent("data:changed"));
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold mb-1">PDV Simplificado</h1>
          <p className="text-white/60">Registros rápidos de vendas</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setModalOpen(true)}
          className="px-6 py-3 rounded-2xl gradient-primary font-bold text-white flex items-center gap-2 glow hover:brightness-110"
        >
          <Plus className="h-5 w-5" /> Registrar Venda
        </motion.button>
      </header>

      <div className="glass-strong rounded-3xl p-6 min-h-[400px]">
        <h2 className="text-xl font-bold mb-4">Vendas Recentes</h2>
        <div className="space-y-3">
          {recentSales.length === 0 ? (
            <p className="text-center text-white/40 py-12">Nenhuma venda recente.</p>
          ) : (
            recentSales.map((v) => (
              <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-profit/20 text-emerald-brand flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{v.produto}</div>
                  <div className="text-xs text-white/50">{dateBR(v.created_at)} • {v.tipo_pagamento}</div>
                </div>
                <div className="font-extrabold text-emerald-brand text-lg">{brl(v.valor)}</div>
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
              className="glass-strong rounded-3xl p-6 w-full max-w-md space-y-5 relative"
            >
              <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
              
              <h2 className="text-2xl font-bold">Nova Venda</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-white/60 ml-1 uppercase">Pedido / Produto</label>
                  <input value={pedidoNome} onChange={(e) => setPedidoNome(e.target.value)} placeholder="Ex: Combo 1" className="w-full mt-1 px-4 py-3 rounded-xl bg-input border border-glass-border focus:ring-2 focus:ring-ring focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/60 ml-1 uppercase">Valor</label>
                  <input value={pedidoValor} onChange={(e) => setPedidoValor(e.target.value)} placeholder="0.00" type="text" inputMode="decimal" className="w-full mt-1 px-4 py-3 rounded-xl bg-input border border-glass-border focus:ring-2 focus:ring-ring focus:outline-none font-bold text-lg" />
                </div>
              </div>

              <div className="border-t border-glass-border pt-4">
                <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Pagamento</div>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { v: "pix", l: "Pix", i: <Smartphone className="h-4 w-4" /> },
                    { v: "cartao", l: "Cartão", i: <CreditCard className="h-4 w-4" /> },
                    { v: "dinheiro", l: "Dinh.", i: <Banknote className="h-4 w-4" /> },
                    { v: "fiado", l: "Fiado", i: <ReceiptText className="h-4 w-4" /> },
                  ] as const).map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setPgto(o.v)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-semibold transition ${
                        pgto === o.v ? "gradient-primary text-white glow" : "glass text-white/70 hover:text-white"
                      }`}
                    >
                      {o.i} {o.l}
                    </button>
                  ))}
                </div>
              </div>

              {pgto === "fiado" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                  {clienteSel ? (
                    <div className="glass rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-white/50">Cliente</div>
                        <div className="font-semibold">{clienteSel.nome}</div>
                      </div>
                      <button onClick={() => setClienteSel(null)}><X className="h-4 w-4 text-white/60" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                        <input
                          value={busca}
                          onChange={(e) => setBusca(e.target.value)}
                          placeholder="Buscar cliente..."
                          className="w-full pl-9 pr-3 py-3 rounded-xl bg-input border border-glass-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="max-h-32 overflow-auto space-y-1">
                        {filtered.length === 0 ? (
                          <p className="text-xs text-white/40 text-center py-4">Nenhum cliente</p>
                        ) : filtered.map((c) => (
                          <button key={c.id} onClick={() => setClienteSel(c)} className="w-full text-left glass rounded-lg p-2.5 hover:bg-white/10 transition">
                            <div className="text-sm font-semibold">{c.nome}</div>
                            {c.telefone && <div className="text-xs text-white/50">{c.telefone}</div>}
                          </button>
                        ))}
                      </div>
                      {novoCliente ? (
                        <div className="glass rounded-xl p-3 space-y-2">
                          <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome" className="w-full px-3 py-2 rounded-lg bg-input text-sm" />
                          <input value={novoTel} onChange={(e) => setNovoTel(e.target.value)} placeholder="Telefone (opcional)" className="w-full px-3 py-2 rounded-lg bg-input text-sm" />
                          <div className="flex gap-2">
                            <button onClick={criarCliente} className="flex-1 py-2 rounded-lg gradient-primary text-sm font-semibold">Cadastrar</button>
                            <button onClick={() => setNovoCliente(false)} className="px-3 py-2 rounded-lg glass text-sm">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setNovoCliente(true)} className="w-full py-3 rounded-xl glass text-sm flex items-center justify-center gap-1 text-white/70 hover:text-white font-semibold">
                          <Plus className="h-4 w-4" /> Novo cliente
                        </button>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              <button
                onClick={finalizar}
                disabled={saving}
                className="w-full py-4 rounded-xl gradient-primary text-white font-bold text-lg glow hover:brightness-110 active:scale-[0.98] transition disabled:opacity-40"
              >
                {saving ? "Salvando..." : "Confirmar Venda"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

