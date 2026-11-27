import express from 'express';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const MAX_PLAYERS = 5;

const UNIFORM_IDS = [
  'multicam', 'desert', 'midnight', 'arctic', 'crimson', 'cobalt',
  'emerald', 'amber', 'violet', 'teal', 'copper', 'slate',
  'moss', 'magenta', 'cyan', 'ochre', 'plum', 'olive',
];

interface NetworkPlayer {
  id: string;
  name: string;
  country: string;
  uniform: string;
  gender: 'male' | 'female';
  helmet: number;
  caricature: string;
  isHost: boolean;
  alive: boolean;
  hp: number;
  armor: number;
  kills: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  anim: string;
  weaponId: string;
  hasDrone: boolean;
  ws: WebSocket;
}

interface GameRoom {
  code: string;
  hostId: string;
  terrain: number;
  themeColor: string;
  botsEnabled: boolean;
  status: 'lobby' | 'playing';
  players: Map<string, NetworkPlayer>;
}

const rooms = new Map<string, GameRoom>();

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function pickUniqueUniform(room: GameRoom, requested: string, excludeId?: string): string {
  const used = new Set<string>();
  for (const p of room.players.values()) {
    if (excludeId && p.id === excludeId) continue;
    used.add(p.uniform);
  }
  if (UNIFORM_IDS.includes(requested) && !used.has(requested)) {
    return requested;
  }
  for (const id of UNIFORM_IDS) {
    if (!used.has(id)) return id;
  }
  return requested || 'multicam';
}

function serializePlayer(p: NetworkPlayer) {
  return {
    id: p.id,
    name: p.name,
    country: p.country,
    uniform: p.uniform,
    gender: p.gender,
    helmet: p.helmet,
    caricature: p.caricature,
    isHost: p.isHost,
    alive: p.alive,
    hp: p.hp,
    armor: p.armor,
    kills: p.kills,
    x: p.x,
    y: p.y,
    z: p.z,
    yaw: p.yaw,
    pitch: p.pitch,
    anim: p.anim,
    weaponId: p.weaponId,
    hasDrone: p.hasDrone,
  };
}

function serializeRoom(room: GameRoom) {
  return {
    code: room.code,
    hostId: room.hostId,
    terrain: room.terrain,
    themeColor: room.themeColor,
    botsEnabled: room.botsEnabled,
    status: room.status,
    maxPlayers: MAX_PLAYERS,
    players: Array.from(room.players.values()).map(serializePlayer),
  };
}

