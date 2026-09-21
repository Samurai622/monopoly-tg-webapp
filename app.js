const tg = window.Telegram.WebApp;
  tg.expand();

  if (!tg.initDataUnsafe?.user) {
    alert("Відкрий гру через Telegram");
    throw new Error("No Telegram user");
  }

  const myTgId = Number(tg.initDataUnsafe.user.id);
  const urlParams = new URLSearchParams(window.location.search);
  const chatId = urlParams.get('chatId');

  if (!chatId) {
    alert("Немає chatId. Відкрий гру з групи / чату");
    throw new Error("No chatId");
  }
  const API = 'https://server-monopoly-tg-8um6.onrender.com';
  let isAnimatingMove = false;
  let pendingRoom = null;

  /* Масив клітинок */
  const cellsData = [
    {name:"Start", img:"images/start.png"},
    {name:"Marvel", img:"images/marvel.png", groupColor: "#9333ea", price: 120, rent: 12}, 
    {name:"Pixar", img:"images/pixar.png", groupColor: "#9333ea", price: 120, rent: 12},
    {name:"Task", img:"images/task(down).png"},
    {name:"GiveUser", img:"images/giveuser.png"}, 
    {name:"Audi", img:"images/audi.png", groupColor: "#475569", price: 1000, rent: 50, isAuto: true}, 
    {name:"Sprite", img:"images/sprite.png", groupColor: "#38bdf8", price: 250, rent: 25}, 
    {name:"Fanta", img:"images/fanta.png", groupColor: "#38bdf8", price: 220, rent: 22}, 
    {name:"Minecraft", img:"images/minecraft.png", groupColor: "#10b981", price: 500, rent: 30}, 
    {name:"CocaCola", img:"images/cocacola.png", groupColor: "#38bdf8", price: 190, rent: 19}, 
    {name:"Casino", img:"images/casino.png"}, 
    {name:"Starbucks", img:"images/starbucks.png", groupColor: "#db2777", price: 420, rent: 42}, 
    {name:"Task", img:"images/task(left).png"},
    {name:"Blue Bottle Coffee", img:"images/bluebottlecoffee.png", groupColor: "#db2777", price: 340, rent: 34},
    {name:"Lavazza", img:"images/lavazza.png", groupColor: "#db2777", price: 380, rent: 38},
    {name:"BMW", img:"images/bmw.png", groupColor: "#475569", price: 1000, rent: 50, isAuto: true}, 
    {name:"McDonalds", img:"images/mcdonalds.png", groupColor: "#f97316", price: 260, rent: 26}, 
    {name:"KFS", img:"images/kfs.png", groupColor: "#f97316", price: 220, rent: 22},
    {name:"Task", img:"images/task(left).png"},
    {name:"Pizza Hut", img:"images/pizza hut.png", groupColor: "#f97316", price: 200, rent: 20},
    {name:"Free Parking", img:"images/jail.png"}, 
    {name:"Telegram", img:"images/telegram.png", groupColor: "#ef4444", price: 420, rent: 42}, 
    {name:"WhatsApp", img:"images/whatsapp.png", groupColor: "#ef4444", price: 380, rent: 38},
    {name:"Instagram", img:"images/instagram.png", groupColor: "#ef4444", price: 400, rent: 40},
    {name:"Task", img:"images/task(down).png"},
    {name:"Lamborghini", img:"images/lamborghini.png", groupColor: "#475569", price: 1000, rent: 50, isAuto: true}, 
    {name:"Give to bank", img:"images/givebank.png"}, 
    {name:"Apple", img:"images/apple.png", groupColor: "#eab308", price: 600, rent: 40}, 
    {name:"Task", img:"images/task(down).png"},
    {name:"PlayStation", img:"images/ps.png", groupColor: "#eab308", price: 580, rent: 38},
    {name:"GoJail", img:"images/gojail.png"},
    {name:"Yakuza", img:"images/yakuza.png", groupColor: "#22c55e", price: 300, rent: 30}, 
    {name:"Assassin's Creed", img:"images/ac.png", groupColor: "#10b981", price: 500, rent: 30},
    {name:"Cosa Nostra", img:"images/cosa nostra.png", groupColor: "#22c55e", price: 320, rent: 32},
    {name:"Triads", img:"images/triads.png", groupColor: "#22c55e", price: 350, rent: 35},
    {name:"Mersedes-Benz", img:"images/mercedes-benz.png", groupColor: "#475569", price: 1000, rent: 50, isAuto: true}, 
    {name:"Gucci", img:"images/gucci.png", groupColor: "#1d4ed8", price: 350, rent: 35}, 
    {name:"Task", img:"images/task(right).png"},
    {name:"Nike", img:"images/nike.png", groupColor: "#1d4ed8", price: 400, rent: 40},
    {name:"Adidas", img:"images/adidas.png", groupColor: "#1d4ed8", price: 400, rent: 40}
  ];

  const board = document.getElementById("board");
  const cells = [];
  let currentProperties = []; 

  let actionCellId = null;
  let auctionData = { price: 0, winnerId: null, passed: [] };

  // ГЕНЕРАЦІЯ ПОЛЯ
  cellsData.forEach((data, i) => {
    data.id = i;
    const cell = document.createElement("div");
    cell.className = `cell`;
    cell.dataset.id = i;
    cell.style.backgroundImage = `url('${data.img}')`; 
    
    let colorBar = null;
    if (data.groupColor) {
      colorBar = document.createElement("div");
      colorBar.style.backgroundColor = data.groupColor;
      if (i >= 0 && i <= 10) colorBar.className = "color-bar bar-top"; 
      else if (i > 10 && i < 20) colorBar.className = "color-bar bar-right"; 
      else if (i >= 20 && i <= 30) colorBar.className = "color-bar bar-bottom"; 
      else colorBar.className = "color-bar bar-left"; 
      cell.appendChild(colorBar);
    }

    if (data.price) {
      const priceTag = document.createElement("div");
      priceTag.id = `price-${i}`;
      priceTag.className = "cell-price price-buy";
      priceTag.innerText = `$${data.price}`;
      
      if (colorBar) colorBar.appendChild(priceTag);
      else {
        priceTag.style.bottom = "2px"; priceTag.style.left = "50%";
        priceTag.style.transform = "translateX(-50%)"; cell.appendChild(priceTag);
      }
    }

    cell.addEventListener("click", () => {
      if (data.price || data.isAuto) openCellInfo(data);
    });

    cells.push(cell);
    board.appendChild(cell);
  });

  cells.forEach((cell, i) => {
    let row, col;
    if (i <= 10) { row = 11; col = 11 - i; } 
    else if (i <= 20) { row = 21 - i; col = 1; } 
    else if (i <= 30) { row = 1; col = i - 19; } 
    else { row = i - 29; col = 11; }
    cell.style.gridRow = row; cell.style.gridColumn = col;
  });

  let players = [];
  let myPlayerIndex = -1;
  const playersBox = document.getElementById("players");
  const rollBtn = document.getElementById("rollBtn");
  const diceResult = document.getElementById("diceResult");
  let currentTurn = 0;
  let currentTurnId = null;
  let currentTurnState = 'waiting_roll';
  let isRolling = false;

  // ОНОВЛЕННЯ ЦІННИКІВ ТА ЗІРОЧОК
  function updateBoardPrices() {
    document.querySelectorAll('.cell').forEach(c => {
      c.style.boxShadow = '';
      c.style.border = '1px solid #334155'; 
    });

    cellsData.forEach((data, i) => {
      if (!data.price) return;
      const priceTag = document.getElementById(`price-${i}`);
      if (!priceTag) return;
      
      const property = currentProperties.find(p => p.cell_id === i);
      
      if (property) {
        const owner = players.find(p => p.db_id === property.owner_id);
        const cell = document.querySelector(`[data-id='${i}']`);
        
        if (property.is_mortgaged) {
          priceTag.innerText = `🔒 Застава`;
          priceTag.className = "cell-price";
          priceTag.style.color = "#94a3b8"; 
          if (owner && cell) {
            cell.style.boxShadow = `inset 0 0 0 4px ${owner.color}`;
            cell.style.border = `2px dashed ${owner.color}`; 
          }
        } else {
          // РАХУЄМО ПОТОЧНУ ОРЕНДУ І МАЛЮЄМО ЗІРОЧКИ
          let currentRent = data.rent;
          const lvl = property.level || 0;
          let lvlStars = "";

          if (data.isAuto) {
            const autosOwned = currentProperties.filter(p => p.owner_id === property.owner_id && cellsData[p.cell_id].isAuto).length;
            const mult = [0, 1, 2, 4, 8];
            currentRent = data.rent * mult[autosOwned];
          } else {
            if (lvl === 0) {
              const groupCells = cellsData.filter(c => c.groupColor === data.groupColor).map(c => c.id);
              const ownedIds = currentProperties.filter(p => p.owner_id === property.owner_id).map(p => p.cell_id);
              const hasMonopoly = groupCells.every(id => ownedIds.includes(id));
              if (hasMonopoly) currentRent = data.rent * 2;
            } else if (lvl === 1) { currentRent = data.rent * 3; lvlStars = "⭐ "; }
            else if (lvl === 2) { currentRent = data.rent * 8; lvlStars = "⭐⭐ "; }
            else if (lvl === 3) { currentRent = data.rent * 15; lvlStars = "⭐⭐⭐ "; }
            else if (lvl === 4) { currentRent = data.rent * 25; lvlStars = "⭐⭐⭐⭐ "; }
            else if (lvl === 5) { currentRent = data.rent * 40; lvlStars = "👑 "; }
          }

          priceTag.innerText = `${lvlStars}$${currentRent}`;
          priceTag.className = "cell-price price-rent";
          priceTag.style.color = ""; 
          if (owner && cell) {
            cell.style.boxShadow = `inset 0 0 0 4px ${owner.color}`;
            cell.style.border = `1px solid #334155`; 
          }
        }
      } else {
        priceTag.innerText = `$${data.price}`;
        priceTag.className = "cell-price price-buy";
        priceTag.style.color = "";
        const cell = document.querySelector(`[data-id='${i}']`);
        if (cell) cell.style.border = `1px solid #334155`; 
      }
    });
  }

  // ВІДКРИТТЯ ВІКНА + КНОПКА ПОКРАЩЕННЯ
  function openCellInfo(data) {
    document.getElementById("modalHeader").style.backgroundColor = data.groupColor || "#334155";
    document.getElementById("modalTitle").innerText = data.name;
    document.getElementById("modalPrice").innerText = `$${data.price}`;
    
    if (data.isAuto) {
      document.getElementById("modalRent").innerText = `$${data.rent} (за 1 авто)`;
      document.getElementById("modalRent1").innerText = `$${data.rent * 2} (за 2 авто)`;
      document.getElementById("modalRent2").innerText = `$${data.rent * 4} (за 3 авто)`;
      document.getElementById("modalRent3").innerText = `$${data.rent * 8} (за 4 авто)`;
      document.getElementById("modalRent4").innerText = `-`;
      document.getElementById("modalRentMax").innerText = `-`;
    } else {
      document.getElementById("modalRent").innerText = `$${data.rent}`;
      document.getElementById("modalRent1").innerText = `$${data.rent * 3}`;
      document.getElementById("modalRent2").innerText = `$${data.rent * 8}`;
      document.getElementById("modalRent3").innerText = `$${data.rent * 15}`;
      document.getElementById("modalRent4").innerText = `$${data.rent * 25}`;
      document.getElementById("modalRentMax").innerText = `$${data.rent * 40}`;
    }

    const controlsDiv = document.getElementById("modalPropertyControls");
    const mortgageBtn = document.getElementById("modalMortgageBtn");
    const unmortgageBtn = document.getElementById("modalUnmortgageBtn");
    const sellBtn = document.getElementById("modalSellBtn");
    
    // Додаємо кнопку UPGRADE, якщо її ще немає
    let upgradeBtn = document.getElementById("modalUpgradeBtn");
    if (!upgradeBtn) {
      upgradeBtn = document.createElement("button");
      upgradeBtn.id = "modalUpgradeBtn";
      upgradeBtn.className = "action-btn";
      upgradeBtn.style.background = "#3b82f6"; 
      controlsDiv.insertBefore(upgradeBtn, mortgageBtn);
    }
    upgradeBtn.style.display = "none";
    
    const property = currentProperties.find(p => p.cell_id === data.id);
    const me = players[myPlayerIndex];

    if (property && me && String(property.owner_id) === String(me.db_id)) {
      controlsDiv.style.display = "flex";
      
      const halfPrice = Math.floor(data.price / 2);
      const unmortgageCost = Math.floor(halfPrice * 1.1);

      sellBtn.innerText = `💵 Продати банку ($${halfPrice})`;
      
      if (property.is_mortgaged) {
        mortgageBtn.style.display = "none";
        unmortgageBtn.style.display = "block";
        unmortgageBtn.innerText = `🔓 Викупити ($${unmortgageCost})`;
      } else {
        mortgageBtn.style.display = "block";
        unmortgageBtn.style.display = "none";
        mortgageBtn.innerText = `🔒 Заставити (+$${halfPrice})`;

        // ПЕРЕВІРКА НА МОНОПОЛІЮ ДЛЯ ПРОКАЧКИ
        if (!data.isAuto) {
          const groupCells = cellsData.filter(c => c.groupColor === data.groupColor).map(c => c.id);
          const ownedIds = currentProperties.filter(p => p.owner_id === me.db_id).map(p => p.cell_id);
          const hasMonopoly = groupCells.every(id => ownedIds.includes(id));
          const lvl = property.level || 0;

          if (hasMonopoly && lvl < 5) {
            upgradeBtn.style.display = "block";
            upgradeBtn.innerText = `⬆️ Покращити ($${halfPrice})`;
            upgradeBtn.onclick = () => sendPropertyAction('upgrade', data.id);
          }
        }
      }

      mortgageBtn.onclick = () => sendPropertyAction('mortgage', data.id);
      unmortgageBtn.onclick = () => sendPropertyAction('unmortgage', data.id);
      sellBtn.onclick = () => {
        tg.showConfirm(`Продати назавжди за $${halfPrice}?`, (confirmed) => {
          if (confirmed) sendPropertyAction('sell_property', data.id);
        });
      };
    } else {
      controlsDiv.style.display = "none";
    }

    document.getElementById("cellModal").style.display = "flex";
  }

  const closeBtn = document.getElementById("closeModalBtn");
  if(closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.getElementById("cellModal").style.display = "none";
    });
  }

  async function sendPropertyAction(endpoint, cellId) {
    try {
      const r = await fetch(`${API}/room/${chatId}/${endpoint}`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ playerId: myTgId, cellId })
      });
      if (!r.ok) {
        const err = await r.json(); tg.showAlert(err.error || "Помилка"); return;
      }
      document.getElementById("cellModal").style.display = "none";
      await syncRoom();
    } catch (e) { console.error(e); }
  }

  function renderPlayers() {
    playersBox.querySelectorAll(".player").forEach(p => p.remove());
    document.querySelectorAll(".token").forEach(t => t.remove());

    players.forEach((p, i) => {
      const div = document.createElement("div");
      const isTurn = currentTurnId && String(p.id) === String(currentTurnId);
      div.className = "player" + (isTurn ? " active" : "");
      div.style.borderLeftColor = p.active ? p.color : 'gray';  
      div.style.opacity = p.active ? 1 : 0.5;

      div.innerHTML = `<b>${p.name}</b><div class="money">💰 ${p.money}</div>`;
      playersBox.appendChild(div);

      const sameCellPlayers = players.filter(pl => pl.pos === p.pos);
      const index = sameCellPlayers.indexOf(p);
      addToken(p.pos, p.active ? p.color : 'gray', index);
    });

    updateActionButtons();
    updateAuctionUI(); 
  }

  function addToken(cellId, color, indexInCell) {
    const cell = document.querySelector(`[data-id='${cellId}']`);
    if (!cell) return;
    const token = document.createElement("div");
    token.className = `token`;
    token.style.backgroundColor = color;
    
    const offsetX = 4 + (indexInCell % 2) * 14; 
    const offsetY = 4 + Math.floor(indexInCell / 2) * 14;
    
    token.style.left = offsetX + "px"; token.style.top = offsetY + "px";
    token.style.zIndex = "20";
    cell.appendChild(token);
  }

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  rollBtn.addEventListener("click", async () => {
    if (isRolling || !currentTurnId || currentTurnState !== 'waiting_roll' || String(currentTurnId) !== String(myTgId)) return;
    isRolling = true;
    try {
      const d1 = rand(1,6); const d2 = rand(1,6); const steps = d1 + d2;
      diceResult.innerText = `🎲 ${d1} + ${d2} = ${steps}`;
      
      const r = await fetch(`${API}/room/${chatId}/move`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ playerId: Number(myTgId), steps })
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        tg.showAlert(err.error || "Помилка ходу"); return;
      }
      const data = await r.json();
      if (data.bonus > 0) tg.showAlert(`🎉 Ви отримали бонус: $${data.bonus}!`);
      await syncRoom();
    } finally { isRolling = false; }
  });

  async function connectToServer() {
    try {
      await fetch(`${API}/room/${chatId}/join`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id: String(myTgId), name: tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name })
      });
    } catch (e) {}
    const res = await fetch(`${API}/room/${chatId}/state`);
    if(!res.ok) { document.body.innerHTML = `<h1 style="text-align:center;margin-top:50px;">⛔ Гру завершено</h1>`; return; }
    const room = await res.json();
    await applyRoom(room);
  }

  async function syncRoom() {
    try {
      const res = await fetch(`${API}/room/${chatId}/state`);
      if(!res.ok) return;
      const room = await res.json();

      if (room.status === 'stopped') {
        document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#020617;color:white;">
            <h1>⛔ Гру завершено</h1>
            <h2 style="color:#38bdf8;">🏆 Переміг: ${room.winnerName || 'Невідомо'}</h2>
        </div>`;
        return;
      }
      if (!room.players) return;
      if (isAnimatingMove) { pendingRoom = room; return; }
      await applyRoom(room);
    } catch (e) { console.error(e); }
  }

  async function applyRoom(room) {
    if (players.length === 0) {
      players = room.players.map(p => ({ ...p, id: Number(p.id) }));
      currentTurn = Number(room.currentTurn);
      currentTurnId = room.currentTurnId ? String(room.currentTurnId) : null;
      myPlayerIndex = players.findIndex(p => p.id === Number(myTgId));
      currentTurnState = room.turnState || 'waiting_roll';
      currentProperties = room.properties || [];
      actionCellId = room.actionCellId !== null ? Number(room.actionCellId) : null;
      auctionData.price = Number(room.auctionPrice || 0);
      auctionData.winnerId = room.auctionWinnerId ? Number(room.auctionWinnerId) : null;
      auctionData.passed = room.auctionPassed || [];

      updateBoardPrices();
      renderPlayers();
      return;
    }

    isAnimatingMove = true;
    await animateTo(room.players);
    currentTurn = Number(room.currentTurn);
    currentTurnId = room.currentTurnId ? String(room.currentTurnId) : null;
    myPlayerIndex = players.findIndex(p => p.id === Number(myTgId));
    currentTurnState = room.turnState || 'waiting_roll';
    currentProperties = room.properties || [];
    actionCellId = room.actionCellId !== null ? Number(room.actionCellId) : null;
    auctionData.price = Number(room.auctionPrice || 0);
    auctionData.winnerId = room.auctionWinnerId ? Number(room.auctionWinnerId) : null;
    auctionData.passed = room.auctionPassed || [];
    
    for (const sp of room.players) {
      const p = players.find(pl => pl.id === Number(sp.id));
      if (!p) continue;
      p.pos = Number(sp.pos); p.money = sp.money; p.active = sp.active; p.color = sp.color;
    }
    isAnimatingMove = false;

    updateBoardPrices();
    renderPlayers();

    if (pendingRoom) {
      const r = pendingRoom; pendingRoom = null; await applyRoom(r);
    }
  }

  async function animateTo(serverPlayers) {
    for (const sp of serverPlayers) {
      const p = players.find(pl => pl.id === Number(sp.id));
      if (!p) continue;
      const spPos = Number(sp.pos);
      let steps = (spPos - p.pos + 40) % 40;
      for (let s = 0; s < steps; s++) {
        p.pos = (p.pos + 1) % 40; renderPlayers(); await sleep(200);
      }
    }
  }

  function updateActionButtons() {
    const me = players[myPlayerIndex];
    if(!me) return;
    const isMyTurn = currentTurnId && String(currentTurnId) === String(myTgId);
    const canAct = isMyTurn && me.active;

    document.getElementById("surrenderBtn").style.display = me.active ? "inline-block" : "none";
    document.getElementById("tradeBtn").style.display = canAct ? "inline-block" : "none";

    const rollBtn = document.getElementById("rollBtn");
    const endTurnBtn = document.getElementById("endTurnBtn");
    const decisionPanel = document.getElementById("decisionPanel");
    const buyBtn = document.getElementById("buyBtn");
    const auctionBtn = document.getElementById("auctionBtn");
    const payBtn = document.getElementById("payBtn");

    rollBtn.style.display = "none"; endTurnBtn.style.display = "none";
    decisionPanel.style.display = "none"; buyBtn.style.display = "none";
    auctionBtn.style.display = "none"; payBtn.style.display = "none";

    if (canAct) {
      if (currentTurnState === 'waiting_roll') rollBtn.style.display = "block";
      else if (currentTurnState === 'can_end') endTurnBtn.style.display = "block";
      else if (currentTurnState === 'must_buy') {
        decisionPanel.style.display = "flex"; buyBtn.style.display = "block"; auctionBtn.style.display = "block";
      } else if (currentTurnState === 'must_pay') {
        decisionPanel.style.display = "flex"; payBtn.style.display = "block";
      } else if (currentTurnState === 'casino_action') {
        endTurnBtn.style.display = "block"; diceResult.innerText = "🎰 Ставки поки що не працюють. Завершуй хід.";
      }
    }
  }

  function updateAuctionUI() {
    const auctionModal = document.getElementById("auctionModal");
    const me = players[myPlayerIndex];

    if (currentTurnState === 'auction' && me) {
      auctionModal.style.display = "flex";
      document.getElementById("auctionCurrentPrice").innerText = `$${auctionData.price}`;
      
      const leader = players.find(p => p.db_id === auctionData.winnerId);
      document.getElementById("auctionLeader").innerText = leader ? leader.name : "Поки нікого";
      
      const amIPassed = auctionData.passed.includes(me.db_id);
      const amILeader = (me.db_id === auctionData.winnerId);
      
      const activePlayersCount = players.filter(p => p.active).length;
      const amILastOne = (auctionData.passed.length >= activePlayersCount - 1) && !amIPassed;
      
      const bidInput = document.getElementById("auctionBidInput");
      const makeBidBtn = document.getElementById("auctionMakeBidBtn");
      const passBtn = document.getElementById("auctionPassBtn");
      const itemName = document.getElementById("auctionItemName");

      if (actionCellId !== null && cellsData[actionCellId]) {
        itemName.innerText = cellsData[actionCellId].name;
      }

      if (amIPassed) {
        bidInput.style.display = "none"; makeBidBtn.style.display = "none"; passBtn.style.display = "none";
        itemName.innerText = "❌ Ви не берете участі у торгах.";
      } else if (amILeader) {
        bidInput.style.display = "none"; makeBidBtn.style.display = "none"; passBtn.style.display = "none";
        itemName.innerText = "👑 Ваша ставка найвища!";
      } else if (amILastOne && auctionData.winnerId === null) {
        bidInput.style.display = "none"; makeBidBtn.style.display = "block"; passBtn.style.display = "block";
        itemName.innerText = "Суперник відмовився. Берете?";
        makeBidBtn.innerText = `Купити за $${auctionData.price}`;
        passBtn.innerText = "Відмовитись";
        makeBidBtn.dataset.exactBid = auctionData.price; 
      } else {
        bidInput.style.display = "block"; makeBidBtn.style.display = "block"; passBtn.style.display = "block";
        makeBidBtn.innerText = "Поставити"; passBtn.innerText = "Пас (Вийти)";
        bidInput.placeholder = `Більше $${auctionData.price}...`;
        makeBidBtn.dataset.exactBid = ""; 
      }
    } else {
      auctionModal.style.display = "none";
    }
  }

  document.getElementById('auctionBtn').addEventListener('click', async () => {
    if(!currentTurnId || String(currentTurnId) !== String(myTgId)) return;
    try {
      const r = await fetch(`${API}/room/${chatId}/start_auction`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ playerId: myTgId })
      });
      if(!r.ok) { const err = await r.json(); tg.showAlert(err.error || "Помилка сервера"); return; }
      await syncRoom();
    } catch (e) { console.error(e); }
  });

  document.getElementById('auctionMakeBidBtn').addEventListener('click', async (e) => {
    let amount;
    if (e.target.dataset.exactBid) {
      amount = Number(e.target.dataset.exactBid);
    } else {
      const input = document.getElementById('auctionBidInput');
      amount = Number(input.value);
      if (!amount || amount <= auctionData.price) {
        tg.showAlert("Ставка має бути більшою за поточну ціну!"); return;
      }
    }
    
    try {
      const r = await fetch(`${API}/room/${chatId}/auction_bid`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ playerId: myTgId, amount })
      });
      if (!r.ok) { const err = await r.json(); tg.showAlert(err.error || "Помилка ставки"); return; }
      document.getElementById('auctionBidInput').value = '';
      await syncRoom();
    } catch (err) { console.error(err); }
  });

  document.getElementById('auctionPassBtn').addEventListener('click', async () => {
    try {
      const r = await fetch(`${API}/room/${chatId}/auction_pass`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ playerId: myTgId })
      });
      if (!r.ok) { const err = await r.json(); tg.showAlert(err.error || "Помилка"); return; }
      await syncRoom();
    } catch (e) { console.error(e); }
  });

  document.getElementById('buyBtn').addEventListener('click', async () => {
    if(!currentTurnId || String(currentTurnId) !== String(myTgId)) return;
    try {
      const r = await fetch(`${API}/room/${chatId}/buy`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ playerId: myTgId })
      });
      if(!r.ok) { const err = await r.json(); tg.showAlert(err.error || "Помилка при покупці."); return; }
      await syncRoom();
    } catch (e) { console.error(e); }
  });

  document.getElementById('payBtn').addEventListener('click', async () => {
    if(!currentTurnId || String(currentTurnId) !== String(myTgId)) return;
    try {
      const r = await fetch(`${API}/room/${chatId}/pay`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ playerId: myTgId })
      });
      if(!r.ok) { const err = await r.json(); tg.showAlert(err.error || "Помилка при оплаті."); return; }
      const data = await r.json(); tg.showAlert(`Ви успішно заплатили $${data.amountToPay}`);
      await syncRoom();
    } catch (e) { console.error(e); }
  });

  document.getElementById('endTurnBtn').addEventListener('click', async () => {
    if(!currentTurnId || String(currentTurnId) !== String(myTgId)) return;
    try {
      const r = await fetch(`${API}/room/${chatId}/end_turn`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ playerId: myTgId })
      });
      diceResult.innerText = ""; await syncRoom();
    } catch (e) { console.error(e); }
  });

  document.getElementById('surrenderBtn').addEventListener('click', () => {
    if(!currentTurnId || String(currentTurnId) !== String(myTgId)) return;
    tg.showConfirm("Ви дійсно хочете здатися?", async (confirmed) => {
      if (!confirmed) return;
      try {
        await fetch(`${API}/room/${chatId}/surrender`, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ playerId: myTgId})
        });
        await syncRoom();
      } catch (e) { console.error(e); }
    });
  });

  document.getElementById('tradeBtn').addEventListener('click', () => alert("В розробці"));

  connectToServer();
  setInterval(syncRoom, 2000);