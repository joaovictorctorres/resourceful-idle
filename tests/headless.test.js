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

// Carrega game.js num contexto novo, com localStorage mockado. Devolve o contexto
// para que cada teste parta de um jogo limpo.
function makeGame(savedState) {
    const store = {};
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

    const src = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
    vm.createContext(sandbox);
    // `class` cria binding no escopo léxico global, que não vira propriedade de
    // globalThis — precisa ser exportado explicitamente.
    vm.runInContext(src + '\nglobalThis.IdleGame = IdleGame;', sandbox);

    const game = new sandbox.IdleGame();
    if (savedState) game.load();
    return { game, store, sandbox };
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
    assertEqual(game.state.stats.totalWoodChopped, 120, 'stat de lenha');
    assertEqual(report.gained.wood, undefined, 'nada foi para o inventário');
});

check('catch-up com autoCollect põe no inventário', () => {
    const { game } = makeGame();
    game.state.buildings.woodcutter.count = 1;
    game.state.buildings.woodcutter.autoCollect = true;
    game.state.lastSaveTimestamp = Date.now() - 240 * 1000;

    const report = game.applyOfflineProgress();

    assertEqual(game.state.inventory.wood, 120, 'inventário');
    assertEqual(report.gained.wood, 120, 'reportado no modal');
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
    // 0.5/s * 28800s = 14400
    assertEqual(report.gained.wood, 14400, 'produção capada');
});

check('n de passos não super-produz em ausências curtas', () => {
    // Regressão do `for (i < 240)` com chunk fixo: 241s pagariam 480s (+99%).
    const { game } = makeGame();
    game.state.buildings.woodcutter.count = 1;
    game.state.buildings.woodcutter.autoCollect = true;
    game.state.lastSaveTimestamp = Date.now() - 241 * 1000;

    const report = game.applyOfflineProgress();
    // 0.5/s * 241s = 120.5 → 120 itens
    assertEqual(report.gained.wood, 120, 'não pode passar de 121');
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
        const src = fs.readFileSync(path.join(ROOT, 'js', 'game.js'), 'utf8');
        vm.runInContext(src + '\nglobalThis.IdleGame = IdleGame;', sb);
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

// ------------------------------------------------------------------- relatório

console.log(`\n  ${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
    for (const f of failures) {
        console.log(`  ✗ ${f.name}\n      ${f.error}`);
    }
    console.log('');
    process.exit(1);
}
