const MAX_HAND = 13;
const TILE_MIN = 1;
const TILE_MAX = 29;

const suitMeta = {
  wan: { label: "万", offset: 0, className: "wan" },
  tong: { label: "筒", offset: 10, className: "tong" },
  tiao: { label: "条", offset: 20, className: "tiao" },
};

const state = {
  handTiles: [],
  openMelds: [],
  dingque: "",
  history: [],
};

const elements = {
  handTiles: document.getElementById("hand-tiles"),
  handStatus: document.getElementById("hand-status"),
  results: document.getElementById("results"),
  openMelds: document.getElementById("open-melds"),
  btnClear: document.getElementById("btn-clear"),
  btnUndo: document.getElementById("btn-undo"),
  btnExample: document.getElementById("btn-example"),
  btnAddMeld: document.getElementById("btn-add-meld"),
  meldForm: document.getElementById("meld-form"),
  meldType: document.getElementById("meld-type"),
  meldSuit: document.getElementById("meld-suit"),
  meldStart: document.getElementById("meld-start"),
  btnSaveMeld: document.getElementById("btn-save-meld"),
  btnCancelMeld: document.getElementById("btn-cancel-meld"),
  meldError: document.getElementById("meld-error"),
};

function cloneState() {
  return {
    handTiles: [...state.handTiles],
    openMelds: state.openMelds.map((meld) => ({
      type: meld.type,
      tiles: [...meld.tiles],
    })),
    dingque: state.dingque,
  };
}

function pushHistory() {
  state.history.push(cloneState());
}

function restoreState(snapshot) {
  state.handTiles = [...snapshot.handTiles];
  state.openMelds = snapshot.openMelds.map((meld) => ({
    type: meld.type,
    tiles: [...meld.tiles],
  }));
  state.dingque = snapshot.dingque || "";
}

function tileLabel(tile) {
  const suit = getSuit(tile);
  const number = tile % 10;
  return `${number}${suitMeta[suit].label}`;
}

function getSuit(tile) {
  if (tile >= 1 && tile <= 9) return "wan";
  if (tile >= 11 && tile <= 19) return "tong";
  if (tile >= 21 && tile <= 29) return "tiao";
  return "";
}

function tileClass(tile) {
  const suit = getSuit(tile);
  return suitMeta[suit]?.className ?? "";
}

function createCounts(handTiles, openMelds) {
  const counts = Array(40).fill(0);
  handTiles.forEach((tile) => {
    counts[tile] += 1;
  });
  openMelds.forEach((meld) => {
    meld.tiles.forEach((tile) => {
      counts[tile] += 1;
    });
  });
  return counts;
}

function getOpenMeldTileCount(openMelds) {
  return openMelds.reduce((sum, meld) => sum + meld.tiles.length, 0);
}

function getTotalTileCount(handTiles, openMelds) {
  return handTiles.length + getOpenMeldTileCount(openMelds);
}

function getSuitTileCount(suit) {
  if (!suit) return 0;
  const counts = createCounts(state.handTiles, state.openMelds);
  let total = 0;
  for (let tile = TILE_MIN; tile <= TILE_MAX; tile += 1) {
    if (tile % 10 === 0) continue;
    if (getSuit(tile) === suit) {
      total += counts[tile];
    }
  }
  return total;
}

function renderDingque() {
  document.querySelectorAll(".dingque-buttons .btn").forEach((btn) => {
    const selected = btn.dataset.dingque === state.dingque;
    btn.classList.toggle("active", selected);
  });
  updateMeldSuitOptions();
}

function updateMeldSuitOptions() {
  const options = Array.from(elements.meldSuit.options);
  options.forEach((option) => {
    option.disabled = state.dingque && option.value === state.dingque;
  });
  if (elements.meldSuit.selectedOptions[0]?.disabled) {
    const nextOption = options.find((option) => !option.disabled);
    if (nextOption) {
      elements.meldSuit.value = nextOption.value;
    }
  }
  updateMeldStartOptions();
}

function updateHandButtons() {
  const counts = createCounts(state.handTiles, state.openMelds);
  document.querySelectorAll(".tile-buttons button").forEach((btn) => {
    const tile = Number(btn.dataset.tile);
    const disabled =
      (state.dingque && getSuit(tile) === state.dingque) ||
      getTotalTileCount(state.handTiles, state.openMelds) >= MAX_HAND ||
      counts[tile] >= 4;
    btn.disabled = disabled;
  });
}

