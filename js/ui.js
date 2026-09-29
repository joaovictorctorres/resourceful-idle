class GameUI {
    constructor(game) {
        this.game = game;

        // Referências DOM
        this.elMoney = document.getElementById('money-value');
        this.btnSettings = document.getElementById('btn-settings');
        this.modalSettings = document.getElementById('settings-modal');
        this.btnCloseSettings = document.getElementById('btn-close-settings');
        this.toggleBackground = document.getElementById('toggle-background');

        this.elInvWood = document.getElementById('inv-wood');
        this.elInvBoard = document.getElementById('inv-board');
        this.elInvFurniture = document.getElementById('inv-furniture');
        this.elInvStone = document.getElementById('inv-stone');
        this.elInvStoneBlock = document.getElementById('inv-stoneBlock');

        this.groupStone = document.getElementById('group-stone');

        this.btnChopWood = document.getElementById('btn-chop-wood');
        this.btnMineStone = document.getElementById('btn-mine-stone');

        this.btnSellAll = document.getElementById('btn-sell-all');
        this.btnSellWood = document.getElementById('btn-sell-wood');
        this.btnSellBoard = document.getElementById('btn-sell-board');
        this.btnSellFurniture = document.getElementById('btn-sell-furniture');
        this.btnSellStone = document.getElementById('btn-sell-stone');
        this.btnSellStoneBlock = document.getElementById('btn-sell-stoneBlock');
        this.btnSellConstructionMat = document.getElementById('btn-sell-constructionMat');

        this.elInvConstructionMat = document.getElementById('inv-constructionMat');

        // Construções
        this.buildings = {
            woodcutter: {
                btnBuy: document.getElementById('btn-buy-woodcutter'),
                elCost: document.getElementById('cost-woodcutter'),
                elCount: document.getElementById('count-woodcutter'),
                elSpeed: document.getElementById('speed-woodcutter'),
                elStatus: document.getElementById('status-woodcutter'),
                barFill: document.getElementById('progress-woodcutter'),
                elStorage: document.getElementById('storage-woodcutter'),
                btnCollect: document.getElementById('btn-collect-woodcutter'),
                btnAuto: document.getElementById('btn-auto-woodcutter')
            },
            refinery: {
                btnBuy: document.getElementById('btn-buy-refinery'),
                elCost: document.getElementById('cost-refinery'),
                elCount: document.getElementById('count-refinery'),
                elSpeed: document.getElementById('speed-refinery'),
                elStatus: document.getElementById('status-refinery'),
                barFill: document.getElementById('progress-refinery'),
                elStorage: document.getElementById('storage-refinery'),
                btnCollect: document.getElementById('btn-collect-refinery'),
                btnAuto: document.getElementById('btn-auto-refinery')
            },
            carpentry: {
                btnBuy: document.getElementById('btn-buy-carpentry'),
                elCost: document.getElementById('cost-carpentry'),
                elCount: document.getElementById('count-carpentry'),
                elSpeed: document.getElementById('speed-carpentry'),
                elStatus: document.getElementById('status-carpentry'),
                barFill: document.getElementById('progress-carpentry'),
                elStorage: document.getElementById('storage-carpentry'),
                btnCollect: document.getElementById('btn-collect-carpentry'),
                btnAuto: document.getElementById('btn-auto-carpentry')
            },
            stoneMiner: {
                btnBuy: document.getElementById('btn-buy-stoneMiner'),
                elCost: document.getElementById('cost-stoneMiner'),
                elCount: document.getElementById('count-stoneMiner'),
                elSpeed: document.getElementById('speed-stoneMiner'),
                elStatus: document.getElementById('status-stoneMiner'),
                barFill: document.getElementById('progress-stoneMiner'),
                elStorage: document.getElementById('storage-stoneMiner'),
                btnCollect: document.getElementById('btn-collect-stoneMiner'),
                btnAuto: document.getElementById('btn-auto-stoneMiner')
            },
            stoneKiln: {
                btnBuy: document.getElementById('btn-buy-stoneKiln'),
                elCost: document.getElementById('cost-stoneKiln'),
                elCount: document.getElementById('count-stoneKiln'),
                elSpeed: document.getElementById('speed-stoneKiln'),
                elStatus: document.getElementById('status-stoneKiln'),
                barFill: document.getElementById('progress-stoneKiln'),
                elStorage: document.getElementById('storage-stoneKiln'),
                btnCollect: document.getElementById('btn-collect-stoneKiln'),
                btnAuto: document.getElementById('btn-auto-stoneKiln')
            },
            builder: {
                btnBuy: document.getElementById('btn-buy-builder'),
                elCost: document.getElementById('cost-builder'),
                elCount: document.getElementById('count-builder'),
                elSpeed: document.getElementById('speed-builder'),
                elStatus: document.getElementById('status-builder'),
                barFill: document.getElementById('progress-builder'),
                elStorage: document.getElementById('storage-builder'),
                btnCollect: document.getElementById('btn-collect-builder'),
                btnAuto: document.getElementById('btn-auto-builder')
            }
        };

        this.cardStoneMiner = document.getElementById('card-stoneMiner');
        this.cardStoneKiln = document.getElementById('card-stoneKiln');
        this.cardBuilder = document.getElementById('card-builder');

        // Upgrades
        this.panelUpgrades = document.getElementById('panel-upgrades');
        this.cardSaws = document.getElementById('upg-sharp-saws');
        this.btnUpgSaws = document.getElementById('btn-upg-saws');

        this.upgChainsaw = document.getElementById('upg-chainsaw');
        this.btnUpgChainsaw = document.getElementById('btn-upg-chainsaw');
        this.lvlChainsaw = document.getElementById('lvl-chainsaw');
        this.costChainsaw = document.getElementById('cost-chainsaw');
        this.speedChainsaw = document.getElementById('speed-chainsaw');

        this.upgJackhammer = document.getElementById('upg-jackhammer');
        this.btnUpgJackhammer = document.getElementById('btn-upg-jackhammer');
        this.lvlJackhammer = document.getElementById('lvl-jackhammer');
        this.costJackhammer = document.getElementById('cost-jackhammer');
        this.speedJackhammer = document.getElementById('speed-jackhammer');

        this.upgStoneUnlock = document.getElementById('upg-stoneUnlock');
        this.btnUpgStoneUnlock = document.getElementById('btn-upg-stoneUnlock');
        
        this.upgSmartSell = document.getElementById('upg-smartSell');
        this.btnUpgSmartSell = document.getElementById('btn-upg-smartSell');

        this.autoSellItems = ['wood', 'board', 'furniture', 'stone', 'stoneBlock', 'constructionMat'];

        this.statsContainer = document.getElementById('stats-container');

        this.modalOffline = document.getElementById('offline-modal');
        this.btnCloseOffline = document.getElementById('btn-close-offline');
        this.offlineGains = document.getElementById('offline-gains');
        this.offlineTime = document.getElementById('offline-time');

        this.btnAchievements = document.getElementById('btn-achievements');
        this.modalAchievements = document.getElementById('achievements-modal');
        this.btnCloseAchievements = document.getElementById('btn-close-achievements');
        this.achievementGrid = document.getElementById('achievement-grid');
        this.achievementCount = document.getElementById('achievement-count');
        this.achievementBonusInfo = document.getElementById('achievement-bonus-info');

        this.bindEvents();
    }

    bindEvents() {
        const handleDown = (e, actionType, btn) => {
            if (e.type === 'mousedown' && e.button !== 0) return;
            e.preventDefault();
            this.game.setHoldingAction(actionType);
            btn.style.transform = 'scale(0.95)';
        };

        const handleUp = (e, actionType, btn) => {
            if (e.type === 'mouseup' && e.button !== 0) return;
            e.preventDefault();
            
            if (this.game.holdingAction === actionType) {
                if (actionType === 'wood') this.game.chopWood();
                if (actionType === 'stone') this.game.mineStone();
                
                if (this.game.state.stats.manualClicks % 25 === 0) {
                    this.showToast('+1 ' + actionType); 
                }
            }
            this.game.setHoldingAction(null);
            btn.style.transform = '';
            this.updateUI();
        };

        const bindHoldActions = (btn, actionType) => {
            if (!btn) return;
            btn.addEventListener('mousedown', (e) => handleDown(e, actionType, btn));
            btn.addEventListener('mouseup', (e) => handleUp(e, actionType, btn));
            btn.addEventListener('mouseleave', () => {
                if (this.game.holdingAction === actionType) {
                    this.game.setHoldingAction(null);
                    btn.style.transform = '';
                }
            });
            btn.addEventListener('touchstart', (e) => handleDown(e, actionType, btn), { passive: false });
            btn.addEventListener('touchend', (e) => handleUp(e, actionType, btn));
            btn.addEventListener('contextmenu', e => e.preventDefault());
        };

        // UI Settings
        this.btnSettings.addEventListener('click', () => {
            this.modalSettings.classList.remove('hidden');
        });

        this.btnCloseSettings.addEventListener('click', () => {
            this.modalSettings.classList.add('hidden');
        });

        this.toggleBackground.addEventListener('change', () => {
            this.game.toggleSetting();
        });

        bindHoldActions(this.btnChopWood, 'wood');
        bindHoldActions(this.btnMineStone, 'stone');

        this.btnSellWood.addEventListener('click', () => { this.game.sell('wood'); this.updateUI(); });
        this.btnSellBoard.addEventListener('click', () => { this.game.sell('board'); this.updateUI(); });
        this.btnSellFurniture.addEventListener('click', () => { this.game.sell('furniture'); this.updateUI(); });
        this.btnSellStone.addEventListener('click', () => { this.game.sell('stone'); this.updateUI(); });
        this.btnSellStoneBlock.addEventListener('click', () => { this.game.sell('stoneBlock'); this.updateUI(); });
        this.btnSellConstructionMat.addEventListener('click', () => { this.game.sell('constructionMat'); this.updateUI(); });
        this.btnSellAll.addEventListener('click', () => { this.game.sellAll(); this.updateUI(); });

        // Toggles Customizados
        this.autoSellItems.forEach(item => {
            const btn = document.getElementById(`tg-sell-${item}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.game.toggleAutoSell(item);
                    this.updateUI();
                });
            }
        });

        Object.keys(this.buildings).forEach(id => {
            this.buildings[id].btnBuy.addEventListener('click', () => {
                this.game.buyBuilding(id);
                this.updateUI();
            });
            this.buildings[id].btnCollect.addEventListener('click', () => {
                this.game.collectOutput(id);
                this.updateUI();
            });
            this.buildings[id].btnAuto.addEventListener('click', () => {
                this.game.buyAutoCollect(id);
                this.updateUI();
            });
        });

        this.btnUpgSaws.addEventListener('click', () => {
            this.game.buyUpgrade('sharpSaws');
            this.updateUI();
        });

        this.btnUpgChainsaw.addEventListener('click', () => {
            this.game.buyUpgrade('chainsaw');
            this.updateUI();
        });

        this.btnUpgJackhammer.addEventListener('click', () => {
            this.game.buyUpgrade('jackhammer');
            this.updateUI();
        });

        this.btnUpgSmartSell.addEventListener('click', () => {
            this.game.buyUpgrade('smartSell');
            this.updateUI();
        });

        this.btnUpgStoneUnlock.addEventListener('click', () => {
            this.game.buyStoneUnlock();
            this.updateUI();
        });

        this.btnCloseOffline.addEventListener('click', () => {
            this.modalOffline.classList.add('hidden');
        });

        this.btnAchievements.addEventListener('click', () => {
            this.renderAchievements();
            this.modalAchievements.classList.remove('hidden');
        });

        this.btnCloseAchievements.addEventListener('click', () => {
            this.modalAchievements.classList.add('hidden');
        });
    }

    formatMoney(value) {
        return value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }

    // Contagem inteira de recursos — formatMoney aqui viraria "1,234.00".
    formatCount(value) {
        return Math.floor(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    updateUI(force) {
        const s = this.game.state;

        // Conquistas recém-desbloqueadas são postadas aqui (rodando uma vez por
        // frame) em vez de no próprio motor, que não tem acesso à UI.
        if (this.game.onAchievementUnlocked) {
            const unlocked = this.game.onAchievementUnlocked;
            this.game.onAchievementUnlocked = null;
            for (const a of unlocked) {
                this.showToast(`🏆 Conquista: ${a.name}! (+${(ACHIEVEMENT_BONUS * 100).toFixed(0)}% produção)`);
            }
        }

        // Settings Toggle Update
        if (this.toggleBackground.checked !== s.settings.runInBackground) {
            this.toggleBackground.checked = s.settings.runInBackground;
        }

        // Dinheiro
        this.elMoney.innerText = this.formatMoney(s.money);

        // Inventário
        if (this.elInvWood) this.elInvWood.innerText = Math.floor(s.inventory.wood);
        if (this.elInvBoard) this.elInvBoard.innerText = Math.floor(s.inventory.board);
        if (this.elInvFurniture) this.elInvFurniture.innerText = Math.floor(s.inventory.furniture);
        if (this.elInvStone) this.elInvStone.innerText = Math.floor(s.inventory.stone);
        if (this.elInvStoneBlock) this.elInvStoneBlock.innerText = Math.floor(s.inventory.stoneBlock);
        if (this.elInvConstructionMat) this.elInvConstructionMat.innerText = Math.floor(s.inventory.constructionMat);

        // Auto Sell Toggles & Indicators
        this.autoSellItems.forEach(item => {
            const box = document.getElementById(`box-sell-${item}`);
            const btn = document.getElementById(`tg-sell-${item}`);
            const ind = document.getElementById(`ind-sell-${item}`);
            if (box && btn && ind) {
                if (s.unlocks.smartSell) {
                    box.classList.remove('hidden');
                    const isActive = s.autoSell[item];
                    
                    if (isActive) {
                        btn.classList.add('active');
                        btn.innerText = "ON";
                        // Update opacity based on timer
                        ind.style.opacity = this.game.autoSellTimer / 10;
                    } else {
                        btn.classList.remove('active');
                        btn.innerText = "OFF";
                        ind.style.opacity = 0;
                    }
                }
            }
        });

        // Botões de Venda P/ Ativação
        if (this.btnSellWood) this.btnSellWood.disabled = s.inventory.wood === 0;
        if (this.btnSellBoard) this.btnSellBoard.disabled = s.inventory.board === 0;
        if (this.btnSellFurniture) this.btnSellFurniture.disabled = s.inventory.furniture === 0;
        if (this.btnSellStone) this.btnSellStone.disabled = s.inventory.stone === 0;
        if (this.btnSellStoneBlock) this.btnSellStoneBlock.disabled = s.inventory.stoneBlock === 0;
        if (this.btnSellConstructionMat) this.btnSellConstructionMat.disabled = s.inventory.constructionMat === 0;

        let totalResources = s.inventory.wood + s.inventory.board + s.inventory.furniture + s.inventory.stone + s.inventory.stoneBlock + s.inventory.constructionMat;
        this.btnSellAll.disabled = totalResources === 0;

        // Construções (Madeira)
        this.updateBuildingUI('woodcutter', s.money, 999); // 999 fake resource count
        this.updateBuildingUI('refinery', s.money, s.inventory.wood);
        this.updateBuildingUI('carpentry', s.money, s.inventory.board);

        // Stone Unlocks
        if (s.unlocks.stonePanel) {
            this.groupStone.classList.remove('hidden');
            this.btnMineStone.classList.remove('hidden');
            this.cardStoneMiner.classList.remove('hidden');
            this.cardStoneKiln.classList.remove('hidden');
            this.cardBuilder.classList.remove('hidden');
            this.upgStoneUnlock.classList.add('hidden'); // Some

            this.updateBuildingUI('stoneMiner', s.money, 999);
            this.updateBuildingUI('stoneKiln', s.money, s.inventory.stone);
            
            // O updateBuildingUI padrão aceita um input só. Construtora tem dois. 
            // Para simplificar a UI passamos a qnt que limitaria.
            const minMats = Math.min(s.inventory.board, s.inventory.stoneBlock);
            this.updateBuildingUI('builder', s.money, minMats);
        } else {
            // Botão Unlock Stone (Custa R$ 3k e 100 móveis)
            this.btnUpgStoneUnlock.disabled = s.money < 3000 || s.inventory.furniture < 100;
        }

        // Upgrades Panel
        if (s.unlocks.upgradesPanel) {
            this.panelUpgrades.classList.remove('hidden');
            this.upgSmartSell.classList.remove('hidden');
        }

        // Saws
        if (s.upgrades.sharpSaws) {
            this.btnUpgSaws.innerText = "Comprado";
            this.btnUpgSaws.disabled = true;
            this.btnUpgSaws.classList.remove('btn-upgrade');
            this.btnUpgSaws.style.background = "var(--accent-green)";
        } else {
            this.btnUpgSaws.disabled = s.money < 100;
        }

        // Smart Sell 
        if (s.unlocks.smartSell) {
            this.btnUpgSmartSell.innerText = "Comprado";
            this.btnUpgSmartSell.disabled = true;
            this.btnUpgSmartSell.style.background = "var(--accent-green)";
            this.btnUpgSmartSell.classList.remove('btn-upgrade');
        } else {
            this.btnUpgSmartSell.disabled = s.money < 2000;
        }

        // Chainsaw
        if (s.unlocks.continuousClick) {
            this.upgChainsaw.classList.remove('hidden');
            this.lvlChainsaw.innerText = s.upgrades.chainsawLevel;
            if (this.speedChainsaw && s.upgrades.chainsawLevel > 0) this.speedChainsaw.innerText = `(${s.upgrades.chainsawLevel}/seg)`;
            const chainCost = this.game.getContinuousClickCost('chainsaw');
            this.costChainsaw.innerText = this.formatMoney(chainCost);
            this.btnUpgChainsaw.disabled = s.money < chainCost;
        }

        // Jackhammer
        if (s.unlocks.continuousClick && s.unlocks.stonePanel) {
            this.upgJackhammer.classList.remove('hidden');
            this.lvlJackhammer.innerText = s.upgrades.jackhammerLevel;
            if (this.speedJackhammer && s.upgrades.jackhammerLevel > 0) this.speedJackhammer.innerText = `(${s.upgrades.jackhammerLevel}/seg)`;
            const jackCost = this.game.getContinuousClickCost('jackhammer');
            this.costJackhammer.innerText = this.formatMoney(jackCost);
            this.btnUpgJackhammer.disabled = s.money < jackCost;
        }
        
        this.renderStats(force);
    }

    updateBuildingUI(id, currentMoney, inputResourceCount) {
        const bData = this.game.state.buildings[id];
        const ui = this.buildings[id];
        const cost = this.game.getBuildingCost(id);
        const speed = this.game.getBuildingSpeed(id); // itens por segundo

        // Badge e Custo
        ui.elCount.innerText = bData.count;
        ui.elCost.innerText = this.formatMoney(cost);
        ui.btnBuy.disabled = currentMoney < cost;

        // Velocidade Formatação
        if (bData.count === 0) {
            ui.elSpeed.innerText = "-- / ciclo";
            ui.barFill.style.width = "0%";
            ui.elStatus.innerText = "Parado (Compre para iniciar)";
            ui.elStatus.style.color = "var(--text-secondary)";
            return;
        }

        if (speed >= 1) {
            ui.elSpeed.innerText = `${speed.toFixed(1)} / segundo`;
        } else {
            // Tempo para produzir 1 item
            const timeForOne = (1 / speed).toFixed(1);
            ui.elSpeed.innerText = `${timeForOne}s / ciclo`;
        }

        // Status
        const isGenerator = id === 'woodcutter' || id === 'stoneMiner';

        if (inputResourceCount > 0 || isGenerator) {
            ui.elStatus.innerText = "Produzindo...";
            ui.elStatus.style.color = "var(--accent-green)";
        } else {
            ui.elStatus.innerText = "Parado (Sem recursos)";
            ui.elStatus.style.color = "var(--accent-danger)";
        }

        // Progresso Animado Visão Cliente
        if (inputResourceCount === 0 && !isGenerator) {
            const pct = Math.min((bData.progress * 100), 100);
            ui.barFill.style.width = `${pct}%`;
        } else if (speed >= 1) {
            // Se processar 1 ou mais por segundo, a barra fica 100% cheia para não piscar enlouquecidamente
            ui.barFill.style.width = "100%";
        } else {
            // Se menos, anima o progresso fracionado até 100%
            const pct = Math.min((bData.progress * 100), 100);
            ui.barFill.style.width = `${pct}%`;
        }

        // --- Storage Management Visível ---
        // Apenas oculta o container ou limpa os botões dependendo da propriedade autoCollect
        if (bData.autoCollect) {
            // Se comprou Autocoleta, o Estoque some visualmente e automatiza
            ui.elStorage.parentElement.classList.add('hidden');
        } else {
            ui.elStorage.parentElement.classList.remove('hidden');
            ui.elStorage.innerText = Math.floor(bData.storedOutput);
            
            // Botão Coletar
            ui.btnCollect.disabled = bData.storedOutput < 1;
            
            // Botão Upgrade Autocoleta dinâmico
            ui.btnAuto.innerText = `⭐️ Autocoleta (R$ ${this.formatMoney(bData.autoCollectCost)})`;
            ui.btnAuto.disabled = currentMoney < bData.autoCollectCost;
        }
    }

    // Nomes/ícones por id. Extraído do array local que vivia dentro de renderStats,
    // agora compartilhado com o modal de offline. Substitui o data.js da Fase 3.
    static get RESOURCE_META() {
        return {
            wood:          { name: 'Madeira',           icon: '🪵' },
            board:         { name: 'Tábuas',            icon: '🪚' },
            furniture:     { name: 'Móveis',            icon: '🪑' },
            stone:         { name: 'Pedra',             icon: '🪨' },
            stoneBlock:    { name: 'Blocos de Pedra',   icon: '🧱' },
            constructionMat:{ name: 'Mat. Construção',   icon: '🏗️' }
        };
    }

    showToast(message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerText = message;
        container.appendChild(toast);

        // Remove do DOM após a animação
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 3000);
    }

    formatDuration(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}min`;
        if (m > 0) return `${m}min`;
        return `${Math.floor(seconds)}s`;
    }

    showWelcomeBack(report) {
        const entries = Object.keys(report.gained);

        // Nada produzido (ex: só processadores sem insumo) → não incomoda o jogador.
        if (entries.length === 0 && report.moneyGained <= 0) return;

        this.offlineTime.innerText = report.wasCapped
            ? `Você ficou ${this.formatDuration(report.elapsed)} fora. O jogo simula no máximo 8h de produção.`
            : `Você ficou ${this.formatDuration(report.elapsed)} fora.`;

        const meta = GameUI.RESOURCE_META;
        let html = '';
        entries.forEach(id => {
            const m = meta[id] || { name: id, icon: '📦' };
            html += `
                <div class="offline-gain-row">
                    <span class="offline-gain-icon">${m.icon}</span>
                    <span class="offline-gain-name">${m.name}</span>
                    <span class="offline-gain-value">+${this.formatCount(report.gained[id])}</span>
                </div>
            `;
        });
        if (report.moneyGained > 0) {
            html += `
                <div class="offline-gain-row">
                    <span class="offline-gain-icon">💰</span>
                    <span class="offline-gain-name">Venda automática</span>
                    <span class="offline-gain-value">R$ ${this.formatMoney(report.moneyGained)}</span>
                </div>
            `;
        }

        this.offlineGains.innerHTML = html;
        this.modalOffline.classList.remove('hidden');
    }

    renderStats(force) {
        if (!this.statsContainer) return;

        const s = this.game.state;

        // Reconstruir 6 cards a cada frame é desperdício; só refaz quando os números
        // realmente mudaram (ou quando forçado, p.ex. após um catch-up offline).
        const sig = this.game.getStatsSignature();
        if (!force && sig === this.lastStatsSignature) return;
        this.lastStatsSignature = sig;

        let html = '';
        for (const id in GameUI.RESOURCE_META) {
            const res = GameUI.RESOURCE_META[id];
            const collected = s.stats.totalCollected[id] || 0;
            const earned = s.stats.totalEarned[id] || 0;

            if (collected > 0) {
                html += `
                    <div class="stat-card" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid var(--panel-border);">
                        <div style="font-size: 1.5rem; margin-bottom: 5px;">${res.icon}</div>
                        <h4 style="margin: 0 0 10px 0; color: white;">${res.name}</h4>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 3px;">
                            Coletados: <strong style="color: white;">${Math.floor(collected)}</strong>
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">
                            Lucro: <strong style="color: var(--accent-green);">R$ ${this.formatMoney(earned)}</strong>
                        </div>
                    </div>
                `;
            }
        }

        this.statsContainer.innerHTML = html;
    }

    // Conquistas
    renderAchievements() {
        if (!this.achievementGrid) return;

        const s = this.game.state;
        const unlocked = s.achievements || {};
        const total = ACHIEVEMENTS.length;
        const got = Object.keys(unlocked).length;

        this.achievementCount.innerText = `${got} / ${total}`;
        this.achievementBonusInfo.innerText =
            `Cada conquista dá +${(ACHIEVEMENT_BONUS * 100).toFixed(0)}% de velocidade em toda a produção. ` +
            `Bônus atual: +${(this.game.getAchievementBonus() * 100).toFixed(0)}%.`;

        // Re-render só na mudança da contagem; abrir o modal força a lista atualizada.
        if (this.lastAchievementCount === got && this.achievementGrid.childElementCount > 0) return;
        this.lastAchievementCount = got;

        this.achievementGrid.innerHTML = ACHIEVEMENTS.map(a => {
            const at = unlocked[a.id];
            const state = at ? 'unlocked' : 'locked';
            const when = at ? new Date(at).toLocaleDateString('pt-BR') : 'Bloqueada';
            return `
                <div class="achievement-card ${state}">
                    <div class="achievement-icon">${a.icon}</div>
                    <div class="achievement-info">
                        <h4>${a.name}</h4>
                        <p>${a.desc}</p>
                        <span class="achievement-date">${when}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
}
