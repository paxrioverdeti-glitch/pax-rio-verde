"use client";

import { Download, LockKeyhole, LogOut, Search } from "lucide-react";
import { jsPDF } from "jspdf";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Acceptance = { name: string; cpf: string; phone: string; acceptedAt: string };

function csvDownload(rows: Acceptance[], filename: string) {
  const csv = ["Nome,CPF,Telefone,Data do aceite", ...rows.map((row) => [row.name, row.cpf, row.phone, new Date(row.acceptedAt).toLocaleString("pt-BR")].map((value) => `"${value}"`).join(","))].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = filename;
  link.click();
}

function pdfDownload(rows: Acceptance[], filename: string) {
  const pdf = new jsPDF();
  pdf.setTextColor(7, 91, 60);
  pdf.setFontSize(20);
  pdf.text("Pax Rio Verde", 20, 24);
  pdf.setFontSize(11);
  pdf.setTextColor(90, 110, 100);
  pdf.text(rows.length > 1 ? "Relatório de aceites do aplicativo" : "Dados individuais do aceite", 20, 34);
  pdf.setDrawColor(73, 175, 61);
  pdf.line(20, 42, 190, 42);
  rows.forEach((row, index) => {
    const top = 58 + index * 52;
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
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState<Acceptance[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  async function loadAcceptances() {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("acceptances").select("name, cpf, phone, accepted_at").order("accepted_at", { ascending: false });
    setRows((data || []).map((row) => ({ name: row.name, cpf: row.cpf, phone: row.phone || "Não informado", acceptedAt: row.accepted_at })));
  }

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email: user, password });
    if (error) { setLoginError("E-mail ou senha inválidos."); setLoading(false); return; }
    setLoginError("");
    await loadAcceptances();
    setLogged(true);
    setLoading(false);
  }

  if (!logged) return <main className="admin-shell"><div className="admin-login"><div className="admin-lock"><LockKeyhole /></div><span className="eyebrow">PAX RIO VERDE · RESTRITO</span><h1>Acesso administrativo.</h1><p>Entre para acompanhar os aceites do aplicativo.</p><form onSubmit={login}><label>Usuário<input value={user} onChange={(event) => setUser(event.target.value)} placeholder="seu usuário" /></label><label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="senha" /></label>{loginError && <small className="form-error">{loginError}</small>}<button className="primary-button" disabled={loading}>{loading ? "VALIDANDO..." : "ENTRAR"}</button></form></div></main>;

  const filtered = rows.filter((row) => {
    const matchesText = `${row.name} ${row.cpf}`.toLowerCase().includes(query.toLowerCase());
    const acceptedDate = row.acceptedAt.slice(0, 10);
    const matchesStart = !startDate || acceptedDate >= startDate;
    const matchesEnd = !endDate || acceptedDate <= endDate;
    return matchesText && matchesStart && matchesEnd;
  });

  return <main className="admin-shell"><header className="admin-header"><div><span className="eyebrow">PAX RIO VERDE · OPERAÇÕES</span><h1>Painel administrativo<br /><strong>aceites do app.</strong></h1></div><button className="logout" onClick={() => setLogged(false)}><LogOut size={15} /> sair</button></header><section className="admin-toolbar"><div className="search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar por nome ou CPF" /></div><label className="date-filter">De<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="date-filter">Até<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><button className="green-button" onClick={() => pdfDownload(filtered, "relatorio-pax-rio-verde.pdf")}><Download size={16} /> Baixar relatório PDF</button></section><div className="admin-meta"><span><b>{filtered.length}</b> aceites registrados</span><span>Atualizado agora</span></div><section className="acceptance-grid">{filtered.map((row, index) => <article className="acceptance-card" key={`${row.cpf}-${index}`}><div className="card-top"><span>ACEITE #{String(index + 1).padStart(2, "0")}</span><i /></div><h2>{row.name}</h2><dl><div><dt>CPF</dt><dd>{row.cpf}</dd></div><div><dt>Telefone</dt><dd>{row.phone}</dd></div><div><dt>Data e hora</dt><dd>{new Date(row.acceptedAt).toLocaleString("pt-BR")}</dd></div></dl><button className="card-download" onClick={() => pdfDownload([row], `aceite-${row.cpf}.pdf`)}><Download size={14} /> Baixar dados individuais</button></article>)}</section></main>;
}
