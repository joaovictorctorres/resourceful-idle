// Suíte de lógica sem dependências. Carrega o jogo com stubs mínimos de
// localStorage e roda asserts — sem browser, sem framework, sem build step.
//
//   node tests/headless.test.js
//
// ponytail: cobre só a lógica (offline, save, migração, NaN de preço). A UI é QA
// manual no navegador. Ampliar para testes de DOM exigiria um build step.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SAVE_KEY = 'idleGameSave';

let passed = 0;
const failures = [];

function check(name, fn) {
    try {
        fn();
        passed++;
    } catch (e) {
        failures.push({ name, error: e.message });
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'assertion failed');
}

function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
        throw new Error(`${msg || 'values differ'}: esperado ${expected}, obtido ${actual}`);
    }
}

// Carrega data.js + game.js num contexto novo, com localStorage mockado. Devolve o
// contexto para que cada teste parta de um jogo limpo. Passando `store`, o teste
// compartilha o localStorage com outro makeGame — para testar persistência.
function makeGame(savedState, store) {
    store = store || {};
    if (savedState) store[SAVE_KEY] = JSON.stringify(savedState);

    const sandbox = {
        localStorage: {
            getItem: (k) => (k in store ? store[k] : null),
            setItem: (k, v) => { store[k] = String(v); },
            removeItem: (k) => { delete store[k]; }
        },
        console,
        Date: { now: () => Date.now() },
        Math
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;

    vm.createContext(sandbox);
    // `class` e `const` criam bindings no escopo léxico global, que não viram
    // propriedades de globalThis — precisam ser exportados explicitamente.
    const dataSrc = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
    const gameSrc = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
    vm.runInContext(
        dataSrc + '\n' + gameSrc +
        '\nglobalThis.IdleGame = IdleGame; globalThis.ACHIEVEMENTS = ACHIEVEMENTS;' +
        ' globalThis.ACHIEVEMENT_BONUS = ACHIEVEMENT_BONUS;' +
        ' globalThis.RESOURCES = RESOURCES; globalThis.BUILDINGS = BUILDINGS;' +
        ' globalThis.GROUPS = GROUPS;',
        sandbox
    );

    const game = new sandbox.IdleGame();
    if (savedState || store[SAVE_KEY]) game.load();
    return {
        game, store, sandbox,
        ACHIEVEMENTS: sandbox.ACHIEVEMENTS, ACHIEVEMENT_BONUS: sandbox.ACHIEVEMENT_BONUS,
        RESOURCES: sandbox.RESOURCES, BUILDINGS: sandbox.BUILDINGS, GROUPS: sandbox.GROUPS
    };
}

// ---------------------------------------------------------------- save / load

check('save() carimba state.lastSaveTimestamp', () => {
    const { game } = makeGame();
    assertEqual(game.state.lastSaveTimestamp, 0, 'default');
    game.save();
    assert(game.state.lastSaveTimestamp > 0, 'timestamp devia ser carimbado por save()');
});

check('getDefaultState() devolve objeto novo a cada chamada', () => {
    // load() chama getDefaultState() 11x. Se passasse a devolver um singleton
    // compartilhado, um Object.assign mutado vazaria para as chamadas seguintes.
    const { game } = makeGame();
    const a = game.getDefaultState();
    const b = game.getDefaultState();
    assert(a !== b, 'mesma referência entre chamadas');
    a.money = 999;
    assertEqual(b.money, 0, 'mutação vazou para a outra chamada');
});

// ------------------------------------------------------------------- offline

check('catch-up bate com a fórmula fechada (240s, 1 lenhador)', () => {
    const { game } = makeGame();
    game.state.buildings.woodcutter.count = 1;
    game.state.lastSaveTimestamp = Date.now() - 240 * 1000;

    const report = game.applyOfflineProgress();

    // Sem autoCollect o lenhador guarda no próprio estoque, não no inventário —
    // e não conta como coletado (totalCollected é medido na coleta, em game.js).
    // 1 lenhador / 2s = 0.5/s * 240s = 120
    assertEqual(game.state.buildings.woodcutter.storedOutput, 120, 'estoque do gerador');
    assertEqual(game.state.inventory.wood, 0, 'inventário intocado');
    // O catch-up também não credita estatísticas: o jogador ganha os recursos,
    // mas as conquistas continuam valendo só pelo que ele jogou.
    assertEqual(game.state.stats.totalWoodChopped, 0, 'stat de lenha não é creditado offline');
    assertEqual(report.gained.wood, undefined, 'nada foi para o inventário');
});

check('catch-up com autoCollect põe no inventário', () => {
    const { game } = makeGame();
    game.state.buildings.woodcutter.count = 1;
    game.state.buildings.woodcutter.autoCollect = true;
    game.state.lastSaveTimestamp = Date.now() - 240 * 1000;

    const report = game.applyOfflineProgress();

    //(update() interno libera conquistas, o que dá +2% no meio da simulação;
    // o drift é de poucos itens e é comportamento correto, não bug)
    assert(Math.abs(game.state.inventory.wood - 120) <= 3, `inventário: ${game.state.inventory.wood}`);
    assert(Math.abs(report.gained.wood - 120) <= 3, `reportado no modal: ${report.gained.wood}`);
});

check('catch-up sem lastSaveTimestamp não paga nada (save antigo)', () => {
    // Save da v1.2.0 não tem o campo. Sem este guard, elapsed = 1.7e9s, clampado
    // a 8h — todo jogador existente ganharia 8h grátis no primeiro load.
    const { game } = makeGame();
    game.state.buildings.woodcutter.count = 1;
    assertEqual(game.state.lastSaveTimestamp, 0, 'premissa');

    const report = game.applyOfflineProgress();
    assertEqual(report, null, 'esperava null');
    assertEqual(game.state.inventory.wood, 0, 'nada foi produzido');
});

check('ausência negativa (relógio alterado) não paga nem quebra', () => {
    const { game } = makeGame();
    game.state.buildings.woodcutter.count = 1;
    game.state.lastSaveTimestamp = Date.now() + 60 * 1000; // futuro

    assertEqual(game.applyOfflineProgress(), null, 'esperava null');
    assertEqual(game.state.inventory.wood, 0, 'nada foi produzido');
});

check('teto de 8h: 30 dias fora rendem 8h, não 30 dias', () => {
    const { game } = makeGame();
    game.state.buildings.woodcutter.count = 1;
    game.state.buildings.woodcutter.autoCollect = true;
    game.state.lastSaveTimestamp = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const report = game.applyOfflineProgress();
    assert(report.wasCapped, 'deveria reportar capado');
    assertEqual(report.capped, 8 * 60 * 60, 'teto');
    // 0.5/s * 28800s = 14400, com pequena folga pelo bônus das conquistas
    assert(Math.abs(report.gained.wood - 14400) <= 900, `produção capada: ${report.gained.wood}`);
    assert(report.gained.wood < 14400 * 1.1, 'não pode estourar bem além do teto');
});

check('n de passos não super-produz em ausências curtas', () => {
    // Regressão do `for (i < 240)` com chunk fixo: 241s pagariam 480s (+99%).
    const { game } = makeGame();
    game.state.buildings.woodcutter.count = 1;
    game.state.buildings.woodcutter.autoCollect = true;
    game.state.lastSaveTimestamp = Date.now() - 241 * 1000;

    const report = game.applyOfflineProgress();
    // 0.5/s * 241s = 120.5 → 120 itens. A folga cobre o bônus de conquistas que
    // o update interno concede durante a simulação; o que não pode é o bug do
    // loop de tamanho fixo, que pagaria 480s de produção (+99%).
    assert(report.gained.wood <= 125, `super-produziu: ${report.gained.wood}`);
});

check('cadeia produtor→consumidor: refinaria convertendo ao longo do tempo', () => {
    // lenhador entrega madeira direto ao inventário (autoCollect) para a
    // refinaria consumir; refinaria guarda tábua no próprio estoque.
    const { game } = makeGame();
    game.state.buildings.woodcutter.count = 1;   // 0.5 madeira/s
    game.state.buildings.woodcutter.autoCollect = true;
    game.state.buildings.refinery.count = 1;     // 0.2 tábua/s, consome 1 madeira
    game.state.lastSaveTimestamp = Date.now() - 100 * 1000;

    game.applyOfflineProgress();

    // Refinaria é mais lenta que o lenhador, então nunca deve faltar madeira.
    assert(game.state.buildings.refinery.storedOutput > 0, 'deveria ter convertido madeira');
    assert(game.state.inventory.wood >= 0, 'estoque de madeira não pode ficar negativo');
    assert(game.state.buildings.refinery.storedOutput <= 20, 'acima do máximo de 0.2/s * 100s');
});

check('refinaria sem madeira não converte nada', () => {
    const { game } = makeGame();
    game.state.buildings.refinery.count = 1;
    game.state.lastSaveTimestamp = Date.now() - 3600 * 1000;

    game.applyOfflineProgress();
    assertEqual(game.state.buildings.refinery.storedOutput, 0, 'sem insumo, sem produto');
    assertEqual(game.state.inventory.wood, 0, 'não consome o que não tem');
});

check('processador sem insumo não produz offline', () => {
    const { game } = makeGame();
    game.state.buildings.refinery.count = 1;
    game.state.lastSaveTimestamp = Date.now() - 3600 * 1000;

    const report = game.applyOfflineProgress();
    assertEqual(game.state.inventory.board, 0, 'sem madeira, sem tábuas');
    assertEqual(report.gained.board, undefined, 'nada a reportar');
});

check('auto-sell offline roda a cada 10s, não uma vez por chunk', () => {
    // Regressão do `if` no timer: com dt de ~15s, um `if` paga 1 ciclo por chunk
    // em vez de 1 a cada 10s — 1h passaria a render ~8% da renda real.
    const { game } = makeGame();
    game.state.unlocks.smartSell = true;
    game.state.buildings.woodcutter.count = 1;
    game.state.buildings.woodcutter.autoCollect = true;
    game.state.autoSell.wood = true;
    game.state.lastSaveTimestamp = Date.now() - 3600 * 1000;

    const report = game.applyOfflineProgress();
    // 1 lenhador gera ~1800 madeira/hora; a 1 por venda = ~1800. Se o `if`
    // pagasse 1 vez por chunk (~4 chunks), viria ~4.
    assert(report.moneyGained > 1000, `auto-sell pagou pouco demais: ${report.moneyGained}`);
    // Restam só os itens produzidos nos últimos <10s, que ainda não fecharam ciclo.
    assert(game.state.inventory.wood < 10, `sobrou estoque demais: ${game.state.inventory.wood}`);
    // Sem stats creditadas, o dinheiro vendido offline também não é fadado.
    assertEqual(game.state.stats.totalEarned.wood, undefined, 'faturamento offline não conta para conquistas');
});

// ------------------------------------------------------------------ migração

check('save da v1.2.0 carrega sem throw e sem NaN', () => {
    const oldSave = {
        money: 5000,
        inventory: { wood: 10, board: 2, furniture: 0, stone: 0, stoneBlock: 0, constructionMat: 0 },
        autoSell: { wood: false, board: false, furniture: false, stone: false, stoneBlock: false, constructionMat: false },
        settings: { runInBackground: true },
        stats: { totalWoodChopped: 120, manualClicks: 150, totalCollected: { wood: 200 }, totalEarned: { wood: 200 } },
        buildings: { woodcutter: { count: 3, storedOutput: 5 } },
        upgrades: { sharpSaws: true, chainsawLevel: 1, jackhammerLevel: 0 },
        unlocks: { upgradesPanel: true, continuousClick: true, stonePanel: false, smartSell: true }
        // note: sem lastSaveTimestamp — é exatamente o caso que não pode dar 8h grátis
    };
    const { game } = makeGame(oldSave);

    assertEqual(game.state.money, 5000, 'dinheiro');
    assertEqual(game.state.buildings.woodcutter.count, 3, 'lenhadores');
    assertEqual(game.state.buildings.woodcutter.storedOutput, 5, 'estoque estocado');
    assertEqual(game.state.settings.runInBackground, true, 'setting');
    assertEqual(game.state.upgrades.sharpSaws, true, 'upgrade');
    assertEqual(game.state.lastSaveTimestamp, 0, 'campo novo tem default');
    assertEqual(game.state.buildings.refinery.count, 0, 'prédio ausente no save recebe default');

    // Nenhum NaN em lugar nenhum.
    assert(!Number.isNaN(game.state.money), 'money virou NaN');
    JSON.stringify(game.state); // lança se houver ciclo/NaN invisível
});

check('save corrompido não derruba o jogo', () => {
    const sandbox = (() => {
        const store = { [SAVE_KEY]: '{nao é json' };
        const sb = {
            localStorage: {
                getItem: (k) => (k in store ? store[k] : null),
                setItem: (k, v) => { store[k] = String(v); }
            },
            console: { error: () => {} },
            Date: { now: () => Date.now() }, Math
        };
        sb.window = sb; sb.globalThis = sb;
        vm.createContext(sb);
        const dataSrc = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
        const src = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
        vm.runInContext(dataSrc + '\n' + src + '\nglobalThis.IdleGame = IdleGame;', sb);
        return sb;
    })();
    const game = new sandbox.IdleGame();
    game.load();
    assertEqual(game.state.money, 0, 'deve cair no estado default');
});

// ------------------------------------------------------------------ economia

check('sell() com id desconhecido não transforma money em NaN', () => {
    const { game } = makeGame();
    game.state.money = 100;
    game.sell('naoExiste');
    assertEqual(game.state.money, 100, 'money deve ficar intocado');
    assert(!Number.isNaN(game.state.money), 'money virou NaN');
});

check('sell() não gera dinheiro negativo ao vender item sem preço', () => {
    const { game } = makeGame();
    game.state.inventory.wood = 5;
    game.sell('wood');
    assertEqual(game.state.money, 5, '5 madeira a R$ 1');
});

check('getBuildingCost escala 1.15^n', () => {
    const { game } = makeGame();
    game.state.buildings.woodcutter.count = 3;
    // Math.pow puro, sem arredondar: o custo real é fracionário e formatMoney
    // arredonda só na exibição.
    assertEqual(game.getBuildingCost('woodcutter'), 150 * Math.pow(1.15, 3));
});

check('campo morto lastSaveTime foi removido da instância', () => {
    const { game } = makeGame();
    assert(!('lastSaveTime' in game), 'campo de instância morto ainda presente');
});

// ---------------------------------------------------------------- conquistas

check('conquistas desbloqueiam por condição de stat', () => {
    const { game, ACHIEVEMENTS } = makeGame();
    assertEqual(Object.keys(game.state.achievements).length, 0, 'nenhuma no início');

    game.state.stats.totalCollected.wood = 100;
    const unlocked = game.checkAchievements();

    const ids = unlocked.map(a => a.id);
    assert(ids.includes('ach_wood_1'), 'deveria liberar a de 1 madeira');
    assert(ids.includes('ach_wood_100'), 'deveria liberar a de 100 madeiras');
    assert(!ids.includes('ach_wood_5000'), 'não deveria liberar a de 5000');
    assertEqual(unlocked.length, 2, 'exatamente 2');
});

check('conquista desbloqueada não volta a desbloquear', () => {
    const { game } = makeGame();
    game.state.stats.totalCollected.wood = 1;
    assertEqual(game.checkAchievements().length, 1, 'primeira vez');
    assertEqual(game.checkAchievements().length, 0, 'segunda vez não repete');
    assertEqual(game.checkAchievements().length, 0, 'terceira vez não repete');
});

check('bônus é proporcional e some quando não há conquista', () => {
    const { game, ACHIEVEMENT_BONUS } = makeGame();
    assertEqual(game.getAchievementBonus(), 0, 'sem conquista, sem bônus');

    game.state.stats.totalCollected.wood = 1;
    game.checkAchievements();
    assertEqual(game.getAchievementBonus(), ACHIEVEMENT_BONUS, '1 conquista');

    game.state.stats.totalCollected.wood = 5000;
    game.checkAchievements();
    assertEqual(game.getAchievementBonus(), ACHIEVEMENT_BONUS * 3, '3 conquistas');
});

check('bônus acelera a produção de todo prédio', () => {
    const { game } = makeGame();
    game.state.buildings.woodcutter.count = 1;
    const base = game.getBuildingSpeed('woodcutter');

    game.state.achievements.ach_wood_1 = Date.now();
    const buffed = game.getBuildingSpeed('woodcutter');

    assert(buffed > base, `bônus não acelerou: ${base} → ${buffed}`);
    assertEqual(buffed, base * 1.02, 'deveria ser exatamente +2%');
});

check('bônus também vale para a Siderúrgica (metalurgia futura)', () => {
    const { game } = makeGame();
    // Simula um prédio com inputs, já que o bônus é global por construção
    game.state.buildings.carpentry.count = 1;
    const base = game.getBuildingSpeed('carpentry');
    game.state.achievements.ach_wood_1 = Date.now();
    assert(game.getBuildingSpeed('carpentry') > base, 'processadores também devem ser afetados');
});

check('conquistas persistem entre sessões', () => {
    const store = {};
    const first = makeGame(null, store);
    first.game.state.stats.totalCollected.wood = 100;
    first.game.checkAchievements();
    first.game.save();

    // Mesmo localStorage = mesma "sessão do navegador", como um F5 faria.
    const reopened = makeGame(null, store);
    assertEqual(Object.keys(reopened.game.state.achievements).length, 2, 'após recarregar');
    assert(reopened.game.state.achievements.ach_wood_1 > 0, 'timestamp preservado');
});

check('conquistas são checadas 1x/s, não a cada frame', () => {
    const { game } = makeGame();
    game.state.stats.totalCollected.wood = 1;
    let bonus = game.getAchievementBonus();

    // 0.5s de simulação: ainda não passou no limiar
    game.update(0.5);
    assertEqual(game.getAchievementBonus(), bonus, 'não pode checar antes de 1s');

    game.update(0.6); // soma 1.1s
    assert(game.getAchievementBonus() > bonus, 'deveria ter checado após 1s');
});

check('checkAchievements não simula tempo do rAF', () => {
    // Regressão: checkAchievements() chamava this.update(true), fazendo o loop
    // receber dt=true (=1s) e dar um salto de tempo a cada conquista.
    const { game } = makeGame();
    const real = game.update;
    game.update = () => { throw new Error('update() chamado a partir de conquista'); };
    game.state.stats.totalCollected.wood = 1;
    game.checkAchievements();
    game.update = real;
    assert(game.state.achievements.ach_wood_1, 'conquista deveria ter sido registrada');
});

check('conquistas não dependem do loop de update', () => {
    // Compras e cliques de UI acontecem fora do update; o painel de conquistas
    // precisa refletir o estado real, não só o que o loop viu.
    const { game } = makeGame();
    game.state.buildings.woodcutter.count = 10;
    game.checkAchievements();
    assert(game.state.achievements.ach_woodcutter_10, 'deveria ver a frota de lenhadores');
});

check('nenhuma conquista lança exceção em estado vazio', () => {
    const { game, ACHIEVEMENTS } = makeGame();
    // stats sub-objects nunca são undefined no default, mas o custo de uma guarda
    // aqui é zero e protege contra save de versão futura com campo faltando.
    game.state.stats = { totalWoodChopped: 0, manualClicks: 0 };
    for (const a of ACHIEVEMENTS) {
        assert(typeof a.check(game.state) === 'boolean',
            `check de ${a.id} não devolveu boolean`);
    }
});

check('conquistas não explodem com produção offline', () => {
    // 8h offline com 50 lenhadores geram ~720.000 de madeira. Se os limiares
    // fossem contados sobre produção acelerada, o jogador voltaria com o bônus
    // máximo sem nunca ter jogado. O behaviour desejado é limpar o que foi
    // gerado offline e checar só contra o que ele realmente fez.
    const { game } = makeGame();
    game.state.buildings.woodcutter.count = 50;
    game.state.buildings.woodcutter.autoCollect = true;
    game.state.lastSaveTimestamp = Date.now() - 8 * 60 * 60 * 1000;

    game.applyOfflineProgress();
    const earnedByPlaying = Object.keys(game.state.achievements || {}).length;

    game.checkAchievements();

    assertEqual(earnedByPlaying, 0,
        'conquistas não devem ser conquistadas por produção offline');
});

check('conquista por tempo de jogo sobrevive a save antigo', () => {
    // save da v1.2.0 não tem o campo achievements; o merge precisa criar {}.
    const store = { [SAVE_KEY]: JSON.stringify({
        money: 1000,
        inventory: { wood: 5 },
        unlocks: { upgradesPanel: true },
        stats: { totalWoodChopped: 10, manualClicks: 20, totalCollected: { wood: 50 }, totalEarned: {} }
    }) };
    const { game } = makeGame(null, store);
    assertEqual(game.state.achievements && typeof game.state.achievements, 'object', 'campo criado');
    const unlocked = game.checkAchievements();
    assert(unlocked.length > 0, 'deveria conseguir desbloquear as do save antigo');
});

check('dados das conquistas são consistentes', () => {
    const { ACHIEVEMENTS } = makeGame();
    const seen = new Set();
    for (const a of ACHIEVEMENTS) {
        assert(a.id && a.name && a.desc && a.icon, `conquista incompleta: ${JSON.stringify(a)}`);
        assert(!seen.has(a.id), `id duplicado: ${a.id}`);
        seen.add(a.id);
    }
});

// ------------------------------------------------------- integridade de dados

check('dados de recursos e construções são consistentes', () => {
    const { RESOURCES, BUILDINGS, GROUPS } = makeGame();

    for (const id in RESOURCES) {
        const r = RESOURCES[id];
        assert(r.name && r.short && r.icon, `recurso incompleto: ${id}`);
        assert(r.price > 0, `preço inválido em ${id}: ${r.price}`);
        assert(GROUPS[r.group], `grupo inexistente: ${r.group}`);
    }

    for (const id in BUILDINGS) {
        const b = BUILDINGS[id];
        assert(b.name && b.icon, `prédio incompleto: ${id}`);
        assert(GROUPS[b.group], `grupo inexistente: ${id} -> ${b.group}`);
        assert(RESOURCES[b.output], `saída inexistente: ${id} -> ${b.output}`);
        for (const i of b.inputs) {
            assert(RESOURCES[i.id], `insumo inexistente: ${id} -> ${i.id}`);
            assert(i.qty > 0, `qty inválido: ${id} -> ${i.id} = ${i.qty}`);
        }
        assert(b.baseCost > 0, `baseCost inválido: ${id}`);
        assert(b.baseTime > 0, `baseTime inválido: ${id}`);
        assert(b.autoCollectCost > 0, `autoCollectCost inválido: ${id}`);
        // Um prédio não consome a si mesmo.
        assert(!b.inputs.some(i => i.id === b.output), `${id} consome a própria saída`);
    }
});

check('ordem de processamento dos prédios está preservada', () => {
    // Regressão: a ordem natural de declaração (madeira, depois pedra) colocaria
    // `builder` depois de refinery/carpentry, deixando a Construtora consumir
    // tábuas produzidas no mesmo tick. As tolerâncias dos testes de offline
    // absorvem esse drift e não pegariam.
    const { BUILDINGS } = makeGame();
    const order = Object.keys(BUILDINGS);
    assertEqual(order[0], 'woodcutter', 'gerador de madeira roda primeiro');
    assert(order.indexOf('builder') < order.indexOf('refinery'),
        'builder precisa rodar antes de refinery');
    assert(order.indexOf('refinery') < order.indexOf('carpentry'),
        'refinery antes de carpentry (tábua antes de móvel)');
});

check('grafo de produção é acíclico', () => {
    // A árvore visual da Fase 4 depende disto; um ciclo travaria o jogo.
    // O ciclo é entre PRÉDIOS: B depende de A se B consome um recurso que A
    // produz. Duas Fundições que se alimentassem mutuamente travariam aqui.
    const { BUILDINGS } = makeGame();

    const producers = {};   // resource -> [buildingId]
    for (const id in BUILDINGS) {
        (producers[BUILDINGS[id].output] = producers[BUILDINGS[id].output] || []).push(id);
    }

    const visiting = new Set();
    const done = new Set();

    const walk = (id) => {
        assert(!visiting.has(id), `ciclo de produção em ${id}`);
        if (done.has(id)) return;
        visiting.add(id);
        for (const input of BUILDINGS[id].inputs) {
            for (const p of producers[input.id] || []) walk(p);
        }
        visiting.delete(id);
        done.add(id);
    };

    for (const id in BUILDINGS) walk(id);
});

check('getDefaultState() é derivado das tabelas de dados', () => {
    const { game, RESOURCES, BUILDINGS } = makeGame();
    const s = game.getDefaultState();
    assert(JSON.stringify(Object.keys(s.inventory)) === JSON.stringify(Object.keys(RESOURCES)),
        'inventory não bate com RESOURCES');
    assert(JSON.stringify(Object.keys(s.autoSell)) === JSON.stringify(Object.keys(RESOURCES)),
        'autoSell não bate com RESOURCES');
    assert(JSON.stringify(Object.keys(s.buildings)) === JSON.stringify(Object.keys(BUILDINGS)),
        'buildings não bate com BUILDINGS');
});

check('todo prédio tem custo e velocidade finitos', () => {
    // baseTime/baseCost saíram do state e passaram a vir de BUILDINGS. Um único
    // ponto de leitura esquecido daria NaN — que a UI exibiria como "NaNs / ciclo"
    // e pararia a produção em silêncio, com todos os outros asserts passando.
    const { game, BUILDINGS } = makeGame();
    for (const id in BUILDINGS) {
        for (const n of [0, 1, 3, 20]) {
            game.state.buildings[id].count = n;
            const c = game.getBuildingCost(id);
            const s = game.getBuildingSpeed(id);
            assert(Number.isFinite(c) && c > 0, `custo de ${id}@${n}: ${c}`);
            assert(Number.isFinite(s) && s >= 0, `velocidade de ${id}@${n}: ${s}`);
        }
    }
});

check('sharpSaws acelera SÓ a refinaria, em exatamente 10%', () => {
    // A generalização de `id === 'refinery'` para iterar def.speedUpgrades tem uma
    // falha óbvia: `mult = u.mult` em vez de `*=`, ou não checar a lista do prédio.
    // Qualquer uma buffa todo processador em 10% sem nenhum teste reclamar.
    const { game } = makeGame();
    game.state.buildings.refinery.count = 1;
    game.state.buildings.carpentry.count = 1;

    const refBefore = game.getBuildingSpeed('refinery');
    const carpBefore = game.getBuildingSpeed('carpentry');
    game.state.upgrades.sharpSaws = true;

    assertEqual(game.getBuildingSpeed('refinery'), refBefore * 1.1, 'ganho da refinaria');
    assertEqual(game.getBuildingSpeed('carpentry'), carpBefore, 'carpintaria não pode mudar');
});

check('save antigo não sombreia a configuração de custo', () => {
    // Com {...default, ...save}, um save carregando baseCost: 999999 continuaria
    // valendo para sempre, ignorando qualquer ajuste futuro na tabela.
    const store = { [SAVE_KEY]: JSON.stringify({
        money: 0,
        buildings: { refinery: { count: 2, baseCost: 999999, baseTime: 999, autoCollectCost: 1 } }
    }) };
    const { game } = makeGame(null, store);
    assertEqual(game.state.buildings.refinery.count, 2, 'campos mutáveis vem do save');
    assertEqual(game.getBuildingCost('refinery'), 10 * Math.pow(1.15, 2), 'custo vem de BUILDINGS');
    game.state.buildings.refinery.count = 1;
    assertEqual(game.getBuildingSpeed('refinery'), 1 / 5, 'velocidade vem de BUILDINGS');
});

check('estado de prédio tem só os 4 campos mutáveis', () => {
    const { game } = makeGame();
    const b = game.state.buildings.woodcutter;
    assert(JSON.stringify(Object.keys(b).sort()) ===
        JSON.stringify(['autoCollect', 'count', 'progress', 'storedOutput']),
        `campos inesperados: ${Object.keys(b)}`);
    assertEqual(b.outputItem, undefined, 'outputItem migrou para BUILDINGS');
    assertEqual(b.baseCost, undefined, 'baseCost migrou para BUILDINGS');
});

check('taxa por recurso soma os prédios que o produzem', () => {
    const { game } = makeGame();
    game.state.buildings.woodcutter.count = 1;  // 0.5/s
    assertEqual(game.getResourceRate('wood'), 0.5, 'só o lenhador produz madeira');

    game.state.buildings.refinery.count = 1;   // 0.2/s
    assertEqual(game.getResourceRate('board'), 0.2, 'tábuas vêm da refinaria');
    // A lenhadeira não produz tábuas, então a taxa de tábua não inclui madeira.
    assertEqual(game.getResourceRate('wood'), 0.5, 'madeira não muda com a refinaria');
});

check('taxa por.resource ignora prédio bloqueado', () => {
    const { game } = makeGame();
    game.state.buildings.stoneMiner.count = 1;
    assertEqual(game.isBuildingUnlocked('stoneMiner'), false, 'bloqueado sem stonePanel');
    assertEqual(game.getResourceRate('stone'), 0, 'não conta prédio bloqueado');

    game.state.unlocks.stonePanel = true;
    assertEqual(game.getResourceRate('stone'), 1 / 3, 'conta depois do unlock');
});

check('sellAll() vende tudo, com e sem unlock de pedra', () => {
    const { game, RESOURCES } = makeGame();
    game.state.inventory = { wood: 2, board: 1, furniture: 1, stone: 3, stoneBlock: 1, constructionMat: 1 };

    game.sellAll();

    let esperado = 0;
    for (const id in RESOURCES) esperado += game.state.inventory[id];
    assert(esperado === 0, 'inventário deveria estar zerado');
    // 2*1 + 1*5 + 1*25 + 3*10 + 1*50 + 1*500 = 612
    assertEqual(game.state.money, 612, 'total vendido');
});

check('sellAll() sem stonePanel vende o que houver', () => {
    // Regressão do gate antigo: com pedra no inventário e o painel bloqueado,
    // os itens ficavam presos. Sem o unlock não dá para obter pedra, mas o save
    // pode ter.
    const { game } = makeGame();
    assertEqual(game.state.unlocks.stonePanel, false, 'premissa: bloqueado');
    game.state.inventory.stone = 4;
    game.sellAll();
    assertEqual(game.state.inventory.stone, 0, 'pedra não pode ficar presa');
    assertEqual(game.state.money, 40, '4 pedras a R$ 10');
});

check('sell() usa o preço da tabela de dados', () => {
    const { game, RESOURCES } = makeGame();
    for (const id in RESOURCES) {
        game.state.money = 0;
        game.state.inventory[id] = 3;
        game.sell(id);
        assertEqual(game.state.money, 3 * RESOURCES[id].price, `preço de ${id}`);
    }
});

// ------------------------------------------------------------------- relatório

console.log(`\n  ${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
    for (const f of failures) {
        console.log(`  ✗ ${f.name}\n      ${f.error}`);
    }
    console.log('');
    process.exit(1);
}
