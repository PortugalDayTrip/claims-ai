# Peritagem 2026 — Inovações para ajudar o perito a ver, reduzir risco e fraude

> Pesquisa: 30 out 2026. Perspetiva do perito (adjuster): *"o que me falta para
> decidir melhor e mais depressa, sem risco de erro nem fraude a passar?"*
> Benchmark: Truepic Vision, Attestiv, Verisk ClaimSearch/Digital Media Forensics,
> CCC IX, Tractable, Claim Genius, omni:us Agentic Co-Pilot, CLARA analytics,
> Sedgwick Sidekick, LexisNexis Flyreel/Claims Datafill, Complete iQ Inspect,
> VentaVid, InspectCapture, DWF TIA (Telematics Interpretation), Progressive+CMT,
> e-SEGURNET (APS, Portugal). Milliman: fraude GenAI motor insurance.

---

## 1. O problema do perito em 2026

O perito digital passou a decidir **à distância**, com base em prova recolhida pelo
segurado. Isso cria três lacunas:

1. **Qualidade da prova** — fotos tortas, escuras, incompletas; ângulos em falta;
   vídeo sem contexto. Resultado: pedido de repetição, atraso, inspeção física.
2. **Autenticidade** — fotos reutilizadas de sinistros anteriores, tiradas da
   internet, editadas, screenshots de ecrã, e cada vez mais **imagens 100%
   geradas por IA**. Milliman (2025): humanos detetam deepfakes de danos
   automóveis com ~50% de precisão — **aleatório**. Ferramentas off-the-shelf
   falham contra modelos novos.
3. **Contexto** — a foto não diz se o veículo estava ali naquela data, se chovia,
   se a velocidade plausível corresponde ao dano, se o mesmo veículo já teve
   sinistro noutra seguradora, se a cobertura estava em vigor.

A resposta do mercado: **captura autenticada + forense automático + enriquecimento
de dados + copiloto agentivo**, tudo com decisão final humana.

---

## 2. Inovações — lista consolidada por tema

### A. Captura guiada (a prova nasce certa)

| # | Inovação | Referência | O que muda para o perito |
|---|----------|-----------|--------------------------|
| A1 | **Walk-around vídeo guiado** — o cliente filma uma volta completa ao veículo com instruções sobrepostas durante a gravação | VentaVid, Genius360, Flyreel | Contexto contínuo; impossível "esquecer" um ângulo; dano não-fotografado fica visível |
| A2 | **Verificação de qualidade ao vivo** — blur/exposição/distância/enquadramento na câmara antes de enviar ("retire a foto") | Complete iQ Inspect, Truepic | Zero retakes por qualidade; menos idas-e-vindas |
| A3 | **Deteção do motivo certo** — IA confirma "isto é mesmo a porta direita" vs foto errada no slot | iQ Inspect | Fotos corretas no slot correto |
| A4 | **Narração por voz durante a captura** → transcrição automática pesquisável ("fuga de água", "ruído metálico") | VentaVid (speech-to-text por pergunta) | Narrativa rica sem escrever; busca por palavra-chave no áudio |
| A5 | **Escala/referência** — moeda, cartão, ou overlay AR de medida conhecida na foto | Prática padrão forense | Dano quantificável (comprimento, profundidade aproximada) |
| A6 | **Vídeo + frames extraídos** (já implementado aqui) + **seleção do melhor frame por nitidez** | Nosso wizard + melhoria | Menos trabalho a escolher frames |
| A7 | **360°/LiDAR (ramo habitação)** — planta à escala, fotos pinadas ao modelo, medições remotas | InspectCapture, Flyreel | Revisitar o local sem nova deslocação; medir distâncias |
| A8 | **Capture offline** com fila e sync | InspectCapture | Zonas sem rede (garagens, serra) não perdem prova |
| A9 | **Retake direcionado** — "a foto 5 não mostra a matrícula; refaça só essa" com o mesmo link | VentaVid | Um pedido = uma foto; sem repetir o fluxo inteiro |
| A10 | **Sufficiency score** — "set completo: 8/8 ângulos, 2 retakes, VIN lido" no topo do relatório do perito | iQ Inspect | Sabe em 3s se pode decidir ou falta prova |

### B. Autenticidade e prova forense

