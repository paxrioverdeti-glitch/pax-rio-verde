"use client";

import { Download, LockKeyhole, LogOut, Search } from "lucide-react";
import { jsPDF } from "jspdf";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Acceptance = { name: string; cpf: string; phone: string; acceptedAt: string };

/**
 * Mascara o CPF para exibição NA TELA (minimização de dado / LGPD).
 * Ex.: "12345678910" -> "***.***.*89-10". O PDF/CSV continuam com o CPF
 * completo, pois o relatório exportado é o uso legítimo do admin.
 */
function maskCpf(cpf: string) {
  const digits = (cpf || "").replace(/\D/g, "");
  if (digits.length !== 11) return cpf; // formato inesperado: mostra como veio
  return `***.***.*${digits.slice(8, 9)}-${digits.slice(9, 11)}`;
}

function getDateKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function csvDownload(rows: Acceptance[], filename: string) {
  const csv = ["Nome,CPF,Telefone,Data do aceite", ...rows.map((row) => [row.name, row.cpf, row.phone, new Date(row.acceptedAt).toLocaleString("pt-BR")].map((value) => `"${value}"`).join(","))].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = filename;
  link.click();
}

function pdfDownload(rows: Acceptance[], filename: string) {
  const pdf = new jsPDF();
  const rowsPerPage = 4;
  pdf.setTextColor(7, 91, 60);
  pdf.setFontSize(20);
  pdf.text("Pax Rio Verde", 20, 24);
  pdf.setFontSize(11);
  pdf.setTextColor(90, 110, 100);
  pdf.text(rows.length > 1 ? "Relatório de aceites do aplicativo" : "Dados individuais do aceite", 20, 34);
  pdf.setDrawColor(73, 175, 61);
  pdf.line(20, 42, 190, 42);
  rows.forEach((row, index) => {
    if (index > 0 && index % rowsPerPage === 0) {
      pdf.addPage();
      pdf.setTextColor(7, 91, 60);
      pdf.setFontSize(14);
      pdf.text("Pax Rio Verde - Relatório de aceites", 20, 24);
      pdf.setDrawColor(73, 175, 61);
      pdf.line(20, 32, 190, 32);
    }

    const top = 48 + (index % rowsPerPage) * 52;
    pdf.setTextColor(7, 91, 60);
    pdf.setFontSize(13);
    pdf.text(`${index + 1}. ${row.name}`, 20, top);
    pdf.setTextColor(90, 110, 100);
    pdf.setFontSize(10);
    pdf.text(`CPF: ${row.cpf}`, 20, top + 10);
    pdf.text(`Telefone: ${row.phone}`, 20, top + 18);
    pdf.text(`Data e hora: ${new Date(row.acceptedAt).toLocaleString("pt-BR")}`, 20, top + 26);
    if (index < rows.length - 1) pdf.line(20, top + 35, 190, top + 35);
  });
  pdf.save(filename);
}

export default function Admin() {
  const [logged, setLogged] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState<Acceptance[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const supabase = createSupabaseBrowserClient();

  // Se já houver uma sessão Supabase ativa, entra direto.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        loadAcceptances().then(() => setLogged(true));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAcceptances() {
    const response = await fetch("/api/admin/acceptances", {
      credentials: "include",
    });

    if (!response.ok) {
      setLoginError("Não foi possível carregar os aceites.");
      setLogged(false);
      return;
    }

    const data = await response.json();
    setRows((data || []).map((row: { name: string; cpf: string; phone?: string | null; accepted_at?: string | null; created_at: string }) => ({
      name: row.name,
      cpf: row.cpf,
      phone: row.phone || "Não informado",
      acceptedAt: row.accepted_at || row.created_at,
    })));
  }

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setLoginError("");

    if (!email.trim() || !password.trim()) {
      setLoginError("E-mail e senha são obrigatórios.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoginError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    // Login no Supabase passou, mas isso NÃO basta: a conta precisa estar na
    // allowlist de admins. Confirmamos no servidor. Se não for admin, deslogamos
    // e mostramos a MESMA mensagem genérica — assim "e-mail não existe", "senha
    // errada" e "conta existe mas não é admin" ficam indistinguíveis (anti-enumeração).
    const whoami = await fetch("/api/admin/whoami", { credentials: "include" })
      .then((response) => response.json())
      .catch(() => ({ admin: false }));

    if (!whoami?.admin) {
      await supabase.auth.signOut();
      setLoginError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    await loadAcceptances();
    setLogged(true);
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setLogged(false);
    setRows([]);
    setEmail("");
    setPassword("");
  }

  if (!logged) return <main className="admin-shell"><div className="admin-login"><div className="admin-lock"><LockKeyhole /></div><span className="eyebrow">PAX RIO VERDE · RESTRITO</span><h1>Acesso administrativo.</h1><p>Entre para acompanhar os aceites do aplicativo.</p><form onSubmit={login}><label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" /></label><label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="senha" /></label>{loginError && <small className="form-error">{loginError}</small>}<button className="primary-button" disabled={loading}>{loading ? "VALIDANDO..." : "ENTRAR"}</button></form></div></main>;

  const filtered = rows.filter((row) => {
    const matchesText = `${row.name} ${row.cpf}`.toLowerCase().includes(query.toLowerCase());
    const acceptedDate = getDateKey(row.acceptedAt);
    const matchesStart = !startDate || acceptedDate >= startDate;
    const matchesEnd = !endDate || acceptedDate <= endDate;
    return matchesText && matchesStart && matchesEnd;
  });

  return <main className="admin-shell"><header className="admin-header"><div><span className="eyebrow">PAX RIO VERDE · OPERAÇÕES</span><h1>Painel administrativo<br /><strong>aceites do app.</strong></h1></div><button className="logout" onClick={logout}><LogOut size={15} /> sair</button></header><section className="admin-toolbar"><div className="search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar por nome ou CPF" /></div><label className="date-filter">De<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="date-filter">Até<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><button className="green-button" onClick={() => pdfDownload(filtered, "relatorio-pax-rio-verde.pdf")}><Download size={16} /> Baixar relatório PDF</button></section><div className="admin-meta"><span><b>{filtered.length}</b> aceites registrados</span><span>Atualizado agora</span></div><section className="acceptance-grid">{filtered.map((row, index) => <article className="acceptance-card" key={`${row.cpf}-${index}`}><div className="card-top"><span>ACEITE #{String(index + 1).padStart(2, "0")}</span><i /></div><h2>{row.name}</h2><dl><div><dt>CPF</dt><dd>{maskCpf(row.cpf)}</dd></div><div><dt>Telefone</dt><dd>{row.phone}</dd></div><div><dt>Data e hora</dt><dd>{new Date(row.acceptedAt).toLocaleString("pt-BR")}</dd></div></dl><button className="card-download" onClick={() => pdfDownload([row], `aceite-${String(index + 1).padStart(3, "0")}.pdf`)}><Download size={14} /> Baixar dados individuais</button></article>)}</section></main>;
}
