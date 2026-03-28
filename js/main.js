document.addEventListener('DOMContentLoaded', () => {

    // Inicia o Jogo
    const game = new IdleGame();
    game.load(); // Tenta carregar do localStorage

    // Inicia a UI
    const ui = new GameUI(game);
    ui.updateUI(); // Força a primeira renderização visual

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

        requestAnimationFrame(gameLoop);
    }

    // Inicia o loop
    requestAnimationFrame(gameLoop);
});