| # | Inovação | Referência | O que muda para o perito |
|---|----------|-----------|--------------------------|
| B1 | **Captura autenticada** — selo no momento da foto: device, hora, GPS verificado, sem possibilidade de upload de galeria | Truepic Vision (50+ checks), Attestiv | Prova "born trusted" vs prova submetida |
| B2 | **Análise de metadados EXIF** — timestamp vs data do sinistro, GPS vs local declarado, modelo do dispositivo, sinais de edição | Shift Technology, Attestiv | Flag automático "foto de 2024" ou "local errado" |
| B3 | **Error Level Analysis (ELA)** — deteta zonas coladas/retocadas | Shift, FotoForensics | "O amassado foi adicionado digitalmente" |
| B4 | **Deteção de deepfake/imagem gerada** — modelos forenses (Illuminarty, Hive, C2PA provenance) | Verisk, Milliman | Essencial pós-2025; humanos já não detetam |
| B5 | **Hash perceptual (pHash) — duplicados** — a foto é igual a uma de outro sinistro (interno ou cross-carrier tipo ClaimSearch Images) | Verisk ClaimSearch | "Esta foto já foi usada no sinistro de março" |
| B6 | **Reverse image search / internet duplication** | Verisk, Google Lens | Foto descarregada da web passada como prova |
| B7 | **Deteção de foto-de-ecrã** — moiré, bezels, resolução anómala | Attestiv | Flag "fotografaram um ecrã, não a cena" |
| B8 | **Before/after comparison** — fotos de inspeção de apólice vs sinistro; IA separa dano pré-existente (UPD) | Claim Genius GeniusInspect | "Este arranhão já existia na inspeção de entrada" |
| B9 | **C2PA / provenance chain** — verificação de cadeia de custódia do ficheiro | OpenAI/Adobe C2PA, Truepic | Origem criptograficamente verificável |
| B10 | **PDF/fatura forense** — recibos e orçamentos alterados, fontes inconsistentes, totais adulterados | Verisk PDF check | Fraude documental além da foto |
| B11 | **Hash blockchain/selo temporal** — fingerprint do ficheiro no envio, verificável depois | Attestiv fingerprint | Prova imutável em disputa judicial |
| B12 | **Replay/reenactment check** — dois envios com a mesma foto re-submetida como "nova" | Attestiv | Distingue envio original de re-upload |

### C. Enriquecimento automático de dados

| # | Inovação | Referência | O que muda para o perito |
|---|----------|-----------|--------------------------|
| C1 | **VIN decode + leitura OCR** — matrícula/VIN lidos das fotos, comparados com a apólice | iQ Inspect ("VIN matches claim"), Verisk | O veículo é mesmo o segurado; specs para peças |
| C2 | **Verificação de matrícula/seguro** — 3º veículo tem seguro válido? (PT: base FGA/GPS; EU: MIB/Green Card) | Verisk Coverage Identifier, e-SEGURNET | Encaminhamento FGA automático; 3º identificado |
| C3 | **Meteorologia do dia/local** — chuva, granizo, cheia, vento na data+GPS declarados | Padrão em propriedade | "Alega granizo mas não choveu nesse dia" |
| C4 | **Mapa do local + contexto** — cruzamento, sinais, visibilidade, sentidos de trânsito no esboço DAAA | DWF TIA (Google Earth overlay) | Plausibilidade da narrativa vs geometria da via |
| C5 | **Histórico de sinistros** — mesmo segurado/veículo/telefone noutros sinistros (cross-carrier ClaimSearch) | LexisNexis Claims Datafill | "5 sinistros em 2 anos" — sinal de rede |
| C6 | **Registos de propriedade** — o condutor é o segurado? o veículo mudou de dono há 3 dias? | Verisk Registered Owner | "Vendeu o carro e depois 'teve um acidente'" |
| C7 | **Cobertura em vigor na data** — apólice ativa, cancelamento próximo do sinistro, apólice nova <30 dias | Verisk alerts | Fraude de timing; cobertura confirmada ao FNOL |
| C8 | **Alertas de política** — múltiplas apólices, sinistro em janela de início/cancelamento | Verisk Coverage Identifier | Flags automáticos de risco |

### D. Telemática e reconstrução

| # | Inovação | Referência | O que muda para o perito |
|---|----------|-----------|--------------------------|
| D1 | **Crash reconstruction** — G-force pico, velocidade, ângulo de impacto, trajetória, local exato | DWF TIA (12 métricas, PDF de 8pp), Redtail | Dano compatível com a física do impacto? |
| D2 | **LVI / biomecânica** — correlação pico-G ↔ probabilidade de lesão (whiplash plausível?) | DWF TIA major-injury detection | Triagem lesões real vs "cervical inventada" |
| D3 | **Auto-FNOL por deteção de crash** — telemática/smartphone dispara contacto proativo | Progressive + CMT (1,5M segurados) | Participação aberta antes do cliente ligar |
| D4 | **Simulação 3D da trajetória** — o perito "revê" a viagem em Google Earth/3D | DWF TIA | Compreensão espacial sem ir ao local |
| D5 | **Dashcam/OEM data** — vídeo do próprio veículo, sensores ADAS, dados CAN | Connected-car OEM | Prova primária, não dependente do cliente |

