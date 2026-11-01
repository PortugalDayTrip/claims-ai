# FNOL 2026 — Requisitos Legais & Inovação para Seguradoras
## Guia completo: Portugal · União Europeia · Estado da Arte · Benchmarks · Roadmap para a ClaimsAI

> Documento de referência — ~50 páginas
> Versão: Novembro 2026 · Elaborado para o projeto ClaimsAI
> ⚠️ Documento de trabalho técnico-jurídico. Não substitui aconselhamento jurídico formal.

---

# ÍNDICE

**PARTE I — ENQUADRAMENTO LEGAL (PORTUGAL)**
1. Regime Jurídico do Contrato de Seguro (DL 72/2008)
2. Seguro Automóvel Obrigatório (DL 291/2007)
3. Recomendações ASF n.º 2/2025 — Multirriscos Habitação
4. Normas Regulamentares ASF 2025–2026
5. DAAA — Declaração Amigável de Acidente Automóvel
6. Danos Corporais — regime especial
7. Prova digital e cadeia de custódia em Portugal

**PARTE II — ENQUADRAMENTO LEGAL (UNIÃO EUROPEIA)**
8. EU AI Act — Regulamento (UE) 2024/1689
9. EIOPA — Opinião sobre Governação de IA em Seguros
10. RGPD + Lei 58/2019 — dados de sinistros, fotos e vídeo
11. DORA — Resiliência Operacional Digital
12. Solvency II + IDD — governação e proteção do cliente
13. eIDAS e admissibilidade de prova eletrónica
14. Diretiva Motor Insurance (MID) — prazos UE
15. Acessibilidade digital (EAA)

**PARTE III — REQUISITOS FUNCIONAIS DE UM SISTEMA FNOL CONFORME**
16. Checklist legal → requisito técnico
17. Gestão de consentimento e transparência
18. Integridade, autenticidade e anti-fraude de evidência
19. Prazos e SLAs obrigatórios — motor de workflow
20. Auditoria, logging e explainabilidade

**PARTE IV — INOVAÇÃO FNOL 2026**
21. Estado da arte — agentic AI e multimodalidade
22. Video FNOL e captura guiada
23. Computer vision — benchmarks reais
24. Agentic FNOL — casos de referência (Allianz, AXA, Lemonade, Duck Creek)
25. Deteção de fraude na admissão
26. Telemática, IoT e triggers automáticos
27. Pagamentos instantâneos e STP
28. Voz, chatbots e omnicanalidade
29. Reclamações digitais e DAA eletrónico

**PARTE V — MATURIDADE & ROADMAP**
30. Modelo de maturidade FNOL (Everest Group)
31. Métricas e KPIs de referência
32. Matriz legal×feature para ClaimsAI
33. Roadmap de conformidade e inovação
34. Anexos: legislação, fontes, glossário

---

# PARTE I — ENQUADRAMENTO LEGAL (PORTUGAL)

## 1. Regime Jurídico do Contrato de Seguro (Decreto-Lei n.º 72/2008, de 16 de abril)

O DL 72/2008 é a lei-mãe do contrato de seguro em Portugal. Os artigos centrais para FNOL são o **art. 100.º (Participação do sinistro)** e o **art. 101.º (Consequências do incumprimento)**.

### 1.1 Artigo 100.º — Participação do sinistro

```
1 - A verificação do sinistro deve ser comunicada ao segurador pelo tomador
    do seguro, pelo segurado ou pelo beneficiário, no prazo fixado no contrato
    ou, na falta deste, nos oito dias imediatos àquele em que tenha
    conhecimento.
2 - Na participação devem ser explicitadas as circunstâncias da verificação
    do sinistro, as eventuais causas da sua ocorrência e respectivas
    consequências.
3 - O tomador do seguro, o segurado ou o beneficiário deve igualmente prestar
    ao segurador todas as informações relevantes que este solicite relativas
    ao sinistro e às suas consequências.
```

**Implicações práticas para um sistema FNOL:**

- **Prazo de 8 dias** — o sistema deve ajudar o segurado a participar dentro do prazo. Um link enviado por SMS/email no dia do acidente cumpre isto melhor que call centers com horário limitado.
- **Conteúdo mínimo obrigatório** — circunstâncias, causas e consequências. Um formulário FNOL digital deve estruturar a recolha exatamente nestes três eixos (quando, onde, como, o quê, danos).
- **Informações adicionais** — o segurador pode exigir elementos adicionais; o sistema deve suportar pedidos de follow-up (a app envia nova tarefa ao segurado).

### 1.2 Artigo 101.º — Sanções do incumprimento

```
1 - O contrato pode prever a redução da prestação do segurador atendendo ao
    dano que o incumprimento dos deveres fixados no artigo anterior lhe cause.
2 - O contrato pode igualmente prever a perda da cobertura se a falta de
    cumprimento ou o cumprimento incorrecto for doloso e tiver determinado
    dano significativo para o segurador.
3 - Não aplicável quando o segurador teve conhecimento por outro meio dentro
    do prazo, ou quando o obrigado prove que não podia razoavelmente ter
    comunicado antes.
4 - Não oponível aos lesados em seguro obrigatório de RC (com direito de
    regresso do segurador contra o incumpridor).
```

**Ponto crítico** (posição oficial ASF): **o atraso na participação NÃO permite recusa automática da cobertura**. A seguradora só pode exigir compensação por prejuízo concreto causado pelo atraso, e cabe-lhe a prova desse prejuízo. Um sistema FNOL deve, por isso, **nunca** bloquear ou penalizar automaticamente um claim por participação tardia — apenas assinalar o atraso no workflow e registar a data de conhecimento.

### 1.3 Deveres do segurado durante a regularização (art. 102.º e seguintes)

- Dever de colaboração: o segurado deve prestar informação verdadeira e responder a pedidos razoáveis (fotos, documentos, descrição).
- Mitigação: o segurado deve tomar medidas para evitar/limitar consequências (ex.: impedir danos adicionais).
- Um FNOL digital deve **instruir** o segurado sobre estas obrigações no momento da participação (checklist "o que fazer agora") — cumprimento documentado = prova de instrução dada.

---

## 2. Seguro Automóvel Obrigatório — Decreto-Lei n.º 291/2007, de 21 de agosto

Este diploma regula o seguro obrigatório de RC automóvel e contém os **prazos legais mais exigentes da regularização de sinistros em Portugal**.

### 2.1 Artigo 34.º — Obrigações em caso de sinistro

