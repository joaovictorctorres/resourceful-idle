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
const RESOURCES = {
    wood:            { name: 'Madeira Bruta',          short: 'Madeira',          icon: '🪵', price: 1,   group: 'wood' },
    board:           { name: 'Tábua',                  short: 'Tábuas',           icon: '🪚', price: 5,   group: 'wood' },
    furniture:       { name: 'Móvel',                  short: 'Móveis',           icon: '🪑', price: 25,  group: 'wood' },
    stone:           { name: 'Pedra Bruta',            short: 'Pedra',            icon: '🪨', price: 10,  group: 'stone' },
    stoneBlock:      { name: 'Bloco de Pedra',         short: 'Blocos de Pedra',  icon: '🧱', price: 50,  group: 'stone' },
    constructionMat: { name: 'Material de Construção', short: 'Mat. Construção',  icon: '🏗️', price: 500, group: 'stone' }
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
