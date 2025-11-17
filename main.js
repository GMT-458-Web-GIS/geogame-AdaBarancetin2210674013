// Simple data model: a small hand-crafted sample of taxi trips
const trips = [
  { hour: 8,  distanceKm: 2.0, pickupBorough: "Manhattan",      dropoffBorough: "Manhattan",      fareUSD: 9  },
  { hour: 9,  distanceKm: 1.4, pickupBorough: "Manhattan",      dropoffBorough: "Manhattan",      fareUSD: 8  },
  { hour: 18, distanceKm: 3.5, pickupBorough: "Manhattan",      dropoffBorough: "Brooklyn",       fareUSD: 16 },
  { hour: 22, distanceKm: 5.2, pickupBorough: "Manhattan",      dropoffBorough: "Queens",         fareUSD: 22 },

  { hour: 14, distanceKm: 4.8, pickupBorough: "Brooklyn",       dropoffBorough: "Manhattan",      fareUSD: 19 },
  { hour: 19, distanceKm: 7.1, pickupBorough: "Brooklyn",       dropoffBorough: "Queens",         fareUSD: 26 },
  { hour: 23, distanceKm: 6.3, pickupBorough: "Brooklyn",       dropoffBorough: "Brooklyn",       fareUSD: 24 },

  { hour: 11, distanceKm: 6.0, pickupBorough: "Queens",         dropoffBorough: "Queens",         fareUSD: 23 },
  { hour: 15, distanceKm: 8.2, pickupBorough: "Queens",         dropoffBorough: "Manhattan",      fareUSD: 30 },
  { hour: 21, distanceKm: 5.5, pickupBorough: "Queens",         dropoffBorough: "Brooklyn",       fareUSD: 21 },

  { hour: 10, distanceKm: 4.2, pickupBorough: "Bronx",          dropoffBorough: "Manhattan",      fareUSD: 17 },
  { hour: 17, distanceKm: 5.8, pickupBorough: "Bronx",          dropoffBorough: "Queens",         fareUSD: 21 },

  { hour: 13, distanceKm: 9.0, pickupBorough: "Staten Island",  dropoffBorough: "Brooklyn",       fareUSD: 32 },
  { hour: 20, distanceKm: 7.4, pickupBorough: "Staten Island",  dropoffBorough: "Staten Island",  fareUSD: 29 }
];

// Borough centres for the map
const boroughCenters = {
  Manhattan: [40.7831, -73.9712],
  Brooklyn: [40.6782, -73.9442],
  Queens: [40.7282, -73.7949],
  Bronx: [40.8448, -73.8648],
  "Staten Island": [40.5795, -74.1502]
};

let map;
function loadLeaderboard() {
  try {
    const raw = localStorage.getItem("nycTaxiLeaderboard");
    if (!raw) {
      leaderboard = [];
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      leaderboard = parsed
        .filter((e) => typeof e.name === "string" && typeof e.score === "number")
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    } else {
      leaderboard = [];
    }
  } catch (e) {
    leaderboard = [];
  }
}

function saveLeaderboard() {
  try {
    localStorage.setItem("nycTaxiLeaderboard", JSON.stringify(leaderboard));
  } catch (e) {}
}

function updateLeaderboardWithScore(name, score) {
  if (!name) name = "Player";
  leaderboard.push({ name, score });
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 3);
  saveLeaderboard();
}

function renderLeaderboard() {
  const renderInto = (el) => {
    if (!el) return;
    el.innerHTML = "";
    if (!leaderboard.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "No scores yet";
      el.appendChild(li);
      return;
    }
    leaderboard.forEach((entry, idx) => {
      const li = document.createElement("li");
      const nameSpan = document.createElement("span");
      nameSpan.className = "name";
      nameSpan.textContent = entry.name;
      const scoreSpan = document.createElement("span");
      scoreSpan.className = "score";
      scoreSpan.textContent = ` – ${entry.score}`;
      li.appendChild(nameSpan);
      li.appendChild(scoreSpan);
      el.appendChild(li);
    });
  };

  renderInto(leaderboardEl);
  renderInto(overlayLeaderboardEl);
}

let pickupMarker;
let dropoffMarker;

let currentTrip = null;
let currentOptions = [];
let score = 0;
let lives = 3;
let timeLeft = 60;
let timerId = null;
let totalQuestions = 0;
let correctAnswers = 0;
let gameRunning = false;

let playerName = "";
let taxiCursor = null;

// leaderboard: array of { name, score }
let leaderboard = [];

// selected duration from menu (15,30,60)
let selectedDuration = 60;

// DOM references
const screens = {
  menu: document.getElementById("menu-screen"),
  howto: document.getElementById("howto-screen"),
  game: document.getElementById("game-screen")
};

