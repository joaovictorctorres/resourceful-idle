// Definições de conteúdo do jogo. Fonte única de verdade — o motor, a UI e a
// árvore de pesquisa leem daqui em vez de repetir dados em markup.

// Cadeias de recurso. `color` alimenta a custom property --chain, então um grupo
// novo custa zero CSS. `requires` é o unlock que esconde o grupo inteiro.
const GROUPS = {
    wood:  { name: 'Madeira', color: '#d9a05b' },
    stone: { name: 'Pedra',   color: '#8fa3b8', requires: 'stonePanel' },
    metal: { name: 'Metal',   color: '#e8833a', requires: 'metalPanel' }  // fase metalurgia
};

// Ordem das chaves = ordem de exibição. `short` é o rótulo compacto da barra de
// recursos, do painel de stats e do modal de offline.
// `manual: true` ganha botão de coleta manual. `requires` esconde o recurso
// (e sua cadeia) até o unlock.
const RESOURCES = {
    wood:            { name: 'Madeira Bruta',          short: 'Madeira',          icon: '🪵', price: 1,    group: 'wood',  manual: true, trackStat: 'totalWoodChopped', holdUpgrade: 'chainsawLevel' },
    board:           { name: 'Tábua',                  short: 'Tábuas',           icon: '🪚', price: 5,    group: 'wood' },
    furniture:       { name: 'Móvel',                  short: 'Móveis',           icon: '🪑', price: 25,   group: 'wood' },
    stone:           { name: 'Pedra Bruta',            short: 'Pedra',            icon: '🪨', price: 10,   group: 'stone', manual: true, requires: 'stonePanel', holdUpgrade: 'jackhammerLevel' },
    stoneBlock:      { name: 'Bloco de Pedra',         short: 'Blocos de Pedra',  icon: '🧱', price: 50,   group: 'stone' },
    constructionMat: { name: 'Material de Construção', short: 'Mat. Construção',  icon: '🏗️', price: 500,  group: 'stone' },

    // --- Metalurgia ---
    // Os três minérios compartilham o upgrade de perfuratriz: é o mesmo gesto
    // físico, então não faz sentido exigir três melhorias distintas.
    ironOre:         { name: 'Minério de Ferro',       short: 'Min. Ferro',       icon: '⛏️', price: 40,   group: 'metal', manual: true, requires: 'metalPanel', holdUpgrade: 'pickaxeLevel' },
    copperOre:       { name: 'Minério de Cobre',       short: 'Min. Cobre',       icon: '🟠', price: 35,   group: 'metal', manual: true, requires: 'metalPanel', holdUpgrade: 'pickaxeLevel' },
    tinOre:          { name: 'Minério de Estanho',     short: 'Min. Estanho',     icon: '⚪', price: 30,   group: 'metal', manual: true, requires: 'metalPanel', holdUpgrade: 'pickaxeLevel' },
    coal:            { name: 'Carvão',                 short: 'Carvão',           icon: '⬛', price: 25,   group: 'metal', requires: 'metalPanel' },
    ironIngot:       { name: 'Lingote de Ferro',       short: 'Ling. Ferro',      icon: '🔩', price: 300,  group: 'metal', requires: 'metalPanel' },
    copperIngot:     { name: 'Lingote de Cobre',       short: 'Ling. Cobre',      icon: '🟫', price: 260,  group: 'metal', requires: 'metalPanel' },
    tinIngot:        { name: 'Lingote de Estanho',     short: 'Ling. Estanho',    icon: '⬜', price: 220,  group: 'metal', requires: 'metalPanel' },
    steel:           { name: 'Aço',                    short: 'Aço',              icon: '🥈', price: 2500, group: 'metal', requires: 'metalPanel' },
    bronze:          { name: 'Bronze',                 short: 'Bronze',           icon: '🥉', price: 1800, group: 'metal', requires: 'metalPanel' }
};

