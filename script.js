const carCatalog = [
  { id: 0, name: "Falcao Neon", color: "#38bdf8", speed: 3.8, handling: 0.08 },
  { id: 1, name: "Tempestade GT", color: "#f97316", speed: 4.05, handling: 0.075 },
  { id: 2, name: "Dragao Turbo", color: "#22c55e", speed: 3.7, handling: 0.09 },
  { id: 3, name: "Cometa VX", color: "#e879f9", speed: 4.2, handling: 0.07 },
  { id: 4, name: "Vortex XR", color: "#facc15", speed: 3.95, handling: 0.085 },
  { id: 5, name: "Sombra Z", color: "#fb7185", speed: 4.1, handling: 0.078 }
];

const defaultControlProfiles = [
  { up: ["w"], left: ["a"], right: ["d"], down: ["s"] },
  { up: ["arrowup", "i"], left: ["arrowleft", "j"], right: ["arrowright", "l"], down: ["arrowdown", "k"] }
];

const actionLabels = {
  up: "Acelerar",
  left: "Esquerda",
  right: "Direita",
  down: "Frear"
};

const screens = {
  start: document.getElementById("start-screen"),
  menu: document.getElementById("menu-screen"),
  selection: document.getElementById("selection-screen"),
  settings: document.getElementById("settings-screen"),
  game: document.getElementById("game-screen"),
  end: document.getElementById("end-screen")
};

const elements = {
  carList: document.getElementById("car-list"),
  playerOneChoice: document.getElementById("player-one-choice"),
  playerTwoChoice: document.getElementById("player-two-choice"),
  hudP1: document.getElementById("hud-p1"),
  hudP2: document.getElementById("hud-p2"),
  hudTime: document.getElementById("hud-time"),
  endTitle: document.getElementById("end-title"),
  endMessage: document.getElementById("end-message"),
  finalScore: document.getElementById("final-score"),
  settingsGrid: document.getElementById("settings-grid"),
  controlsSummary: document.getElementById("controls-summary"),
  pauseMessage: document.getElementById("pause-message")
};

const buttons = {
  goMenu: document.getElementById("go-menu-btn"),
  startGame: document.getElementById("start-game-btn"),
  openSelection: document.getElementById("open-selection-btn"),
  openSettings: document.getElementById("open-settings-btn"),
  saveSelection: document.getElementById("save-selection-btn"),
  cancelSelection: document.getElementById("cancel-selection-btn"),
  resetControls: document.getElementById("reset-controls-btn"),
  saveSettings: document.getElementById("save-settings-btn"),
  cancelSettings: document.getElementById("cancel-settings-btn"),
  showRanking: document.getElementById("show-ranking-btn"),
  exitGame: document.getElementById("exit-game-btn"),
  playAgain: document.getElementById("play-again-btn"),
  backMenu: document.getElementById("back-menu-btn")
};

const canvas = document.getElementById("race-canvas");
const ctx = canvas.getContext("2d");

function cloneControls(controls) {
  return controls.map((player) => ({
    up: [...player.up],
    left: [...player.left],
    right: [...player.right],
    down: [...player.down]
  }));
}

const state = {
  selections: [0, 1],
  tempSelections: [0, 1],
  ranking: [],
  gameRunning: false,
  paused: false,
  lastTime: 0,
  countdown: 80,
  finishDistance: 2200,
  resultReason: "gameover",
  keys: {},
  obstacles: [],
  boosts: [],
  players: [],
  controlProfiles: cloneControls(defaultControlProfiles),
  tempControlProfiles: cloneControls(defaultControlProfiles),
  waitingForKey: null
};

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
}

function normalizeKey(key) {
  return typeof key === "string" ? key.toLowerCase() : "";
}

function formatKey(key) {
  const map = {
    arrowup: "Seta cima",
    arrowdown: "Seta baixo",
    arrowleft: "Seta esquerda",
    arrowright: "Seta direita",
    " ": "Espaco"
  };
  return map[key] || key.toUpperCase();
}

function formatActionKeys(keys) {
  return keys.map((key) => `<kbd>${formatKey(key)}</kbd>`).join(" / ");
}

function buildControlKeySet() {
  const keys = new Set();
  state.controlProfiles.forEach((profile) => {
    Object.values(profile).flat().forEach((key) => keys.add(key));
  });
  if (state.waitingForKey) {
    Object.values(state.tempControlProfiles[state.waitingForKey.playerIndex]).flat().forEach((key) => keys.add(key));
  }
  return keys;
}

