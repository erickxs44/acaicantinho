import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { Trash2, Plus, X, Search, CreditCard, Banknote, Smartphone, ReceiptText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pdv")({
  head: () => ({ meta: [{ title: "PDV — Cantinho do Açaí" }] }),
  component: PDV,
});

type Produto = { nome: string; preco: number; emoji: string };
const PRODUTOS: Produto[] = [
  { nome: "Açaí 300ml", preco: 12, emoji: "🍇" },
  { nome: "Açaí 500ml", preco: 18, emoji: "🥤" },
  { nome: "Açaí 700ml", preco: 25, emoji: "🍨" },
  { nome: "Combo Casal", preco: 32, emoji: "💜" },
  { nome: "Açaí Família", preco: 45, emoji: "🍱" },
  { nome: "Vitamina", preco: 14, emoji: "🥛" },
  { nome: "Cone Trufado", preco: 10, emoji: "🍦" },
  { nome: "Tigela Fit", preco: 22, emoji: "🥗" },
];
type Pgto = "pix" | "cartao" | "dinheiro" | "fiado";
type Cliente = { id: string; nome: string; telefone: string | null };
type Item = Produto & { qtd: number };

function PDV() {
  const [cart, setCart] = useState<Item[]>([]);
  const [pgto, setPgto] = useState<Pgto>("pix");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [novoCliente, setNovoCliente] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTel, setNovoTel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadClientes(); }, []);
  async function loadClientes() {
    const { data } = await supabase.from("clientes").select("id,nome,telefone").order("nome");
    setClientes(data ?? []);
  }

  const total = useMemo(() => cart.reduce((s, i) => s + i.preco * i.qtd, 0), [cart]);

  const add = (p: Produto) => setCart((c) => {
    const ex = c.find((i) => i.nome === p.nome);
    return ex ? c.map((i) => i.nome === p.nome ? { ...i, qtd: i.qtd + 1 } : i) : [...c, { ...p, qtd: 1 }];
  });
  const dec = (n: string) => setCart((c) => c.flatMap((i) => i.nome === n ? (i.qtd > 1 ? [{ ...i, qtd: i.qtd - 1 }] : []) : [i]));
  const rm = (n: string) => setCart((c) => c.filter((i) => i.nome !== n));

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
    if (cart.length === 0) return toast.error("Carrinho vazio");
    if (pgto === "fiado" && !clienteSel) return toast.error("Selecione um cliente para o fiado");
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user!.id;
      const produto = cart.map((i) => `${i.qtd}x ${i.nome}`).join(", ");
      const isFiado = pgto === "fiado";

      const { data: venda, error: e1 } = await supabase.from("vendas").insert({
        user_id: userId, produto, valor: total, tipo_pagamento: pgto,
        cliente_id: clienteSel?.id ?? null, is_fiado: isFiado,
      }).select().single();
      if (e1) throw e1;

      if (isFiado) {
        const { error: e2 } = await supabase.from("fiados_registros").insert({
          user_id: userId, cliente_id: clienteSel!.id, venda_id: venda.id,
          descricao: produto, valor_total: total,
        });
        if (e2) throw e2;
      }
      toast.success(`Venda de ${brl(total)} registrada!`);
      setCart([]); setClienteSel(null); setPgto("pix");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-6 max-w-7xl mx-auto">
      <section>
        <h1 className="text-3xl font-extrabold mb-1">PDV</h1>
        <p className="text-white/60 mb-6">Selecione os produtos</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PRODUTOS.map((p, i) => (
            <motion.button
              key={p.nome}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -3, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => add(p)}
              className="glass-strong rounded-2xl p-4 text-left hover:glow transition"
            >
              <div className="text-3xl mb-2">{p.emoji}</div>
              <div className="font-semibold leading-tight">{p.nome}</div>
              <div className="mt-2 text-emerald-brand font-bold">{brl(p.preco)}</div>
            </motion.button>
          ))}
        </div>
      </section>

      <aside className="glass-strong rounded-3xl p-5 h-fit lg:sticky lg:top-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Carrinho</h2>
          {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-white/50 hover:text-destructive">Limpar</button>}
        </div>

        <div className="space-y-2 max-h-72 overflow-auto pr-1">
          <AnimatePresence>
            {cart.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-8">Nenhum item</p>
            ) : cart.map((i) => (
              <motion.div
                key={i.nome}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass rounded-xl p-3 flex items-center gap-2"
              >
                <span className="text-xl">{i.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{i.nome}</div>
                  <div className="text-xs text-emerald-brand">{brl(i.preco * i.qtd)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => dec(i.nome)} className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20">−</button>
                  <span className="w-6 text-center text-sm font-bold">{i.qtd}</span>
                  <button onClick={() => add(i)} className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20">+</button>
                  <button onClick={() => rm(i.nome)} className="ml-1 text-white/40 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="border-t border-glass-border pt-4">
          <div className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Pagamento</div>
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
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition ${
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
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-input border border-glass-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="max-h-40 overflow-auto space-y-1">
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
                  <button onClick={() => setNovoCliente(true)} className="w-full py-2 rounded-xl glass text-sm flex items-center justify-center gap-1 text-white/70 hover:text-white">
                    <Plus className="h-3 w-3" /> Novo cliente
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}

        <div className="border-t border-glass-border pt-4 flex items-center justify-between">
          <span className="text-sm text-white/60">Total</span>
          <span className="text-3xl font-extrabold text-gradient">{brl(total)}</span>
        </div>

        <button
          onClick={finalizar}
          disabled={saving || cart.length === 0}
          className="w-full py-4 rounded-xl gradient-primary text-white font-bold text-lg glow hover:brightness-110 active:scale-[0.98] transition disabled:opacity-40"
        >
          {saving ? "Salvando..." : "Finalizar Venda"}
        </button>
      </aside>
    </div>
  );
}
