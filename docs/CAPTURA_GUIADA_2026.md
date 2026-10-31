# Captura Guiada de Prova — Estudo Profundo 2026

> Pesquisa: 30 out 2026. Pergunta central: **"como fazemos o segurado capturar
> prova certa à primeira, no browser, sem app, sem servidor?"**
> Benchmark: AMA Consulting (TF.js widget — resubmissões de 45%→6%), Claims
> Soleras Guided Image Capture (vehicle mask + VIN OCR), Complete iQ Inspect,
> VentaVid, Truepic Vision, SiteSurvey Walk Cam, Zuper, RapidEye, Walkaround
> Inspector (PWA + SHA-256 + RFC 3161). Tech: ImageCapture API (W3C Apr 2025),
> OpenCV.js, TensorFlow.js, WebXR, Web Speech API, pHash.

---

## 1. Porque a captura guiada é o problema nº1 do FNOL digital

O segurado não é fotógrafo. Resultado típico de uploads livres:

- 30-45% das fotos são inutilizáveis (borradas, escuras, ângulo errado, objeto
  errado). Cada foto má = um email de retake = +2-5 dias de ciclo.
- O perito perde tempo a verificar *o que está na foto* em vez de decidir.
- A fraude explora a ambiguidade — foto de ecrã, re-upload, ângulo que esconde
  dano pré-existente.

A resposta do mercado não é "pedir melhores fotos" — é **guiar a captura em tempo
real**: overlays de enquadramento, verificação de qualidade ao vivo, deteção do
objeto certo, e validação antes de o ficheiro sair do telemóvel.

---

## 2. Anatomia de um sistema de captura guiada (o que os líderes fazem)

### 2.1 Fluxo universal (VentaVid / iQ Inspect / Truepic / AMA)

```
Link seguro → permissão câmara → slot 1 →
  ├─ overlay de enquadramento (máscara do veículo/objeto)
  ├─ verificação ao vivo (qualidade, ângulo, motivo)
  ├─ captura só desbloqueia quando ok → slot 2 → … →
resumo → declaração → upload selado
```

### 2.2 Checks ao vivo — o que validar por frame

| Check | Como (browser) | Threshold típico | Falha se |
|-------|---------------|------------------|----------|
| **Nitidez/blur** | Laplacian variance (canvas Sobel ou OpenCV.js) | σ² < 100-200 = borrada | movimento, distância, foco |
| **Exposição** | luminância média + histograma | <40 escuro, >220 estourado | garagem, sol direto |
| **Glare** | % pixels saturados em zonas | >5% | reflexo de vidro/para-brisa |
| **Distância/enquadramento** | bounding box do objeto vs máscara | área <15% frame | foto "à distância" |
| **Ângulo** | face do objeto detetado vs slot esperado | mismatch | porta da esquerda no slot da direita |
| **Objeto correto** | classificador/detetor (TF.js/ONNX) | conf <0.6 | fotografou a roda no slot do para-choques |
| **Dedo/lente tapada** | bordas uniformes + luminância anómala | heurística | dedo na câmara |
| **Foto de ecrã** | moiré (FFT), bezels, resolução anómala | padrão detectado | fraude por screenshot |

### 2.3 Slots — o que capturar por ramo

**Automóvel (padrão e-SEGURNET + Tractable/CCC):**
- 8 ângulos exteriores: frente, traseira, 2 laterais, 4 ângulos 45°
- VIN (base para-brisa ou porta) — OCR valida contra apólice
- Matrícula frontal e traseira
- Odómetro (prova de quilometragem, anti-rollback)
- Painel/instrumentos (avarias, airbag disparado)
- Interior (bancos, danos, equipamento — *fase 2*)
- Dano close-up por zona detetada
- Walk-around vídeo 360° (fase 2 — contexto contínuo)

**Habitação:**
- Panorama da divisão / walkthrough vídeo
- Dano close-up com escala (moeda/cartão)
- Medidor de água/gás/contador (leitura)
- Origem do dano (tubagem, telhado, eletrodoméstico)

### 2.4 Instruções durante a captura

- **Uma instrução por ecrã**, grande, no centro — não um checklist.
- **Overlay gráfico**: máscara/silhueta do veículo ou seta "aproxime-se".
- **Countdown ou "segure firme"** nos frames que precisam de precisão (VIN, odómetro).
- **Narração opcional** durante walk-around: falar em vez de escrever (Web
  Speech API → transcrição pesquisável).
