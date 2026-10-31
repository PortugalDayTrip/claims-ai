# ClaimsAI — Análise Automática de Danos em Sinistros

App de **First Notice of Loss (FNOL) com visão computacional**: o segurado envia
fotos e/ou um vídeo do dano através de uma ligação segura; a IA extrai os melhores
frames do vídeo, identifica e descreve cada dano, estima custos, avalia coerência
e sinais de fraude, e entrega ao perito um caso pronto a decidir.

Usa **o mesmo protocolo de IA** do `ai-vision.ts` do hospitality-platform —
endpoint compatível com Ollama (`POST /api/chat`, imagens base64, `format:'json'`).

## Pipeline (baseada em investigação 2026 — ver `docs/INSURANCE_AI_STUDY.md`)

```
Link seguro /c/<token>
  → FNOL slot-filling + upload (fotos + vídeo)
  → extração de keyframes no browser (sampling temporal + nitidez + dedup aHash)
  → por imagem: VLM devolve danos{tipo,local,severidade,confiança,custo} + autenticidade + qualidade
  → fusão multi-frame (dedup por tipo+local) + forense EXIF + verificador de coerência
  → triage determinístico (STP / revisão / SIU) + rascunho de relatório
  → perito aprova/rejeita — trilho de auditoria completo
```

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- VLM via Ollama-compatible (`AI_VISION_URL` / `AI_VISION_MODEL`)
- `exifr` para forense EXIF · SHA-256 por ficheiro · store JSON local (`data/`)
- Zero dependência de ffmpeg — keyframes extraídos no cliente (canvas + aHash)

## Correr

```bash
cp .env.example .env.local     # configurar AI_VISION_URL/MODEL + PIN
npm install
npm run dev                    # http://localhost:3000
```

1. Perito entra em `/adjuster` (PIN do `.env.local`, default `1234`).
2. Cria sinistro → copia a ligação `/c/<token>` para o segurado.
3. Segurado preenche FNOL, envia fotos/vídeo (frames extraídos automaticamente).
4. Perito carrega **«Analisar com IA»** → revê achados, sinais, triage, relatório → decide.

## Variáveis de ambiente

| Var | Default | Notas |
|---|---|---|
| `AI_VISION_URL` | `http://localhost:11434` | Ollama ou qualquer endpoint compatível |
| `AI_VISION_MODEL` | `minicpm-v` | Sugeridos: `minicpm-v`, `qwen2.5vl:7b`, `llama3.2-vision:11b`, `gemma3:12b` |
| `AI_VISION_TOKEN` | — | Bearer opcional |
| `ADJUSTER_PIN` | `1234` | Trocar em produção (ideal: SSO) |
| `SESSION_SECRET` | — | String aleatória longa |
| `MAX_UPLOAD_MB` | `200` | Limite por ficheiro |
| `ANALYSIS_MAX_IMAGES` | `24` | Imagens por análise |

## Performance (CPU vs GPU)

VLMs em CPU custam ~20–90s/imagem (LLaVA-class); uma T4 modesta é ~6–20× mais rápida.
A app foi desenhada para ser eficiente nos dois casos:

- **Redimensionamento server-side** (`lib/prepare.ts`, sharp): fotos de 12MP são enviadas ao VLM a ≤1024px — os modelos reduzem internamente de qualquer forma; ~4× menos tokens visuais e ~10× menos payload.
- **Frames já chegam otimizados**: extração no browser a máx 1280px + dedup aHash + nitidez (máx 12).
- **Cache por sha256**: «Re-analisar» salta imagens já processadas (`?force=1` ignora o cache).
- **Sequencial por defeito**: `OLLAMA_NUM_PARALLEL` com modelos multimodais falha (ollama#4165). `AI_VISION_CONCURRENCY=2..4` só para backends que suportem paralelo (vLLM/TGI/GPU).
- **KV cache**: o prompt é byte-estável por sinistro — a Ollama reusa o prefill a partir da 2ª imagem.
- **Progresso ao vivo**: a consola do perito mostra `n/total` + fase e continua mesmo se fechar a página.
- Produção: correr `runAnalysis` numa queue (BullMQ/worker) e servir o VLM em GPU dedicada.

## Notas de conformidade

- **EU AI Act**: a IA recomenda; o perito decide. Cada output guarda modelo + timestamp; decisões têm trilho de auditoria.
- **Evidência**: ficheiros originais preservados byte-a-byte + SHA-256 na ingestão (padrão forense).
- **Fraude**: EXIF vs factos do sinistro (data/local), deteção de screenshot/não-foto via VLM, duplicados por hash intra e inter-sinistro.
- Produção: trocar `lib/db.ts` (JSON) por Prisma/Postgres e correr `runAnalysis` numa queue (BullMQ) — interface já está isolada.

## Upgrade path (GPU)

- RF-DETR damage/parts segmentation service → grounding espacial (TinyDamage: −61pp alucinação)
- `vineetsarpal/yolov11n-car-damage` para boxes a nível de peça
- Reverse-image-search + embeddings vs histórico (aws-samples fraud pipeline)