const timeEl = document.getElementById("time");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const tripInfoEl = document.getElementById("trip-info");
const optionsContainer = document.getElementById("options");
const feedbackEl = document.getElementById("feedback");
const overlayEl = document.getElementById("overlay");
const finalMessageEl = document.getElementById("final-message");
const finalScoreEl = document.getElementById("final-score");
const finalCorrectEl = document.getElementById("final-correct");
const finalTotalEl = document.getElementById("final-total");

const playerNameInput = document.getElementById("player-name");
const leaderboardEl = document.getElementById("leaderboard");
const overlayLeaderboardEl = document.getElementById("overlay-leaderboard");

// Buttons
const navButtons = document.querySelectorAll(".nav-btn");
const playBtn = document.getElementById("play-btn");
const howtoBtn = document.getElementById("howto-btn");
const backToMenuBtn = document.getElementById("back-to-menu-btn");
const startGameBtn = document.getElementById("start-game-btn");
const quitBtn = document.getElementById("quit-btn");
const playAgainBtn = document.getElementById("play-again-btn");
const overlayMenuBtn = document.getElementById("overlay-menu-btn");

// Mode selector
const modeButtons = document.querySelectorAll(".mode-btn");
const modeLabel = document.getElementById("mode-label");

function showScreen(id) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  if (id === "menu-screen") {
    screens.menu.classList.add("active");
  } else if (id === "howto-screen") {
    screens.howto.classList.add("active");
  } else if (id === "game-screen") {
    screens.game.classList.add("active");
    if (map) {
      setTimeout(() => map.invalidateSize(), 100);
    }
  }
}

// Map setup with multiple base layers
function initMap() {
  map = L.map("map").setView([40.7128, -74.006], 11);

  const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  const light = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap &copy; CARTO"
    }
  );

  const dark = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap &copy; CARTO"
    }
  );

  pickupMarker = L.circleMarker([40.7128, -74.006], {
    radius: 9,
    color: "#16a34a",
    fillColor: "#22c55e",
    fillOpacity: 0.9
  });

  dropoffMarker = L.circleMarker([40.72, -74.01], {
    radius: 9,
    color: "#2563eb",
    fillColor: "#3b82f6",
    fillOpacity: 0.9
  });

  const tripLayer = L.layerGroup([pickupMarker, dropoffMarker]).addTo(map);

  pickupMarker.bindPopup("Pickup (P)");
  dropoffMarker.bindPopup("Dropoff (D)");

  const baseLayers = {
    "OSM Streets": osm,
    "Light": light,
    "Dark": dark
  };

  const overlays = {
    "Trip markers": tripLayer
  };

  L.control.layers(baseLayers, overlays).addTo(map);
}

function updateMapForTrip(trip) {
  const pickupCenter = boroughCenters[trip.pickupBorough];
  const dropoffCenter = boroughCenters[trip.dropoffBorough];
  if (!pickupCenter || !dropoffCenter) return;

  pickupMarker.setLatLng(pickupCenter);
  dropoffMarker.setLatLng(dropoffCenter);

  const midLat = (pickupCenter[0] + dropoffCenter[0]) / 2;
  const midLng = (pickupCenter[1] + dropoffCenter[1]) / 2;

  const sameBorough = trip.pickupBorough === trip.dropoffBorough;
  const zoomLevel = sameBorough ? 12 : 11;

  map.setView([midLat, midLng], zoomLevel);
  pickupMarker.openPopup();
}

// Game logic
function resetGameState() {
  score = 0;
  lives = 3;
  timeLeft = selectedDuration;
  totalQuestions = 0;
  correctAnswers = 0;
  gameRunning = true;
  timeEl.textContent = timeLeft;
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";
  optionsContainer.innerHTML = "";
}

function handleTimeUp() {
  if (!gameRunning) return;

  lives--;
  livesEl.textContent = lives;
  feedbackEl.textContent = "Time is up! You lost 1 life.";
  feedbackEl.className = "feedback wrong";

  if (lives <= 0) {
    endGame("No lives left!");
    return;
  }

  clearInterval(timerId);
  timeLeft = selectedDuration;
  timeEl.textContent = timeLeft;

  setTimeout(() => {
    if (!gameRunning) return;
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
    startTimer();
    loadNextQuestion();
  }, 900);
}

function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(() => {
    if (!gameRunning) return;
    timeLeft--;
    if (timeLeft < 0) timeLeft = 0;
    timeEl.textContent = timeLeft;
    if (timeLeft === 0) {
      handleTimeUp();
    }
  }, 1000);
}

function startGame() {
  const name = playerNameInput ? playerNameInput.value.trim() : "";
  if (!name) {
    alert("Please enter your name before starting the game.");
    if (playerNameInput) {
      playerNameInput.focus();
    }
    return;
  }
  playerName = name;

  resetGameState();
  overlayEl.classList.add("hidden");
  showScreen("game-screen");
  startTimer();
  loadNextQuestion();
}