```
a) Comunicar o facto à empresa de seguros no mais curto prazo possível,
   nunca superior a oito dias a contar do dia da ocorrência ou do dia em que
   tenha conhecimento, fornecendo todas as indicações e provas documentais
   e/ou testemunhais relevantes;
b) Tomar as medidas ao seu alcance no sentido de evitar ou limitar as
   consequências do sinistro;
E não pode:
a) Abonar extrajudicialmente a indemnização ou adiantar dinheiro sem
   autorização da empresa de seguros;
b) Aceitar a responsabilidade pelo evento (reconhecimento tácito).
```

### 2.2 Artigo 35.º — Forma da participação

```
1 - A participação deve ser feita em impresso próprio fornecido pela empresa
    de seguros ou disponível no seu sítio na Internet (modelo aprovado pelo
    ISP/ASF), ou por qualquer outro meio de comunicação sem presença física,
    desde que fique registo escrito ou gravado.
3 - Quando a participação é assinada conjuntamente por ambos os condutores
    envolvidos, presume-se que o sinistro se verificou nas circunstâncias
    declaradas (presunção DAAA).
4 - A participação identifica os campos de preenchimento indispensável.
```

**Leitura fundamental**: a lei **admite explicitamente** a participação por meios digitais ("qualquer outro meio de comunicação que possa ser utilizado sem a presença física e simultânea das partes, desde que dela fique registo escrito ou gravado"). Um fluxo web/app FNOL está coberto, desde que:
- fique **registo escrito ou gravado** → log de submissão + cópia do formulário + timestamp;
- use o **modelo aprovado** quando aplicável (campos obrigatórios da DAAA).

### 2.3 Artigo 36.º — Prazos de diligência da seguradora (automóvel)

| Fase | Prazo legal |
|---|---|
| Primeiro contacto (marcar peritagens) | **2 dias úteis** após participação |
| Conclusão das peritagens | **8 dias úteis** após o 1.º contacto |
| Com desmontagem | **12 dias úteis** |
| Relatórios de peritagem disponibilizados | **4 dias úteis** após conclusão |
| Comunicação de assunção/não assunção de responsabilidade | **30 dias úteis** após o termo do 1.º contacto |
| Ordem de reparação pelo proprietário | direito reconhecido (custo ao segurador na medida do apuramento) |

**Implicação de design**: um motor FNOL deve gerar **tarefas com deadline** para cada um destes marcos, com escalonamento automático. O incumprimento gera responsabilidade da seguradora (juros, sanções ASF).

### 2.4 Danos corporais — prazos distintos

Para danos corporais, o diploma prevê regimes de quantificação médica (avaliação de incapacidade, coordenação com a Avaliação Médica e SPS — Sistema de Peritagem Simplificada) e prazos de proposta de indemnização articulados com a MID (ver secção 14): **3 meses** para oferta fundamentada após quantificação.

---

## 3. Recomendações ASF n.º 2/2025 — Multirriscos Habitação (abril 2025)

A ASF publicou em 8/04/2025 as Recomendações n.º 2/2025, específicas para sinistros **multirriscos habitação**, que estabelecem prazos *recomendados* (não mandatórios, mas monitorizados — a ASF publica a lista de aderentes).

### 3.1 Prazos recomendados

| Fase | Prazo recomendado ASF |
|---|---|
| Primeiro contacto (peritagem/sequência) | **4 dias úteis** |
| Assunção responsabilidade — cobertura edifício | **25 dias úteis** |
| Assunção responsabilidade — cobertura recheio | **40 dias úteis** |
| Ambas as coberturas | **40 dias úteis** |

Prazos podem **duplicar** em situações excecionais (catástrofe/volume elevado, condomínio, incêndio/sísmico) e **suspender** durante investigação de fraude fundamentada ou impossibilidade comprovada de contacto.

### 3.2 Obrigações de governação

- Manual interno de regularização de sinistros;
- Auditorias internas periódicas à qualidade do procedimento (incidência em claims declinados);
- Informação pré-contratual sobre procedimentos e **prazos médios** (publicada no site, separador "Informações relevantes para o cliente");
- Comunicação **por escrito** da decisão de assunção/não assunção + fundamentos + meios de reação;
- Informação regular do estado do processo ao tomador/segurado/lesado;
- Reporte à ASF da adesão em 2 meses.

**Para a ClaimsAI**: estas recomendações transformam-se em (a) dashboards de SLA por cobertura, (b) modelo de comunicações por escrito geradas automaticamente, (c) trilho de auditoria que sustente a auditoria interna ASF, (d) métricas públicas de prazo médio.

---

## 4. Normas Regulamentares ASF 2025–2026 relevantes

Do catálogo do regime contratual ASF:

- **NR 3/2026-R (28/04/2026)** — regime contratual (atualizações de informação pré-contratual);
- **NR 1/2026-R (3/02/2026)** — regime contratual;
- **NR 8/2025-R (18/11/2025)** — regime contratual;
- **NR 6/2025-R (5/08/2025)** — regime contratual;
- **NR 3/2025-R (15/04/2025)** — regime contratual.

Tendência transversal destas normas: reforço de **transparência pré-contratual**, informação ao cliente sobre procedimentos de sinistro, e publicação de métricas de desempenho. Uma plataforma FNOL deve produzir os artefactos documentais (IPID sobre sinistros, manual, métricas) como saída, não como trabalho manual.

---

## 5. DAAA — Declaração Amigável de Acidente Automóvel

A DAAA é o instrumento normalizado de participação em sinistros automóveis ligeiros em Portugal (e homólogos europeus: Constat Amiable FR, Accident Report BE, etc.).

### 5.1 Efeito jurídico

- **Assinada por ambos os condutores** → presunção legal das circunstâncias (art. 35.º n.º 3 DL 291/2007): a seguradora só pode afastar com prova em contrário.
- Assinada por **um só condutor** → participação simples; a outra parte pode contestar.

### 5.2 Elementos estruturais obrigatórios

Campos essenciais da DAAA: dados das seguradoras/apólices, matrículas, condutores, data/hora/local, pontos de impacto (esquema do veículo), danos aparentes, circunstâncias (17 opções normalizadas: estacionado, a circular, a sair de parqueamento, a mudar de faixa, ultrapassagem, inversão de marcha, marcha-atrás, incumprimento de sinal, etc.), croqui do acidente, testemunhas, feridos, danos materiais além dos veículos.

### 5.3 Digitalização

Vários mercados europeus já têm DAAA eletrónica oficial (e-Constat em França, Crashform). Em Portugal a DAAA digital é admitida via art. 35.º ("outro meio de comunicação... registo escrito") mas **sem formato regulamentar único** — as seguradoras usam apps próprias. Requisitos-chave para uma DAAA digital:
- Croqui interativo (drag de veículos, setas, via);
- Checkboxes das 17 circunstâncias normalizadas;
- Assinatura de ambos os condutores (dedo/ecrã — eIDAS assinatura eletrónica simples suficiente);
- Timestamp + GPS;
- Versão PDF da DAAA gerada para efeitos de prova;
- Fotos anexas com hash.

