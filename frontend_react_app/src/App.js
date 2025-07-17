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

// ROMANTIC STORY ENRICHMENT
const ROMANCE_FLAGS = {
  fionaIsGF: true, // for story triggers, expand later with toggled state
};

const NPCS = [
  { id: 1, name: 'Alex', gender: 'Boy', desc: 'Tall, captain of the basketball team.', personality: "confident", },
  { id: 2, name: 'Brooke', gender: 'Girl', desc: 'Book club president, loves mysteries.', personality: "thoughtful", },
  { id: 3, name: 'Chris', gender: 'Boy', desc: 'Gamer, always has tech advice.', personality: "quirky", },
  { id: 4, name: 'Dani', gender: 'Girl', desc: 'Cheerful and energetic, soccer player.', personality: "energetic", },
  { id: 5, name: 'Emma', gender: 'Girl', desc: 'Aspiring musician with a shy spirit.', personality: "shy", },
  { id: 6, name: 'Fiona', gender: 'Girl', desc: "Science geek, runs the robotics club. Zack's girlfriend. Fiercely smart with a hidden romantic streak.", personality: "analytical", },
  { id: 7, name: 'Grace', gender: 'Girl', desc: 'Drama star, loves the stage.', personality: "dramatic", },
  { id: 8, name: 'Henry', gender: 'Boy', desc: 'Artistic soul, draws everywhere.', personality: "artistic", },
];

// Enriched, contextful map: Each cell could have items and triggers
const SCHOOL_MAP = [
  ['Classroom', 'Hallway', 'Library'],
  ['Gym', 'Cafeteria', 'Auditorium'],
  ['Locker Room', 'Entrance', 'Courtyard'],
];

// Items available for pickup/interact in each location
const LOCATION_ITEMS = {
  'Cafeteria': [{ name: "Shiny Apple", desc: "A perfect red apple. Looks tasty." }],
  'Locker Room': [{ name: "Water Bottle", desc: "Left behind by someone. Useful if thirsty or for giving to a friend." }],
  'Library': [{ name: "Mysterious Book", desc: "The cover glows faintly and the pages whisper secrets of the school..." }],
  'Classroom': [{ name: "Forgotten Note", desc: "A handwritten love note crumpled beneath a desk." }],
  'Courtyard': [{ name: "Wildflower", desc: "A delicate wildflower, perfect for giving to someone special." }],
};

const MOODS = ['neutral','happy','curious','annoyed','flirty','sad','angry','excited','nervous','helpful'];

const INITIAL_STATE = {
  player: {
    name: "Zack",
    inventory: [],
    location: [2, 1], // Starting at Entrance
    stats: {
      health: 100,
      energy: 100,
      reputation: 50,
      romance: 0,
    },
  },
  narrative: [
    "Welcome to Rivertown High! As Zack, a 16-year-old student, you begin your adventure at the school's entrance. You've just become boyfriend/girlfriend with Fiona after a late-night study session turned to confessions beneath the stars. What would you like to do? Type commands like 'look', 'go north', 'talk to Fiona', 'pick up wildflower', or 'hold Fiona's hand'.",
  ],
  npcs: NPCS.map(npc => ({
    ...npc,
    met: false,
    friendship: 0,
    mood: 'neutral',
    secretsShared: [],
    lastInteractedAt: null,
    affection: npc.name === "Fiona" ? 75 : 0, // Fiona starts as girlfriend
    relationship: npc.name === "Fiona" ? "girlfriend" : "",
    itemsGiven: [],
    bfGfFlags: { // track special state (GF/BF unique actions)
      isRomantic: npc.name === "Fiona",
      handsHeld: false,
    },
    conflicts: [],
  })),
  map: SCHOOL_MAP,
  events: [],
  pickedItems: [],
};

// Save/load
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

// --- Mega-Expanded DIALOGUE/ACTION Definitions ---
// Each has modules for normal and "boyfriend/girlfriend" context. Dialogue is now FULL multi-paragraphs.