function sendJson(ws: WebSocket, payload: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoom(room: GameRoom, payload: Record<string, unknown>, excludeId?: string) {
  const msg = JSON.stringify(payload);
  for (const p of room.players.values()) {
    if (excludeId && p.id === excludeId) continue;
    if (p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(msg);
    }
  }
}

function getRoomListPayload() {
  const list: Array<Record<string, unknown>> = [];
  for (const r of rooms.values()) {
    const host = r.players.get(r.hostId);
    list.push({
      code: r.code,
      hostName: host ? host.name : 'Host',
      terrain: r.terrain,
      themeColor: r.themeColor,
      botsEnabled: r.botsEnabled,
      playerCount: r.players.size,
      maxPlayers: MAX_PLAYERS,
      status: r.status,
    });
  }
  return { type: 'room_list', rooms: list };
}

const SPAWN_RING: Array<[number, number]> = [
  [0, 26],
  [-24, -22],
  [24, -22],
  [-26, 18],
  [26, 18],
];

function checkSurvivorWinner(room: GameRoom) {
  if (room.status !== 'playing') return;
  const all = Array.from(room.players.values());
  if (all.length < 2) return;
  const alive = all.filter((p) => p.alive);
  if (alive.length === 1) {
    const winner = alive[0];
    room.status = 'lobby';
    broadcastRoom(room, {
      type: 'match_winner',
      winner: serializePlayer(winner),
      room: serializeRoom(room),
    });
  } else if (alive.length === 0) {
    room.status = 'lobby';
    broadcastRoom(room, {
      type: 'match_winner',
      winner: null,
      room: serializeRoom(room),
    });
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (_req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  });
  const server = http.createServer(app);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size });
  });

  app.post('/api/suggestions', async (req, res) => {
    const body = req.body || {};
    const name = String(body.name || 'Player').trim().slice(0, 60);
    const category = String(body.category || 'General').trim().slice(0, 60);
    const message = String(body.message || '').trim().slice(0, 2000);
    if (!message) {
      res.status(400).json({ ok: false, error: 'Please enter a suggestion message.' });
      return;
    }

    const entry = {
      timestamp: new Date().toISOString(),
      to: 'jccodilla@gmail.com',
      name,
      category,
      message,
    };

    try {
      await fs.appendFile(path.resolve(__dirname, 'suggestions.jsonl'), JSON.stringify(entry) + '\n', 'utf8');
    } catch {}

    let forwarded = false;
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 4500);
      const emailRes = await fetch('https://formsubmit.co/ajax/jccodilla@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `[Lucas Extreme Battlefield] Suggestion: ${category}`,
          _template: 'table',
          Player: name,
          Category: category,
          Suggestion: message,
          App: 'Lucas Extreme Battlefield by JMC Labs (for Lucas the Pogi)',
        }),
        signal: ac.signal,
      });
      clearTimeout(timer);
      forwarded = emailRes.ok;
    } catch {}

    res.json({ ok: true, to: 'jccodilla@gmail.com', forwarded });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    const clientId = generateId();
    let currentRoom: GameRoom | null = null;

    sendJson(ws, { type: 'welcome', clientId });
    sendJson(ws, getRoomListPayload());

    function leaveCurrentRoom() {
      if (!currentRoom) return;
      const room = currentRoom;
      currentRoom = null;
      const leaving = room.players.get(clientId);
      room.players.delete(clientId);

      if (room.players.size === 0) {
        rooms.delete(room.code);
        return;
      }

      if (room.hostId === clientId) {
        const nextHost = room.players.values().next().value as NetworkPlayer | undefined;
        if (nextHost) {
          nextHost.isHost = true;
          room.hostId = nextHost.id;
        }
      }

      broadcastRoom(room, {
        type: 'player_left',
        playerId: clientId,
        playerName: leaving ? leaving.name : 'Soldier',
        room: serializeRoom(room),
      });
      checkSurvivorWinner(room);
    }

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }

      const type = String(msg.type || '');

      if (type === 'list_rooms') {
        sendJson(ws, getRoomListPayload());
        return;
      }

      if (type === 'host_create') {
        leaveCurrentRoom();
        const requestedCode = String(msg.code || '').trim().toUpperCase().slice(0, 6);
        if (requestedCode && rooms.has(requestedCode)) {
          sendJson(ws, {
            type: 'error',
            message: `Room ${requestedCode} already has a Host. Join as Guest instead.`,
          });
          return;
        }
        const code = requestedCode || generateRoomCode();
        const player: NetworkPlayer = {
          id: clientId,
          name: String(msg.name || 'Lucas').slice(0, 18),
          country: String(msg.country || 'PH').slice(0, 4),
          uniform: UNIFORM_IDS.includes(String(msg.uniform || '')) ? String(msg.uniform) : 'multicam',
          gender: msg.gender === 'female' ? 'female' : 'male',
          helmet: Math.max(0, Math.min(4, Number(msg.helmet) || 0)),
          caricature: typeof msg.caricature === 'string' ? msg.caricature.slice(0, 80000) : '',
          isHost: true,
          alive: true,
          hp: 250,
          armor: 120,
          kills: 0,
          x: SPAWN_RING[0][0],
          y: 0,
          z: SPAWN_RING[0][1],
          yaw: 0,
          pitch: 0,
          anim: 'idle',
          weaponId: 'rifle',
          hasDrone: false,
          ws,
        };
        const room: GameRoom = {
          code,
          hostId: clientId,
          terrain: Number(msg.terrain) || 0,
          themeColor: String(msg.themeColor || '#e5b842'),
          botsEnabled: Boolean(msg.botsEnabled),
          status: 'lobby',
          players: new Map([[clientId, player]]),
        };
        rooms.set(code, room);
        currentRoom = room;
        sendJson(ws, { type: 'room_joined', selfId: clientId, assignedUniform: player.uniform, room: serializeRoom(room) });
        return;
      }

      if (type === 'join_room') {
        leaveCurrentRoom();
        const code = String(msg.code || '').trim().toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          sendJson(ws, { type: 'error', message: `Room ${code || '?'} not found.` });
          return;
        }
        if (room.players.size >= MAX_PLAYERS) {
          sendJson(ws, { type: 'error', message: `Room ${code} is full (max ${MAX_PLAYERS} players).` });
          return;
        }
        const spawnIdx = room.players.size % SPAWN_RING.length;
        const uniqueUniform = pickUniqueUniform(room, String(msg.uniform || 'multicam'));
        const player: NetworkPlayer = {
          id: clientId,
          name: String(msg.name || 'Soldier').slice(0, 18),
          country: String(msg.country || 'PH').slice(0, 4),
          uniform: uniqueUniform,
          gender: msg.gender === 'female' ? 'female' : 'male',
          helmet: Math.max(0, Math.min(4, Number(msg.helmet) || 0)),
          caricature: typeof msg.caricature === 'string' ? msg.caricature.slice(0, 80000) : '',
          isHost: false,
          alive: room.status === 'lobby',
          hp: 250,
          armor: 120,
          kills: 0,
          x: SPAWN_RING[spawnIdx][0],
          y: 0,
          z: SPAWN_RING[spawnIdx][1],
          yaw: 0,
          pitch: 0,
          anim: 'idle',
          weaponId: 'rifle',
          hasDrone: false,
          ws,
        };
        room.players.set(clientId, player);
        currentRoom = room;
        sendJson(ws, { type: 'room_joined', selfId: clientId, assignedUniform: uniqueUniform, room: serializeRoom(room) });
        broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) }, clientId);
        return;
      }

      if (type === 'leave_room') {
        leaveCurrentRoom();
        return;
      }

      if (!currentRoom) return;
      const room = currentRoom;
      const self = room.players.get(clientId);
      if (!self) return;

      if (type === 'host_config') {
        if (room.hostId !== clientId) return;
        if (typeof msg.terrain === 'number') room.terrain = Math.max(0, Math.min(4, msg.terrain));
        if (typeof msg.themeColor === 'string') room.themeColor = msg.themeColor.slice(0, 16);
        if (typeof msg.botsEnabled === 'boolean') room.botsEnabled = msg.botsEnabled;
        broadcastRoom(room, { type: 'room_state', room: serializeRoom(room) });
        return;
      }

      if (type === 'start_match') {
        if (room.hostId !== clientId) return;
        room.status = 'playing';
        let idx = 0;
        for (const p of room.players.values()) {
          const sp = SPAWN_RING[idx % SPAWN_RING.length];
          p.alive = true;
          p.hp = 250;
          p.armor = 120;
          p.kills = 0;
          p.x = sp[0];
          p.y = 0;
          p.z = sp[1];
          idx++;
        }
        broadcastRoom(room, { type: 'match_started', room: serializeRoom(room) });
        return;
      }

      if (type === 'player_state') {
        if (!self.alive) return;
        self.x = Number(msg.x) || 0;
        self.y = Number(msg.y) || 0;
        self.z = Number(msg.z) || 0;
        self.yaw = Number(msg.yaw) || 0;
        self.pitch = Number(msg.pitch) || 0;
        self.anim = String(msg.anim || 'idle');
        self.weaponId = String(msg.weaponId || 'rifle');
        self.hasDrone = Boolean(msg.hasDrone);
        if (msg.gender === 'female' || msg.gender === 'male') self.gender = msg.gender;
        if (typeof msg.helmet === 'number') self.helmet = Math.max(0, Math.min(4, msg.helmet));
        if (typeof msg.uniform === 'string') {
          self.uniform = pickUniqueUniform(room, msg.uniform.slice(0, 24), clientId);
        }
        if (typeof msg.country === 'string') self.country = msg.country.slice(0, 4);

        broadcastRoom(room, { type: 'remote_state', player: serializePlayer(self) }, clientId);
        return;
      }

      if (type === 'bot_states') {
        if (room.hostId !== clientId || !room.botsEnabled) return;
        broadcastRoom(room, { type: 'remote_bots', bots: msg.bots }, clientId);
        return;
      }

      if (type === 'bot_hit') {
        const host = room.players.get(room.hostId);
        if (host) {
          sendJson(host.ws, {
            type: 'guest_bot_hit',
            attackerId: clientId,
            attackerName: self.name,
            botId: msg.botId,
            damage: msg.damage,
            isHeadshot: Boolean(msg.isHeadshot),
          });
        }
        return;
      }

      if (type === 'bot_hit_player') {
        if (room.hostId !== clientId) return;
        const target = room.players.get(String(msg.targetId || ''));
        if (!target || !target.alive) return;
        const dmg = Math.max(1, Math.min(100, Number(msg.damage) || 12));
        let rem = dmg;
        if (target.armor > 0) {
          const abs = Math.min(target.armor, rem);
          target.armor -= abs;
          rem -= abs;
        }
        if (rem > 0) target.hp = Math.max(0, target.hp - rem);
        broadcastRoom(room, {
          type: 'player_damaged',
          targetId: target.id,
          attackerId: 'bot',
          attackerName: String(msg.botName || 'Army Bot'),
          hp: target.hp,
          armor: target.armor,
          damage: dmg,
          isHeadshot: false,
        });
        if (target.hp <= 0) {
          target.alive = false;
          target.hasDrone = false;
          broadcastRoom(room, {
            type: 'player_killed',
            victimId: target.id,
            victimName: target.name,
            killerId: 'bot',
            killerName: String(msg.botName || 'Army Bot'),
            isHeadshot: false,
            room: serializeRoom(room),
          });
          checkSurvivorWinner(room);
        }
        return;
      }

      if (type === 'player_fire') {
        if (!self.alive) return;
        broadcastRoom(room, {
          type: 'remote_fire',
          shooterId: clientId,
          origin: msg.origin,
          target: msg.target,
          color: msg.color,
          weaponId: msg.weaponId,
        }, clientId);
        return;
      }

      if (type === 'throw_grenade') {
        if (!self.alive) return;
        broadcastRoom(room, {
          type: 'remote_grenade',
          throwerId: clientId,
          origin: msg.origin,
          vel: msg.vel,
        }, clientId);
        return;
      }

      if (type === 'emp_pulse') {
        if (!self.alive) return;
        const ox = Number(msg.x) || 0;
        const oz = Number(msg.z) || 0;
        for (const p of room.players.values()) {
          if (p.id !== clientId && p.alive && p.hasDrone) {
            const d = Math.hypot(p.x - ox, p.z - oz);
            if (d <= 28) p.hasDrone = false;
          }
        }
        broadcastRoom(room, { type: 'remote_emp', casterId: clientId, x: ox, z: oz });
        return;
      }

      if (type === 'player_hit') {
        if (room.status !== 'playing' || !self.alive) return;
        const targetId = String(msg.targetId || '');
        const dmg = Math.max(1, Math.min(200, Number(msg.damage) || 20));
        const isHeadshot = Boolean(msg.isHeadshot);
        const target = room.players.get(targetId);
        if (!target || !target.alive || target.id === clientId) return;

        let rem = dmg;
        if (target.armor > 0) {
          const absorbed = Math.min(target.armor, rem);
          target.armor -= absorbed;
          rem -= absorbed;
        }
        if (rem > 0) {
          target.hp = Math.max(0, target.hp - rem);
        }

        broadcastRoom(room, {
          type: 'player_damaged',
          targetId: target.id,
          attackerId: clientId,
          attackerName: self.name,
          hp: target.hp,
          armor: target.armor,
          damage: dmg,
          isHeadshot,
        });

        if (target.hp <= 0) {
          target.alive = false;
          target.hasDrone = false;
          self.kills += 1;
          broadcastRoom(room, {
            type: 'player_killed',
            victimId: target.id,
            victimName: target.name,
            killerId: self.id,
            killerName: self.name,
            isHeadshot,
            room: serializeRoom(room),
          });
          checkSurvivorWinner(room);
        }
      }
    });

    ws.on('close', () => {
      leaveCurrentRoom();
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Lucas Extreme Battlefield server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
