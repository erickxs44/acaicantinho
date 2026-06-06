import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, Wallet, ReceiptText, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl, dayKey, dayLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Cantinho do Açaí" }] }),
  component: Dashboard,
});

type Stats = { vendas: number; despesas: number; lucro: number; fiados: number; chart: { day: string; valor: number }[] };

function Dashboard() {
  const [stats, setStats] = useState<Stats>({ vendas: 0, despesas: 0, lucro: 0, fiados: 0, chart: [] });
  const [loading, setLoading] = useState(true);

  // Data default: últimos 7 dias até hoje
  const dataPadraoFim = new Date();
  const dataPadraoInicio = new Date();
  dataPadraoInicio.setDate(dataPadraoInicio.getDate() - 6);

  const [dateFrom, setDateFrom] = useState(dataPadraoInicio.toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(dataPadraoFim.toISOString().slice(0, 10));

  const setRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    if (days > 0) start.setDate(start.getDate() - days);
    else if (days === 0) {
      // Hoje
    }
    setDateFrom(start.toISOString().slice(0, 10));
    setDateTo(end.toISOString().slice(0, 10));
  }
  
  const setMesPassado = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    setDateFrom(start.toISOString().slice(0, 10));
    setDateTo(end.toISOString().slice(0, 10));
  }

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("data:changed", handler);
    return () => window.removeEventListener("data:changed", handler);
  }, [dateFrom, dateTo]);

  async function load() {
    setLoading(true);

    const fromDate = new Date(dateFrom + "T00:00:00");
    const toDate = new Date(dateTo + "T23:59:59"); // Fim do dia

    const [vendasRes, despesasRes, fiadosRes, pagamentosRes] = await Promise.all([
      supabase.from("vendas").select("valor,is_fiado,created_at").gte("created_at", fromDate.toISOString()).lte("created_at", toDate.toISOString()),
      supabase.from("despesas").select("valor,created_at").gte("created_at", fromDate.toISOString()).lte("created_at", toDate.toISOString()),
      supabase.from("fiados_registros").select("valor_total,valor_pago,status,created_at").gte("created_at", fromDate.toISOString()).lte("created_at", toDate.toISOString()),
      supabase.from("fiados_pagamentos").select("valor,created_at").gte("created_at", fromDate.toISOString()).lte("created_at", toDate.toISOString()),
    ]);

    const vendas = vendasRes.data ?? [];
    const despesas = despesasRes.data ?? [];
    const fiados = fiadosRes.data ?? [];
    const pagamentos = pagamentosRes.data ?? [];

    const faturamentoTotal =
      vendas.filter((v) => !v.is_fiado).reduce((s, v) => s + Number(v.valor), 0) +
      pagamentos.reduce((s, p) => s + Number(p.valor), 0);

    const despesasTotal = despesas.reduce((s, d) => s + Number(d.valor), 0);

    // Saldo em aberto gerado apenas no período filtrado
    const fiadosAberto = fiados
      .filter((f) => f.status === "aberto")
      .reduce((s, f) => s + (Number(f.valor_total) - Number(f.valor_pago)), 0);

    // Chart: Dias baseados no intervalo selecionado
    const days: { day: string; key: string; valor: number }[] = [];
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Limite de 30 pontos no gráfico para não bugar a UI
    const totalDays = Math.min(diffDays, 30);
    
    for (let i = totalDays; i >= 0; i--) {
      const d = new Date(toDate); 
      d.setDate(d.getDate() - i); 
      d.setHours(0, 0, 0, 0);
      days.push({ day: dayLabel(d), key: dayKey(d), valor: 0 });
    }
    
    vendas.filter((v) => !v.is_fiado).forEach((v) => {
      const k = dayKey(new Date(v.created_at));
      const slot = days.find((d) => d.key === k);
      if (slot) slot.valor += Number(v.valor);
    });
    pagamentos.forEach((p) => {
      const k = dayKey(new Date(p.created_at));
      const slot = days.find((d) => d.key === k);
      if (slot) slot.valor += Number(p.valor);
    });

    setStats({
      vendas: faturamentoTotal,
      despesas: despesasTotal,
      lucro: faturamentoTotal - despesasTotal,
      fiados: fiadosAberto,
      chart: days.map(({ day, valor }) => ({ day, valor })),
    });
    setLoading(false);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-extrabold">
              Olá, <span className="text-gradient">Cantinho</span> 👋
            </motion.h1>
            <p className="text-foreground/60 mt-1">Resumo do período selecionado</p>
          </div>

          <div className="flex items-center gap-2 gradient-primary p-2 rounded-xl text-white shadow-lg glow">
            <CalendarIcon className="h-5 w-5 ml-2 opacity-80" />
            <input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent border-none text-sm font-semibold focus:ring-0 w-[120px] text-white [&::-webkit-calendar-picker-indicator]:invert"
            />
            <span className="opacity-60 text-sm">até</span>
            <input 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent border-none text-sm font-semibold focus:ring-0 w-[120px] text-white [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <FilterBtn label="Hoje" onClick={() => setRange(0)} />
          <FilterBtn label="7 dias" onClick={() => setRange(6)} />
          <FilterBtn label="30 dias" onClick={() => setRange(29)} />
          <FilterBtn label="Mês passado" onClick={setMesPassado} />
          <FilterBtn label="3 meses" onClick={() => setRange(90)} />
          <FilterBtn label="6 meses" onClick={() => setRange(180)} />
          <FilterBtn label="1 ano" onClick={() => setRange(365)} />
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard idx={0} label="Vendas" value={brl(stats.vendas)} icon={<TrendingUp />} bg="bg-card" fg="text-sales-foreground" border="border-primary/30 shadow-[var(--shadow-glow)]" loading={loading} />
        <KpiCard idx={1} label="Despesas" value={brl(stats.despesas)} icon={<TrendingDown />} bg="bg-card" fg="text-expense-foreground" border="border-primary/30 shadow-[var(--shadow-glow)]" loading={loading} />
        <KpiCard idx={2} label="Lucro" value={brl(stats.lucro)} icon={<Wallet />} bg="bg-card" fg="text-profit-foreground" border="border-primary/30 shadow-[var(--shadow-glow)]" loading={loading} />
        <KpiCard idx={3} label="Fiados (Período)" value={brl(stats.fiados)} icon={<ReceiptText />} bg="bg-card" fg="text-fiado-foreground" border="border-primary/30 shadow-[var(--shadow-glow)]" loading={loading} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-strong rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Faturamento</h2>
            <p className="text-sm text-foreground/60">Período selecionado</p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.chart} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.75 0.18 300)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.55 0.28 300)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.08)" />
              <XAxis dataKey="day" stroke="oklch(0 0 0 / 0.5)" fontSize={12} />
              <YAxis stroke="oklch(0 0 0 / 0.5)" fontSize={12} tickFormatter={(v) => `R$${v}`} />
              <Tooltip
                contentStyle={{ background: "oklch(1 0 0 / 0.95)", border: "1px solid oklch(0 0 0 / 0.15)", borderRadius: 12, backdropFilter: "blur(20px)" }}
                labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
                formatter={(v: number) => [brl(v), "Faturamento"]}
              />
              <Area type="monotone" dataKey="valor" stroke="oklch(0.75 0.18 300)" strokeWidth={3} fill="url(#g1)" animationDuration={1200} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}

function FilterBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-semibold rounded-lg glass text-foreground hover:bg-white/10 transition"
    >
      {label}
    </button>
  );
}

function KpiCard({ idx, label, value, icon, bg, fg, border, loading }: {
  idx: number; label: string; value: string; icon: React.ReactNode; bg: string; fg: string; border: string; loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08, type: "spring", stiffness: 120 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`${bg} ${fg} ${border} border rounded-2xl p-5 shadow-xl relative overflow-hidden`}
    >
      <div className="absolute -right-4 -top-4 opacity-15 [&>svg]:h-24 [&>svg]:w-24">{icon}</div>
      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-80">
          <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span> {label}
        </div>
        <div className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight">
          {loading ? "…" : value}
        </div>
      </div>
    </motion.div>
  );
}

