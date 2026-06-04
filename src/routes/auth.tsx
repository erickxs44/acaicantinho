import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, User, Lock } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Cantinho do Açaí" }] }),
  component: AuthPage,
});

const FIXED_USER = "adm";
const FIXED_PASSWORD = "acai97";
const FIXED_EMAIL = "adm@cantinho.local";

function AuthPage() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
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
      if (usuario.trim().toLowerCase() !== FIXED_USER || senha !== FIXED_PASSWORD) {
        throw new Error("Usuário ou senha incorretos");
      }
      let { error } = await supabase.auth.signInWithPassword({
        email: FIXED_EMAIL,
        password: FIXED_PASSWORD,
      });
      if (error) {
        // primeira vez: criar a conta fixa
        const { error: signErr } = await supabase.auth.signUp({
          email: FIXED_EMAIL,
          password: FIXED_PASSWORD,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (signErr && !/registered/i.test(signErr.message)) throw signErr;
        const retry = await supabase.auth.signInWithPassword({
          email: FIXED_EMAIL,
          password: FIXED_PASSWORD,
        });
        if (retry.error) throw retry.error;
      }
      toast.success("Bem-vindo!");
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
        style={{ background: "var(--gradient-primary)", filter: "blur(100px)", opacity: 0.45 }}
        animate={{ x: [-50, 50, -50], y: [-30, 30, -30], scale: [1, 1.1, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute h-[40vmin] w-[40vmin] rounded-full -z-10 right-0 bottom-0"
        style={{ background: "var(--gradient-emerald)", filter: "blur(120px)", opacity: 0.25 }}
        animate={{ x: [0, -40, 0], y: [0, -40, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="glass-strong rounded-3xl p-8 w-full max-w-md"
      >
        <div className="flex flex-col items-center gap-3 mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.2 }}
            className="h-16 w-16 rounded-2xl gradient-primary glow flex items-center justify-center text-3xl"
          >
            🍇
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="text-3xl font-extrabold text-center"
          >
            Cantinho do <span className="text-gradient">Açaí</span>
          </motion.h1>
          <p className="text-sm text-white/60">Acesso administrativo</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3 w-3" /> Usuário
            </label>
            <input
              required value={usuario} autoComplete="username"
              onChange={(e) => setUsuario(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl bg-input border border-glass-border text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-ring transition"
              placeholder="adm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Senha
            </label>
            <input
              type="password" required value={senha} autoComplete="current-password"
              onChange={(e) => setSenha(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl bg-input border border-glass-border text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-ring transition"
              placeholder="••••••••"
            />
          </div>

          <motion.button
            type="submit" disabled={loading}
            whileTap={{ scale: 0.98 }}
            className="mt-2 py-3 rounded-xl gradient-primary font-semibold text-white glow hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
