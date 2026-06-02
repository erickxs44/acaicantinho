import { Link, Outlet, useRouter, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { LayoutDashboard, ShoppingCart, ArrowLeftRight, ReceiptText, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const nav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/pdv", icon: ShoppingCart, label: "PDV" },
  { to: "/movimentacao", icon: ArrowLeftRight, label: "Movimentação" },
  { to: "/fiados", icon: ReceiptText, label: "Fiados" },
] as const;

export function AppShell() {
  const router = useRouter();
  const { pathname } = useLocation();

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Até logo!");
    router.navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-64 flex-col p-4 gap-2 sticky top-0 h-screen">
        <div className="glass-strong rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary glow flex items-center justify-center text-xl">🍇</div>
          <div>
            <div className="text-sm font-bold leading-tight">Cantinho</div>
            <div className="text-xs text-white/60 leading-tight">do Açaí</div>
          </div>
        </div>
        <nav className="glass-strong rounded-2xl p-2 flex-1 flex flex-col gap-1">
          {nav.map(({ to, icon: Icon, label }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? "text-white" : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl gradient-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="relative h-4 w-4" />
                <span className="relative">{label}</span>
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="glass-strong rounded-2xl p-3 flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 glass-strong px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">🍇</div>
          <div className="text-sm font-bold">Cantinho do Açaí</div>
        </div>
        <button onClick={logout} className="text-white/70"><LogOut className="h-4 w-4" /></button>
      </div>

      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 pb-24 md:pb-8 min-w-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass-strong p-2 grid grid-cols-4 gap-1">
        {nav.map(({ to, icon: Icon, label }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-medium ${
                active ? "text-white gradient-primary" : "text-white/60"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