- **Confirmação por slot**: preview + "usar esta / refazer" antes de avançar.

---

## 3. SDKs e bibliotecas instaláveis — o que existe

### 3.1 Câmara e captura (foundation)

| Opção | O que faz | Licença | Nota |
|-------|-----------|---------|------|
| **`getUserMedia` + `ImageCapture` API** | Stream + controlo nativo: foco, zoom, flash/torch, exposição, resolução foto | Web standard | **Base de tudo.** Chrome/Android maduro; iOS Safari com menos controlo (foco/zoom parcial). Não precisa de lib. |
| **`react-webcam`** | Wrapper React para `getUserMedia` + screenshot | MIT | Conveniência para preview; controlo manual na mesma. |
| **`@axa-fr/slight-capture`** | Captura de documento com OpenCV.js: enquadramento, perspetiva, qualidade leve (~100KB) | MIT | Ideal para Carta Verde, DAAA em papel, documentos. |
| **`@microblink/capture`** | Auto-capture de documentos ID: glare, blur, inclinação, frente/verso | Comercial | Overkill para nós — mas o padrão de UX é o que replicar. |
| **docuSnap** (open-source) | Auto-capture de documento de vídeo feed, corner tracking, best-frame, quality gate 0-100 | Open-source | Referência de arquitetura para auto-capture de qualquer objeto. |

### 3.2 Qualidade de imagem (o nosso 🔴)

| Opção | O que faz | Peso | Decisão |
|-------|-----------|------|---------|
| **Canvas Sobel (manual)** | Blur via edge variance — 30 linhas | 0 deps | **Implementar já** — suficiente para flag "refazer" |
| **`blurry-check` (i-DENVA)** | Sobel + OpenCV.js Laplacian, brightness, blank, 19 issue codes | ~50KB ou 8MB (OpenCV) | Instalável — dá brightness/blank de borla |
| **OpenCV.js completo** | Laplacian + histograma + deteção de doc | ~8MB | Só se quisermos doc-scan — adiar |
| **TensorFlow.js + modelo** | Classificar objeto/cena em tempo real | ~5-10MB | Só se precisarmos "é mesmo a porta?" — fase 2 |

### 3.3 Forense e anti-fraude na captura

| Opção | O que faz | Peso | Decisão |
|-------|-----------|------|---------|
| **EXIF via `exifr`** | timestamp, GPS, device, edits | ~5KB | **Implementar** — cruzar com data/local declarada |
| **pHash (canvas ou `@stabilityprotocol.com/phash`)** | Duplicados perceptuais cross-sinistro | ~15KB | **Implementar** — fraude mais barata de apanhar |
| **Foto-de-ecrã** | moiré FFT, resolução anómala, bezels | heurística | **Implementar** — regra simples |
| **C2PA / provenance** | cadeia de custódia criptográfica | lib + cert | Fase 3 — Truepic faz isto como serviço |
| **Deepfake/GenAI** | modelo ONNX de deteção | modelo + treino | Fase 2 — Illuminarty/Hive como benchmark |

### 3.4 Vídeo e narrativa

| Opção | O que faz | Nota |
|-------|-----------|------|
| **`MediaRecorder` + chunking** | Gravar vídeo no browser, frames extraídos client-side | Já temos infra — falta o modo walk-around |
| **Walkaround Inspector (PWA)** | Vídeo + SHA-256 on-device + RFC 3161 timestamp + chunk upload | Referência arquitetónica — replicável |
| **Web Speech API** (`SpeechRecognition`) | Narração → texto pesquisável durante o vídeo | Sem deps; Chrome/Edge; iOS limitado |
| **SiteSurvey Walk Cam** | Um ponto = um clip curto + pergunta + pass/fail sugerido | Padrão de UX para inspeções guiadas |

### 3.5 Medição e escala

| Opção | O que faz | Decisão |
|-------|-----------|---------|
| **Objeto de referência** (cartão/moeda na foto) | Pixels→mm manual | **Implementar** — pedir referência no close-up |
| **WebXR Hit-Test** (Android/Chrome, ARCore) | Âncoras 3D → distância real | Fase 3 — só Android, frágil |
| **Fotogrametria/SfM** | 3D a partir de múltiplas fotos | Fase 3+ — serviço, não client |

---

## 4. O que temos vs o que falta — gap técnico

