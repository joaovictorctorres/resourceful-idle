// Definições de conteúdo do jogo. Fonte única de verdade — o motor, a UI e a
// árvore de pesquisa leem daqui em vez de repetir dados em markup.

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