---

## 6. Danos Corporais — regime especial

Sinistros automóveis com danos corporais seguem procedimento próprio:

- Participação deve identificar lesados e natureza das lesões;
- Direito à **proposta de indemnização** dentro dos prazos MID (3 meses);
- Intervenção do Sistema de Peritagem Simplificada (SPS) e avaliação médica coordenada;
- Suspeita de fraude organizada (rede de lesões simuladas) — a ASF e a PJ mantêm cooperação específica;
- Tabela Nacional de Incapacidades (TNI) para quantificação;
- Processos especiais: BDY (bodily injury teams), unidades de danos corporais com SLA próprio.

Um FNOL deve **escalar automaticamente** quando há menção a feridos: flag de prioridade alta, campos de lesões (parte do corpo, hospital, transporte), e gate "não liquidar sem parecer médico".

---

## 7. Prova digital e cadeia de custódia em Portugal

### 7.1 Admissibilidade

Em Portugal não há exclusão de prova digital: fotografias, vídeos e metadados são admissíveis como documentos (art. 362.º ss. CC) e meios de prova pericial. A força probatória depende da **credibilidade**: data, origem, integridade.

### 7.2 Boas práticas ENFSI/ETSI aplicáveis

- **ENFSI BPM-DI** — autenticação de imagem digital: análise de contexto, fonte, integridade e manipulação;
- **ETSI TS 103 643 — Digital Evidence Bag (DEB)**: encapsulamento de evidência com metadados de proveniência e assinaturas — modelo ideal para um "pacote de evidência de sinistro";
- Council of Europe Guidelines on Electronic Evidence (2019): prova eletrónica deve conservar formato original + metadados (não imprimir/re-encodar);
- Cadeia de custódia documentada: quem capturou, quando, como transitou, hashes em cada transição.

### 7.3 Na ClaimsAI (design já parcialmente implementado)

- SHA-256 por ficheiro no momento do upload (integridade);
- Timestamp servidor + timestamp de captura (EXIF);
- Token de claim = identidade da origem;
- Audit trail de cada transição;
- **Gap para fechar**: assinatura temporal qualificada (eIDAS QTS) sobre o pacote de evidência para efeitos forenses avançados.

---

# PARTE II — ENQUADRAMENTO LEGAL (UNIÃO EUROPEIA)

## 8. EU AI Act — Regulamento (UE) 2024/1689

O AI Act entrou em vigor a 1/08/2024, com aplicação faseada.

### 8.1 Calendário de aplicação

| Data | O que entra em vigor |
|---|---|
| 1/08/2024 | Entrada em vigor |
| 2/02/2025 | Práticas de IA proibidas + literacia em IA (art. 4-5) |
| 2/08/2025 | Regras de governação + obrigações GPAI |
| **2/08/2026** | **Aplicação geral — incl. obrigações de transparência (art. 50)** |
| 2/12/2027 | Alto-risco Anexo III (adiado pelo "AI Omnibus") |
| 2/08/2028 | Alto-risco integrado em produtos regulados (Anexo I) |

### 8.2 Classificação de risco aplicável a seguros

- **Proibido** (art. 5): manipulação subliminar, exploração de vulnerabilidades, social scoring, reconhecimento de emoções no trabalho, scraping facial indiscriminado.
- **Alto-risco** (Anexo III): em seguros, o AI Act lista expressamente como alto-risco a IA de **avaliação de risco e pricing** de pessoas singulares **em seguro de vida e saúde**. Nota: FNOL/auto/property **não está na lista** de alto-risco — mas ver análise abaixo.
- **Risco limitado** (art. 50): chatbots/assistentes, geração/manipulação de imagem/áudio/vídeo (deepfakes) → **obrigação de transparência**: o utilizador deve saber que interage com IA; conteúdo sintético deve ser rotulado.
- **Risco mínimo**: restantes — códigos de conduta voluntários.

### 8.3 Análise específica FNOL (claims IA)

Onde fica um sistema FNOL com deteção de danos por CV:

| Componente | Classificação provável | Obrigações |
|---|---|---|
| Chatbot/assistente de intake | Risco limitado | Art. 50 — informar que é IA |
| Deteção CV de danos (assistiva) | Mínimo-limitado | Transparência + boas práticas EIOPA |
| Triage/decisão de cobertura (se impactar acesso ao serviço) | Pode ser revisto como alto-risco por autoridades | Avaliação caso-a-caso (art. 6(3)-(4)) |
| Fraude/anomalia | Mínimo | Mas envolve decisão sobre pessoa → cuidado com art. 22 RGPD |
| Sumarização de laudo (LLM) | Limitado | Marcar conteúdo gerado + revisão humana |

**Interpretação conservadora para 2026**: tratar o sistema FNOL como **risco limitado + boas práticas de governação**, mantendo: (1) disclosure de IA ao segurado, (2) resultados de IA sempre marcados como "assistivos — não substituem peritagem", (3) human-in-the-loop nas decisões de cobertura/valor, (4) logs de decisão de IA, (5) AI literacy da equipa (obrigatório desde 2/02/2025).

### 8.4 Obrigações que já se aplicam ou se aproximam

- **Literacia IA** (art. 4): formar pessoal que usa/operacionaliza IA — documentar formação.
- **Transparência** (art. 50, desde 2/08/2026): avisar o segurado de que interage com sistema de IA; rotular conteúdo gerado (relatórios de laudo IA, imagens anotadas por IA).
- Se alguma funcionalidade for reclassificada como alto-risco (ex.: scoring de fraude com efeito material sobre acesso à indemnização — debate aberto): inventário de sistemas, avaliação de impacto de direitos fundamentais (FRIA), registo, human oversight, logs, robustez/cyber.
- **Dados de treino** (se treinar modelos próprios): governança de dados, bias checks, documentação de dataset.

## 9. EIOPA — Opinião sobre Governação de IA em Seguros (Fev 2025)

A EIOPA publicou a "Opinion on AI governance and risk management in insurance" — documento-guia do supervisor europeu. Aplica-se aos sistemas **não-proibidos e não-alto-risco** (a maioria dos casos FNOL).

### 9.1 Seis pilares exigidos

1. **Fairness e ética** — medir e mitigar viés e discriminação (preço, cobertura, triage por grupo);
2. **Data governance** — qualidade, proveniência, adequação dos dados;
3. **Documentação e record-keeping** — descrição do sistema, dados, decisões;
4. **Transparência e explainabilidade** — o utilizador (e o perito) deve compreender a saída;
5. **Human oversight** — supervisão humana proporcional ao impacto;
6. **Precisão, robustez e cibersegurança** — performance monitorizada, resistência a inputs adversariais.

