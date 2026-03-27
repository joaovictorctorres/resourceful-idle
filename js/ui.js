class GameUI {
    constructor(game) {
        this.game = game;

        // Referências DOM
        this.elMoney = document.getElementById('money-value');

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
                barFill: document.getElementById('progress-woodcutter')
            },
            refinery: {
                btnBuy: document.getElementById('btn-buy-refinery'),
                elCost: document.getElementById('cost-refinery'),
                elCount: document.getElementById('count-refinery'),
                elSpeed: document.getElementById('speed-refinery'),
                elStatus: document.getElementById('status-refinery'),
                barFill: document.getElementById('progress-refinery')
            },
            carpentry: {
                btnBuy: document.getElementById('btn-buy-carpentry'),
                elCost: document.getElementById('cost-carpentry'),
                elCount: document.getElementById('count-carpentry'),
                elSpeed: document.getElementById('speed-carpentry'),
                elStatus: document.getElementById('status-carpentry'),
                barFill: document.getElementById('progress-carpentry')
            },
            stoneMiner: {
                btnBuy: document.getElementById('btn-buy-stoneMiner'),
                elCost: document.getElementById('cost-stoneMiner'),
                elCount: document.getElementById('count-stoneMiner'),
                elSpeed: document.getElementById('speed-stoneMiner'),
                elStatus: document.getElementById('status-stoneMiner'),
                barFill: document.getElementById('progress-stoneMiner')
            },
            stoneKiln: {
                btnBuy: document.getElementById('btn-buy-stoneKiln'),
                elCost: document.getElementById('cost-stoneKiln'),
                elCount: document.getElementById('count-stoneKiln'),
                elSpeed: document.getElementById('speed-stoneKiln'),
                elStatus: document.getElementById('status-stoneKiln'),
                barFill: document.getElementById('progress-stoneKiln')
            },
            builder: {
                btnBuy: document.getElementById('btn-buy-builder'),
                elCost: document.getElementById('cost-builder'),
                elCount: document.getElementById('count-builder'),
                elSpeed: document.getElementById('speed-builder'),
                elStatus: document.getElementById('status-builder'),
                barFill: document.getElementById('progress-builder')
            }
        };

        this.cardStoneMiner = document.getElementById('card-stoneMiner');
        this.cardStoneKiln = document.getElementById('card-stoneKiln');
        this.cardBuilder = document.getElementById('card-builder');

        // Upgrades
        this.panelUpgrades = document.getElementById('panel-upgrades');
        this.cardSaws = document.getElementById('upg-sharp-saws');
        this.btnUpgSaws = document.getElementById('btn-upg-saws');

        this.upgContinuous = document.getElementById('upg-continuous');
        this.btnUpgContinuous = document.getElementById('btn-upg-continuous');
        this.lvlContinuous = document.getElementById('lvl-continuous');
        this.costContinuous = document.getElementById('cost-continuous');

        this.upgStoneUnlock = document.getElementById('upg-stoneUnlock');
        this.btnUpgStoneUnlock = document.getElementById('btn-upg-stoneUnlock');
        
        this.upgSmartSell = document.getElementById('upg-smartSell');
        this.btnUpgSmartSell = document.getElementById('btn-upg-smartSell');

        this.autoSellItems = ['wood', 'board', 'furniture', 'stone', 'stoneBlock', 'constructionMat'];

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
        });

        this.btnUpgSaws.addEventListener('click', () => {
            this.game.buyUpgrade('sharpSaws');
            this.updateUI();
        });

        this.btnUpgContinuous.addEventListener('click', () => {
            this.game.buyUpgrade('continuousClick');
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
    }

    formatMoney(value) {
        return value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }

    updateUI() {
        const s = this.game.state;

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
        this.btnSellWood.disabled = s.inventory.wood === 0;
        this.btnSellBoard.disabled = s.inventory.board === 0;
        this.btnSellFurniture.disabled = s.inventory.furniture === 0;
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

        // Continuous
        if (s.unlocks.continuousClick) {
            this.upgContinuous.classList.remove('hidden');
            this.lvlContinuous.innerText = s.upgrades.continuousClickLevel;
            const continuousCost = this.game.getContinuousClickCost();
            this.costContinuous.innerText = this.formatMoney(continuousCost);
            this.btnUpgContinuous.disabled = s.money < continuousCost;
        }
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
}
