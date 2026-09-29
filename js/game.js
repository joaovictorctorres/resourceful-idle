// Teto de progresso offline: 8 horas. Ausências maiores rendem este teto.
const OFFLINE_CAP_SECONDS = 8 * 60 * 60;
const OFFLINE_MAX_CHUNKS = 240;

class IdleGame {
    constructor() {
        this.version = "1.2.0";
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
            settings: {
                runInBackground: false
            },
            stats: {
                totalWoodChopped: 0,
                manualClicks: 0,
                totalCollected: {},
                totalEarned: {}
            },
            buildings: {
                woodcutter: {
                    count: 0,
                    baseCost: 150,
                    baseTime: 2, 
                    progress: 0,
                    storedOutput: 0,
                    autoCollect: false,
                    autoCollectCost: 1500,
                    outputItem: 'wood'
                },
                refinery: {
                    count: 0,
                    baseCost: 10,
                    baseTime: 5,
                    progress: 0,
                    storedOutput: 0,
                    autoCollect: false,
                    autoCollectCost: 3000,
                    outputItem: 'board'
                },
                carpentry: {
                    count: 0,
                    baseCost: 50,
                    baseTime: 10,
                    progress: 0,
                    storedOutput: 0,
                    autoCollect: false,
                    autoCollectCost: 10000,
                    outputItem: 'furniture'
                },
                stoneMiner: {
                    count: 0,
                    baseCost: 5000,
                    baseTime: 3,
                    progress: 0,
                    storedOutput: 0,
                    autoCollect: false,
                    autoCollectCost: 30000,
                    outputItem: 'stone'
                },
                stoneKiln: {
                    count: 0,
                    baseCost: 10000,
                    baseTime: 8,
                    progress: 0,
                    storedOutput: 0,
                    autoCollect: false,
                    autoCollectCost: 75000,
                    outputItem: 'stoneBlock'
                },
                builder: {
                    count: 0,
                    baseCost: 50000,
                    baseTime: 15,
                    progress: 0,
                    storedOutput: 0,
                    autoCollect: false,
                    autoCollectCost: 200000,
                    outputItem: 'constructionMat'
                }
            },
            upgrades: {
                sharpSaws: false, 
                chainsawLevel: 0,
                jackhammerLevel: 0
            },
            unlocks: {
                upgradesPanel: false,
                continuousClick: false,
                stonePanel: false,
                smartSell: false
            },
            lastSaveTimestamp: 0
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
    this.state.stats.totalCollected['wood'] = (this.state.stats.totalCollected['wood'] || 0) + 1;
    this.checkUnlocks();
}

mineStone() {
    if (!this.state.unlocks.stonePanel) return;
    this.state.inventory.stone++;
    this.state.stats.totalCollected['stone'] = (this.state.stats.totalCollected['stone'] || 0) + 1;
}

sell(item) {
    const prices = {
        wood: 1,
        board: 5,
        furniture: 25,
        stone: 10,
        stoneBlock: 50,
        constructionMat: 500
    };

    if (this.state.inventory[item] > 0) {
        const amount = this.state.inventory[item];
        const earn = amount * prices[item];
        this.state.inventory[item] = 0;
        this.state.money += earn;
        
        // Track earning
        this.state.stats.totalEarned[item] = (this.state.stats.totalEarned[item] || 0) + earn;
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
    } else if (id === 'chainsaw') {
        const cost = this.getContinuousClickCost('chainsaw');
        if (this.state.money >= cost && this.state.unlocks.continuousClick) {
            this.state.money -= cost;
            this.state.upgrades.chainsawLevel++;
        }
    } else if (id === 'jackhammer') {
        const cost = this.getContinuousClickCost('jackhammer');
        // Só permite comprar se tiver destravado a pedra também (stonePanel)
        if (this.state.money >= cost && this.state.unlocks.continuousClick && this.state.unlocks.stonePanel) {
            this.state.money -= cost;
            this.state.upgrades.jackhammerLevel++;
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

getContinuousClickCost(type) {
    if (type === 'chainsaw') {
        return 500 * Math.pow(2.5, this.state.upgrades.chainsawLevel);
    } else if (type === 'jackhammer') {
        return 500 * Math.pow(2.5, this.state.upgrades.jackhammerLevel);
    }
    return 0;
}

toggleSetting() {
    this.state.settings.runInBackground = !this.state.settings.runInBackground;
}

collectOutput(bId) {
    const b = this.state.buildings[bId];
    if (b.storedOutput > 0) {
        this.state.inventory[b.outputItem] += b.storedOutput;
        this.state.stats.totalCollected[b.outputItem] = (this.state.stats.totalCollected[b.outputItem] || 0) + b.storedOutput;
        b.storedOutput = 0;
    }
}

buyAutoCollect(id) {
    const b = this.state.buildings[id];
    const cost = b.autoCollectCost;
    if (this.state.money >= cost && !b.autoCollect) {
        this.state.money -= cost;
        b.autoCollect = true;
        // Se ela já tinha coisas estocadas quando comprou o Auto, joga diretamente pro inventário
        this.collectOutput(id);
    }
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
    // Lógica do clique contínuo baseada na ação atual
    if (this.holdingAction) {
        let level = 0;
        if (this.holdingAction === 'wood') level = this.state.upgrades.chainsawLevel;
        if (this.holdingAction === 'stone') level = this.state.upgrades.jackhammerLevel;

        if (level > 0) {
            const clicksPerSec = level;
            this.holdProgress += dt;
            while (this.holdProgress >= 1 / clicksPerSec) {
                if (this.holdingAction === 'wood') this.chopWood();
                if (this.holdingAction === 'stone') this.mineStone();
                this.holdProgress -= 1 / clicksPerSec;
            }
        }
    }

    // Lógica de Venda Automática (Smart Sell)
    if (this.state.unlocks.smartSell) {
        this.autoSellTimer += dt;
        // while, não if: com o catch-up offline o dt pode ser de minutos, e um `if`
        // pagaria um único ciclo por chunk em vez de um a cada 10s.
        while (this.autoSellTimer >= 10) {
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
        if (b.autoCollect) {
            this.state.inventory[outputResource]++;
            this.state.stats.totalCollected[outputResource] = (this.state.stats.totalCollected[outputResource] || 0) + 1;
        } else {
            b.storedOutput++;
        }
        
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
    }

    // Processa todos os itens completos acumulados no progresso
    while (b.progress >= 1 && this.state.inventory[inputResource] > 0) {
        this.state.inventory[inputResource]--;
        
        if (b.autoCollect) {
            this.state.inventory[outputResource]++;
            this.state.stats.totalCollected[outputResource] = (this.state.stats.totalCollected[outputResource] || 0) + 1;
        } else {
            b.storedOutput++;
        }

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

            if (b.autoCollect) {
                this.state.inventory[outputResource]++;
                this.state.stats.totalCollected[outputResource] = (this.state.stats.totalCollected[outputResource] || 0) + 1;
            } else {
                b.storedOutput++;
            }

            b.progress -= 1;
        } else {
            b.progress = 1;
            break;
        }
    }
}

// Progresso Offline
//
// Reexecuta o update() existente em chunks em vez de usar fórmula fechada: os
// process* são dt-agnósticos (progress += speed*dt + while), então chunked equivale
// a simulação fina e ainda respeita o esgotamento de insumo em cadeia.
applyOfflineProgress() {
    const s = this.state;

    // Save antigo (pré-offline) não tem timestamp: nada a pagar, senão todo jogador
    // existente ganharia 8h grátis no primeiro load.
    if (!s.lastSaveTimestamp) return null;

    const elapsed = (Date.now() - s.lastSaveTimestamp) / 1000;
    // Relógio do sistema alterado / NaN / ausência negativa → não simula nada.
    if (!Number.isFinite(elapsed) || elapsed <= 0) return null;

    const capped = Math.min(elapsed, OFFLINE_CAP_SECONDS);
    // n derivado do chunk, não um loop de tamanho fixo: senão uma ausência de
    // 241s pagaria 480s.
    const chunkSize = Math.max(1, Math.ceil(capped / OFFLINE_MAX_CHUNKS));
    const steps = Math.ceil(capped / chunkSize);

    const before = { ...s.inventory };
    const moneyBefore = s.money;

    for (let i = 0; i < steps; i++) {
        // O último passo é o resto, para os chunks somarem `capped` exatos em vez
        // de arredondar para cima (241s viravam 242s e pagavam 1 item a mais).
        const dt = (i === steps - 1) ? capped - chunkSize * (steps - 1) : chunkSize;
        this.update(dt);
    }

    const gained = {};
    for (const item in s.inventory) {
        const diff = s.inventory[item] - (before[item] || 0);
        if (diff > 0) gained[item] = Math.floor(diff);
    }

    return {
        elapsed,
        capped,
        wasCapped: elapsed > OFFLINE_CAP_SECONDS,
        gained,
        moneyGained: Math.floor(s.money - moneyBefore)
    };
}

// Persistência
save() {
    // Carimba aqui, não no fim do catch-up: se o timestamp só fosse atualizado na
    // rotina offline, fechar a aba logo após o catch-up salvaria o timestamp velho
    // e o próximo load pagaria o período de novo.
    this.state.lastSaveTimestamp = Date.now();
    localStorage.setItem('idleGameSave', JSON.stringify(this.state));
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
            this.state.settings = { ...this.getDefaultState().settings, ...saveObj.settings };

            this.state.stats = { ...this.getDefaultState().stats, ...saveObj.stats };
            this.state.stats.totalCollected = { ...this.getDefaultState().stats.totalCollected, ...(saveObj.stats?.totalCollected || {}) };
            this.state.stats.totalEarned = { ...this.getDefaultState().stats.totalEarned, ...(saveObj.stats?.totalEarned || {}) };

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