### 9.2 Proporcionalidade

A EIOPA pede avaliação de risco **específica por caso de uso**: impacto potencial no cliente (económico/direitos), autonomia do sistema, reversibilidade da decisão. FNOL assistivo (CV sugere, perito decide) = avaliação mais leve; decisão automatizada de cobertura = avaliação pesada.

### 9.3 Terceiros/ vendors de IA

Seguradora mantém **responsabilidade total** mesmo usando IA de terceiros. Exige: documentação do modelo do vendor, dados de treino/teste, limitações, cláusulas contratuais + direito de auditoria (alinhado com DORA).

## 10. RGPD + Lei 58/2019 — dados de sinistros, fotos e vídeo

### 10.1 Bases legais corretas

Para dados de sinistros e evidência fotográfica/vídeo:

- **Execução do contrato** (art. 6.º 1.b RGPD) — processar o claim;
- **Obrigação legal** (art. 6.º 1.c) — registos, prazos, DAAA, comunicações ASF;
- **Interesse legítimo** (art. 6.º 1.f) — deteção de fraude (recital 47 RGPD expressamente menciona fraude), melhoria de serviço — com balancing test documentado;
- **Consentimento** — só para o que exceder o necessário ao claim (ex.: uso para marketing, ou dados biométricos sensíveis);
- **Dados sensíveis** (art. 9): saúde em danos corporais — exige exceção (interesse vital, obrigação de seguro — art. 9.º 2 + direito nacional); biométrico de identificação — evitar ou base em obrigação legal.

### 10.2 Fotos e vídeo como prova (posição CNPD)

- Fotografia/vídeo de terceiros capturada pelo segurado como prova de sinistro é tratamento legítimo sob execução de contrato + interesse legítimo — mas minimizar: pedir foco no dano, evitar rostos/matriculas alheias desnecessárias;
- Se a app captura rostos/matrículas incidentais — política de retention e possível redação (o claims-ai tem/terá anonymizer);
- Matrículas de veículos: dados pessoais (ligam a pessoa) — mas necessários ao claim;
- Geolocalização EXIF: dados pessoais — útil ao claim, mas expor só ao necessário;
- **Informação ao titular** (art. 13-14): aviso de privacidade no FNOL — finalidades, bases, conservação, destinatários, direitos, DPO, transferências.

### 10.3 Conservação (Lei 58/2019 art. 21)

- Sem prazo legal específico → pelo prazo de prescrição dos direitos (geral civil: 20 anos; seguro específico pode ter prazos mais curtos — RC automóvel, ação direta);
- Prática do setor PT (ex.: Fidelidade): conservar durante a relação contratual + prazo de prescrição;
- Destruição/anonimização quando cessa a finalidade — implementar rotina de purga com exceção de litígio/auditoria.

### 10.4 Decisões automatizadas (art. 22 RGPD)

- Decisões **com efeito jurídico ou similar** sobre o segurado não podem ser unicamente automatizadas — ex.: declinar cobertura só por IA → **proibido** sem exceções;
- Solução: IA propõe, humano decide (obrigatório documentar a decisão humana);
- Direito a intervenção humana + expressão de ponto de vista + contestação.

### 10.5 Registos e DPO

- Registo de atividades de tratamento (art. 30) — sinistros como categoria;
- DPIA (avaliação de impacto) recomendada para: perfilagem de fraude, CV em massa, matching de bases, geolocalização;
- DPO designado + contacto publicado.

## 11. DORA — Regulamento (UE) 2022/2554

DORA aplica-se desde **17/01/2025** a seguradoras e prestadores de serviços TIC. Impacto em FNOL:

### 11.1 Pilares

- **Gestão de risco TIC**: framework documentada, ativos inventariados (incl. modelo de IA);
- **Testes de resiliência**: anual básico + TLPT (3 anos) para entidades maiores;
- **Incidentes**: classificação + reporte às autoridades (major ICT incidents);
- **Terceiros TIC** (art. 28-30): registo de prestadores TIC; contratos com cláusulas obrigatórias (auditoria, saída, localização de dados, subcontratação, SLAs) para **funções críticas/importantes**;
- **Partilha de informação** sobre ameaças.

### 11.2 Consequência para ClaimsAI

- A plataforma FNOL é uma **função crítica/importante** se sustentar a regularização de sinistros → contrato seguradora-vendor deve conter: direitos de auditoria/inspeção (incl. pooled audits), exit strategy, portabilidade de dados, segurança, continuidade;
- Registo anual no "register of information" — a seguradora lista ClaimsAI como ICT TPP;
- Backups, RTO/RPO definidos; evidência = ativo crítico (cadeia de custódia ≠ só prova: é resiliência operacional);
- Vendors de IA contam como ICT services (osborneclarke FAQ): GPAI vendors incluídos.

## 12. Solvency II + IDD — governação do processo

### 12.1 Solvency II (Diretiva 2009/138/CE)

- **Art. 41** — sistema de governação eficaz, prudente, proporcional;
- **Art. 46** — sistema de controlo interno;
- Outsourcing de funções críticas (arts. 38, 49 + DR 2015/35) — notificação ao supervisor, cláusulas de auditoria;
- Segurança/integridade/confidencialidade da informação (art. 258 DR).

### 12.2 IDD (Diretiva (UE) 2016/97)

- **Art. 25** — product oversight & governance (POG): desenhar produto/processos para o mercado-alvo — inclui experiência de sinistros;
- **Art. 17-20** — atuar no melhor interesse do cliente, comunicações claras;
- IPID (documento de informação do produto) — deve informar "como participar um sinistro";
- Claims handling como fase do ciclo de vida coberta pela conduta.

## 13. eIDAS e prova eletrónica

### 13.1 Princípio de não-discriminação

Art. 46 eIDAS + Taking of Evidence Recast (EU 2020/1783): **um documento eletrónico não pode ser recusado como prova só por ser eletrónico**. Fotos/vídeo FNOL são admissíveis em toda a UE.

### 13.2 Selos de confiança

| Instrumento eIDAS | Efeito | Aplicação FNOL |
|---|---|---|
| Assinatura eletrónica qualificada | presunção de identidade do signatário | DAAA digital assinada pelos dois condutores |
| Selo eletrónico qualificado | presunção de integridade da origem | laudos/emissões da seguradora |
| Carimbo temporal qualificado (QTS) | presunção de data/hora | timestamp da captura da evidência |
| Registo eletrónico de entrega (e-delivery) | prova de envio/receção | envio da participação ao segurador |

