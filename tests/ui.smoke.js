// Smoke test de UI: carrega o jogo num Chromium headless, joga de verdade
// (clica, compra, vende) e falha em qualquer erro de console ou elemento
// faltando. Complementa os asserts de lógica — que não têm DOM.
//
//   node tests/ui.smoke.js
//
// ponytail: verifica que a tela monta e que os cliques não explodem. Não
// verifica layout, cascata nem aparência — isso é olho humano no navegador.

const puppeteer = require('puppeteer');

const URL = 'http://localhost:8899/index.html';

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // O browser pede /favicon.ico por conta própria; o projeto não tem um, e o
    // 404 é ruído que esconderia um erro real. A mensagem do console não traz a
    // URL, então a checagem é feita no final, contra a lista de requests que
    // realmente falharam (o listener de console dispara antes do de response).
    const ignorable = url => /favicon\.ico/.test(url);
    const consoleErrors = [];
    const failedRequests = [];

    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
    page.on('requestfailed', r => failedRequests.push('request falhou: ' + r.url()));
    page.on('response', r => {
        if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`);
    });

    const errors = () => {
        const out = failedRequests.filter(u => !ignorable(u));
        // Erro de console que não seja o 404 genérico do browser.
        const real = consoleErrors.filter(t => !/Failed to load resource/.test(t));
        return [...out, ...real];
    };

    await page.goto(URL, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });

    const fails = [];
    const ok = (name, cond, detail) => {
        if (!cond) fails.push(`${name}${detail ? ' — ' + detail : ''}`);
    };

    // 1. Estrutura montada
    ok('barra de recursos renderizada',
        (await page.$$('.res-chip')).length === 6, `${(await page.$$('.res-chip')).length} chips`);
    ok('6 cards de prédio', (await page.$$('.building-card')).length === 6);
    ok('3 abas', (await page.$$('[data-tab]')).length === 3);
    ok('Vender Tudo na barra', (await page.$('.res-sell-all')) !== null);
    ok('aba de Melhorias escondida no início',
        await page.$eval('[data-tab="melhorias"]', el => el.classList.contains('hidden')));

    // 2. Cadeia: o lenhador aparece, os de pedra não
    ok('card do lenhador visível',
        await page.$eval('[data-building="woodcutter"]', el => !el.classList.contains('hidden')));
    ok('card do poço de pedra escondido',
        await page.$eval('[data-building="stoneMiner"]', el => el.classList.contains('hidden')));

    // 3. Loop vivo: o contador de madeira sobe ao clicar
    const before = await page.$eval('[data-res="wood"] [data-count]', el => el.textContent);
    for (let i = 0; i < 3; i++) {
        await page.click('[data-manual="wood"]');
        await new Promise(r => setTimeout(r, 60));
    }
    const after = await page.$eval('[data-res="wood"] [data-count]', el => el.textContent);
    ok('clique coleta madeira', before === '0' && after === '3', `${before} -> ${after}`);

    // 4. Vender paga
    await page.click('[data-res="wood"] [data-action="sell"]');
    await new Promise(r => setTimeout(r, 100));
    const money = await page.$eval('#money-value', el => el.textContent);
    ok('vender 3 madeira paga R$ 3', money === '3.00', `saldo ${money}`);
    ok('inventário zerou após vender',
        await page.$eval('[data-res="wood"] [data-count]', el => el.textContent === '0'));

    // 5. Comprar prédio
    await page.evaluate(() => { window.gameRef.state.money = 10000; });
    await new Promise(r => setTimeout(r, 60));
    await page.click('[data-building="woodcutter"] [data-action="buy"]');
    await new Promise(r => setTimeout(r, 100));
    const count = await page.$eval('[data-building="woodcutter"] [data-b="count"]', el => el.textContent);
    ok('comprar lenhador incrementa contador', count === '1', `contador ${count}`);

    // 6. Taxa por segundo aparece na barra
    await new Promise(r => setTimeout(r, 200));
    const rate = await page.$eval('[data-res="wood"] [data-rate]', el => el.textContent);
    ok('barra mostra taxa de produção', /\+\d/.test(rate), `taxa "${rate}"`);

    // 7. Autocoleta esconde a faixa inteira (o bug do parentElement)
    await page.click('[data-building="woodcutter"] [data-action="auto"]');
    await new Promise(r => setTimeout(r, 100));
    const storageHidden = await page.$eval(
        '[data-building="woodcutter"] .storage-container',
        el => el.classList.contains('hidden'));
    ok('autocoleta esconde a faixa de estoque', storageHidden);
    const orphan = await page.$$eval(
        '[data-building="woodcutter"] .storage-actions .btn',
        els => els.filter(e => e.offsetParent !== null).length);
    ok('nenhum botão Coletar/Autocoleta órfão', orphan === 0, `${orphan} visíveis`);

    // 8. Abas trocam de conteúdo
    await page.evaluate(() => {
        const g = window.gameRef;
        g.state.unlocks.upgradesPanel = true;
        g.state.unlocks.continuousClick = true;
    });
    await new Promise(r => setTimeout(r, 60));
    ok('aba de Melhorias aparece após unlock',
        await page.$eval('[data-tab="melhorias"]', el => !el.classList.contains('hidden')));

    await page.click('[data-tab="melhorias"]');
    await new Promise(r => setTimeout(r, 120));
    ok('painel de melhorias visível',
        await page.$eval('[data-panel="melhorias"]', el => !el.classList.contains('hidden')));
    ok('painel de produção escondido',
        await page.$eval('[data-panel="producao"]', el => el.classList.contains('hidden')));

    // 9. Stats
    await page.click('[data-tab="stats"]');
    await new Promise(r => setTimeout(r, 120));
    ok('painel de stats visível',
        await page.$eval('[data-panel="stats"]', el => !el.classList.contains('hidden')));

    // 10. Modal de conquistas abre
    await page.click('#btn-achievements');
    await new Promise(r => setTimeout(r, 150));
    ok('modal de conquistas abre',
        await page.$eval('#achievements-modal', el => !el.classList.contains('hidden')));
    ok('13 conquistas listadas',
        (await page.$$('.achievement-card')).length === 13,
        `${(await page.$$('.achievement-card')).length} cards`);
    await page.click('#btn-close-achievements');

    // 11. Sem overflow horizontal (o bug do 100vw)
    const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok('sem overflow horizontal', overflow <= 0, `${overflow}px`);

    await browser.close();

    const allErrors = errors();
    console.log(`\n  erros: ${allErrors.length}`);
    allErrors.forEach(e => console.log('    ✗ ' + e));
    console.log(`  falhas: ${fails.length}`);
    fails.forEach(f => console.log('    ✗ ' + f));
    console.log('');

    process.exit(allErrors.length || fails.length ? 1 : 0);
})();
