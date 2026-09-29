// Teto de progresso offline: 8 horas. Ausências maiores rendem este teto.
const OFFLINE_CAP_SECONDS = 8 * 60 * 60;
const OFFLINE_MAX_CHUNKS = 240;

// Unlock da metalurgia. O tier final fica atrás da cadeia de construção.
const METAL_UNLOCK_COST = 150000;
const METAL_UNLOCK_MATS = 100;

// Estado de um prédio: só os 4 campos mutáveis. Config estática (custo, tempo,
// insumo, saída) vem de BUILDINGS — ver load() para por quê.
function freshBuilding() {
    return { count: 0, progress: 0, storedOutput: 0, autoCollect: false };
}

function zeroedFor(keys) {
    return Object.fromEntries(keys.map(k => [k, 0]));
}

function falsesFor(keys) {
    return Object.fromEntries(keys.map(k => [k, false]));
}

function freshBuildings() {
    return Object.fromEntries(Object.keys(BUILDINGS).map(id => [id, freshBuilding()]));
}

class IdleGame {
    constructor() {
        this.version = "1.2.0";
        this.holdingAction = null; // 'wood' ou 'stone'
        this.holdProgress = 0;
        this.autoSellTimer = 0;
        this.achievementTimer = 0;

        // Estado Inicial
        this.state = this.getDefaultState();
    }

    getDefaultState() {
        return {
            money: 0,
            inventory: zeroedFor(Object.keys(RESOURCES)),
            autoSell: falsesFor(Object.keys(RESOURCES)),
            settings: {
                runInBackground: false
            },
            stats: {
                totalWoodChopped: 0,
                manualClicks: 0,
                totalCollected: {},
                totalEarned: {}
            },
            buildings: freshBuildings(),
            upgrades: {
                sharpSaws: false,
                chainsawLevel: 0,
                jackhammerLevel: 0,
                pickaxeLevel: 0
            },
            unlocks: {
                upgradesPanel: false,
                continuousClick: false,
                stonePanel: false,
                metalPanel: false,
                smartSell: false
            },
            achievements: {},
            lastSaveTimestamp: 0
        };
    }

