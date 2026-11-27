(function () {
  'use strict';

  var STORAGE_KEY = 'lucas_extreme_battlefield_v6';

  var els = {
    canvasWrap: document.getElementById('game-canvas-container'),
    hud: document.getElementById('hud'),
    crosshair: document.getElementById('crosshair'),
    hitmarker: document.getElementById('hitmarker'),
    dmgVig: document.getElementById('damage-vignette'),
    adsVig: document.getElementById('ads-vignette'),
    floatLayer: document.getElementById('floating-layer'),
    minimap: document.getElementById('minimap-canvas'),
    startOverlay: document.getElementById('start-overlay'),
    shopOverlay: document.getElementById('shop-overlay'),
    deathOverlay: document.getElementById('death-overlay'),
    spectateBar: document.getElementById('spectate-bar'),
    spectateLabel: document.getElementById('spectate-label'),
    winnerOverlay: document.getElementById('winner-overlay'),
    winnerTitle: document.getElementById('winner-title'),
    winnerSub: document.getElementById('winner-sub'),
    waveBanner: document.getElementById('wave-banner'),
    waveTitle: document.getElementById('wave-banner-title'),
    waveSub: document.getElementById('wave-banner-sub'),
    hudName: document.getElementById('hud-name'),
    hudHp: document.getElementById('hud-hp'),
    hudHpBar: document.getElementById('hud-hp-bar'),
    hudArmorBar: document.getElementById('hud-armor-bar'),
    hudWave: document.getElementById('hud-wave'),
    hudHostiles: document.getElementById('hud-hostiles'),
    hudCredits: document.getElementById('hud-credits'),
    hudCombo: document.getElementById('hud-combo'),
    hudAmmoMag: document.getElementById('hud-ammo-mag'),
    hudAmmoRes: document.getElementById('hud-ammo-res'),
    hudAvatar: document.getElementById('hud-avatar'),
    hudPatch: document.getElementById('hud-patch'),
    killfeed: document.getElementById('killfeed'),
    weaponDock: document.getElementById('weapon-dock'),
    compassBearing: document.getElementById('compass-bearing'),
    lobbyAvatar: document.getElementById('lobby-avatar'),
    lobbyCaricature: document.getElementById('lobby-caricature'),
    lobbyHighWave: document.getElementById('lobby-high-wave'),
    lobbyCredits: document.getElementById('lobby-credits'),
    roomBox: document.getElementById('net-room-box'),
    roomList: document.getElementById('net-room-list'),
    roomRoster: document.getElementById('net-roster'),
    roomStatus: document.getElementById('net-status'),
    netCodeInput: document.getElementById('net-code-input'),
    btnStartNetMatch: document.getElementById('btn-start-net-match'),
    chkNetBots: document.getElementById('chk-net-bots'),
    shopCredits: document.getElementById('shop-credits'),
    shopGrid: document.getElementById('shop-grid'),
    grenadeBadge: document.getElementById('grenade-count'),
    empBadge: document.getElementById('emp-count'),
    droneIndicator: document.getElementById('drone-status'),
    exitBanner: document.getElementById('exit-overlay'),
  };

  var state = {
    mode: 'lobby', // lobby | solo | multi | spectate | dead
    playerName: 'Lucas',
    gender: 'male', // male | female
    helmet: 0,      // 0..4 alien helmet design
    country: 'PH',
    uniform: 'multicam',
    themeColor: '#e5b842',
    terrain: 0,
    netBotsEnabled: true,
    faceUrl: './assets/face.jpg',
    caricatureUrl: '',
    hd: true,
    highWave: 1,
    bestCombo: 1,
    credits: 300, // Philippine Peso (₱)
    kills: 0,
    wave: 1,
    combo: 1,
    comboTimer: 0,
    hp: 250,
    maxHp: 250,
    armor: 120,
    maxArmor: 150,
    dmgMult: 1,
    rateMult: 1,
    activeWeaponIdx: 0,
    ownedWeapons: { rifle: true, knife: true },
    ammo: {},
    reloading: false,
    reloadTimer: 0,
    fireCooldown: 0,
    grenades: 2,
    emps: 1,
    hasDrone: false,
    lookBack: false,
    thirdPerson: false,
    ads: false,
    spectateIdx: 0,
  };

  function resetWeaponAmmo() {
    window.GameWeapons.WEAPONS.forEach(function (w) {
      state.ammo[w.id] = { mag: w.mag, res: w.reserve };
    });
  }
  resetWeaponAmmo();

  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (saved.playerName) state.playerName = saved.playerName;
      if (saved.gender === 'female' || saved.gender === 'male') state.gender = saved.gender;
      if (typeof saved.helmet === 'number') state.helmet = saved.helmet;
      if (saved.country) state.country = saved.country;
      if (saved.uniform) state.uniform = saved.uniform;
      if (saved.themeColor) state.themeColor = saved.themeColor;
      if (typeof saved.terrain === 'number') state.terrain = saved.terrain;
      if (typeof saved.netBotsEnabled === 'boolean') state.netBotsEnabled = saved.netBotsEnabled;
      if (typeof saved.hd === 'boolean') state.hd = saved.hd;
      if (typeof saved.highWave === 'number') state.highWave = saved.highWave;
      if (typeof saved.bestCombo === 'number') state.bestCombo = saved.bestCombo;
      if (typeof saved.credits === 'number') state.credits = saved.credits;
    } catch (e) {}
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        playerName: state.playerName,
        gender: state.gender,
        helmet: state.helmet,
        country: state.country,
        uniform: state.uniform,
        themeColor: state.themeColor,
        terrain: state.terrain,
        netBotsEnabled: state.netBotsEnabled,
        hd: state.hd,
        highWave: state.highWave,
        bestCombo: state.bestCombo,
        credits: state.credits,
      }));
    } catch (e) {}
  }

  loadProgress();

  // Three.js Renderer + Studio PMREM Environment Reflections
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 320);
  scene.add(camera);

  var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ('SRGBColorSpace' in THREE) renderer.outputColorSpace = THREE.SRGBColorSpace;
  else if ('sRGBEncoding' in THREE) renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  els.canvasWrap.appendChild(renderer.domElement);

  // Zero-dependency procedural Studio Environment Map for sharp metallic weapon & helmet reflections
  (function setupStudioEnv() {
    var pmrem = new THREE.PMREMGenerator(renderer);
    var envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x64748b);
    var panelMat1 = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    var panelMat2 = new THREE.MeshBasicMaterial({ color: 0xbae6fd, side: THREE.DoubleSide });
    var topPanel = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), panelMat1);
    topPanel.position.set(0, 8, 0);
    topPanel.rotation.x = Math.PI / 2;
    envScene.add(topPanel);
    var sidePanel = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), panelMat2);
    sidePanel.position.set(7, 3, 0);
    sidePanel.rotation.y = -Math.PI / 2;
    envScene.add(sidePanel);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
  })();

  var hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x4b5563, 0.92);
  scene.add(hemiLight);
  var sunLight = new THREE.DirectionalLight(0xfff4d6, 1.85);
  sunLight.position.set(28, 42, 22);
  sunLight.castShadow = true;
  sunLight.shadow.camera.left = -48;
  sunLight.shadow.camera.right = 48;
  sunLight.shadow.camera.top = 48;
  sunLight.shadow.camera.bottom = -48;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  function applyQuality() {
    var dpr = state.hd ? Math.min(2, window.devicePixelRatio || 1) : 1;
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = state.hd;
    sunLight.castShadow = state.hd;
    sunLight.shadow.mapSize.set(state.hd ? 2048 : 512, state.hd ? 2048 : 512);
    document.getElementById('btn-quality').textContent = state.hd ? 'HD' : 'SD';
    document.getElementById('lobby-quality').textContent = state.hd ? 'QUALITY: HD' : 'QUALITY: SD';
  }
  applyQuality();

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    applyQuality();
  });

  // Load Male Soldier.glb (Lady Operatives use stylized anatomical GameFemale rig)
  var soldierAsset = null;
  var gltfLoader = new THREE.GLTFLoader();

  gltfLoader.load('./assets/Soldier.glb', function (gltf) {
    soldierAsset = { scene: gltf.scene, animations: gltf.animations };
    if (state.mode === 'lobby') rebuildLobbySoldier();
  });

  var currentArena = null;
  function loadTerrain(idx) {
    if (currentArena && currentArena.group) scene.remove(currentArena.group);
    state.terrain = Math.max(0, Math.min(4, idx));
    currentArena = window.GameArena.buildArena(scene, renderer, state.terrain, state.themeColor);
  }
  loadTerrain(state.terrain);

  function getUniformObj(id) {
    return window.GameAssets.UNIFORMS.find(function (u) { return u.id === id; }) || window.GameAssets.UNIFORMS[0];
  }

  function applyThemeCss() {
    document.documentElement.style.setProperty('--gold', state.themeColor);
    document.documentElement.style.setProperty('--border-olive', state.themeColor + '66');
  }
  applyThemeCss();

  // First-person Viewmodel Rig (Unified weapon + CoD-Mobile articulated gloved hands/sleeves)
  var vmRoot = new THREE.Group();
  camera.add(vmRoot);
  var vmRig = new THREE.Group();
  vmRoot.add(vmRig);
  var vmWeapon = null;
  var vmArms = null;
  var muzzleLight = new THREE.PointLight(0xffb74d, 0, 8);
  camera.add(muzzleLight);
  muzzleLight.position.set(0.25, -0.1, -0.9);

  function rebuildViewmodel() {
    while (vmRig.children.length > 0) vmRig.remove(vmRig.children[0]);
    var w = window.GameWeapons.WEAPONS[state.activeWeaponIdx];
    vmWeapon = window.GameWeapons.createTacticalWeaponMesh(w.id, state.themeColor);
    vmRig.add(vmWeapon.group);

    var uObj = getUniformObj(state.uniform);
    var patchTex = window.GameAssets.makeCountryPatchTexture(renderer, state.country);
    var fabricTex = window.GameAssets.makeUniformFabricTexture(renderer, uObj);
    vmArms = window.GameWeapons.createFirstPersonArms(uObj, patchTex, fabricTex, state.gender === 'female', Boolean(w.melee));
    vmRig.add(vmArms.group);
    vmRig.position.set(w.melee ? 0.16 : 0.185, w.melee ? -0.15 : -0.19, w.melee ? -0.34 : -0.42);
    vmRig.rotation.set(0, 0, 0);
  }
  rebuildViewmodel();

  // Player physics & orientation
  var player = {
    pos: new THREE.Vector3(0, 0, 26),
    velY: 0,
    yaw: 0,
    pitch: 0,
    grounded: true,
    stepTimer: 0,
    recoilOffset: 0,
    recoilPitch: 0,
    recoilRoll: 0,
    boltBack: 0,
    adsBlend: 0,
    reloadStage: 0,
    swayPhase: 0,
    slashAnim: 0,
  };

  var localSoldier = null;
  var lobbySoldier = null;
  var animatedGlowRigs = [];

  // Shared Builder for Male (Soldier.glb) & Stylized Realistic Lady Operative (GameFemale)
  function buildSoldierEntity(opts) {
    var root = new THREE.Group();
    var rig = new THREE.Group();
    var isLady = opts.gender === 'female' && Boolean(window.GameFemale);
    rig.rotation.y = isLady ? 0 : Math.PI; // Soldier.glb faces -Z; GameFemale faces +Z
    root.add(rig);

    var uObj = getUniformObj(opts.uniform);
    var fabricTex = window.GameAssets.makeUniformFabricTexture(renderer, uObj);
    var patchTex = window.GameAssets.makeCountryPatchTexture(renderer, opts.country || state.country);
    var mixer = null;
    var actions = {};
    var activeAction = null;
    var spineBone = null;
    var femaleRig = null;
    var glowEntry = { eyeMats: [], mouthMats: [], chestMats: [], phase: Math.random() * 6.28, light: null };

    if (isLady) {
      femaleRig = window.GameFemale.createFemaleOperativeRig({
        renderer: renderer,
        uniformObj: uObj,
        fabricTex: fabricTex,
        patchTex: patchTex,
        country: opts.country || state.country,
        accentHex: opts.accentHex || state.themeColor,
        weaponId: opts.weaponId || 'rifle',
      });
      rig.add(femaleRig.root);
      glowEntry.chestMats = femaleRig.chestMats || [];

      if (opts.withLight) {
        var fPl = new THREE.PointLight(0x38bdf8, 1.35, 5.5);
        fPl.position.set(0, 1.45, 0.55);
        root.add(fPl);
        glowEntry.light = fPl;
      }
    } else if (soldierAsset) {
      var model = THREE.SkeletonUtils.clone(soldierAsset.scene);
      model.traverse(function (ch) {
        if (ch.isMesh) {
          ch.castShadow = true;
          ch.receiveShadow = true;
          var m = ch.material.clone();
          if (ch.name.toLowerCase().indexOf('visor') === -1) {
            m.map = fabricTex;
            m.color.setHex(0xffffff);
            m.needsUpdate = true;
          } else {
            m.color.set(opts.accentHex || state.themeColor);
            m.emissive = new THREE.Color(opts.accentHex || state.themeColor);
            m.emissiveIntensity = 0.65;
          }
          ch.material = m;
        }
        if (ch.isBone) {
          if (ch.name === 'mixamorigSpine2' || ch.name === 'mixamorig:Spine2') spineBone = ch;
          if (ch.name === 'mixamorigRightHand' || ch.name === 'mixamorig:RightHand') {
            var wep = window.GameWeapons.createTacticalWeaponMesh(opts.weaponId || 'rifle', opts.accentHex);
            wep.group.scale.set(105, 105, 105);
            wep.group.position.set(0, 8, 2);
            wep.group.rotation.set(Math.PI / 2, 0, 0);
            ch.add(wep.group);
          }
        }
      });
      rig.add(model);

      // Moving Color Lighting Rig around the Chest
      if (spineBone) {
        var chestRig = window.GameWeapons.createChestLightRig(opts.accentHex);
        chestRig.group.scale.set(112, 112, 112);
        chestRig.group.position.set(0, 3, 0);
        chestRig.group.rotation.y = Math.PI;
        spineBone.add(chestRig.group);
        glowEntry.chestMats = chestRig.chestMats;
      }

      if (opts.withLight) {
        var pl = new THREE.PointLight(0x38bdf8, 1.35, 5.5);
        pl.position.set(0, 1.45, 0.55);
        root.add(pl);
        glowEntry.light = pl;
      }

      mixer = new THREE.AnimationMixer(model);
      soldierAsset.animations.forEach(function (clip) {
        actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
      });
      if (actions.idle) {
        actions.idle.play();
        activeAction = actions.idle;
      }
    }

    animatedGlowRigs.push(glowEntry);

    // Floating Caricature + Country + Uniform Badge
    var badgeGroup = new THREE.Group();
    badgeGroup.position.set(0, 2.32, 0);
    root.add(badgeGroup);

    if (opts.label || opts.caricature) {
      var c = document.createElement('canvas');
      c.width = 280;
      c.height = 96;
      var ctx = c.getContext('2d');
      var tex = new THREE.CanvasTexture(c);
      var drawCard = function (imgEl) {
        ctx.clearRect(0, 0, 280, 96);
        ctx.fillStyle = 'rgba(12, 18, 28, 0.86)';
        ctx.fillRect(0, 12, 280, 74);
        ctx.strokeStyle = opts.accentHex || '#e5b842';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 14, 276, 70);
        if (imgEl) ctx.drawImage(imgEl, 10, 20, 56, 56);
        var sx = imgEl ? 76 : 14;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText((opts.country ? '[' + opts.country + '] ' : '') + (opts.label || 'Soldier'), sx, 44);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText((opts.subLabel || uObj.name).slice(0, 24), sx, 68);
        tex.needsUpdate = true;
      };
      drawCard(null);
      if (opts.caricature) {
        var im = new Image();
        im.onload = function () { drawCard(im); };
        im.src = opts.caricature;
      }
      var spMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      var sp = new THREE.Sprite(spMat);
      sp.scale.set(1.85, 0.64, 1);
      badgeGroup.add(sp);
    }

    function setAnim(name) {
      if (femaleRig) {
        femaleRig.setAnim(name);
        return;
      }
      var next = actions[name] || actions.idle;
      if (!next || next === activeAction) return;
      if (activeAction) activeAction.fadeOut(0.18);
      next.reset().fadeIn(0.18).play();
      activeAction = next;
    }

    function update(dt) {
      if (femaleRig) femaleRig.update(dt);
      else if (mixer) mixer.update(dt);
    }

    return { root: root, mixer: mixer, setAnim: setAnim, update: update, glowEntry: glowEntry };
  }

  function purgeGlowRig(entity) {
    if (!entity || !entity.glowEntry) return;
    var idx = animatedGlowRigs.indexOf(entity.glowEntry);
    if (idx !== -1) animatedGlowRigs.splice(idx, 1);
  }

  function rebuildLobbySoldier() {
    if (lobbySoldier) { purgeGlowRig(lobbySoldier); scene.remove(lobbySoldier.root); }
    lobbySoldier = buildSoldierEntity({
      uniform: state.uniform,
      gender: state.gender,
      country: state.country,
      accentHex: state.themeColor,
      label: state.playerName,
      subLabel: (state.gender === 'female' ? 'LADY OPS' : 'MALE OPS') + ' • ' + getUniformObj(state.uniform).name,
      caricature: state.caricatureUrl || state.faceUrl,
      weaponId: window.GameWeapons.WEAPONS[state.activeWeaponIdx].id,
      withLight: true,
    });
    lobbySoldier.root.position.set(1.2, 0, 22);
    lobbySoldier.root.rotation.y = -0.35;
    scene.add(lobbySoldier.root);
  }

  function rebuildLocalSoldier() {
    if (localSoldier) { purgeGlowRig(localSoldier); scene.remove(localSoldier.root); }
    localSoldier = buildSoldierEntity({
      uniform: state.uniform,
      gender: state.gender,
      helmet: state.helmet,
      country: state.country,
      accentHex: state.themeColor,
      weaponId: window.GameWeapons.WEAPONS[state.activeWeaponIdx].id,
      withLight: true,
    });
    localSoldier.root.visible = state.thirdPerson || state.lookBack;
    scene.add(localSoldier.root);
  }

  // Combat Drone, Enemy Army Bots, Remote Players, Grenades & FX
  var playerDrone = null;
  var playerDroneCooldown = 0;
  var enemies = [];
  var remotePlayers = new Map();
  var guestBots = new Map(); // synced bots on guest client during mixed network match
  var grenades = [];
  var tracers = [];
  var shellCasings = [];
  var empRings = [];
  var botShootMeshes = [];

  function spawnPlayerDrone() {
    if (playerDrone) scene.remove(playerDrone.group);
    playerDrone = window.GameWeapons.createDroneMesh(state.themeColor);
    scene.add(playerDrone.group);
    state.hasDrone = true;
    els.droneIndicator.textContent = 'DRONE: ON';
  }

  function destroyPlayerDrone() {
    if (playerDrone) scene.remove(playerDrone.group);
    playerDrone = null;
    state.hasDrone = false;
    els.droneIndicator.textContent = 'DRONE: OFF';
  }

  function spawnTracer(from, to, colorHex) {
    var geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    var mat = new THREE.LineBasicMaterial({ color: colorHex || state.themeColor, transparent: true, opacity: 0.9 });
    var line = new THREE.Line(geo, mat);
    scene.add(line);
    tracers.push({ line: line, life: 0.08 });
  }

  function spawnDamageFloat(worldPos, dmg, isHeadshot) {
    var p = worldPos.clone().project(camera);
    if (p.z > 1) return;
    var x = (p.x * 0.5 + 0.5) * window.innerWidth;
    var y = (-p.y * 0.5 + 0.5) * window.innerHeight;
    var el = document.createElement('div');
    el.className = 'dmg-float';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = isHeadshot ? '#e5b842' : '#ffffff';
    el.textContent = (isHeadshot ? 'HEAD ' : '') + '-' + Math.round(dmg);
    els.floatLayer.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 520);
  }

  function addKillfeed(text) {
    var line = document.createElement('div');
    line.className = 'kf-line';
    line.textContent = text;
    els.killfeed.prepend(line);
    while (els.killfeed.children.length > 4) els.killfeed.removeChild(els.killfeed.lastChild);
    setTimeout(function () { if (line.parentNode) line.parentNode.removeChild(line); }, 5000);
  }

  function showWaveBanner(title, sub) {
    els.waveTitle.textContent = title;
    els.waveSub.textContent = sub;
    els.waveBanner.classList.add('show');
    setTimeout(function () { els.waveBanner.classList.remove('show'); }, 2200);
  }

  function clearBots() {
    enemies.forEach(function (e) {
      purgeGlowRig(e.entity);
      scene.remove(e.entity.root);
      if (e.drone) scene.remove(e.drone.group);
    });
    enemies = [];
    botShootMeshes = [];
    guestBots.forEach(function (gb) {
      purgeGlowRig(gb.entity);
      scene.remove(gb.entity.root);
    });
    guestBots.clear();
  }

  // Spawn Mixed Male & Lady Country-Army Bots with Unique Uniforms, Alien Helmets, and Guns or Knives
  function spawnArmyBots(count, waveNum, usedUniformIds) {
    clearBots();
    var uniqueUniforms = window.GameAssets.pickUniqueUniforms(usedUniformIds || [state.uniform], count);
    var botWeapons = ['rifle', 'pulse', 'shotgun', 'knife', 'launcher'];
    var spawnPts = [[-32, -32], [32, -32], [-32, 0], [32, 0], [0, -34], [-22, -26], [22, -26], [-28, 22], [28, 22]];

    for (var i = 0; i < count; i++) {
      var sp = spawnPts[i % spawnPts.length];
      var country = window.GameAssets.COUNTRIES[(i + waveNum) % window.GameAssets.COUNTRIES.length];
      var soldierName = country.names[Math.floor(Math.random() * country.names.length)];
      var uObj = uniqueUniforms[i % uniqueUniforms.length];
      var botGender = (i % 2 === 1) ? 'female' : 'male';
      var helmetIdx = (i + waveNum) % 5;
      var wepId = botWeapons[i % botWeapons.length];
      var accentHex = '#' + new THREE.Color(uObj.accent).getHexString();

      var entity = buildSoldierEntity({
        uniform: uObj.id,
        gender: botGender,
        helmet: helmetIdx,
        country: country.code,
        accentHex: accentHex,
        weaponId: wepId,
        label: soldierName,
        subLabel: country.army + ' • ' + (wepId === 'knife' ? 'BLADE' : wepId.toUpperCase()),
      });

      var sx = sp[0] + (Math.random() - 0.5) * 6;
      var sz = sp[1] + (Math.random() - 0.5) * 6;
      entity.root.position.set(sx, 0, sz);
      scene.add(entity.root);

      var hasBotDrone = waveNum >= 2 && i % 3 === 0;
      var botDrone = hasBotDrone ? window.GameWeapons.createDroneMesh(accentHex) : null;
      if (botDrone) scene.add(botDrone.group);

      entity.root.traverse(function (m) {
        if (m.isMesh) {
          m.userData.enemyIdx = i;
          botShootMeshes.push(m);
        }
      });

      enemies.push({
        id: 'bot_' + i,
        name: '[' + country.code + '] ' + soldierName,
        subLabel: country.army,
        country: country.code,
        uniform: uObj.id,
        gender: botGender,
        helmet: helmetIdx,
        weaponId: wepId,
        entity: entity,
        pos: entity.root.position,
        hp: 75 + waveNum * 18,
        maxHp: 75 + waveNum * 18,
        speed: (wepId === 'knife' ? 4.4 : 3.1) + Math.min(2.0, waveNum * 0.16),
        fireCd: 1 + Math.random() * 1.2,
        strafeDir: Math.random() < 0.5 ? 1 : -1,
        stunTimer: 0,
        drone: botDrone,
        droneTimer: 0,
        colorHex: accentHex,
      });
    }
  }

  function triggerExplosion(pos, radius, maxDmg, isLocalSource) {
    window.GameAudio.explosion();
    var ring = new THREE.Mesh(
      new THREE.RingGeometry(0.3, radius, 24),
      new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, pos.y + 0.15, pos.z);
    scene.add(ring);
    empRings.push({ mesh: ring, life: 0.35, maxLife: 0.35 });

    if (!isLocalSource) return;
    if (state.mode === 'solo' || (state.mode === 'multi' && window.GameNet.isHost())) {
      enemies.forEach(function (en) {
        if (en.hp <= 0) return;
        var d = en.pos.distanceTo(pos);
        if (d <= radius) damageSoloEnemy(en, maxDmg * (1 - d / (radius * 1.15)), false);
      });
    }
    if (state.mode === 'multi') {
      remotePlayers.forEach(function (rp) {
        if (!rp.alive) return;
        var d = rp.pos.distanceTo(pos);
        if (d <= radius) window.GameNet.sendHit(rp.id, Math.round(maxDmg * (1 - d / (radius * 1.15))), false);
      });
    }
  }

  function triggerEmpPulse(cx, cz, isLocalSource) {
    window.GameAudio.emp();
    var ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 26, 36),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(cx, 0.25, cz);
    scene.add(ring);
    empRings.push({ mesh: ring, life: 0.55, maxLife: 0.55 });

    if (isLocalSource && (state.mode === 'solo' || (state.mode === 'multi' && window.GameNet.isHost()))) {
      enemies.forEach(function (en) {
        if (en.hp <= 0) return;
        if (Math.hypot(en.pos.x - cx, en.pos.z - cz) <= 28) {
          en.stunTimer = 4.0;
          if (en.drone) {
            scene.remove(en.drone.group);
            en.drone = null;
            addKillfeed('EMP DESTROYED HOSTILE DRONE');
          }
          damageSoloEnemy(en, 35, false);
        }
      });
    }
  }

  function throwGrenade() {
    if (state.grenades <= 0 || state.mode === 'dead' || state.mode === 'spectate') return;
    state.grenades--;
    var dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    var origin = camera.position.clone().addScaledVector(dir, 0.8);
    var vel = dir.multiplyScalar(17).add(new THREE.Vector3(0, 5.5, 0));
    var mesh = window.GameWeapons.createGrenadeMesh();
    mesh.position.copy(origin);
    scene.add(mesh);
    grenades.push({ mesh: mesh, vel: vel, timer: 1.5, local: true });
    if (state.mode === 'multi') window.GameNet.sendGrenade(origin, vel);
    updateHud();
  }

  function activateAntiDroneEmp() {
    if (state.emps <= 0 || state.mode === 'dead' || state.mode === 'spectate') return;
    state.emps--;
    triggerEmpPulse(player.pos.x, player.pos.z, true);
    if (state.mode === 'multi') window.GameNet.sendEmp(player.pos.x, player.pos.z);
    updateHud();
  }

  function damageSoloEnemy(en, dmg, isHeadshot, killerName) {
    if (en.hp <= 0) return;
    en.hp -= dmg;
    spawnDamageFloat(new THREE.Vector3(en.pos.x, en.pos.y + 1.9, en.pos.z), dmg, isHeadshot);
    var isKill = en.hp <= 0;
    if (!killerName) {
      flashHitmarker(isKill, isHeadshot);
      window.GameAudio.hit(isKill, isHeadshot);
    }

    if (isKill) {
      purgeGlowRig(en.entity);
      scene.remove(en.entity.root);
      if (en.drone) scene.remove(en.drone.group);
      window.GameAudio.deathPatayLaugh();
      state.kills++;
      state.comboTimer = 4.5;
      state.combo = Math.min(8, state.combo + 1);
      if (state.combo > state.bestCombo) state.bestCombo = state.combo;
      var reward = (isHeadshot ? 65 : 45) * state.combo;
      state.credits += reward;
      addKillfeed((killerName || state.playerName) + ' ELIMINATED ' + en.name + ' +₱' + reward);
      saveProgress();

      if (state.mode === 'solo') {
        var aliveLeft = enemies.filter(function (e) { return e.hp > 0; }).length;
        if (aliveLeft === 0) {
          state.wave++;
          if (state.wave > state.highWave) state.highWave = state.wave;
          state.credits += 120;
          saveProgress();
          setTimeout(function () {
            if (state.mode === 'solo') {
              var cnt = Math.min(12, 4 + state.wave);
              spawnArmyBots(cnt, state.wave, [state.uniform]);
              showWaveBanner('WAVE ' + state.wave, cnt + ' COUNTRY ARMY HOSTILES');
            }
          }, 1600);
        }
      }
    }
  }

  function flashHitmarker(isKill, isHeadshot) {
    els.hitmarker.className = '';
    void els.hitmarker.offsetWidth;
    els.hitmarker.classList.add('active');
    if (isKill) els.hitmarker.classList.add('kill');
    if (isHeadshot) els.hitmarker.classList.add('headshot');
    setTimeout(function () { els.hitmarker.className = ''; }, 130);
  }

  function applyDamageToPlayer(dmg, attackerName) {
    if (state.mode !== 'solo' && state.mode !== 'multi') return;
    window.GameAudio.hurt();
    els.dmgVig.style.opacity = '0.9';
    setTimeout(function () { els.dmgVig.style.opacity = '0'; }, 140);

    var rem = dmg;
    if (state.armor > 0) {
      var abs = Math.min(state.armor, rem);
      state.armor -= abs;
      rem -= abs;
    }
    state.hp = Math.max(0, state.hp - rem);
    updateHud();

    if (state.hp <= 0) handlePlayerDeath(attackerName || 'Hostile');
  }

  function handlePlayerDeath(killerName) {
    state.mode = 'dead';
    destroyPlayerDrone();
    window.GameAudio.deathPatayLaugh();
    if (document.pointerLockElement) document.exitPointerLock();
    els.crosshair.style.display = 'none';
    document.getElementById('death-killer').textContent = 'Eliminated by: ' + killerName;
    els.deathOverlay.classList.remove('hidden');
    saveProgress();
  }

  function fireCurrentWeapon() {
    if (state.reloading || state.fireCooldown > 0) return;
    if (state.mode !== 'solo' && state.mode !== 'multi') return;

    var w = window.GameWeapons.WEAPONS[state.activeWeaponIdx];
    var ammo = state.ammo[w.id];
    if (!w.melee && ammo.mag <= 0) { startReload(); return; }

    if (!w.melee) ammo.mag--;
    state.fireCooldown = w.rate / state.rateMult;
    if (w.melee) {
      player.slashAnim = 0.22;
      window.GameAudio.footstep();
    } else {
      player.recoilOffset = Math.min(0.14, player.recoilOffset + w.recoil * 1.15);
      player.recoilPitch = Math.min(0.24, player.recoilPitch + w.recoil * 1.65);
      player.recoilRoll = (Math.random() - 0.5) * 0.1;
      player.boltBack = 1.0;
      player.pitch = Math.min(1.42, player.pitch + w.recoil * 0.26);
      window.GameAudio.shot(w.id);
      muzzleLight.intensity = 4.5;
      setTimeout(function () { muzzleLight.intensity = 0; }, 55);

      if (!state.thirdPerson && !state.lookBack && vmWeapon && vmWeapon.ejectionPort && window.GameWeapons.createShellCasingMesh) {
        var ejPos = new THREE.Vector3();
        vmWeapon.ejectionPort.getWorldPosition(ejPos);
        var casing = window.GameWeapons.createShellCasingMesh();
        casing.position.copy(ejPos);
        casing.quaternion.copy(camera.quaternion);
        var ejVel = new THREE.Vector3(1.15, 0.72, 0.18).normalize().applyQuaternion(camera.quaternion).multiplyScalar(2.6 + Math.random() * 0.9);
        ejVel.y += 1.0 + Math.random() * 0.5;
        scene.add(casing);
        shellCasings.push({
          mesh: casing,
          vel: ejVel,
          rotVel: new THREE.Vector3(16 + Math.random() * 10, 12 + Math.random() * 10, 20),
          life: 1.3,
          pinged: false,
        });
      }
    }

    var muzzleWorld = new THREE.Vector3();
    if (vmWeapon && vmWeapon.muzzle) vmWeapon.muzzle.getWorldPosition(muzzleWorld);
    else muzzleWorld.copy(camera.position);

    var raycaster = new THREE.Raycaster();
    if (w.melee) raycaster.far = 3.2;
    var pellets = w.pellets || 1;
    var targets = currentArena ? currentArena.shootMeshes.slice() : [];

    if (state.mode === 'solo' || (state.mode === 'multi' && window.GameNet.isHost())) {
      targets = targets.concat(botShootMeshes);
    }
    if (state.mode === 'multi') {
      remotePlayers.forEach(function (rp) {
        if (rp.alive) {
          rp.entity.root.traverse(function (m) {
            if (m.isMesh) { m.userData.remoteId = rp.id; targets.push(m); }
          });
        }
      });
      guestBots.forEach(function (gb) {
        if (gb.alive) {
          gb.entity.root.traverse(function (m) {
            if (m.isMesh) { m.userData.guestBotId = gb.id; targets.push(m); }
          });
        }
      });
    }

    for (var p = 0; p < pellets; p++) {
      var dir = new THREE.Vector3(
        (Math.random() - 0.5) * w.spread,
        (Math.random() - 0.5) * w.spread,
        -1
      ).normalize().applyQuaternion(camera.quaternion);
      raycaster.set(camera.position, dir);
      var hits = raycaster.intersectObjects(targets, false);
      var hitPt = camera.position.clone().addScaledVector(dir, w.melee ? 2.5 : 90);

      if (hits.length > 0) {
        var h = hits[0];
        hitPt = h.point;
        var isHeadshot = false;

        if (w.splash) {
          triggerExplosion(hitPt, w.splash, w.damage * state.dmgMult, true);
        } else if (typeof h.object.userData.enemyIdx === 'number') {
          var en = enemies[h.object.userData.enemyIdx];
          if (en && en.hp > 0) {
            isHeadshot = hitPt.y - en.pos.y > 1.42;
            damageSoloEnemy(en, w.damage * state.dmgMult * (isHeadshot ? 1.85 : 1), isHeadshot);
          }
        } else if (h.object.userData.guestBotId) {
          var gb = guestBots.get(h.object.userData.guestBotId);
          if (gb && gb.alive) {
            isHeadshot = hitPt.y - gb.pos.y > 1.42;
            var gDmg = Math.round(w.damage * state.dmgMult * (isHeadshot ? 1.85 : 1));
            flashHitmarker(false, isHeadshot);
            window.GameAudio.hit(false, isHeadshot);
            spawnDamageFloat(hitPt, gDmg, isHeadshot);
            window.GameNet.sendBotHit(gb.id, gDmg, isHeadshot);
          }
        } else if (h.object.userData.remoteId) {
          var rp = remotePlayers.get(h.object.userData.remoteId);
          if (rp && rp.alive) {
            isHeadshot = hitPt.y - rp.pos.y > 1.42;
            var rDmg = Math.round(w.damage * state.dmgMult * (isHeadshot ? 1.85 : 1));
            flashHitmarker(false, isHeadshot);
            window.GameAudio.hit(false, isHeadshot);
            spawnDamageFloat(hitPt, rDmg, isHeadshot);
            window.GameNet.sendHit(rp.id, rDmg, isHeadshot);
          }
        }
      }

      if (!w.melee) {
        spawnTracer(muzzleWorld, hitPt, w.color);
        if (state.mode === 'multi' && p === 0) window.GameNet.sendFire(muzzleWorld, hitPt, w.color, w.id);
      }
    }
    updateHud();
  }

  function startReload() {
    var w = window.GameWeapons.WEAPONS[state.activeWeaponIdx];
    if (w.melee) return;
    var ammo = state.ammo[w.id];
    if (state.reloading || ammo.mag >= w.mag || ammo.res <= 0) return;
    state.reloading = true;
    state.reloadTimer = w.reload;
    player.reloadStage = 0;
    window.GameAudio.reload(0);
    updateHud();
  }

  function selectWeapon(idx) {
    var w = window.GameWeapons.WEAPONS[idx];
    if (!w || !state.ownedWeapons[w.id]) return;
    state.activeWeaponIdx = idx;
    state.reloading = false;
    rebuildViewmodel();
    rebuildLocalSoldier();
    updateHud();
  }

  // Input Handling (Mobile Touch + Desktop WASD/PointerLock)
  var input = {
    moveX: 0, moveZ: 0, firing: false, keys: {},
    joyId: null, joyOrigin: { x: 0, y: 0 },
    lookId: null, lookLast: { x: 0, y: 0 },
  };
  var joyZone = document.getElementById('joystick-zone');
  var joyKnob = document.getElementById('joystick-knob');
  var lookZone = document.getElementById('look-zone');

  joyZone.addEventListener('pointerdown', function (e) {
    window.GameAudio.ensure();
    input.joyId = e.pointerId;
    var r = document.getElementById('joystick-base').getBoundingClientRect();
    input.joyOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    joyZone.setPointerCapture(e.pointerId);
  });
  joyZone.addEventListener('pointermove', function (e) {
    if (e.pointerId !== input.joyId) return;
    var dx = e.clientX - input.joyOrigin.x;
    var dy = e.clientY - input.joyOrigin.y;
    var dist = Math.hypot(dx, dy);
    if (dist > 46) { dx = (dx / dist) * 46; dy = (dy / dist) * 46; }
    joyKnob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    input.moveX = dx / 46;
    input.moveZ = dy / 46;
  });
  function endJoy(e) {
    if (e.pointerId !== input.joyId) return;
    input.joyId = null; input.moveX = 0; input.moveZ = 0;
    joyKnob.style.transform = 'translate(0px,0px)';
  }
  joyZone.addEventListener('pointerup', endJoy);
  joyZone.addEventListener('pointercancel', endJoy);

  lookZone.addEventListener('pointerdown', function (e) {
    window.GameAudio.ensure();
    if (e.pointerType === 'mouse' && (state.mode === 'solo' || state.mode === 'multi')) {
      renderer.domElement.requestPointerLock && renderer.domElement.requestPointerLock();
      return;
    }
    input.lookId = e.pointerId;
    input.lookLast = { x: e.clientX, y: e.clientY };
    lookZone.setPointerCapture(e.pointerId);
  });
  lookZone.addEventListener('pointermove', function (e) {
    if (e.pointerId !== input.lookId) return;
    var dx = e.clientX - input.lookLast.x;
    var dy = e.clientY - input.lookLast.y;
    input.lookLast = { x: e.clientX, y: e.clientY };
    var sens = state.ads ? 0.0028 : 0.0052;
    player.yaw -= dx * sens;
    player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch - dy * sens));
  });
  lookZone.addEventListener('pointerup', function (e) { if (e.pointerId === input.lookId) input.lookId = null; });
  lookZone.addEventListener('pointercancel', function (e) { if (e.pointerId === input.lookId) input.lookId = null; });

  document.addEventListener('mousemove', function (e) {
    if (document.pointerLockElement !== renderer.domElement) return;
    var sens = state.ads ? 0.0014 : 0.0024;
    player.yaw -= e.movementX * sens;
    player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch - e.movementY * sens));
  });
  document.addEventListener('mousedown', function (e) {
    if (document.pointerLockElement !== renderer.domElement) return;
    if (e.button === 0) input.firing = true;
    if (e.button === 2) { state.ads = !state.ads; document.getElementById('btn-ads').classList.toggle('active', state.ads); }
  });
  document.addEventListener('mouseup', function (e) { if (e.button === 0) input.firing = false; });
  document.addEventListener('contextmenu', function (e) { if (state.mode === 'solo' || state.mode === 'multi') e.preventDefault(); });

  window.addEventListener('keydown', function (e) {
    input.keys[e.code] = true;
    if (e.code === 'KeyR') startReload();
    if (e.code === 'KeyB') toggleLookBack(true);
    if (e.code === 'KeyG') throwGrenade();
    if (e.code === 'KeyE') activateAntiDroneEmp();
    if (e.code === 'Space' && player.grounded) { player.velY = 7.4; player.grounded = false; }
  });
  window.addEventListener('keyup', function (e) {
    input.keys[e.code] = false;
    if (e.code === 'KeyB') toggleLookBack(false);
  });

  function toggleLookBack(val) {
    state.lookBack = typeof val === 'boolean' ? val : !state.lookBack;
    document.getElementById('btn-lookback').classList.toggle('active', state.lookBack);
    if (localSoldier) localSoldier.root.visible = state.thirdPerson || state.lookBack;
  }

  var btnFire = document.getElementById('btn-fire');
  btnFire.addEventListener('pointerdown', function (e) { e.stopPropagation(); window.GameAudio.ensure(); input.firing = true; btnFire.classList.add('firing'); });
  btnFire.addEventListener('pointerup', function () { input.firing = false; btnFire.classList.remove('firing'); });
  btnFire.addEventListener('pointercancel', function () { input.firing = false; btnFire.classList.remove('firing'); });

  document.getElementById('btn-ads').addEventListener('click', function () { state.ads = !state.ads; this.classList.toggle('active', state.ads); });
  document.getElementById('btn-jump').addEventListener('click', function () { if (player.grounded) { player.velY = 7.4; player.grounded = false; } });
  document.getElementById('btn-reload').addEventListener('click', startReload);
  document.getElementById('btn-swap').addEventListener('click', function () {
    var unlocked = window.GameWeapons.WEAPONS.map(function (w, i) { return state.ownedWeapons[w.id] ? i : -1; }).filter(function (i) { return i >= 0; });
    selectWeapon(unlocked[(unlocked.indexOf(state.activeWeaponIdx) + 1) % unlocked.length]);
  });
  document.getElementById('btn-grenade').addEventListener('click', throwGrenade);
  document.getElementById('btn-emp').addEventListener('click', activateAntiDroneEmp);

  var btnLookBack = document.getElementById('btn-lookback');
  btnLookBack.addEventListener('pointerdown', function (e) { e.stopPropagation(); toggleLookBack(true); });
  btnLookBack.addEventListener('pointerup', function () { toggleLookBack(false); });
  btnLookBack.addEventListener('pointercancel', function () { toggleLookBack(false); });

  document.getElementById('btn-cam').addEventListener('click', function () {
    state.thirdPerson = !state.thirdPerson;
    this.textContent = state.thirdPerson ? '3RD' : '1ST';
    if (localSoldier) localSoldier.root.visible = state.thirdPerson || state.lookBack;
  });
  document.getElementById('btn-quality').addEventListener('click', function () { state.hd = !state.hd; applyQuality(); saveProgress(); });
  document.getElementById('btn-shop').addEventListener('click', openShop);
  document.getElementById('btn-close-shop').addEventListener('click', closeShop);

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(function () {});
    else document.exitFullscreen && document.exitFullscreen().catch(function () {});
  }
  document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);
  document.getElementById('lobby-fullscreen').addEventListener('click', toggleFullscreen);
  document.getElementById('lobby-quality').addEventListener('click', function () { state.hd = !state.hd; applyQuality(); saveProgress(); });

  function exitGameCleanly() {
    saveProgress();
    window.GameNet.leaveRoom();
    if (document.pointerLockElement) document.exitPointerLock();
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    state.mode = 'lobby';
    els.hud.style.display = 'none';
    els.crosshair.style.display = 'none';
    els.deathOverlay.classList.add('hidden');
    els.spectateBar.classList.add('hidden');
    els.winnerOverlay.classList.add('hidden');
    els.startOverlay.classList.add('hidden');
    els.exitBanner.classList.remove('hidden');
    try { window.close(); } catch (e) {}
  }
  document.getElementById('btn-exit').addEventListener('click', exitGameCleanly);
  document.getElementById('death-btn-exit').addEventListener('click', exitGameCleanly);
  document.getElementById('lobby-exit').addEventListener('click', exitGameCleanly);
  document.getElementById('spec-btn-exit').addEventListener('click', exitGameCleanly);
  document.getElementById('btn-resume-after-exit').addEventListener('click', function () {
    els.exitBanner.classList.add('hidden');
    els.startOverlay.classList.remove('hidden');
  });

  document.getElementById('death-btn-spectate').addEventListener('click', function () {
    els.deathOverlay.classList.add('hidden');
    state.mode = 'spectate';
    els.spectateBar.classList.remove('hidden');
    updateSpectateLabel();
  });
  document.getElementById('death-btn-lobby').addEventListener('click', returnToLobby);
  document.getElementById('spec-btn-next').addEventListener('click', function () { state.spectateIdx++; updateSpectateLabel(); });
  document.getElementById('spec-btn-lobby').addEventListener('click', returnToLobby);
  document.getElementById('winner-btn-lobby').addEventListener('click', returnToLobby);

  function getSpectateTargets() {
    var list = [];
    enemies.forEach(function (e) { if (e.hp > 0) list.push({ name: e.name, pos: e.pos }); });
    guestBots.forEach(function (gb) { if (gb.alive) list.push({ name: gb.name, pos: gb.pos }); });
    remotePlayers.forEach(function (rp) { if (rp.alive) list.push({ name: rp.name, pos: rp.pos }); });
    return list;
  }

  function updateSpectateLabel() {
    var targets = getSpectateTargets();
    els.spectateLabel.textContent = targets.length ? 'WATCHING: ' + targets[state.spectateIdx % targets.length].name : 'SPECTATING: ARENA CAM';
  }

  function returnToLobby() {
    window.GameNet.leaveRoom();
    clearBots();
    state.mode = 'lobby';
    els.hud.style.display = 'none';
    els.crosshair.style.display = 'none';
    els.deathOverlay.classList.add('hidden');
    els.spectateBar.classList.add('hidden');
    els.winnerOverlay.classList.add('hidden');
    els.startOverlay.classList.remove('hidden');
    if (localSoldier) localSoldier.root.visible = false;
    els.lobbyHighWave.textContent = 'BEST WAVE: ' + state.highWave;
    els.lobbyCredits.textContent = 'CREDITS: ₱' + state.credits;
    rebuildLobbySoldier();
  }

  // Shop / Armory UI in Philippine Peso (₱)
  function openShop() {
    if (document.pointerLockElement) document.exitPointerLock();
    els.shopOverlay.classList.remove('hidden');
    renderShop();
  }
  function closeShop() { els.shopOverlay.classList.add('hidden'); }

  function renderShop() {
    els.shopCredits.textContent = '₱' + state.credits;
    var html = '';
    window.GameWeapons.WEAPONS.forEach(function (w, idx) {
      var owned = Boolean(state.ownedWeapons[w.id]);
      html += '<div class="shop-card">' +
        '<div class="shop-title">' + w.name + '</div>' +
        '<div class="shop-desc">DMG ' + w.damage + (w.pellets > 1 ? 'x' + w.pellets : '') + (w.melee ? ' | MELEE' : ' | MAG ' + w.mag) + '</div>' +
        '<button class="shop-buy" data-act="weapon" data-idx="' + idx + '">' +
        (owned ? (state.activeWeaponIdx === idx ? 'EQUIPPED' : 'EQUIP') : 'BUY ₱' + w.cost) + '</button></div>';
    });

    var tac = window.GameWeapons.TACTICAL_ITEMS;
    html += '<div class="shop-card"><div class="shop-title">' + tac.drone.name + '</div><div class="shop-desc">' + tac.drone.desc + '</div>' +
      '<button class="shop-buy" data-act="drone">' + (state.hasDrone ? 'ACTIVE' : 'BUY ₱' + tac.drone.cost) + '</button></div>';
    html += '<div class="shop-card"><div class="shop-title">' + tac.grenade.name + '</div><div class="shop-desc">' + tac.grenade.desc + '</div>' +
      '<button class="shop-buy" data-act="grenade">BUY ₱' + tac.grenade.cost + '</button></div>';
    html += '<div class="shop-card"><div class="shop-title">' + tac.antidrone.name + '</div><div class="shop-desc">' + tac.antidrone.desc + '</div>' +
      '<button class="shop-buy" data-act="antidrone">BUY ₱' + tac.antidrone.cost + '</button></div>';
    html += '<div class="shop-card"><div class="shop-title">Armor & Medkit</div><div class="shop-desc">Restore +80 HP & +80 Armor</div>' +
      '<button class="shop-buy" data-act="armor">BUY ₱90</button></div>';
    html += '<div class="shop-card"><div class="shop-title">Ammo Crate</div><div class="shop-desc">Full reserve ammo refill</div>' +
      '<button class="shop-buy" data-act="ammo">BUY ₱60</button></div>';

    els.shopGrid.innerHTML = html;
    els.shopGrid.querySelectorAll('.shop-buy').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.getAttribute('data-act');
        if (act === 'weapon') {
          var idx = Number(btn.getAttribute('data-idx'));
          var w = window.GameWeapons.WEAPONS[idx];
          if (state.ownedWeapons[w.id]) selectWeapon(idx);
          else if (state.credits >= w.cost) { state.credits -= w.cost; state.ownedWeapons[w.id] = true; window.GameAudio.pickup(); selectWeapon(idx); }
        } else if (act === 'drone' && !state.hasDrone && state.credits >= tac.drone.cost) {
          state.credits -= tac.drone.cost; spawnPlayerDrone(); window.GameAudio.pickup();
        } else if (act === 'grenade' && state.credits >= tac.grenade.cost) {
          state.credits -= tac.grenade.cost; state.grenades += 2; window.GameAudio.pickup();
        } else if (act === 'antidrone' && state.credits >= tac.antidrone.cost) {
          state.credits -= tac.antidrone.cost; state.emps += 1; window.GameAudio.pickup();
        } else if (act === 'armor' && state.credits >= 90) {
          state.credits -= 90; state.hp = Math.min(state.maxHp, state.hp + 80); state.armor = Math.min(state.maxArmor, state.armor + 80); window.GameAudio.pickup();
        } else if (act === 'ammo' && state.credits >= 60) {
          state.credits -= 60; resetWeaponAmmo(); window.GameAudio.pickup();
        }
        saveProgress(); updateHud(); renderShop();
      });
    });
  }

  function updateHud() {
    els.hudName.textContent = '[' + state.country + '] ' + state.playerName;
    els.hudHp.textContent = Math.ceil(state.hp) + ' HP';
    els.hudHpBar.style.width = Math.max(0, (state.hp / state.maxHp) * 100) + '%';
    els.hudArmorBar.style.width = Math.max(0, (state.armor / state.maxArmor) * 100) + '%';
    els.hudWave.textContent = state.mode === 'multi' ? 'WAR ROOM' : 'WAVE ' + state.wave;
    var aliveBots = state.mode === 'solo' || (state.mode === 'multi' && window.GameNet.isHost())
      ? enemies.filter(function (e) { return e.hp > 0; }).length
      : Array.from(guestBots.values()).filter(function (gb) { return gb.alive; }).length;
    var aliveRemotes = state.mode === 'multi' ? Array.from(remotePlayers.values()).filter(function (r) { return r.alive; }).length : 0;
    els.hudHostiles.textContent = (aliveBots + aliveRemotes) + ' HOSTILES';
    els.hudCredits.textContent = '₱' + state.credits;
    els.hudCombo.textContent = 'x' + state.combo + ' COMBO';
    var w = window.GameWeapons.WEAPONS[state.activeWeaponIdx];
    var a = state.ammo[w.id];
    els.hudAmmoMag.textContent = w.melee ? 'BLADE' : (state.reloading ? 'RLD' : a.mag);
    els.hudAmmoRes.textContent = w.melee ? 'MELEE' : '/ ' + a.res;
    els.grenadeBadge.textContent = state.grenades;
    els.empBadge.textContent = state.emps;
    els.droneIndicator.textContent = state.hasDrone ? 'DRONE: ON' : 'DRONE: OFF';

    var dockHtml = '';
    window.GameWeapons.WEAPONS.forEach(function (wp, idx) {
      var owned = Boolean(state.ownedWeapons[wp.id]);
      dockHtml += '<div class="weapon-slot ' + (idx === state.activeWeaponIdx ? 'active ' : '') + (!owned ? 'locked' : '') + '" data-widx="' + idx + '">' +
        '<div class="ws-name">' + wp.short + '</div>' +
        '<div class="ws-ammo">' + (owned ? (wp.melee ? '∞' : state.ammo[wp.id].mag) : '₱' + wp.cost) + '</div></div>';
    });
    els.weaponDock.innerHTML = dockHtml;
    els.weaponDock.querySelectorAll('.weapon-slot').forEach(function (el) {
      el.addEventListener('click', function () { selectWeapon(Number(el.getAttribute('data-widx'))); });
    });

    var deg = Math.round((((-player.yaw * 180) / Math.PI) % 360 + 360) % 360);
    els.compassBearing.textContent = deg + '°';
  }

  function drawMinimap() {
    var ctx = els.minimap.getContext('2d');
    var w = els.minimap.width, h = els.minimap.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(10, 15, 22, 0.9)';
    ctx.fillRect(0, 0, w, h);

    var scale = w / 92, cx = w / 2, cz = h / 2;
    if (currentArena) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
      currentArena.colliders.forEach(function (c) {
        if (c.w > 60 || c.d > 60) return;
        ctx.fillRect(cx + c.minX * scale, cz + c.minZ * scale, c.w * scale, c.d * scale);
      });
    }

    enemies.forEach(function (en) {
      if (en.hp <= 0) return;
      ctx.fillStyle = en.colorHex || '#ef4444';
      ctx.beginPath(); ctx.arc(cx + en.pos.x * scale, cz + en.pos.z * scale, 3.2, 0, Math.PI * 2); ctx.fill();
    });
    guestBots.forEach(function (gb) {
      if (!gb.alive) return;
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.arc(cx + gb.pos.x * scale, cz + gb.pos.z * scale, 3.2, 0, Math.PI * 2); ctx.fill();
    });
    remotePlayers.forEach(function (rp) {
      if (!rp.alive) return;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(cx + rp.pos.x * scale, cz + rp.pos.z * scale, 3.6, 0, Math.PI * 2); ctx.fill();
    });

    var px = cx + player.pos.x * scale, pz = cz + player.pos.z * scale;
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-player.yaw);
    ctx.fillStyle = state.themeColor + '55';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -16); ctx.lineTo(9, -16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#84cc16';
    ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function beginMatch(mode, spawnPos, roomObj) {
    window.GameAudio.ensure();
    state.mode = mode;
    state.hp = state.maxHp;
    state.armor = 120;
    state.kills = 0;
    state.combo = 1;
    state.wave = 1;
    resetWeaponAmmo();
    loadTerrain(state.terrain);
    rebuildViewmodel();
    rebuildLocalSoldier();
    if (lobbySoldier) lobbySoldier.root.visible = false;

    player.pos.set(spawnPos ? spawnPos.x : 0, 0, spawnPos ? spawnPos.z : 26);
    player.velY = 0;
    player.yaw = 0;
    player.pitch = 0;

    els.startOverlay.classList.add('hidden');
    els.deathOverlay.classList.add('hidden');
    els.winnerOverlay.classList.add('hidden');
    els.spectateBar.classList.add('hidden');
    els.hud.style.display = 'block';
    els.crosshair.style.display = 'block';

    if (mode === 'solo') {
      spawnArmyBots(5, 1, [state.uniform]);
      showWaveBanner('WAVE 1', 'COUNTRY ARMY HOSTILES INBOUND');
    } else {
      clearBots();
      if (roomObj && roomObj.botsEnabled && window.GameNet.isHost()) {
        var used = roomObj.players.map(function (p) { return p.uniform; });
        spawnArmyBots(4, 1, used);
      }
      showWaveBanner('NETWORK WARFARE', (roomObj && roomObj.botsEnabled) ? 'PLAYERS + COUNTRY ARMY BOTS' : 'NETWORK PLAYERS ONLY');
    }
    updateHud();
  }

  function initLobbySelectors() {
    var nameInp = document.getElementById('inp-player-name');
    nameInp.value = state.playerName;
    nameInp.addEventListener('input', function () {
      state.playerName = nameInp.value.trim() || 'Lucas';
      saveProgress();
      if (lobbySoldier) rebuildLobbySoldier();
    });

    var gSel = document.getElementById('sel-gender');
    gSel.value = state.gender;
    gSel.addEventListener('change', function () {
      state.gender = gSel.value;
      saveProgress();
      rebuildViewmodel();
      if (lobbySoldier) rebuildLobbySoldier();
    });

    var cSel = document.getElementById('sel-country');
    cSel.innerHTML = window.GameAssets.COUNTRIES.map(function (c) {
      return '<option value="' + c.code + '">' + c.code + ' — ' + c.army + '</option>';
    }).join('');
    cSel.value = state.country;
    cSel.addEventListener('change', function () {
      state.country = cSel.value;
      saveProgress();
      rebuildViewmodel();
      if (lobbySoldier) rebuildLobbySoldier();
      els.hudPatch.textContent = state.country;
    });

    var uSel = document.getElementById('sel-uniform');
    uSel.innerHTML = window.GameAssets.UNIFORMS.map(function (u) {
      return '<option value="' + u.id + '">' + u.name + '</option>';
    }).join('');
    uSel.value = state.uniform;
    uSel.addEventListener('change', function () {
      state.uniform = uSel.value;
      saveProgress();
      rebuildViewmodel();
      if (lobbySoldier) rebuildLobbySoldier();
    });

    var tSel = document.getElementById('sel-terrain');
    tSel.innerHTML = window.GameAssets.TERRAINS.map(function (t) {
      return '<option value="' + t.id + '">' + t.name + '</option>';
    }).join('');
    tSel.value = String(state.terrain);
    tSel.addEventListener('change', function () {
      loadTerrain(Number(tSel.value));
      saveProgress();
      if (window.GameNet.isHost()) window.GameNet.hostConfig(state.terrain, state.themeColor, state.netBotsEnabled);
    });

    els.chkNetBots.checked = state.netBotsEnabled;
    els.chkNetBots.addEventListener('change', function () {
      state.netBotsEnabled = els.chkNetBots.checked;
      saveProgress();
      if (window.GameNet.isHost()) window.GameNet.hostConfig(state.terrain, state.themeColor, state.netBotsEnabled);
    });

    var swWrap = document.getElementById('theme-swatches');
    swWrap.innerHTML = window.GameAssets.THEME_COLORS.map(function (tc) {
      return '<button class="swatch-btn ' + (tc.hex === state.themeColor ? 'active' : '') + '" style="background:' + tc.hex + '" data-hex="' + tc.hex + '" title="' + tc.name + '"></button>';
    }).join('');
    swWrap.querySelectorAll('.swatch-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        state.themeColor = b.getAttribute('data-hex');
        applyThemeCss();
        saveProgress();
        swWrap.querySelectorAll('.swatch-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        loadTerrain(state.terrain);
        if (lobbySoldier) rebuildLobbySoldier();
        if (window.GameNet.isHost()) window.GameNet.hostConfig(state.terrain, state.themeColor, state.netBotsEnabled);
      });
    });

    function refreshCaricature(src) {
      state.faceUrl = src;
      els.lobbyAvatar.src = src;
      els.hudAvatar.src = src;
      window.GameAssets.createCaricatureDataUrl(src, function (carUrl) {
        state.caricatureUrl = carUrl || src;
        els.lobbyCaricature.src = state.caricatureUrl;
        if (lobbySoldier) rebuildLobbySoldier();
      });
    }
    refreshCaricature(state.faceUrl);

    document.getElementById('inp-face-file').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { refreshCaricature(String(reader.result)); };
      reader.readAsDataURL(f);
    });

    els.hudPatch.textContent = state.country;
    els.lobbyHighWave.textContent = 'BEST WAVE: ' + state.highWave;
    els.lobbyCredits.textContent = 'CREDITS: ₱' + state.credits;

    document.getElementById('btn-play-solo').addEventListener('click', function () { beginMatch('solo'); });

    window.GameNet.connect();
    document.getElementById('btn-host-room').addEventListener('click', function () {
      window.GameNet.hostCreate({
        code: els.netCodeInput.value.trim(),
        name: state.playerName,
        country: state.country,
        uniform: state.uniform,
        gender: state.gender,
        helmet: state.helmet,
        caricature: state.caricatureUrl || '',
        terrain: state.terrain,
        themeColor: state.themeColor,
        botsEnabled: state.netBotsEnabled,
      });
    });
    document.getElementById('btn-join-room').addEventListener('click', function () {
      var code = els.netCodeInput.value.trim();
      if (!code) return;
      window.GameNet.joinRoom({
        code: code,
        name: state.playerName,
        country: state.country,
        uniform: state.uniform,
        gender: state.gender,
        helmet: state.helmet,
        caricature: state.caricatureUrl || '',
      });
    });
    document.getElementById('btn-refresh-rooms').addEventListener('click', function () { window.GameNet.connect(); window.GameNet.refreshRooms(); });
    els.btnStartNetMatch.addEventListener('click', function () { window.GameNet.startMatch(); });
    document.getElementById('btn-leave-room').addEventListener('click', function () { window.GameNet.leaveRoom(); });
  }

  // Network Events
  window.GameNet.on('status', function (st) { els.roomStatus.textContent = 'LAN SERVER: ' + st.toUpperCase(); });
  window.GameNet.on('error', function (msg) { els.roomStatus.textContent = msg; });
  window.GameNet.on('assigned_uniform', function (uId) {
    if (uId && uId !== state.uniform) {
      state.uniform = uId;
      document.getElementById('sel-uniform').value = uId;
      rebuildViewmodel();
      if (lobbySoldier) rebuildLobbySoldier();
      els.roomStatus.textContent = 'UNIQUE UNIFORM ASSIGNED: ' + getUniformObj(uId).name.toUpperCase();
    }
  });

  window.GameNet.on('room_list', function (rooms) {
    if (!rooms || rooms.length === 0) {
      els.roomList.innerHTML = '<div class="net-empty">No active LAN rooms yet. Tap HOST WAR to create one!</div>';
      return;
    }
    els.roomList.innerHTML = rooms.map(function (r) {
      var tName = window.GameAssets.TERRAINS[r.terrain] ? window.GameAssets.TERRAINS[r.terrain].name : 'Arena';
      return '<div class="net-room-row"><span><b>' + r.code + '</b> • Host: ' + r.hostName + ' • ' + tName + ' • ' + (r.botsEnabled ? 'MIXED BOTS' : 'PVP ONLY') + ' (' + r.playerCount + '/' + r.maxPlayers + ')</span>' +
        '<button class="net-join-quick" data-code="' + r.code + '">JOIN</button></div>';
    }).join('');
    els.roomList.querySelectorAll('.net-join-quick').forEach(function (b) {
      b.addEventListener('click', function () {
        window.GameNet.joinRoom({
          code: b.getAttribute('data-code'),
          name: state.playerName,
          country: state.country,
          uniform: state.uniform,
          gender: state.gender,
          helmet: state.helmet,
          caricature: state.caricatureUrl || '',
        });
      });
    });
  });

  window.GameNet.on('room_update', function (room) {
    if (!room) {
      els.roomBox.classList.add('hidden');
      remotePlayers.forEach(function (rp) { purgeGlowRig(rp.entity); scene.remove(rp.entity.root); });
      remotePlayers.clear();
      return;
    }
    els.roomBox.classList.remove('hidden');
    document.getElementById('net-room-code').textContent = 'ROOM ' + room.code + ' (' + room.players.length + '/5) • ' + (room.botsEnabled ? 'MIXED ARMY BOTS' : 'PLAYERS ONLY');
    els.btnStartNetMatch.style.display = window.GameNet.isHost() ? 'inline-flex' : 'none';
    els.chkNetBots.disabled = !window.GameNet.isHost();
    els.chkNetBots.checked = Boolean(room.botsEnabled);

    if (!window.GameNet.isHost() && room.terrain !== state.terrain) {
      loadTerrain(room.terrain);
      document.getElementById('sel-terrain').value = String(room.terrain);
    }

    els.roomRoster.innerHTML = room.players.map(function (p) {
      var img = p.caricature || './assets/face.jpg';
      return '<div class="roster-pill"><img src="' + img + '" alt="" /><div>' +
        '<div class="rp-name">' + (p.isHost ? '[HOST] ' : '') + p.name + ' (' + (p.gender === 'female' ? 'F' : 'M') + ')</div>' +
        '<div class="rp-meta">' + p.country + ' • ' + getUniformObj(p.uniform).name + '</div></div></div>';
    }).join('');
  });

  window.GameNet.on('match_started', function (room) {
    remotePlayers.forEach(function (rp) { purgeGlowRig(rp.entity); scene.remove(rp.entity.root); });
    remotePlayers.clear();
    var selfId = window.GameNet.getClientId();
    var mySpawn = { x: 0, z: 26 };

    state.terrain = room.terrain;
    state.themeColor = room.themeColor || state.themeColor;
    applyThemeCss();

    room.players.forEach(function (p) {
      if (p.id === selfId) {
        mySpawn = { x: p.x, z: p.z };
        if (p.uniform !== state.uniform) state.uniform = p.uniform;
      } else {
        var uObj = getUniformObj(p.uniform);
        var entity = buildSoldierEntity({
          uniform: p.uniform,
          gender: p.gender,
          helmet: p.helmet,
          country: p.country,
          accentHex: '#' + new THREE.Color(uObj.accent).getHexString(),
          label: p.name,
          subLabel: uObj.name,
          caricature: p.caricature || './assets/face.jpg',
          weaponId: p.weaponId,
        });
        entity.root.position.set(p.x, p.y, p.z);
        scene.add(entity.root);
        remotePlayers.set(p.id, {
          id: p.id, name: p.name, alive: p.alive,
          pos: new THREE.Vector3(p.x, p.y, p.z),
          targetPos: new THREE.Vector3(p.x, p.y, p.z),
          yaw: p.yaw, entity: entity,
        });
      }
    });
    beginMatch('multi', mySpawn, room);
  });

  window.GameNet.on('remote_state', function (p) {
    var rp = remotePlayers.get(p.id);
    if (!rp) return;
    rp.alive = p.alive;
    rp.entity.root.visible = p.alive;
    rp.targetPos.set(p.x, p.y, p.z);
    rp.yaw = p.yaw;
    rp.entity.setAnim(p.anim || 'idle');
  });

  // Sync Host Mixed Army Bots onto Guests
  window.GameNet.on('remote_bots', function (botList) {
    if (window.GameNet.isHost()) return;
    botList.forEach(function (b) {
      var gb = guestBots.get(b.id);
      if (!gb && b.alive) {
        var uObj = getUniformObj(b.uniform);
        var entity = buildSoldierEntity({
          uniform: b.uniform,
          gender: b.gender,
          helmet: b.helmet,
          country: b.country,
          accentHex: '#' + new THREE.Color(uObj.accent).getHexString(),
          weaponId: b.weaponId,
          label: b.name,
          subLabel: b.subLabel,
        });
        entity.root.position.set(b.x, b.y, b.z);
        scene.add(entity.root);
        gb = {
          id: b.id, name: b.name, alive: b.alive,
          pos: new THREE.Vector3(b.x, b.y, b.z),
          targetPos: new THREE.Vector3(b.x, b.y, b.z),
          yaw: b.yaw, entity: entity,
        };
        guestBots.set(b.id, gb);
      }
      if (gb) {
        gb.alive = b.alive;
        gb.entity.root.visible = b.alive;
        gb.targetPos.set(b.x, b.y, b.z);
        gb.yaw = b.yaw;
        gb.entity.setAnim(b.anim || 'run');
      }
    });
  });

  window.GameNet.on('guest_bot_hit', function (msg) {
    if (!window.GameNet.isHost()) return;
    var en = enemies.find(function (e) { return e.id === msg.botId; });
    if (en && en.hp > 0) damageSoloEnemy(en, msg.damage, msg.isHeadshot, msg.attackerName);
  });

  window.GameNet.on('remote_fire', function (msg) {
    if (msg.origin && msg.target) {
      spawnTracer(
        new THREE.Vector3(msg.origin[0], msg.origin[1], msg.origin[2]),
        new THREE.Vector3(msg.target[0], msg.target[1], msg.target[2]),
        msg.color
      );
    }
  });

  window.GameNet.on('remote_grenade', function (msg) {
    var mesh = window.GameWeapons.createGrenadeMesh();
    mesh.position.set(msg.origin[0], msg.origin[1], msg.origin[2]);
    scene.add(mesh);
    grenades.push({ mesh: mesh, vel: new THREE.Vector3(msg.vel[0], msg.vel[1], msg.vel[2]), timer: 1.5, local: false });
  });

  window.GameNet.on('remote_emp', function (msg) {
    if (msg.casterId !== window.GameNet.getClientId()) {
      triggerEmpPulse(msg.x, msg.z, false);
      if (state.hasDrone && Math.hypot(player.pos.x - msg.x, player.pos.z - msg.z) <= 28) {
        destroyPlayerDrone();
        addKillfeed('YOUR DRONE WAS DESTROYED BY EMP!');
      }
    }
  });

  window.GameNet.on('player_damaged', function (msg) {
    if (msg.targetId === window.GameNet.getClientId()) {
      state.hp = msg.hp; state.armor = msg.armor;
      window.GameAudio.hurt();
      els.dmgVig.style.opacity = '0.9';
      setTimeout(function () { els.dmgVig.style.opacity = '0'; }, 140);
      updateHud();
    }
  });

  window.GameNet.on('player_killed', function (msg) {
    addKillfeed(msg.killerName + ' KILLED ' + msg.victimName);
    var rp = remotePlayers.get(msg.victimId);
    if (rp) { rp.alive = false; rp.entity.root.visible = false; }
    if (msg.victimId === window.GameNet.getClientId()) {
      handlePlayerDeath(msg.killerName);
    } else {
      window.GameAudio.deathPatayLaugh();
      if (msg.killerId === window.GameNet.getClientId()) {
        state.kills++; state.credits += 150; saveProgress();
      }
    }
    updateHud();
  });

  window.GameNet.on('match_winner', function (msg) {
    if (document.pointerLockElement) document.exitPointerLock();
    els.deathOverlay.classList.add('hidden');
    els.spectateBar.classList.add('hidden');
    els.winnerOverlay.classList.remove('hidden');
    if (msg.winner) {
      els.winnerTitle.textContent = msg.winner.name + ' SURVIVED & WON!';
      els.winnerSub.textContent = 'Country: ' + msg.winner.country + ' • Eliminations: ' + msg.winner.kills;
      if (msg.winner.id === window.GameNet.getClientId()) { state.credits += 300; saveProgress(); }
    } else {
      els.winnerTitle.textContent = 'DRAW — NO SURVIVORS';
      els.winnerSub.textContent = 'Everyone was eliminated in battle.';
    }
  });

  initLobbySelectors();

  // Animation Loop (includes real-time moving color & light animation on alien eyes, mouth & chest!)
  var clock = new THREE.Clock();
  var netSyncTimer = 0;
  var botSyncTimer = 0;
  var tmpColor = new THREE.Color();

  function updateMovingAlienLights(elapsed) {
    for (var i = 0; i < animatedGlowRigs.length; i++) {
      var r = animatedGlowRigs[i];
      var ph = r.phase;
      var eyeHue = (elapsed * 0.28 + ph) % 1;
      var mouthHue = (elapsed * 0.28 + ph + 0.34) % 1;
      var chestHue = (elapsed * 0.22 + ph + 0.68) % 1;
      var eyeInt = 1.65 + 0.85 * Math.sin(elapsed * 4.5 + ph);
      var mouthInt = 1.45 + 0.75 * Math.cos(elapsed * 6.2 + ph);
      var chestInt = 1.6 + 0.8 * Math.sin(elapsed * 3.4 + ph);

      tmpColor.setHSL(eyeHue, 0.95, 0.56);
      for (var e = 0; e < r.eyeMats.length; e++) {
        r.eyeMats[e].emissive.copy(tmpColor);
        r.eyeMats[e].color.copy(tmpColor);
        r.eyeMats[e].emissiveIntensity = eyeInt;
      }
      if (r.light) r.light.color.copy(tmpColor);

      tmpColor.setHSL(mouthHue, 0.95, 0.54);
      for (var m = 0; m < r.mouthMats.length; m++) {
        r.mouthMats[m].emissive.copy(tmpColor);
        r.mouthMats[m].color.copy(tmpColor);
        r.mouthMats[m].emissiveIntensity = mouthInt;
      }

      tmpColor.setHSL(chestHue, 0.92, 0.54);
      for (var c = 0; c < r.chestMats.length; c++) {
        r.chestMats[c].emissive.copy(tmpColor);
        r.chestMats[c].color.copy(tmpColor);
        r.chestMats[c].emissiveIntensity = chestInt;
      }
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(0.05, clock.getDelta());
    var elapsed = clock.elapsedTime;

    updateMovingAlienLights(elapsed);

    if (state.mode === 'lobby') {
      if (lobbySoldier && lobbySoldier.update) lobbySoldier.update(dt);
      camera.position.set(-0.6, 1.45, 25.4);
      camera.lookAt(0.9, 1.15, 22);
      vmRoot.visible = false;
      renderer.render(scene, camera);
      return;
    }

    if (state.fireCooldown > 0) state.fireCooldown -= dt;
    if (player.slashAnim > 0) player.slashAnim = Math.max(0, player.slashAnim - dt);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 1;
    }
    if (state.reloading) {
      state.reloadTimer -= dt;
      var rwCur = window.GameWeapons.WEAPONS[state.activeWeaponIdx];
      var rProg = 1 - Math.max(0, state.reloadTimer / Math.max(0.1, rwCur.reload));
      if (rProg >= 0.45 && player.reloadStage < 1) {
        player.reloadStage = 1;
        window.GameAudio.reload(1);
      }
      if (rProg >= 0.8 && player.reloadStage < 2) {
        player.reloadStage = 2;
        player.boltBack = 0.85;
        window.GameAudio.reload(2);
      }
      if (state.reloadTimer <= 0) {
        var ra = state.ammo[rwCur.id];
        var need = Math.min(rwCur.mag - ra.mag, ra.res);
        ra.mag += need;
        ra.res -= need;
        state.reloading = false;
        player.reloadStage = 0;
        if (vmWeapon && vmWeapon.magGroup) vmWeapon.magGroup.position.set(0, 0, 0);
        if (vmArms && vmArms.leftArm) {
          vmArms.leftArm.position.set(0, 0, 0);
          vmArms.leftArm.rotation.set(0, 0, 0);
        }
        updateHud();
      }
    }

    if (input.firing && (state.mode === 'solo' || state.mode === 'multi')) fireCurrentWeapon();

    var moving = false;
    if (state.mode === 'solo' || state.mode === 'multi') {
      var kx = (input.keys.KeyD ? 1 : 0) - (input.keys.KeyA ? 1 : 0);
      var kz = (input.keys.KeyS ? 1 : 0) - (input.keys.KeyW ? 1 : 0);
      var mx = Math.max(-1, Math.min(1, input.moveX + kx));
      var mz = Math.max(-1, Math.min(1, input.moveZ + kz));
      var mag = Math.hypot(mx, mz);
      moving = mag > 0.12;
      if (moving) {
        var speed = state.ads ? 4.8 : 8.2;
        var sinY = Math.sin(player.yaw), cosY = Math.cos(player.yaw);
        var wx = mx * cosY + mz * sinY;
        var wz = -mx * sinY + mz * cosY;
        var res = window.GameArena.resolveHorizontal(currentArena, player.pos.x + wx * speed * dt, player.pos.z + wz * speed * dt, player.pos.y, 0.52);
        player.pos.x = res.x;
        player.pos.z = res.z;
        player.stepTimer -= dt;
        if (player.stepTimer <= 0 && player.grounded) { window.GameAudio.footstep(); player.stepTimer = 0.34; }
        player.swayPhase += dt * 9.2;
      }

      player.velY -= 20 * dt;
      player.pos.y += player.velY * dt;
      var floorY = window.GameArena.getFloorHeightAt(currentArena, player.pos.x, player.pos.z);
      if (player.pos.y <= floorY) { player.pos.y = floorY; player.velY = 0; player.grounded = true; }

      if (localSoldier) {
        localSoldier.root.position.copy(player.pos);
        localSoldier.root.rotation.y = player.yaw + Math.PI;
        localSoldier.setAnim(moving ? 'run' : 'idle');
        if (localSoldier.update) localSoldier.update(dt);
      }

      var lookYaw = state.lookBack ? player.yaw + Math.PI : player.yaw;
      if (state.lookBack || state.thirdPerson) {
        vmRoot.visible = false;
        var backDist = state.lookBack ? 3.2 : 2.6;
        var shoulderX = state.lookBack ? 0 : 0.65;
        camera.position.set(
          player.pos.x + Math.sin(lookYaw) * backDist + Math.cos(lookYaw) * shoulderX,
          player.pos.y + 1.85,
          player.pos.z + Math.cos(lookYaw) * backDist - Math.sin(lookYaw) * shoulderX
        );
        camera.rotation.order = 'YXZ';
        camera.rotation.y = lookYaw;
        camera.rotation.x = state.lookBack ? -0.1 : player.pitch * 0.7;
      } else {
        vmRoot.visible = true;
        camera.position.set(player.pos.x, player.pos.y + 1.62, player.pos.z);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = player.yaw;
        camera.rotation.x = player.pitch;
      }

      var wObj = window.GameWeapons.WEAPONS[state.activeWeaponIdx];
      var targetAds = (state.ads && !state.reloading && !wObj.melee) ? 1 : 0;
      player.adsBlend += (targetAds - player.adsBlend) * Math.min(1, dt * 15);
      var targetFov = 72 + (wObj.adsFov - 72) * player.adsBlend;
      if (Math.abs(camera.fov - targetFov) > 0.08) {
        camera.fov = targetFov;
        camera.updateProjectionMatrix();
      }
      els.adsVig.style.opacity = player.adsBlend > 0.15 ? String(player.adsBlend.toFixed(2)) : '0';

      player.recoilOffset = Math.max(0, player.recoilOffset - dt * 0.58);
      player.recoilPitch = Math.max(0, player.recoilPitch - dt * 0.95);
      player.recoilRoll *= Math.max(0, 1 - dt * 14);
      player.boltBack = Math.max(0, player.boltBack - dt * 16);

      if (vmWeapon && vmWeapon.boltCarrier) {
        vmWeapon.boltCarrier.position.x = -0.058 * player.boltBack;
      }

      if (vmRig) {
        var damp = 1 - player.adsBlend * 0.8;
        var bobX = moving ? Math.cos(player.swayPhase * 0.5) * 0.013 * damp : Math.cos(elapsed * 1.6) * 0.0025 * damp;
        var bobY = moving ? Math.sin(player.swayPhase) * 0.011 * damp : Math.sin(elapsed * 3.1) * 0.0028 * damp;

        var baseX = wObj.melee ? 0.16 : 0.185 * (1 - player.adsBlend);
        var baseY = wObj.melee ? -0.15 : (-0.19 + 0.08 * player.adsBlend);
        var baseZ = wObj.melee ? -0.34 : (-0.42 + 0.09 * player.adsBlend);

        var rTiltX = 0;
        var rTiltZ = 0;
        if (state.reloading && !wObj.melee) {
          var p = 1 - Math.max(0, state.reloadTimer / Math.max(0.1, wObj.reload));
          if (p < 0.42) {
            var s0 = p / 0.42;
            rTiltZ = -0.36 * s0;
            rTiltX = 0.22 * s0;
            if (vmWeapon && vmWeapon.magGroup) vmWeapon.magGroup.position.y = -0.22 * s0;
            if (vmArms && vmArms.leftArm) {
              vmArms.leftArm.position.set(0.02 * s0, -0.18 * s0, 0.16 * s0);
              vmArms.leftArm.rotation.x = -0.25 * s0;
            }
          } else if (p < 0.76) {
            var s1 = (p - 0.42) / 0.34;
            rTiltZ = -0.36 * (1 - s1 * 0.45);
            rTiltX = 0.22 * (1 - s1 * 0.4);
            if (vmWeapon && vmWeapon.magGroup) vmWeapon.magGroup.position.y = -0.22 * (1 - s1);
            if (vmArms && vmArms.leftArm) {
              vmArms.leftArm.position.set(0.02 * (1 - s1), -0.18 * (1 - s1), 0.16 * (1 - s1 * 0.5));
              vmArms.leftArm.rotation.x = -0.25 * (1 - s1);
            }
          } else {
            var s2 = (p - 0.76) / 0.24;
            var slap = Math.sin(s2 * Math.PI);
            rTiltZ = -0.2 * (1 - s2);
            rTiltX = 0.13 * (1 - s2);
            if (vmWeapon && vmWeapon.magGroup) vmWeapon.magGroup.position.y = 0;
            if (vmArms && vmArms.leftArm) {
              vmArms.leftArm.position.set(-0.04 * slap, 0.05 * slap, 0.18 * (1 - s2));
              vmArms.leftArm.rotation.z = -0.28 * slap;
            }
          }
        } else {
          if (vmWeapon && vmWeapon.magGroup) vmWeapon.magGroup.position.y = 0;
          if (vmArms && vmArms.leftArm && !wObj.melee) {
            vmArms.leftArm.position.set(0, 0, 0);
            vmArms.leftArm.rotation.set(0, 0, 0);
          }
        }

        var tx = baseX + bobX;
        var ty = baseY + bobY - player.recoilOffset * 0.15;
        var tz = baseZ + player.recoilOffset - player.slashAnim * 0.65;
        vmRig.position.lerp(new THREE.Vector3(tx, ty, tz), Math.min(1, dt * 20));
        vmRig.rotation.set(
          player.recoilPitch + rTiltX - player.slashAnim * 1.1,
          0,
          player.recoilRoll + rTiltZ + player.slashAnim * 1.4
        );
      }

      if (state.hasDrone && playerDrone) {
        playerDrone.group.position.set(
          player.pos.x + Math.cos(elapsed * 2.2) * 1.4,
          player.pos.y + 2.55 + Math.sin(elapsed * 3.5) * 0.16,
          player.pos.z + Math.sin(elapsed * 2.2) * 1.4
        );
        playerDrone.rotors.forEach(function (r) { r.rotation.z += dt * 28; });
        playerDroneCooldown -= dt;
        if (playerDroneCooldown <= 0) {
          var bestTarget = null, bestDist = 24;
          enemies.forEach(function (e) {
            if (e.hp > 0) {
              var d = e.pos.distanceTo(playerDrone.group.position);
              if (d < bestDist) { bestDist = d; bestTarget = { type: 'bot', ref: e }; }
            }
          });
          if (!bestTarget && state.mode === 'multi') {
            remotePlayers.forEach(function (rp) {
              if (rp.alive) {
                var d = rp.pos.distanceTo(playerDrone.group.position);
                if (d < bestDist) { bestDist = d; bestTarget = { type: 'remote', ref: rp }; }
              }
            });
          }
          if (bestTarget) {
            playerDroneCooldown = 0.65;
            var tp = new THREE.Vector3(bestTarget.ref.pos.x, bestTarget.ref.pos.y + 1.25, bestTarget.ref.pos.z);
            spawnTracer(playerDrone.group.position, tp, '#38bdf8');
            window.GameAudio.shot('pulse');
            if (bestTarget.type === 'bot') damageSoloEnemy(bestTarget.ref, 18, false);
            else {
              window.GameNet.sendFire(playerDrone.group.position, tp, '#38bdf8', 'pulse');
              window.GameNet.sendHit(bestTarget.ref.id, 14, false);
            }
          }
        }
      }
    } else if (state.mode === 'spectate') {
      vmRoot.visible = false;
      var targets = getSpectateTargets();
      if (targets.length > 0) {
        var st = targets[state.spectateIdx % targets.length];
        camera.position.set(st.pos.x + Math.cos(elapsed * 0.5) * 4.5, st.pos.y + 3.2, st.pos.z + Math.sin(elapsed * 0.5) * 4.5);
        camera.lookAt(st.pos.x, st.pos.y + 1.2, st.pos.z);
      }
    }

    // Update AI Country-Army Bots (Solo OR Host in Mixed Network Match)
    var runBotAi = (state.mode === 'solo' || state.mode === 'spectate' || (state.mode === 'multi' && window.GameNet.isHost()));
    if (runBotAi) {
      var botPayload = [];
      enemies.forEach(function (en) {
        if (en.hp <= 0) {
          botPayload.push({ id: en.id, alive: false, x: en.pos.x, y: en.pos.y, z: en.pos.z, yaw: 0, anim: 'idle', uniform: en.uniform, gender: en.gender, helmet: en.helmet, country: en.country, weaponId: en.weaponId, name: en.name, subLabel: en.subLabel });
          return;
        }
        if (en.entity.update) en.entity.update(dt);
        if (en.stunTimer > 0) { en.stunTimer -= dt; en.entity.setAnim('idle'); return; }

        // Target nearest alive player (self or remote)
        var targetPos = player.pos;
        var targetPlayerId = 'self';
        var bestD = (state.mode === 'solo' || state.mode === 'multi') ? en.pos.distanceTo(player.pos) : 999;
        if (state.mode === 'multi') {
          remotePlayers.forEach(function (rp) {
            if (!rp.alive) return;
            var rd = en.pos.distanceTo(rp.pos);
            if (rd < bestD) { bestD = rd; targetPos = rp.pos; targetPlayerId = rp.id; }
          });
        }

        var dx = targetPos.x - en.pos.x;
        var dz = targetPos.z - en.pos.z;
        var dist = Math.hypot(dx, dz) || 0.01;
        var yaw = Math.atan2(dx, dz);
        en.entity.root.rotation.y = yaw;
        var stopDist = en.weaponId === 'knife' ? 1.85 : 8.5;
        var animName = 'run';

        if (dist > stopDist) {
          var nx = en.pos.x + (dx / dist) * en.speed * dt;
          var nz = en.pos.z + (dz / dist) * en.speed * dt;
          var r = window.GameArena.resolveHorizontal(currentArena, nx, nz, en.pos.y, 0.52);
          en.pos.x = r.x; en.pos.z = r.z;
          en.pos.y = window.GameArena.getFloorHeightAt(currentArena, en.pos.x, en.pos.z);
          en.entity.setAnim('run');
        } else {
          animName = 'walk';
          en.entity.setAnim('walk');
          var sx = en.pos.x + (-dz / dist) * en.strafeDir * 1.9 * dt;
          var sz = en.pos.z + (dx / dist) * en.strafeDir * 1.9 * dt;
          var sr = window.GameArena.resolveHorizontal(currentArena, sx, sz, en.pos.y, 0.52);
          en.pos.x = sr.x; en.pos.z = sr.z;
        }

        if (en.drone) {
          en.droneTimer += dt;
          en.drone.group.position.set(en.pos.x + Math.cos(en.droneTimer * 2.5) * 1.1, en.pos.y + 2.35, en.pos.z + Math.sin(en.droneTimer * 2.5) * 1.1);
          en.drone.rotors.forEach(function (rot) { rot.rotation.z += dt * 24; });
        }

        var maxRange = en.weaponId === 'knife' ? 2.4 : 30;
        if (dist <= maxRange && (state.mode === 'solo' || state.mode === 'multi')) {
          en.fireCd -= dt;
          if (en.fireCd <= 0) {
            en.fireCd = (en.weaponId === 'knife' ? 0.75 : Math.max(0.55, 1.65 - state.wave * 0.08)) + Math.random() * 0.45;
            if (en.weaponId !== 'knife') {
              var botOrig = new THREE.Vector3(en.pos.x, en.pos.y + 1.45, en.pos.z);
              var aimPt = new THREE.Vector3(targetPos.x + (Math.random() - 0.5) * 1.5, targetPos.y + 1.35, targetPos.z + (Math.random() - 0.5) * 1.5);
              spawnTracer(botOrig, aimPt, en.colorHex);
            }
            if (en.weaponId === 'knife' || Math.random() < 0.36) {
              var hitDmg = en.weaponId === 'knife' ? 22 : (8 + state.wave * 1.2);
              if (targetPlayerId === 'self') applyDamageToPlayer(hitDmg, en.name);
              else window.GameNet.sendBotHitPlayer(targetPlayerId, hitDmg, en.name);
            }
          }
        }
        botPayload.push({ id: en.id, alive: true, x: en.pos.x, y: en.pos.y, z: en.pos.z, yaw: yaw, anim: animName, uniform: en.uniform, gender: en.gender, helmet: en.helmet, country: en.country, weaponId: en.weaponId, name: en.name, subLabel: en.subLabel });
      });

      if (state.mode === 'multi' && window.GameNet.isHost() && botPayload.length > 0) {
        botSyncTimer += dt;
        if (botSyncTimer >= 0.1) {
          botSyncTimer = 0;
          window.GameNet.sendBotStates(botPayload);
        }
      }
    }

    guestBots.forEach(function (gb) {
      if (!gb.alive) return;
      gb.pos.lerp(gb.targetPos, Math.min(1, dt * 10));
      gb.entity.root.position.copy(gb.pos);
      gb.entity.root.rotation.y = gb.yaw;
      if (gb.entity.update) gb.entity.update(dt);
    });

    remotePlayers.forEach(function (rp) {
      if (!rp.alive) return;
      rp.pos.lerp(rp.targetPos, Math.min(1, dt * 12));
      rp.entity.root.position.copy(rp.pos);
      rp.entity.root.rotation.y = rp.yaw + Math.PI;
      if (rp.entity.update) rp.entity.update(dt);
    });

    if (state.mode === 'multi') {
      netSyncTimer += dt;
      if (netSyncTimer >= 0.05) {
        netSyncTimer = 0;
        window.GameNet.sendState({
          x: player.pos.x, y: player.pos.y, z: player.pos.z,
          yaw: player.yaw, pitch: player.pitch,
          anim: moving ? 'run' : 'idle',
          weaponId: window.GameWeapons.WEAPONS[state.activeWeaponIdx].id,
          hasDrone: state.hasDrone,
          uniform: state.uniform, country: state.country,
          gender: state.gender, helmet: state.helmet,
        });
      }
    }

    for (var gi = grenades.length - 1; gi >= 0; gi--) {
      var g = grenades[gi];
      g.vel.y -= 18 * dt;
      g.mesh.position.addScaledVector(g.vel, dt);
      g.mesh.rotation.x += dt * 8;
      if (g.mesh.position.y < 0.14) { g.mesh.position.y = 0.14; g.vel.y *= -0.35; g.vel.x *= 0.65; g.vel.z *= 0.65; }
      g.timer -= dt;
      if (g.timer <= 0) {
        triggerExplosion(g.mesh.position, 6.5, 95, g.local);
        scene.remove(g.mesh);
        grenades.splice(gi, 1);
      }
    }

    for (var ti = tracers.length - 1; ti >= 0; ti--) {
      tracers[ti].life -= dt;
      if (tracers[ti].life <= 0) { scene.remove(tracers[ti].line); tracers.splice(ti, 1); }
    }
    for (var si = shellCasings.length - 1; si >= 0; si--) {
      var sc = shellCasings[si];
      sc.vel.y -= 13.5 * dt;
      sc.mesh.position.addScaledVector(sc.vel, dt);
      sc.mesh.rotation.x += sc.rotVel.x * dt;
      sc.mesh.rotation.y += sc.rotVel.y * dt;
      sc.mesh.rotation.z += sc.rotVel.z * dt;
      if (sc.mesh.position.y < 0.03) {
        sc.mesh.position.y = 0.03;
        sc.vel.y *= -0.35;
        sc.vel.x *= 0.6;
        sc.vel.z *= 0.6;
        if (!sc.pinged) { sc.pinged = true; window.GameAudio.casingPing(); }
      }
      sc.life -= dt;
      if (sc.life <= 0) { scene.remove(sc.mesh); shellCasings.splice(si, 1); }
    }
    for (var ei = empRings.length - 1; ei >= 0; ei--) {
      var er = empRings[ei];
      er.life -= dt;
      var s = 1 + (1 - er.life / er.maxLife) * 0.45;
      er.mesh.scale.set(s, s, 1);
      er.mesh.material.opacity = Math.max(0, er.life / er.maxLife);
      if (er.life <= 0) { scene.remove(er.mesh); empRings.splice(ei, 1); }
    }

    drawMinimap();
    renderer.render(scene, camera);
  }

  animate();
})();
