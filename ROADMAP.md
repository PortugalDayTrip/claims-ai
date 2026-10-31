# ClaimsAI — Roadmap Sistema de Gestão de Sinistros (Segurado ↔ Seguradora)

Pesquisa: Duck Creek, Sapiens ClaimsMaster, Regure, Openkoda, Insly, CCC, Tractable,
Mitchell, EIOPA/ASF (EU AI Act), guias de transformação de claims 2025-2026.

---

## 1. O que já existe aqui (fundamentos sólidos)

- **FNOL tokenizado** — `app/c/[token]` + `POST /api/c/[token]/evidence` (cliente envia fotos sem login)
- **Deteção AI de danos** — 4 modelos ONNX (`services/damage-detect` :8110), 1.5s/foto, polígonos + caixas
- **Análise** — `lib/analysis.ts` sintetiza findings → `validate.ts` (bandas de custo PT, repairType, filtros espaciais)
- **Triage** — `lib/triage.ts` → `stp_eligible | manual_review | siu_investigate`
- **Fraude (sinais)** — `lib/fraud.ts`: EXIF, qualidade, duplicados cross-claim, score
- **Adjuster workbench** — `app/adjuster/` (lista, novo, detalhe com overlays + findings em PT)
- **Estados** — awaiting_evidence → evidence_received → analyzing → analyzed → in_review → approved | rejected | closed
- **Relatório** — `/api/claims/[id]/report`

## 2. O que os líderes de mercado fazem (benchmark)

| Capacidade | Benchmark | Estado aqui |
|---|---|---|
| FNOL multi-canal guiado <3min | Insly AI chat, prefilled | ⚠️ token link, sem chat |
| Tracking cliente em tempo real | "food-delivery tracking", handler nomeado | ❌ |
| Comunicações proativas | SMS/email a cada milestone, ack <10s | ❌ |
| STP (straight-through) | auto-aprovação sob thresholds | ⚠️ veredito existe, execução não |
| Estimativa linha-a-linha | CCC: repair/replace + horas + peças | ⚠️ cost bands, não line-items |
| Total loss vs repairable | CCC First Look, previsão precoce | ❌ |
| Repair network | Tractable Auto Reviewer — oficinas validam estimativas | ❌ |
| Limites de autoridade | approvals por montante | ❌ |
| Reservas/ledger | movimento financeiro auditável | ❌ |
| Subrogação/salvage | recuperação a terceiros | ❌ |
| Fila SIU | fraude → investigação dedicada | ⚠️ score, sem fila |
| SLA/escalation | prazos por etapa, alertas | ❌ |
| Audit trail imutável | cada ação assinada com timestamp | ❌ |
| AI Act / EIOPA | disclosure IA + human oversight + explainability | ⚠️ validationNotes parcial |
| PII redaction | blur matrículas/faces nas fotos | ❌ |
| Guided photo capture | controlo de qualidade da foto no upload | ⚠️ frames.ts parcial |

## 3. Requisitos regulatórios (Portugal/UE — em vigor desde Ago/2026)

- **EU AI Act**: avaliação de dano em sinistros motor NÃO é high-risk (reservado a vida/saúde pricing), mas EIOPA exige governança proporcional:
  - **Human oversight** — AI recomenda, humano decide (já é o modelo)
  - **Transparência** — o segurado deve saber que IA analisou as fotos
  - **Explainability** — cada achado com confiança + razão (já temos)
  - **Record keeping** — log de todas as decisões AI
- **RGPD art.22** — decisão puramente automatizada precisa de salvaguardas; STP deve ter opt-out/recurso humano
- **ASF** — tempos de resposta a reclamantes são auditados → SLA monitoring é compliance, não luxo

## 4. Roadmap por fases (maior impacto primeiro)

### FASE A — Cliente informado (semana 1-2) ⭐ maior gap de UX
1. **Portal do cliente** `app/c/[token]` → página de estado com timeline visual:
   - etapas: "Recebemos o seu pedido" → "Fotos em análise" → "Em avaliação pelo perito" → "Decisão" 
   - próximo passo esperado + o que falta ao cliente
   - perito atribuído (nome) + tempo médio de resposta
2. **Notificações** — email a cada mudança de estado (ack imediato, doc requests, decisão)
3. **Disclosure IA** — banner "Análise assistida por IA — decisão final por perito" (AI Act)

### FASE B — Workflow seguradora (semana 3-4)
4. **Audit trail** — `ClaimEvent[]` imutável (quem, o quê, quando) na página do sinistro
5. **SLA monitor** — idade por estado na fila, alertas (vermelho >48h sem resposta)
6. **Settlement offer** — seguradora gera proposta com breakdown dos findings → cliente aceita/contesta via token
7. **Limites de autoridade** — >€X requer aprovador sénior; decisão com motivo obrigatório

### FASE C — Inteligência (semana 5-8)
8. **STP real** — `stp_eligible` + valor <€LIM + fraude <threshold → auto-proposta com opt-out humano
9. **Fila SIU** — claims com fraudScore alto numa queue separada + sinais detalhados
10. **Line-item estimate** — expandir findings: repair vs replace + horas mão-de-obra + peça (tabela PT IAE)
11. **Total loss flag** — se custo estimado > X% do valor do veículo → encaminhar avaliação
12. **VLM verify** (Ollama ou API) — validação semântica dos achados ambíguos (riscos/reflexo)

### FASE D — Ecossistema (semana 9+)
13. **Portal oficina** — token de peritagem: vê fotos+findings, envia orçamento linha-a-linha
14. **Subrogação** — se terceiro identificado no FNOL → workflow de recuperação
15. **PII blur** — detetar matrícula/rosto nas fotos e mascarar
16. **Chat FNOL** — guiado por IA (recolha conversacional, prefills da apólice)

## 5. O que NÃO construir (erro comum)
- Pagamentos reais — integrar PSP externo, não reinventar
- Reservas contabilísticas completas — exportar para sistema financeiro existente
- Substituir o perito — AI Act + ASF exigem humano no loop; vantagem é 80% do trabalho dele feito antes

## 6. Quick wins esta semana (1-2 dias cada)
1. Timeline de estado no portal do cliente
2. Email de confirmação + link de tracking no FNOL
3. Event log (audit trail) por sinistro
4. Badge "Análise AI" + nota de supervisão humana (compliance imediato)