**Já temos (base sólida):**
- Wizard por slots com tipo de bem → `SLOTS` (interior/dash adiado como pedido)
- Vídeo → frames extraídos client-side (infra `MediaRecorder` + canvas)
- Geolocalização opt-in (cross-check com EXIF)
- Declaração de veracidade + auditoria

**Falta — e quanto custa:**

| Feature | Onde entra | Deps | Esforço |
|---------|-----------|------|---------|
| **Quality gate ao vivo** (blur+exposição) | Novo componente `guided-capture.tsx` | 0 (canvas) | **M** — substitui `<input type=file>` |
| **Overlay de enquadramento** (máscara/silhueta por slot) | Mesmo componente | SVG por tipo de bem | **M** — 6 silhuetas SVG |
| **Auto-capture** quando ok (3 frames bons seguidos) | `ImageCapture` + requestVideoFrameCallback | 0 | **S** |
| **EXIF forense** | No submit → `lib/forensics.ts` | `exifr` (~5KB) | **S** |
| **pHash dedup** | No submit → hash por foto, comparar claim.evidence | `phash` manual (~80 linhas) | **S** |
| **Foto-de-ecrã** | Heurística na análise | 0 | **S** |
| **OCR VIN/matrícula** | Tesseract.js client-side | `tesseract.js` (~2MB) | **M** |
| **Walk-around vídeo guiado** | Novo step no wizard | `MediaRecorder` já temos | **M** |
| **Narração→texto** | Web Speech API no vídeo | 0 | **S** |
| **Escala/referência** | Prompt "ponha um cartão junto ao dano" | 0 | **S** — copy only |
| **Torch/zoom nativo** | `ImageCapture` constraints | 0 | **S** |
| **Retake direcionado** (perito pede foto X) | API + flag no wizard | db field | **M** |

---

## 5. Arquitetura proposta — `lib/capture/` client-side

```
components/guided-capture.tsx      — câmara + overlay + quality gate
lib/capture/
  camera.ts        — getUserMedia + ImageCapture + constraints
  quality.ts       — blur (Sobel), exposição, glare → score 0-100
  detect.ts        — ONNX: objeto certo + zona do dano
  mask.ts          — SVG overlays por tipo de bem
  forensics.ts     — EXIF, pHash, foto-de-ecrã (no submit)
  walkaround.ts    — vídeo guiado + transcrição
types:  CaptureResult { file, quality, checks, exif, hash }
```

### Fluxo

1. **Slot ativo** → overlay da silhueta + instrução + quality gate ao vivo
2. **Auto-capture** quando score > threshold N frames seguidos
3. **Preview** → "usar/refazer" (com aviso se check falhou mas aceitável)
4. **No submit** → `forensics.ts` corre por ficheiro: EXIF↔data/local, pHash↔claim,
   foto-de-ecrã → flags na audit (perito vê antes de abrir)
5. **Walk-around** como step opcional → `MediaRecorder` + narração
6. **Retake direcionado** — perito marca slot em falta → cliente recebe link
   direto para esse slot

---

## 6. Roadmap por fases

| Fase | Escopo | Valor |
|------|--------|-------|
| **0 (agora)** | Quality gate (blur/exposição), overlay SVG, EXIF forense, pHash, foto-de-ecrã, escala por copy | Elimina retakes + fraude trivial — tudo client, sem deps |
| **1** | Auto-capture, OCR VIN/matrícula, walk-around vídeo, narração, retake direcionado | Prova completa; perito não pede "mais uma foto" |
| **2** | Deteção de objeto certo (ONNX), deepfake check, meteo do dia, dedup cross-claim | Autenticidade profunda |
| **3** | C2PA/selo, WebXR medição, fotogrametria, copiloto agentivo | Prova verificável + contexto 3D |

## 7. Recomendação imediata

**Instalar nada por agora.** Fase 0 é 100% canvas + Web APIs:

- `lib/capture/quality.ts` — Sobel edge variance + luminância (~40 linhas)
- `lib/capture/forensics.ts` — `exifr` (5KB) + pHash manual (~80 linhas) + moiré heuristic
- `components/guided-capture.tsx` — substitui os `<input type=file>` do wizard

**Instalar só quando:**
- `exifr` (agora, 5KB)
- `tesseract.js` (fase 1, OCR)
- `@stabilityprotocol.com/phash` (alternativa ao manual)
- `opencv.js` via `@axa-fr/slight-capture` (fase 2, doc-scan)
