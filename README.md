# 🌳 Resourceful Idle

**Resourceful Idle** é um jogo de navegador em estilo *Idle/Clicker* focado na criação e expansão de longas cadeias de produção. O jogo baseia-se na coleta manual inicial de recursos básicos que, gradativamente, dão lugar a prédios autônomos, processadores industriais e upgrades de automação como os *Autoclickers* e o sistema de *Venda Inteligente*.

O projeto foi construído do zero utilizando apenas **HTML**, **CSS** (com estética Glassmorphism) e **Vanilla JavaScript**.

---

## 🎮 Funcionalidades Atuais (MVP)

### 🧺 Cadeias de Produção
Neste MVP, existem duas árvores principais de recursos, que se destravam progressivamente:
- **Madeira:** Madeira Bruta ➔ Tábua ➔ Móvel
- **Pedra:** Pedra Bruta ➔ Bloco de Pedra

### 🏭 Construções e Automação
À medida que seu império cresce, você pode investir nos seguintes prédios industriais:
- **Geradores Passivos (Autônomos):** Acampamento de Lenhadores e Poço de Pedreira. Eles geram recursos brutos continuamente sem consumo de insumos.
- **Processadores Básicos:** Refinaria de Madeira, Fábrica de Carpintaria e Forno de Pedra. Requerem insumos para produzir os itens da próxima tier tecnológica.
- **Edifícios Complexos:** A grandiosa **Construtora Civil**. Consome múltiplos requisitos simultaneamente (Tábuas e Blocos de Pedra) para produzir os valiosos *Materiais de Construção*.

### ✨ Upgrades & Melhorias de Qualidade de Vida (QoL)
1. **Clique Contínuo:** Desbloqueado ao atingir 100 cliques manuais na sua sessão. Você ganha acesso ao upgrade escalonável que permite clicar e manter o botão pressionado para auto-coletar os recursos base.
2. **Venda Inteligente:** Uma vez comprada, este upgrade permite acionar a Venda Automática (Auto-Sell) separadamente para cada recurso do inventário — limpando magicamente as sobras a cada 10 segundos!
3. **Melhoria Industrial:** Serras Afiadas e muito mais por vir.

---

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
- Implementar Cálculo de Progresso Offline.
- Adicionar recursos Metalúrgicos (Ferro, Bronze, Aço).
- Adicionar a tela de Conquistas (Achievements) baseadas no inventário / estatísticas.
- Expansão da árvore visual de pesquisa tecnológica.