**Recomendação de arquitetura**: aplicar QTS sobre o hash do pacote de evidência (SHA-256) no momento da receção — cria presunção de integridade difícil de impugnar, custo marginal.

## 14. Diretiva Motor Insurance (MID consolidada) — prazos UE

A MID (2009/103/CE consolidada) contém a regra transfronteiriça fundamental:

> **3 meses** a partir da reclamação do lesado:
> - oferta fundamentada de indemnização (responsabilidade não contestada + danos quantificados), ou
> - resposta fundamentada aos pontos da reclamação (se negada/indeterminada/não quantificada);
> - após admissão de responsabilidade ou quantificação posterior: nova janela de 3 meses para oferta fundamentada.

Também: representantes de sinistros em cada Estado-Membro, centro de informação, organismo de compensação. Transposto em PT por DL 291/2007 — que concretiza em prazos mais curtos (2+8+12+4+30 dias úteis).

## 15. Acessibilidade digital — European Accessibility Act

A EAA (Diretiva (UE) 2019/882) obriga **serviços de comércio eletrónico e apps móveis de banca/serviços** a cumprir WCAG 2.1 AA desde **28/06/2025**. Interfaces de segurado (FNOL web/app) devem cumprir:

- Contraste mínimo, navegação por teclado, leitores de ecrã;
- Texto alternativo em imagens; legendas/alt em conteúdo de vídeo instrucional;
- Formulários com labels, gestão de erros clara;
- Alternativas de canal para quem não pode usar digital (telefone) — o "digital-only" não pode excluir clientes vulneráveis.

---

# PARTE III — REQUISITOS FUNCIONAIS DE UM SISTEMA FNOL CONFORME

## 16. Checklist legal → requisito técnico

| # | Requisito legal | Fonte | Implementação técnica |
|---|---|---|---|
| 1 | Participação ≤ 8 dias | DL 72/2008 art.100 / DL 291/2007 art.34 | Link instantâneo no acidente; lembretes; flag de atraso (sem penalização automática) |
| 2 | Conteúdo: circunstâncias, causas, consequências | DL 72/2008 art.100.2 | Formulário estruturado FNOL (quando/onde/como/o quê/danos) |
| 3 | Registo escrito/gravado da participação | DL 291/2007 art.35.1 | PDF da participação + log de submissão + QTS |
| 4 | Campos indispensáveis identificados | DL 291/2007 art.35.4 | Validação obrigatória por campo |
| 5 | 1.º contacto ≤2d / peritagem ≤8-12d / relatório ≤4d / decisão ≤30d | DL 291/2007 art.36 | Motor de workflow com deadlines + escalonamento |
| 6 | MR habitação: 4d/25d/40d recomendados | ASF Rec. 2/2025 | SLA configurável por cobertura + relatório de adesão |
| 7 | Decisão escrita fundamentada + meios de reação | ASF Rec. 2/2025 + DL 291/2007 art.36.e | Template de comunicação gerada automaticamente |
| 8 | Informação regular do estado | ASF Rec. 2/2025 | Timeline/tracking para o segurado + notificações |
| 9 | Presunção DAAA conjunta | DL 291/2007 art.35.3 | DAAA digital com assinatura dupla |
| 10 | Danos corporais — escalação | DL 291/2007 + SPS | Deteção de feridos → prioridade + gate médico |
| 11 | Disclosure de IA | AI Act art.50 | Aviso "interage com IA" + conteúdo IA rotulado |
| 12 | IA assistiva, não decisória | RGPD art.22 + EIOPA | Human-in-the-loop: cobertura/valor sempre com perito |
| 13 | Explicabilidade | EIOPA/AI Act | Findings com confiança + bounding boxes + notas de validação |
| 14 | Literacia IA da equipa | AI Act art.4 | Formação documentada + runbooks |
| 15 | Inventário e avaliação de sistemas IA | AI Act + EIOPA | Registo de modelos, datasets, versões, riscos |
| 16 | Base legal + aviso de privacidade | RGPD art.6/13 | Texto de privacidade no FNOL; registo art.30 |
| 17 | Minimização de dados de imagem | RGPD | Redação de rostos/matrículas incidentais |
| 18 | Conservação limitada | Lei 58/2019 art.21 | Purga/anomização após prescrição + hold de litígio |
| 19 | Integridade de evidência | Prova digital/ENFSI | SHA-256 + timestamps + cadeia de custódia |
| 20 | QTS eIDAS | eIDAS | Selo temporal no pacote de evidência |
| 21 | Resiliência/fornecedor TIC | DORA | Contrato vendor com cláusulas 28-30; backups/RTO |
| 22 | POG/melhor interesse do cliente | IDD art.25 | Métricas de experiência, revisão do fluxo |
| 23 | Acessibilidade WCAG 2.1 AA | EAA | UI conforme + canal alternativo |
| 24 | Fraud detection fundamentada | ASF + RGPD | Sinais explicáveis, não-scoring opaco; suspensão de prazos documentada |

## 17. Consentimento e transparência — padrões

### 17.1 No FNOL (momento zero)

Texto de aviso mínimo a apresentar:

> "Está a utilizar um sistema de participação de sinistro com assistência de inteligência artificial. As suas fotografias e dados serão usados exclusivamente para regular o seu sinistro, nos termos do aviso de privacidade [link]. A análise por IA é assistiva — todas as decisões são tomadas por peritos."

Elementos: finalidade, base legal, conservação, destinatários (oficinas, peritos, resseguradores, autoridades), direitos (acesso, retificação, oposição, contacto DPO), IA disclosure (art. 50 AI Act).

### 17.2 Durante o processo

- Opt-out de tratamento não essencial (analytics/marketing);
- Se o segurado retira consentimento opcional → degradação graciosa, não bloqueio do claim;
- Documentar cada consentimento: versão do texto, data, canal, IP — provável pedido CNPD.

### 17.3 Terceiros capturados

- Fotos enviadas pelo segurado podem conter dados de terceiros (lesados, matrículas, testemunhas) — informação art. 14 RGPD por proxy: exigir do segurado que informe, e limitar exposição.

## 18. Integridade, autenticidade e anti-fraude de evidência

### 18.1 Pipeline de integridade

```
CAPTURA → hash local + metadados captura (device, GPS, hora)
       ↓
TRANSMISSÃO → TLS + token de claim
       ↓
RECEÇÃO → SHA-256 servidor + EXIF parse + detecção de edição
       ↓
SELO → QTS sobre o manifesto (eIDAS)
       ↓
ARMAZENAMENTO → imutável (WORM/versioning)
       ↓
AUDITORIA → cada acesso/transição registada
       ↓
EXPORTAÇÃO → "Digital Evidence Bag" (ETSI TS 103 643)
```

