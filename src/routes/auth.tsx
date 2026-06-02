import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Cantinho do Açaí" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Conta criada! Entrando...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div
        className="absolute h-[70vmin] w-[70vmin] rounded-full -z-10"
        style={{ background: "var(--gradient-primary)", filter: "blur(100px)", opacity: 0.4 }}
        animate={{ x: [-50, 50, -50], y: [-30, 30, -30] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass-strong rounded-3xl p-8 w-full max-w-md"
      >
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="h-16 w-16 rounded-2xl gradient-primary glow flex items-center justify-center text-3xl">🍇</div>
          <h1 className="text-3xl font-extrabold text-center">
            Cantinho do <span className="text-gradient">Açaí</span>
          </h1>
          <p className="text-sm text-white/60">
            {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl bg-input border border-glass-border text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-ring transition"
              placeholder="voce@email.com"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl bg-input border border-glass-border text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-ring transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-3 rounded-xl gradient-primary font-semibold text-white glow hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-sm text-white/60 hover:text-white transition"
          >
            {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
