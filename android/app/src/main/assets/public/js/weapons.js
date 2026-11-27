(function () {
  'use strict';

  var WEAPONS = [
    {
      id: 'rifle',
      name: 'MK18 M4A1 Tactical',
      short: 'M4A1',
      cost: 0,
      damage: 28,
      rate: 0.115,
      mag: 30,
      reserve: 120,
      reload: 1.5,
      spread: 0.011,
      pellets: 1,
      color: '#e5b842',
      adsFov: 48,
      recoil: 0.045,
    },
    {
      id: 'pulse',
      name: 'Pulse Carbine',
      short: 'PULSE',
      cost: 180,
      damage: 22,
      rate: 0.072,
      mag: 42,
      reserve: 168,
      reload: 1.3,
      spread: 0.006,
      pellets: 1,
      color: '#38bdf8',
      adsFov: 44,
      recoil: 0.028,
    },
    {
      id: 'shotgun',
      name: 'Spread Fire Gun',
      short: 'SPREAD',
      cost: 260,
      damage: 16,
      rate: 0.56,
      mag: 8,
      reserve: 40,
      reload: 1.75,
      spread: 0.068,
      pellets: 7,
      color: '#f97316',
      adsFov: 56,
      recoil: 0.095,
    },
    {
      id: 'launcher',
      name: 'Heavy Launcher',
      short: 'HEAVY',
      cost: 420,
      damage: 110,
      rate: 0.85,
      mag: 4,
      reserve: 20,
      reload: 2.1,
      spread: 0.008,
      pellets: 1,
      splash: 5.8,
      color: '#ef4444',
      adsFov: 50,
      recoil: 0.125,
    },
    {
      id: 'knife',
      name: 'Karambit Blade',
      short: 'KNIFE',
      cost: 0,
      damage: 65,
      rate: 0.36,
      mag: 1,
      reserve: 0,
      reload: 0,
      spread: 0.01,
      pellets: 1,
      melee: true,
      color: '#e2e8f0',
      adsFov: 68,
      recoil: 0.05,
    },
  ];

  var TACTICAL_ITEMS = {
    drone: { id: 'drone', name: 'Combat Drone', cost: 220, desc: 'Autonomous quad-drone shoots nearby hostiles' },
    grenade: { id: 'grenade', name: 'Frag Grenade (+2)', cost: 75, desc: 'Throwable AoE blast grenade' },
    antidrone: { id: 'antidrone', name: 'Anti-Drone EMP', cost: 140, desc: 'Destroys enemy drones & stuns soldiers' },
  };

  function makeExtrudedPoly(pts, depth, mat, bevelSize, curveSegs) {
    var shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
    shape.closePath();
    var b = bevelSize === false ? 0 : (bevelSize || 0.005);
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: depth,
      curveSegments: curveSegs || 16,
      bevelEnabled: bevelSize !== false,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: 4,
    });
    geo.translate(0, 0, -depth * 0.5);
    geo.computeVertexNormals();
    var m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function makeLathePart(profile, segs, mat) {
    var vecs = profile.map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    var geo = new THREE.LatheGeometry(vecs, segs || 32);
    geo.computeVertexNormals();
    var m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function makeTubePart(points, radius, segs, mat, radSegs) {
    var curve = new THREE.CatmullRomCurve3(points.map(function (p) {
      return new THREE.Vector3(p[0], p[1], p[2]);
    }));
    var geo = new THREE.TubeGeometry(curve, segs || 16, radius, radSegs || 14, false);
    geo.computeVertexNormals();
    var m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    return m;
  }

  // Smooth anatomical tapered tube (zero BoxGeometry / zero CylinderGeometry)
  function makeTaperedTube(points, rStart, rEnd, segs, mat, radSegs) {
    var tSegs = segs || 12;
    var rSegs = radSegs || 12;
    var baseR = Math.max(0.001, (rStart + rEnd) * 0.5);
    var curve = new THREE.CatmullRomCurve3(points.map(function (p) {
      return new THREE.Vector3(p[0], p[1], p[2]);
    }));
    var geo = new THREE.TubeGeometry(curve, tSegs, baseR, rSegs, false);
    var pos = geo.attributes.position;
    var center = new THREE.Vector3();
    var v = new THREE.Vector3();
    for (var i = 0; i <= tSegs; i++) {
      var u = i / tSegs;
      curve.getPointAt(u, center);
      var targetScale = (rStart + (rEnd - rStart) * u) / baseR;
      for (var j = 0; j <= rSegs; j++) {
        var idx = i * (rSegs + 1) + j;
        v.fromBufferAttribute(pos, idx);
        v.sub(center).multiplyScalar(targetScale).add(center);
        pos.setXYZ(idx, v.x, v.y, v.z);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    var m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    return m;
  }

  function createCombatKnifeMesh(accentHex) {
    var root = new THREE.Group();
    var steelMat = new THREE.MeshPhysicalMaterial({
      color: 0xdbe3ee,
      metalness: 0.94,
      roughness: 0.14,
      clearcoat: 0.85,
    });
    var gripMat = new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.72, metalness: 0.22 });
    var edgeMat = new THREE.MeshStandardMaterial({
      color: accentHex || 0xe5b842,
      emissive: new THREE.Color(accentHex || '#e5b842'),
      emissiveIntensity: 0.45,
      metalness: 0.72,
      roughness: 0.22,
    });

    var handle = makeTaperedTube([[-0.085, -0.02, 0], [0, 0.005, 0], [0.09, 0.015, 0]], 0.014, 0.017, 14, gripMat, 14);
    root.add(handle);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 12, 24), edgeMat);
    ring.position.set(-0.098, -0.022, 0);
    root.add(ring);
    var guard = makeExtrudedPoly([[0.08, -0.025], [0.105, -0.025], [0.11, 0.032], [0.085, 0.032]], 0.032, edgeMat, 0.003);
    root.add(guard);

    var blade = makeExtrudedPoly([
      [0.102, -0.012], [0.22, -0.018], [0.315, 0.022], [0.245, 0.034], [0.102, 0.022],
    ], 0.006, steelMat, 0.002);
    root.add(blade);

    root.rotation.y = Math.PI / 2;
    var muzzle = new THREE.Object3D();
    muzzle.position.set(0.32, 0.02, 0);
    root.add(muzzle);
    return { group: root, muzzle: muzzle };
  }

  // High-Detail 15+ Sub-Part MK18 / M4A1 & Tactical Variants (ZERO BoxGeometry / CylinderGeometry)
  function createTacticalWeaponMesh(weaponId, accentHex) {
    if (weaponId === 'knife') return createCombatKnifeMesh(accentHex);

    var root = new THREE.Group();
    var accentNum = accentHex ? new THREE.Color(accentHex).getHex() : 0xe5b842;

    var upperMetal = new THREE.MeshPhysicalMaterial({
      color: 0x202630,
      metalness: 0.86,
      roughness: 0.28,
      clearcoat: 0.45,
      clearcoatRoughness: 0.3,
    });
    var lowerMetal = new THREE.MeshPhysicalMaterial({
      color: 0x171c24,
      metalness: 0.82,
      roughness: 0.34,
      clearcoat: 0.35,
    });
    var polymerMat = new THREE.MeshStandardMaterial({
      color: 0x11151b,
      metalness: 0.18,
      roughness: 0.72,
    });
    var accentMat = new THREE.MeshPhysicalMaterial({
      color: weaponId === 'pulse' ? 0x0284c7 : weaponId === 'shotgun' ? 0xea580c : weaponId === 'launcher' ? 0xb91c1c : accentNum,
      metalness: 0.65,
      roughness: 0.28,
      clearcoat: 0.55,
    });
    var steelMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      metalness: 0.94,
      roughness: 0.18,
      clearcoat: 0.7,
    });
    var tinBoltMat = new THREE.MeshPhysicalMaterial({
      color: 0xcbb36a,
      metalness: 0.95,
      roughness: 0.16,
      clearcoat: 0.8,
    });
    var glowMat = new THREE.MeshBasicMaterial({
      color: weaponId === 'pulse' ? 0x38bdf8 : weaponId === 'shotgun' ? 0xfb923c : 0xef4444,
    });

    // 1. Sculpted Lower Receiver with flared magwell
    var lowerRecv = makeExtrudedPoly([
      [-0.205, -0.038], [0.025, -0.038], [0.048, -0.056], [0.165, -0.052], [0.182, -0.01], [0.182, 0.012], [-0.21, 0.014],
    ], 0.044, lowerMetal, 0.005);
    root.add(lowerRecv);

    // 2. Chamfered Upper Receiver + Forward Assist Housing
    var upperRecv = makeExtrudedPoly([
      [-0.215, 0.012], [0.195, 0.012], [0.195, 0.058], [-0.195, 0.062], [-0.225, 0.034],
    ], 0.048, upperMetal, 0.006);
    root.add(upperRecv);

    var forwardAssist = makeLathePart([[0.011, 0], [0.013, 0.038], [0.016, 0.042], [0.002, 0.044]], 18, steelMat);
    forwardAssist.rotation.x = Math.PI / 2;
    forwardAssist.rotation.z = -0.35;
    forwardAssist.position.set(-0.11, 0.03, 0.028);
    root.add(forwardAssist);

    // 3. Brass Deflector + Ejection Port Cavity + Open Dust Cover
    var deflector = makeExtrudedPoly([[-0.075, 0.02], [-0.042, 0.02], [-0.05, 0.048], [-0.072, 0.048]], 0.016, upperMetal, 0.003);
    deflector.position.set(0, 0, 0.03);
    root.add(deflector);

    var portRecess = makeExtrudedPoly([[-0.032, 0.022], [0.078, 0.022], [0.078, 0.046], [-0.032, 0.046]], 0.008, polymerMat, false);
    portRecess.position.set(0, 0, 0.024);
    root.add(portRecess);

    var dustCover = makeExtrudedPoly([[-0.034, 0.002], [0.078, 0.002], [0.078, 0.02], [-0.034, 0.02]], 0.005, lowerMetal, 0.002);
    dustCover.position.set(0, 0.018, 0.032);
    dustCover.rotation.x = 1.15;
    root.add(dustCover);

    // 4. Animated Bolt Carrier Group (slides backward along -X on every shot!)
    var boltCarrier = makeExtrudedPoly([
      [-0.03, 0.024], [0.072, 0.024], [0.072, 0.044], [-0.03, 0.044],
    ], 0.012, tinBoltMat, 0.002);
    boltCarrier.position.set(0, 0, 0.025);
    root.add(boltCarrier);

    // 5. Ambidextrous Charging Handle
    var chargeBar = makeExtrudedPoly([[-0.228, 0.042], [-0.175, 0.042], [-0.175, 0.055], [-0.228, 0.055]], 0.068, steelMat, 0.002);
    root.add(chargeBar);

    // 6. Free-Float M-LOK / Picatinny Quad-Rail Handguard + Individual Rail Teeth
    var shroudLen = weaponId === 'shotgun' ? 0.33 : weaponId === 'launcher' ? 0.39 : 0.31;
    var handguard = makeExtrudedPoly([
      [0.195, -0.018], [0.195 + shroudLen, -0.015], [0.195 + shroudLen, 0.05], [0.195, 0.052],
    ], 0.048, weaponId === 'rifle' ? lowerMetal : accentMat, 0.007);
    root.add(handguard);

    // M-LOK Side Cooling Slots + Accent Trim Strips
    for (var ml = 0; ml < 4; ml++) {
      var mx = 0.225 + ml * (shroudLen * 0.21);
      var slot = makeExtrudedPoly([[mx, 0.004], [mx + 0.042, 0.004], [mx + 0.042, 0.022], [mx, 0.022]], 0.058, polymerMat, 0.001);
      root.add(slot);
    }
    var railAccent = makeExtrudedPoly([[0.2, 0.032], [0.19 + shroudLen, 0.032], [0.19 + shroudLen, 0.04], [0.2, 0.04]], 0.054, accentMat, 0.001);
    root.add(railAccent);

    // Top Picatinny Rail Teeth
    for (var r = -0.17; r <= 0.17 + shroudLen; r += 0.026) {
      var tooth = makeExtrudedPoly([[r, 0.058], [r + 0.014, 0.058], [r + 0.014, 0.066], [r, 0.066]], 0.03, polymerMat, 0.0015);
      root.add(tooth);
    }

    // 7. Fluted Precision Barrel + Low-Profile Gas Block + Stainless Gas Tube + 3-Prong Flash Hider
    var barrelBaseX = 0.19 + shroudLen * 0.52;
    var barrel = makeLathePart([
      [0.015, 0], [0.015, 0.14], [0.019, 0.148], [0.019, 0.185], [0.014, 0.192],
      [0.014, 0.28], [0.022, 0.29], [0.022, 0.345], [0.012, 0.35], [0.012, 0],
    ], 32, steelMat);
    barrel.rotation.z = -Math.PI / 2;
    barrel.position.set(barrelBaseX, 0.023, 0);
    root.add(barrel);

    // Gas Block & Stainless Tube
    var gasBlock = makeExtrudedPoly([
      [0.19 + shroudLen - 0.02, 0.01], [0.19 + shroudLen + 0.025, 0.01], [0.19 + shroudLen + 0.025, 0.048], [0.19 + shroudLen - 0.02, 0.048],
    ], 0.024, upperMetal, 0.002);
    root.add(gasBlock);
    var gasTube = makeTubePart([[0.18, 0.038, 0], [0.19 + shroudLen, 0.038, 0]], 0.0045, 8, weaponId === 'pulse' ? glowMat : steelMat, 10);
    root.add(gasTube);

    // 3-Prong Flash Hider Tips
    var flashX = barrelBaseX + 0.335;
    for (var pr = 0; pr < 3; pr++) {
      var ang = (pr * Math.PI * 2) / 3;
      var prong = makeTaperedTube([
        [flashX, 0.023 + Math.cos(ang) * 0.014, Math.sin(ang) * 0.014],
        [flashX + 0.045, 0.023 + Math.cos(ang) * 0.016, Math.sin(ang) * 0.016],
      ], 0.0045, 0.003, 6, upperMetal, 8);
      root.add(prong);
    }

    // 8. Angled Vertical Foregrip under M-LOK rail
    var foregrip = makeTaperedTube([[0.32, -0.015, 0], [0.305, -0.088, 0]], 0.016, 0.014, 8, polymerMat, 14);
    root.add(foregrip);

    // 9. Bolt Catch Paddle (left side -Z)
    var boltCatch = makeExtrudedPoly([[0.005, -0.005], [0.024, -0.005], [0.024, 0.022], [0.005, 0.022]], 0.006, steelMat, 0.0015);
    boltCatch.position.set(0, 0.008, -0.027);
    root.add(boltCatch);

    // 10. Adjustable SOPMOD Buttstock + Buffer Tube + Castle Nut
    var bufferTube = makeLathePart([[0.021, 0], [0.023, 0.03], [0.02, 0.035], [0.02, 0.24]], 24, upperMetal);
    bufferTube.rotation.z = Math.PI / 2;
    bufferTube.position.set(-0.2, 0.026, 0);
    root.add(bufferTube);

    var stock = makeExtrudedPoly([[-0.46, -0.086], [-0.22, -0.025], [-0.22, 0.052], [-0.46, 0.046]], 0.04, polymerMat, 0.007);
    root.add(stock);
    var buttPad = makeExtrudedPoly([[-0.475, -0.088], [-0.458, -0.088], [-0.458, 0.048], [-0.475, 0.048]], 0.044, lowerMetal, 0.004);
    root.add(buttPad);

    // 11. Ergonomic Pistol Grip + Curved Trigger Guard + Match Trigger
    var grip = makeExtrudedPoly([[-0.155, -0.158], [-0.09, -0.165], [-0.052, -0.032], [-0.122, -0.032]], 0.034, polymerMat, 0.006);
    root.add(grip);
    var trigGuard = makeTubePart([[-0.088, -0.036, 0], [-0.072, -0.075, 0], [-0.015, -0.07, 0], [0.008, -0.036, 0]], 0.0042, 12, lowerMetal, 10);
    root.add(trigGuard);
    var trigger = makeExtrudedPoly([[-0.048, -0.064], [-0.036, -0.064], [-0.03, -0.034], [-0.044, -0.034]], 0.007, steelMat, 0.001);
    root.add(trigger);

    // 12. Detachable Curved STANAG 30-Round Magazine (`magGroup` animates during reload!)
    var magGroup = new THREE.Group();
    var magPts = weaponId === 'shotgun'
      ? [[0.05, -0.125], [0.135, -0.115], [0.145, -0.03], [0.065, -0.03]]
      : [[0.065, -0.215], [0.138, -0.195], [0.158, -0.035], [0.085, -0.035]];
    magGroup.add(makeExtrudedPoly(magPts, 0.028, polymerMat, 0.004));
    // Stamped magazine ribs + baseplate
    for (var mr = 0; mr < 3; mr++) {
      var my = -0.075 - mr * 0.038;
      var rib = makeExtrudedPoly([[0.076 - mr * 0.004, my], [0.145 - mr * 0.004, my + 0.01], [0.145 - mr * 0.004, my + 0.02], [0.076 - mr * 0.004, my + 0.01]], 0.034, lowerMetal, 0.001);
      magGroup.add(rib);
    }
    var magFloor = makeExtrudedPoly([[0.06, -0.222], [0.142, -0.202], [0.145, -0.192], [0.062, -0.212]], 0.034, accentMat, 0.002);
    if (weaponId !== 'shotgun') magGroup.add(magFloor);
    root.add(magGroup);

    // 13. EOTech-Style Holographic Sight + Transparent Tinted Glass Lens + Crisp Glowing Red Dot
    var opticGroup = new THREE.Group();
    opticGroup.position.set(0.02, 0.072, 0);
    opticGroup.add(makeExtrudedPoly([[-0.064, -0.012], [0.064, -0.012], [0.058, 0.014], [-0.058, 0.014]], 0.044, upperMetal, 0.003));
    opticGroup.add(makeTubePart([
      [0, 0.01, -0.025], [0, 0.058, -0.02], [0, 0.07, 0], [0, 0.058, 0.02], [0, 0.01, 0.025],
    ], 0.0065, 18, lowerMetal, 12));

    var glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.28,
      roughness: 0.04,
      metalness: 0.08,
      clearcoat: 1.0,
      reflectivity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    var lens = new THREE.Mesh(new THREE.RingGeometry(0.001, 0.021, 24), glassMat);
    lens.rotation.y = Math.PI / 2;
    lens.position.set(0, 0.038, 0);
    opticGroup.add(lens);

    var reticleOuter = new THREE.Mesh(new THREE.RingGeometry(0.0055, 0.007, 20), glowMat);
    reticleOuter.rotation.y = Math.PI / 2;
    reticleOuter.position.set(0.002, 0.038, 0);
    opticGroup.add(reticleOuter);

    var reticleDot = new THREE.Mesh(new THREE.CircleGeometry(0.0018, 12), glowMat);
    reticleDot.rotation.y = Math.PI / 2;
    reticleDot.position.set(0.0025, 0.038, 0);
    opticGroup.add(reticleDot);
    root.add(opticGroup);

    // 14. Flip-Up Front Backup Sight
    var frontSight = makeExtrudedPoly([[0.15 + shroudLen, 0.054], [0.18 + shroudLen, 0.054], [0.175 + shroudLen, 0.088], [0.158 + shroudLen, 0.088]], 0.022, lowerMetal, 0.002);
    root.add(frontSight);

    root.rotation.y = Math.PI / 2;
    var muzzleAnchor = new THREE.Object3D();
    muzzleAnchor.position.set(flashX + 0.05, 0.023, 0);
    root.add(muzzleAnchor);

    var ejectionPort = new THREE.Object3D();
    ejectionPort.position.set(0.025, 0.034, 0.038);
    root.add(ejectionPort);

    return {
      group: root,
      muzzle: muzzleAnchor,
      ejectionPort: ejectionPort,
      boltCarrier: boltCarrier,
      magGroup: magGroup,
      reticle: reticleDot,
    };
  }

  // Brass 5.56mm Shell Casing (LatheGeometry, zero cylinders/boxes)
  function createShellCasingMesh() {
    var brassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe5b842,
      metalness: 0.94,
      roughness: 0.16,
      clearcoat: 0.6,
    });
    var casing = makeLathePart([
      [0.001, -0.022], [0.006, -0.022], [0.006, -0.018], [0.0052, 0.008],
      [0.0038, 0.014], [0.0038, 0.022], [0.0025, 0.022],
    ], 14, brassMat);
    casing.castShadow = false;
    return casing;
  }

  // Call of Duty: Mobile-Style Articulated First-Person Tactical Hands & Sleeves (ZERO Box/Cylinder Geometry)
  function createFirstPersonArms(uniformObj, patchTex, fabricTex, isLady, isMelee) {
    var arms = new THREE.Group();
    var s = isLady ? 0.84 : 1.0;

    var sleeveMat = new THREE.MeshPhysicalMaterial({
      map: fabricTex || null,
      color: fabricTex ? 0xffffff : (uniformObj ? uniformObj.body : 0x4b583c),
      roughness: 0.84,
      metalness: 0.04,
      sheen: 0.5,
      sheenRoughness: 0.65,
    });
    var cuffMat = new THREE.MeshStandardMaterial({
      color: uniformObj ? uniformObj.accent : 0x64748b,
      roughness: 0.6,
      metalness: 0.2,
    });
    var skinMat = new THREE.MeshStandardMaterial({
      color: isLady ? 0xe5ae8c : 0xd09672,
      roughness: 0.54,
      metalness: 0.02,
    });
    var gloveFabricMat = new THREE.MeshPhysicalMaterial({
      color: 0x161b22,
      roughness: 0.85,
      metalness: 0.08,
      sheen: 0.35,
    });
    var carbonKnuckleMat = new THREE.MeshPhysicalMaterial({
      color: 0x2a3342,
      metalness: 0.72,
      roughness: 0.24,
      clearcoat: 0.6,
    });

    // Helper: Articulated Finger with Gloved Proximal Phalanx + Realistic Skin-Tone Fingertip (Fingerless Glove)
    function addFinger(parent, basePt, midPt, tipPt, rBase) {
      parent.add(makeTaperedTube([basePt, midPt], rBase, rBase * 0.88, 6, gloveFabricMat, 10));
      parent.add(makeTaperedTube([midPt, tipPt], rBase * 0.86, rBase * 0.72, 6, skinMat, 10));
      var nailCap = new THREE.Mesh(new THREE.CapsuleGeometry(rBase * 0.68, 0.004, 4, 8), skinMat);
      nailCap.position.set(tipPt[0], tipPt[1], tipPt[2]);
      parent.add(nailCap);
    }

    // =========================================================================
    // LEFT SUPPORT ARM (grips M-LOK forend around (0, -0.015, -0.31), animates during reload!)
    // =========================================================================
    var leftArm = new THREE.Group();
    if (isMelee) {
      leftArm.position.set(-0.18, -0.14, 0.14);
      leftArm.rotation.set(0.35, 0.25, 0.25);
    }

    // Forearm sweeping down-left off-screen
    if (isLady) {
      // Lady Operative: Toned bare forearm + tactical wrist wrap + upper uniform strap
      leftArm.add(makeTaperedTube([
        [-0.44, -0.24, 0.42], [-0.25, -0.14, 0.12], [-0.11, -0.07, -0.12], [-0.032, -0.025, -0.255],
      ], 0.044 * s, 0.027 * s, 16, skinMat, 16));
      // Wrist tactical wrap
      for (var lw = 0; lw < 3; lw++) {
        var wrap = new THREE.Mesh(new THREE.TorusGeometry(0.029 * s, 0.0055, 8, 18), cuffMat);
        wrap.position.set(-0.072 + lw * 0.014, -0.048 + lw * 0.008, -0.185 - lw * 0.022);
        wrap.rotation.set(0.35, -0.45, 0);
        leftArm.add(wrap);
      }
    } else {
      // Male Soldier: High-detail camo sleeve extending off-screen + Velcro cuff + watch
      leftArm.add(makeTaperedTube([
        [-0.46, -0.25, 0.44], [-0.26, -0.15, 0.14], [-0.11, -0.072, -0.12],
      ], 0.054, 0.04, 16, sleeveMat, 18));
      var lCuff = new THREE.Mesh(new THREE.TorusGeometry(0.039, 0.008, 10, 20), cuffMat);
      lCuff.position.set(-0.11, -0.072, -0.12);
      lCuff.rotation.set(0.35, -0.45, 0);
      leftArm.add(lCuff);
      leftArm.add(makeTaperedTube([
        [-0.11, -0.072, -0.12], [-0.032, -0.026, -0.255],
      ], 0.033, 0.028, 8, skinMat, 14));
      var watchBand = new THREE.Mesh(new THREE.TorusGeometry(0.033, 0.006, 8, 18), gloveFabricMat);
      watchBand.position.set(-0.074, -0.052, -0.18);
      watchBand.rotation.set(0.35, -0.45, 0);
      leftArm.add(watchBand);
      var watchFace = new THREE.Mesh(new THREE.RingGeometry(0.001, 0.013, 16), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
      watchFace.position.set(-0.072, -0.025, -0.175);
      watchFace.rotation.set(-0.95, 0.25, 0);
      leftArm.add(watchFace);
    }

    // Stitched Country Flag Patch prominently visible on left forearm/sleeve
    var patchMat = new THREE.MeshStandardMaterial({ map: patchTex || null, color: 0xffffff, roughness: 0.6 });
    var patchMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.074, 0.048), patchMat);
    patchMesh.position.set(-0.19, -0.062, 0.04);
    patchMesh.rotation.set(-0.32, 0.65, 0.28);
    leftArm.add(patchMesh);

    // Left Gloved Hand gripping M-LOK handguard at (0, -0.012, -0.31)
    var leftPalm = new THREE.Mesh(new THREE.CapsuleGeometry(0.024 * s, 0.052 * s, 8, 14), gloveFabricMat);
    leftPalm.position.set(-0.022, -0.018, -0.3);
    leftPalm.rotation.set(Math.PI / 2 - 0.15, 0, -0.35);
    leftPalm.scale.set(0.75, 1.0, 1.15);
    leftArm.add(leftPalm);

    // Left Carbon-Fiber Knuckle Guard
    var lKnuckle = makeExtrudedPoly([[-0.008, -0.026], [0.008, -0.026], [0.01, 0.028], [-0.008, 0.028]], 0.014, carbonKnuckleMat, 0.003);
    lKnuckle.position.set(-0.038, -0.02, -0.305);
    lKnuckle.rotation.set(Math.PI / 2, 0, 0);
    leftArm.add(lKnuckle);

    // 4 Left Curled Fingers wrapping around bottom & right side of handguard (with skin-tone fingertips!)
    for (var lf = 0; lf < 4; lf++) {
      var zF = -0.268 - lf * 0.018;
      addFinger(
        leftArm,
        [-0.018, -0.032, zF],
        [0.024, -0.032, zF],
        [0.034, -0.004, zF],
        0.0082 * s
      );
    }
    // Left Thumb resting along upper-left M-LOK rail
    addFinger(
      leftArm,
      [-0.032, -0.002, -0.27],
      [-0.034, 0.022, -0.31],
      [-0.025, 0.028, -0.338],
      0.009 * s
    );

    arms.add(leftArm);

    // =========================================================================
    // RIGHT TRIGGER ARM (grips pistol grip at (0, -0.09, +0.11), finger on trigger at (0, -0.048, +0.038))
    // =========================================================================
    var rightArm = new THREE.Group();

    if (isLady) {
      rightArm.add(makeTaperedTube([
        [0.36, -0.26, 0.48], [0.18, -0.17, 0.29], [0.055, -0.108, 0.165],
      ], 0.042 * s, 0.027 * s, 14, skinMat, 16));
      for (var rw = 0; rw < 3; rw++) {
        var rWrap = new THREE.Mesh(new THREE.TorusGeometry(0.028 * s, 0.0055, 8, 18), cuffMat);
        rWrap.position.set(0.082 - rw * 0.014, -0.12 + rw * 0.007, 0.195 - rw * 0.016);
        rWrap.rotation.set(0.35, 0.55, 0);
        rightArm.add(rWrap);
      }
    } else {
      rightArm.add(makeTaperedTube([
        [0.38, -0.27, 0.49], [0.2, -0.18, 0.3], [0.085, -0.125, 0.195],
      ], 0.052, 0.038, 14, sleeveMat, 18));
      var rCuff = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.008, 10, 20), cuffMat);
      rCuff.position.set(0.085, -0.125, 0.195);
      rCuff.rotation.set(0.35, 0.55, 0);
      rightArm.add(rCuff);
      rightArm.add(makeTaperedTube([
        [0.085, -0.125, 0.195], [0.035, -0.095, 0.138],
      ], 0.032, 0.027, 8, skinMat, 14));
    }

    // Right Gloved Palm wrapping around pistol grip / knife handle
    var rPalmY = isMelee ? -0.015 : -0.092;
    var rPalmZ = isMelee ? 0.025 : 0.105;
    var rightPalm = new THREE.Mesh(new THREE.CapsuleGeometry(0.022 * s, 0.044 * s, 8, 14), gloveFabricMat);
    rightPalm.position.set(0.024, rPalmY, rPalmZ);
    rightPalm.rotation.set(0.28, 0, 0.15);
    rightPalm.scale.set(0.68, 1.0, 1.12);
    rightArm.add(rightPalm);

    // Right Carbon-Fiber Knuckle Guard
    var rKnuckle = makeExtrudedPoly([[-0.007, -0.022], [0.007, -0.022], [0.008, 0.022], [-0.007, 0.022]], 0.012, carbonKnuckleMat, 0.003);
    rKnuckle.position.set(0.038, rPalmY + 0.004, rPalmZ - 0.015);
    rKnuckle.rotation.set(0.25, 0, 0);
    rightArm.add(rKnuckle);

    if (isMelee) {
      for (var kf = 0; kf < 4; kf++) {
        var kz = 0.055 - kf * 0.018;
        addFinger(rightArm, [0.025, -0.012, kz], [0.006, -0.026, kz], [-0.016, -0.008, kz], 0.0078 * s);
      }
      addFinger(rightArm, [-0.015, 0.004, 0.045], [-0.02, 0.018, 0.025], [-0.01, 0.022, 0.01], 0.0085 * s);
    } else {
      // Trigger Finger reaching forward cleanly to trigger at (0, -0.048, +0.038)
      addFinger(
        rightArm,
        [0.03, -0.068, 0.088],
        [0.026, -0.052, 0.054],
        [0.005, -0.048, 0.038],
        0.0076 * s
      );
      // Lower 3 Grip Fingers curled around pistol grip
      for (var rf = 0; rf < 3; rf++) {
        var yG = -0.086 - rf * 0.016;
        var zG = 0.092 + rf * 0.009;
        addFinger(
          rightArm,
          [0.03, yG, zG],
          [0.004, yG - 0.002, zG - 0.018],
          [-0.018, yG, zG - 0.002],
          0.0076 * s
        );
      }
      // Right Thumb wrapping around left side of pistol grip backstrap
      addFinger(
        rightArm,
        [-0.012, -0.068, 0.125],
        [-0.024, -0.056, 0.095],
        [-0.018, -0.05, 0.072],
        0.0084 * s
      );
    }

    arms.add(rightArm);

    return {
      group: arms,
      leftArm: leftArm,
      rightArm: rightArm,
      sleeveMat: sleeveMat,
      patchMat: patchMat,
    };
  }

  // Animated Moving-Color Lighting Rig around Chest (attached to Male Soldier Spine2 bone)
  function createChestLightRig(accentHex) {
    var grp = new THREE.Group();
    var accent = accentHex ? new THREE.Color(accentHex).getHex() : 0x06b6d4;
    var armorMat = new THREE.MeshPhysicalMaterial({ color: 0x151a22, metalness: 0.8, roughness: 0.22, clearcoat: 0.7 });
    var chestMat = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: new THREE.Color(accent),
      emissiveIntensity: 2.0,
      roughness: 0.15,
    });

    var plate = makeExtrudedPoly([[-0.14, -0.1], [0.14, -0.1], [0.17, 0.08], [0, 0.12], [-0.17, 0.08]], 0.04, armorMat, 0.008);
    plate.position.set(0, 0, 0.11);
    grp.add(plate);

    var coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.013, 12, 24), chestMat);
    coreRing.position.set(0, 0.01, 0.145);
    grp.add(coreRing);

    grp.add(makeTubePart([[-0.15, 0.06, 0.12], [-0.06, 0.01, 0.145]], 0.011, 8, chestMat, 10));
    grp.add(makeTubePart([[0.15, 0.06, 0.12], [0.06, 0.01, 0.145]], 0.011, 8, chestMat, 10));
    grp.add(makeTubePart([[-0.13, -0.06, 0.12], [-0.05, -0.02, 0.145]], 0.011, 8, chestMat, 10));
    grp.add(makeTubePart([[0.13, -0.06, 0.12], [0.05, -0.02, 0.145]], 0.011, 8, chestMat, 10));
    grp.add(makeTubePart([[-0.11, 0.05, -0.11], [0, -0.02, -0.13], [0.11, 0.05, -0.11]], 0.012, 10, chestMat, 10));

    return { group: grp, chestMats: [chestMat] };
  }

  function createDroneMesh(accentHex) {
    var root = new THREE.Group();
    var accent = accentHex ? new THREE.Color(accentHex).getHex() : 0x38bdf8;
    var bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x1e293b, metalness: 0.82, roughness: 0.22, clearcoat: 0.6 });
    var accentMat = new THREE.MeshStandardMaterial({ color: accent, metalness: 0.55, roughness: 0.3 });
    var glowMat = new THREE.MeshBasicMaterial({ color: accent });

    var hull = makeExtrudedPoly([
      [-0.22, -0.05], [0.24, -0.05], [0.28, 0.04], [0.14, 0.09], [-0.18, 0.09], [-0.26, 0.02],
    ], 0.24, bodyMat);
    hull.rotation.y = Math.PI / 2;
    root.add(hull);

    var eye = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.015, 10, 20), glowMat);
    eye.position.set(0, 0.01, 0.24);
    root.add(eye);

    var rotors = [];
    var corners = [[-0.36, -0.32], [0.36, -0.32], [-0.36, 0.32], [0.36, 0.32]];
    for (var i = 0; i < corners.length; i++) {
      var cx = corners[i][0], cz = corners[i][1];
      root.add(makeTubePart([[0, 0.02, 0], [cx, 0.06, cz]], 0.024, 8, accentMat, 10));
      var shroud = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.016, 10, 20), bodyMat);
      shroud.rotation.x = Math.PI / 2;
      shroud.position.set(cx, 0.07, cz);
      root.add(shroud);
      var blade = makeExtrudedPoly([[-0.13, -0.015], [0.13, -0.015], [0.13, 0.015], [-0.13, 0.015]], 0.006, glowMat, false);
      blade.rotation.x = Math.PI / 2;
      blade.position.set(cx, 0.075, cz);
      root.add(blade);
      rotors.push(blade);
    }
    return { group: root, rotors: rotors };
  }

  function createGrenadeMesh() {
    var bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x3f4d36, metalness: 0.55, roughness: 0.35, clearcoat: 0.3 });
    var pinMat = new THREE.MeshStandardMaterial({ color: 0xe5b842, metalness: 0.85, roughness: 0.2 });
    var g = makeLathePart([
      [0.001, -0.14], [0.09, -0.11], [0.125, 0], [0.09, 0.11], [0.045, 0.15], [0.055, 0.19], [0.001, 0.19],
    ], 18, bodyMat);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 8, 16), pinMat);
    ring.position.set(0.05, 0.16, 0);
    g.add(ring);
    return g;
  }

  window.GameWeapons = {
    WEAPONS: WEAPONS,
    TACTICAL_ITEMS: TACTICAL_ITEMS,
    createTacticalWeaponMesh: createTacticalWeaponMesh,
    createCombatKnifeMesh: createCombatKnifeMesh,
    createShellCasingMesh: createShellCasingMesh,
    createFirstPersonArms: createFirstPersonArms,
    createChestLightRig: createChestLightRig,
    createDroneMesh: createDroneMesh,
    createGrenadeMesh: createGrenadeMesh,
  };
})();
