# Resourceful Idle — Relatório Técnico

Documento de referência do estado do jogo em 29/09/2026. Descreve o que existe no
código, não o que está planejado. Referência: branch `feature/roadmap-completo`,
6 commits à frente de `main`.

**Números-chave:** 15 recursos · 15 construções · 13 conquistas · 3 cadeias · 4 abas

---

## 1. Visão geral

Jogo idle/clicker de navegador sobre construção de cadeias de produção. O jogador
começa cortando lenha e, progressivamente, substitui a mão por geradores,
processadores e，e por fim usinas — cada tier mais profunda exige a anterior.

**Stack:** HTML5 + CSS3 + Vanilla ES6. Sem framework, sem bundler, sem build step.
Rodar com Live Server ou `python -m http.server`. Persistência em `localStorage`.

**Idiomas:** toda a interface em português (pt-BR).

---

## 2. Loop de jogo

O motor é a classe `IdleGame` (`js/game.js`). A simulação roda em `requestAnimationFrame`
com `dt` em segundos, o que torna tudo independente de FPS.

### Fluxo de um frame

```
rAF → dt = (agora - anterior)/1000
        ↓  clamp: se dt > 1s e runInBackground off → dt = 1
      game.update(dt)
        1. Clique contínuo (se segurando botão)
        2. Venda automática (a cada 10s acumulados)
        3. Prédios — iteração sobre BUILDINGS na ordem de declaração
        4. checkUnlocks() — unlock por marco
        5. Conquistas (1x por segundo)
        ↓
      ui.updateUI() — só a aba visível
        ↓
      autosave a cada 10s
```

**O clamp de `dt` em 1s** é o que faz "Rodar em Segundo Plano" funcionar: com a aba
inativa, o browser para de chamar `rAF`, e ao voltar o `dt` seria de minutos. O toggle
do jogador escolhe entre limitar a 1s (pausa) ou aceitar o salto.

### Passo de tempo dos prédios

Cada prédio acumula progresso fracionário e converte em unidades inteiras:

```js
velocidade = (quantidade × multiplicador) / tempoBase
b.progress += velocidade × dt
enquanto b.progress >= 1 e há insumo:  produz 1, consome o insumo
```

Isso dá três propriedades de graça:

- **Independência de FPS** — 30 ou 144 fps produzem a mesma taxa.
- **Propriedade de chunking** — chamar `update(120)` dez vezes equivale a chamar
  `update(1)` mil e duzentas vezes. É o que torna o progresso offline correto.
- **Aritmética de progresso fracionário** — um ciclo de 2s produz 1 item a cada 2s
  exatos, não 0.5 por frame.

### Ordem de processamento

A ordem de declaração das chaves em `BUILDINGS` **é** a ordem de processamento, e
isso é significativo:

```
woodcutter → stoneMiner → stoneKiln → builder → refinery → carpentry
                                  ↑                        ↑
                    Construtora roda ANTES             a Refinaria,
                    das processadoras de madeira       que consome madeira
```

