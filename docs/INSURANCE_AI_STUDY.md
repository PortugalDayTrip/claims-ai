# AI Claims Damage Assessment — Deep Research Study (Oct 2026)

Research basis: 30+ sources — peer-reviewed papers (Expert Systems, ACM, AAAI, arXiv), GitHub repos, HuggingFace models, and commercial vendors (Tractable, Mitchell, Claim Genius, Sure, Carpe, Shift, ALPHV). Synthesized into the architecture implemented in this app.

---

## 1. State of the art (2025–2026 papers)

### 1.1 FADES — Expert Systems (Jul 2026)
Production-grade FNOL system for car insurance (Italian CAI standard):
- **Slot-filling conversational agent** (tool-enabled LLM, backend-enforced state machine) collects structured FNOL data.
- **Damage localization**: benchmarked DiffusionDet vs transformer detectors (RF-DETR, D-FINE) on 13,353 real accident images / 41,057 annotations / 4 damage classes → **RF-DETR Large wins** and meets real-time constraints.
- **Severity via panel-aware geometric reasoning + rule-based logic** (deterministic, auditable — not pure generative).
- Results: claim processing 30 → 12 min; <7 min time-to-completion at 45 cycles/day. Cross-dataset drop on CarDD confirms **insurance-specific data matters**.
- Key takeaway: *hybrid deterministic + generative* = reliability + auditability required by regulators.

### 1.2 TinyDamage — arXiv 2608.02470 (Northeastern Univ.)
- Qwen-VL (2B, local 4-bit) gets **87.3% semantic accuracy** but is *spatially ungrounded*: hallucinates damage on reflections, misses elongated scratches.
- Fix: **delegate spatial grounding to a dedicated segmentation model, keep the VLM for reasoning/report**. Segmentation-grounded prompting cut report hallucination **92% → 31%**.
- Focal loss collapses tiny-damage detection; supervised-contrastive objective better.
- 7-node LangGraph agent pipeline grounds every generation step in segmentation output.

### 1.3 Multimodal LLMs for claims (UBMK 2025)
- Evaluated Gemma / Llama / Mistral vision-LLMs for damage reports + claim decisions.
- **Gemma 3-27B best report quality; Gemma 3-12B chosen for local deployment** (efficiency).
- Pattern: claims below a cost threshold get **automatic decisions** → cost reduction.

### 1.4 MMLM-CA (ACM 2025)
Three modules: Policy Constraint Understanding (clause embeddings ↔ claim), Visual Damage Reasoning Unit (ViT + prompt-guided semantic damage inference), Decision Consistency Verifier (graph reasoning vs policy). +8.2% adjudication accuracy.

### 1.5 Video > Photos (AAAI demonstration)
- Video walkaround assessment: **+29.1% accuracy vs single photos**, +20% shoot quality. Multi-frame fusion depresses noise (reflections, mud misread as damage).
- Guided capture UX: plate + VIN first (identity/anti-fraud), far shot → close-ups.
- Weakly-supervised segmentation from bounding-box annotations (seg labels cost 5× more).

### 1.6 DamageTriageFormer (building damage)
DINOv3 ViT-L/16 + SimpleFPN, 5-class typology (undamaged → total collapse), macro-F1 0.62 on DamageTriage-Bench (hurricanes/wildfire). Relevant for property claims / CAT events.

---

## 2. GitHub building blocks