// Multi-paragraph romance responses for Fiona
function fionaRomanticReply(type, context = {}) {
  // Context can have {player, affection, handsHeld, argument, inventory}
  switch (type) {
    case "confessLove":
      return `Fiona blushes, her cheeks dusted a warm pink as she looks up at you through her glasses. The robotics club buzz is long gone; it's just the two of you under the soft school lights.
"I never thought I'd feel this way," she whispers, fingers nervously clasped with yours. "But being near you, Zack, makes every formula and theorem fade into the background. My heart sort of... skips, and for once, I don't want a logical explanation."
You feel warmth spread inside, her gaze enveloping you with affection and a shared secret only you and Fiona know.`;
    case "holdHands":
      if (context.handsHeld)
        return `You and Fiona are already walking together, hands entwined. She squeezes your palm, and a hush settles between you—a sweet, unspoken understanding. Passing students barely exist; her thumb gently draws circles on your skin, grounding you in her presence.`;
      return `You reach out and gently take Fiona’s hand. She looks surprised at first, lips parting in a silent gasp, but she doesn't pull away. "It's cheesy," she teases, "but... I like cheesy with you." Her hand fits perfectly in yours, and your pulse calms to match hers. It's a small act, but you feel closer than ever.`;
    case "flirt":
      return `You lean in, your words a playful whisper meant only for her. The chaos of the high school hallway fades as Fiona’s eyes meet yours—mischievous, appraising.
She grins, quirking a brow, and retorts, "Are you trying to distract me from calculating the robot's gear ratios? Because... it's working." She lets out a soft, melodic giggle you rarely hear in robotics meetings. You realize, in this moment, you're her favorite equation to solve.`;
    case "giveGift":
      if (context.item === "Wildflower")
        return `You offer Fiona the wildflower you picked from the courtyard. She gasps, genuinely touched. "For me? It's beautiful... I’ll press it in my notebook so I never forget today." She tucks the flower into her hair and gives you a soft peck on the cheek, heart pounding as students giggle nearby.`;
      if (context.item)
        return `You hand Fiona the ${context.item}. She smiles sweetly, brushing her fingers over your hand. "You always know how to brighten my day, Zack. Thank you."`;
      return "";
    case "shareSecret":
      return `You lean close, telling Fiona a secret you'd never shared before. Her eyes widen, but instead of teasing, she presses her forehead gently to yours. "That makes us even closer now, doesn’t it? You can always trust me, Zack," she murmurs, her voice barely above a whisper, as she links her pinky with yours in solemn promise.`;
    case "defend":
      return `Someone mutters something snide about Fiona’s robotics skills nearby. You step forward, voice steady but firm, defending her talent.
Fiona looks at you in awe—her defenses down, a rare vulnerability surfacing. "No one’s ever stood up for me like that before. I... Zack, I’m really lucky you’re mine." She pulls you aside, gratitude shimmering in her gaze, and hugs you longer than she ever has.`;
    case "argument":
      return `You and Fiona exchange heated words, both stubborn and proud. After a tense silence, she sighs, her voice trembling slightly.
"It hurts to fight with you," she admits. "But if we can talk honestly—if I can trust you with my messy thoughts—maybe that means we really matter to each other." Her sincerity lingers, an invitation to make up and grow stronger together.`;
    default:
      return "";
  }
}

// Rich, multi-sentence responses for other NPCs
function expandResponse(npc, type, context = {}) {
  if (npc.name === "Fiona" && ROMANCE_FLAGS.fionaIsGF) {
    // Use special Fiona romantic expansions where possible
    let txt = fionaRomanticReply(type, context);
    if (txt) return txt;
  }
  // For fallback: deeper, reflective, or contextful generic XP for friends/other NPCs
  switch (type) {
    case "holdHands":
      return `${npc.name} raises an eyebrow, surprised but not offended. A small, playful smile surfaces: "Alright! But only if you're not afraid of what people might say." You hold hands for a walk that draws amused looks from nearby classmates, the simple intimacy easing your nerves.`;
    case "giveGift":
      if (context.item)
        return `${npc.name} looks genuinely happy to accept your ${context.item}. "Thanks! I'll remember this," they promise. You sense trust and warmth building between you—a new layer to your friendship.`;
      return "";
    case "confide":
      return `${npc.name} listens intently as you share something personal. There's a moment of quiet understanding, as if an invisible thread connects you more tightly after your confession. "${npc.name} grins. "We've both got our secrets, huh?"`;
    case "defend":
      return `You stand up for ${npc.name}, squaring your shoulders when someone makes a snide remark. ${npc.name}'s expression softens. "I... didn't expect anyone to back me up. Thank you, Zack." You feel your bond grow stronger through mutual respect.`;
    case "argument":
      return `Tempers flare, voices rising. After a pause, ${npc.name} breaks the silence. "Look, we both care. Let's work past this instead of letting it break us apart." It's a chance to rebuild trust with honest conversation.`;
    case "flirt":
      return `${npc.name} laughs, catching your tone, and fires back with witty banter of their own. Your flirtation is met with a spark—teasing, but light-hearted.`;
    case "invite":
      return `${npc.name} considers your invitation before grinning. "Sure, sounds awesome! Lead the way, partner." The promise of a new adventure brings energy to the air.`;
    default:
      return "";
  }
}

