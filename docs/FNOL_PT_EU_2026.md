# FNOL Portugal / UE 2026 — Requisitos legais, normas e inovações
## Estudo aplicado ao ClaimsAI (estado: Outubro 2026)

Fontes: ASF, DL 291/2007, NR 7/2022-R, Reg. (UE) 2024/1689 (AI Act) + Reforma "Omnibus" (Reg. UE 2026/1744), RGPD, Diretiva (UE) 2019/882 (EAA), Reg. (UE) 2022/2554 (DORA), eIDAS + DL 12/2021, ICBC/State Farm/CIC imaging guidelines, e-SEGURNET (APS).

---

## 1. Enquadramento legal português — a participação em si

### 1.1 Prazo de participação — DL 291/2007, art. 34.º
- O segurado **tem 8 dias** (máximo) a contar da ocorrência ou do conhecimento para comunicar o sinistro, sob pena de responder por perdas e danos.
- Deve fornecer **todas as indicações e provas documentais/testemunhais** relevantes para a determinação das responsabilidades.
- Obrigação de **mitigar** as consequências do sinistro.
- **Implicação no app:** o countdown dos 8 dias é dado ao cliente; o app deve reforçar "participe o quanto antes" e registar `incidentDate` vs `createdAt` — a nossa auditoria já avisa quando a data do incidente é > 60 dias.

### 1.2 Forma da participação — DL 291/2007, art. 35.º
- Participação válida por "impresso próprio" **ou qualquer outro meio de comunicação sem presença física simultânea, desde que fique registo escrito ou gravado** — o portal digital é uma forma legalmente válida.
- Campos considerados **indispensáveis** estão definidos por norma regulamentar (modelo DAAA).
- **Participação assinada por ambos os condutores → presunção legal** das circunstâncias descritas (salvo prova em contrário).
- **Implicação:** a nossa participação digital + audit trail cumpre o "registo escrito". Falta-nos: campos DAAA estruturados no ramo automóvel.

### 1.3 DAAA / e-SEGURNET (benchmark nacional)
A app e-SEGURNET (APS) mostra o padrão que o mercado PT já conhece:
- **Pré-preenchimento** de dados pessoais, veículo e seguro.
- **Geolocalização** do local do acidente.
- **Fotos** capturadas no momento.
- **Esboço do acidente** (croqui — ainda não temos; oportunidade).
- **Assinatura por SMS OTP** — código enviado ao telemóvel funciona como assinatura de ambos os intervenientes.
- **QR code** para transferir dados pré-preenchidos do outro interveniente.
- **Feridos não excluem** o canal digital — preenchem-se dados adicionais dos feridos (equivalente ao verso da DAAA).
- Resumo enviado por **SMS + email PDF** antes da assinatura — ambos validam.
- Só para veículos segurados em Portugal — matrícula estrangeira → DAAA papel.
- **Implicação:** o nosso FNOL já pede feridos/terceiro/testemunhas/auto policial. Próximos passos naturais: geolocalização automática no browser (`navigator.geolocation`), captura de matrícula com lookup, e opção "ambos os condutores" para a presunção do art. 35.º/3.

### 1.4 Plataforma GPS — Fundo de Garantia Automóvel
- Se o terceiro não tem seguro/não identificado → participação ao FGA via plataforma GPS (gerida pela ASF).
- **Implicação:** pergunta FNOL "o outro veículo tem seguro identificado?" → se não, redirecionar/informar sobre o FGA.

---

## 2. ASF — prazos e conduta de mercado

### 2.1 Recomendação ASF (regularização multirriscos habitação)
- **4 dias úteis** para o primeiro contacto da seguradora com o segurado após receção da participação.
- **25–40 dias úteis** (consoante coberturas) para comunicar se assume responsabilidade e o valor reconhecido.
- Suspensão permitida por suspeita de fraude fundamentada ou impossibilidade de contacto.
- Obrigação de **informação pré-contratual** sobre procedimentos e prazos médios, publicada no site.
- **Implicação:** o nosso SLA_HOURS por estado já espelha esta lógica; a "primeira notificação ao cliente" (acknowledgement) deve ser imediata — está feito (`.eml` outbox). Falta: expor prazos ao cliente no portal ("previsão de resposta").