### E. Copiloto do perito (agentic AI)

| # | Inovação | Referência | O que muda para o perito |
|---|----------|-----------|--------------------------|
| E1 | **Resumo do dossiê** — fatos-chave, timeline, inconsistências extraídas de todo o ficheiro | Sedgwick Sidekick, omni:us Co-Pilot, Enlyte MRS | Abrir o caso = briefing pronto em 30s |
| E2 | **Next-best-action** — "o que falta: foto do VIN, depois decide" com razão explicável | CLARA agentic reasoning, omni:us | Cada recomendação com cláusula/fato ao lado |
| E3 | **Sinistros similares** — "12 casos iguais resolveram-se assim, média €X" | CLARA similar claims | Benchmark instantâneo da decisão |
| E4 | **Previsão de severidade/total loss** — probabilidade a partir das fotos + contexto | Claim Genius (total loss <3 min), CCC | Triage imediato: fast-track vs peritagem física |
| E5 | **Previsão de lesão** — padrões de dano → risco de reclamação corporal emergente | CCC injury prediction, DWF | Intervenção precoce nos casos que vão escalar |
| E6 | **Sumarização médica/legal** — relatórios de 2000+ páginas → epicrisis, ICD, cronologia | Verisk Claims Agent, Enlyte MRS | Horas de leitura → minutos de verificação |
| E7 | **Subrogação / recuperação** — detetar responsabilidade do 3º e gerar a demanda | CCC subrogation | Não perder recuperação por falta de atenção |
| E8 | **Reservas sugeridas** — range de custo com base em sinistros similares + dano visível | Sedgwick reserve suggestions | Reserva informada no dia 1 |
| E9 | **Deteção de inconsistências** — narrativa vs fotos vs datas vs circunstâncias | omni:us coverage review, GenAI cross-check | "Disse colisão frontal, dano é lateral" |
| E10 | **Sufficiency review antes do perito** — IA confirma set completo, VIN, ângulos, e flaga gaps | iQ Inspect sufficiency | Só chega ao perito o que está pronto |
| E11 | **Express triage** — sinistros simples ordenados por regras (severidade menor + set completo + VIN OK → desk settlement) | iQ Express | Perito foca onde o juízo humano importa |
| E12 | **Feedback loop** — perito marca "missed damage" → modelo melhora | Claim Genius active feedback | O sistema aprende com cada correção |

### F. Redes de fraude e padrões

| # | Inovação | Referência | O que muda para o perito |
|---|----------|-----------|--------------------------|
| F1 | **Link analysis** — mesmo telefone/morada/oficina/condutor em vários sinistros | Verisk SIU network, Deloitte | Anéis organizados visíveis numa imagem |
| F2 | **Scoring de fraude no FNOL** — score em tempo real na admissão, routing para SIU | Shift, Verisk predictive scoring | Triage imediato, não descoberta tardia |
| F3 | **Staged-accident signals** — múltiplos intervenientes ligados, padrão "cash for crash" | Verisk cross-carrier | Sinais compostos que humano não junta |
| F4 | **Monitorização contínua** — alerta se o veículo/pessoa aparece noutro sinistro depois | Verisk VIN Monitoring | O caso reabre sozinho quando surgir ligação |
| F5 | **Simulação de provider** — oficinas/médicos com padrão anómalo de faturação | Deloitte simulation models | Overbilling e serviços desnecessários |

### G. Portugal / UE específico

| # | Inovação | Referência | O que muda para o perito |
|---|----------|-----------|--------------------------|
| G1 | **e-SEGURNET integração** — importar participação DAAA digital, esboço, assinatura SMS | APS e-SEGURNET | DAAA validada entra direta no dossiê |
| G2 | **QR Carta Verde** — importar dados de apólice por QR do documento | e-SEGURNET QR | Zero transcrição manual de dados de apólice |
| G3 | **Encaminhamento FGA automático** — terceiro sem seguro → fluxo Fundo de Garantia | Nosso checkbox + workflow | Rota automática sem email manual |
| G4 | **DAAA verso** — informação adicional estruturada quando há feridos | e-SEGURNET verso | Dados de lesão estruturados, não prosa |

