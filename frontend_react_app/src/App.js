import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Theme colors for easy use in inline styles & classNames
const COLORS = {
  primary: '#2176FF',
  secondary: '#33A1FD',
  accent: '#FFBC42',
  bg: '#ffffff',
  sidebarBg: '#f8f9fa',
  border: '#e9ecef',
  text: '#222',
};

const NPCS = [
  { id: 1, name: 'Alex', gender: 'Boy', desc: 'Tall, captain of the basketball team.' },
  { id: 2, name: 'Brooke', gender: 'Girl', desc: 'Book club president, loves mysteries.' },
  { id: 3, name: 'Chris', gender: 'Boy', desc: 'Gamer, always has tech advice.' },
  { id: 4, name: 'Dani', gender: 'Girl', desc: 'Cheerful and energetic, soccer player.' },
  { id: 5, name: 'Emma', gender: 'Girl', desc: 'Aspiring musician with a shy spirit.' },
  { id: 6, name: 'Fiona', gender: 'Girl', desc: 'Science geek, runs the robotics club.' },
  { id: 7, name: 'Grace', gender: 'Girl', desc: 'Drama star, loves the stage.' },
  { id: 8, name: 'Henry', gender: 'Boy', desc: 'Artistic soul, draws everywhere.' },
];

// Simple rooms/map layout for visualization and movement
const SCHOOL_MAP = [
  ['Classroom', 'Hallway', 'Library'],
  ['Gym', 'Cafeteria', 'Auditorium'],
  ['Locker Room', 'Entrance', 'Courtyard'],
];

const INITIAL_STATE = {
  player: {
    name: "Zack",
    inventory: [],
    location: [1, 1], // Starting in Entrance
    stats: {
      health: 100,
      energy: 100,
      reputation: 50,
    },
  },
  narrative: [
    "Welcome to Rivertown High! As Zack, a 16-year-old student, you begin your adventure at the school's entrance. What would you like to do?",
  ],
  npcs: NPCS.map(npc => ({ ...npc, met: false, friendship: 0 })),
  map: SCHOOL_MAP,
};