function renderHand() {
  elements.handTiles.innerHTML = "";
  state.handTiles.forEach((tile, index) => {
    const btn = document.createElement("button");
    btn.className = `tile ${tileClass(tile)}`;
    btn.textContent = tileLabel(tile);
    btn.title = "点击移除";
    btn.addEventListener("click", () => {
      pushHistory();
      state.handTiles.splice(index, 1);
      renderAll();
    });
    elements.handTiles.appendChild(btn);
  });
}

function renderOpenMelds() {
  elements.openMelds.innerHTML = "";
  if (state.openMelds.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status";
    empty.textContent = "暂无杠/碰";
    elements.openMelds.appendChild(empty);
    return;
  }

  state.openMelds.forEach((meld, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "result-card";

    const header = document.createElement("div");
    header.className = "panel-header";

    const title = document.createElement("h3");
    title.textContent = `${meldTypeLabel(meld.type)}：${meld.tiles
      .map(tileLabel)
      .join(" ")}`;

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-outline";
    delBtn.textContent = "删除";
    delBtn.addEventListener("click", () => {
      pushHistory();
      state.openMelds.splice(index, 1);
      renderAll();
    });

    header.appendChild(title);
    header.appendChild(delBtn);
    wrapper.appendChild(header);
    elements.openMelds.appendChild(wrapper);
  });
}

function meldTypeLabel(type) {
  switch (type) {
    case "pong":
      return "碰";
    case "kong":
      return "杠";
    default:
      return "面子";
  }
}

function renderStatus() {
  const counts = createCounts(state.handTiles, state.openMelds);
  const invalidTile = counts.find((count) => count > 4);
  if (invalidTile) {
    elements.handStatus.textContent = "非法状态：某张牌数量超过 4";
    elements.handStatus.classList.add("status-error");
    return;
  }
  if (state.openMelds.length > 4) {
    elements.handStatus.textContent = "非法状态：面子超过 4 个";
    elements.handStatus.classList.add("status-error");
    return;
  }

  elements.handStatus.classList.remove("status-error");
  const totalTiles = getTotalTileCount(state.handTiles, state.openMelds);
  if (!state.dingque) {
    elements.handStatus.textContent = "请选择定缺";
    return;
  }
  if (getSuitTileCount(state.dingque) > 0) {
    elements.handStatus.textContent = "定缺花色不能出现在手牌或杠/碰里";
    elements.handStatus.classList.add("status-error");
    return;
  }
  if (totalTiles < MAX_HAND) {
    const remaining = MAX_HAND - totalTiles;
    elements.handStatus.textContent = `还差 ${remaining} 张`;
    return;
  }

  if (totalTiles === MAX_HAND) {
    elements.handStatus.textContent = "已满 13 张，正在计算听牌...";
    return;
  }

  elements.handStatus.textContent = "总牌数超过 13 张";
  elements.handStatus.classList.add("status-error");
}

function renderResults() {
  elements.results.innerHTML = "";
  const totalTiles = getTotalTileCount(state.handTiles, state.openMelds);
  if (totalTiles !== MAX_HAND) {
    elements.results.textContent = "总牌数达到 13 张后显示听牌结果。";
    return;
  }

  const counts = createCounts(state.handTiles, state.openMelds);
  if (counts.some((count) => count > 4)) {
    elements.results.textContent = "当前牌面不合法，无法计算听牌。";
    return;
  }

  if (!state.dingque) {
    elements.results.textContent = "请选择定缺后再计算听牌。";
    return;
  }

  if (getSuitTileCount(state.dingque) > 0) {
    elements.results.textContent = "定缺花色不能出现在手牌或杠/碰里。";
    return;
  }

  if (state.openMelds.length > 4) {
    elements.results.textContent = "面子超过 4 个，无法计算听牌。";
    return;
  }

  const winTiles = calculateWaitingTiles(state.handTiles, state.openMelds);
  if (winTiles.length === 0) {
    elements.results.textContent = "暂无听牌，请调整手牌。";
    return;
  }

  winTiles.forEach((result) => {
    const card = document.createElement("div");
    card.className = "result-card";

    const title = document.createElement("h3");
    title.textContent = `听 ${tileLabel(result.tile)}`;
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "result-meta";
    meta.textContent = `可用拆解：${result.details.length} 种`;
    card.appendChild(meta);

    result.details.forEach((detail) => {
      const list = document.createElement("ul");
      list.className = "meld-list";
      if (detail.type === "sevenPairs") {
        const item = document.createElement("li");
        item.textContent = "七对胡";
        list.appendChild(item);
      } else {
        const openItem = document.createElement("li");
        openItem.textContent = `杠/碰：${formatMelds(state.openMelds) || "无"}`;
        list.appendChild(openItem);

        detail.melds.forEach((meld) => {
          const item = document.createElement("li");
          item.textContent = `面子：${meld.map(tileLabel).join(" ")}`;
          list.appendChild(item);
        });

        const pairItem = document.createElement("li");
        pairItem.textContent = `将：${tileLabel(detail.pairTile)}`;
        list.appendChild(pairItem);
      }
      card.appendChild(list);
    });

    elements.results.appendChild(card);
  });
}