| Repo | Contribution |
|---|---|
| `Tarpit59/car-damage-and-parts-segmentation` | Full pipeline: YOLOv8 car crop → **RF-DETR parts seg (29 classes)** → **RF-DETR damage seg (6 types, 2×2 tile inference for small damage)** → **spatial validation rules** (dent ∉ glass/tyre/lamp; glass-shatter only on glass; tire-flat only on tyre) → 0–100 health score |
| `CarDD-USTC` | **CarDD dataset**: 4k images, 9k+ instances, 6 classes — dent, scratch, crack, glass shatter, lamp broken, tire flat. Standard benchmark |
| `kaopanboonyuen/MARS` | Mask-attention refinement, +1.3/+2.3 maskAP over Mask R-CNN on car damage |
| `rpavani1998/Datathon2023-WaterDamageDetection` | Water-damage claims CV (BearingPoint challenge) |
| `RichNass87/inspector-roofing-roof-damage-yolo` | Roof hail/wind damage YOLO (property line) |
| `aws-samples/detect-fraud-using-genai-with-aws-services` | **6-signal fraud pipeline**: reverse image search, embedding similarity vs prior claims, EXIF vs claim metadata, object detection vs claim, AI-gen detection → normalized fraud score |
| `matthupy/videosift` | Multi-strategy keyframe extraction: **scene cuts + I-frames + uniform 2 s sampling + mpdecimate**, dedup via **pHash, Hamming ≤ 8** |

## 3. HuggingFace models (deployable today)

| Model | Type | Notes |
|---|---|---|
| `vineetsarpal/yolov11n-car-damage` | Detector | 14 part-level damage classes, mAP50 79.7%, ~6 MB, real-time |
| `Naiscorp/car-damage-maskrcnn-r101-dc5` | Instance seg | 7 damage types (dent, scratch, tear, missing part, puncture, lamp, glass); production checkpoint |
| `Kakyoin03/car-damage-assessment-llama-vision` | VLM (LoRA) | Llama-3.2-11B-Vision fine-tuned: parts, severity, insurance-quality reports, EN/FR |
| `rishi506/clip-car-damage` | CLIP LoRA | Zero-shot dent/intact/major_collision/scratch triage (69.8%) |
| `InspectorRoofing/roof-damage-yolo-v0` | Detector | Roof hail/wind categories (educational) |
| Qwen2.5-VL / Gemma 3 / Llama-3.2-Vision via Ollama | General VLM | Our runtime — `minicpm-v` default, swappable to `qwen2.5vl`, `llama3.2-vision`, `gemma3` |

## 4. Commercial benchmarks

- **Mitchell Intelligent Estimating + Tractable/Claim Genius/Inspektlabs**: photos+videos → VIN-specific estimate line items; **straight-through processing for low severity**, appraiser review/override otherwise.
- **Sure Claims AI**: "FNOL to wire" — vision model reads photos → LLM reconciles coverage vs bound policy → triage agent writes priority/risk flags → **adjuster supervises at exception boundary**.
- **ALPHV × Tasco (Vietnam, Qwen)**: images+video+PDF one case file, **duplicate-claim detection**, liability assessment, garage/WhatsApp automation.
- **Carpe Vision**: 11 forensic engines; **claim-context reconciliation** — EXIF GPS/date/device vs reported facts is among the strongest fraud signals; preserve original file + SHA-256 + audit record.
- **Shift Technology**: metadata easily stripped (screenshots) → treat *missing* EXIF as weak signal, *conflicting* EXIF as strong; ELA weak vs fully-AI-generated images; use GenAI to flag non-photo submissions (drawings).

## 5. Video handling (implemented)