    getBuildingCost(id) {
        const b = this.state.buildings[id];
        return BUILDINGS[id].baseCost * Math.pow(1.15, b.count);
    }

getBuildingSpeed(id) {
    const b = this.state.buildings[id];
    if (b.count === 0) return 0;

    let speedMultiplier = 1.0;
    for (const u of BUILDINGS[id].speedUpgrades || []) {
        if (this.state.upgrades[u.id]) speedMultiplier *= u.mult;
    }
    speedMultiplier *= 1 + this.getAchievementBonus();

    // Itens por segundo = Quantidade * Multiplicador / Tempo Base
    return (b.count * speedMultiplier) / BUILDINGS[id].baseTime;
}

// Quanto de um recurso entra por segundo, somando todos os prédios que o produzem.
// É o número que a barra de recursos mostra; antes ele não existia em lugar nenhum.
getResourceRate(id) {
    let rate = 0;
    for (const bId in BUILDINGS) {
        const def = BUILDINGS[bId];
        if (def.output !== id) continue;
        if (this.isBuildingUnlocked(bId)) rate += this.getBuildingSpeed(bId);
    }
    return rate;
}

isBuildingUnlocked(id) {
    const def = BUILDINGS[id];
    if (!def) return false;
    if (def.requires && !this.state.unlocks[def.requires]) return false;
    const groupReq = GROUPS[def.group]?.requires;
    return !groupReq || !!this.state.unlocks[groupReq];
}

// Um recurso está liberado quando o próprio `requires` (se houver) e o do seu
// grupo estão abertos. Sem o fallback do grupo, `stoneBlock` e
// `constructionMat` — que não trazem requires próprio — apareceriam antes do
// unlock da pedreira.
isResourceUnlocked(id) {
    const def = RESOURCES[id];
    if (!def) return false;
    if (def.requires && !this.state.unlocks[def.requires]) return false;
    const groupReq = GROUPS[def.group]?.requires;
    return !groupReq || !!this.state.unlocks[groupReq];
}

// Bônus acumulado das conquistas. Conta os ids desbloqueados em vez de manter um
// contador no save: assim não existe campo derivado para dessincronizar.
getAchievementBonus() {
    const n = Object.keys(this.state.achievements || {}).length;
    return n * ACHIEVEMENT_BONUS;
}

// Assinatura barata das estatísticas, para a UI saber se precisa redesenhar o
// painel. Dois valores que diferem em 0.001 produzem a mesma string de propósito:
// o painel mostra inteiros.
getStatsSignature() {
    const s = this.state.stats;
    const collected = Object.values(s.totalCollected || {}).map(Math.floor).join(',');
    const earned = Object.values(s.totalEarned || {}).map(Math.floor).join(',');
    return `${s.manualClicks}|${collected}|${earned}`;
}

// Ações do Jogador
setHoldingAction(actionName) {
    this.holdingAction = actionName;
    if (!actionName) {
        this.holdProgress = 0;
    }
}

// Coleta manual de um recurso qualquer. Cobre madeira, pedra e os minérios da
// metalurgia — o botão é gerado a partir de RESOURCES[].manual, então um
// recurso novo com coleta manual não precisa de método novo.
gather(id) {
    const def = RESOURCES[id];
    if (!def || !def.manual) return;
    if (def.requires && !this.state.unlocks[def.requires]) return;

    this.state.inventory[id]++;
    this.state.stats.manualClicks++;
    this.state.stats.totalCollected[id] = (this.state.stats.totalCollected[id] || 0) + 1;

    // A madeira tem um stat próprio que destrava o painel de upgrades. A escrita
    // aqui em vez de hardcoded é o que mantém a Fase 3 genérica.
    if (def.trackStat) this.state.stats[def.trackStat]++;
    this.checkUnlocks();
}

sell(item) {
    // Id desconhecido não pode virar `amount * undefined` = NaN, que infectaria
    // money permanentemente (e sobrevive no save).
    const def = RESOURCES[item];
    if (!def) return;

    if (this.state.inventory[item] > 0) {
        const amount = this.state.inventory[item];
        const earn = amount * def.price;
        this.state.inventory[item] = 0;
        this.state.money += earn;

        // Track earning
        this.state.stats.totalEarned[item] = (this.state.stats.totalEarned[item] || 0) + earn;
    }
}

// Sem gate de unlock: seguir o precedente do auto-sell (que nunca gateou). Sem o
// unlock o jogador não tem como obter esses recursos — gather() exige o unlock e
// os prédios são `requires`-gated.
sellAll() {
    for (const id in RESOURCES) this.sell(id);
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
    } else if (id === 'chainsawLevel') {
        const cost = this.getContinuousClickCost('chainsawLevel');
        if (this.state.money >= cost && this.state.unlocks.continuousClick) {
            this.state.money -= cost;
            this.state.upgrades.chainsawLevel++;
        }
    } else if (id === 'jackhammerLevel') {
        const cost = this.getContinuousClickCost('jackhammerLevel');
        // Só permite comprar se tiver destravado a pedra também (stonePanel)
        if (this.state.money >= cost && this.state.unlocks.continuousClick && this.state.unlocks.stonePanel) {
            this.state.money -= cost;
            this.state.upgrades.jackhammerLevel++;
        }
    } else if (id === 'pickaxeLevel') {
        const cost = this.getContinuousClickCost('pickaxeLevel');
        if (this.state.money >= cost && this.state.unlocks.continuousClick && this.state.unlocks.metalPanel) {
            this.state.money -= cost;
            this.state.upgrades.pickaxeLevel++;
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

// Custo do próximo nível de um upgrade de clique contínuo. A perfuratriz é
// mais cara: é o tier final e seu alvo é a cadeia mais profunda do jogo.
getContinuousClickCost(type) {
    const level = this.state.upgrades[type] || 0;
    // `type` chega como nome do campo no state (chainsawLevel, pickaxeLevel…).
    const base = type === 'pickaxeLevel' ? 5000 : 500;
    return base * Math.pow(2.5, level);
}

toggleSetting() {
    this.state.settings.runInBackground = !this.state.settings.runInBackground;
}

collectOutput(bId) {
    const b = this.state.buildings[bId];
    const out = BUILDINGS[bId].output;
    if (b.storedOutput > 0) {
        this.state.inventory[out] += b.storedOutput;
        this.state.stats.totalCollected[out] = (this.state.stats.totalCollected[out] || 0) + b.storedOutput;
        b.storedOutput = 0;
    }
}

buyAutoCollect(id) {
    const b = this.state.buildings[id];
    const cost = BUILDINGS[id].autoCollectCost;
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

// Requisito: R$ 150.000 e 100 Materiais de Construção. A metalurgia é o tier
// final — precisa ficar atrás da cadeia de construção, não ao lado dela.
buyMetalUnlock() {
    const s = this.state;
    if (s.money >= METAL_UNLOCK_COST &&
        s.inventory.constructionMat >= METAL_UNLOCK_MATS &&
        !s.unlocks.metalPanel) {
        s.money -= METAL_UNLOCK_COST;
        s.inventory.constructionMat -= METAL_UNLOCK_MATS;
        s.unlocks.metalPanel = true;
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
    // Lógica do clique contínuo baseada na ação atual. O nível vem de
    // RESOURCES[].holdUpgrade, então segurar o botão de qualquer minério da
    // metalurgia funciona sem código novo por recurso.
    if (this.holdingAction) {
        const holdUpgrade = RESOURCES[this.holdingAction]?.holdUpgrade;
        const level = holdUpgrade ? this.state.upgrades[holdUpgrade] : 0;

        if (level > 0) {
            const clicksPerSec = level;
            this.holdProgress += dt;
            while (this.holdProgress >= 1 / clicksPerSec) {
                this.gather(this.holdingAction);
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

    // Prédios, na ordem de declaração de BUILDINGS — que é a ordem de
    // processamento original. Não reordenar sem pensar (ver comentário no data.js).
    for (const id in BUILDINGS) {
        if (this.isBuildingUnlocked(id)) this.processBuilding(id, dt);
    }

    this.checkUnlocks();

    // Conquistas: 1x por segundo, não a cada frame. As condições varrem o state
    // inteiro e custariam caro a 60fps.
    this.achievementTimer = (this.achievementTimer || 0) + dt;
    if (this.achievementTimer >= 1) {
        this.achievementTimer = 0;
        this.checkAchievements();
    }
}

// Conquistas
checkAchievements() {
    if (this._suppressAchievements) return [];

    const s = this.state;
    const unlocked = [];

    for (const a of ACHIEVEMENTS) {
        if (s.achievements[a.id]) continue;
        if (a.check(s)) {
            s.achievements[a.id] = Date.now();
            unlocked.push(a);
        }
    }

    if (unlocked.length > 0) {
        this.onAchievementUnlocked = unlocked;
    }
    return unlocked;
}
    // Uma função só para gerador, processador e edifício complexo: o que os
    // distingue é só a lista de insumos. inputs: [] = gerador.
    //
    // A ordem de chamada dentro de update() importa: em um tick, um produtor vem
    // antes do consumidor, então o que ele acabou de produzir ainda conta como
    // insumo disponível no mesmo passo.
    processBuilding(id, dt) {
        const b = this.state.buildings[id];
        const def = BUILDINGS[id];
        const speed = this.getBuildingSpeed(id);
        if (speed === 0) return;

        const inv = this.state.inventory;
        const hasInputs = () => def.inputs.every(i => inv[i.id] >= i.qty);

        if (hasInputs()) {
            b.progress += speed * dt;
        } else if (def.inputs.length > 0) {
            // Acabou insumo no meio do processamento: capa em 1 e fica na beira
            // aguardando. Sem isso sobraria progresso bancado que pagaria de uma
            // vez quando o insumo voltasse.
            if (b.progress > 1) b.progress = 1;
        }

        while (b.progress >= 1 && hasInputs()) {
            for (const i of def.inputs) inv[i.id] -= i.qty;

            if (b.autoCollect) {
                inv[def.output]++;
                this.state.stats.totalCollected[def.output] =
                    (this.state.stats.totalCollected[def.output] || 0) + 1;
            } else {
                b.storedOutput++;
            }

            // Fora do if/else de propósito: o stat conta a produção do prédio,
            // não a coleta. Movê-lo para dentro pararia de contar lenha assim que
            // o jogador comprasse autocoleta, e é ele que destrava checkUnlocks().
            if (def.trackStat) this.state.stats[def.trackStat]++;

            b.progress -= 1;
        }

        if (def.inputs.length > 0 && !hasInputs() && b.progress > 1) {
            b.progress = 1;
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
    // O que o catch-up vai creditar nas estatísticas. Sem o rollback abaixo,
    // voltar de 8h com 50 lenhadores desbloquearia conquistas que valem bônus
    // permanente sem o jogador ter jogado. O jogador ganha os recursos, não as
    // medalhas — e conquistá-las de verdade passa a ser mais rápido, porque
    // progresso jogado não é devolvido.
    const statsBefore = JSON.stringify(s.stats);

    // update() roda checkAchievements() a cada segundo simulado. Desligar aqui é o
    // que realmente impede as conquistas — restaurar as stats depois já não desfaz
    // uma conquista que entrou em state.achievements no meio dos chunks.
    this._suppressAchievements = true;
    try {
        for (let i = 0; i < steps; i++) {
            // O último passo é o resto, para os chunks somarem `capped` exatos em vez
            // de arredondar para cima (241s viravam 242s e pagavam 1 item a mais).
            const dt = (i === steps - 1) ? capped - chunkSize * (steps - 1) : chunkSize;
            this.update(dt);
        }
    } finally {
        this._suppressAchievements = false;
    }

    s.stats = JSON.parse(statsBefore);

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

            // Só os 4 campos mutáveis vêm do save. Com {...default, ...save}, um
            // save antigo carregando baseCost: 5000 sombrearia o data.js para
            // sempre — da próxima vez que o custo mudasse na tabela, todo jogador
            // que voltasse manteria o antigo em silêncio.
            this.state.buildings = {};
            for (const id in BUILDINGS) {
                const s = saveObj.buildings?.[id] || {};
                this.state.buildings[id] = {
                    count: s.count || 0,
                    progress: s.progress || 0,
                    storedOutput: s.storedOutput || 0,
                    autoCollect: !!s.autoCollect
                };
            }
        } catch (e) {
            console.error("Save corrompido, iniciando novo jogo.");
        }
    }
}
}
