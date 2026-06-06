import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Lock, Trash2, AlertTriangle, LogOut, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Cantinho do Açaí" }] }),
  component: Configuracoes,
});

function Configuracoes() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [savingSenha, setSavingSenha] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetText, setResetText] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const trocarSenha = async () => {
    if (novaSenha.length < 6) return toast.error("Senha precisa ter 6+ caracteres");
    setSavingSenha(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSavingSenha(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada");
    setNovaSenha("");
  };

  const zerarSistema = async () => {
    if (resetText !== "ZERAR") return toast.error('Digite "ZERAR" para confirmar');
    setResetting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user!.id;
    // Ordem: pagamentos → registros → vendas → despesas → clientes
    await supabase.from("fiados_pagamentos").delete().eq("user_id", uid);
    await supabase.from("fiados_registros").delete().eq("user_id", uid);
    await supabase.from("vendas").delete().eq("user_id", uid);
    await supabase.from("despesas").delete().eq("user_id", uid);
    await supabase.from("clientes").delete().eq("user_id", uid);
    setResetting(false);
    setConfirmReset(false); setResetText("");
    toast.success("Sistema zerado com sucesso");
    router.invalidate();
  };

  const sair = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-2xl mx-auto"
    >
      <header>
        <h1 className="text-3xl font-extrabold text-foreground">Configurações</h1>
        <p className="text-foreground/60">Perfil e administração do sistema</p>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="glass-strong rounded-3xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl gradient-primary glow flex items-center justify-center">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Perfil</h2>
            <p className="text-xs text-foreground/50">Conta autenticada</p>
          </div>
        </div>
        <div className="glass rounded-xl p-3">
          <div className="text-[10px] uppercase font-bold text-foreground/50 tracking-wider">Usuário</div>
          <div className="font-mono text-sm text-foreground break-all">{email || "—"}</div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
            <Lock className="h-3 w-3" /> Trocar senha
          </label>
          <div className="flex gap-2">
            <input
              type="password" value={novaSenha} minLength={6}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Nova senha"
              className="flex-1 px-4 py-3 rounded-xl bg-input border border-glass-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={trocarSenha} disabled={savingSenha}
              className="px-4 rounded-xl gradient-primary text-white font-semibold text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {savingSenha && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </button>
          </div>
        </div>

        <button
          onClick={sair}
          className="w-full py-3 rounded-xl glass text-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-black/5 transition"
        >
          <LogOut className="h-4 w-4" /> Sair da conta
        </button>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-3xl p-6 space-y-4 border border-destructive/40 bg-destructive/5"
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-destructive/30 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Zona de Perigo</h2>
            <p className="text-xs text-foreground/60">Ações irreversíveis</p>
          </div>
        </div>
        <p className="text-sm text-foreground/70">
          Zerar o sistema apaga <strong>todas as vendas, despesas, fiados, pagamentos e clientes</strong>.
          Esta ação não pode ser desfeita.
        </p>

        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full py-3 rounded-xl bg-destructive text-destructive-foreground font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition"
          >
            <Trash2 className="h-4 w-4" /> Zerar todo o sistema
          </button>
        ) : (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <p className="text-xs text-foreground/70">Digite <strong>ZERAR</strong> para confirmar:</p>
            <input
              value={resetText} onChange={(e) => setResetText(e.target.value)}
              placeholder="ZERAR"
              className="w-full px-4 py-3 rounded-xl bg-input border border-destructive/50 text-sm text-foreground font-bold uppercase focus:outline-none focus:ring-2 focus:ring-destructive"
            />
            <div className="flex gap-2">
              <button
                onClick={zerarSistema} disabled={resetting || resetText !== "ZERAR"}
                className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {resetting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar
              </button>
              <button
                onClick={() => { setConfirmReset(false); setResetText(""); }}
                className="px-4 py-3 rounded-xl glass text-foreground text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </motion.section>
    </motion.div>
  );
}
