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
  { id: 1, name: 'Alex', gender: 'Boy', desc: 'Tall, captain of the basketball team.', personality: "confident", },
  { id: 2, name: 'Brooke', gender: 'Girl', desc: 'Book club president, loves mysteries.', personality: "thoughtful", },
  { id: 3, name: 'Chris', gender: 'Boy', desc: 'Gamer, always has tech advice.', personality: "quirky", },
  { id: 4, name: 'Dani', gender: 'Girl', desc: 'Cheerful and energetic, soccer player.', personality: "energetic", },
  { id: 5, name: 'Emma', gender: 'Girl', desc: 'Aspiring musician with a shy spirit.', personality: "shy", },
  { id: 6, name: 'Fiona', gender: 'Girl', desc: 'Science geek, runs the robotics club.', personality: "analytical", },
  { id: 7, name: 'Grace', gender: 'Girl', desc: 'Drama star, loves the stage.', personality: "dramatic", },
  { id: 8, name: 'Henry', gender: 'Boy', desc: 'Artistic soul, draws everywhere.', personality: "artistic", },
];

// Simple rooms/map layout for visualization and movement
const SCHOOL_MAP = [
  ['Classroom', 'Hallway', 'Library'],
  ['Gym', 'Cafeteria', 'Auditorium'],
  ['Locker Room', 'Entrance', 'Courtyard'],
];

const MOODS = ['neutral','happy','curious','annoyed','flirty','sad','angry','excited','nervous','helpful'];

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
  // Now each NPC gets relationship, mood, event history, etc.
  npcs: NPCS.map(npc => ({
    ...npc, 
    met: false, 
    friendship: 0, 
    mood: 'neutral',
    secretsShared: [],  // for tracking what Zack/they have shared
    lastInteractedAt: null,
    affection: 0
  })),
  map: SCHOOL_MAP,
  events: [], // global narrative event history (could enable deeper memory)
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
    if (
      data?.player && 
      data?.narrative && 
      data?.npcs && 
      data?.map &&
      typeof data.events !== "undefined"
    )
      return data;
    return null;
  } catch { return null; }
}
function clearSavedGame() {
  localStorage.removeItem('hsa_save');
}

// --- DIALOGUE/ACTION Definitions ---

/**
 * For extensibility: action/intent patterns (regexes), type, target, effect, and responses.
 * Each action type: { patterns, description, resolve({actor,target,state,match}) ⇒ { text/array, updatesObj } }
 * - Social: comfort, tease, challenge, flirt, comfort, apologize, help, group plan, argue, joke, gossip, confide, compliment, ask feelings
 * - Dialogue: ask about event, about self/interest, share secret, invite, etc.
 */