---

## 3. O que já temos vs o que falta — mapeado ao stack atual

**Stack:** Next.js 14 · TypeScript · ONNX client-side (damage-detect) · db in-memory ·
sem APIs externas de momento. Auditoria já existe. Geolocalização opt-in já existe.

### Já implementado (esta sessão)
- A4 parcial: slots de foto guiados + vídeo→frames (A6 base)
- C3/G: geolocalização opt-in (base para C4)
- D: declaração de veracidade com timestamp (B9 leve)
- B: auditoria completa (base de B11)
- G3 parcial: terceiro sem seguro → nota FGA
- E9 base: coverage warnings de data (>60 dias, futuro)

### A implementar primeiro (impacto/effort ótimo)

| Prioridade | Item | Porquê primeiro | Esforço |
|-----------|------|-----------------|---------|
| 🔴 | **B5 pHash duplicados** (client-side, sem deps) | Fraude mais barata de detetar; zero custo | Baixo — lib `blockhash-js` ou manual |
| 🔴 | **B2 EXIF forense** (timestamp/GPS vs declarado) | Já temos geo declarada; comparar é trivial | Baixo — `exifr` npm |
| 🔴 | **A2 qualidade ao vivo** (blur via Laplacian, exposição) | Elimina retakes; 30 linhas de canvas | Baixo |
| 🔴 | **A10/A11 sufficiency score + triage** | Perito vê em 1s se pode decidir | Baixo — rules sobre slots |
| 🟠 | **C3 meteo do dia** (Open-Meteo free, sem key) | Prova factual "não choveu" | Baixo — fetch simples |
| 🟠 | **C1 VIN/plate OCR** (tesseract.js) | Verificação automática do veículo | Médio |
| 🟠 | **B7 foto-de-ecrã** (moiré/resolução) | Trivial de flagar | Baixo — heurísticas |
| 🟠 | **A1 walk-around vídeo** | Contexto completo; já temos infra de vídeo | Médio — novo step |
| 🟠 | **A4 voz→texto** (Web Speech API, sem deps) | Narrativa sem escrever | Baixo |
| 🟠 | **B8 before/after** — guardar pHash da inspeção de apólice | Sequência natural de B5 | Médio |
| 🟡 | **B3 ELA** | Possível client-side; precisão média | Médio — canvas re-compress |
| 🟡 | **E1 resumo do dossiê** (GenAI opcional) | Sidekick-style | Depende de LLM |
| 🟡 | **F2 scoring composto** — pesar todos os flags num score SIU | Já temos audit + flags | Baixo — agregar sinais |
| 🟡 | **C4 mapa/esboço** — overlay do local no croqui DAAA | Plausibilidade espacial | Médio — Leaflet/OpenStreetMap |
| 🟡 | **G1 e-SEGURNET import** | Aceitar DAAA digital como entrada | Médio — parse PDF/JSON |
| ⚪ | **D1-D4 telemática** | Requer hardware/parceria | Fase 2 — OEM/OBD |
| ⚪ | **B4 deepfake model** | Modelo ONNX especializado | Fase 2 — dataset próprio |
| ⚪ | **C2 base FGA/GPS** | API estatal/regulamentar | Fase 2 — acordo APS |
| ⚪ | **B9 blockchain selo** | Cripto + storage | Fase 2 — opcional |
| ⚪ | **E2/E3 copiloto agentivo** | Requer LLM + dados históricos | Fase 3 |

---

## 4. Visão — o perito do claims-ai em 2027

1. **Abre o caso → briefing pronto** (E1): timeline, flags, circunstâncias DAAA,
   sufficiency score, meteo do dia, geolocalização vs. declarada.
2. **Prova já verificada**: pHash duplicados, EXIF cruzado com data/local,
   foto-de-ecrã e edições flagadas antes de abrir a primeira imagem.
3. **O set está completo**: walk-around + slots + VIN lido + declaração assinada;
   ou retake direcionado pedido automaticamente.
4. **Decide com contexto**: similares, severidade, previsão de lesão,
   inconsistências narrativa↔prova assinaladas — e auditado tudo.
5. **A fraude não passa**: score composto SIU no dia 1, não na descoberta.

A arquitetura já suporta isto — o gap é **evidência autenticada + forense
automático + enriquecimento**, exatamente a camada que o estudo FNOL anterior
deixou para depois. Nenhuma dependência externa obrigatória para os 🔴🟠;
fases 2-3 trazem telemática e GenAI quando o cliente estiver pronto.
