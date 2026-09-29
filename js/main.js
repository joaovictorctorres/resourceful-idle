document.addEventListener('DOMContentLoaded', () => {

    // Inicia o Jogo
    const game = new IdleGame();
    game.load(); // Tenta carregar do localStorage

    // Inicia a UI
    const ui = new GameUI(game);

    // Progresso offline: roda uma vez, antes do primeiro render. Só aqui — se
    // rodasse também no visibilitychange, combined com o carimbo em save(),
    // pagaria o mesmo período duas vezes.
    const offline = game.applyOfflineProgress();

    ui.updateUI(); // Força a primeira renderização visual
    if (offline) ui.showWelcomeBack(offline);

    // Game Loop usando requestAnimationFrame customizado para Tick
    let lastTime = performance.now();
    let saveTimer = 0;

    function gameLoop(currentTime) {
        // Calcula delta time (dt) em segundos
        let dt = (currentTime - lastTime) / 1000;

        // Cap limite para evitar avanços absurdos (ex: ficou 2 horas com aba inativa)
        // Se runInBackground estiver desativado, limitamos a 1 segundo.
        if (dt > 1 && !game.state.settings.runInBackground) {
            dt = 1;
        }

        lastTime = currentTime;

        // Um throw em qualquer passo (ex: elemento ausente no updateUI) mataria o
        // rAF de vez, já que a re-agendamento é a última instrução do loop.
        try {
            // Atualiza Lógica do Motor
            game.update(dt);

            // Atualiza Elementos Visuais
            ui.updateUI();

            // Autosave a cada 10 segundos (~10s em tempo de tela)
            saveTimer += dt;
            if (saveTimer >= 10) {
                game.save();
                saveTimer = 0;
                ui.showToast('Jogo salvo automaticamente.');
            }
        } catch (err) {
            console.error('Erro no game loop:', err);
        }

        requestAnimationFrame(gameLoop);
    }

    // Inicia o loop
    requestAnimationFrame(gameLoop);

    // Sem isto, fechar a aba perde até 10s de progresso e o timestamp do save
    // fica velho — o catch-up seguinte tentaria pagar esse tempo de novo.
    // Disparo duplo (Safari dispara os dois) é inofensivo: save() é idempotente.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            game.save();
        }
    });
    window.addEventListener('beforeunload', () => game.save());
});
