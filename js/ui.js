class GameUI {
    constructor(game) {
        this.game = game;
        this.tab = 'producao';

        // Referências fixas (não geradas)
        this.elMoney = document.getElementById('money-value');
        this.btnSettings = document.getElementById('btn-settings');
        this.modalSettings = document.getElementById('settings-modal');
        this.btnCloseSettings = document.getElementById('btn-close-settings');
        this.toggleBackground = document.getElementById('toggle-background');

        this.btnAchievements = document.getElementById('btn-achievements');
        this.modalAchievements = document.getElementById('achievements-modal');
        this.btnCloseAchievements = document.getElementById('btn-close-achievements');
        this.achievementGrid = document.getElementById('achievement-grid');
        this.achievementCount = document.getElementById('achievement-count');
        this.achievementBonusInfo = document.getElementById('achievement-bonus-info');

        this.modalOffline = document.getElementById('offline-modal');
        this.btnCloseOffline = document.getElementById('btn-close-offline');
        this.offlineGains = document.getElementById('offline-gains');
        this.offlineTime = document.getElementById('offline-time');

        // Containers gerados
        this.resourceBar = document.getElementById('resource-bar');
        this.actionBar = document.getElementById('action-bar');
        this.chainList = document.getElementById('chain-list');
        this.statsContainer = document.getElementById('stats-container');

        // Preços são estáticos: escritos uma vez no render, não por frame.
        for (const id in this.res) this.res[id].price.innerText = this.formatMoney(RESOURCES[id].price);

        // Upgrades (markup fixo, fora do escopo da extração)
        this.tabMelhorias = document.querySelector('[data-tab="melhorias"]');
        this.panelMelhorias = document.querySelector('[data-panel="melhorias"]');
        this.upgStoneUnlock = document.getElementById('upg-stoneUnlock');
        this.btnUpgStoneUnlock = document.getElementById('btn-upg-stoneUnlock');
        this.btnUpgSaws = document.getElementById('btn-upg-saws');
        this.btnUpgSmartSell = document.getElementById('btn-upg-smartSell');
        this.btnUpgChainsaw = document.getElementById('btn-upg-chainsaw');
        this.lvlChainsaw = document.getElementById('lvl-chainsaw');
        this.costChainsaw = document.getElementById('cost-chainsaw');
        this.speedChainsaw = document.getElementById('speed-chainsaw');
        this.btnUpgJackhammer = document.getElementById('btn-upg-jackhammer');
        this.lvlJackhammer = document.getElementById('lvl-jackhammer');
        this.costJackhammer = document.getElementById('cost-jackhammer');
        this.speedJackhammer = document.getElementById('speed-jackhammer');

        // Mapas de referência, preenchidos no render. Resolvidos UMA vez — antes
        // eram 18 getElementById por frame dentro do updateUI.
        this.res = {};        // resourceId -> { count, sell, auto, ind, box }
        this.acts = {};       // actionId  -> botão
        this.cards = {};      // buildingId-> { card, count, cost, speed, status, bar, storage, storageRow, collect, buy, auto }
        this.upgCards = {};   // buildingId-> card, para esconder por unlock

        this.render();
        this.bindEvents();
    }

    // ------------------------------------------------------------- renderização

    render() {
        this.renderResources();
        this.renderActions();
        this.renderChains();
    }

    renderResources() {
        this.resourceBar.innerHTML = Object.keys(RESOURCES).map(id => {
            const r = RESOURCES[id];
            return `
                <div class="res-chip" data-res="${id}" style="--chain: ${GROUPS[r.group].color}">
                    <span class="res-chip-icon">${r.icon}</span>
                    <div class="res-chip-body">
                        <span class="res-chip-name">${r.short}</span>
                        <span class="res-chip-count" data-count>0</span>
                        <span class="res-chip-rate" data-rate></span>
                    </div>
                    <div class="res-chip-actions">
                        <div class="auto-sell-box hidden" data-box>
                            <button class="btn-toggle-sell" data-action="autosell" data-id="${id}"
                                title="Venda automática de ${r.name}">AUTO</button>
                        </div>
                        <button class="btn btn-sell" data-action="sell" data-id="${id}"
                            title="Vender ${r.name}">R$ <span data-price></span></button>
                    </div>
                </div>
            `;
        }).join('') + `
            <button class="btn btn-secondary res-sell-all" data-action="sellall">💰 Vender Tudo</button>
        `;

        for (const el of this.resourceBar.querySelectorAll('[data-res]')) {
            const id = el.dataset.res;
            this.res[id] = {
                root: el,
                count: el.querySelector('[data-count]'),
                rate: el.querySelector('[data-rate]'),
                price: el.querySelector('[data-price]'),
                sell: el.querySelector('[data-action="sell"]'),
                auto: el.querySelector('[data-action="autosell"]'),
                box: el.querySelector('[data-box]')
            };
        }
    }

    renderActions() {
        // Botões de coleta manual, derivados dos recursos com ação manual.
        this.actionBar.innerHTML = Object.keys(RESOURCES)
            .filter(id => id === 'wood' || id === 'stone')
            .map(id => {
                const r = RESOURCES[id];
                const label = id === 'wood' ? 'Coletar Madeira' : 'Coletar Pedra';
                return `
                    <button class="btn btn-primary btn-large click-effect" data-manual="${id}"
                        style="user-select:none; -webkit-user-select:none;">
                        <span class="icon">${r.icon}</span>
                        <span>${label}</span>
                    </button>
                `;
            }).join('');

        for (const el of this.actionBar.querySelectorAll('[data-manual]')) {
            this.acts[el.dataset.manual] = el;
        }
    }

    renderChains() {
        const groups = {};
        for (const g in GROUPS) {
            const ids = Object.keys(BUILDINGS).filter(id => BUILDINGS[id].group === g);
            // Cadeia sem prédio (a metalurgia ainda não existe) mostraria um
            // cabeçalho vazio. Some até ter conteúdo.
            if (ids.length === 0) continue;
            groups[g] = ids;
        }

        this.chainList.innerHTML = Object.keys(groups).map(g => {
            const def = GROUPS[g];
            const cards = groups[g].map(id => this.buildingCardHTML(id)).join('');
            return `
                <div class="chain" data-chain="${g}" style="--chain: ${def.color}">
                    <h3 class="chain-title">${def.name}</h3>
                    <div class="chain-cards">${cards}</div>
                </div>
            `;
        }).join('');

        for (const el of this.chainList.querySelectorAll('.building-card')) {
            const id = el.dataset.building;
            this.cards[id] = {
                card: el,
                count: el.querySelector('[data-b="count"]'),
                cost: el.querySelector('[data-b="cost"]'),
                speed: el.querySelector('[data-b="speed"]'),
                status: el.querySelector('[data-b="status"]'),
                bar: el.querySelector('[data-b="bar"]'),
                storage: el.querySelector('[data-b="storage"]'),
                storageRow: el.querySelector('.storage-container'),
                collect: el.querySelector('[data-action="collect"]'),
                auto: el.querySelector('[data-action="auto"]'),
                buy: el.querySelector('[data-action="buy"]')
            };
        }
    }

    buildingCardHTML(id) {
        const b = BUILDINGS[id];
        const recipe = b.inputs.length === 0
            ? `Gera 1 ${RESOURCES[b.output].name}`
            : b.inputs.map(i => `${i.qty} ${RESOURCES[i.id].name}`).join(' + ') +
              ` = 1 ${RESOURCES[b.output].name}`;

        return `
            <div class="building-card" data-building="${id}" data-bgroup="${b.group}">
                <div class="building-header">
                    <div>
                        <h3>${b.icon} ${b.name}</h3>
                        <p class="building-desc">${b.desc || recipe}</p>
                    </div>
                    <span class="badge" data-b="count">0</span>
                </div>
                <div class="progress-container">
                    <div class="progress-info">
                        <span data-b="speed">-- / ciclo</span>
                        <span data-b="status" class="status-working">Parado</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" data-b="bar"></div>
                    </div>
                </div>
                <div class="storage-container">
                    <div class="storage-info">Estoque: <span data-b="storage">0</span></div>
                    <div class="storage-actions">
                        <button class="btn btn-small" data-action="collect" data-id="${id}">Coletar</button>
                        <button class="btn btn-small btn-auto" data-action="auto" data-id="${id}">⭐️ Autocoleta</button>
                    </div>
                </div>
                <div class="building-footer">
                    <button class="btn btn-buy" data-action="buy" data-id="${id}">Comprar (R$ <span data-b="cost">0</span>)</button>
                </div>
            </div>
        `;
    }

    // ------------------------------------------------------------------- eventos

    bindEvents() {
        this.btnSettings.addEventListener('click', () => this.modalSettings.classList.remove('hidden'));
        this.btnCloseSettings.addEventListener('click', () => this.modalSettings.classList.add('hidden'));
        this.toggleBackground.addEventListener('change', () => this.game.toggleSetting());

        this.btnCloseOffline.addEventListener('click', () => this.modalOffline.classList.add('hidden'));
        this.btnCloseAchievements.addEventListener('click', () => this.modalAchievements.classList.add('hidden'));
        this.btnAchievements.addEventListener('click', () => {
            this.renderAchievements();
            this.modalAchievements.classList.remove('hidden');
        });

        this.btnUpgStoneUnlock.addEventListener('click', () => { this.game.buyStoneUnlock(); this.updateUI(); });
        this.btnUpgSaws.addEventListener('click', () => { this.game.buyUpgrade('sharpSaws'); this.updateUI(); });
        this.btnUpgSmartSell.addEventListener('click', () => { this.game.buyUpgrade('smartSell'); this.updateUI(); });
        this.btnUpgChainsaw.addEventListener('click', () => { this.game.buyUpgrade('chainsaw'); this.updateUI(); });
        this.btnUpgJackhammer.addEventListener('click', () => { this.game.buyUpgrade('jackhammer'); this.updateUI(); });

        // Um listener delegado cobre abas, venda, autocoleta e compra. Fica em
        // document (não no container) porque um container re-renderizado por
        // innerHTML levaria o listener junto, silenciosamente.
        document.addEventListener('click', (e) => {
            const tab = e.target.closest('[data-tab]');
            if (tab) {
                this.selectTab(tab.dataset.tab);
                return;
            }

            const act = e.target.closest('[data-action]');
            if (!act) return;
            const { action, id } = act.dataset;

            switch (action) {
                case 'sell':    this.game.sell(id); break;
                case 'sellall': this.game.sellAll(); break;
                case 'autosell':this.game.toggleAutoSell(id); break;
                case 'buy':     this.game.buyBuilding(id); break;
                case 'collect': this.game.collectOutput(id); break;
                case 'auto':    this.game.buyAutoCollect(id); break;
            }
            this.updateUI();
        });

        // Coleta manual precisa de mousedown/touchstart, não de click — e precisa
        // da referência do elemento para o feedback visual do scale.
        for (const id in this.acts) {
            const btn = this.acts[id];
            const down = (ev) => {
                if (ev.type === 'mousedown' && ev.button !== 0) return;
                ev.preventDefault();
                this.game.setHoldingAction(id);
                btn.style.transform = 'scale(0.95)';
            };
            const up = () => {
                if (this.game.holdingAction === id) {
                    if (id === 'wood') this.game.chopWood();
                    if (id === 'stone') this.game.mineStone();
                }
                this.game.setHoldingAction(null);
                btn.style.transform = '';
                this.updateUI();
            };

            btn.addEventListener('mousedown', down);
            btn.addEventListener('mouseup', up);
            btn.addEventListener('mouseleave', () => {
                if (this.game.holdingAction === id) {
                    this.game.setHoldingAction(null);
                    btn.style.transform = '';
                }
            });
            btn.addEventListener('touchstart', down, { passive: false });
            btn.addEventListener('touchend', up);
            btn.addEventListener('contextmenu', (ev) => ev.preventDefault());
        }
    }

    selectTab(name) {
        this.tab = name;
        for (const b of document.querySelectorAll('[data-tab]')) {
            b.setAttribute('aria-selected', String(b.dataset.tab === name));
        }
        for (const p of document.querySelectorAll('[data-panel]')) {
            p.classList.toggle('hidden', p.dataset.panel !== name);
        }
        this.updateUI();
    }

    // ---------------------------------------------------------------- atualização

    updateUI(force) {
        const s = this.game.state;

        // Conquistas recém-desbloqueadas são postadas aqui (1x por frame) em vez
        // de no motor, que não tem acesso à UI.
        if (this.game.onAchievementUnlocked) {
            const unlocked = this.game.onAchievementUnlocked;
            this.game.onAchievementUnlocked = null;
            for (const a of unlocked) {
                this.showToast(`🏆 ${a.name}! (+${(ACHIEVEMENT_BONUS * 100).toFixed(0)}% produção)`);
            }
        }

        if (this.toggleBackground.checked !== s.settings.runInBackground) {
            this.toggleBackground.checked = s.settings.runInBackground;
        }
        this.elMoney.innerText = this.formatMoney(s.money);

        this.updateResourceBar();

        // Visibilidade da aba de Melhorias não depende de ela estar ativa —
        // precisa ser avaliada sempre, senão nunca esconderia.
        this.tabMelhorias.classList.toggle('hidden', !s.unlocks.upgradesPanel);
        if (this.tab === 'melhorias' && !s.unlocks.upgradesPanel) {
            this.selectTab('producao');
        }

        // Aba oculta não é atualizada: o DOM de um painel escondido está velho por
        // definição, então escrever nele é desperdício. selectTab() chama
        // updateUI() e o painel exibido nasce certo.
        if (this.tab === 'producao') this.updateProduction();
        if (this.tab === 'melhorias') this.updateUpgrades();
        if (this.tab === 'stats') this.renderStats(force);
    }

    updateResourceBar() {
        const s = this.game.state;
        for (const id in this.res) {
            const ui = this.res[id];
            ui.count.innerText = this.formatCount(s.inventory[id]);
            ui.sell.disabled = s.inventory[id] === 0;

            const rate = this.game.getResourceRate(id);
            ui.rate.innerText = rate > 0 ? `+${this.formatRate(rate)}/s` : '';
            ui.root.classList.toggle('no-rate', rate === 0);

            if (s.unlocks.smartSell) {
                ui.box.classList.remove('hidden');
                const on = s.autoSell[id];
                ui.auto.classList.toggle('active', on);
                ui.auto.innerText = on ? 'ON' : 'OFF';
            } else {
                ui.box.classList.add('hidden');
            }
        }
    }

    updateProduction() {
        const s = this.game.state;
        for (const id in this.cards) {
            const ui = this.cards[id];
            ui.card.classList.toggle('hidden', !this.game.isBuildingUnlocked(id));
            if (ui.card.classList.contains('hidden')) continue;
            this.updateBuildingCard(id, ui);
        }
    }

    updateBuildingCard(id, ui) {
        const s = this.game.state;
        const def = BUILDINGS[id];
        const b = s.buildings[id];
        const cost = this.game.getBuildingCost(id);
        const speed = this.game.getBuildingSpeed(id);

        ui.count.innerText = b.count;
        ui.cost.innerText = this.formatMoney(cost);
        ui.buy.disabled = s.money < cost;

        if (b.count === 0) {
            ui.speed.innerText = `${def.baseTime}s / ciclo`;
            ui.bar.style.width = '0%';
            ui.status.innerText = 'Parado (Compre para iniciar)';
            ui.status.className = 'status-idle';
            return;
        }

        ui.speed.innerText = speed >= 1
            ? `${speed.toFixed(1)} / segundo`
            : `${(1 / speed).toFixed(1)}s / ciclo`;

        // Um gerador não consome insumo, então "produzindo" é o estado padrão.
        const isGenerator = def.inputs.length === 0;
        const hasInputs = def.inputs.every(i => s.inventory[i.id] >= i.qty);

        if (isGenerator || hasInputs) {
            ui.status.innerText = 'Produzindo...';
            ui.status.className = 'status-working';
        } else {
            ui.status.innerText = 'Parado (Sem recursos)';
            ui.status.className = 'status-blocked';
        }

        // Barra a 100% quando produz 1+/s, para não piscar enlouquecidamente.
        ui.bar.style.width = speed >= 1 ? '100%' : `${Math.min(b.progress * 100, 100)}%`;

        ui.storageRow.classList.toggle('hidden', b.autoCollect);
        if (!b.autoCollect) {
            ui.storage.innerText = this.formatCount(b.storedOutput);
            ui.collect.disabled = b.storedOutput < 1;
            ui.auto.innerText = `⭐️ Autocoleta (R$ ${this.formatMoney(def.autoCollectCost)})`;
            ui.auto.disabled = s.money < def.autoCollectCost;
        }
    }

    updateUpgrades() {
        const s = this.game.state;

        // Explorar Pedreira: some depois de destravada.
        this.upgStoneUnlock.classList.toggle('hidden', s.unlocks.stonePanel);
        this.btnUpgStoneUnlock.disabled = s.money < 3000 || s.inventory.furniture < 100;

        if (s.upgrades.sharpSaws) {
            this.btnUpgSaws.innerText = 'Comprado';
            this.btnUpgSaws.disabled = true;
        } else {
            this.btnUpgSaws.disabled = s.money < 100;
        }

        if (s.unlocks.smartSell) {
            this.btnUpgSmartSell.innerText = 'Comprado';
            this.btnUpgSmartSell.disabled = true;
        } else {
            this.btnUpgSmartSell.disabled = s.money < 2000;
        }

        this.btnUpgChainsaw.parentElement.parentElement.classList.toggle('hidden', !s.unlocks.continuousClick);
        if (s.unlocks.continuousClick) {
            this.lvlChainsaw.innerText = s.upgrades.chainsawLevel;
            if (this.speedChainsaw) {
                this.speedChainsaw.innerText = s.upgrades.chainsawLevel > 0
                    ? `(${s.upgrades.chainsawLevel}/seg)` : '';
            }
            const chainCost = this.game.getContinuousClickCost('chainsaw');
            this.costChainsaw.innerText = this.formatMoney(chainCost);
            this.btnUpgChainsaw.disabled = s.money < chainCost;
        }

        const showJack = s.unlocks.continuousClick && s.unlocks.stonePanel;
        this.btnUpgJackhammer.parentElement.parentElement.classList.toggle('hidden', !showJack);
        if (showJack) {
            this.lvlJackhammer.innerText = s.upgrades.jackhammerLevel;
            if (this.speedJackhammer) {
                this.speedJackhammer.innerText = s.upgrades.jackhammerLevel > 0
                    ? `(${s.upgrades.jackhammerLevel}/seg)` : '';
            }
            const jackCost = this.game.getContinuousClickCost('jackhammer');
            this.costJackhammer.innerText = this.formatMoney(jackCost);
            this.btnUpgJackhammer.disabled = s.money < jackCost;
        }
    }

    // ------------------------------------------------------------------ formatação

    formatMoney(value) {
        return value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }

    formatCount(value) {
        return Math.floor(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // Taxas variam em 4 casas; 2 já é estável o suficiente para não piscar.
    formatRate(value) {
        return value >= 10 ? value.toFixed(0) : value.toFixed(1);
    }

    formatDuration(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}min`;
        if (m > 0) return `${m}min`;
        return `${Math.floor(seconds)}s`;
    }

    showToast(message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerText = message;
        container.appendChild(toast);

        setTimeout(() => {
            if (container.contains(toast)) container.removeChild(toast);
        }, 3000);
    }

    showWelcomeBack(report) {
        const entries = Object.keys(report.gained);
        if (entries.length === 0 && report.moneyGained <= 0) return;

        this.offlineTime.innerText = report.wasCapped
            ? `Você ficou ${this.formatDuration(report.elapsed)} fora. O jogo simula no máximo 8h de produção.`
            : `Você ficou ${this.formatDuration(report.elapsed)} fora.`;

        let html = '';
        for (const id of entries) {
            const r = RESOURCES[id] || { short: id, icon: '📦' };
            html += `
                <div class="offline-gain-row">
                    <span class="offline-gain-icon">${r.icon}</span>
                    <span class="offline-gain-name">${r.short}</span>
                    <span class="offline-gain-value">+${this.formatCount(report.gained[id])}</span>
                </div>`;
        }
        if (report.moneyGained > 0) {
            html += `
                <div class="offline-gain-row">
                    <span class="offline-gain-icon">💰</span>
                    <span class="offline-gain-name">Venda automática</span>
                    <span class="offline-gain-value">R$ ${this.formatMoney(report.moneyGained)}</span>
                </div>`;
        }

        this.offlineGains.innerHTML = html;
        this.modalOffline.classList.remove('hidden');
    }

    // ---------------------------------------------------------------- conquistas

    renderAchievements() {
        if (!this.achievementGrid) return;

        const unlocked = this.game.state.achievements || {};
        const total = ACHIEVEMENTS.length;
        const got = Object.keys(unlocked).length;

        this.achievementCount.innerText = `${got} / ${total}`;
        this.achievementBonusInfo.innerText =
            `Cada conquista dá +${(ACHIEVEMENT_BONUS * 100).toFixed(0)}% de velocidade em toda a produção. ` +
            `Bônus atual: +${(this.game.getAchievementBonus() * 100).toFixed(0)}%.`;

        this.achievementGrid.innerHTML = ACHIEVEMENTS.map(a => {
            const at = unlocked[a.id];
            return `
                <div class="achievement-card ${at ? 'unlocked' : 'locked'}">
                    <div class="achievement-icon">${a.icon}</div>
                    <div class="achievement-info">
                        <h4>${a.name}</h4>
                        <p>${a.desc}</p>
                        <span class="achievement-date">${at ? new Date(at).toLocaleDateString('pt-BR') : 'Bloqueada'}</span>
                    </div>
                </div>`;
        }).join('');
    }

    renderStats(force) {
        if (!this.statsContainer) return;
        const s = this.game.state;

        // Reconstruir os cards a cada frame é desperdício; só refaz quando os
        // números mudaram de verdade.
        const sig = this.game.getStatsSignature();
        if (!force && sig === this.lastStatsSignature) return;
        this.lastStatsSignature = sig;

        this.statsContainer.innerHTML = Object.keys(RESOURCES).map(id => {
            const r = RESOURCES[id];
            const collected = Math.floor(s.stats.totalCollected[id] || 0);
            const earned = s.stats.totalEarned[id] || 0;
            if (collected === 0) return '';

            return `
                <div class="stat-card" style="--chain: ${GROUPS[r.group].color}">
                    <div class="stat-card-icon">${r.icon}</div>
                    <h4>${r.short}</h4>
                    <div class="stat-card-row">Coletados: <strong>${this.formatCount(collected)}</strong></div>
                    <div class="stat-card-row">Lucro: <strong class="green">R$ ${this.formatMoney(earned)}</strong></div>
                </div>`;
        }).join('');
    }
}
