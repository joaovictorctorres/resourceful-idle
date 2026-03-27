class IdleGame {
    constructor() {
        this.version = "1.2.0";
        this.lastSaveTime = 0;
        this.holdingAction = null; // 'wood' ou 'stone'
        this.holdProgress = 0;
        this.autoSellTimer = 0;

    // Estado Inicial
    this.state = this.getDefaultState();
}

getDefaultState() {
        return {
            money: 0,
            inventory: {
                wood: 0,
                board: 0,
                furniture: 0,
                stone: 0,
                stoneBlock: 0,
                constructionMat: 0
            },
            autoSell: {
                wood: false,
                board: false,
                furniture: false,
                stone: false,
                stoneBlock: false,
                constructionMat: false
            },
            stats: {
                totalWoodChopped: 0,
                manualClicks: 0
            },
            buildings: {
                woodcutter: {
                    count: 0,
                    baseCost: 150,
                    baseTime: 2, // segundos para 1 ciclo
                    progress: 0
                },
                refinery: {
                    count: 0,
                    baseCost: 10,
                    baseTime: 5, // segundos para 1 ciclo
                    progress: 0
                },
                carpentry: {
                    count: 0,
                    baseCost: 50,
                    baseTime: 10,
                    progress: 0
                },
                stoneMiner: {
                    count: 0,
                    baseCost: 5000,
                    baseTime: 3,
                    progress: 0
                },
                stoneKiln: {
                    count: 0,
                    baseCost: 10000,
                    baseTime: 8,
                    progress: 0
                },
                builder: {
                    count: 0,
                    baseCost: 50000,
                    baseTime: 15, // Consome 1 Tabua e 1 Bloco de Pedra p/ gerar 1 Material de Construção
                    progress: 0
                }
            },
            upgrades: {
                sharpSaws: false, // Custava $100 -> +10% speed na refinaria
                continuousClickLevel: 0
            },
            unlocks: {
                upgradesPanel: false,
                continuousClick: false,
                stonePanel: false,
                smartSell: false
            }
        };
}

getBuildingCost(id) {
    const b = this.state.buildings[id];
    return b.baseCost * Math.pow(1.15, b.count);
}

getBuildingSpeed(id) {
    const b = this.state.buildings[id];
    if (b.count === 0) return 0;

    let speedMultiplier = 1.0;
    if (id === 'refinery' && this.state.upgrades.sharpSaws) {
        speedMultiplier = 1.1; // 10% mais rápido!
    }

    // Itens por segundo = Quantidade * Multiplicador / Tempo Base
    return (b.count * speedMultiplier) / b.baseTime;
}

// Ações do Jogador
setHoldingAction(actionName) {
    this.holdingAction = actionName;
    if (!actionName) {
        this.holdProgress = 0;
    }
}

chopWood() {
    this.state.inventory.wood++;
    this.state.stats.totalWoodChopped++;
    this.state.stats.manualClicks++;
    this.checkUnlocks();
}

mineStone() {
    if (!this.state.unlocks.stonePanel) return;
    this.state.inventory.stone++;
    // Se quiser adicionar stats de pedra minerada seria aqui
}

sell(item) {
    const prices = {
        wood: 1,
        board: 5,
        furniture: 25,
        stone: 10,
        stoneBlock: 50,
        constructionMat: 150
    };

    if (this.state.inventory[item] > 0) {
        const amount = this.state.inventory[item];
        const earn = amount * prices[item];
        this.state.inventory[item] = 0;
        this.state.money += earn;
    }
}

sellAll() {
    this.sell('wood');
    this.sell('board');
    this.sell('furniture');
    if (this.state.unlocks.stonePanel) {
        this.sell('stone');
        this.sell('stoneBlock');
        this.sell('constructionMat');
    }
}

buyBuilding(id) {
    const cost = this.getBuildingCost(id);
    if (this.state.money >= cost) {
        this.state.money -= cost;
        this.state.buildings[id].count++;
    }
}

buyUpgrade(id) {
    if (id === 'sharpSaws') {
        const cost = 100;
        if (this.state.money >= cost && !this.state.upgrades.sharpSaws) {
            this.state.money -= cost;
            this.state.upgrades.sharpSaws = true;
        }
    } else if (id === 'continuousClick') {
        const cost = this.getContinuousClickCost();
        if (this.state.money >= cost && this.state.unlocks.continuousClick) {
            this.state.money -= cost;
            this.state.upgrades.continuousClickLevel++;
        }
    } else if (id === 'smartSell') {
        const cost = 2000;
        if (this.state.money >= cost && !this.state.unlocks.smartSell) {
            this.state.money -= cost;
            this.state.unlocks.smartSell = true;
        }
    }
}

toggleAutoSell(resource) {
    if (this.state.unlocks.smartSell && this.state.autoSell.hasOwnProperty(resource)) {
        this.state.autoSell[resource] = !this.state.autoSell[resource];
    }
}

getContinuousClickCost() {
    // Custo Inicial R$ 500, multiplicador x2.5 a cada nível
    return 500 * Math.pow(2.5, this.state.upgrades.continuousClickLevel);
}

buyStoneUnlock() {
    // Requisito: $3000 e 100 Móveis
    if (this.state.money >= 3000 && this.state.inventory.furniture >= 100 && !this.state.unlocks.stonePanel) {
        this.state.money -= 3000;
        this.state.inventory.furniture -= 100;
        this.state.unlocks.stonePanel = true;
    }
}

checkUnlocks() {
    if (!this.state.unlocks.upgradesPanel && this.state.stats.totalWoodChopped >= 50) {
        this.state.unlocks.upgradesPanel = true;
    }
    if (!this.state.unlocks.continuousClick && this.state.stats.manualClicks >= 100) {
        this.state.unlocks.continuousClick = true;
        this.state.unlocks.upgradesPanel = true;
    }
}

// Lógica principal rodando no intervalo de tempo (dt em segundos)
update(dt) {
    // Lógica do clique contínuo
    if (this.holdingAction && this.state.upgrades.continuousClickLevel > 0) {
        const clicksPerSec = this.state.upgrades.continuousClickLevel;
        this.holdProgress += dt;
        while (this.holdProgress >= 1 / clicksPerSec) {
            if (this.holdingAction === 'wood') this.chopWood();
            if (this.holdingAction === 'stone') this.mineStone();
            this.holdProgress -= 1 / clicksPerSec;
        }
    }

    // Lógica de Venda Automática (Smart Sell)
    if (this.state.unlocks.smartSell) {
        this.autoSellTimer += dt;
        if (this.autoSellTimer >= 10) { // A cada 10 segundos
            // Pega cada recurso do inventário
            for (const item in this.state.autoSell) {
                if (this.state.autoSell[item] === true && this.state.inventory[item] > 0) {
                    this.sell(item);
                }
            }
            this.autoSellTimer -= 10;
        }
    }

    // Geradores Automáticos
    this.processGenerator('woodcutter', 'wood', dt);
    
    if (this.state.unlocks.stonePanel) {
        this.processGenerator('stoneMiner', 'stone', dt);
        this.processBuilding('stoneKiln', 'stone', 'stoneBlock', dt);
        // Novo prédio complexo Construtora: consume [{res:'board', qty:1}, {res:'stoneBlock', qty:1}]
        this.processComplexBuilding('builder', [
            { id: 'board', qty: 1 }, 
            { id: 'stoneBlock', qty: 1 }
        ], 'constructionMat', dt);
    }

    // Processadores de Material
    this.processBuilding('refinery', 'wood', 'board', dt);
    this.processBuilding('carpentry', 'board', 'furniture', dt);
    this.checkUnlocks();
}

processGenerator(id, outputResource, dt) {
    const b = this.state.buildings[id];
    const speed = this.getBuildingSpeed(id);

    if (speed === 0) return;

    b.progress += speed * dt;

    while (b.progress >= 1) {
        this.state.inventory[outputResource]++;
        if (outputResource === 'wood') {
            this.state.stats.totalWoodChopped++;
        }
        b.progress -= 1;
    }
}

processBuilding(id, inputResource, outputResource, dt) {
    const b = this.state.buildings[id];
    const speed = this.getBuildingSpeed(id);

    if (speed === 0) return;

    // Limita o progresso se não houver recursos
    if (this.state.inventory[inputResource] > 0) {
        b.progress += speed * dt;
    } else if (b.progress > 1) {
        // Se acabou recurso no meio do processamento, capa em 1 (fica aguardando).
        b.progress = 1;
    }

    // Processa todos os itens completos acumulados no progresso
    while (b.progress >= 1 && this.state.inventory[inputResource] > 0) {
        this.state.inventory[inputResource]--;
        this.state.inventory[outputResource]++;

        // Para madeira, não contamos como "chopped" pois já foi cortada manualmente.
        b.progress -= 1;
    }

    // Se após esgotar o inventário ainda sobrou progresso mas não tem insumo
    if (this.state.inventory[inputResource] === 0 && b.progress > 1) {
        b.progress = 1; // Fica na beira aguardando recurso
    }
}

// Lógica de edifício complexo que exige N insumos simultaneamente
processComplexBuilding(bId, inputsArray, outputResource, dt) {
    const b = this.state.buildings[bId];
    const speed = this.getBuildingSpeed(bId);

    if (speed === 0) return;

    // Checa se todos os insumos mínimos existem
    let hasAllInputs = true;
    for (const input of inputsArray) {
        if (this.state.inventory[input.id] < input.qty) {
            hasAllInputs = false;
            break;
        }
    }

    if (hasAllInputs) {
        b.progress += speed * dt;
    } else if (b.progress > 1) {
        b.progress = 1;
    }

    // Checagem segura caso gere rápido demais
    while (b.progress >= 1) {
        let confirmHasInputs = true;
        for (const input of inputsArray) {
            if (this.state.inventory[input.id] < input.qty) {
                confirmHasInputs = false;
            }
        }
        
        if (confirmHasInputs) {
            for (const input of inputsArray) {
                this.state.inventory[input.id] -= input.qty;
            }
            this.state.inventory[outputResource]++;
            b.progress -= 1;
        } else {
            b.progress = 1;
            break;
        }
    }
}

// Persistência
save() {
    localStorage.setItem('idleGameSave', JSON.stringify(this.state));
    this.lastSaveTime = Date.now();
}

load() {
    const saveStr = localStorage.getItem('idleGameSave');
    if (saveStr) {
        try {
            const saveObj = JSON.parse(saveStr);
            // Merge simples para casos de atualização de versão no defaultState
            this.state = { ...this.getDefaultState(), ...saveObj };

            // Deep merge de correções
            this.state.inventory = { ...this.getDefaultState().inventory, ...saveObj.inventory };
            this.state.autoSell = { ...this.getDefaultState().autoSell, ...saveObj.autoSell };
            this.state.stats = { ...this.getDefaultState().stats, ...saveObj.stats };
            this.state.unlocks = { ...this.getDefaultState().unlocks, ...saveObj.unlocks };
            this.state.upgrades = { ...this.getDefaultState().upgrades, ...saveObj.upgrades };

            // Merge de buildings individualmente
            const defaultBuildings = this.getDefaultState().buildings;
            for (const key in defaultBuildings) {
                if (saveObj.buildings && saveObj.buildings[key]) {
                    this.state.buildings[key] = { ...defaultBuildings[key], ...saveObj.buildings[key] };
                } else {
                    this.state.buildings[key] = { ...defaultBuildings[key] };
                }
            }
        } catch (e) {
            console.error("Save corrompido, iniciando novo jogo.");
        }
    }
}
}