function formatMelds(melds) {
  if (!melds || melds.length === 0) return "";
  return melds
    .map((meld) => `${meldTypeLabel(meld.type)}(${meld.tiles.map(tileLabel).join(" ")})`)
    .join(" / ");
}

function calculateWaitingTiles(handTiles, openMelds) {
  const results = [];
  const baseCounts = createCounts(handTiles, openMelds);

  for (let tile = TILE_MIN; tile <= TILE_MAX; tile += 1) {
    if (tile % 10 === 0) continue;
    if (state.dingque && getSuit(tile) === state.dingque) continue;
    if (baseCounts[tile] >= 4) continue;

    const counts = createCounts(handTiles, []);
    counts[tile] += 1;

    const details = checkWin14(counts, openMelds);
    if (details.length > 0) {
      results.push({ tile, details });
    }
  }

  return results;
}

function checkWin14(counts, openMelds) {
  if (!isMissingSuit(counts, openMelds)) {
    return [];
  }
  if (openMelds.length === 0 && checkSevenPairs(counts)) {
    return [{ type: "sevenPairs" }];
  }

  return findNormalWins(counts, openMelds, 3);
}

function isMissingSuit(counts, openMelds) {
  const suitSet = new Set();
  for (let tile = TILE_MIN; tile <= TILE_MAX; tile += 1) {
    if (tile % 10 === 0) continue;
    if (counts[tile] > 0) suitSet.add(getSuit(tile));
  }
  openMelds.forEach((meld) => {
    meld.tiles.forEach((tile) => suitSet.add(getSuit(tile)));
  });
  return suitSet.size <= 2;
}

function checkSevenPairs(counts) {
  let pairCount = 0;
  for (let tile = TILE_MIN; tile <= TILE_MAX; tile += 1) {
    if (tile % 10 === 0) continue;
    pairCount += Math.floor(counts[tile] / 2);
  }
  return pairCount === 7;
}

function findNormalWins(counts, openMelds, limit = 3) {
  const meldsNeeded = 4 - openMelds.length;
  if (meldsNeeded < 0) return [];

  const wins = [];
  for (let tile = TILE_MIN; tile <= TILE_MAX; tile += 1) {
    if (tile % 10 === 0) continue;
    if (counts[tile] >= 2) {
      const nextCounts = counts.slice();
      nextCounts[tile] -= 2;
      const meldResults = [];
      searchMelds(nextCounts, meldsNeeded, [], meldResults, limit - wins.length);
      meldResults.forEach((melds) => {
        wins.push({
          type: "normal",
          pairTile: tile,
          melds,
        });
      });
    }
    if (wins.length >= limit) break;
  }

  return wins.slice(0, limit);
}

function searchMelds(counts, remaining, currentMelds, results, limit) {
  if (results.length >= limit) return;
  const nextTile = findFirstTile(counts);
  if (remaining === 0) {
    if (nextTile === null) {
      results.push(currentMelds.map((meld) => [...meld]));
    }
    return;
  }

  if (nextTile === null) return;

  // Try pong
  if (counts[nextTile] >= 3) {
    counts[nextTile] -= 3;
    currentMelds.push([nextTile, nextTile, nextTile]);
    searchMelds(counts, remaining - 1, currentMelds, results, limit);
    currentMelds.pop();
    counts[nextTile] += 3;
  }

  // Try chi (hand melds only)
  if (canSequence(nextTile, counts)) {
    counts[nextTile] -= 1;
    counts[nextTile + 1] -= 1;
    counts[nextTile + 2] -= 1;
    currentMelds.push([nextTile, nextTile + 1, nextTile + 2]);
    searchMelds(counts, remaining - 1, currentMelds, results, limit);
    currentMelds.pop();
    counts[nextTile] += 1;
    counts[nextTile + 1] += 1;
    counts[nextTile + 2] += 1;
  }
}

function findFirstTile(counts) {
  for (let tile = TILE_MIN; tile <= TILE_MAX; tile += 1) {
    if (tile % 10 === 0) continue;
    if (counts[tile] > 0) return tile;
  }
  return null;
}

