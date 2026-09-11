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

  /* Масив клітинок з назвами і фон-картинками */
  const cellsData = [
  {name:"Start", img:"images/start.png"},
  {name:"Marvel", img:"images/marvel.png", groupColor:"#9333ea"},
  {name:"Pixar", img:"images/pixar.png", groupColor:"#9333ea"},
  {name:"Task", img:"images/task(down).png"},
  {name:"GiveUser", img:"images/giveuser.png"},
  {name:"Audi", img:"images/audi.png", groupColor:"#475569"},
  {name:"Sprite", img:"images/sprite.png", groupColor:"#38bdf8"},
  {name:"Fanta", img:"images/fanta.png", groupColor:"#38bdf8"},
  {name:"Minecraft", img:"images/minecraft.png", groupColor:"#10b981"},
  {name:"CocaCola", img:"images/cocacola.png", groupColor:"#38bdf8"},

  {name:"Casino", img:"images/casino.png"},
  {name:"Starbucks", img:"images/starbucks.png", groupColor:"#db2777"},
  {name:"Task", img:"images/task(left).png"},
  {name:"Blue Bottle Coffee", img:"images/bluebottlecoffee.png", groupColor:"#db2777"},
  {name:"Lavazza", img:"images/lavazza.png", groupColor:"#db2777"},
  {name:"BMW", img:"images/bmw.png", groupColor:"#475569"},
  {name:"McDonalds", img:"images/mcdonalds.png", groupColor:"#f97316"},
  {name:"KFS", img:"images/kfs.png", groupColor:"#f97316"},
  {name:"Task", img:"images/task(left).png"},
  {name:"Pizza Hut", img:"images/pizza hut.png", groupColor:"#f97316"},

  {name:"Jail", img:"images/jail.png"},
  {name:"Telegram", img:"images/telegram.png", groupColor:"#ef4444"},
  {name:"WhatsApp", img:"images/whatsapp.png", groupColor:"#ef4444"},
  {name:"Instagram", img:"images/instagram.png", groupColor:"#ef4444"},
  {name:"Task", img:"images/task(down).png"},
  {name:"Lamborghini", img:"images/lamborghini.png", groupColor:"#475569"},
  {name:"Give to bank", img:"images/givebank.png"},
  {name:"Apple", img:"images/apple.png", groupColor:"#eab308"},
  {name:"Task", img:"images/task(down).png"},
  {name:"PlayStation", img:"images/ps.png", groupColor:"#eab308"},

  {name:"GoJail", img:"images/gojail.png",},
  {name:"Yakuza", img:"images/yakuza.png", groupColor:"#22c55e"},
  {name:"Assassin's Creed", img:"images/ac.png", groupColor:"#10b981"},
  {name:"Cosa Nostra", img:"images/cosa nostra.png", groupColor:"#22c55e"},
  {name:"Triads", img:"images/triads.png", groupColor:"#22c55e"},
  {name:"Mersedes-Benz", img:"images/mercedes-benz.png", groupColor:"#475569"},
  {name:"Gucci", img:"images/gucci.png", groupColor:"#1d4ed8"},
  {name:"Task", img:"images/task(right).png"},
  {name:"Nike", img:"images/nike.png", groupColor:"#1d4ed8"},
  {name:"Adidas", img:"images/adidas.png", groupColor:"#1d4ed8"},
  ];

  const board = document.getElementById("board");
  const cells = [];


  cellsData.forEach((data, i) => {
    const cell = document.createElement("div");
    cell.className = `cell`;
    cell.dataset.id = i;
    cell.style.backgroundImage = `url('${data.img}')`; // фонова картинка
    
    // Додаємо кольорову смужку, яка "дивиться" в центр
    if (data.groupColor) {
      const colorBar = document.createElement("div");
      colorBar.style.backgroundColor = data.groupColor;
      
      if (i >= 0 && i <= 10) {
        // Нижній ряд (0-10) -> смужка зверху
        colorBar.className = "color-bar bar-top"; 
      } else if (i > 10 && i < 20) {
        // Лівий ряд (11-19) -> смужка справа
        colorBar.className = "color-bar bar-right"; 
      } else if (i >= 20 && i <= 30) {
        // Верхній ряд (20-30) -> смужка знизу
        colorBar.className = "color-bar bar-bottom"; 
      } else {
        // Правий ряд (31-39) -> смужка зліва
        colorBar.className = "color-bar bar-left"; 
      }
      
      cell.appendChild(colorBar);
    }

    cells.push(cell);
    board.appendChild(cell);
  });

  /* Розкладка клітинок по 11x11 */
  cells.forEach((cell, i) => {
    let row, col;

    if (i <= 10) {             // низ
        row = 11;
        col = 11 - i;
    } else if (i <= 20) {      // ліво
        row = 21 - i;
        col = 1;
    } else if (i <= 30) {      // верх
        row = 1;
        col = i - 19;
    } else {                   // право
        row = i - 29;
        col = 11;
    }

    cell.style.gridRow = row;
    cell.style.gridColumn = col;
  });
  let players = [
  ]
  let myPlayerIndex = -1;
  const playersBox = document.getElementById("players");
  const rollBtn = document.getElementById("rollBtn");
  const diceResult = document.getElementById("diceResult");
  let currentTurn = 0;
  let currentTurnId = null;
  let currentTurnState = 'waiting_roll';

  function renderPlayers() {
    playersBox.querySelectorAll(".player").forEach(p => p.remove());
    diceResult.innerText = "";

    document.querySelectorAll(".token").forEach(t => t.remove());

    players.forEach((p, i) => {
      const div = document.createElement("div");
      const isTurn = currentTurnId && String(p.id) === String(currentTurnId);
      div.className = "player" + (isTurn ? " active" : "");
      div.style.borderLeftColor = p.active ? p.color : 'gray';  
      div.style.opacity = p.active ? 1 : 0.5;

      div.innerHTML = `
        <b>${p.name}</b>
        <div class="money">💰 ${p.money}</div>
        `;

      playersBox.appendChild(div);

      const sameCellPlayers = players.filter(pl => pl.pos === p.pos);
      const index = sameCellPlayers.indexOf(p);
      addToken(p.pos, p.active ? p.color : 'gray', index);
    });

    updateActionButtons();
  }

  /* Тестові фішки */
  function addToken(cellId, color, indexInCell) {
  const cell = document.querySelector(`[data-id='${cellId}']`);
  if (!cell) return;

  const token = document.createElement("div");
  token.className = `token ${color}`;

  const offset = indexInCell * 8;
  token.style.left = offset + "px";
  token.style.top = offset + "px";

  cell.appendChild(token);
  }

  rollBtn.addEventListener("click", rollDice);
  let isRolling = false;

  async function rollDice() {
    if (isRolling) {
      return;
    }
    

    if(!currentTurnId) return;
    if (currentTurnState !== 'waiting_roll') return;
    if(String(currentTurnId) !== String(myTgId)) return;

    isRolling = true;
    try {
      const d1 = rand(1,6);
      const d2 = rand(1,6);
      const steps = d1 + d2;

      diceResult.innerText = `🎲 ${d1} + ${d2} = ${steps}`;
      const r = await fetch(`${API}/room/${chatId}/move`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          playerId: Number(myTgId),
          steps
        })
      });


      if (!r.ok) {
        const t = await r.text().catch(() => '');
        return;
      }

      await syncRoom();
    } finally {
      isRolling = false;
    }
  }


  function rand(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function connectToServer() {
    try {
      await fetch(`${API}/room/${chatId}/join`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          id: String(myTgId),
          name: tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name
        })
      });
    } catch (e) {}

    const res = await fetch(`${API}/room/${chatId}/state`);
    if(!res.ok) {
      document.body.innerHTML = `
      <h1 style="text-align:center;margin-top:50px;">
        ⛔ Гру завершено
        </h1>
        <p style="text-align:center;">Поверніться до Telegram</p>
        `;
        return;
    }

    const room = await res.json();
    await applyRoom(room);
  }


  async function syncRoom() {
    try {
      const res = await fetch(`${API}/room/${chatId}/state`);
      if(!res.ok) return;

      const room = await res.json();

      // Якщо гра закінчилась, показуємо екран переможця
      if (room.status === 'stopped') {
        document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#020617;color:white;width:100vw;">
            <h1 style="font-size:32px;margin-bottom:10px;">⛔ Гру завершено</h1>
            <h2 style="color:#38bdf8;font-size:28px;">🏆 Переміг: ${room.winnerName || 'Невідомо'}</h2>
            <p style="margin-top:20px;color:#94a3b8;">Поверніться до Telegram</p>
        </div>
        `;
        return; // Зупиняємо подальше виконання
      }

      if (!room.players) return;

      if (isAnimatingMove) {
        pendingRoom = room;
        return;
      }

      await applyRoom(room);
    } catch (e) {
      console.error(e);
    }
  }

  async function applyRoom(room) {
    if (players.length === 0) {
      players = room.players.map(p => ({ ...p, id: Number(p.id) }));
      currentTurn = Number(room.currentTurn);
      currentTurnId = room.currentTurnId ? String(room.currentTurnId) : null;
      myPlayerIndex = players.findIndex(p => p.id === Number(myTgId));
      currentTurnState = room.turnState || 'waiting_roll';
      renderPlayers();
      return;
    }

    isAnimatingMove = true;
    await animateTo(room.players);
    currentTurn = Number(room.currentTurn);
    currentTurnId = room.currentTurnId ? String(room.currentTurnId) : null;
    myPlayerIndex = players.findIndex(p => p.id === Number(myTgId));
    currentTurnState = room.turnState || 'waiting_roll';
    for (const sp of room.players) {
      const p = players.find(pl => pl.id === Number(sp.id));
      if (!p) continue;
      p.pos = Number(sp.pos);
      p.money = sp.money;
      p.active = sp.active;
      p.color = sp.color;
    }
    isAnimatingMove = false;

    renderPlayers();
    updateActionButtons();

    if (pendingRoom) {
      const r = pendingRoom;
      pendingRoom = null;
      await applyRoom(r);
    }
  }


  async function animateTo(serverPlayers) {
    for (const sp of serverPlayers) {
      const p = players.find(pl => pl.id === Number(sp.id));
      if (!p) continue;

      const spPos = Number(sp.pos);
      let steps = (spPos - p.pos + 40) % 40;
      for (let s = 0; s < steps; s++) {
        p.pos = (p.pos + 1) % 40;
        renderPlayers();
        await sleep(200);
      }
    }
  }

  const surrenderBtn = document.getElementById('surrenderBtn');

  surrenderBtn.addEventListener('click', () => {
    if(!currentTurnId || String(currentTurnId) !== String(myTgId)) return;

    tg.showConfirm("Ви дійсно хочете здатися?", async (confirmed) => {
      if (!confirmed) return;

      try {
        await fetch(`${API}/room/${chatId}/surrender`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ playerId: myTgId})
        });

        await syncRoom();
      } catch (e) {
        console.error("Помилка здачі:", e);
      }
    });
  });

  const tradeBtn = document.getElementById('tradeBtn');

  tradeBtn.addEventListener('click', () => {
    alert("В розробці");
  });

  function updateActionButtons() {
    const me = players[myPlayerIndex];
    if(!me) return;

    const isMyTurn = currentTurnId && String(currentTurnId) === String(myTgId);
    const canAct = isMyTurn && me.active;

    // Панель гравця
    surrenderBtn.style.display = me.active ? "inline-block" : "none";
    tradeBtn.style.display = canAct ? "inline-block" : "none";

    // Панель ходу
    const rollBtn = document.getElementById("rollBtn");
    const endTurnBtn = document.getElementById("endTurnBtn");
    const decisionPanel = document.getElementById("decisionPanel");
    const buyBtn = document.getElementById("buyBtn");
    const auctionBtn = document.getElementById("auctionBtn");
    const payBtn = document.getElementById("payBtn");

    // Спочатку ховаємо ВСЕ
    rollBtn.style.display = "none";
    endTurnBtn.style.display = "none";
    decisionPanel.style.display = "none";
    buyBtn.style.display = "none";
    auctionBtn.style.display = "none";
    payBtn.style.display = "none";

    // Показуємо тільки те, що потрібно зараз
    if (canAct) {
      if (currentTurnState === 'waiting_roll') {
        rollBtn.style.display = "block";
      } else if (currentTurnState === 'can_end') {
        endTurnBtn.style.display = "block";
      } else if (currentTurnState === 'must_buy') {
        decisionPanel.style.display = "flex"; // flex для гарного вирівнювання кнопок!
        buyBtn.style.display = "block";
        auctionBtn.style.display = "block";
      } else if (currentTurnState === 'must_pay') {
        decisionPanel.style.display = "flex";
        payBtn.style.display = "block";
      }
    }
  }

  // Кнопка Завершити хід
  document.getElementById('endTurnBtn').addEventListener('click', async () => {
    if(!currentTurnId || String(currentTurnId) !== String(myTgId)) return;
    
    try {
      await fetch(`${API}/room/${chatId}/end_turn`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ playerId: myTgId })
      });
      await syncRoom();
    } catch (e) {
      console.error(e);
    }
  });

  // Заглушки для майбутніх функцій (наступний крок)
  document.getElementById('buyBtn').addEventListener('click', () => {
    alert("Запит на покупку! (Зробимо на сервері в наступному кроці)");
  });
  document.getElementById('auctionBtn').addEventListener('click', () => {
    alert("Відкриваємо аукціон! (Скоро...)");
  });
  document.getElementById('payBtn').addEventListener('click', () => {
    alert("Оплачуємо борг! (Зробимо на сервері в наступному кроці)");
  });

  connectToServer();
  setInterval(syncRoom, 2000);