const INTERACTION_DEFS = [
  // Comfort, apologize
  {
    type: "comfort",
    patterns: [/comfort (.+)/i, /hug (.+)/i, /cheer up (.+)/i],
    intent: "offer comfort",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "There's no one by that name to comfort here." };
      let update = {};
      let reply = "";
      if (target.mood === "sad" || target.mood === "annoyed") {
        update = { friendship: target.friendship+8, mood: "happy" };
        reply = `${target.name} gives a small smile. "Thanks, I needed that." Your friendship improves!`;
      } else {
        update = { friendship: target.friendship+3, mood: "happy" };
        reply = `${target.name} looks touched. "${actor}, you're nice to have around."`;
      }
      return { text: reply, updates: update };
    }
  },
  // Apologize
  {
    type: "apologize",
    patterns: [/apologize to (.+)/i, /say sorry to (.+)/i, /i'?m sorry to (.+)/i],
    intent: "apologize",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "No one here by that name to apologize to." };
      let update = {};
      let reply = "";
      if (target.mood === "angry") {
        update = { friendship: target.friendship+7, mood: "neutral" };
        reply = `${target.name} sighs, "Okay, I forgive you. Let's move on."`;
      } else {
        update = { friendship: target.friendship+2 };
        reply = `${target.name} nods. "No worries, ${actor}."`;
      }
      return { text: reply, updates: update };
    }
  },
  // Flirt
  {
    type: "flirt",
    patterns: [/flirt with (.+)/i, /compliment (.+)/i, /tell (.+) they're cute/i, /give (.+) a wink/i],
    intent: "flirt",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "You don't see them here to flirt with." };
      if (target.personality === "shy") {
        return { text: `${target.name} blushes furiously, looking away. Maybe take it slow...`, updates: { mood: "nervous", affection: target.affection+2 } };
      }
      let gain = 2 + (target.mood === 'happy' ? 2 : 0);
      let more = target.personality === "dramatic" ? "grins dramatically" : "smiles";
      return {
        text: `${target.name} ${more}. "Wow, smooth, ${actor}!"`,
        updates: { affection: target.affection+gain, friendship: target.friendship+gain }
      }
    }
  },
  // Ask about feelings
  {
    type: "ask_feelings",
    patterns: [/ask (.+) how (he|she|they) (feels|feeling)/i, /how are you[, ]*(.+)?/i],
    intent: "ask feelings",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "There's no one by that name here." };
      let moods = {
        happy: `"I'm having a great day, ${actor}!"`,
        sad: '"It\'s just been one of those days."',
        annoyed: '"Something got on my nerves."',
        excited: '"There\'s so much fun stuff happening!"',
        nervous: '"Uh, well, some things are on my mind..."',
        flirty: `"I feel pretty good with you here."`,
        angry: '"I need to cool off for a bit."',
        helpful: `"I feel like helping out!"`,
        neutral: '"I\'m doing alright, thanks!"'
      };
      let line = moods[target.mood] || moods.neutral;
      return { text: `${target.name} says: ${line}`, updates: {} };
    }
  },
  // Share secret/gossip/confide
  {
    type: "share_secret",
    patterns: [/tell (.+) a secret/i, /confide in (.+)/i, /share gossip with (.+)/i, /gossip with (.+)/i],
    intent: "gossip",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "No one to share secrets with!" };
      if (target.secretsShared.includes("zack_gossip")) {
        return { text: `${target.name} whispers, "You've told me enough secrets for now!"` }
      }
      return {
        text: `${target.name} leans in. "Ooh, do tell! I love secrets." You confide in them. You feel closer.`,
        updates: { friendship: target.friendship+6, mood: "curious" },
        secrets: ["zack_gossip"]
      }
    }
  },
  // Tease/Joke/Playful
  {
    type: "tease",
    patterns: [/tease (.+)/i, /joke with (.+)/i, /make fun of (.+)/i],
    intent: "tease",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "Can't tease someone who isn't here!" };
      if (target.personality === "confident" || target.personality === "energetic") {
        return { text: `${target.name} laughs. "Nice one, ${actor}!"`, updates: { mood: "happy", friendship: target.friendship+2 } }
      }
      if (target.personality === "shy" || target.mood === "nervous") {
        return { text: `${target.name} looks a bit uncomfortable. Maybe go easier.`, updates: { mood: "annoyed", friendship: target.friendship-1 } }
      }
      return { text: `${target.name} smiles wryly. "Oh, I see how it is!"`, updates: { mood: "neutral" } }
    }
  },
  // Challenge (to a game, dare)
  {
    type: "challenge",
    patterns: [/challenge (.+) to (a )?(game|race|basketball|test|contest)/i, /dare (.+)/i],
    intent: "challenge",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "No one to challenge here." };
      let outcomes = [
        `${target.name} grins, "Oh, you're on, ${actor}!"`,
        `${target.name} looks determined. "Challenge accepted!"`,
        `${target.name} laughs, "Maybe another time?"`
      ];
      let outcome = Math.random() < 0.7 ? outcomes[0] : outcomes[2];
      let effects = Math.random() < 0.8 ?
        { friendship: target.friendship+3, mood: "excited" } :
        { mood: "neutral" };
      return { text: outcome, updates: effects };
    }
  },
  // Ask for help/offer help
  {
    type: "help",
    patterns: [/ask (.+) for help/i, /request help from (.+)/i, /offer help to (.+)/i, /help (.+)\b/i],
    intent: "help",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "No one here to help!" };
      if (/offer help/i.test(match[0]) || /^help /.test(match[0])) {
        return { text: `${target.name} smiles appreciatively. "Thanks, ${actor}! You're a lifesaver."`, updates: { friendship: target.friendship+4, mood: "happy" } };
      }
      return { text: `${target.name} says, "Sure! What do you need?"`, updates: { friendship: target.friendship+2, mood: "helpful" } };
    }
  },
  // Argue/disagree
  {
    type: "argue",
    patterns: [/argue with (.+)/i, /disagree with (.+)/i, /fight with (.+)/i, /yell at (.+)/i],
    intent: "argue",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "No one here to argue with!" };
      return { text: `${target.name} looks upset. Maybe you should apologize?`, updates: { mood: "angry", friendship: target.friendship-4 } };
    }
  },
  // Compliment
  {
    type: "compliment",
    patterns: [/compliment (.+)/i, /praise (.+)/i],
    intent: "compliment",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "No one here by that name." };
      return { text: `${target.name} brightens. "Thank you, ${actor}!"`, updates: { friendship: target.friendship+3, mood: "happy" } };
    }
  },
  // Invite to event/group plan
  {
    type: "invite",
    patterns: [/invite (.+) to (.+)/i, /ask (.+) to join/i, /want (.+) to come to (.+)/i],
    intent: "invite",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "Can't invite someone who isn't here." };
      return { text: `${target.name} says, "Sounds fun, I'll think about it!"`, updates: { friendship: target.friendship+2, mood: "curious" } };
    }
  },
  // Ask about school events
  {
    type: "school_event",
    patterns: [/ask (.+) about (the )?(dance|basketball|party|play|event|test)/i, /what's happening (at|in) (.+)/i, /any news/i],
    intent: "school_event",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "No one is here to ask." };
      const events = [
        "Did you hear about the dance this Friday?",
        "There's going to be a robotics contest soon!",
        "The school play rehearsals are wild this year.",
        "Basketball tryouts are after school in the gym.",
        "I heard there's a pop quiz coming up in Math..."
      ];
      return { text: `${target.name} shares: "${events[Math.floor(Math.random()*events.length)]}"`, updates: {} };
    }
  },
  // Default fallback for direct speech
  {
    type: "say",
    patterns: [/say ['"](.*)['"] to (.+)/i, /tell (.+),? ['"](.*)['"]/i],
    intent: "say",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "They're not here to talk to." };
      let said = match[1] || match[2] || '';
      if (!said) return { text: `${target.name} asks, "What do you want to say?"` };
      return { text: `You say "${said}" to ${target.name}. ${target.name} responds: "Interesting..."`, updates: { friendship: target.friendship+1 } }
    }
  }
];