// MASSIVELY expanded action/interaction list
const INTERACTION_DEFS = [
  // Romantic, boyfriend-girlfriend specific (Fiona, can later be generic on relationship flags)
  {
    type: "holdHands",
    patterns: [
      /hold (.+)'s hand/i,
      /hold hands with (.+)/i,
      /take (.+) by the hand/i,
      /reach for (.+)'s hand/i,
    ],
    intent: "romantic_hold_hands",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "Who do you want to hold hands with?" };
      let already = target.bfGfFlags?.handsHeld;
      let resp = expandResponse(target, "holdHands", { handsHeld: already });
      let update = { ...target, handsHeld: true };
      return { text: resp, updates: { ...update.bfGfFlags, handsHeld: true }, affection: target.affection + 5 };
    }
  },
  {
    type: "confessLove",
    patterns: [
      /confess love (to|for) (.+)/i,
      /tell (.+) you love/i,
      /i love (.+)/i,
      /say "i love you" to (.+)/i,
      /admit feelings to (.+)/i,
    ],
    intent: "confess_love",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "Love needs a recipient! Who do you want to confess to?" };
      return { text: expandResponse(target, "confessLove"), updates: { affection: target.affection + 12 } };
    },
  },
  {
    type: "flirt",
    patterns: [
      /flirt with (.+)/i,
      /compliment (.+)/i,
      /wink at (.+)/i,
      /charm (.+)/i,
      /blow a kiss to (.+)/i,
      /make (.+) blush/i,
    ],
    intent: "flirt",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "No one's here to flirt with!" };
      return { text: expandResponse(target, "flirt"), updates: { affection: target.affection + 3, mood: "flirty" } };
    }
  },
  {
    type: "shareSecret",
    patterns: [
      /share secret with (.+)/i,
      /confide in (.+)/i,
      /tell (.+) a secret/i,
      /share something private with (.+)/i,
    ],
    intent: "share_secret",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "No one to share secrets with!" };
      let already = target.secretsShared.includes("zack_secret");
      if (already)
        return { text: `${target.name} smiles, "I promise, Zack, your secret is safe with me."` };
      return {
        text: expandResponse(target, "shareSecret"),
        updates: { friendship: target.friendship + 8 },
        secrets: ["zack_secret"]
      };
    }
  },
  {
    type: "defend",
    patterns: [
      /defend (.+)/i,
      /stand up for (.+)/i,
      /protect (.+)/i,
    ],
    intent: "defend",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "There's no one to defend here!" };
      return {
        text: expandResponse(target, "defend"),
        updates: { friendship: target.friendship + 7, mood: "happy" }
      };
    }
  },
  {
    type: "argument",
    patterns: [
      /argue with (.+)/i,
      /fight with (.+)/i,
      /call out (.+)/i,
      /conflict with (.+)/i,
      /disagree with (.+)/i,
    ],
    intent: "argue",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "Who do you mean to argue with?" };
      return { text: expandResponse(target, "argument"), updates: { mood: "angry", friendship: target.friendship - 8 } };
    }
  },
  {
    type: "giveGift",
    patterns: [
      /give (.+) (.+)/i,
      /present (.+) with (.+)/i,
      /offer (.+) (.+)/i,
    ],
    intent: "give_gift",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "Who do you want to give an item to?" };
      let itemCandidate = (match[2] || match[1] || "").toLowerCase();
      let inventory = state.player.inventory;
      let owned = inventory.find(i => i.toLowerCase().includes(itemCandidate));
      if (!owned) return { text: `You’re not carrying that item.` };
      if (target.itemsGiven && target.itemsGiven.includes(owned)) return { text: `${target.name} already has that from you.` };
      let reply = expandResponse(target, "giveGift", { item: owned });
      if (!target.itemsGiven) target.itemsGiven = [];
      target.itemsGiven.push(owned);
      return {
        text: reply,
        updates: { friendship: target.friendship + 7, mood: "happy" },
        itemsGiven: [...(target.itemsGiven || []), owned]
      };
    }
  },
  {
    type: "goOnDate",
    patterns: [
      /ask (.+) on a date/i,
      /invite (.+) on a date/i,
      /go on a date with (.+)/i,
      /take (.+) out/i,
    ],
    intent: "date",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "You need a date partner!" };
      if ((target.relationship === "girlfriend" || target.relationship === "boyfriend") && target.affection > 60) {
        return {
          text: `${target.name}'s eyes shine with excitement. "A date? Really? I thought you'd never ask." You spend the afternoon together, sharing secrets, holding hands, and laughing until sunset.`,
          updates: { affection: target.affection + 15, mood: "happy" }
        };
      }
      return {
        text: `${target.name} seems caught off guard and laughs nervously. "A date? Maybe if we get to know each other a bit better first, okay?"`,
        updates: { mood: "nervous", friendship: target.friendship + 2 }
      };
    }
  },
  // Flirtation & romantic context expanded
  // Share secrets, defend, deal with conflict -- covered above
  // Generic triple interaction expansion for all social moves (old ones, plus extra variance)
  {
    type: "comfort",
    patterns: [/comfort (.+)/i, /hug (.+)/i, /cheer up (.+)/i, /pat (.+)/i, /soothe (.+)/i],
    intent: "comfort",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "There's no one by that name to comfort here." };
      let update = {};
      let reply = "";
      if (target.mood === "sad" || target.mood === "annoyed") {
        update = { friendship: target.friendship + 11, mood: "happy" };
        reply = `${target.name} visibly relaxes as you offer comfort. "Hey, thank you... It means a lot." Your friend leans in with a long, grateful hug, taking their time to let the moment sink in.`;
      } else {
        update = { friendship: target.friendship + 5, mood: "happy" };
        reply = `${target.name} smiles, grateful for your gesture. "You always know how to make things better."`;
      }
      return { text: reply, updates: update };
    }
  },
  {
    type: "apologize",
    patterns: [/apologize to (.+)/i, /say sorry to (.+)/i, /i'?m sorry to (.+)/i, /make up with (.+)/i],
    intent: "apologize",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "No one here by that name to apologize to." };
      let update = {};
      let reply = "";
      if (target.mood === "angry") {
        update = { friendship: target.friendship + 10, mood: "neutral" };
        reply = `${target.name} takes a deep breath, eyes softening. "Okay, let's start fresh. I appreciate you saying that." You both let the past dissolve into a mutual smile.`;
      } else {
        update = { friendship: target.friendship + 3 };
        reply = `${target.name} shrugs, quick to forgive. "We're good, ${actor}."`;
      }
      return { text: reply, updates: update };
    }
  },
  {
    type: "tease",
    patterns: [/tease (.+)/i, /joke with (.+)/i, /make fun of (.+)/i, /banter with (.+)/i, /tickle (.+)/i],
    intent: "tease",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "Can't tease someone who isn't here!" };
      if (target.personality === "confident" || target.personality === "energetic") {
        return { text: `${target.name} bursts into laughter, eyes sparkling. "You're hilarious!"`, updates: { mood: "happy", friendship: target.friendship + 5 } };
      }
      if (target.personality === "shy" || target.mood === "nervous") {
        return { text: `${target.name} looks away, flustered but secretly pleased. Maybe go gently.`, updates: { mood: "nervous", friendship: target.friendship + 1 } };
      }
      return { text: `${target.name} grins and fires right back with a witty joke. Banter strengthens your friendship.`, updates: { mood: "happy", friendship: target.friendship + 2 } };
    }
  },
  // Expanded generic "use item" or "interact with item"
  {
    type: "useItem",
    patterns: [/use (.+)/i, /give (.+) to (.+)/i, /show (.+) to (.+)/i, /read (.+)/i, /eat (.+)/i, /drink (.+)/i],
    intent: "use_item",
    resolve: ({ actor, target, state, match }) => {
      const itemCandidate = (match[1] || "").toLowerCase();
      const inventory = state.player.inventory;
      const ownedItem = inventory.find(i => i.toLowerCase().includes(itemCandidate));
      if (!ownedItem) return { text: "You're not carrying that item." };
      // Eating/drinking
      if (/eat|drink/.test(match[0]) && ownedItem === "Shiny Apple") {
        return { text: "You take a crisp bite of the apple—refreshing! You feel energized.", updates: { energy: state.player.stats.energy + 10 } };
      }
      if (/read/.test(match[0]) && ownedItem === "Mysterious Book") {
        return { text: "As you read the book, strange secrets about Rivertown High unfold, hinting at hidden friendships and mysterious past loves. Perhaps you could share them with someone special?" };
      }
      return { text: `You interact with the ${ownedItem}, but nothing unusual happens... yet.` };
    }
  },
  {
    type: "checkInventory",
    patterns: [/inventory|inv\b|bag|backpack|items/i, /check inventory/i],
    intent: "inventory",
    resolve: ({ actor, target, state, match }) => {
      return { text: state.player.inventory.length ? "You are carrying: " + state.player.inventory.join(', ') : "Your inventory is empty." };
    }
  },
  // Pick up items covers robust inventory
  {
    type: "pickUpItem",
    patterns: [/pick up (.+)/i, /take (.+)/i, /grab (.+)/i, /collect (.+)/i, /get (.+)/i],
    intent: "pick_up_item",
    resolve: ({ actor, target, state, match }) => {
      const [row, col] = state.player.location;
      const loc = state.map[row][col];
      const locItems = LOCATION_ITEMS[loc] || [];
      const itemCandidate = (match[1] || match[2] || "").toLowerCase();
      const found = locItems.find(x => x.name.toLowerCase().includes(itemCandidate));
      if (found) {
        if (!state.player.inventory.includes(found.name)) {
          state.player.inventory.push(found.name);
          state.pickedItems.push(found.name);
          return { text: `You pick up the ${found.name}. ${found.desc}` };
        } else {
          return { text: `You’ve already picked up the ${found.name}.` };
        }
      }
      return { text: "You don't see that here." };
    }
  },
  // Date, partner-specific events, sharing, etc are covered above
  // Add more interaction modules as needed to triple overall
  // fallback for direct speech
  {
    type: "say",
    patterns: [/say ['"](.*)['"] to (.+)/i, /tell (.+),? ['"](.*)['"]/i],
    intent: "say",
    resolve: ({ actor, target, state, match }) => {
      if (!target) return { text: "They're not here to talk to." };
      let said = match[1] || match[2] || '';
      if (!said) return { text: `${target.name} asks, "What do you want to say?"` };
      return { text: `You say "${said}" to ${target.name}. ${target.name} listens with interest, nodding thoughtfully as they consider your words. Their respect for you grows.` , updates: { friendship: target.friendship + 2 } }
    }
  }
];

// Utility—return first intent/action that matches the input, or null, filling in parsed params.
function matchInteraction(input, npcsHere) {
  let lowered = input.trim().toLowerCase();
  for (const def of INTERACTION_DEFS) {
    for (const pat of def.patterns) {
      const m = lowered.match(pat);
      if (m) {
        // Try to extract target; allow partial matches by name (must be present in npcsHere).
        for (const npc of npcsHere) {
          for (let i = 1; i < m.length; ++i) {
            if (m[i] && npc.name.toLowerCase() === m[i].toLowerCase()) {
              return { ...def, match: m, target: npc }
            }
          }
          if (lowered.includes(npc.name.toLowerCase())) {
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

  // Directions
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

    // Movement
    for (const dir of ['north', 'south', 'east', 'west']) {
      if (lowered === `go ${dir}` || lowered === dir) {
        output = tryMove(dir, newState);
        break;
      }
    }
    // Look/describe
    if (/^look/.test(lowered) || /examine|describe|survey/.test(lowered)) {
      output = describeLocation(newState.player.location, newState);
    }

    // Inventory management: check inventory, implied
    if (/inventory|inv\b|bag|backpack|items/.test(lowered)) {
      output = describeInventory(newState.player.inventory);
    }

    // "here" NPCs: now, everyone with (idx % 3) === (row+col)%3 AND in same "location", for deeper logic
    const [row, col] = newState.player.location;
    const locName = newState.map[row][col];
    const hereNames = newState.npcs.filter((npc, idx) =>
      (idx % 3) === (row + col) % 3
    );
    // Main parser: allow multiple triggers per command!
    if (!output && lowered.match(/hand|hold|hug|date|love|kiss|comfort|apologize|flirt|compliment|banter|gift|give|defend|protect|argue|fight|confide|share|invite|challenge|use|show|say |tell/)) {
      const matched = matchInteraction(lowered, hereNames);
      if (matched) {
        let idx = matched.target ? newState.npcs.findIndex(n => n.id === matched.target.id) : null;
        let reply, changes = {}, secretUpdates = [], itemsGiven;
        if (matched.target && idx !== null && idx >= 0) {
          const res = matched.resolve({
            actor: newState.player.name,
            target: {...newState.npcs[idx]}, // prevent direct mutation
            state: newState,
            match: matched.match
          });
          reply = res.text;
          if (res.updates) {
            for (let k in res.updates) {
              if (k === 'handsHeld') newState.npcs[idx].bfGfFlags.handsHeld = true;
              else if (k in newState.npcs[idx]) newState.npcs[idx][k] = res.updates[k];
              else if (k in newState.player.stats) newState.player.stats[k] = res.updates[k];
            }
          }
          if (res.affection) newState.npcs[idx].affection = (newState.npcs[idx].affection || 0) + res.affection;
          if (res.friendship) newState.npcs[idx].friendship = (newState.npcs[idx].friendship || 0) + res.friendship;
          if (res.secrets) {
            newState.npcs[idx].secretsShared.push(...res.secrets);
          }
          if (res.itemsGiven) {
            if (!newState.npcs[idx].itemsGiven) newState.npcs[idx].itemsGiven = [];
            newState.npcs[idx].itemsGiven = res.itemsGiven;
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

    // Fallback: classic direct "talk to", "interact with"
    const talkMatch = lowered.match(/^talk to (\w+)|^interact with (\w+)/);
    if (!output && talkMatch) {
      const target = (talkMatch[1] || talkMatch[2] || '').toLowerCase();
      output = interactWithNPC(target, newState);
    }

    // Pick up item: "pick up ___"
    const pickupMatch = lowered.match(/pick up (.+)/);
    if (!output && pickupMatch) {
      const item = (pickupMatch[1] || "").toLowerCase();
      output = pickUpItem(item, newState);
    }

    // Use item
    const useMatch = lowered.match(/use (.+)/);
    if (!output && useMatch) {
      let item = useMatch[1] && useMatch[1].toLowerCase();
      output = doUseItem(item, newState);
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
      output = `Zack hesitates, unsure how to proceed. Try detailed social moves—'hold Fiona's hand', 'go on a date with Fiona', 'give Grace wildflower', 'comfort Emma', 'share secret with Chris', or interact with objects via 'pick up wildflower', 'use apple', or 'check inventory'.`;
    }

    newState.narrative.push(`> ${raw}`);
    newState.narrative.push(output);
    if (newState.narrative.length > 36) newState.narrative = newState.narrative.slice(-36);

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

  // Describe the location; add paragraph-level flavor
  function describeLocation([row, col], state, isArrival) {
    const locName = state.map[row][col];
    let extra = '';
    // Place NPCs/items in locations with deepened description
    const npcsHere = state.npcs.filter((npc, idx) => (idx % 3) === (row + col) % 3);
    if (npcsHere.length > 0)
      extra += " You see here: " + npcsHere.map(npc => npc.name).join(', ') + ".";
    let itemsHere = '';
    const items = LOCATION_ITEMS[locName] || [];
    if (items.length > 0) {
      // Only note items not yet picked up
      const notYetPicked = items.filter(x => !state.pickedItems.includes(x.name));
      if (notYetPicked.length)
        itemsHere = ` On a nearby surface: ${notYetPicked.map(x => x.name).join(', ')}.`;
    }
    // Enhanced paragraph
    return `${isArrival ? "You head to" : "You’re at"} the ${locName}. The air feels charged with possibility—friends gather here, secrets lie hidden, and romance could blossom anywhere.${extra}${itemsHere}`;
  }

  // Show player inventory
  function describeInventory(items) {
    return items.length
      ? "You are carrying: " + items.join(', ')
      : "Your inventory is empty.";
  }

  // Fallback basic conversation
  function interactWithNPC(npcName, state) {
    const [row, col] = state.player.location;
    const hereNames = state.npcs.filter((npc, idx) =>
      (idx % 3) === ((row + col) % 3)
    ).map(n => n.name.toLowerCase());
    const idx = state.npcs.findIndex(n => n.name.toLowerCase() === npcName);
    if (idx < 0) return "There's no one by that name here.";
    if (!hereNames.includes(npcName)) return `You don't see ${state.npcs[idx].name} here.`;
    state.npcs[idx].met = true;
    state.npcs[idx].friendship += 4;
    return `You approach ${state.npcs[idx].name}. ${state.npcs[idx].desc} The conversation drifts from daily school life to little moments of honesty. You feel your relationship with them beginning to deepen.`;
  }

  // Robust item pickup
  function pickUpItem(item, state) {
    const [row, col] = state.player.location;
    const loc = state.map[row][col];
    const locItems = LOCATION_ITEMS[loc] || [];
    const itemName = locItems.find(x => x.name.toLowerCase().includes(item));
    if (itemName) {
      if (!state.player.inventory.includes(itemName.name)) {
        state.player.inventory.push(itemName.name);
        state.pickedItems.push(itemName.name);
        return `You pick up the ${itemName.name}. ${itemName.desc}`;
      } else {
        return `You've already picked up the ${itemName.name}.`;
      }
    }
    return "You don't see that here.";
  }

  // Robust "use item"
  function doUseItem(item, state) {
    const inventory = state.player.inventory;
    const owned = inventory.find(x => x.toLowerCase().includes(item));
    if (!owned) return "You aren't carrying that.";
    // Provide contextful effect
    if (owned === 'Shiny Apple') {
      state.player.stats.energy += 10;
      return "You eat the apple. Your energy is restored, and nearby friends watch with a smile.";
    }
    if (owned === 'Wildflower') {
      return "Perhaps you'd like to give this flower to someone special?";
    }
    if (owned === 'Mysterious Book') {
      return "You read the book: school secrets—friendships, heartbreak, secret admirers—spill into your mind, hinting at possible romance unlocks.";
    }
    return `You interact with the ${owned}, but nothing happens... yet.`;
  }

  // Attempt to generate a dynamic, multi-sentence fallback response (to triple variety)
  function genericTalkResponse(lowered, npcsHere, state) {
    if (npcsHere.length === 0) return "No one is here to talk to! The silence in the room feels heavy, as if the world awaits your next move.";
    const npc = npcsHere[0];
    // Expanded unique fallback per personality
    let phrases = [
      `"I'm not sure what you mean, but it's always interesting talking with you, ${state.player.name}." ${npc.name} leans in, hopeful you'll keep the conversation going.`,
      `"Is there something deeper you want to say?" ${npc.name} watches your face, searching for clues in your eyes.`,
      `"Heh, you're fun to be around. Want to do something together?" ${npc.name} suggests, eager to spend more time.`,
      `"Why not try being bold, like inviting me to a school event?"`,
      `"I wonder if you'd like to share a secret—or hold hands?"`,
      `"You know, sometimes it's just nice to talk for the sake of talking."`,
      `"You're making high school a lot more interesting, that's for sure."`,
    ];
    if (npc.personality === "analytical") phrases.push('"That suggestion was interesting. Do you think there’s a logical reason for it?"');
    if (npc.personality === "dramatic") phrases.push('"If only life could be as dramatic as theatre!"');
    if (npc.personality === "confident") phrases.push(`"Keep it coming, I can handle anything you throw at me!"`);
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
  // Show romance/relationship in side bar
  const romanceNpcs = npcs.filter(n => n.relationship === "girlfriend" || n.relationship === "boyfriend");
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
        <div className="sidebar-title">Relationships</div>
        {romanceNpcs.length === 0 ? <div className="npc-empty">None</div> :
          <ul className="npc-list">
            {romanceNpcs.map(npc =>
              <li key={npc.id} title={npc.desc}>
                {npc.name} <span style={{color:COLORS.accent}}>❤️</span>
                <span style={{marginLeft:4,fontSize:"85%"}}>({npc.relationship === "girlfriend" ? "GF" : "BF"}, Affection: {npc.affection})</span>
              </li>)}
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
        placeholder="Type your command (e.g. hold Fiona's hand, go on a date with Fiona, give Grace wildflower)..."
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={120}
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