Client-side, zero ffmpeg dependency (browser `<video>` + canvas):
1. Uniform temporal sampling (≈ every 2 s) capped at 12 frames.
2. Per-frame **sharpness score** (Laplacian-variance approximation on downscaled pixels) — keeps the clearest frame per cluster.
3. **aHash dedup** (Hamming ≤ 6) — drops near-identical frames (mirrors videosift's pHash approach).
4. Frames sent as JPEG base64 to the vision endpoint — same `/api/chat` protocol as `ai-vision.ts`.

## 6. Fraud & evidence integrity (implemented)

- SHA-256 of every original file at intake + immutable audit events (Carpe pattern).
- EXIF forensics via `exifr`: capture date vs reported incident date, GPS vs reported location, device/software fields.
- Screenshot/no-EXIF → low-weight flag; **conflicting** EXIF → high-weight flag (Shift pattern).
- VLM self-check: "is this a real photograph of real damage" (catches drawings/AI-gen/stock).
- Duplicate detection: identical hash or near-identical aHash within claim + across claims (per-claimant) → flag.
- Claim-consistency: vision findings cross-checked against the claimant's narrative (MMLM-CA-style verifier, prompt-based).

## 7. Triage & compliance

- Cost-band severity rules (deterministic, auditable — FADES): per-finding severity → claim severity score → **auto-recommend** STP / manual review / SIU investigate. Never auto-approve — EU AI Act human oversight on consequential decisions; adjuster accepts/overrides every recommendation.
- Every AI output persisted with model id + prompt version + timestamp (audit trail).

## 8. Architecture chosen (this app)

```
Customer link (/c/<token>)
  → guided upload (video → client-side keyframes + photos + FNOL slots)
  → evidence store (originals + sha256 + EXIF)
  → per-image VLM analysis   (Ollama /api/chat, format:json — same protocol as ai-vision.ts)
  → aggregation + fraud signals + consistency verifier
  → triage recommendation + draft report (PT)
  → adjuster review/override → decision + audit trail
```

Swap-in upgrades when GPU available: RF-DETR damage/parts seg service (Tarpit59 pipeline) feeding grounded prompts (TinyDamage), yolov11n-car-damage for part-level boxes, roof-damage YOLO for property line.

---

# FASE 2 — Deep-dive: taxonomia, severidade, custo e grounding (implementado)

Pesquisa adicional (≈30 fontes) focada em "o que o modelo deve saber identificar" em
automóvel e habitação — e o que NÃO pode inventar. Implementado em `lib/taxonomy.ts`,
`lib/validate.ts`, `lib/prompts.ts`, `lib/analysis.ts`.

## 9. Taxonomias de dano — datasets e classes

| Fonte | Contribuição |
|---|---|
| **CDDM** (SCUT-CCNL, multi-view) | 9 componentes danificáveis (para-choques f/t, guarda-lamas f/t, capô, porta f/t, mala, farol) × 3 tipos (scratch, dent, crack) = 27 classes; pares vista-distante+close-up — valida a nossa captura vídeo(360°)+close-up |
| **Pixemantic VehicleDamage-29** | 29 classes misturando peças e danos (corrosion, cracked, dent, flaking, missing_part, paint_chip, scratch) — mapeado em `VEHICLE_PARTS` (39) + `VEHICLE_DAMAGE` (20) |
| **Ultralytics carparts-seg** | 23 classes de peças com máscaras (referência para futuro serviço de segmentação) |
| **Tarpit59 AutoScan** | 19→29 classes com sufixo Left_/Right_ por lado do carro; NMS por classe; singleton enforcement; **regras espaciais** (dent nunca em vidro/lamp/tyre; glass_shatter só em vidro; lamp_broken só em lamp; tire_flat só em tyre) — implementado em `isPlausible()` |
| **InspectorRoofing roof-YOLO v0** | classes: `hail_hit, wind_crease, soft_metal_impact, missing_shingle, granule_loss, mechanical_damage, non_damage_lookalike` — a classe lookalike (alga/sombra/silicone/reparação antiga) vira `LOOKALIKE_WARNING` no prompt + campo `lookalikes[]` |
| **InspectorRoofing storm-damage dataset** | 46.5k imagens de telhado com privacidade (GPS randomizado) — referência ética de recolha |
| **Nearmap ImpactResponse** | classificação FEMA 5-tier por propriedade; deteções: structurally damaged roof, exposed deck, tarps — justifica severity estrutural no topo da escala |
| **Kled damage-in-your-home** | 10k+ conjuntos de 3 fotos (sala→médio→close-up) de damp/crack/leak/peeling_paint/broken_tile — valida multi-escala em property |
| **Roboflow wall/water datasets** | classes crack/stain/mold/damp/leakage em paredes/tetos; "light/moderate/severe" por mancha — bandas de severidade interior |

## 10. Severidade e reparação — regras que codificámos

| Fonte | Regra implementada |
|---|---|
| **Felirent Damage Matrix** | scratch <2cm ≈ cosmético, 2–10cm ligeiro, >10cm/área>10×5 severo; dent ≤10×5 ligeiro, ≤40×40 severo, >40×40 = substituição → `normalizeSeverity()` em `validate.ts` |
| **211 CMR 133.04 (Mass.)** | reparar salvo se: peça além de reparação, custo reparação>substituição, ou segurança operacional afetada; vidro reparável se chip pequeno fora da zona crítica → `repairType` + regra no prompt |
| **CIC/autobody blend-time** | fatores repair-vs-replace: acessibilidade do verso do painel, zona de deformação programada (crumple) = substituição quase automática, preservar e-coat/pintura de fábrica, blending de painéis adjacentes → `repairAction` guidance |
| **Tarpit59 health-score** | severity% por parte = overlap_dano/área_peça; penalidades somadas → equivalente ao nosso `overallSeverity` + `estCostEur` |

## 11. Água em edifícios — atribuição de origem (crucial para cobertura)

| Fonte | Pista visual |
|---|---|
| **RICS "Damp and mould" + JPS 2022** | penetrating damp (rufos/telhas/sealant/reboco fendido/solo subido), condensation (superfícies frias, exaustor em falta), "rising damp" frequentemente mal diagnosticado (maré baixa + salitre) |
| **InterNACHI moisture intrusion** | fuga de canalização escondida em parede; selos de banho/duche; ventilação de exaustor para sótão; humidade em subpavimento de sanita/banheira |
| **MDPI Water Intrusion analysis** | categorias IICRC S500; inspeção exterior→interior; medições > fotos (o relatório IA deve pedir medições, não fingi-las) |
| **Systematic review water-induced defects** | termografia/microondas p/ dano não visível; UAV p/ fachadas altas |

→ campo `sourceHint` ∈ {roof_leak, plumbing, rising_damp, condensation, penetrating, flood, unknown} + `WATER_SOURCE_RULES` no prompt + `repairType:"investigate"` quando origem incerta (caçafugas).

## 12. Grounding espacial em VLM — o que é realista

| Fonte | Conclusão |
|---|---|
| MiniCPM-V CookBook + issues #982/#1024 | grounding existe (`<box>` normalizado a 1000) mas FRACO, falha com múltiplos objetos; Qwen2.5-VL melhor mas instável |
| Qwen2.5-VL issues #1397/#785 | ordem de coords confusa ([x1,y1,x2,y2] correto), bbox desloca com resolução errada; refinement iterativo limitado |

→ Decisão: **grelha 3×3 (`region`) + partKey canónico** em vez de bboxes — robusto em qualquer VLM compatível com Ollama, suficiente para o perito localizar o dano; bboxes exatos ficam para o serviço de segmentação futuro.

## 13. Implementação resultante (diff vs v1)

- `lib/taxonomy.ts` — 39 peças auto + 22 zonas casa, 20 tipos auto + 27 tipos casa, regras espaciais, bandas severidade, tabelas de custo PT por repairType×severity, lookalikes, atribuição de água, checklists de cobertura.
- `lib/validate.ts` — `validateFindings()`: resolve partKey por fuzzy-match, elimina combos espaciais impossíveis, normaliza severidade por tamanho (cm²/m²), atribui repairType por defeito, cap custo vs banda PT, notas de auditoria por achado.
- `lib/prompts.ts` — prompt único rico: coverageView + taxonomias + regras espaciais + lookalikes + atribuição de água + grid de região + repairType/211 CMR.
- `lib/analysis.ts` — audit `findings_filtered`, cobertura agregada (`coverageViews`), `preExistingCount`, missingViews → triage.
- `lib/fraud.ts` — novo sinal `possible_preexisting` (peso 0.15/achado).
- `lib/triage.ts` — manual_review se ≥3 vistas em falta ou ≥2 achados pré-existentes.
- UI — tabela de danos com peça/zona, região, tamanho, reparação, badge PRÉ, origem de água, marcador "⚙ ajustado"; painel de cobertura; guias de captura por tipo de bem.

