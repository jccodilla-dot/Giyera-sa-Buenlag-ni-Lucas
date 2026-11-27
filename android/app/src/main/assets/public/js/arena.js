(function () {
  'use strict';

  var ARENA_HALF = 44;

  function buildSkyDome(terrainCfg) {
    var c = document.createElement('canvas');
    c.width = 128;
    c.height = 512;
    var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, terrainCfg.skyTop);
    g.addColorStop(0.56, terrainCfg.skyMid);
    g.addColorStop(1, terrainCfg.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 512);
    var tex = new THREE.CanvasTexture(c);
    var mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false });
    return new THREE.Mesh(new THREE.SphereGeometry(210, 20, 16), mat);
  }

  function buildArena(scene, renderer, terrainIdx, themeHex) {
    var cfg = window.GameAssets.TERRAINS[terrainIdx % window.GameAssets.TERRAINS.length];
    var group = new THREE.Group();
    var colliders = [];
    var ramps = [];
    var shootMeshes = [];

    scene.fog = new THREE.FogExp2(cfg.fogColor, 0.0082);
    var sky = buildSkyDome(cfg);
    group.add(sky);

    var groundTex = window.GameAssets.makeGroundTexture(renderer, cfg.groundMode);
    var groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: cfg.groundMode === 'tiles' ? 0.35 : cfg.groundMode === 'metal' ? 0.42 : 0.86,
      metalness: cfg.groundMode === 'metal' ? 0.55 : 0.08,
    });
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    group.add(ground);
    shootMeshes.push(ground);

    var wallTex = window.GameAssets.makeWallTexture(renderer, cfg.wallMode);
    var crateTex = window.GameAssets.makeCrateTexture(renderer, cfg.crateMode);
    var contMats = cfg.containerColors.map(function (hex) {
      return new THREE.MeshStandardMaterial({
        map: window.GameAssets.makeContainerTexture(renderer, hex),
        roughness: 0.48,
        metalness: 0.42,
      });
    });

    function addSolidBox(x, y, z, w, h, d, mat, texRepeatX, texRepeatY) {
      var m = mat;
      if (texRepeatX || texRepeatY) {
        var clonedTex = wallTex.clone();
        clonedTex.needsUpdate = true;
        clonedTex.repeat.set(texRepeatX || 1, texRepeatY || 1);
        m = new THREE.MeshStandardMaterial({
          map: clonedTex,
          roughness: cfg.wallMode === 'metal' ? 0.38 : 0.82,
          metalness: cfg.wallMode === 'metal' ? 0.48 : 0.06,
        });
      }
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y + h / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      shootMeshes.push(mesh);
      colliders.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
        maxY: y + h,
        w: w,
        d: d,
        x: x,
        z: z,
        color: mat && mat.color ? '#' + mat.color.getHexString() : '#94a3b8',
      });
      return mesh;
    }

    // Perimeter fortified walls
    addSolidBox(0, 0, -ARENA_HALF, ARENA_HALF * 2, 6, 2, null, 12, 2);
    addSolidBox(0, 0, ARENA_HALF, ARENA_HALF * 2, 6, 2, null, 12, 2);
    addSolidBox(-ARENA_HALF, 0, 0, 2, 6, ARENA_HALF * 2, null, 12, 2);
    addSolidBox(ARENA_HALF, 0, 0, 2, 6, ARENA_HALF * 2, null, 12, 2);

    // Theme-tinted tactical banner trim along perimeter
    var trimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(themeHex || '#e5b842'),
      emissive: new THREE.Color(themeHex || '#e5b842'),
      emissiveIntensity: 0.3,
      roughness: 0.4,
    });
    var trimBarN = new THREE.Mesh(new THREE.BoxGeometry(ARENA_HALF * 1.9, 0.25, 0.2), trimMat);
    trimBarN.position.set(0, 4.6, -ARENA_HALF + 1.05);
    group.add(trimBarN);

    // Central tactical compound & shipping containers
    addSolidBox(0, 0, 0, 6.2, 2.2, 6.2, null, 2, 1);
    addSolidBox(-14, 0, -8, 7.5, 3.2, 3.2, contMats[0]);
    addSolidBox(14, 0, 8, 7.5, 3.2, 3.2, contMats[1]);
    addSolidBox(13, 0, -14, 3.4, 3.2, 7.2, contMats[2]);
    addSolidBox(-13, 0, 14, 3.4, 3.2, 7.2, contMats[0]);

    // Cover walls & red-brick/concrete sniper barriers
    addSolidBox(0, 0, -18, 12, 2.5, 1.5, null, 4, 1);
    addSolidBox(0, 0, 18, 12, 2.5, 1.5, null, 4, 1);
    addSolidBox(-22, 0, 0, 1.5, 2.8, 11, null, 3, 1);
    addSolidBox(22, 0, 0, 1.5, 2.8, 11, null, 3, 1);

    // Crates scattered around mid lanes
    var crateMat = new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.72, metalness: 0.12 });
    var cratePts = [
      [-6, 0, -9, 2.1, 1.8, 2.1],
      [6, 0, 9, 2.1, 1.8, 2.1],
      [-7, 0, 7, 1.9, 1.5, 1.9],
      [7, 0, -7, 1.9, 1.5, 1.9],
      [-26, 0, -24, 2.5, 2.2, 2.5],
      [26, 0, 24, 2.5, 2.2, 2.5],
      [26, 0, -24, 2.5, 2.2, 2.5],
      [-26, 0, 24, 2.5, 2.2, 2.5],
    ];
    for (var i = 0; i < cratePts.length; i++) {
      var p = cratePts[i];
      addSolidBox(p[0], p[1], p[2], p[3], p[4], p[5], crateMat);
    }

    // Walkable elevated platforms + ramps
    function addRamp(x, z, w, len, height, dirZ) {
      var rampMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.75 });
      var slope = new THREE.Mesh(new THREE.BoxGeometry(w, 0.28, len), rampMat);
      var angle = Math.atan2(height, len) * (dirZ > 0 ? 1 : -1);
      slope.position.set(x, height * 0.5, z);
      slope.rotation.x = angle;
      slope.castShadow = true;
      slope.receiveShadow = true;
      group.add(slope);
      shootMeshes.push(slope);
      ramps.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - len / 2,
        maxZ: z + len / 2,
        height: height,
        dirZ: dirZ,
      });
    }
    addRamp(0, -6.2, 3.4, 6.4, 2.2, 1);
    addRamp(0, 6.2, 3.4, 6.4, 2.2, -1);

    scene.add(group);
    return {
      group: group,
      colliders: colliders,
      ramps: ramps,
      shootMeshes: shootMeshes,
      cfg: cfg,
      halfSize: ARENA_HALF - 1.6,
    };
  }

  function getFloorHeightAt(arena, x, z) {
    if (!arena) return 0;
    var h = 0;
    // Elevated center platform
    if (Math.abs(x) <= 3.1 && Math.abs(z) <= 3.1) h = 2.2;
    for (var i = 0; i < arena.ramps.length; i++) {
      var r = arena.ramps[i];
      if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) {
        var t = (z - r.minZ) / (r.maxZ - r.minZ);
        if (r.dirZ < 0) t = 1 - t;
        h = Math.max(h, Math.max(0, Math.min(1, t)) * r.height);
      }
    }
    return h;
  }

  function resolveHorizontal(arena, x, z, y, radius) {
    if (!arena) return { x: x, z: z };
    var nx = Math.max(-arena.halfSize, Math.min(arena.halfSize, x));
    var nz = Math.max(-arena.halfSize, Math.min(arena.halfSize, z));
    for (var i = 0; i < arena.colliders.length; i++) {
      var c = arena.colliders[i];
      if (y >= c.maxY - 0.35) continue;
      var cx = Math.max(c.minX, Math.min(nx, c.maxX));
      var cz = Math.max(c.minZ, Math.min(nz, c.maxZ));
      var dx = nx - cx;
      var dz = nz - cz;
      var distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        var dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          nx = cx + (dx / dist) * radius;
          nz = cz + (dz / dist) * radius;
        } else {
          nx += radius;
        }
      }
    }
    return { x: nx, z: nz };
  }

  window.GameArena = {
    buildArena: buildArena,
    getFloorHeightAt: getFloorHeightAt,
    resolveHorizontal: resolveHorizontal,
  };
})();