// Ordem das chaves É a ordem de processamento em update() — NÃO reordenar sem
// pensar: hoje `builder` roda antes de `refinery`/`carpentry`, e inverter isso
// deixa a Construtora consumir tábuas produzidas no mesmo tick.
// inputs: [] = gerador (não consome insumo).
const BUILDINGS = {
    woodcutter: {
        name: 'Acampamento de Lenhadores', icon: '🪓', group: 'wood',
        desc: 'Gera 1 Madeira automaticamente.',
        baseCost: 150, baseTime: 2, autoCollectCost: 1500,
        inputs: [], output: 'wood', trackStat: 'totalWoodChopped'
    },
    stoneMiner: {
        name: 'Poço da Pedreira', icon: '⛏️', group: 'stone', requires: 'stonePanel',
        desc: 'Gera 1 Pedra automaticamente.',
        baseCost: 5000, baseTime: 3, autoCollectCost: 30000,
        inputs: [], output: 'stone'
    },
    stoneKiln: {
        name: 'Forno de Pedra', icon: '🔥', group: 'stone', requires: 'stonePanel',
        desc: 'Converte 1 Pedra em 1 Bloco de Pedra.',
        baseCost: 10000, baseTime: 8, autoCollectCost: 75000,
        inputs: [{ id: 'stone', qty: 1 }], output: 'stoneBlock'
    },
    builder: {
        name: 'Construtora Civil', icon: '🏗️', group: 'stone', requires: 'stonePanel',
        desc: 'Consome 1 Tábua e 1 Bloco de Pedra = 1 Mat. de Construção.',
        baseCost: 50000, baseTime: 15, autoCollectCost: 200000,
        inputs: [{ id: 'board', qty: 1 }, { id: 'stoneBlock', qty: 1 }], output: 'constructionMat'
    },
    refinery: {
        name: 'Refinaria de Madeira', icon: '🪚', group: 'wood',
        desc: 'Converte 1 Madeira em 1 Tábua.',
        baseCost: 10, baseTime: 5, autoCollectCost: 3000,
        inputs: [{ id: 'wood', qty: 1 }], output: 'board',
        speedUpgrades: [{ id: 'sharpSaws', mult: 1.1 }]
    },
    carpentry: {
        name: 'Fábrica de Carpintaria', icon: '🪑', group: 'wood',
        desc: 'Converte 1 Tábua em 1 Móvel.',
        baseCost: 50, baseTime: 10, autoCollectCost: 10000,
        inputs: [{ id: 'board', qty: 1 }], output: 'furniture'
    },

    // --- Metalurgia ---
    // Mesma ordem: geradores e fundições (produtores) antes das usinas
    // (consumidoras), para que o consumo veja a produção do mesmo tick.
    coalMine: {
        name: 'Poço de Carvão', icon: '⬛', group: 'metal', requires: 'metalPanel',
        desc: 'Gera 1 Carvão automaticamente.',
        baseCost: 8000, baseTime: 4, autoCollectCost: 60000,
        inputs: [], output: 'coal'
    },
    ironMine: {
        name: 'Mina de Ferro', icon: '⛏️', group: 'metal', requires: 'metalPanel',
        desc: 'Gera 1 Minério de Ferro automaticamente.',
        baseCost: 12000, baseTime: 4, autoCollectCost: 90000,
        inputs: [], output: 'ironOre'
    },
    copperMine: {
        name: 'Mina de Cobre', icon: '🟠', group: 'metal', requires: 'metalPanel',
        desc: 'Gera 1 Minério de Cobre automaticamente.',
        baseCost: 10000, baseTime: 4, autoCollectCost: 80000,
        inputs: [], output: 'copperOre'
    },
    tinMine: {
        name: 'Mina de Estanho', icon: '⚪', group: 'metal', requires: 'metalPanel',
        desc: 'Gera 1 Minério de Estanho automaticamente.',
        baseCost: 9000, baseTime: 5, autoCollectCost: 75000,
        inputs: [], output: 'tinOre'
    },
    ironSmelter: {
        name: 'Fundição de Ferro', icon: '🔥', group: 'metal', requires: 'metalPanel',
        desc: 'Converte 1 Minério de Ferro em 1 Lingote de Ferro.',
        baseCost: 25000, baseTime: 6, autoCollectCost: 150000,
        inputs: [{ id: 'ironOre', qty: 1 }], output: 'ironIngot'
    },
    copperSmelter: {
        name: 'Fundição de Cobre', icon: '🟠', group: 'metal', requires: 'metalPanel',
        desc: 'Converte 1 Minério de Cobre em 1 Lingote de Cobre.',
        baseCost: 20000, baseTime: 6, autoCollectCost: 130000,
        inputs: [{ id: 'copperOre', qty: 1 }], output: 'copperIngot'
    },
    tinSmelter: {
        name: 'Fundição de Estanho', icon: '⚪', group: 'metal', requires: 'metalPanel',
        desc: 'Converte 1 Minério de Estanho em 1 Lingote de Estanho.',
        baseCost: 18000, baseTime: 6, autoCollectCost: 120000,
        inputs: [{ id: 'tinOre', qty: 1 }], output: 'tinIngot'
    },
    steelMill: {
        name: 'Siderúrgica', icon: '⚫', group: 'metal', requires: 'metalPanel',
        desc: 'Consome 1 Lingote de Ferro e 1 Carvão = 1 Aço.',
        baseCost: 200000, baseTime: 20, autoCollectCost: 900000,
        inputs: [{ id: 'ironIngot', qty: 1 }, { id: 'coal', qty: 1 }], output: 'steel'
    },
    bronzeWorks: {
        name: 'Liga de Bronze', icon: '🥉', group: 'metal', requires: 'metalPanel',
        desc: 'Consome 1 Lingote de Cobre e 1 de Estanho = 1 Bronze.',
        baseCost: 150000, baseTime: 18, autoCollectCost: 700000,
        inputs: [{ id: 'copperIngot', qty: 1 }, { id: 'tinIngot', qty: 1 }], output: 'bronze'
    }
};