### 18.2 Sinais de autenticidade a validar (ver lib/fraud.ts + rotas de qualidade)

- EXIF coerente: data dentro da janela do sinistro; GPS ≈ local declarado; device model;
- Falta de EXIF em "foto capturada" → flag (reencodada/screenshot);
- Deteção de edição: análise de compressão ELA, clonagem, duplicados internos;
- Reverse-image check (se disponível) para fotos recicladas da web;
- Anomalia de sequência: datas de captura anteriores à data do sinistro declarada;
- Deteção de imagem sintética (AI-generated) — classificador dedicado (2026 é obrigatório: deepfakes em claims crescem).

### 18.3 Não-punição sem prova

Importante: falha de EXIF/anomalia **não é prova de fraude** — é sinal de verificação. A lei PT e ASF exigem investigação fundamentada para suspender prazos/declinar. Todo sinal deve ter justificação escrita.

## 19. Prazos e SLAs — motor de workflow

### 19.1 Timeline obrigatório automóvel (DL 291/2007)

```
D0   participação recebida (timestamp)
D0+2u  primeiro contacto (marcação peritagem)
     +8u  peritagens concluídas
     +12u (com desmontagem)
     +4u  relatórios disponibilizados
     +30u comunicação assunção/não-assunção (escrita)
```

### 19.2 Timeline MR habitação (ASF Rec. 2/2025)

```
D0+4u  primeiro contacto
D0+25u decisão (edifício) | D0+40u (recheio/ambos)
Suspensões: fraude investigada, impossibilidade de contacto comprovada, força maior/volume
Duplicação: catástrofe, condomínio, incêndio, sísmico
```

### 19.3 Estados e escalonamento

- Estados: `awaiting_evidence → evidence_received → analyzing → analyzed → decision_pending → decided → closed`;
- Escalonamento: task a T-1 dia útil; alerta no dia; breach → notificação ao responsável + reporte;
- Relógio = dias úteis PT (feriados nacionais + municipais configuráveis).

## 20. Auditoria, logging e explainabilidade

### 20.1 Log de decisão de IA

Por cada decisão/sugestão de IA registar: modelo+versão, input (hash da evidência), output bruto, confiança, validações aplicadas, humano que validou, timestamp. Exemplo já implementado na ClaimsAI: `analysis` com `aggregatedFindings[].validationNotes`.

### 20.2 Trilho de auditoria de claim

Cada evento: ator (cliente/perito/sistema), ação, detalhe, timestamp. Necessário para: auditoria interna ASF, defesa em litígio, DORA incidents, CNPD.

### 20.3 Explainabilidade operacional

- Findings de CV mostram bounding box + tipo + confiança + partKey — o perito percebe "o quê e onde";
- Estimativas de custo por banda (modelo não dá valores absolutos) — nota de validação explícita;
- Relatório IA marcado como rascunho assistivo.

---

# PARTE IV — INOVAÇÃO FNOL 2026

## 21. Estado da arte — para onde o setor está a ir

Tese central (Everest Group, Charlee.ai, Duck Creek, Celent 2026): FNOL está a sair de "formulário digital" para **porta de entrada agêntica, multimodal e orientada a eventos**:

- **Agentic AI**: agentes que detetam, raciocinam, agem e coordenam o claim sem intervenção;
- **Multimodal**: texto+voz+imagem+vídeo+telemática+contexto externo cruzados num intake só;
- **Grounded generation**: sumários e respostas gerados exclusivamente de fontes aprovadas do claim;
- **Event-driven**: triggers de telemática/IoT/tempo abrem claim antes do segurado ligar;
- **Connected ecosystems**: oficinas, reboque, renda-a-car, médicos ligados por API no intake.

## 22. Video FNOL e captura guiada

### 22.1 Definição e valor

Video FNOL = capturar o dano por vídeo (ao vivo ou guiado) no primeiro contacto — em vez de adivinhar pela descrição. Dados do setor:

- Virtual claims passaram de <15% para ~60% dos sinistros automóveis (LexisNexis);
- Documentação por vídeo pode cortar **até 50%** do tempo de ciclo do claim (TruVideo);
- Reduz visitas físicas desnecessárias e repetição de deslocações.

### 22.2 Padrões de captura guiada (o que a ClaimsAI já faz e o que falta)

- Walk-around guiado com ângulos esperados (frente/retaguarda/laterais/quartos) — deteção ao vivo de vista (probing `/api/detect-view` → heurística v11n);
- Verificações de qualidade ao vivo: focagem, iluminação, distância/enquadramento, cobertura dos 4 lados, close-ups do dano;
- Vídeo 360 com indicação de progresso (X% do veículo coberto);
- Timestamp/GPS embutidos; hash do vídeo capturado;
- Múltiplos takes e revisão antes do envio;
- Extração de keyframes para análise IA (implementado: `extractKeyframes`).

### 22.3 Enriquecimentos de ponta

- AR overlays no ecrã (guia de posição);
- Voz assistiva ("aproxima-te do painel dianteiro");
- Deteção de objetos e peças em tempo real durante o vídeo;
- Auto-checklist: slots de foto obrigatórios por tipo de sinistro (a app já tem 9 slots).

## 23. Computer vision — benchmarks reais

### 23.1 Precisão medida (estudos externos)

| Fonte | Métrica | Resultado |
|---|---|---|
| Tractable (RDN demo 2019) | part replace/repair confidence | 58–100% conforme peça/ângulo |
| plan-d case study | component + damage grade | **93% accuracy** ≈ perito experiente |
| arXiv 2401.09245 | meta-modelo de incerteza | AUROC 0.915; mIoU +16pp |
| IEEE Access 2023 | pipeline multi-ângulo + dados estruturados | +2pp AUC vs baseline |
| YOLOv11n 14-cls (HF vineetsarpal) | mAP50 | 79.7% |
| CarDD YOLOv8s-seg v2 (HF abdullahg7) | mAP50 | 75.8% |

### 23.2 Aprendizagem prática importante

- **Estimativa por foto < estimativa presencial**: supplements de 52.9–67.4% do orçamento inicial em fotos simples vs 30–34% em inspeções físicas (Mitchell/CCC). Conclusão: usar CV para **triage + primeira estimativa**, não para liquidação final de claims complexos — human-in-the-loop paga-se;
- Consistência > perfeição: modelo dá sempre o mesmo resultado para a mesma foto; peritos humanos variam entre si;
- Meta-avaliação de qualidade da imagem é essencial: filtrar segmentos de baixa confiança melhora drasticamente o resultado;
- Modelos treinados em danos específicos (CarDD, 14-cls) >> open-vocabulary genéricos (YOLO-World falha em carros: "rust on car" 0.87 em pintura limpa — aprendido na ClaimsAI).

