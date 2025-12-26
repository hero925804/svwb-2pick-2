/**
 * Shadowverse 2Pick Simulator - Core Logic (Ver. Probability Control)
 */

let cardPool = []; 
const classes = ["精靈", "皇家", "巫師", "龍族", "夜魔", "主教", "復仇者"];
const rarityPriority = { "銅": 1, "銀": 2, "金": 3, "虹": 4 };

let state = {
    currentClass: "",
    deck: [],
    round: 1,      
    rerolls: 3,
    currentOptions: [], 
    isFinished: false
};

const roundRules = {
    0: { "虹": 80, "金": 20 }, 
    1: { "銅": 100 },
    2: { "銀": 100 }, 
    3: { "金": 100 },
    4: { "虹": 50, "金": 50 }, 
    5: { "銅": 50, "銀": 50 }, 
    6: { "銀": 50, "金": 50 },
    7: { "銅": 80, "銀": 20 }, 
    8: { "銀": 80, "金": 20 }, 
    9: { "銀": 60, "金": 40 },
    10: { "銅": 65, "金": 22, "銀": 10, "虹": 3 },
    11: { "銀": 65, "銅": 20, "金": 12, "虹": 3 },
    12: { "金": 67, "銀": 20, "銅": 10, "虹": 3 },
    13: { "銅": 80, "銀": 20 , "虹": 1 }, 
    14: { "銀": 70, "金": 30 , "虹": 1 }, 
    15: { "銀": 59, "金": 40 , "虹": 1 },
    16: { "銅": 80, "銀": 20 }, 
    17: { "銀": 80, "銅": 20 }, 
    18: { "金": 80, "銀": 20 },
    19: { "虹": 80, "金": 20 },
    "reroll": { "銅": 5, "銀": 15, "金": 65, "虹": 15 }
};

const placeholderCard = { name: "暫無資料", cost: 0, rarity: "銅", class: "中立", image: "" };

async function loadGameData() {
    try {
        const response = await fetch('data/cards.json');
        if (!response.ok) throw new Error("無法取得 JSON");
        cardPool = await response.json();
        renderClassSelection();
    } catch (error) {
        console.error("載入失敗:", error);
    }
}

function getRarityByWeight(weights) {
    let rand = Math.random() * 100;
    let sum = 0;
    for (let r in weights) {
        sum += weights[r];
        if (rand <= sum) return r;
    }
    return "銅";
}

/**
 * 具備機率控制的抽卡邏輯
 */
function getRandomCard(rarity, playerClass, excludeCards = [], allowNeutral = true) {
    if (!cardPool.length) return { ...placeholderCard };

    // --- 修改這裡的數值來控制中立卡出現機率 (0.1 = 10%) ---
    const neutralRate = 0.05; 
    // --------------------------------------------------

    const getCountInDeck = (name) => state.deck.filter(c => c.name === name).length;
    const isExcluded = (name) => excludeCards.some(c => c && c.name === name);

    // 決定這次要不要「嘗試」抽中立卡
    const shouldTryNeutral = allowNeutral && Math.random() < neutralRate;
    
    let pool = [];

    if (shouldTryNeutral) {
        // 從中立池篩選
        pool = cardPool.filter(c => 
            c.class === "中立" && 
            c.rarity === rarity && 
            !isExcluded(c.name)
        );
    }

    // 如果不打算抽中立卡，或者中立池剛好沒卡，則從職業池抽
    if (pool.length === 0) {
        pool = cardPool.filter(c => 
            c.class === playerClass && 
            c.rarity === rarity && 
            getCountInDeck(c.name) < 3 && 
            !isExcluded(c.name)
        );
    }

    // 極端保底：如果連職業池都沒卡（例如特定稀有度不夠），則混在一起抽
    if (pool.length === 0) {
        pool = cardPool.filter(c => 
            (c.class === playerClass || (allowNeutral && c.class === "中立")) && 
            c.rarity === rarity && 
            !isExcluded(c.name)
        );
    }

    return pool[Math.floor(Math.random() * pool.length)] || placeholderCard;
}

function sortDeck(cards) {
    return [...cards].sort((a, b) => {
        if (a.cost !== b.cost) return a.cost - b.cost;
        if (a.rarity !== b.rarity) return rarityPriority[a.rarity] - rarityPriority[b.rarity];
        return a.name.localeCompare(b.name, 'zh-Hant');
    });
}

function renderCard(card, showBadge = true) {
    if (!card) return "";
    const imgSrc = card.image || 'https://placehold.co/140x180?text=No+Image';
    const currentOwned = state.deck.filter(c => c.name === card.name).length;
    const badge = (showBadge && currentOwned > 0) ? `<div class="card-count-badge">持有: ${currentOwned}</div>` : '';
    
    return `
        <div class="card-item rarity-border-${card.rarity}">
            <div class="card-img-wrapper">
                <img src="${imgSrc}" alt="${card.name}" onerror="this.src='https://placehold.co/140x180?text=No+Image'">
                <div class="card-rarity-tag rarity-${card.rarity}">${card.rarity}</div>
                ${badge}
            </div>
            <div class="card-info">
                <div class="card-name">${card.name}</div>
                <div class="card-cost">Cost: ${card.cost}</div>
            </div>
        </div>
    `;
}

