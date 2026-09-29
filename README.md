# 🌳 Resourceful Idle

**Resourceful Idle** é um jogo de navegador em estilo *Idle/Clicker* focado na criação e expansão de longas cadeias de produção. O jogo baseia-se na coleta manual inicial de recursos básicos que, gradativamente, dão lugar a prédios autônomos, processadores industriais e upgrades de automação como os *Autoclickers* e o sistema de *Venda Inteligente*.

O projeto foi construído do zero utilizando apenas **HTML**, **CSS** (com estética Glassmorphism) e **Vanilla JavaScript**.

---

## 🎮 Funcionalidades

### 🕸️ Progresso Offline
Ao voltar ao jogo, a produção dos geradores e processadores é calculada para todo o tempo em que você esteve fora — até um teto de **8 horas**. Um modal resume o que foi produzido. Sem servidor e sem conta: o tempo é estimado pela data do seu próprio relógio.

### 🌲 Cadeias de Produção
Três cadeias que se destravam progressivamente, cada uma com bruto ➔ intermediário ➔ avançado:
- **Madeira:** Madeira Bruta ➔ Tábua ➔ Móvel
- **Pedra:** Pedra Bruta ➔ Bloco de Pedra ➔ Material de Construção
- **Metalurgia:** Minério de Ferro ➔ Lingote ➔ **Aço** (com Carvão), e Minério de Cobre + Minério de Estanho ➔ **Bronze**

### 🏭 Construções e Automação
- **Geradores Passivos:** Acampamento de Lenhadores, Poço da Pedreira, e as minas de Carvão, Ferro, Cobre e Estanho. Geram recurso bruto continuamente, sem consumo de insumos.
- **Processadores Básicos:** Refinaria de Madeira, Fábrica de Carpintaria, Forno de Pedra e as Fundições. Convertem um insumo no item da próxima tier.
- **Edifícios Complexos:** **Construtora Civil** (Tábua + Bloco de Pedra), **Siderúrgica** (Ferro + Carvão) e **Liga de Bronze** (Cobre + Estanho). Consomem múltiplos requisitos simultaneamente.
- **Autocoleta:** cada prédio pode ser automatizado individualmente, parando de exigir cliques.

### ✨ Upgrades & Melhorias
1. **Melhoria Industrial:** Serras Afiadas deixam as refinarias 10% mais rápidas.
2. **Venda Inteligente:** permite acionar a Venda Automática (Auto-Sell) separadamente para cada recurso do inventário — limpando as sobras a cada 10 segundos.
3. **Clique Contínuo:** Motosserra, Britadeira e Perfuratriz permitem segurar o botão para coletar. Desbloqueado com 100 cliques manuais, e escala por nível — um upgrade por tipo de mineração.

### 🏆 Conquistas
Marcos de progresso com **bônus permanente**: cada conquista vale **+2% de velocidade em toda a produção**. Persistem entre sessões e não são conquistadas por progresso offline — só pelo que você jogou.

### 🌳 Árvore de Pesquisa
Uma visão do grafo de produção completo: o que já foi destravado, o que está disponível agora, e o que ainda está à frente. Clique em qualquer nó para ver a receita completa, os custos e a produção.

---

## 🧪 Testes

Sem build step e sem framework. Duas suítes, ambas com asserts puros:

```bash
node tests/headless.test.js    # 54 asserts de lógica (dados, ciclo, economia, save)
node tests/ui.smoke.js         # 28 checks no Chromium — precisa do servidor na 8899
```

A de UI sobe um Chromium headless, joga de verdade (clica, compra, vende, troca aba,
destrava a metalurgia) e falha em qualquer erro de console ou elemento faltando.
Complementa a de lógica, que não tem DOM.

## 🖥️ Tecnologias Utilizadas
- **HTML5:** Utilizado de forma semântica estruturando as seções do jogo.
- **CSS3:** O estilo de interface usa o padrão escuro (*Dark Mode*), complementado pelo design em **Glassmorphism** (Fundo translúcido).
- **JavaScript (ES6):** Orientado a objetos. O motor principal usa a classe `IdleGame` e o calculo temporal com `requestAnimationFrame` (`dt`), o que garante a independência de FPS.

---

## 🚀 Como Jogar

Como o projeto utiliza tecnologias Nativas Web sem *Build Steps*, rodar o jogo é extremamente simples:

1. Clone o repositório em sua máquina:
   ```bash
   git clone https://github.com/joaovictorctorres/resourceful-idle.git
   ```
2. Abra a pasta do projeto.
3. Inicie um pequeno servidor local utilizando a extensão **Live Server** (do VS Code) ou o Python `http.server`, e abra o arquivo `index.html`.
4. Comece cortando lenha!

*Dica:* O estado do jogo é salvo automaticamente no `localStorage` do seu navegador. Você não perde o progresso se der refresh na página.

## 🎮 Como jogar Online

**[Jogar agora](https://resourceful-idle.vercel.app)**

---

## 🛣️ Roadmap / Próximos Passos
- Rebalancear a Refinaria: `baseCost` de R$ 10 com curva `1.15^n` a torna quase gratuita depois de poucas unidades, ao lado de prédios na casa das centenas.
- Afinar os números da metalurgia depois de sentir o jogo rodando.
- Testes de UI além do smoke: hoje ele verifica que a tela monta e que cliques não explodem, não o layout. Ampliar quando houver build step.