### 2.2 NR 7/2022-R — Gestão de reclamações (obrigatório)
- Reclamações por escrito em **suporte duradouro**, preferencialmente digital.
- Conteúdo mínimo: nome, qualidade (tomador/segurado/terceiro lesado), contactos, nº doc. identificação, descrição dos factos, data/local.
- **Resposta completa e fundamentada em máx. 20 dias úteis**, em linguagem clara.
- Função autónoma de gestão de reclamações (Gestor de Reclamações) identificada.
- Site deve ter separador "Informações relevantes para o cliente" com meios de reclamar, Livro de Reclamações Eletrónico, Provedor, ASF.
- **Implicação:** o portal do cliente devia ter link "Apresentar reclamação" visível + texto de resposta com fundamentação quando rejeitado. Hoje temos apenas upload extra — falta canal de reclamação.

---

## 3. RGPD — o regime que mais pesa no FNOL

### 3.1 Art. 22 — decisões automatizadas
- O cliente tem direito a **não ser sujeito a decisão exclusivamente automatizada** com efeitos jurídicos/significativos — recusar um pedido de indemnização é claramente "similarly significant".
- Obrigações mesmo quando a decisão é assistida:
  - informar sobre a existência de lógica automatizada, significância e consequências previstas (arts. 13/14/15);
  - **intervenção humana efetiva** (a AEPD exige: competência para alterar, formação, independência/diligência, meios);
  - direito a **exprimir o seu ponto de vista** e a **obter explicação** da decisão;
  - medidas para corrigir erros e evitar discriminação.
- **Implicação:** a nossa arquitetura "IA recomenda → perito decide" é o modelo correto. O disclosure no portal já existe. Reforçar: o perito tem de poder **alterar** o resultado (já temos overrideReason); o cliente tem de poder "exprimir o seu ponto de vista" — o upload extra cobre parcialmente; falta um canal explícito "pedir revisão humana".

### 3.2 Dados de saúde — art. 9.º RGPD ⚠️
- "Alguém ficou ferido?" + detalhe da lesão = **dados de saúde, categoria especial** — exige fundamento específico (art. 9.º/2, provável: interesses legítimos de seguradora + norma legal) e informação ao titular.
- **Implicação:** o campo `injuryDetail` deve ser minimizado (sem pedir diagnóstico), o aviso de privacidade deve mencionar dados de saúde, e a auditoria não deve expor conteúdo clínico em logs.

### 3.3 Minimização e retenção
- Recolher apenas o necessário por fase (FNOL mínimo → evidência → complementos) — já o fazemos por etapas.
- Fotos com EXIF/GPS = dados pessoais; o cliente deve saber que são usados para verificação de fraude.
- Prazo de retenção e direitos (acesso/apagamento) devem constar no aviso — **falta página/aviso de privacidade no app**.

---

## 4. AI Act — o calendário revisto (Omnibus, Reg. UE 2026/1744)

| Obrigação | Data | Situação no ClaimsAI |
|---|---|---|
| Práticas proibidas + literacia IA | em vigor desde fev/2025 | ✅ |
| **Transparência art. 50** — declarar que o cliente interage/analisa com IA; marcar conteúdo sintético | **2 agosto 2026 — JÁ EM VIGOR** | ⚠️ parcial: disclosure existe; falta aviso quando IA "fala" com o cliente |
| Marcação de conteúdo sintético (sistemas anteriores) | 2 dez 2026 | n/a (não geramos conteúdo sintético) |
| **Alto-risco Anexo III** — avaliação de risco/preço em seguros de vida e saúde de pessoas singulares | **2 dez 2027** | ⚠️ se um dia a IA influenciar decisão sobre danos corporais → tratar como candidato a alto-risco |
| Alto-risco em produtos regulados (Anexo I) | 2 ago 2028 | n/a |