function renderClassSelection() {
    const container = document.getElementById('game-view');
    container.scrollTop = 0;
    container.innerHTML = '<h2>請選擇職業</h2><div class="class-selection"></div>';
    const grid = container.querySelector('.class-selection');

    classes.forEach(cls => {
        const r1 = getRarityByWeight(roundRules[0]);
        // allowNeutral 設為 false，確保初始不出現中立
        const card1 = getRandomCard(r1, cls, [], false); 
        const r2 = getRarityByWeight(roundRules[0]);
        const card2 = getRandomCard(r2, cls, [card1], false);

        const classBox = document.createElement('div');
        classBox.className = 'class-card';
        classBox.innerHTML = `
            <h3>${cls}</h3>
            <div class="class-preview-cards">
                ${renderCard(card1, false)}
                ${renderCard(card2, false)}
            </div>
        `;
        classBox.onclick = () => startDraft(cls, [card1, card2]);
        grid.appendChild(classBox);
    });
}

function startDraft(cls, initialCards) {
    state.currentClass = cls;
    state.round = 1;
    state.deck = [...initialCards];
    state.rerolls = 3;
    document.getElementById('info-bar').classList.remove('hidden');
    document.getElementById('player-class').innerText = cls;
    document.getElementById('reroll-count').innerText = state.rerolls;
    generateDraftOptions();
}

function generateDraftOptions() {
    const weights = roundRules[state.round];
    state.currentOptions = [];
    for (let i = 0; i < 4; i++) {
        const rarity = getRarityByWeight(weights);
        const card = getRandomCard(rarity, state.currentClass, state.currentOptions);
        state.currentOptions.push(card);
    }
    renderDraftView();
}

function renderDraftView() {
    const container = document.getElementById('game-view');
    container.scrollTop = 0; 

    container.innerHTML = `
        <div class="draft-header">
            <h2>第 ${state.round} / 19 回合 (目前牌組: ${state.deck.length} / 40)</h2>
        </div>
        <div class="draft-container">
            <div class="pair-box" onclick="pickPair(0, 1)">
                ${renderCard(state.currentOptions[0])}
                ${renderCard(state.currentOptions[1])}
            </div>
            <div class="vs-divider">VS</div>
            <div class="pair-box" onclick="pickPair(2, 3)">
                ${renderCard(state.currentOptions[2])}
                ${renderCard(state.currentOptions[3])}
            </div>
        </div>
        <div class="control-panel">
            <button class="btn" onclick="handleReroll()" ${state.rerolls <= 0 ? 'disabled' : ''}>
                重新抽取 (剩餘 ${state.rerolls} 次)
            </button>
        </div>
    `;
    updateSidebar();
}

function pickPair(idx1, idx2) {
    state.deck.push(state.currentOptions[idx1], state.currentOptions[idx2]);
    if (state.round >= 19) renderResult();
    else { state.round++; generateDraftOptions(); }
}

function handleReroll() {
    if (state.rerolls > 0) {
        state.rerolls--;
        document.getElementById('reroll-count').innerText = state.rerolls;
        let newOpts = [];
        for (let i = 0; i < 4; i++) {
            const rarity = getRarityByWeight(roundRules.reroll);
            newOpts.push(getRandomCard(rarity, state.currentClass, newOpts));
        }
        state.currentOptions = newOpts;
        renderDraftView();
    }
}

function updateSidebar() {
    const curveContainer = document.getElementById('mana-curve');
    const deckPreview = document.getElementById('deck-preview');
    const progressText = document.getElementById('progress');
    const costs = new Array(9).fill(0); 

    curveContainer.innerHTML = '';
    deckPreview.innerHTML = '';
    if(progressText) progressText.innerText = state.deck.length;
    document.getElementById('deck-count').innerText = state.deck.length;

    const sortedList = sortDeck(state.deck);

    sortedList.forEach(card => {
        costs[card.cost >= 8 ? 8 : card.cost]++;
        const div = document.createElement('div');
        div.className = `deck-list-item rarity-${card.rarity}`;
        div.innerHTML = `<span>${card.cost}</span> ${card.name}`;
        deckPreview.appendChild(div);
    });

    costs.forEach((count, i) => {
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = `${Math.min(count * 15, 100)}px`;
        bar.setAttribute('data-cost', i === 8 ? '8+' : i);
        if(count > 0) bar.innerHTML = `<span class="bar-count">${count}</span>`;
        curveContainer.appendChild(bar);
    });
}

function renderResult() {
    state.isFinished = true;
    updateSidebar();
    const container = document.getElementById('game-view');
    container.scrollTop = 0;

    const finalSortedDeck = sortDeck(state.deck);
    
    container.innerHTML = `
        <div class="result-page">
            <div style="text-align:center; padding-bottom:20px;">
                <h2>選牌完成！總計 ${state.deck.length} 張</h2>
                <button class="btn" onclick="location.reload()">重新開始</button>
            </div>
            <div class="final-deck-grid">
                ${finalSortedDeck.map(c => renderCard(c, false)).join('')}
            </div>
        </div>
    `;
}


loadGameData();

