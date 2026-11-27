(function () {
  'use strict';

  var ws = null;
  var clientId = '';
  var room = null;
  var handlers = {};
  var connected = false;

  function emit(ev, data) {
    if (handlers[ev]) handlers[ev](data);
  }

  function getApiBase() {
    if (window.Capacitor || location.protocol === 'capacitor:' || location.protocol === 'file:') {
      return 'https://ais-pre-ixyvm4cv6zipshqzkviarp-1017503256644.europe-west2.run.app';
    }
    return '';
  }

  function getWsUrl() {
    var custom = '';
    try { custom = localStorage.getItem('lucas_ws_url') || ''; } catch (e) {}
    if (custom) return custom;
    if (window.Capacitor || location.protocol === 'capacitor:' || location.protocol === 'file:') {
      return 'wss://ais-pre-ixyvm4cv6zipshqzkviarp-1017503256644.europe-west2.run.app/ws';
    }
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + location.host + '/ws';
  }

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    try {
      ws = new WebSocket(getWsUrl());
    } catch (e) {
      emit('status', 'Offline');
      return;
    }

    ws.onopen = function () {
      connected = true;
      emit('status', 'Connected');
      send({ type: 'list_rooms' });
    };
    ws.onclose = function () { connected = false; emit('status', 'Disconnected'); };
    ws.onerror = function () { connected = false; emit('status', 'Offline'); };

    ws.onmessage = function (ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.type === 'welcome') {
        clientId = msg.clientId || '';
      } else if (msg.type === 'room_list') {
        emit('room_list', msg.rooms || []);
      } else if (msg.type === 'room_joined') {
        room = msg.room;
        if (msg.assignedUniform) emit('assigned_uniform', msg.assignedUniform);
        emit('room_update', room);
      } else if (msg.type === 'room_state') {
        room = msg.room;
        emit('room_update', room);
      } else if (msg.type === 'player_left') {
        room = msg.room;
        emit('player_left', msg);
        emit('room_update', room);
      } else if (msg.type === 'match_started') {
        room = msg.room;
        emit('match_started', room);
      } else if (msg.type === 'remote_state') {
        emit('remote_state', msg.player);
      } else if (msg.type === 'remote_bots') {
        emit('remote_bots', msg.bots || []);
      } else if (msg.type === 'guest_bot_hit') {
        emit('guest_bot_hit', msg);
      } else if (msg.type === 'remote_fire') {
        emit('remote_fire', msg);
      } else if (msg.type === 'remote_grenade') {
        emit('remote_grenade', msg);
      } else if (msg.type === 'remote_emp') {
        emit('remote_emp', msg);
      } else if (msg.type === 'player_damaged') {
        emit('player_damaged', msg);
      } else if (msg.type === 'player_killed') {
        room = msg.room;
        emit('player_killed', msg);
      } else if (msg.type === 'match_winner') {
        room = msg.room;
        emit('match_winner', msg);
      } else if (msg.type === 'error') {
        emit('error', msg.message || 'Network error');
      }
    };
  }

  function send(payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  window.GameNet = {
    on: function (ev, fn) { handlers[ev] = fn; },
    connect: connect,
    getApiBase: getApiBase,
    isConnected: function () { return connected; },
    getClientId: function () { return clientId; },
    getRoom: function () { return room; },
    isHost: function () { return Boolean(room && room.hostId === clientId); },
    inRoom: function () { return Boolean(room); },
    refreshRooms: function () { send({ type: 'list_rooms' }); },
    hostCreate: function (opts) {
      connect();
      send({
        type: 'host_create',
        code: opts.code || '',
        name: opts.name,
        country: opts.country,
        uniform: opts.uniform,
        gender: opts.gender,
        helmet: opts.helmet,
        caricature: opts.caricature || '',
        terrain: opts.terrain,
        themeColor: opts.themeColor,
        botsEnabled: Boolean(opts.botsEnabled),
      });
    },
    joinRoom: function (opts) {
      connect();
      send({
        type: 'join_room',
        code: opts.code,
        name: opts.name,
        country: opts.country,
        uniform: opts.uniform,
        gender: opts.gender,
        helmet: opts.helmet,
        caricature: opts.caricature || '',
      });
    },
    leaveRoom: function () {
      send({ type: 'leave_room' });
      room = null;
      emit('room_update', null);
    },
    hostConfig: function (terrain, themeColor, botsEnabled) {
      send({ type: 'host_config', terrain: terrain, themeColor: themeColor, botsEnabled: Boolean(botsEnabled) });
    },
    startMatch: function () { send({ type: 'start_match' }); },
    sendState: function (st) {
      send({
        type: 'player_state',
        x: st.x,
        y: st.y,
        z: st.z,
        yaw: st.yaw,
        pitch: st.pitch,
        anim: st.anim,
        weaponId: st.weaponId,
        hasDrone: st.hasDrone,
        uniform: st.uniform,
        country: st.country,
        gender: st.gender,
        helmet: st.helmet,
      });
    },
    sendBotStates: function (bots) { send({ type: 'bot_states', bots: bots }); },
    sendBotHit: function (botId, damage, isHeadshot) {
      send({ type: 'bot_hit', botId: botId, damage: damage, isHeadshot: isHeadshot });
    },
    sendBotHitPlayer: function (targetId, damage, botName) {
      send({ type: 'bot_hit_player', targetId: targetId, damage: damage, botName: botName });
    },
    sendFire: function (origin, target, color, weaponId) {
      send({
        type: 'player_fire',
        origin: [origin.x, origin.y, origin.z],
        target: [target.x, target.y, target.z],
        color: color,
        weaponId: weaponId,
      });
    },
    sendGrenade: function (origin, vel) {
      send({ type: 'throw_grenade', origin: [origin.x, origin.y, origin.z], vel: [vel.x, vel.y, vel.z] });
    },
    sendEmp: function (x, z) { send({ type: 'emp_pulse', x: x, z: z }); },
    sendHit: function (targetId, damage, isHeadshot) {
      send({ type: 'player_hit', targetId: targetId, damage: damage, isHeadshot: isHeadshot });
    },
  };
})();