### 23.3 Segmentation masks + part detection

- Modelos seg (CarDD/YOLO-seg) produzem polígonos de dano — permitem sobreposição visual no relatório do perito;
- Deteção de peça (porta/parachoque/capô/vidros) por modelo específico dá `partKey` direto — essencial para custos por peça e taxonomia.

## 24. Agentic FNOL — referências do setor (2025–2026)

| Player | Caso | Resultado reportado |
|---|---|---|
| **Allianz** | Project Nemo — 7 agentes (planner, cyber, coverage, weather, fraud, payout, audit) para claims simples NatCat | ~80% mais rápido, dias→horas |
| **AXA Suíça** | Shift Claims (agentic) — classificação, priorização, automação | -3% perdas, +30% velocidade, 60% automação, >99% precisão |
| **Lemonade** | AI Jim — claims simples via FNOL digital | payout recorde em **3 segundos** |
| **Duck Creek** | Agentic FNOL (Google Gemini) — intake conversacional, verificação de cobertura, triage, anomalias | early access Set 2026; Celent: 22% de seguradoras planeiam agentic até fim de 2026 |
| **Zurich** | AI Lab c/ ETH Zurich + St. Gallen | investigação→produção agentic |

### 24.1 O que "agentic" significa em termos concretos

- Um agente "intake" lê a participação, extrai entidades, valida cobertura na apólice, deteta inconsistências;
- Um agente "evidence" pede ficheiros em falta, valida qualidade das fotos;
- Um agente "fraud" calcula sinais e explica porquê;
- Um agente "triage" atribui severidade/prioridade e sugere canal (STP vs perito);
- Um agente "comms" mantém o segurado informado (mensagens automáticas com disclosure);
- Um agente "audit" regista tudo — o trilho exigido por ASF/AI Act.

### 24.2 Guard-rails obrigatórios

- Limites de autoridade por agente (que decisões pode tomar);
- Regras proibidas (ex.: não pode declinar cobertura, não pode contactar lesado sem supervisão);
- Grounding: só pode afirmar o que está no claim/documentos;
- Escalonamento humano em ambiguidade.

## 25. Deteção de fraude na admissão

### 25.1 Sinais clássicos implementáveis

- **Temporais**: participação muito tardia vs data de ocorrência; hora incompatível com testemunhos;
- **Imagem**: sem EXIF quando deveria ter; ELA/editing; imagem da web; datas de captura anteriores ao sinistro;
- **Conteúdo**: danos inconsistentes com dinâmica relatada (a app já valida); padrão reincidente de sinistro do segurado;
- **Entidade**: mesmo VIN/matricula em claims anteriores; morada/email suspeitos;
- **Contextual**: sinistro em zona de alto risco de fraude; meteo incompatível (chuva declarada, registos secos).

### 25.2 Legalidade (importante)

- Sinais devem ser **explicáveis e documentados** — a ASF permite suspender prazos durante investigação fundamentada, mas exige fundamentação;
- Decisões de declinar por suspeita exigem decisão humana + comunicação fundamentada;
- Cuidado com profiling discriminatório (EIOPA fairness): não usar proxies proibidos (nacionalidade, género, código postal como proxy étnico);
- Recital 47 RGPD legitima prevenção de fraude como interesse legítimo.

## 26. Telemática, IoT e triggers automáticos

- **Telemática auto**: acelerómetro do dongle/app deteta impacto → pré-abertura de FNOL com dados de força/direção;
- **Casa conectada**: sensores de água/fumo → trigger de sinistro habitação;
- **Dashcam/frota**: vídeo de acidente anexado automaticamente;
- **Meteo/tempo**: cruzamento de data/local com registos meteorológicos (granizo/tempestade) para verificação;
- Consentimento telemático + finalidade declarada — base legal distinta da execução do claim;
- A app ClaimsAI pode ingerir JT808/telematics se ligada à frota (projeto VehicleMonitoring do cliente).

## 27. Pagamentos instantâneos e STP (straight-through processing)

- Claims simples (vidro, pequenas amolgadelas, conteúdo de baixo valor) podem ser STP: intake → verificação → estimativa → pagamento, sem perito;
- Lemonade mostrou payout em 3s; mas **STP em decisões de cobertura negativas é terreno regulamentar sensível** — fazer STP só de aprovações;
- Pagamentos SEPA Instant em PT já suportados; documentar critérios de elegibilidade STP na apólice/POG;
- Thresholds: ex.: STP até €X estimados e nenhum sinal de fraude, ou caminho humano.

## 28. Voz, chatbots e omnicanalidade

- 24/7 voice agents para intake telefónico (transcrição → estruturação FNOL);
- Chatbot multilingue PT/EN — obrigatório para expats/turistas (claims de estrangeiros);
- Disclosure art. 50 AI Act no voicebot ("estou a falar com um assistente automático");
- Omnicanal: a mesma claim aberta por SMS link, continuada em app, assistida por telefone — estado único.

## 29. Reclamações digitais e DAA eletrónico

- e-Constat/DAA digital já é referência na Europa — em PT as seguradoras têm apps próprias, mas um **formato intersegurador** não é regulamentado;
- Croqui digital + assinaturas de ambos os condutores no telemóvel (presunção art. 35.3);
- QR-code partilhado entre condutores no local;
- Reclamações: integração com livro de reclamações eletrónico (Lei 156/2005 + DL 74/2017) — link obrigatório disponível.

---

# PARTE V — MATURIDADE & ROADMAP

## 30. Modelo de maturidade FNOL (Everest Group adaptado)

| Nível | Características | Onde está a ClaimsAI |
|---|---|---|
| 1. Passivo | Call center, papel, email | — |
| 2. Digital | Formulário web, upload de fotos | ✅ implementado |
| 3. Evolução | IA assistiva (CV), guided capture, omni | ✅ implementado (CV ONNX + walkaround) |
| 4. Agentic | Agentes orquestrados, STP parcial | ◐ parcial (triage assistivo, análise automática) |
| 5. Autónomo | Deteção→resolução com mínimo humano | ○ alvo |

**Leitura honesta**: ClaimsAI está em 3→4: tem captura guiada, CV real, persistência, audit trail, relatório assistivo. Falta: orquestração agêntica completa, verificação de cobertura real contra apólices, STP governado, telemática, e-Constat.

## 31. Métricas e KPIs de referência (para benchmarking interno)

