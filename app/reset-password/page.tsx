"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, Check } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await createSupabaseBrowserClient().auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError("O link expirou ou já foi utilizado. Solicite um novo link de recuperação.");
      return;
    }
    setMessage("Senha criada com sucesso. Você já pode acessar o painel administrativo.");
  }

  return <main className="admin-shell"><div className="admin-login"><div className="admin-lock"><LockKeyhole /></div><span className="eyebrow">PAX RIO VERDE · SEGURANÇA</span><h1>Crie sua nova senha.</h1><p>Escolha uma senha segura para acessar o painel administrativo.</p><form onSubmit={submit}><label>Nova senha<input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" /></label><label>Confirmar senha<input required type="password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repita a nova senha" /></label>{error && <small className="form-error">{error}</small>}{message && <small className="reset-success"><Check size={14} /> {message}</small>}<button className="primary-button" disabled={loading}>{loading ? "SALVANDO..." : "CRIAR NOVA SENHA"}</button></form></div></main>;
}