function saveGame(state) {
  try {
    localStorage.setItem('hsa_save', JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
function loadGame() {
  try {
    const data = JSON.parse(localStorage.getItem('hsa_save'));
    if (data?.player && data?.narrative && data?.npcs && data?.map)
      return data;
    return null;
  } catch { return null; }
}
function clearSavedGame() {
  localStorage.removeItem('hsa_save');
}

// PUBLIC_INTERFACE
function App() {
  const [gameState, setGameState] = useState(() => loadGame() || INITIAL_STATE);
  const [input, setInput] = useState('');
  const [showSaveMsg, setShowSaveMsg] = useState(false);
  const [showLoadMsg, setShowLoadMsg] = useState(false);
  const [showResetMsg, setShowResetMsg] = useState(false);

  // Scroll narrative to latest
  const bottomRef = useRef(null);
  useEffect(() => { if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' }); }, [gameState.narrative]);

  // Parsing utility functions
  const availableDirections = {
    north: [-1, 0], south: [1, 0], east: [0, 1], west: [0, -1]
  };

  // PUBLIC_INTERFACE
  function handleCommand(command) {
    let output = '';
    const cmd = command.trim().toLowerCase();
    let newState = { ...gameState, narrative: [...gameState.narrative] };

    // Movement: go north/east/south/west, or just "north" etc
    for (const dir of ['north', 'south', 'east', 'west']) {
      if (cmd === `go ${dir}` || cmd === dir) {
        output = tryMove(dir, newState);
        break;
      }
    }

    // Look around/describe current room
    if (/^look/.test(cmd) || /examine|describe|survey/.test(cmd)) {
      output = describeLocation(newState.player.location, newState);
    }

    // Inventory management
    if (/inventory|inv\b|bag|backpack|items/.test(cmd)) {
      output = describeInventory(newState.player.inventory);
    }

    // Talk/interact with NPC: "talk to Emma", "interact with Henry"
    const talkMatch = cmd.match(/^talk to (\w+)|^interact with (\w+)/);
    if (!output && talkMatch) {
      const target = (talkMatch[1] || talkMatch[2] || '').toLowerCase();
      output = interactWithNPC(target, newState);
    }

    // Pick up item: "pick up apple", "take lunchbox"
    const itemMatch = cmd.match(/pick up (\w+)|take (\w+)/);
    if (!output && itemMatch) {
      const item = (itemMatch[1] || itemMatch[2] || '').toLowerCase();
      output = pickUpItem(item, newState);
    }

    // Save/load/progress
    if (!output && /save\b/.test(cmd)) {
      saveGame(newState);
      setShowSaveMsg(true);
      setTimeout(() => setShowSaveMsg(false), 1500);
      output = "Your progress has been saved.";
    }
    if (!output && /^load\b/.test(cmd)) {
      const loaded = loadGame();
      if (loaded) {
        setGameState(loaded);
        setShowLoadMsg(true);
        setTimeout(() => setShowLoadMsg(false), 1200);
        return;
      } else {
        output = "No saved game found.";
      }
    }
    if (!output && /^reset\b/.test(cmd)) {
      clearSavedGame();
      setGameState(INITIAL_STATE);
      setShowResetMsg(true);
      setTimeout(() => setShowResetMsg(false), 1200);
      output = "Game reset to beginning.";
    }

    // Unrecognized
    if (!output && cmd.length) {
      output = `I don't understand that command. Try "look", "go north", "talk to Emma", "inventory", etc.`;
    }

    newState.narrative.push(`> ${command}`);
    newState.narrative.push(output);
    setGameState(newState);
  }

  // Move the player if possible
  function tryMove(dir, state) {
    const delta = availableDirections[dir];
    if (!delta) return '';
    const [row, col] = state.player.location;
    const [dRow, dCol] = delta;
    const newRow = row + dRow, newCol = col + dCol;
    if (newRow < 0 || newCol < 0 || newRow >= state.map.length || newCol >= state.map[0].length)
      return "You can't go that way.";

    state.player.location = [newRow, newCol];
    return describeLocation([newRow, newCol], state, true);
  }

  // Describe the location; optionally add flavor upon moving
  function describeLocation([row, col], state, isArrival) {
    const locName = state.map[row][col];
    let extra = '';
    // For demo, place some NPCs/items in locations
    const npcsHere = state.npcs.filter((npc, idx) => (idx % 3) === (row + col) % 3);
    if (npcsHere.length)
      extra += " You see here: " + npcsHere.map(npc => npc.name).join(', ') + ".";
    let itemsHere = '';
    if (locName === "Cafeteria") itemsHere = " There's a shiny apple on a table.";
    if (locName === "Locker Room") itemsHere = " Someone left a water bottle here.";
    if (locName === "Library") itemsHere = " A mysterious book lies open on the desk.";
    return `${isArrival ? "You move to" : "You're at"} the ${locName}.${extra}${itemsHere}`;
  }

  // Describe what's in the player's inventory
  function describeInventory(items) {
    return items.length
      ? "You are carrying: " + items.join(', ')
      : "Your inventory is empty.";
  }

  // Interact with an NPC if present
  function interactWithNPC(npcName, state) {
    const hereNames = state.npcs.filter((npc, idx) => 
      (idx % 3) === (state.player.location[0] + state.player.location[1]) % 3
    ).map(n => n.name.toLowerCase());
    const idx = state.npcs.findIndex(n => n.name.toLowerCase() === npcName);
    if (idx < 0) return "There's no one by that name here.";
    if (!hereNames.includes(npcName)) return `You don't see ${state.npcs[idx].name} here.`;
    state.npcs[idx].met = true;
    state.npcs[idx].friendship += 10;
    return `You chat with ${state.npcs[idx].name}. (${state.npcs[idx].desc}) Your friendship increases.`;
  }

  // Simulate picking up an item
  function pickUpItem(item, state) {
    const [row, col] = state.player.location;
    const loc = state.map[row][col];
    let found = '';
    let itemName = '';
    if (loc === "Cafeteria" && /apple/.test(item)) itemName = "Shiny Apple";
    if (loc === "Locker Room" && /water/.test(item)) itemName = "Water Bottle";
    if (loc === "Library" && /book/.test(item)) itemName = "Mysterious Book";
    if (itemName) {
      if (!state.player.inventory.includes(itemName)) {
        state.player.inventory.push(itemName);
        found = `You pick up the ${itemName}.`;
      } else {
        found = `You've already taken the ${itemName}.`;
      }
    } else {
      found = "You don't see that here.";
    }
    return found;
  }

  // Handle input submission
  function handleInputSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;
    handleCommand(input);
    setInput('');
  }

  // Reset all game state (via nav)
  function handleFullReset() {
    clearSavedGame();
    setGameState(INITIAL_STATE);
  }

  // Rendering
  return (
    <div className="app-root" style={{ background: COLORS.bg }}>
      <TopNavBar 
        onSave={() => { saveGame(gameState); setShowSaveMsg(true); setTimeout(()=>setShowSaveMsg(false),1200); }}
        onLoad={() => {
          const loaded = loadGame();
          if (loaded) setGameState(loaded); setShowLoadMsg(true); setTimeout(()=>setShowLoadMsg(false),1200);
        }}
        onReset={handleFullReset}
      />
      <div className="main-layout">
        <Sidebar player={gameState.player} npcs={gameState.npcs} />
        <div className="center-console">
          <NarrativeConsole lines={gameState.narrative} bottomRef={bottomRef} />
          <CommandInput
            value={input}
            onChange={setInput}
            onSubmit={handleInputSubmit}
          />
        </div>
        <MapArea
          map={gameState.map}
          location={gameState.player.location}
        />
      </div>
      {showSaveMsg && <StatusToast text="Game saved!" color={COLORS.primary}/>}
      {showLoadMsg && <StatusToast text="Game loaded!" color={COLORS.secondary}/>}
      {showResetMsg && <StatusToast text="Game reset!" color={COLORS.accent}/>}
    </div>
  );
}

// ------ COMPONENTS --------

// PUBLIC_INTERFACE
function TopNavBar({ onSave, onLoad, onReset }) {
  return (
    <nav className="navbar">
      <span className="nav-title">High School Adventure</span>
      <div className="nav-options">
        <button className="nav-btn" onClick={onSave} title="Save Progress">💾 Save</button>
        <button className="nav-btn" onClick={onLoad} title="Load Progress">📂 Load</button>
        <button className="nav-btn" onClick={onReset} title="Restart Game">🔄 Reset</button>
      </div>
    </nav>
  );
}

// PUBLIC_INTERFACE
function Sidebar({ player, npcs }) {
  const friendsNpcs = npcs.filter(n => n.met && n.friendship > 0);
  const othersNpcs = npcs.filter(n => !n.met || n.friendship <= 0);
  return (
    <aside className="sidebar" style={{ background: COLORS.sidebarBg }}>
      <div className="sidebar-section">
        <div className="sidebar-title">Player</div>
        <div><b>{player.name}</b></div>
        <div className="player-stats">
          <span title="Health">❤️ {player.stats.health}</span> &nbsp;
          <span title="Energy">⚡ {player.stats.energy}</span> &nbsp;
          <span title="Reputation">⭐ {player.stats.reputation}</span>
        </div>
      </div>
      <div className="sidebar-section">
        <div className="sidebar-title">Inventory</div>
        {player.inventory.length === 0 ?
          <div className="inventory-empty">Empty</div> :
          <ul className="inventory-list">
            {player.inventory.map(item => <li key={item}>{item}</li>)}
          </ul>
        }
      </div>
      <div className="sidebar-section">
        <div className="sidebar-title">Friends</div>
        {friendsNpcs.length === 0 ? <div className="npc-empty">None yet</div> :
          <ul className="npc-list">
            {friendsNpcs.map(npc =>
              <li key={npc.id} title={npc.desc}>
                {npc.name} ({npc.gender}) <span style={{color:COLORS.primary}}>+{npc.friendship}</span>
              </li>)}
          </ul>}
        <div className="sidebar-title" style={{ marginTop: 12, fontSize: "90%" }}>Others</div>
        {othersNpcs.length === 0 ? <div className="npc-empty">–</div> :
          <ul className="npc-list">
            {othersNpcs.map(npc =>
              <li key={npc.id} title={npc.desc}>{npc.name}</li>)}
          </ul>
        }
      </div>
    </aside>
  );
}

// PUBLIC_INTERFACE
function NarrativeConsole({ lines, bottomRef }) {
  return (
    <section className="narrative-console" aria-label="Game narrative">
      {lines.map((ln, i) =>
        <div key={i} className={ln.startsWith('>') ? 'console-input' : 'console-output'}>
          {ln}
        </div>
      )}
      <div ref={bottomRef} />
    </section>
  );
}

// PUBLIC_INTERFACE
function CommandInput({ value, onChange, onSubmit }) {
  return (
    <form className="cmd-input" onSubmit={onSubmit} autoComplete="off">
      <input
        type="text"
        autoFocus
        className="cmd-input-box"
        placeholder="Type your command (e.g. go north, look, talk to Emma)..."
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={80}
        aria-label="Game command"
      />
      <button className="cmd-submit-btn" type="submit" style={{ background: COLORS.primary, color: '#fff' }}>↵</button>
    </form>
  );
}

// PUBLIC_INTERFACE
function MapArea({ map, location }) {
  return (
    <aside className="map-area">
      <div className="map-title">School Map</div>
      <GridMap map={map} playerLoc={location} />
    </aside>
  );
}

// PUBLIC_INTERFACE
function GridMap({ map, playerLoc }) {
  return (
    <div className="map-grid">
      {map.map((row, rowIdx) =>
        <div className="map-row" key={rowIdx}>
          {row.map((name, colIdx) =>
            <div
              className={`map-cell${playerLoc[0] === rowIdx && playerLoc[1] === colIdx ? " map-cell-active" : ""}`}
              key={colIdx}
            >
              <span>
                {playerLoc[0] === rowIdx && playerLoc[1] === colIdx ? '🧑‍🎓 ' : ''}
                {name}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Quick toast for saves/loads
function StatusToast({ text, color }) {
  return <div className="status-toast" style={{ background: color }}>{text}</div>;
}

export default App;