function renderControlsSummary() {
  const p1 = state.controlProfiles[0];
  const p2 = state.controlProfiles[1];
  elements.controlsSummary.innerHTML = `J1: ${formatActionKeys(p1.up)} ${formatActionKeys(p1.left)} ${formatActionKeys(p1.down)} ${formatActionKeys(p1.right)} ou controle 1. J2: ${formatActionKeys(p2.up)} ${formatActionKeys(p2.left)} ${formatActionKeys(p2.down)} ${formatActionKeys(p2.right)} ou controle 2.`;
}

function renderSettings() {
  elements.settingsGrid.innerHTML = "";

  state.tempControlProfiles.forEach((profile, playerIndex) => {
    const card = document.createElement("article");
    card.className = "settings-panel";
    card.innerHTML = `
      <h3>Jogador ${playerIndex + 1}</h3>
      <div class="settings-actions">
        ${Object.entries(actionLabels).map(([action, label]) => `
          <div class="setting-row">
            <span>${label}</span>
            <button type="button" class="keybind-btn${state.waitingForKey?.playerIndex === playerIndex && state.waitingForKey?.action === action ? " listening" : ""}" data-player="${playerIndex}" data-action="${action}">
              ${state.waitingForKey?.playerIndex === playerIndex && state.waitingForKey?.action === action ? "Pressione..." : profile[action].map(formatKey).join(" / ")}
            </button>
          </div>
        `).join("")}
      </div>
    `;
    elements.settingsGrid.appendChild(card);
  });
}

function renderCarSelection() {
  elements.carList.innerHTML = "";

  carCatalog.forEach((car) => {
    const card = document.createElement("article");
    card.className = "car-card";
    card.innerHTML = `
      <div class="car-preview" style="background: linear-gradient(135deg, ${car.color}, #111827);"></div>
      <h3>${car.name}</h3>
      <p class="car-spec">Velocidade: ${car.speed.toFixed(2)}<br>Controle: ${car.handling.toFixed(3)}</p>
      <div class="selector-group">
        <button type="button" class="player-one-btn" data-player="0" data-car="${car.id}">Escolher J1</button>
        <button type="button" class="player-two-btn" data-player="1" data-car="${car.id}">Escolher J2</button>
      </div>
    `;
    elements.carList.appendChild(card);
  });

  updateSelectionButtons();
}

function updateSelectionButtons() {
  document.querySelectorAll(".selector-group button").forEach((button) => {
    const playerIndex = Number(button.dataset.player);
    const carId = Number(button.dataset.car);
    button.classList.toggle("active", state.tempSelections[playerIndex] === carId);
    button.disabled = state.tempSelections[1 - playerIndex] === carId;
  });
}

function updateChoiceLabels() {
  elements.playerOneChoice.textContent = carCatalog[state.selections[0]].name;
  elements.playerTwoChoice.textContent = carCatalog[state.selections[1]].name;
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createRaceEntities() {
  state.obstacles = [];
  state.boosts = [];
}

function createPlayer(selectionIndex, x, controls, gamepadSlot, label) {
  const car = carCatalog[state.selections[selectionIndex]];
  return {
    label,
    x,
    y: canvas.height - 100,
    width: 58,
    height: 100,
    distance: 0,
    speed: 0,
    topSpeed: car.speed,
    handling: car.handling,
    turboTimer: 0,
    color: car.color,
    carName: car.name,
    controls,
    gamepadSlot
  };
}

function keyPressed(controls, action) {
  return controls[action].some((key) => state.keys[key]);
}

function resetGame() {
  state.countdown = 80;
  state.resultReason = "gameover";
  state.paused = false;
  elements.pauseMessage.classList.add("hidden");
  state.players = [
    createPlayer(0, canvas.width * 0.35, cloneControls([state.controlProfiles[0]])[0], 0, "Jogador 1"),
    createPlayer(1, canvas.width * 0.65, cloneControls([state.controlProfiles[1]])[0], 1, "Jogador 2")
  ];
  createRaceEntities();
  updateHud();
}

function updateHud() {
  elements.hudP1.textContent = `${Math.floor(state.players[0]?.distance || 0)} m`;
  elements.hudP2.textContent = `${Math.floor(state.players[1]?.distance || 0)} m`;
  elements.hudTime.textContent = state.paused ? "Pausado" : `${Math.ceil(state.countdown)} s`;
}

function getGamepadState(slot) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = pads[slot] || null;
  if (!pad || !pad.connected) return null;
  return pad;
}