A Construtora consome Tábua, e a Refinaria produz Tábua. Inverter a ordem deixaria a
Construtora consumir tábuas produzidas no mesmo tick — um ganho de vazão silencioso.
**Um teste trava essa ordem** (`tests/headless.test.js`, caso *"ordem de processamento
dos prédios está preservada"*).

---

## 3. Progresso offline

Ao carregar, o jogo compara `Date.now()` com `state.lastSaveTimestamp` e simula o
tempo decorrido.

- **Teto: 8 horas** (`OFFLINE_CAP_SECONDS`). Ausência maior rende o teto.
- **Máximo de 240 chunks.** O tamanho do chunk se ajusta para que 8h virem 240
  passos de ~120s cada; ausências curtas usam chunks menores.
- **O último chunk é o resto**, para os passos somarem o tempo exato. Sem isso, uma
  ausência de 241s pagaria 242s.

A simulação **reexecuta o `update()` existente** em vez de usar fórmula fechada.
Fórmula fechada ignoraria o esgotamento de insumo em cadeia — o Carpintaria não
converteria nada se a Refinaria ficasse sem Tábua.

**Conquistas não são conquistadas offline.** O catch-up restaura as estatísticas ao
final e desliga a checagem durante a simulação. Sem isso, voltar de 8h com 50
lenhadores desbloquearia várias conquistas de uma vez, cada uma valendo +2%
permanente. O jogador ganha os recursos, não as medalhas.

O carimbo de tempo é gravado dentro de `save()`, não no fim do catch-up: se só fosse
atualizado na rotina offline, fechar a aba logo após o catch-up salvaria o
timestamp velho e o próximo load pagaria o mesmo período de novo.

---

## 4. Recursos

15 recursos em 3 cadeias. Preço é o valor de venda unitário.

### Madeira

| Recurso | Ícone | Venda | Coleta manual |
|---|---|---|---|
| Madeira Bruta | 🪵 | R$ 1 | Sim |
| Tábua | 🪚 | R$ 5 | — |
| Móvel | 🪑 | R$ 25 | — |

```
Madeira Bruta ➔ Tábua ➔ Móvel
```

### Pedra

| Recurso | Ícone | Venda | Coleta manual |
|---|---|---|---|
| Pedra Bruta | 🪨 | R$ 10 | Sim |
| Bloco de Pedra | 🧱 | R$ 50 | — |
| Material de Construção | 🏗️ | R$ 500 | — |

```
Pedra Bruta ➔ Bloco de Pedra ➔ Material de Construção
```

### Metalurgia

| Recurso | Ícone | Venda | Coleta manual |
|---|---|---|---|
| Minério de Ferro | ⛏️ | R$ 40 | Sim |
| Minério de Cobre | 🟠 | R$ 35 | Sim |
| Minério de Estanho | ⚪ | R$ 30 | Sim |
| Carvão | ⬛ | R$ 25 | — |
| Lingote de Ferro | 🔩 | R$ 300 | — |
| Lingote de Cobre | 🟫 | R$ 260 | — |
| Lingote de Estanho | ⬜ | R$ 220 | — |
| Aço | 🥈 | R$ 2.500 | — |
| Bronze | 🥉 | R$ 1.800 | — |

```
Minério de Ferro ➔ Lingote de Ferro ┐
                                   ├─➔ Aço          (Ferro + Carvão)
Carvão ────────────────────────────┘

Minério de Cobre ➔ Lingote de Cobre ┐
                                   ├─➔ Bronze       (Cobre + Estanho)
Minério de Estanho ➔ Lingote ──────┘
```

Bronze é **liga de cobre + estanho**, não um passo depois do ferro — é a ordem
quimicamente correta, e faz as cadeias se cruzarem em vez de ficarem paralelas.

---

## 5. Construções

15 construções em 3 categorias. Todas escalam por `custoBase × 1.15^quantidade`.

**Geradores** (`inputs: []`) não consomem insumo. **Processadores** consomem um
insumo. **Edifícios complexos** consomem dois ou mais simultaneamente.

| Construção | Cadeia | Custo base | Ciclo | Autocoleta |
|---|---|---|---|---|
| Acampamento de Lenhadores | Madeira | R$ 150 | 2s | R$ 1.500 |
| Refinaria de Madeira | Madeira | R$ 10 | 5s | R$ 3.000 |
| Fábrica de Carpintaria | Madeira | R$ 50 | 10s | R$ 10.000 |
| Poço da Pedreira | Pedra | R$ 5.000 | 3s | R$ 30.000 |
| Forno de Pedra | Pedra | R$ 10.000 | 8s | R$ 75.000 |
| Construtora Civil | Pedra | R$ 50.000 | 15s | R$ 200.000 |
| Poço de Carvão | Metal | R$ 8.000 | 4s | R$ 60.000 |
| Mina de Ferro | Metal | R$ 12.000 | 4s | R$ 90.000 |
| Mina de Cobre | Metal | R$ 10.000 | 4s | R$ 80.000 |
| Mina de Estanho | Metal | R$ 9.000 | 5s | R$ 75.000 |
| Fundição de Ferro | Metal | R$ 25.000 | 6s | R$ 150.000 |
| Fundição de Cobre | Metal | R$ 20.000 | 6s | R$ 130.000 |
| Fundição de Estanho | Metal | R$ 18.000 | 6s | R$ 120.000 |
| Siderúrgica | Metal | R$ 200.000 | 20s | R$ 900.000 |
| Liga de Bronze | Metal | R$ 150.000 | 18s | R$ 700.000 |

### Autocoleta

Cada construção pode ser automatizada por um preço único, movendo a produção do
estoque local direto para o inventário. Ao comprar, o estoque estocado é drenado
para o inventário na mesma hora. Automatizar a Refinaria custa ~300 cycles de
produção — é a decisão "quando vale parar de clicar nesse prédio".

---

## 6. Ferramentas de jogabilidade

### 6.1 Vender

- **Venda individual** por recurso, esvazia o estoque e paga o preço unitário.
- **Vender Tudo** esvazia todos os recursos de uma vez.
- **Venda Inteligente** (upgrade, R$ 2.000): liga auto-venda por recurso
  individualmente, a cada 10 segundos. É a ferramenta que converte produção em
  renda passiva.

### 6.2 Clique contínuo

Segurar o botão de coleta gera recursos automaticamente, com velocidade escalável:

| Upgrade | Base do custo | Recurso | Abre com |
|---|---|---|---|
| Motosserra | R$ 500 | Madeira | 100 cliques manuais |
| Britadeira | R$ 500 | Pedra | 100 cliques + Pedreira |
| Perfuratriz | R$ 5.000 | Ferro, Cobre, Estanho | 100 cliques + Metalurgia |

Custo: `base × 2.5^nível`. Nível = cliques por segundo. Os três minérios compartilham
a perfuratriz — é o mesmo gesto físico, então não faz sentido exigir três melhorias
distintas.

### 6.3 Venda Inteligente

Independente por recurso. Um toggle AUTO por recurso na barra superior, com
indicador visual de progresso do ciclo de 10s.

### 6.4 Serras Afiadas

Upgrade de R$ 100 que deixa **todas as refinarias** 10% mais rápidas. É aplicável a
qualquer prédio com `speedUpgrades` — hoje só a Refinaria de Madeira.

### 6.5 Árvore de pesquisa

Aba dedicada mostrando o grafo de produção inteiro. Os nós bloqueados ficam
**esmaecidos e visíveis** (ao contrário dos cards de produção, que somem) — a
árvore existe para mostrar o caminho à frente. Clique num nó mostra a receita, o
custo, o preço de venda e a produção.

A topologia é **derivada** de `BUILDINGS`, não duplicada: o tier de uma construção é
1 + o tier mais profundo dos produtos que a alimentam.

### 6.6 Conquistas

13 conquistas, cada uma dando **+2% de velocidade em toda a produção** (máximo
teórico: +26%). Marcadores de progresso:

- **Coleta:** 1 / 100 / 5.000 madeiras
- **Produção:** 1 / 500 móveis, 1.000 blocos, 100 materiais de construção
- **Infraestrutura:** 10 lenhadores, 10 construtoras
- **Desbloqueios:** pedreira explorada
- **Faturamento:** R$ 100 mil / R$ 1 milhão acumulados
- **Upgrades:** primeira motosserra

A checagem roda 1x por segundo, não a cada frame. Conquistas persistem entre
sessões, com data de desbloqueio.

---

## 7. Unlocks

| Unlock | Requisito | Abre |
|---|---|---|
| Painel de Melhorias | 50 madeiras coletadas | Aba de upgrades |
| Clique Contínuo | 100 cliques manuais | Motosserra e Britadeira |
| Pedreira | R$ 3.000 + 100 móveis | Cadeia da pedra + Britadeira |
| Metalurgia | R$ 150.000 + 100 materiais de construção | Cadeia metalúrgica + Perfuratriz |

Os dois unlocks de cadeia são **comprações** (gastam recurso), não marcos
automáticos — são decisões do jogador, não consequências de jogar.

---

## 8. Economia

### Valor de produção

Renda por segundo de cada recurso com sua **primeira** construção:

| Recurso | Venda | Renda/s |
|---|---|---|
| Madeira Bruta | R$ 1 | R$ 0,50 |
| Tábua | R$ 5 | R$ 1,00 |
| Móvel | R$ 25 | R$ 2,50 |
| Pedra Bruta | R$ 10 | R$ 3,33 |
| Bloco de Pedra | R$ 50 | R$ 6,25 |
| Material de Construção | R$ 500 | R$ 33,33 |
| Minério de Ferro | R$ 40 | R$ 10,00 |
| Minério de Cobre | R$ 35 | R$ 8,75 |
| Minério de Estanho | R$ 30 | R$ 6,00 |
| Carvão | R$ 25 | R$ 6,25 |
| Lingote de Ferro | R$ 300 | R$ 50,00 |
| Lingote de Cobre | R$ 260 | R$ 43,33 |
| Lingote de Estanho | R$ 220 | R$ 36,67 |
| Aço | R$ 2.500 | R$ 125,00 |
| Bronze | R$ 1.800 | R$ 100,00 |

### A curva de custo

`custo(n) = base × 1.15^n` — crescimento exponencial suave, padrão do gênero. Compensa
cada compra com um ganho permanente de produção.

### Observações de balanceamento

Duas coisas merecem atenção do dono do jogo, ambas listadas no README como pendências:

**1. A Refinaria é desproporcional.** Com `baseCost` de R$ 10 e curva `1.15^n`, a
segunda unidade custa R$ 11,50 e a terceira R$ 13,22 — ao lado de prédios na casa das
centenas. A base de R$ 10 é do commit inicial do projeto, não foi introduzida em
refatoração. Sugestão: R$ 60-100.

**2. A Siderúrgica custa R$ 4 milhões para 1 aço/s.** Com `baseCost` de R$ 200.000 e
ciclo de 20s, a primeira unidade exige renda de R$ 10.000/s, alcançável apenas com a
cadeia completa de pedra e metal montada. É intencional como tier final, mas é o
maior salto de custo do jogo — vale sentir rodando.

---

## 9. Persistência

**Chave:** `idleGameSave` no `localStorage`, com o state inteiro em JSON.

**Gravação:**
- Autosave a cada 10s dentro do loop
- `visibilitychange` quando a aba vai para segundo plano
- `beforeunload` ao fechar

O timestamp de último save é carimbado dentro de `save()`.

### Migração de saves antigos

`load()` faz merge do save sobre `getDefaultState()`. Regra que vale saber: **apenas
os 4 campos mutáveis de cada construção vêm do save** (`count`, `progress`,
`storedOutput`, `autoCollect`). Custo, tempo, insumo e saída vêm de `BUILDINGS`.

Sem essa separação, um save antigo carregando `baseCost: 5000` sombrearia a tabela de
dados para sempre, e todo jogador que voltasse manteria o custo antigo em silêncio
mesmo depois de um rebalanceamento.

---

## 10. Arquitetura

```
index.html    Estrutura e containers vazios (211 linhas)
js/data.js    Fonte única de verdade: GROUPS, RESOURCES, BUILDINGS, ACHIEVEMENTS
js/game.js    Motor: simulação, economia, save, offline, conquistas
js/ui.js      Renderização e binding
js/main.js    Loop rAF, save-on-exit, catch-up offline
style.css     Glassmorphism escuro, acento por cadeia via --chain
tests/        54 asserts de lógica + 30 checks de UI
```

**Princípio central:** `data.js` é a única fonte de verdade. O motor, a UI e a árvore
de pesquisa leem de lá. Nenhum dado de recurso ou construção está duplicado em markup
ou em lógica — foi o que permitiu adicionar 9 recursos e 9 construções (Fase 3 do
roadmap) como tabelas, sem código de render novo.

**Renderização:** listener delegado em `document` (não por elemento), referências DOM
resolvidas uma vez no render, e atualização apenas da aba visível.

**Acento por cadeia:** custom property CSS `--chain`, setada a partir de `GROUPS`.
Uma cadeia nova custa zero CSS — uma linha de dados.

---

## 11. Testes

```bash
node tests/headless.test.js    # 54 asserts de lógica
node tests/ui.smoke.js         # 30 checks no Chromium headless
```

**Lógica** (`vm` + `assert`, sem dependências): integridade dos dados, ordem de
processamento, ciclo de produção, economia, catch-up offline, teto de 8h, migração de
save, conquistas.

**UI** (Chromium headless via Puppeteer): carrega o jogo, joga de verdade (clica,
compra, vende, troca aba, destrava a metalurgia) e falha em qualquer erro de console
ou elemento faltando. Cobre o que a suíte de lógica não alcança, por não ter DOM.

O smoke test pegou três bugs que nenhum teste de lógica pegaria: botões sem `data-id`
(comprar um prédio lançava `TypeError`), ids de upgrade divergentes entre HTML e JS
(derrubava todos os listeners silenciosamente), e um custo de upgrade com nome errado
(perfuratriz custando R$ 500 em vez de R$ 5.000).

---

## 12. Referência de arquivos

| Arquivo | Linhas | Responsabilidade |
|---|---|---|
| `js/data.js` | 247 | Conteúdo do jogo (dados puros) |
| `js/game.js` | 536 | Motor de simulação e economia |
| `js/ui.js` | 769 | Renderização e binding |
| `js/main.js` | 77 | Loop, save-on-exit, catch-up |
| `index.html` | 211 | Estrutura |
| `style.css` | 1.197 | Visual |
| `tests/headless.test.js` | 825 | Testes de lógica |
| `tests/ui.smoke.js` | 319 | Testes de UI |

---

## 13. Pendências conhecidas

1. **Rebalancear a Refinaria** — `baseCost` de R$ 10 a torna quase gratuita.
2. **Afinar a metalurgia** — os números são estimados, não jogados até o fim.
3. **Testes de UI além do smoke** — verificam que a tela monta e cliques não
   explodem, não o layout nem a cascata. Ampliar quando houver build step.
4. **Barra de recursos com 15 itens** — os nomes longos truncam em desktop. A
   tira rolável resolve, mas uma densidade melhor é possível com 15 recursos.