function endGame(reason) {
  if (!gameRunning) return;
  gameRunning = false;
  clearInterval(timerId);

  // update leaderboard with this run
  updateLeaderboardWithScore(playerName, score);
  renderLeaderboard();

  finalMessageEl.textContent = reason;
  finalScoreEl.textContent = score;
  finalCorrectEl.textContent = correctAnswers;
  finalTotalEl.textContent = totalQuestions;

  overlayEl.classList.remove("hidden");
}

function loadNextQuestion() {
  if (!gameRunning) return;

  const randomIndex = Math.floor(Math.random() * trips.length);
  currentTrip = trips[randomIndex];
  totalQuestions++;

  const { hour, distanceKm, pickupBorough, dropoffBorough, fareUSD } =
    currentTrip;

  tripInfoEl.innerHTML = `
    <p><strong>Pickup hour:</strong> ${hour}:00</p>
    <p><strong>Trip distance:</strong> ${distanceKm.toFixed(1)} km</p>
    <p><strong>Pickup borough:</strong> ${pickupBorough}</p>
    <p><strong>Dropoff borough:</strong> ${dropoffBorough}</p>
  `;

  updateMapForTrip(currentTrip);

  currentOptions = buildFareOptions(fareUSD);
  renderFareOptions();
}

function buildFareOptions(correctFare) {
  const options = new Set();
  options.add(correctFare);

  const deltas = [-6, -4, -2, 2, 4, 6];
  let i = 0;
  while (options.size < 4 && i < deltas.length) {
    const candidate = Math.max(5, correctFare + deltas[i]);
    options.add(candidate);
    i++;
  }

  const arr = Array.from(options);
  for (let j = arr.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [arr[j], arr[k]] = [arr[k], arr[j]];
  }
  return arr;
}

function renderFareOptions() {
  optionsContainer.innerHTML = "";
  currentOptions.forEach((fare) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = `$${fare.toFixed(0)}`;
    btn.dataset.fare = fare.toString();
    btn.addEventListener("click", () => handleAnswer(fare, btn));
    optionsContainer.appendChild(btn);
  });
}

function handleAnswer(selectedFare, clickedBtn) {
  if (!gameRunning || !currentTrip) return;

  const correctFare = currentTrip.fareUSD;
  const optionButtons = optionsContainer.querySelectorAll(".option-btn");
  optionButtons.forEach((btn) => {
    const fare = Number(btn.dataset.fare);
    if (fare === correctFare) {
      btn.classList.add("correct");
    }
  });

  if (selectedFare === correctFare) {
    feedbackEl.textContent = `Correct! The fare was $${correctFare.toFixed(0)}.`;
    feedbackEl.className = "feedback correct";
    score += 100;
    correctAnswers++;
  } else {
    feedbackEl.textContent = `Wrong! The fare was $${correctFare.toFixed(0)}.`;
    feedbackEl.className = "feedback wrong";
    lives--;
    livesEl.textContent = lives;
    clickedBtn.classList.add("wrong");
  }

  scoreEl.textContent = score;

  if (lives <= 0) {
    endGame("No lives left!");
    return;
  }

  setTimeout(() => {
    if (!gameRunning) return;
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
    loadNextQuestion();
  }, 900);
}

// Event bindings
navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    if (target) showScreen(target);
  });
});

playBtn.addEventListener("click", () => startGame());
howtoBtn.addEventListener("click", () => showScreen("howto-screen"));
backToMenuBtn.addEventListener("click", () => showScreen("menu-screen"));
startGameBtn.addEventListener("click", () => startGame());

quitBtn.addEventListener("click", () => {
  gameRunning = false;
  clearInterval(timerId);
  overlayEl.classList.add("hidden");
  showScreen("menu-screen");
});

playAgainBtn.addEventListener("click", () => {
  startGame();
});

overlayMenuBtn.addEventListener("click", () => {
  overlayEl.classList.add("hidden");
  showScreen("menu-screen");
});

// Mode selector events
modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    modeButtons.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedDuration = Number(btn.dataset.duration);
    modeLabel.textContent = btn.textContent.trim();
  });
});

window.addEventListener("resize", () => {
  if (map) {
    map.invalidateSize();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  showScreen("menu-screen");

  // load leaderboard from localStorage
  loadLeaderboard();
  renderLeaderboard();

  taxiCursor = document.getElementById("taxi-cursor");

  document.addEventListener("mousemove", (e) => {
    if (!taxiCursor) return;
    if (!screens.menu.classList.contains("active")) {
      taxiCursor.style.display = "none";
      return;
    }
    taxiCursor.style.display = "block";
    taxiCursor.style.left = e.clientX + "px";
    taxiCursor.style.top = e.clientY + "px";
  });
});
