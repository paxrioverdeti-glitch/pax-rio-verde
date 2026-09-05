"use client";

import { Check, Gift, LockKeyhole, MessageCircle, Phone, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import { FormEvent, useState } from "react";

type Step = "welcome" | "declined" | "form" | "success";
const whatsappLink = `https://wa.me/556492331101?text=${encodeURIComponent("Olá, gostaria de saber mais sobre o aplicativo Pax Rio Verde.")}`;
function Logo() { return <Image className="brand-logo" src="/logo-pax.png" alt="Pax Rio Verde 30 anos" width={150} height={70} />; }
function PhoneMockup() { return <div className="phone-wrap"><Image src="/celular-pax.png" alt="Campanha do aplicativo Pax Rio Verde" fill priority sizes="(max-width: 760px) 100vw, 52vw" /></div>; }
function Benefits() { return <div className="benefits"><div><Gift /><b>Benefícios exclusivos</b><span>Condições especiais para você</span></div><div><ShieldCheck /><b>Cartão gratuito</b><span>Pelo app até dezembro de 2026</span></div><div><Sparkles /><b>Acompanhe informações</b><span>Tenha tudo na palma da mão</span></div></div>; }
function ContactBanner() { return <div className="info-contact"><div className="info-contact-copy"><span className="eyebrow">MAIS INFORMAÇÕES</span><p>Entre em contato com nossa equipe e tire todas as dúvidas.</p></div><a className="whatsapp-button" href={whatsappLink} target="_blank" rel="noreferrer"><MessageCircle size={18} />Falar no WhatsApp</a></div>; }
const maskCpf = (value: string) => value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const maskPhone = (value: string) => value.replace(/\D/g, "").slice(0, 11).replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");

export default function Home() {
  const [step, setStep] = useState<Step>("welcome"); const [cpf, setCpf] = useState(""); const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const phoneHasError = Boolean(error && phone.replace(/\D/g, "").length < 10);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (cpf.replace(/\D/g, "").length !== 11 || name.trim().length < 3 || phone.replace(/\D/g, "").length < 10) {
      setError("Informe o CPF, o nome completo e o telefone para continuar.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/acceptances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), cpf: cpf.replace(/\D/g, ""), phone: phone.replace(/\D/g, "") }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result?.error || "Não foi possível registrar o aceite. Tente novamente.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setStep("success");
    } catch {
      setError("Não foi possível registrar o aceite. Tente novamente.");
      setLoading(false);
    }
  }
  if (step === "declined") return <main className="campaign-shell centered"><div className="quiet-panel"><span className="eyebrow">PAX RIO VERDE · APP</span><h1>Tudo bem!</h1><p>Agradecemos sua atenção e ficamos à disposição caso mude de ideia.</p><Logo /><ContactBanner /><button className="text-button" onClick={() => setStep("welcome")}>Voltar para a oferta</button></div></main>;
  if (step === "success") return <main className="campaign-shell centered"><div className="success-panel"><div className="success-icon"><Check /></div><span className="eyebrow">ACEITE REGISTRADO</span><h1>Pronto, {name.split(" ")[0]}.</h1><p>Seu desconto de 5% será aplicado mensalmente quando o pagamento for feito pelo app.</p><div className="app-install-panel"><div className="install-copy"><div><span className="eyebrow">COMO GANHAR 5% DE DESCONTO</span><ol className="install-steps"><li>Baixe o aplicativo Pax Rio Verde no seu celular.</li><li>Pague a sua mensalidade antes do dia do vencimento.</li></ol></div><p className="install-warning"><strong>Atenção:</strong> O desconto só vale para pagamentos feitos no aplicativo e antes do vencimento.</p></div><p className="install-links-label">Baixe o aplicativo pelos links abaixo:</p><div className="store-row"><a className="store-badge google" href="https://bit.ly/4zAPvs4" target="_blank" rel="noreferrer" aria-label="Disponível no Google Play"><span className="store-mark"><img src="/google.svg" alt="" /></span><span className="store-copy"><small>Disponível no</small><b>Google Play</b></span></a><a className="store-badge apple" href="https://bit.ly/4wHo2SU" target="_blank" rel="noreferrer" aria-label="Baixar na App Store"><span className="store-mark"><img src="/apple.svg" alt="" /></span><span className="store-copy"><small>Baixar na</small><b>App Store</b></span></a></div></div><Logo /></div></main>;
  if (step === "form") return <main className="campaign-shell centered"><div className="form-panel"><div className="form-top"><span className="eyebrow">ETAPA 02 / 02</span><LockKeyhole /></div><h1>Preencha seus dados<br />para o aceite.</h1><p className="muted">Usaremos estas informações somente para confirmar a alteração do seu pagamento.</p><form onSubmit={submit}><label>CPF <input required value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" /></label><label>Nome completo do titular <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Como no seu plano" /></label><label>Telefone <input required aria-invalid={phoneHasError} className={phoneHasError ? "field-error" : ""} value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(XX) XXXXX-XXXX" inputMode="tel" /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={loading}>{loading ? "ENVIANDO..." : "ENVIAR ACEITE"}</button><ContactBanner /></form><Logo /></div></main>;
  return <main className="campaign-shell"><header className="campaign-header"><Logo /><span className="secure"><LockKeyhole size={14} /> ambiente seguro</span></header><section className="hero-grid"><div className="hero-copy"><span className="eyebrow">UMA NOVA FORMA DE CUIDAR</span><h1>Economize <mark>5%</mark> na sua mensalidade.</h1><p>Altere agora a forma de pagamento para o aplicativo e aproveite o desconto todos os meses. É fácil e rápido.</p><p className="discount-notice">Atenção ao prazo!<br />Para garantir seus 5% de desconto, o pagamento precisa ser feito <strong>pelo aplicativo</strong> e <strong>antes do dia do vencimento</strong>.</p><div className="hero-actions"><button className="primary-button" onClick={() => setStep("form")}>Sim, aceito</button><button className="secondary-button" onClick={() => setStep("declined")}>Não, obrigado</button></div><div className="trust"><ShieldCheck size={17} /><span>Pagamento protegido e confirmação instantânea</span></div></div><PhoneMockup /></section><section className="benefit-section"><div className="section-label"><p>Mais vantagens para você</p></div><Benefits /></section><ContactBanner /><footer><span>© Pax Rio Verde</span><span>Seu plano, mais simples.</span></footer></main>;
}