| KPI | Baseline indústria | Estado da arte | Meta ClaimsAI |
|---|---|---|---|
| Tempo médio criar claim | 4–12h | ~1h | <30min |
| 1.º contacto | dias | <24h | automático (imediato) |
| % claims com media completa | variável | guided capture | 100% checklist |
| Estimativa fotos → supplement | +52–67% | pipeline multi-ângulo melhor | monitorar |
| Tempo de análise por imagem | 30–90s VLM | 1–3s ONNX | ✅ 1.5s |
| % STP | ~15-25% | 60% (AXA) | 30% inicial |
| Decisões IA auditadas | n/a | 100% | 100% |
| WCAG AA | n/a | obrigatório | conforme |

## 32. Matriz legal×feature para ClaimsAI

| Feature ClaimsAI | Cobre | Gap |
|---|---|---|
| Link cliente com token | art.35 meio digital + registo | OK |
| Upload fotos/vídeo | prova digital, integridade hash | OK |
| Walkaround guiado + detect-view | inovação captura | avançar cobertura |
| CV ONNX ensemble | explainability assistiva | documentar modelo/vendor |
| Audit trail por claim | ASF auditorias + prova | OK |
| Relatório IA "assistive" | disclosure + human-in-the-loop | OK, rotular conteúdo AI |
| Signed URLs media | cadeia custódia parcial | + QTS |
| Claims DB AWS | retenção | política de purga + hold |
| PIN adjuster | controlo acesso | 2FA/rbac |
| — | e-Constat/DAAA digital | **falta** |
| — | Workflow deadlines (2d/8d/30d) | **falta motor** |
| — | Comunicações escritas decisão | **falta templates** |
| — | Consent management | **falta** |
| — | Fraud signals explicáveis | parcial (validate.ts) |
| — | Telemática/meteo cross-check | **falta** |
| — | STP threshold governance | **falta** |

## 33. Roadmap de conformidade e inovação

### Fase 1 — Fundação legal (0-1 mês) — obrigatório antes de piloto real
1. Aviso de privacidade + disclosure IA no FNOL (art.13 RGPD + art.50 AI Act);
2. Human-in-the-loop documentado em cobertura/valor (RGPD art.22);
3. Rotulagem de conteúdo gerado por IA;
4. Política de retenção/purga + hold de litígio;
5. Inventário de modelos + runbooks literacia IA;
6. Registo art.30 + DPIA do pipeline de imagem+fraude.

### Fase 2 — Prazos & prova (1-2 meses)
7. Motor de deadlines (auto: 2/8/12/4/30d úteis; MR habitação: 4/25/40d) + escalonamento + feriados PT;
8. Templates de comunicação escrita (assunção/não-assunção + meios de reação);
9. Digital Evidence Bag + QTS eIDAS no pacote de evidência;
10. Anonymizer de rostos/matrículas incidentais na media;
11. Métricas públicas de prazo médio (site ASF "informações relevantes").

### Fase 3 — Automação segura (2-4 meses)
12. Workflow guiado → tarefas do perito (marcação peritagem, relatórios);
13. Verificação de cobertura contra dados de apólice;
14. Sinais de fraude explicáveis (sem scoring opaco);
15. e-Constat/DAAA digital com assinatura dupla + croqui;
16. STP para claims elegíveis (thresholds + sem declinar automaticamente).

### Fase 4 — Escala & agentic (4-8 meses)
17. Orquestração de agentes com limites de autoridade;
18. Telemática/meteo enriquecimento;
19. Voice FNOL + omnicanal;
20. Testes de resiliência DORA + registo TPP.

## 34. Anexos

### 34.1 Legislação citada

- DL 72/2008 — Regime Jurídico do Contrato de Seguro (arts. 100-101)
- DL 291/2007 — Seguro obrigatório RC automóvel (arts. 34-36 + danos corporais)
- Lei 58/2019 — execução nacional RGPD (art. 21 conservação)
- Regulamento (UE) 2016/679 — RGPD (arts. 6, 9, 13-14, 22, 30, 35)
- Regulamento (UE) 2024/1689 — AI Act (arts. 4, 5, 6, 50; Anexo III)
- Regulamento (UE) 2022/2554 — DORA (arts. 4-12, 28-30)
- Diretiva 2009/138/CE — Solvency II (arts. 41, 46)
- Diretiva (UE) 2016/97 — IDD (arts. 17-25)
- Regulamento (UE) 910/2014 — eIDAS (arts. 46 e selos)
- Diretiva 2009/103/CE — MID (art. 22 prazo 3 meses)
- Diretiva (UE) 2019/882 — EAA (WCAG desde 28/06/2025)
- ASF Recomendação n.º 2/2025 (multirriscos habitação) + NRs 2025-2026
- EIOPA Opinion on AI governance (Fev 2025)
- ENFSI BPM-DI-003 — autenticação de imagem
- ETSI TS 103 643 — Digital Evidence Bag
- Council of Europe Guidelines Electronic Evidence (2019)

### 34.2 Fontes setoriais e benchmarks

- Everest Group — "The future of FNOL: an agentic front door to claims" (2026)
- Charlee.ai — "Future Trends in AI-Powered FNOL"
- Duck Creek PR — Agentic FNOL (Set 2026)
- TruVideo — FNOL to Settlement (cycle time)
- VSight — Video FNOL (virtual claims <15%→60%, LexisNexis)
- Repairer Driven News — Tractable photo estimating demos (2019-2020)
- Mitchell Industry Reports — supplements photo vs in-person (52-67% vs 30-34%)
- CCC Crash Course — supplements stats
- arXiv:2401.09245 — uncertainty estimation motor claims
- IEEE Access 2023 — vehicle damage severity in-the-wild
- HF: abdullahg7/cardd-yolov8s v2.0, vineetsarpal/yolov11n-car-damage
- plan-d — visual damage detection 93%
- Osborne Clarke — DORA FAQ 2025
- CMS — notification obligations review
- CNPD — videovigilância/dados + Lei 58/2019
- ASF — regime contratual + Recomendação 2/2025
- pgdlisboa.pt — DL 72/2008 + DL 291/2007 + Lei 58/2019

### 34.3 Glossário

- **FNOL** — First Notice of Loss (participação inicial)
- **DAAA** — Declaração Amigável de Acidente Automóvel
- **STP** — Straight-Through Processing (liquidação sem perito)
- **DEB** — Digital Evidence Bag (ETSI)
- **QTS** — Qualified Timestamp (eIDAS)
- **FRIA** — Fundamental Rights Impact Assessment (AI Act)
- **POG** — Product Oversight & Governance (IDD)
- **TPP** — Third-Party Provider (DORA)
- **mAP50** — mean Average Precision @IoU 0.5
- **AUROC** — Area Under ROC (incerteza/fraude)
- **SPS** — Sistema de Peritagem Simplificada (danos corporais PT)

---

*Fim do documento — Novembro 2026. Revisão sugerida: trimestral (ASF publica NRs; AI Act fases entram em vigor).*