### Nuance crítica
- **Tratamento de sinistros não é, por si, alto-risco** — Anexo III 5(c) cobre avaliação de risco e *pricing* em vida/saúde. Leitura de relatórios/fotos para recomendação = abaixo do limiar, **mas** a transparência aplica-se já.
- Interação design > data science: o trabalho é disclosure, registo de eventos IA (já temos `actor: 'ai'` na auditoria ✅) e informação ao titular.

---

## 5. European Accessibility Act — em vigor desde 28 jun 2025

- Cobre **serviços financeiros ao consumidor por canal digital**: portais de sinistros, formulários, tracking e contratos digitais têm de cumprir WCAG AA (EN 301 549) — percetível, operável, compreensível, robusto.
- Concretamente no app:
  - formulários com **labels descritivas** associadas (fazemos parcialmente);
  - **navegação por teclado** completa (segmented controls, uploads, wizard);
  - **contraste AA** (os cinzas #8e8e93 sobre #F5F5F7 precisam verificação — ratio ~3.5:1, pode falhar AA para texto normal);
  - informação em **dois canais sensoriais** para instruções críticas;
  - microempresas isentas, mas para uma seguradora não se aplica.
- **Implicação:** auditoria de contraste nos tokens cinza + `aria-label`s no stepper/fotos. Trabalho pendente.

## 6. DORA — em vigor desde 17 jan 2025

- O canal FNOL é um **serviço digital ao cliente** → está dentro da resiliência operacional da seguradora.
- Obrigações relevantes: gestão de risco TIC, teste de resiliência, **reporte de incidentes maiores** (notificação inicial/intermédia/final nos templates UE 2025/301-302) e gestão de terceiros TIC (o nosso serviço ONNX/Ollama e storage entram no registo de informação — ROI).
- **Implicação:** se ClaimsAI for subcontratado por uma seguradora, ela deve registar-nos como fornecedor TIC; logs de uptime/incidentes ajudam o dever de reporte.

## 7. eIDAS + DL 12/2021 — valor probatório do que o cliente envia

- Documento eletrónico satisfaz forma escrita; **assinatura qualificada (QES) = autógrafa**; assinatura avançada (AdES) preserva integridade detetável.
- SMS OTP (estilo e-SEGURNET) é assinatura simples — admissível e eficaz na prática, valor apreciado nos termos gerais (não presume identidade, mas o **conjunto token+OTP+audit trail+hash sha256** é probatório forte).
- eIDAS art. 25: nenhuma assinatura eletrónica é rejeitada só por não ser qualificada.
- **Implicação:** já fazemos `sha256` por ficheiro + audit trail assinado com timestamp — a base probatória está certa. Melhoria: selo temporal qualificado futuro (TSA) nos eventos críticos.

## 8. Padrões internacionais de evidência fotográfica (ICBC/State Farm/CIC)

Checklist ICBC (referência do setor) vs os nossos 9 slots:

| ICBC exige | ClaimsAI |
|---|---|
| VIN (dash ou porta) | ✅ `vin` |
| 4 cantos do veículo | ✅ 4 slots corner_* |
| Dano — geral + close-up | ✅ `damage_wide` + `damage_close` |
| Odómetro | ✅ `odometer` |
| Matrícula visível | ✅ `plate` |
| Interior / dash (incl. luzes de aviso) | ❌ falta `interior` |
| Telhado / emblemas | ❌ parcial |
| Zona do acidente | ✅ `scene` (implícito — slot `other`) |
| Danos não relacionados (unrelated) | ⚠️ parcial — `preExisting` na análise |
| Escala/objeto de referência (yardstick) | ❌ dica: pedir "objeto de referência" na close-up |

**Extras identificados:**
- Instruir "parar em superfície plana e bem iluminada" — dica na UI.
- Não voltar ao local se já saiu — segurança primeiro.
- Dash warning lights ligadas (ligar a ignição para a foto do odómetro).

## 9. Inovações FNOL 2026

- **Guided intake > free-form**: pergunta estruturada por ramo (já implementado); dados machine-readable desde o início, não notas de call center.
- **Voice/omnicanal + fallback humano**: quem não consegue digital precisa de via alternativa (recomendação Actec/Callsy: clientes vulneráveis encaminhados a humano < 60s).
- **Triagem de urgência no intake**: feridos/fatalidade/perigo ativo → escalonamento imediato, script aprovado, não avaliar medicamente (já forçamos `manual_review` + flag).
- **Clientes vulneráveis**: deteção de sinais (confusão, repetição, luto recente, incapacidade) + registo + rota preferencial.
- **Pré-preenchimento**: policy lookup, matrícula → dados do veículo (SIMI/fichas técnicas).
- **Notificações proativas**: "próximo passo" + previsão de tempo — reduz chamadas (J.D. Power: comunicação é o driver nº1 de satisfação).
- **Fotos com instruções em tempo real** (guidance overlay tipo CCC/Tractable — feedback de qualidade antes do envio; já fazemos quality flags no servidor, falta feedback ao vivo).
- **e-SEGURNET-style co-signing**: QR do outro condutor, validação mútua antes de submeter.

---

## 10. Gap analysis — o que falta ao ClaimsAI

### Já implementado ✅
- Participação digital iniciada pelo cliente (art. 35.º — registo escrito).
- FNOL guiado: feridos→manual_review, reboque/rental, VIN, odómetro, terceiro, testemunhas, auto policial, contacto preferido.
- 9 slots fotográficos inspirados nos standards (4 cantos + dano×2 + VIN + odómetro + matrícula).
- Audit trail imutável com atores (ai/perito/sistema/cliente) e sha256 por evidência.
- Disclosure EU AI Act no portal + override humano com razão.
- SLA por estado alinhado com a lógica ASF.
- Acknowledgement imediato por email (outbox local).

### Faltas (por prioridade)
| # | Falta | Base legal/prática | Esforço |
|---|---|---|---|
| 1 | **Aviso de privacidade** no FNOL/portal (dados de saúde, EXIF, retenção, direitos) | RGPD arts. 9/13 | S |
| 2 | **"Pedir revisão humana" / canal de reclamação** no portal + link Livro de Reclamações | RGPD art. 22; NR 7/2022-R | S |
| 3 | **Contraste/keyboard/ARIA** nos tokens cinza, stepper, wizard | EAA/WCAG AA | M |
| 4 | **Geolocalização** do acidente (opt-in browser GPS) | e-SEGURNET benchmark | S |
| 5 | Slot **interior/dash** + instrução "luzes de aviso + escala de referência" | ICBC/State Farm | S |
| 6 | **Prazo esperado ao cliente** (previsão de resposta no portal) | Recomendação ASF | S |
| 7 | **Campos DAAA estruturados** (ramo auto: circunstâncias checkbox, croqui) | DL 291/2007 art. 35 | M |
| 8 | **Terceiro sem seguro → FGA** (ramo de encaminhamento) | GPS/FGA | S |
| 9 | **Assinatura SMS OTP** na submissão FNOL | eIDAS simples + benchmark e-SEGURNET | M |
| 10 | **Countdown 8 dias** / aviso de prazo de participação | DL 291/2007 art. 34 | XS |
| 11 | Via **não-digital** documentada (voz/agente) + flag vulnerável | Best practice 2026 | M |
| 12 | **Selo temporal qualificado** nos eventos críticos | eIDAS TSA (provatório++) | M |
| 13 | **Feedback de qualidade ao vivo** na captura (antes do upload) | Tractable/CCC guidance | M |

### Risco de conformidade a corrigir já
- `injuryDetail` guarda texto livre de saúde → adicionar aviso RGPD art. 9 e minimizar copy ("descreva quem ficou ferido, não diagnósticos").
- Cinzas #8e8e93 nos textos pequenos podem falhar WCAG AA → rever ratio e escurecer labels secundárias.
- Disclosure IA: garantir que aparece **antes** da primeira interação (FNOL) e não só no portal.