/**
 * Utility—return first intent/action that matches the input, or null, filling in parsed params.
 */
function matchInteraction(input, npcsHere) {
  let lowered = input.trim().toLowerCase();
  for (const def of INTERACTION_DEFS) {
    for (const pat of def.patterns) {
      const m = lowered.match(pat);
      if (m) {
        // Try to extract target; allow partial matches by name (must be present in npcsHere).
        for (const npc of npcsHere) {
          if (
            (m[1] && npc.name.toLowerCase() === m[1].toLowerCase()) ||
            (m[2] && npc.name.toLowerCase() === m[2].toLowerCase()) ||
            lowered.includes(npc.name.toLowerCase())
          ) {
            return { ...def, match: m, target: npc } 
          }
        }
        // No recognizable target, but still matches action
        return { ...def, match: m, target: null }
      }
    }
  }
  return null;
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
    const cmd = command.trim();
    const raw = cmd; // preserve for narrative
    const lowered = cmd.toLowerCase();
    let newState = { 
      ...gameState, 
      narrative: [...gameState.narrative], 
      events: [...gameState.events] 
    };

    // Movement: go north/east/south/west, or just "north" etc
    for (const dir of ['north', 'south', 'east', 'west']) {
      if (lowered === `go ${dir}` || lowered === dir) {
        output = tryMove(dir, newState);
        break;
      }
    }

    // Look/describe current room
    if (/^look/.test(lowered) || /examine|describe|survey/.test(lowered)) {
      output = describeLocation(newState.player.location, newState);
    }

    // Inventory management
    if (/inventory|inv\b|bag|backpack|items/.test(lowered)) {
      output = describeInventory(newState.player.inventory);
    }

    // Context: which NPCs are "here"?
    const hereNames = newState.npcs.filter((npc, idx) =>
      (idx % 3) === (newState.player.location[0] + newState.player.location[1]) % 3
    );
    // Expanded: rich interaction parser
    if (!output && lowered.match(/talk to \w+|interact with \w+|ask .+|flirt|challenge|tease|comfort|apologize|help|gossip|confide|argue|fight|invite|compliment|praise|share|joke|hug|say |tell /)) {
      // Try to match complex intent (modular)
      const matched = matchInteraction(lowered, hereNames);
      if (matched) {
        // Upgrades: resolve the action, apply effects, narrative
        let idx = newState.npcs.findIndex(n => n.id === (matched.target && matched.target.id));
        let reply, changes = {}, secretUpdates = [];
        if (matched.target && idx >= 0) {
          // Pass in named/deref'd target: simulate NPC's mood, relation, etc.
          let res = matched.resolve({
            actor: newState.player.name,
            target: newState.npcs[idx],
            state: newState,
            match: matched.match
          });
          reply = res.text;
          // Apply modular updates to mood, friendship, secrets, etc.
          if (res.updates) {
            for (let k in res.updates) {
              newState.npcs[idx][k] = res.updates[k];
            }
          }
          if (res.secrets) {
            newState.npcs[idx].secretsShared.push(...res.secrets);
          }
          newState.npcs[idx].met = true;
          newState.npcs[idx].lastInteractedAt = Date.now();
        } else {
          // No local target? Reply with generic.
          let res = matched.resolve({
            actor: newState.player.name,
            target: null,
            state: newState,
            match: matched.match
          });
          reply = res.text;
        }

        output = reply;
      } else {
        output = genericTalkResponse(lowered, hereNames, newState);
      }
    }

    // Fallback classic: "talk to Emma", "interact with Henry"
    const talkMatch = lowered.match(/^talk to (\w+)|^interact with (\w+)/);
    if (!output && talkMatch) {
      const target = (talkMatch[1] || talkMatch[2] || '').toLowerCase();
      output = interactWithNPC(target, newState);
    }

    // Pick up item: "pick up apple", "take lunchbox"
    const itemMatch = lowered.match(/pick up (\w+)|take (\w+)/);
    if (!output && itemMatch) {
      const item = (itemMatch[1] || itemMatch[2] || '').toLowerCase();
      output = pickUpItem(item, newState);
    }

    // Save/load/progress
    if (!output && /save\b/.test(lowered)) {
      saveGame(newState);
      setShowSaveMsg(true);
      setTimeout(() => setShowSaveMsg(false), 1500);
      output = "Your progress has been saved.";
    }
    if (!output && /^load\b/.test(lowered)) {
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
    if (!output && /^reset\b/.test(lowered)) {
      clearSavedGame();
      setGameState(INITIAL_STATE);
      setShowResetMsg(true);
      setTimeout(() => setShowResetMsg(false), 1200);
      output = "Game reset to beginning.";
    }

    // Unrecognized
    if (!output && lowered.length) {
      output = `Zack deliberates, but doesn't know how to do that. Try social moves like 'comfort Emma', 'challenge Alex to a game', 'flirt with Grace', 'ask Chris for help', or just "look", "go north".`;
    }

    newState.narrative.push(`> ${raw}`);
    newState.narrative.push(output);
    // Truncate narrative to keep things tidy (optional, for demo)
    if (newState.narrative.length > 28) newState.narrative = newState.narrative.slice(-28);

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

  // Interact with an NPC if present (fallback API)
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

  // Attempt to generate a dynamic but generic NPC response (fallback/no match).
  function genericTalkResponse(lowered, npcsHere, state) {
    if (npcsHere.length === 0) return "No one is here to talk to!";
    // Pick an NPC, and have a themed fallback reply
    const npc = npcsHere[0];
    let phrases = [
      `"I don't really know what you mean, but okay, ${state.player.name}!"`,
      '"Wanna talk about something else?"',
      `"Heh, you're funny, ${state.player.name}."`,
      `"Cool story, bro."`,
      `"Haha, that's random, but alright."`,
      `"Let's do something more interesting!"`
    ];
    if (npc.personality === "analytical") phrases.push('"That sounds illogical, but interesting."');
    if (npc.personality === "dramatic") phrases.push('"If only life were as poetic as your words!"');
    if (npc.personality === "confident") phrases.push(`"Bold move! I like it."`);
    return `${npc.name} says: ${phrases[Math.floor(Math.random()*phrases.length)]}`;
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
        placeholder="Type your command (e.g. comfort Emma, flirt with Grace, ask Chris for help)..."
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
