// Vice Metropolis - Staged Screenshot Scenes

export function initShshots(gameInstance) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = params.get('seed');

  if (seed) {
    // Set seed if provided
    gameInstance.seed = Number(seed);
  }

  if (shot) {
    // Hide title screen immediately
    const titleScreen = document.getElementById('title-screen');
    if (titleScreen) {
      titleScreen.style.display = 'none';
    }

    if (shot === 'start') {
      gameInstance.setupStartScene();
    } else if (shot === 'play') {
      gameInstance.setupPlayScene();
    } else if (shot === 'end') {
      gameInstance.setupEndScene();
    }

    window.__SCREENSHOT_READY__ = true;
  }
}