function canSequence(tile, counts) {
  const suit = getSuit(tile);
  if (!suit) return false;
  const number = tile % 10;
  if (number >= 8) return false;
  const tile1 = tile + 1;
  const tile2 = tile + 2;
  return (
    getSuit(tile1) === suit &&
    getSuit(tile2) === suit &&
    counts[tile1] > 0 &&
    counts[tile2] > 0
  );
}

function renderAll() {
  renderHand();
  renderOpenMelds();
  renderDingque();
  renderStatus();
  renderResults();
  updateHandButtons();
}

function initTileButtons() {
  document.querySelectorAll(".tile-buttons").forEach((container) => {
    const suit = container.dataset.suit;
    const offset = suitMeta[suit].offset;
    for (let num = 1; num <= 9; num += 1) {
      const tile = offset + num;
      const btn = document.createElement("button");
      btn.textContent = `${num}${suitMeta[suit].label}`;
      btn.dataset.tile = tile;
      btn.addEventListener("click", () => {
        if (getTotalTileCount(state.handTiles, state.openMelds) >= MAX_HAND) return;
        const counts = createCounts(state.handTiles, state.openMelds);
        if (counts[tile] >= 4) return;
        pushHistory();
        state.handTiles.push(tile);
        renderAll();
      });
      container.appendChild(btn);
    }
  });
}

function initMeldForm() {
  elements.meldType.addEventListener("change", updateMeldStartOptions);
  elements.meldSuit.addEventListener("change", updateMeldStartOptions);
  updateMeldSuitOptions();
}

function updateMeldStartOptions() {
  const type = elements.meldType.value;
  const suit = elements.meldSuit.value;
  const offset = suitMeta[suit].offset;
  elements.meldStart.innerHTML = "";

  const maxStart = 9;
  for (let num = 1; num <= maxStart; num += 1) {
    const option = document.createElement("option");
    option.value = offset + num;
    option.textContent = `${num}${suitMeta[suit].label}`;
    elements.meldStart.appendChild(option);
  }
}

function buildMeldTiles(type, startTile) {
  if (type === "pong") return [startTile, startTile, startTile];
  if (type === "kong") return [startTile, startTile, startTile, startTile];
  return [];
}

function validateMeldTiles(tiles) {
  const counts = createCounts(state.handTiles, state.openMelds);
  const totalTiles = getTotalTileCount(state.handTiles, state.openMelds);
  if (totalTiles + tiles.length > MAX_HAND) {
    return "总牌数不能超过 13 张";
  }
  for (const tile of tiles) {
    if (tile < TILE_MIN || tile > TILE_MAX || tile % 10 === 0) {
      return "面子牌面非法";
    }
    if (counts[tile] + 1 > 4) {
      return "任一牌总数不能超过 4 张";
    }
    counts[tile] += 1;
  }
  return "";
}

function handleAddMeld() {
  elements.meldError.textContent = "";
  elements.meldForm.classList.remove("hidden");
}

function handleSaveMeld() {
  const type = elements.meldType.value;
  const startTile = Number(elements.meldStart.value);
  const tiles = buildMeldTiles(type, startTile);
  const error = validateMeldTiles(tiles);
  if (error) {
    elements.meldError.textContent = error;
    return;
  }

  pushHistory();
  state.openMelds.push({ type, tiles });
  elements.meldForm.classList.add("hidden");
  renderAll();
}

function handleClear() {
  pushHistory();
  state.handTiles = [];
  state.openMelds = [];
  state.dingque = "";
  renderAll();
}

function handleUndo() {
  if (state.history.length === 0) return;
  const snapshot = state.history.pop();
  restoreState(snapshot);
  renderAll();
}

function handleExample() {
  pushHistory();
  state.handTiles = [
    1, 1, 1,
    3, 4, 5, 6,
    12, 12,
    13, 13,
    14, 14,
  ];
  state.openMelds = [];
  state.dingque = "tiao";
  renderAll();
}

function bindEvents() {
  document.querySelectorAll(".dingque-buttons .btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      pushHistory();
      state.dingque = btn.dataset.dingque;
      renderAll();
    });
  });
  elements.btnClear.addEventListener("click", handleClear);
  elements.btnUndo.addEventListener("click", handleUndo);
  elements.btnExample.addEventListener("click", handleExample);
  elements.btnAddMeld.addEventListener("click", handleAddMeld);
  elements.btnSaveMeld.addEventListener("click", handleSaveMeld);
  elements.btnCancelMeld.addEventListener("click", () => {
    elements.meldForm.classList.add("hidden");
    elements.meldError.textContent = "";
  });
}

initTileButtons();
initMeldForm();
bindEvents();
renderAll();
