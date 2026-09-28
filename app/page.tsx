"use client";

import { Check, Gift, LockKeyhole, MessageCircle, Phone, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import { FormEvent, useState } from "react";
import Turnstile from "./Turnstile";

type Step = "welcome" | "declined" | "form" | "success";
const whatsappLink = `https://wa.me/556492331101?text=${encodeURIComponent("Olá, gostaria de saber mais sobre o aplicativo Pax Rio Verde.")}`;
function Logo() { return <Image className="brand-logo" src="/logo-pax.png" alt="Pax Rio Verde 30 anos" width={150} height={70} />; }
function PhoneMockup() { return <div className="phone-wrap"><Image src="/celular-pax.png" alt="Campanha do aplicativo Pax Rio Verde" fill priority sizes="(max-width: 760px) 100vw, 52vw" /></div>; }
function Benefits() { return <div className="benefits"><div><Gift /><b>Benefícios exclusivos</b><span>Condições especiais para você</span></div><div><ShieldCheck /><b>Cartão gratuito</b><span>Pelo app até dezembro de 2026</span></div><div><Sparkles /><b>Acompanhe informações</b><span>Tenha tudo na palma da mão</span></div></div>; }
function ContactBanner() { return <div className="info-contact"><div className="info-contact-copy"><span className="eyebrow">MAIS INFORMAÇÕES</span><p>Entre em contato com nossa equipe e tire todas as dúvidas.</p></div><a className="whatsapp-button" href={whatsappLink} target="_blank" rel="noreferrer"><MessageCircle size={18} />Falar no WhatsApp</a></div>; }
const maskCpf = (value: string) => value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const maskPhone = (value: string) => value.replace(/\D/g, "").slice(0, 11).replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");

export default function Home() {
  const [step, setStep] = useState<Step>("welcome"); const [cpf, setCpf] = useState(""); const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [captchaToken, setCaptchaToken] = useState("");
  const captchaEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const phoneHasError = Boolean(error && phone.replace(/\D/g, "").length < 10);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (cpf.replace(/\D/g, "").length !== 11 || name.trim().length < 3 || phone.replace(/\D/g, "").length < 10) {
      setError("Informe o CPF, o nome completo e o telefone para continuar.");
      return;
    }

    if (captchaEnabled && !captchaToken) {
      setError("Confirme que você não é um robô para continuar.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/acceptances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), cpf: cpf.replace(/\D/g, ""), phone: phone.replace(/\D/g, ""), captchaToken }),
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
  if (step === "success") return <main className="campaign-shell centered"><div className="success-panel"><div className="success-icon"><Check /></div><span className="eyebrow">ACEITE REGISTRADO</span><h1>Pronto, {name.split(" ")[0]}.</h1><p>Seu desconto de 5% será aplicado mensalmente quando o pagamento for feito pelo app.</p><div className="app-install-panel"><div className="install-copy"><div><span className="eyebrow">COMO GANHAR 5% DE DESCONTO</span><ol className="install-steps"><li>Baixe o aplicativo Pax Rio Verde no seu celular.</li><li>Pague a sua mensalidade antes do dia do vencimento.</li></ol></div><p className="install-warning"><strong>Atenção:</strong> O desconto só vale para pagamentos feitos no aplicativo e antes do vencimento.</p></div><p className="install-links-label">Baixe o aplicativo pelos links abaixo:</p><div className="store-row"><a className="store-badge" href="https://play.google.com/store/apps/details?id=br.com.paxrioverde.app" target="_blank" rel="noreferrer" aria-label="Disponível no Google Play"><svg className="store-glyph" viewBox="0 0 26 28" aria-hidden="true"><path d="M1.3 0.7C1.05 0.98 0.9 1.4 0.9 1.96V26.04C0.9 26.6 1.05 27.02 1.32 27.28L1.41 27.36L14.95 13.82V13.64V13.46L1.41 -0.08L1.3 0.7Z" fill="#00E3FF"/><path d="M19.93 18.29L14.95 13.82V13.64V13.46L19.94 8.48L20.05 8.55L25.95 11.9C27.64 12.85 27.64 14.42 25.95 15.38L20.05 18.73L19.93 18.29Z" fill="#FFC107"/><path d="M20.05 18.73L14.95 13.64L1.3 27.28C1.86 27.87 2.77 27.94 3.81 27.36L20.05 18.73Z" fill="#FF3D47"/><path d="M20.05 8.55L3.81 -0.08C2.77 -0.66 1.86 -0.59 1.3 0L14.95 13.64L20.05 8.55Z" fill="#00D26A"/></svg><span className="store-text"><small>DISPONÍVEL NO</small><strong>Google Play</strong></span></a><a className="store-badge" href="https://apps.apple.com/br/app/pax-rio-verde/id6762223686" target="_blank" rel="noreferrer" aria-label="Baixar na App Store"><svg className="store-glyph" viewBox="0 0 24 28" aria-hidden="true"><path d="M19.6 21.3c-0.35 0.81-0.77 1.56-1.26 2.25-0.67 0.94-1.22 1.6-1.64 1.96-0.65 0.6-1.35 0.91-2.1 0.93-0.54 0-1.19-0.15-1.94-0.47-0.75-0.31-1.44-0.46-2.08-0.46-0.66 0-1.37 0.15-2.13 0.46-0.76 0.32-1.37 0.48-1.84 0.5-0.72 0.03-1.43-0.29-2.14-0.96-0.46-0.39-1.03-1.08-1.72-2.06-0.74-1.05-1.34-2.27-1.82-3.66-0.51-1.5-0.76-2.96-0.76-4.37 0-1.62 0.35-3.01 1.05-4.18 0.55-0.94 1.28-1.68 2.2-2.22 0.92-0.54 1.91-0.82 2.98-0.84 0.57 0 1.32 0.18 2.26 0.53 0.94 0.35 1.54 0.53 1.8 0.53 0.2 0 0.87-0.21 2-0.62 1.07-0.38 1.97-0.54 2.71-0.48 2.01 0.16 3.52 0.95 4.52 2.39-1.8 1.09-2.69 2.62-2.67 4.58 0.02 1.53 0.57 2.8 1.66 3.81 0.49 0.47 1.04 0.83 1.65 1.09-0.13 0.38-0.27 0.75-0.43 1.11zM14.9 0.56c0 1.21-0.44 2.34-1.32 3.38-1.06 1.24-2.35 1.96-3.74 1.85-0.02-0.15-0.03-0.3-0.03-0.46 0-1.16 0.5-2.4 1.4-3.41 0.45-0.51 1.02-0.94 1.71-1.28 0.69-0.33 1.34-0.52 1.96-0.55 0.02 0.18 0.03 0.35 0.03 0.52z" fill="#fff"/></svg><span className="store-text"><small>BAIXAR NA</small><strong>App Store</strong></span></a></div></div><Logo /></div></main>;
  if (step === "form") return <main className="campaign-shell centered"><div className="form-panel"><div className="form-top"><span className="eyebrow">ETAPA 02 / 02</span><LockKeyhole /></div><h1>Preencha seus dados<br />para o aceite.</h1><p className="muted">Usaremos estas informações somente para confirmar a alteração do seu pagamento.</p><form onSubmit={submit}><label>CPF <input required value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" /></label><label>Nome completo do titular <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Como no seu plano" /></label><label>Telefone <input required aria-invalid={phoneHasError} className={phoneHasError ? "field-error" : ""} value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(XX) XXXXX-XXXX" inputMode="tel" /></label><Turnstile onToken={setCaptchaToken} />{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={loading}>{loading ? "ENVIANDO..." : "ENVIAR ACEITE"}</button><ContactBanner /></form><Logo /></div></main>;
  return <main className="campaign-shell"><header className="campaign-header"><Logo /><span className="secure"><LockKeyhole size={14} /> ambiente seguro</span></header><section className="hero-grid"><div className="hero-copy"><span className="eyebrow">UMA NOVA FORMA DE CUIDAR</span><h1>Economize <mark>5%</mark> na sua mensalidade.</h1><p>Altere agora a forma de pagamento para o aplicativo e aproveite o desconto todos os meses. É fácil e rápido.</p><p className="discount-notice">Atenção ao prazo!<br />Para garantir seus 5% de desconto, o pagamento precisa ser feito <strong>pelo aplicativo</strong> e <strong>antes do dia do vencimento</strong>.</p><div className="hero-actions"><button className="primary-button" onClick={() => setStep("form")}>Sim, aceito</button><button className="secondary-button" onClick={() => setStep("declined")}>Não, obrigado</button></div><div className="trust"><ShieldCheck size={17} /><span>Pagamento protegido e confirmação instantânea</span></div></div><PhoneMockup /></section><section className="benefit-section"><div className="section-label"><p>Mais vantagens para você</p></div><Benefits /></section><ContactBanner /><footer><span>© Pax Rio Verde</span><span>Seu plano, mais simples.</span></footer></main>;
}
