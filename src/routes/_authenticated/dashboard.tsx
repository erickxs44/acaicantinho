import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { brl, dayKey, dayLabel } from "@/lib/format";
import { saveState, loadState } from "@/lib/offline-storage";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Cantinho do Açaí" }] }),
  component: Dashboard,
});

type Stats = {
  vendas: number;
  despesas: number;
  lucro: number;
  fiados: number;
  chartVendas: { day: string; valor: number }[];
  chartDespesas: { day: string; valor: number }[];
  chartFiados: { day: string; valor: number }[];
};

type RecentMov = { id: string; tipo: "entrada" | "saida" | "fiado"; descricao: string; valor: number; hora: string };
type ClienteFiado = { nome: string; telefone: string | null; emAberto: number; qtd: number };

const PERIODS = [
  { label: "Hoje", days: 0 },
  { label: "Últimos 7 dias", days: 6 },
  { label: "Últimos 30 dias", days: 29 },
  { label: "Últimos 3 meses", days: 90 },
  { label: "Últimos 6 meses", days: 180 },
  { label: "Último ano", days: 365 },
];

function formatDateRange(from: string, to: string) {
  const f = new Date(from + "T00:00:00");
  const t = new Date(to + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const fStr = f.toLocaleDateString("pt-BR", opts);
  const tStr = t.toLocaleDateString("pt-BR", { ...opts, year: "numeric" });
  return `${fStr} — ${tStr}`;
}

function todayPT() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function Dashboard() {
  const [stats, setStats] = useState<Stats>(() => loadState("dashboardStats", {
    vendas: 0, despesas: 0, lucro: 0, fiados: 0,
    chartVendas: [], chartDespesas: [], chartFiados: [],
  }));
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState(1); // default "7d"
  const [recentMovs, setRecentMovs] = useState<RecentMov[]>(() => loadState("dashboardRecent", []));
  const [topFiados, setTopFiados] = useState<ClienteFiado[]>(() => loadState("dashboardTopFiados", []));

  const dataPadraoFim = new Date();
  const dataPadraoInicio = new Date();
  dataPadraoInicio.setDate(dataPadraoInicio.getDate() - 6);

  const [dateFrom, setDateFrom] = useState(dataPadraoInicio.toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(dataPadraoFim.toISOString().slice(0, 10));

  const setPeriod = (idx: number) => {
    setActivePeriod(idx);
    const { days } = PERIODS[idx];
    const end = new Date();
    const start = new Date();
    if (days === -1) {
      // mês atual
      start.setDate(1);
    } else if (days === 0) {
      // hoje
    } else {
      start.setDate(start.getDate() - days);
    }
    setDateFrom(start.toISOString().slice(0, 10));
    setDateTo(end.toISOString().slice(0, 10));
  };

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("data:changed", handler);
    return () => window.removeEventListener("data:changed", handler);
  }, [dateFrom, dateTo]);

  async function load() {
    setLoading(true);
    const fromDate = new Date(dateFrom + "T00:00:00");
    const toDate = new Date(dateTo + "T23:59:59");

    const [vendasRes, despesasRes, fiadosRes, pagamentosRes, clientesRes] = await Promise.all([
      supabase.from("vendas").select("valor,is_fiado,created_at,produto,tipo_pagamento").gte("created_at", fromDate.toISOString()).lte("created_at", toDate.toISOString()),
      supabase.from("despesas").select("valor,created_at,descricao").gte("created_at", fromDate.toISOString()).lte("created_at", toDate.toISOString()),
      supabase.from("fiados_registros").select("valor_total,valor_pago,status,created_at,cliente_id").gte("created_at", fromDate.toISOString()).lte("created_at", toDate.toISOString()),
      supabase.from("fiados_pagamentos").select("valor,created_at,fiado_id").gte("created_at", fromDate.toISOString()).lte("created_at", toDate.toISOString()),
      supabase.from("clientes").select("id,nome,telefone"),
    ]);

    const vendas = vendasRes.data ?? [];
    const despesas = despesasRes.data ?? [];
    const fiados = fiadosRes.data ?? [];
    const pagamentos = pagamentosRes.data ?? [];
    const clientes = clientesRes.data ?? [];

    const faturamentoTotal =
      vendas.filter((v) => !v.is_fiado).reduce((s, v) => s + Number(v.valor), 0) +
      pagamentos.reduce((s, p) => s + Number(p.valor), 0);
    const despesasTotal = despesas.reduce((s, d) => s + Number(d.valor), 0);
    const fiadosAberto = fiados
      .filter((f) => f.status === "aberto")
      .reduce((s, f) => s + (Number(f.valor_total) - Number(f.valor_pago)), 0);

    // Chart data
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalDays = Math.min(diffDays, 30);

    const days: { day: string; key: string; vendas: number; despesas: number; fiados: number }[] = [];
    for (let i = totalDays; i >= 0; i--) {
      const d = new Date(toDate);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push({ day: dayLabel(d), key: dayKey(d), vendas: 0, despesas: 0, fiados: 0 });
    }

    vendas.filter((v) => !v.is_fiado).forEach((v) => {
      const k = dayKey(new Date(v.created_at));
      const slot = days.find((d) => d.key === k);
      if (slot) slot.vendas += Number(v.valor);
    });
    pagamentos.forEach((p) => {
      const k = dayKey(new Date(p.created_at));
      const slot = days.find((d) => d.key === k);
      if (slot) slot.vendas += Number(p.valor);
    });
    despesas.forEach((d) => {
      const k = dayKey(new Date(d.created_at));
      const slot = days.find((s) => s.key === k);
      if (slot) slot.despesas += Number(d.valor);
    });
    fiados.forEach((f) => {
      const k = dayKey(new Date(f.created_at));
      const slot = days.find((d) => d.key === k);
      if (slot) slot.fiados += Number(f.valor_total) - Number(f.valor_pago);
    });

    setStats({
      vendas: faturamentoTotal,
      despesas: despesasTotal,
      lucro: faturamentoTotal - despesasTotal,
      fiados: fiadosAberto,
      chartVendas: days.map(({ day, vendas }) => ({ day, valor: vendas })),
      chartDespesas: days.map(({ day, despesas }) => ({ day, valor: despesas })),
      chartFiados: days.map(({ day, fiados }) => ({ day, valor: fiados })),
    });

    // Recent movs (últimas 5)
    const allMovs: RecentMov[] = [
      ...vendas.slice(0, 3).map((v) => ({
        id: "v" + Math.random(),
        tipo: (v.is_fiado ? "fiado" : "entrada") as RecentMov["tipo"],
        descricao: v.is_fiado ? `Fiado: ${v.produto}` : `${v.produto}`,
        valor: Number(v.valor),
        hora: new Date(v.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      })),
      ...despesas.slice(0, 2).map((d) => ({
        id: "d" + Math.random(),
        tipo: "saida" as RecentMov["tipo"],
        descricao: d.descricao,
        valor: Number(d.valor),
        hora: new Date(d.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      })),
    ].slice(0, 5);
    setRecentMovs(allMovs);

    // Top clients with fiados
    const allFiados = fiados.filter((f) => f.status === "aberto");

    const clientMap = new Map<string, ClienteFiado>();
    for (const cli of clientes.filter((c) => !c.nome.startsWith("[EXCLUÍDO]"))) {
      clientMap.set(cli.id, { nome: cli.nome, telefone: cli.telefone, emAberto: 0, qtd: 0 });
    }
    for (const f of allFiados) {
      const entry = clientMap.get(f.cliente_id);
      if (entry) {
        entry.emAberto += Number(f.valor_total) - Number(f.valor_pago);
        entry.qtd++;
      }
    }
    const sorted = [...clientMap.values()]
      .filter((c) => c.emAberto > 0)
      .sort((a, b) => b.emAberto - a.emAberto)
      .slice(0, 5);
    setTopFiados(sorted);

    // Salva os estados offline
    saveState("dashboardStats", {
      vendas: faturamentoTotal, despesas: despesasTotal, lucro: faturamentoTotal - despesasTotal, fiados: fiadosAberto,
      chartVendas: days.map(({ day, vendas }) => ({ day, valor: vendas })),
      chartDespesas: days.map(({ day, despesas }) => ({ day, valor: despesas })),
      chartFiados: days.map(({ day, fiados }) => ({ day, valor: fiados })),
    });
    saveState("dashboardRecent", allMovs);
    saveState("dashboardTopFiados", sorted);

    setLoading(false);
  }

  const maxVendas = Math.max(...stats.chartVendas.map((d) => d.valor), 1);

  // SVG Chart builder
  function buildPath(data: { valor: number }[], maxVal: number, w = 800, h = 160): string {
    if (data.length < 2) return "";
    const pts = data.map((d, i) => ({
      x: (i / (data.length - 1)) * w,
      y: h - (d.valor / maxVal) * (h - 20) - 10,
    }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cp1x = (pts[i - 1].x + pts[i].x) / 2;
      d += ` C ${cp1x} ${pts[i - 1].y}, ${cp1x} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
    }
    return d;
  }

  function buildArea(data: { valor: number }[], maxVal: number, color: string, w = 800, h = 160) {
    if (data.length < 2) return null;
    const path = buildPath(data, maxVal, w, h);
    const lastPt = { x: w, y: h - (data[data.length - 1].valor / maxVal) * (h - 20) - 10 };
    const areaPath = path + ` L ${lastPt.x} ${h} L 0 ${h} Z`;
    const gradId = `grad-${color.replace("#", "")}`;
    return { path, areaPath, gradId, lastPt, data };
  }

  const maxAll = Math.max(
    ...stats.chartVendas.map((d) => d.valor),
    ...stats.chartDespesas.map((d) => d.valor),
    ...stats.chartFiados.map((d) => d.valor),
    1
  );

  const areaVendas = buildArea(stats.chartVendas, maxAll, "#22d3a5");
  const areaDespesas = buildArea(stats.chartDespesas, maxAll, "#f4617b");
  const areaFiados = buildArea(stats.chartFiados, maxAll, "#fbbf24");

  const totalFiadosAberto = topFiados.reduce((s, c) => s + c.emAberto, 0);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 32 }}>

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: "-0.5px",
            color: "white",
            margin: 0,
          }}>
            Dashboard
          </h1>
          <p style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--white-70)",
            marginTop: 2,
            margin: "2px 0 0",
            textTransform: "capitalize",
          }}>
            {todayPT()}
          </p>
        </div>

        {/* Calendar Button com Select Nativo */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #5a2d9c, #7c3aed)",
              color: "white",
              padding: "10px 18px",
              borderRadius: 12,
              border: "none",
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
              fontSize: 13,
              letterSpacing: "0.2px",
              boxShadow: "0 4px 20px rgba(124,58,237,0.45)",
              transition: "all 0.2s",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatDateRange(dateFrom, dateTo)}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <select
            value={activePeriod}
            onChange={(e) => setPeriod(Number(e.target.value))}
            style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer",
            }}
          >
            {PERIODS.map((p, i) => (
              <option key={i} value={i}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── KPI CARDS ─────────────────────────────────────────────── */}
      <div style={{
        gap: 16,
        marginBottom: 28,
      }} className="grid grid-cols-2 md:grid-cols-4">

        <KpiCard
          idx={0} loading={loading}
          label="Vendas" value={stats.vendas}
          color="#22d3a5" orbBg="rgba(34,211,165,0.12)"
          progress={72}
          iconBg="rgba(34,211,165,0.15)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3a5" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          }
        />
        <KpiCard
          idx={1} loading={loading}
          label="Despesas" value={stats.despesas}
          color="#f4617b" orbBg="rgba(244,97,123,0.12)"
          progress={45}
          iconBg="rgba(244,97,123,0.15)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f4617b" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          }
        />
        <KpiCard
          idx={2} loading={loading}
          label="Fiados" value={stats.fiados}
          color="#fbbf24" orbBg="rgba(251,191,36,0.12)"
          progress={30}
          iconBg="rgba(251,191,36,0.15)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          }
        />
        <KpiCard
          idx={3} loading={loading}
          label="Lucro" value={stats.lucro}
          color="#b97ef8" orbBg="rgba(185,126,248,0.12)"
          progress={58}
          iconBg="rgba(185,126,248,0.15)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b97ef8" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          }
        />
      </div>

      {/* ── CHART PANEL ─────────────────────────────────────────── */}
      <div className="panel" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 16,
              color: "white",
              margin: 0,
            }}>Visão Geral Financeira</h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--white-70)", margin: "4px 0 0" }}>
              {formatDateRange(dateFrom, dateTo)}
            </p>
          </div>

          {/* Period Filter */}
          <div style={{
            background: "var(--white-5)",
            border: "1px solid var(--white-10)",
            borderRadius: 10,
            padding: 4,
            display: "flex",
            gap: 4,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }} className="period-filter-container">
            {PERIODS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setPeriod(i)}
                className={`period-btn ${activePeriod === i ? "active" : ""}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Chart */}
        <div style={{ height: 180, position: "relative" }}>
          <svg
            viewBox="0 0 800 180"
            preserveAspectRatio="none"
            style={{ width: "100%", height: "100%" }}
          >
            <defs>
              {areaVendas && (
                <linearGradient id={areaVendas.gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3a5" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22d3a5" stopOpacity={0} />
                </linearGradient>
              )}
              {areaDespesas && (
                <linearGradient id={areaDespesas.gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f4617b" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#f4617b" stopOpacity={0} />
                </linearGradient>
              )}
              {areaFiados && (
                <linearGradient id={areaFiados.gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
              )}
            </defs>

            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1="0" y1={f * 180} x2="800" y2={f * 180}
                stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            ))}

            {/* Areas + Lines */}
            {areaFiados && (
              <>
                <path d={areaFiados.areaPath} fill={`url(#${areaFiados.gradId})`} />
                <path d={areaFiados.path} fill="none" stroke="#fbbf24" strokeWidth="1.5"
                  strokeDasharray="6 3" />
                <circle cx={areaFiados.lastPt.x} cy={areaFiados.lastPt.y} r="5" fill="#fbbf24" />
                <circle cx={areaFiados.lastPt.x} cy={areaFiados.lastPt.y} r="9" fill="#fbbf24" opacity="0.2" />
              </>
            )}
            {areaDespesas && (
              <>
                <path d={areaDespesas.areaPath} fill={`url(#${areaDespesas.gradId})`} />
                <path d={areaDespesas.path} fill="none" stroke="#f4617b" strokeWidth="2" />
                <circle cx={areaDespesas.lastPt.x} cy={areaDespesas.lastPt.y} r="5" fill="#f4617b" />
                <circle cx={areaDespesas.lastPt.x} cy={areaDespesas.lastPt.y} r="9" fill="#f4617b" opacity="0.2" />
              </>
            )}
            {areaVendas && (
              <>
                <path d={areaVendas.areaPath} fill={`url(#${areaVendas.gradId})`} />
                <path d={areaVendas.path} fill="none" stroke="#22d3a5" strokeWidth="2.5" />
                <circle cx={areaVendas.lastPt.x} cy={areaVendas.lastPt.y} r="5" fill="#22d3a5" />
                <circle cx={areaVendas.lastPt.x} cy={areaVendas.lastPt.y} r="9" fill="#22d3a5" opacity="0.2" />
              </>
            )}

            {/* X Labels */}
            {stats.chartVendas.filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / 6)) === 0).map((d, i, arr) => {
              const fullArr = stats.chartVendas;
              const origIdx = fullArr.findIndex((x) => x.day === d.day);
              const x = origIdx >= 0 ? (origIdx / (fullArr.length - 1)) * 800 : 0;
              return (
                <text key={i} x={x} y={175} textAnchor="middle"
                  fontSize="8.5" fill="rgba(255,255,255,0.3)"
                  fontFamily="var(--font-sans)">
                  {d.day}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
          {[
            { color: "#22d3a5", label: "Vendas" },
            { color: "#f4617b", label: "Despesas" },
            { color: "#fbbf24", label: "Fiados" },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
              <span style={{ fontSize: 12, color: "var(--white-70)", fontFamily: "var(--font-sans)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM GRID ───────────────────────────────────────────── */}
      <div style={{ gap: 16 }} className="grid grid-cols-1 md:grid-cols-2">

        {/* Movimentações Recentes */}
        <div className="panel">
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 15,
            color: "white",
            margin: "0 0 16px",
          }}>
            Movimentações Recentes
          </h3>
          <div>
            {recentMovs.length === 0 ? (
              <p style={{ color: "var(--white-70)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                Nenhuma movimentação no período
              </p>
            ) : recentMovs.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: i < recentMovs.length - 1 ? "1px solid var(--white-5)" : "none",
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: m.tipo === "entrada" ? "rgba(34,211,165,0.15)" :
                    m.tipo === "saida" ? "rgba(244,97,123,0.15)" : "rgba(251,191,36,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16,
                }}>
                  {m.tipo === "entrada" ? "💳" : m.tipo === "saida" ? "🏪" : "👤"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 13, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.descricao}
                  </div>
                  <div style={{ fontFamily: "var(--font-sans)", fontWeight: 400, fontSize: 11, color: "var(--white-70)" }}>
                    {m.hora}
                  </div>
                </div>
                <div style={{
                  fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, flexShrink: 0,
                  color: m.tipo === "entrada" ? "#22d3a5" : m.tipo === "saida" ? "#f4617b" : "#fbbf24",
                }}>
                  {m.tipo === "entrada" ? "+" : m.tipo === "saida" ? "−" : ""}{brl(m.valor)}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Clientes em Fiado */}
        <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 15,
            color: "white",
            margin: "0 0 16px",
          }}>
            Clientes em Fiado
          </h3>

          <div style={{ flex: 1 }}>
            {topFiados.length === 0 ? (
              <p style={{ color: "var(--white-70)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                Nenhum cliente com saldo em aberto 🎉
              </p>
            ) : topFiados.map((c, i) => {
              const initials = c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
              return (
                <motion.div
                  key={c.nome + i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: i < topFiados.length - 1 ? "1px solid var(--white-5)" : "none",
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, #5a2d9c, #9d5bf5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "white",
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 13, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.nome}
                    </div>
                    {c.telefone && (
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--white-70)" }}>
                        {c.telefone}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "#fbbf24" }}>
                      {brl(c.emAberto)}
                    </div>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--white-70)" }}>
                      {c.qtd} pendência{c.qtd !== 1 ? "s" : ""}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Footer bar */}
          <div style={{
            marginTop: 16,
            background: "var(--white-5)",
            border: "1px solid var(--white-10)",
            borderRadius: 12,
            padding: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--white-70)" }}>
              Total em aberto
            </span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "#fbbf24" }}>
              {loading ? "..." : brl(totalFiadosAberto)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── KPI Card Component ─────────────────────────────────────────────────────
function KpiCard({
  idx, loading, label, value, color, orbBg, progress, iconBg, icon
}: {
  idx: number; loading: boolean;
  label: string; value: number;
  color: string; orbBg: string;
  progress: number;
  iconBg: string; icon: React.ReactNode;
}) {
  const formatted = brl(value);
  const [intPart, decPart] = formatted.replace("R$\u00a0", "").split(",");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08, type: "spring", stiffness: 120 }}
      className="kpi-card"
    >
      {/* Orb */}
      <div style={{
        position: "absolute",
        top: -40, right: -40,
        width: 100, height: 100,
        borderRadius: "50%",
        background: orbBg,
        pointerEvents: "none",
      }} />

      {/* Label */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-sans)",
        fontWeight: 500,
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "1.2px",
        color: "var(--white-70)",
        marginBottom: 12,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
        {label}
      </div>

      {/* Value */}
      <div style={{ marginBottom: 10 }}>
        {loading ? (
          <div style={{ height: 36, borderRadius: 8, background: "var(--white-10)", width: "60%" }} />
        ) : (
          <span style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "var(--card-value-fluid, 28px)",
            letterSpacing: "-1px",
            lineHeight: 1,
            color: "white",
          }}>
            R$&nbsp;{intPart}
            <span style={{ fontSize: "0.65em", opacity: 0.7 }}>,{decPart}</span>
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%`, background: color }} />
      </div>

      {/* Icon bottom-right */}
      <div style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 10,
        background: iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {icon}
      </div>
    </motion.div>
  );
}