// Multiplicador de produção concedido por cada conquista desbloqueada.
const ACHIEVEMENT_BONUS = 0.02;

// Total acumulado coletado de um recurso. Guarda os sub-objetos porque um save
// de versão futura (ou um state montado à mão) pode não ter todos eles.
function coletado(s, id) {
    return s.stats?.totalCollected?.[id] || 0;
}

function fadado(s) {
    return Object.values(s.stats?.totalEarned || {}).reduce((a, b) => a + b, 0);
}

// `check` recebe o state e devolve bool. Adicionar uma conquista = adicionar
// uma entrada nesta lista; nenhuma mudança de lógica é necessária.
const ACHIEVEMENTS = [
    {
        id: 'ach_wood_1',
        name: 'Primeira Lenha',
        icon: '🪵',
        desc: 'Colete sua primeira Madeira Bruta',
        check: (s) => coletado(s, 'wood') >= 1
    },
    {
        id: 'ach_wood_100',
        name: 'Lenhador Dedicado',
        icon: '🪓',
        desc: 'Colete 100 Madeiras no total',
        check: (s) => coletado(s, 'wood') >= 100
    },
    {
        id: 'ach_wood_5000',
        name: 'Mestre dos Bosques',
        icon: '🌲',
        desc: 'Colete 5.000 Madeiras no total',
        check: (s) => coletado(s, 'wood') >= 5000
    },
    {
        id: 'ach_chainsaw_1',
        name: 'Motor a Dois Tempos',
        icon: '⛽',
        desc: 'Compre sua primeira Motosserra',
        check: (s) => s.upgrades.chainsawLevel >= 1
    },
    {
        id: 'ach_woodcutter_10',
        name: 'Frota de Lenhadores',
        icon: '🏕️',
        desc: 'Tenha 10 Acampamentos de Lenhadores',
        check: (s) => (s.buildings?.woodcutter?.count || 0) >= 10
    },
    {
        id: 'ach_furniture_1',
        name: 'Primeiro Mobiliário',
        icon: '🪑',
        desc: 'Produza seu primeiro Móvel',
        check: (s) => coletado(s, 'furniture') >= 1
    },
    {
        id: 'ach_furniture_500',
        name: 'Marcenaria Estabelecida',
        icon: '🪚',
        desc: 'Produza 500 Móveis no total',
        check: (s) => coletado(s, 'furniture') >= 500
    },
    {
        id: 'ach_stone_unlock',
        name: 'Olho na Montanha',
        icon: '⛰️',
        desc: 'Desbloqueie a Pedreira',
        check: (s) => s.unlocks.stonePanel
    },
    {
        id: 'ach_stoneblock_1000',
        name: 'Alvenaria',
        icon: '🧱',
        desc: 'Produza 1.000 Blocos de Pedra',
        check: (s) => coletado(s, 'stoneBlock') >= 1000
    },
    {
        id: 'ach_builder_10',
        name: 'Construtora Estabelecida',
        icon: '🏗️',
        desc: 'Tenha 10 Construtoras Civis',
        check: (s) => (s.buildings?.builder?.count || 0) >= 10
    },
    {
        id: 'ach_mat_100',
        name: 'Material Certificado',
        icon: '📐',
        desc: 'Produza 100 Materiais de Construção',
        check: (s) => coletado(s, 'constructionMat') >= 100
    },
    {
        id: 'ach_earn_100k',
        name: 'Empreendedor',
        icon: '💼',
        desc: 'Fature R$ 100.000 no total',
        check: (s) => fadado(s) >= 100000
    },
    {
        id: 'ach_earn_1m',
        name: 'Magnata',
        icon: '💰',
        desc: 'Fature R$ 1.000.000 no total',
        check: (s) => fadado(s) >= 1000000
    }
];