function readHorizontalInput(player) {
  let direction = 0;
  if (keyPressed(player.controls, "left")) direction -= 1;
  if (keyPressed(player.controls, "right")) direction += 1;

  const gamepad = getGamepadState(player.gamepadSlot);
  if (gamepad) {
    const axis = gamepad.axes[0] || 0;
    if (Math.abs(axis) > 0.35) {
      direction = axis;
    }
    if (gamepad.buttons[14]?.pressed) direction = -1;
    if (gamepad.buttons[15]?.pressed) direction = 1;
  }

  return direction;
}

function isAccelerating(player) {
  const gamepad = getGamepadState(player.gamepadSlot);
  return Boolean(
    keyPressed(player.controls, "up") ||
    gamepad?.buttons[0]?.pressed ||
    gamepad?.buttons[7]?.pressed
  );
}

function isBraking(player) {
  const gamepad = getGamepadState(player.gamepadSlot);
  return Boolean(
    keyPressed(player.controls, "down") ||
    gamepad?.buttons[1]?.pressed
  );
}

function overlaps(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function updatePlayers(delta) {
  state.players.forEach((player) => {
    const horizontalInput = readHorizontalInput(player);
    const accel = isAccelerating(player);
    const braking = isBraking(player);
    const frameFactor = delta * 60;

    if (accel) {
      player.speed += 0.045 * frameFactor;
    } else {
      player.speed -= 0.025 * frameFactor;
    }

    if (braking) {
      player.speed -= 0.06 * frameFactor;
    }

    if (player.turboTimer > 0) {
      player.turboTimer -= delta;
    }

    const currentTopSpeed = player.topSpeed + (player.turboTimer > 0 ? 1.1 : 0);
    player.speed = Math.max(0, Math.min(player.speed, currentTopSpeed));
    player.x += horizontalInput * (5 + player.speed * 1.8) * player.handling * frameFactor;
    player.x = Math.max(110, Math.min(canvas.width - 110, player.x));

    player.distance += player.speed * 3.3 * frameFactor;
    player.y = canvas.height - 110 - player.speed * 2;
  });
}

function updateTrack(delta) {
  state.countdown -= delta;
}

function checkEndConditions() {
  const winner = state.players.find((player) => player.distance >= state.finishDistance);
  if (winner) {
    state.resultReason = "victory";
    finishGame();
    return;
  }

  if (state.countdown <= 0) {
    state.resultReason = "gameover";
    finishGame();
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#0f172a");
  sky.addColorStop(1, "#1d4ed8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1f2937";
  ctx.fillRect(130, 0, canvas.width - 260, canvas.height);

  ctx.fillStyle = "#64748b";
  ctx.fillRect(110, 0, 20, canvas.height);
  ctx.fillRect(canvas.width - 130, 0, 20, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 8;
  ctx.setLineDash([32, 26]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < 7; i += 1) {
    ctx.fillStyle = "#16a34a";
    ctx.beginPath();
    ctx.arc(58 + i * 150, 80 + (i % 2) * 320, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(canvas.width - 58 - i * 140, 130 + (i % 2) * 280, 28, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTrackObjects() {
  ctx.fillStyle = "rgba(247, 240, 214, 0.12)";
  for (let y = 0; y < canvas.height; y += 52) {
    ctx.fillRect(canvas.width / 2 - 8, y, 16, 28);
  }
}

function drawCar(player) {
  const x = player.x - player.width / 2;
  const y = player.y;

  ctx.fillStyle = player.color;
  ctx.fillRect(x, y, player.width, player.height);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillRect(x + 10, y + 12, player.width - 20, 28);

  ctx.fillStyle = "#111827";
  ctx.fillRect(x + 8, y + 74, 12, 18);
  ctx.fillRect(x + player.width - 20, y + 74, 12, 18);
  ctx.fillRect(x + 8, y + 8, 12, 18);
  ctx.fillRect(x + player.width - 20, y + 8, 12, 18);

  if (player.turboTimer > 0) {
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(x + 18, y + player.height, player.width - 36, 12);
  }

  ctx.fillStyle = "white";
  ctx.font = "bold 18px monospace";
  ctx.fillText(player.label, x - 8, y - 10);
}

function drawFinishProgress() {
  ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
  ctx.fillRect(18, 18, 220, 82);
  ctx.fillStyle = "white";
  ctx.font = "bold 18px monospace";
  ctx.fillText("Meta: 2200 m", 32, 42);

  state.players.forEach((player, index) => {
    const progress = Math.min(1, player.distance / state.finishDistance);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(32, 52 + index * 22, 180, 12);
    ctx.fillStyle = player.color;
    ctx.fillRect(32, 52 + index * 22, 180 * progress, 12);
  });
}

function renderRace() {
  drawBackground();
  drawTrackObjects();
  state.players.forEach(drawCar);
  drawFinishProgress();
}

function gameLoop(timestamp) {
  if (!state.gameRunning) return;

  if (state.paused) {
    state.lastTime = timestamp;
    updateHud();
    renderRace();
    requestAnimationFrame(gameLoop);
    return;
  }

  if (!state.lastTime) {
    state.lastTime = timestamp;
  }

  const delta = Math.min(0.032, (timestamp - state.lastTime) / 1000);
  state.lastTime = timestamp;

  updatePlayers(delta);
  updateTrack(delta);
  checkEndConditions();
  updateHud();
  renderRace();

  if (state.gameRunning) {
    requestAnimationFrame(gameLoop);
  }
}

function finishGame() {
  state.gameRunning = false;
  state.paused = false;
  state.lastTime = 0;
  elements.pauseMessage.classList.add("hidden");

  const sorted = [...state.players].sort((a, b) => b.distance - a.distance);
  state.ranking = sorted.map((player, index) => ({
    position: index + 1,
    label: player.label,
    carName: player.carName,
    distance: Math.floor(player.distance)
  }));

  const winner = state.ranking[0];
  if (state.resultReason === "victory") {
    elements.endTitle.textContent = "Voce venceu a corrida";
    elements.endMessage.textContent = `${winner.label} cruzou a meta primeiro com o carro ${winner.carName}.`;
  } else {
    elements.endTitle.textContent = "Game over";
    elements.endMessage.textContent = `${winner.label} liderou quando o tempo acabou.`;
  }

  renderRanking();
  showScreen("end");
}

function renderRanking() {
  if (!state.ranking.length) {
    elements.finalScore.innerHTML = "<p>Nenhuma corrida finalizada ainda.</p>";
    return;
  }

  elements.finalScore.innerHTML = state.ranking.map((entry) => `
    <div class="score-item">
      <span>${entry.position}o lugar - ${entry.label} (${entry.carName})</span>
      <strong>${entry.distance} m</strong>
    </div>
  `).join("");
}

function startGame() {
  resetGame();
  showScreen("game");
  state.gameRunning = true;
  renderRace();
  requestAnimationFrame(gameLoop);
}

function openSettings() {
  state.tempControlProfiles = cloneControls(state.controlProfiles);
  state.waitingForKey = null;
  renderSettings();
  showScreen("settings");
}

function handleRemapKey(key) {
  if (!state.waitingForKey) return false;

  const normalizedKey = normalizeKey(key);
  if (!normalizedKey || normalizedKey === "escape" || normalizedKey === "tab") {
    state.waitingForKey = null;
    renderSettings();
    return true;
  }

  const { playerIndex, action } = state.waitingForKey;
  const otherAction = action === "up" || action === "down" ? ["left", "right"] : ["up", "down"];
  const profile = state.tempControlProfiles[playerIndex];

  Object.keys(profile).forEach((currentAction) => {
    profile[currentAction] = profile[currentAction].filter((storedKey) => storedKey !== normalizedKey);
  });

  profile[action] = [normalizedKey];

  if (playerIndex === 1) {
    if (action === "up" && !profile.up.includes("i")) profile.up = [normalizedKey, "i"].filter((value, idx, arr) => arr.indexOf(value) === idx);
    if (action === "left" && !profile.left.includes("j")) profile.left = [normalizedKey, "j"].filter((value, idx, arr) => arr.indexOf(value) === idx);
    if (action === "down" && !profile.down.includes("k")) profile.down = [normalizedKey, "k"].filter((value, idx, arr) => arr.indexOf(value) === idx);
    if (action === "right" && !profile.right.includes("l")) profile.right = [normalizedKey, "l"].filter((value, idx, arr) => arr.indexOf(value) === idx);
  }

  if (playerIndex === 0 && otherAction.length) {
    otherAction.forEach((currentAction) => {
      if (profile[currentAction].length === 0) {
        profile[currentAction] = [...defaultControlProfiles[playerIndex][currentAction]];
      }
    });
  }

  state.waitingForKey = null;
  renderSettings();
  return true;
}

function setPauseState(shouldPause) {
  if (!state.gameRunning) return;
  state.paused = shouldPause;
  elements.pauseMessage.classList.toggle("hidden", !shouldPause);
  updateHud();
}

function bindEvents() {
  buttons.goMenu.addEventListener("click", () => showScreen("menu"));
  buttons.openSelection.addEventListener("click", () => {
    state.tempSelections = [...state.selections];
    updateSelectionButtons();
    showScreen("selection");
  });
  buttons.openSettings.addEventListener("click", openSettings);
  buttons.cancelSelection.addEventListener("click", () => showScreen("menu"));
  buttons.saveSelection.addEventListener("click", () => {
    if (state.tempSelections[0] === state.tempSelections[1]) {
      window.alert("Cada jogador deve escolher um carro diferente.");
      return;
    }
    state.selections = [...state.tempSelections];
    updateChoiceLabels();
    showScreen("menu");
  });

  buttons.resetControls.addEventListener("click", () => {
    state.tempControlProfiles = cloneControls(defaultControlProfiles);
    state.waitingForKey = null;
    renderSettings();
  });

  buttons.saveSettings.addEventListener("click", () => {
    state.controlProfiles = cloneControls(state.tempControlProfiles);
    state.waitingForKey = null;
    renderControlsSummary();
    showScreen("menu");
  });

  buttons.cancelSettings.addEventListener("click", () => {
    state.waitingForKey = null;
    showScreen("menu");
  });

  buttons.startGame.addEventListener("click", startGame);
  buttons.playAgain.addEventListener("click", startGame);
  buttons.backMenu.addEventListener("click", () => showScreen("menu"));
  buttons.showRanking.addEventListener("click", () => {
    elements.endTitle.textContent = "Ranking geral";
    elements.endMessage.textContent = "Resultado da ultima corrida realizada.";
    renderRanking();
    showScreen("end");
  });
  buttons.exitGame.addEventListener("click", () => {
    state.gameRunning = false;
    state.paused = false;
    elements.endTitle.textContent = "Jogo encerrado";
    elements.endMessage.textContent = "Voce saiu do jogo. Use o menu para voltar quando quiser.";
    renderRanking();
    showScreen("end");
  });

  elements.carList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-player]");
    if (!button) return;

    const playerIndex = Number(button.dataset.player);
    const carId = Number(button.dataset.car);
    state.tempSelections[playerIndex] = carId;

    if (state.tempSelections[0] === state.tempSelections[1]) {
      state.tempSelections[1 - playerIndex] = state.tempSelections[1 - playerIndex] === 0 ? 1 : 0;
    }

    updateSelectionButtons();
  });

  elements.settingsGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".keybind-btn");
    if (!button) return;

    state.waitingForKey = {
      playerIndex: Number(button.dataset.player),
      action: button.dataset.action
    };
    renderSettings();
  });

  window.addEventListener("keydown", (event) => {
    const key = normalizeKey(event.key);

    if (handleRemapKey(key)) {
      event.preventDefault();
      return;
    }

    state.keys[key] = true;
    if (buildControlKeySet().has(key)) {
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    const key = normalizeKey(event.key);
    state.keys[key] = false;
    if (buildControlKeySet().has(key)) {
      event.preventDefault();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      setPauseState(true);
    } else if (state.gameRunning) {
      setPauseState(false);
      state.lastTime = 0;
    }
  });

  window.addEventListener("blur", () => setPauseState(true));
  window.addEventListener("focus", () => {
    if (state.gameRunning) {
      setPauseState(false);
      state.lastTime = 0;
    }
  });
}

renderCarSelection();
renderSettings();
renderControlsSummary();
updateChoiceLabels();
bindEvents();
showScreen("start");
