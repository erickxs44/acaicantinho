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
  
  // Pagamento Dividido
  const [valorPagoAVista, setValorPagoAVista] = useState("");
  const [metodoPagoAVista, setMetodoPagoAVista] = useState<"pix" | "cartao" | "dinheiro">("pix");

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
    
    let aVistaNum = 0;
    if (pgto === "fiado" && valorPagoAVista) {
      aVistaNum = parseFloat(valorPagoAVista.replace(",", "."));
      if (aVistaNum > valorNum) return toast.error("Valor pago não pode ser maior que o valor total");
    }
    
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
        const { data: fiado, error: e2 } = await supabase.from("fiados_registros").insert({
          user_id: userId, cliente_id: clienteSel!.id, venda_id: venda.id,
          descricao: pedidoNome.trim(), valor_total: valorNum, 
          valor_pago: aVistaNum, status: aVistaNum >= valorNum ? "pago" : "aberto"
        }).select().single();
        if (e2) throw e2;

        if (aVistaNum > 0) {
          const { error: e3 } = await supabase.from("fiados_pagamentos").insert({
            user_id: userId, fiado_id: fiado.id, valor: aVistaNum
          });
          if (e3) throw e3;
        }
      }
      toast.success(`Venda de ${brl(valorNum)} registrada!`);
      
      // Reset form
      setPedidoNome(""); setPedidoValor(""); setClienteSel(null); setPgto("pix");
      setValorPagoAVista(""); setMetodoPagoAVista("pix");
      setModalOpen(false);
      loadRecentSales();
      window.dispatchEvent(new CustomEvent("data:changed"));
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const valorNumTemp = parseFloat(pedidoValor.replace(",", ".")) || 0;
  const aVistaNumTemp = parseFloat(valorPagoAVista.replace(",", ".")) || 0;
  const restanteFiado = valorNumTemp - aVistaNumTemp;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, letterSpacing: "-0.5px", color: "white", margin: 0 }}>PDV</h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--white-70)", marginTop: 2 }}>Ponto de venda</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setModalOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg, #5a2d9c, #7c3aed)",
            color: "white", border: "none",
            borderRadius: 12, padding: "12px 20px",
            fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
          }}
        >
          <Plus className="h-5 w-5" /> Registrar Venda
        </motion.button>
      </div>

      <div className="panel" style={{ minHeight: 400 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "white", marginBottom: 16 }}>Vendas Recentes</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recentSales.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--white-70)", padding: "48px 0", fontFamily: "var(--font-sans)" }}>Nenhuma venda recente.</p>
          ) : (
            recentSales.map((v) => (
              <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: "var(--white-5)", border: "1px solid rgba(34,211,165,0.1)",
                  borderRadius: 14, padding: "14px 16px",
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: "rgba(34,211,165,0.15)", color: "#22d3a5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 14, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.produto}</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--white-70)" }}>{dateBR(v.created_at)} · {v.tipo_pagamento}</div>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#22d3a5", flexShrink: 0 }}>{brl(v.valor)}</div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--purple-800)", border: "1px solid var(--white-10)",
                borderRadius: 24, padding: 28, width: "100%", maxWidth: 440,
                position: "relative", maxHeight: "90vh", overflowY: "auto",
                display: "flex", flexDirection: "column", gap: 18,
              }}
            >
              <button onClick={() => setModalOpen(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--white-70)", cursor: "pointer" }}><X className="h-5 w-5" /></button>
              
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "white", margin: 0 }}>Nova Venda</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--white-70)", display: "block", marginBottom: 6 }}>Pedido / Produto</label>
                  <input value={pedidoNome} onChange={(e) => setPedidoNome(e.target.value)} placeholder="Ex: Combo 1" className="input-base" />
                </div>
                <div>
                  <label style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--white-70)", display: "block", marginBottom: 6 }}>Valor Total</label>
                  <input value={pedidoValor} onChange={(e) => setPedidoValor(e.target.value)} placeholder="0.00" type="text" inputMode="decimal" className="input-base" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20 }} />
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--white-10)", paddingTop: 16 }}>
                <div style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--white-70)", marginBottom: 10 }}>Pagamento</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {([
                    { v: "pix", l: "Pix", i: <Smartphone className="h-4 w-4" /> },
                    { v: "cartao", l: "Cartão", i: <CreditCard className="h-4 w-4" /> },
                    { v: "dinheiro", l: "Dinh.", i: <Banknote className="h-4 w-4" /> },
                    { v: "fiado", l: "Fiado", i: <ReceiptText className="h-4 w-4" /> },
                  ] as const).map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setPgto(o.v)}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                        padding: "12px 4px", borderRadius: 12,
                        fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
                        cursor: "pointer", transition: "all 0.2s",
                        background: pgto === o.v ? "linear-gradient(135deg, #5a2d9c, #7c3aed)" : "var(--white-5)",
                        color: pgto === o.v ? "white" : "var(--white-70)",
                        border: pgto === o.v ? "1px solid rgba(124,58,237,0.4)" : "1px solid var(--white-10)",
                        boxShadow: pgto === o.v ? "0 2px 8px rgba(124,58,237,0.4)" : "none",
                      }}
                    >
                      {o.i} {o.l}
                    </button>
                  ))}
                </div>
              </div>

              {pgto === "fiado" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4">
                  {/* Pagamento Dividido */}
                  <div className="glass rounded-xl p-4 space-y-3">
                    <div className="text-xs font-semibold text-foreground uppercase tracking-wider">Pagamento Dividido (Opcional)</div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-foreground/60 ml-1">Valor pago agora</label>
                        <input value={valorPagoAVista} onChange={(e) => setValorPagoAVista(e.target.value)} placeholder="0.00" type="text" inputMode="decimal" className="w-full mt-1 px-3 py-2 rounded-lg bg-input border border-glass-border focus:ring-2 focus:ring-ring text-sm text-foreground" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-foreground/60 ml-1">Método</label>
                        <select value={metodoPagoAVista} onChange={(e) => setMetodoPagoAVista(e.target.value as any)} className="w-full mt-1 px-3 py-2 rounded-lg bg-input border border-glass-border focus:ring-2 focus:ring-ring text-sm text-foreground appearance-none">
                          <option value="pix">Pix</option>
                          <option value="dinheiro">Dinheiro</option>
                          <option value="cartao">Cartão</option>
                        </select>
                      </div>
                    </div>
                    {aVistaNumTemp > 0 && restanteFiado > 0 && (
                      <div className="text-xs text-foreground/70 bg-black/10 p-2 rounded-lg text-center">
                        Restante fiado: <strong className="text-fiado-foreground">{brl(restanteFiado)}</strong>
                      </div>
                    )}
                  </div>

                  {clienteSel ? (
                    <div className="glass rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-foreground/50">Cliente</div>
                        <div className="font-semibold text-foreground">{clienteSel.nome}</div>
                      </div>
                      <button onClick={() => setClienteSel(null)}><X className="h-4 w-4 text-foreground/60" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                        <input
                          value={busca}
                          onChange={(e) => setBusca(e.target.value)}
                          placeholder="Buscar cliente..."
                          className="w-full pl-9 pr-3 py-3 rounded-xl bg-input border border-glass-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="max-h-32 overflow-auto space-y-1">
                        {filtered.length === 0 ? (
                          <p className="text-xs text-foreground/40 text-center py-4">Nenhum cliente</p>
                        ) : filtered.map((c) => (
                          <button key={c.id} onClick={() => setClienteSel(c)} className="w-full text-left glass rounded-lg p-2.5 hover:bg-black/5 transition">
                            <div className="text-sm font-semibold text-foreground">{c.nome}</div>
                            {c.telefone && <div className="text-xs text-foreground/50">{c.telefone}</div>}
                          </button>
                        ))}
                      </div>
                      {novoCliente ? (
                        <div className="glass rounded-xl p-3 space-y-2">
                          <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome" className="w-full px-3 py-2 rounded-lg bg-input text-sm text-foreground" />
                          <input value={novoTel} onChange={(e) => setNovoTel(e.target.value)} placeholder="Telefone (opcional)" className="w-full px-3 py-2 rounded-lg bg-input text-sm text-foreground" />
                          <div className="flex gap-2">
                            <button onClick={criarCliente} className="flex-1 py-2 rounded-lg gradient-primary text-white text-sm font-semibold">Cadastrar</button>
                            <button onClick={() => setNovoCliente(false)} className="px-3 py-2 rounded-lg glass text-foreground text-sm">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setNovoCliente(true)} className="w-full py-3 rounded-xl glass text-sm flex items-center justify-center gap-1 text-foreground/70 hover:text-foreground font-semibold">
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
                className="btn-primary"
                style={{ width: "100%", padding: "14px 0", fontSize: 15, borderRadius: 12, opacity: saving ? 0.5 : 1 }}
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
