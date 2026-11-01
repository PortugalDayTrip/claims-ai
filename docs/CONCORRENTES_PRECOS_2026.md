# Benchmark de Preços — Concorrentes ClaimsAI (Nov 2026)
## O que as seguradoras pagam hoje por FNOL digital + IA de sinistros

> Objetivo: definir a nossa posição de preço para vender a seguradoras PT/EU.
> Todos os valores são estimativas de mercado (quase nenhum vendor publica preços — tudo "quote-based").

---

## 1. AI de avaliação de danos por foto/vídeo (o nosso core)

| Vendor | Modelo | Preço estimado | Notas |
|---|---|---|---|
| **Tractable** | Enterprise + per-assessment | **$50k–500k/ano**; ~$5–25 por claim; SEA: $8k–80k/mês | Líder global; mid-size ~€200–350k/ano típico; ROI em ~6 meses |
| **Snapsheet** | Per-claim | **$20–50/claim**; enterprise $10–25k/mês + fee | ~$50k–1.2M/ano conforme volume; estimativas EMS-compliant |
| **Bdeo** | Enterprise SaaS | quote-only; **£250–375 poupança/claim** (S&G case) | 70+ seguradoras, 30 países; EU-forte (Espanha) |
| **Claim Genius** | API REST | quote-only; **$0.50–3.50/claim scored** (faixa API-first) | GeniusINSPECT; <2s por análise; total-loss score |
| **Solera Qapter** | Licença + per-estimate | **€15–25/estimativa**; módulo €150–350/mês; RU: licença ~9.150₽+tarifas | Audatex standard DE/PT; VIN query ~€1.5–2 |
| **ControlExpert** | Per-Vorgang (por processo) | 3 tiers; 2 primeiros/mês grátis; invoice check per-case | DE/UK; PostMaster rede oficinas |
| **CCC Intelligent Solutions** | Enterprise | quote-only; tier-1 contracts | Standard US (OEM data + DRP network) |
| **Inter-est / Inter-cept** | Per-claim + licença | quote; claima ROI **8–30×** | UK; triage 98% accuracy, total-loss Inter-cede |
| **Snorkl** | Per-assessment | quote-only; early-stage | Total-loss AI rápido (foto → write-off signal) |
| **Verisk (XactAI/A-PLUS)** | Enterprise + DB fee | **$40–120k/ano** A-PLUS DB | Estimating de-facto US; weather verify |

## 2. Deteção de fraude (sinais → SIU)

| Vendor | Modelo | Preço estimado |
|---|---|---|
| **Shift Technology** | Enterprise license | **$400–900k/ano** mid-size; impl. $150–300k |
| **FRISS** | Enterprise modules | **$200–500k/ano**; impl. $100–250k |
| **SAS Fraud Mgmt** | Enterprise | **$500k–1.5M/ano** |
| **CLARA Analytics** | Per-claim/subscription | quote; claims-side AI (litigation + severity) |
| **Per-claim API vendors** | API | **$0.50–3.50/claim** — faixa de mercado |

## 3. Plataforma de gestão de sinistros completa (o destino das 8 camadas)

| Vendor | Modelo | Preço estimado |
|---|---|---|
| **Guidewire ClaimCenter/Cloud** | SaaS % prémio | **$3.2–8.4M/ano** suite; impl. $14–42M (24-36m) |
| **Duck Creek Claims** | SaaS subscrição | **$400k–2M/ano** claims; suite $2.4–6.4M |
| **EIS ClaimCore** | SaaS | quote-only; mid-market, MACH |
| **Five Sigma (Clive)** | Subscrição por volume | quote; AI-native claims platform |
| **Sutherland AI Hub** | **Per-decision** (novo modelo) | substitui FTE por "cost per claim decision" |
| **Liberate** | Per-resolution | quote; FNOL voice+email automation |
| **Majesco Claims** | SaaS | quote; mid-market US |

## 4. Serviços de estimativa/peritagem externa (o que a IA substitui)

| Serviço | Preço |
|---|---|
| **Audatex per-estimate (workshop fee)** | ~€15–25/transação + fotos |
| **Glassmatix** | £1.800/ano (5 users) + transmissão |
| **DAT SilverDAT** | €200–350/mês |
| **autoiXpert** | €150–250/mês |
| **Estimate services (human desk)** | £36–82/estimativa |
| **Peritagem presencial PT** | ~€80–150/visita (custos LAE tradicionais) |
| **Field adjuster visit (US)** | ~$100/claim custo LAE |

## 5. Document AI / workflow adjacente

| Vendor | Modelo | Preço |
|---|---|---|
| **Wisedocs** (docs médicos) | Enterprise | ~$0.20/página outcome; quote |
| **Hi Marley** (comunicação) | Per-user | £25–100k/ano |
| **Cape Analytics** (property) | Per-property | £30–150k/ano |
| **Gradient AI** | Enterprise | £75–250k/ano |
| **Akur8** (pricing) | Enterprise | £75–300k/ano |

---

## Análise — onde a ClaimsAI se posiciona

### O mercado tem 3 faixas claras

```
API-first per-claim     $0.5–3.5/análise      ← Claim Genius, fraud APIs
Mid-market platform     $50k–300k/ano          ← Tractable, Snapsheet, Bdeo
Enterprise suite        $400k–2M+/ano          ← Duck Creek, Shift, Guidewire
```

### A nossa vantagem estrutural

- **Modelos ONNX próprios** → custo de inferência ≈ €0 (Tractable cobra $5–25/claim porque gasta em compute+margin; nós podemos cobrar por claim quase puro lucro)
- **Stack completa FNOL+DAAA+CV+SLA** num só produto — concorrentes vendem cada camada separada (photo-AI ≠ workflow ≠ DAAA ≠ SLA-engine)
- **PT-first**: DL291/ASF built-in, DAAA nativo, e-SEGURNET ready — nenhum concorrente tem conformidade legal portuguesa
- **Deploy leve**: sem integração de 8 meses (Tractable) nem $14M de implementação (Guidewire)

### Pricing sugerido (posição de entrada agressiva)

| Tier | Preço | Conteúdo |
|---|---|---|
| **Pilot** | €5k–10k / 3 meses | 500 claims, 1 LOB, prova de ROI medida |
| **Per-claim** | **€1.50–4.00/análise IA** | abaixo da faixa API ($0.5–3.5) com value de workflow incluído |
| **Per-claim+workflow** | **€6–12/claim** (vs Snapsheet $20–50) | FNOL+DAAA+CV+triage+SLA completo |
| **Flat mid-market** | **€60–120k/ano** (vs Tractable €200–350k) | volume até ~30k claims |
| **Enterprise** | €150–250k/ano | unlimited + SLA + integrações + dedicado |

### O argumento de venda (ROI à seguradora)

- Peritagem presencial: ~€80–150/claim → IA a €2–12
- LAE redução: ~$100/claim (Snapsheet benchmark)
- Ciclo: 21 dias → 5 dias (Bdeo medido) → NPS + retenção
- Fraude: 15% detetado (Bdeo) — a €500 avg de leakage por caso evitado
- **Breakeven para a seguradora: ~20–50 claims/mês já compensa o tier flat**

### Gaps honestos vs concorrentes

- Rede de oficinas/peritos (ControlExpert PostMaster, Audatex DRP) — não temos
- Dados de estimativa linha-a-linha OEM (Qapter/Audatex) — temos bandas PT, não line-items
- Total-loss valuation integrada (Inter-cede, Solera) — sinal, não valuation
- Prova em produção (Bdeo: −16% custos medidos) — precisamos do piloto com números próprios
