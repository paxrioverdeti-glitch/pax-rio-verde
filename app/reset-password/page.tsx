"use client";

import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole, Check } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Só liberamos o formulário quando confirmamos que o usuário chegou por um
  // fluxo de RECUPERAÇÃO de senha legítimo — e não com qualquer sessão ativa.
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checking, setChecking] = useState(true);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // O Supabase dispara o evento PASSWORD_RECOVERY quando a sessão veio de um
    // link de recuperação. Só então habilitamos a troca de senha.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(true);
        setChecking(false);
      }
    });

    // Fallback: se já existe uma sessão E viemos do callback de recovery
    // (marcador ?recovery=1), também liberamos. Sem nenhum dos dois sinais,
    // a tela permanece bloqueada.
    const params = new URLSearchParams(window.location.search);
    const cameFromRecovery = params.get("recovery") === "1";

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && cameFromRecovery) setRecoveryReady(true);
      setChecking(false);
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!recoveryReady) {
      setError("Fluxo de recuperação inválido. Solicite um novo link de redefinição.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError("O link expirou ou já foi utilizado. Solicite um novo link de recuperação.");
      return;
    }
    // Troca feita: encerra a sessão de recuperação e força login com a nova senha.
    await supabase.auth.signOut();
    setLoading(false);
    setRecoveryReady(false);
    setMessage("Senha criada com sucesso. Faça login no painel com a nova senha.");
  }

  if (checking) {
    return <main className="admin-shell"><div className="admin-login"><div className="admin-lock"><LockKeyhole /></div><span className="eyebrow">PAX RIO VERDE · SEGURANÇA</span><h1>Validando link...</h1><p>Aguarde um instante.</p></div></main>;
  }

  if (!recoveryReady && !message) {
    return <main className="admin-shell"><div className="admin-login"><div className="admin-lock"><LockKeyhole /></div><span className="eyebrow">PAX RIO VERDE · SEGURANÇA</span><h1>Link inválido ou expirado.</h1><p>Esta página só funciona a partir de um link de recuperação de senha válido. Solicite um novo link no painel administrativo.</p></div></main>;
  }

  return <main className="admin-shell"><div className="admin-login"><div className="admin-lock"><LockKeyhole /></div><span className="eyebrow">PAX RIO VERDE · SEGURANÇA</span><h1>Crie sua nova senha.</h1><p>Escolha uma senha segura para acessar o painel administrativo.</p><form onSubmit={submit}><label>Nova senha<input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" /></label><label>Confirmar senha<input required type="password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repita a nova senha" /></label>{error && <small className="form-error">{error}</small>}{message && <small className="reset-success"><Check size={14} /> {message}</small>}<button className="primary-button" disabled={loading || !recoveryReady}>{loading ? "SALVANDO..." : "CRIAR NOVA SENHA"}</button></form></div></main>;
}
