(function () {
  'use strict';

  var cachedFaceTex = null;

  function createFemaleFaceTexture(renderer) {
    if (cachedFaceTex) return cachedFaceTex;
    var c = document.createElement('canvas');
    c.width = 1024;
    c.height = 1024;
    var ctx = c.getContext('2d');

    // Warm skin base gradient
    var skinGrad = ctx.createRadialGradient(512, 490, 90, 512, 512, 520);
    skinGrad.addColorStop(0, '#f7cbb0');
    skinGrad.addColorStop(0.55, '#eab594');
    skinGrad.addColorStop(1, '#c88d6b');
    ctx.fillStyle = skinGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Subtle forehead & jawline contour shading
    ctx.fillStyle = 'rgba(156, 92, 62, 0.22)';
    ctx.beginPath();
    ctx.ellipse(340, 595, 65, 95, 0.3, 0, Math.PI * 2);
    ctx.ellipse(684, 595, 65, 95, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Rosy cheekbone blush
    var blushL = ctx.createRadialGradient(385, 555, 8, 385, 555, 72);
    blushL.addColorStop(0, 'rgba(232, 106, 118, 0.34)');
    blushL.addColorStop(1, 'rgba(232, 106, 118, 0)');
    ctx.fillStyle = blushL;
    ctx.fillRect(300, 470, 170, 170);

    var blushR = ctx.createRadialGradient(639, 555, 8, 639, 555, 72);
    blushR.addColorStop(0, 'rgba(232, 106, 118, 0.34)');
    blushR.addColorStop(1, 'rgba(232, 106, 118, 0)');
    ctx.fillStyle = blushR;
    ctx.fillRect(554, 470, 170, 170);

    // Arched Expressive Eyebrows
    ctx.strokeStyle = '#241712';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(355, 425);
    ctx.quadraticCurveTo(415, 392, 468, 418);
    ctx.moveTo(669, 425);
    ctx.quadraticCurveTo(609, 392, 556, 418);
    ctx.stroke();

    // Expressive Eyes + Eyelashes + Iris Highlights
    function drawEye(cx, cy, flip) {
      ctx.save();
      // Sclera
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(cx - 46, cy);
      ctx.quadraticCurveTo(cx, cy - 30, cx + 46, cy);
      ctx.quadraticCurveTo(cx, cy + 24, cx - 46, cy);
      ctx.closePath();
      ctx.fill();

      // Iris
      var irisG = ctx.createRadialGradient(cx, cy, 4, cx, cy, 24);
      irisG.addColorStop(0, '#1e293b');
      irisG.addColorStop(0.45, '#4c2c1b');
      irisG.addColorStop(1, '#26140c');
      ctx.fillStyle = irisG;
      ctx.beginPath();
      ctx.arc(cx, cy, 23, 0, Math.PI * 2);
      ctx.fill();

      // Pupil & crisp white specular highlights
      ctx.fillStyle = '#090d14';
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 7, cy - 7, 5, 0, Math.PI * 2);
      ctx.arc(cx + 6, cy + 5, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Upper Eyelid & winged eyelashes
      ctx.strokeStyle = '#111115';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(cx - 48, cy + 2);
      ctx.quadraticCurveTo(cx, cy - 32, cx + 48, cy + 2);
      ctx.stroke();
      for (var l = 0; l < 5; l++) {
        var lx = cx + (flip ? -1 : 1) * (16 + l * 7);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(lx, cy - 14 + l * 2);
        ctx.lineTo(lx + (flip ? -10 : 10), cy - 26 + l * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    drawEye(416, 468, true);
    drawEye(608, 468, false);

    // Subtle Nose Bridge & Tip Highlight
    ctx.strokeStyle = 'rgba(170, 108, 76, 0.38)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(500, 470);
    ctx.quadraticCurveTo(494, 540, 498, 565);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 235, 220, 0.45)';
    ctx.beginPath();
    ctx.ellipse(512, 558, 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Defined Sculpted Lips + Gloss Highlight
    ctx.fillStyle = '#c4515c';
    ctx.beginPath();
    ctx.moveTo(456, 646);
    ctx.quadraticCurveTo(492, 626, 512, 636);
    ctx.quadraticCurveTo(532, 626, 568, 646);
    ctx.quadraticCurveTo(512, 678, 456, 646);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 220, 225, 0.45)';
    ctx.beginPath();
    ctx.ellipse(512, 654, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    var tex = new THREE.CanvasTexture(c);
    if (window.GameAssets && window.GameAssets.setSRGB) {
      window.GameAssets.setSRGB(renderer, tex);
    }
    cachedFaceTex = tex;
    return tex;
  }

  function makeSmoothLathe(profile, segs, mat) {
    var pts = profile.map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    var geo = new THREE.LatheGeometry(pts, segs || 36);
    geo.computeVertexNormals();
    var m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function makeCurvedTube(points, radius, mat, segs, radSegs) {
    var curve = new THREE.CatmullRomCurve3(points.map(function (p) {
      return new THREE.Vector3(p[0], p[1], p[2]);
    }));
    var geo = new THREE.TubeGeometry(curve, segs || 18, radius, radSegs || 16, false);
    geo.computeVertexNormals();
    var m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    return m;
  }

  function makeBevelPoly(pts, depth, mat, bevel) {
    var shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
    shape.closePath();
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: depth,
      curveSegments: 16,
      bevelEnabled: true,
      bevelThickness: bevel || 0.006,
      bevelSize: bevel || 0.006,
      bevelSegments: 4,
    });
    geo.translate(0, 0, -depth * 0.5);
    geo.computeVertexNormals();
    var m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    return m;
  }

  function createFemaleOperativeRig(opts) {
    var renderer = opts.renderer;
    var uObj = opts.uniformObj || window.GameAssets.UNIFORMS[0];
    var fabricTex = opts.fabricTex || window.GameAssets.makeUniformFabricTexture(renderer, uObj);
    var patchTex = opts.patchTex || window.GameAssets.makeCountryPatchTexture(renderer, opts.country || 'PH');
    var accentHex = opts.accentHex || '#e5b842';

    var root = new THREE.Group();
    var hips = new THREE.Group();
    hips.position.set(0, 0.92, 0);
    root.add(hips);

    // Multi-tone PBR Materials (matte pants fabric, dark crop-top, leather boots, metallic hardware, skin)
    var pantsMat = new THREE.MeshStandardMaterial({
      map: fabricTex,
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.06,
    });
    var vestMat = new THREE.MeshStandardMaterial({
      color: 0x171c24,
      roughness: 0.68,
      metalness: 0.16,
    });
    var trimMat = new THREE.MeshStandardMaterial({
      color: uObj.accent || 0x94a3b8,
      roughness: 0.42,
      metalness: 0.45,
    });
    var metalMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.88,
      roughness: 0.22,
    });
    var leatherMat = new THREE.MeshPhysicalMaterial({
      color: 0x141619,
      roughness: 0.38,
      metalness: 0.15,
      clearcoat: 0.35,
    });
    var skinMat = new THREE.MeshStandardMaterial({
      color: 0xe6b190,
      roughness: 0.54,
      metalness: 0.02,
    });
    var hairMat = new THREE.MeshPhysicalMaterial({
      color: 0x181312,
      roughness: 0.28,
      metalness: 0.12,
      clearcoat: 0.68,
    });
    var glowMat = new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: new THREE.Color(accentHex),
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });

    // 1. High-Waisted Athletic Pelvis / Hips (36-segment smooth LatheGeometry)
    var pelvis = makeSmoothLathe([
      [0.01, -0.14], [0.145, -0.09], [0.168, -0.01], [0.152, 0.07], [0.124, 0.14], [0.01, 0.14],
    ], 36, pantsMat);
    pelvis.scale.set(1.06, 1.0, 0.82);
    hips.add(pelvis);

    // Utility Belt + Metallic Buckle + Tactical Pouches
    var belt = new THREE.Mesh(new THREE.TorusGeometry(0.132, 0.019, 14, 36), leatherMat);
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(1.04, 0.84, 1);
    belt.position.y = 0.095;
    hips.add(belt);

    var buckle = makeBevelPoly([[-0.032, -0.022], [0.032, -0.022], [0.032, 0.022], [-0.032, 0.022]], 0.018, metalMat, 0.004);
    buckle.position.set(0, 0.095, 0.122);
    hips.add(buckle);

    [-0.135, 0.135].forEach(function (px) {
      var pouch = makeBevelPoly([[-0.028, -0.038], [0.028, -0.038], [0.03, 0.038], [-0.03, 0.038]], 0.042, vestMat, 0.006);
      pouch.position.set(px, 0.078, 0.03);
      pouch.rotation.y = px < 0 ? -Math.PI / 2 : Math.PI / 2;
      hips.add(pouch);
    });

    // 2. Torso: Visible Toned Midriff + Fitted Sleeveless Dark Crop-Top Vest + Metallic Zipper
    var torso = new THREE.Group();
    torso.position.set(0, 0.14, 0);
    hips.add(torso);

    var midriff = makeSmoothLathe([
      [0.01, 0], [0.122, 0.01], [0.114, 0.09], [0.122, 0.17], [0.01, 0.18],
    ], 36, skinMat);
    midriff.scale.set(1.02, 1.0, 0.78);
    torso.add(midriff);

    // Crop-Top Tactical Vest (above midriff, contoured athletic chest & shoulders)
    var cropTop = makeSmoothLathe([
      [0.01, 0.155], [0.128, 0.16], [0.158, 0.25], [0.168, 0.32], [0.148, 0.4], [0.065, 0.44], [0.01, 0.44],
    ], 36, vestMat);
    cropTop.scale.set(1.05, 1.0, 0.84);
    torso.add(cropTop);

    // Metallic Center Zipper + Pull Tab on Crop-Top
    var zipper = makeCurvedTube([[0, 0.165, 0.115], [0, 0.27, 0.146], [0, 0.39, 0.12]], 0.008, metalMat, 14, 12);
    torso.add(zipper);
    var zipTab = makeBevelPoly([[-0.01, -0.018], [0.01, -0.018], [0.008, 0.012], [-0.008, 0.012]], 0.01, metalMat, 0.002);
    zipTab.position.set(0, 0.38, 0.13);
    torso.add(zipTab);

    // Glowing Chest Tactical Conduit around Crop-Top
    var chestArc = makeCurvedTube([[-0.11, 0.31, 0.11], [0, 0.27, 0.152], [0.11, 0.31, 0.11]], 0.009, glowMat, 16, 12);
    torso.add(chestArc);

    // Sleeveless Shoulder Straps
    [-1, 1].forEach(function (side) {
      var strap = makeCurvedTube([
        [side * 0.095, 0.36, 0.11], [side * 0.11, 0.445, 0.02], [side * 0.095, 0.35, -0.105],
      ], 0.022, trimMat, 12, 12);
      torso.add(strap);
    });

    // Country Flag Patch on Chest Vest
    var chestPatch = new THREE.Mesh(
      new THREE.PlaneGeometry(0.075, 0.05),
      new THREE.MeshStandardMaterial({ map: patchTex, roughness: 0.6 })
    );
    chestPatch.position.set(-0.082, 0.32, 0.138);
    chestPatch.rotation.y = -0.35;
    torso.add(chestPatch);

    // 3. Neck, Sculpted Anatomical Head, 1024x1024 Face Texture & Flowing Hair (NO Helmet!)
    var headGroup = new THREE.Group();
    headGroup.position.set(0, 0.46, 0);
    torso.add(headGroup);

    var neck = makeSmoothLathe([[0.045, -0.02], [0.041, 0.045], [0.046, 0.095]], 32, skinMat);
    headGroup.add(neck);

    // Anatomical Head with smooth cheekbones, chin, jawline
    var faceMat = new THREE.MeshStandardMaterial({
      map: createFemaleFaceTexture(renderer),
      roughness: 0.48,
      metalness: 0.02,
    });
    var headMesh = makeSmoothLathe([
      [0.001, 0.04], [0.048, 0.055], [0.082, 0.105], [0.096, 0.165],
      [0.095, 0.225], [0.075, 0.275], [0.001, 0.295],
    ], 36, faceMat);
    headMesh.scale.set(0.95, 1.0, 1.08);
    // Rotate Lathe so UV seam (u=0/1) is at the BACK (-Z) and center of face texture (u=0.5) faces FRONT (+Z)!
    headMesh.rotation.y = -Math.PI / 2;
    headGroup.add(headMesh);

    // Sculpted Nose Bridge & Lips contour overlay
    var nose = makeCurvedTube([[0, 0.195, 0.095], [0, 0.155, 0.115], [0, 0.145, 0.102]], 0.011, skinMat, 8, 12);
    headGroup.add(nose);

    // Hair Crown Cap + Swept Front Bangs + Dynamic Flowing High Ponytail
    var hairCap = makeSmoothLathe([
      [0.094, 0.18], [0.103, 0.225], [0.096, 0.272], [0.058, 0.305], [0.001, 0.312],
    ], 32, hairMat);
    hairCap.scale.set(0.98, 1.0, 1.1);
    headGroup.add(hairCap);

    // Swept Bangs
    var bangsGroup = new THREE.Group();
    headGroup.add(bangsGroup);
    bangsGroup.add(makeCurvedTube([[0.02, 0.285, 0.06], [-0.04, 0.255, 0.105], [-0.095, 0.17, 0.075]], 0.022, hairMat, 14, 12));
    bangsGroup.add(makeCurvedTube([[-0.01, 0.285, 0.065], [0.055, 0.245, 0.102], [0.098, 0.175, 0.07]], 0.019, hairMat, 14, 12));

    // High Tactical Ponytail Anchor (sways dynamically with movement/turning!)
    var ponytailPivot = new THREE.Group();
    ponytailPivot.position.set(0, 0.245, -0.095);
    headGroup.add(ponytailPivot);

    var hairBand = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.009, 10, 20), trimMat);
    ponytailPivot.add(hairBand);

    var strandOffsets = [
      [[0, 0, 0], [0, -0.04, -0.09], [0, -0.18, -0.14], [0, -0.34, -0.12]],
      [[-0.015, 0, 0], [-0.045, -0.05, -0.08], [-0.065, -0.19, -0.12], [-0.05, -0.32, -0.1]],
      [[0.015, 0, 0], [0.045, -0.05, -0.08], [0.065, -0.19, -0.12], [0.05, -0.32, -0.1]],
    ];
    strandOffsets.forEach(function (pts, idx) {
      ponytailPivot.add(makeCurvedTube(pts, idx === 0 ? 0.028 : 0.02, hairMat, 16, 12));
    });

    // 4. Arms + Fingerless Combat Gloves + Weapon Mount
    function buildArm(side) {
      var shoulder = new THREE.Group();
      shoulder.position.set(side * 0.175, 0.37, 0);
      torso.add(shoulder);

      var upperArm = makeSmoothLathe([
        [0.001, 0.02], [0.044, 0], [0.042, -0.12], [0.036, -0.24], [0.001, -0.25],
      ], 28, skinMat);
      shoulder.add(upperArm);

      var elbow = new THREE.Group();
      elbow.position.set(0, -0.24, 0);
      shoulder.add(elbow);

      var foreArm = makeSmoothLathe([
        [0.001, 0.01], [0.036, 0], [0.032, -0.11], [0.025, -0.21], [0.001, -0.22],
      ], 28, skinMat);
      elbow.add(foreArm);

      // Fingerless Combat Glove + Wrist Wrap
      var wristWrap = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.008, 10, 20), trimMat);
      wristWrap.rotation.x = Math.PI / 2;
      wristWrap.position.y = -0.19;
      elbow.add(wristWrap);

      var handGrp = new THREE.Group();
      handGrp.position.set(0, -0.23, 0);
      elbow.add(handGrp);

      var palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.036, 8, 16), leatherMat);
      palm.scale.set(0.95, 1.0, 0.65);
      handGrp.add(palm);

      // Exposed skin-tone fingertips
      for (var f = -1.5; f <= 1.5; f += 1) {
        var finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.022, 6, 10), skinMat);
        finger.position.set(f * 0.011, -0.036, 0.006);
        handGrp.add(finger);
      }

      return { shoulder: shoulder, elbow: elbow, hand: handGrp };
    }
    var leftArm = buildArm(-1);
    var rightArm = buildArm(1);

    // Attach her weapon cleanly to her right hand
    var wep = window.GameWeapons.createTacticalWeaponMesh(opts.weaponId || 'rifle', accentHex);
    wep.group.rotation.set(0, 0, 0);
    wep.group.position.set(0, -0.02, 0.15);
    rightArm.hand.add(wep.group);

    // 5. Legs + Drop-Leg Tactical Holster + Lace-Up Combat Boots
    function buildLeg(side) {
      var hipJoint = new THREE.Group();
      hipJoint.position.set(side * 0.095, -0.05, 0);
      hips.add(hipJoint);

      // Form-fitting tactical thigh
      var thigh = makeSmoothLathe([
        [0.001, 0.04], [0.088, 0], [0.082, -0.16], [0.064, -0.34], [0.056, -0.41], [0.001, -0.42],
      ], 32, pantsMat);
      hipJoint.add(thigh);

      // Drop-leg tactical holster with dual straps on right thigh
      if (side > 0) {
        for (var s = 0; s < 2; s++) {
          var strap = new THREE.Mesh(new THREE.TorusGeometry(0.079 - s * 0.008, 0.008, 10, 28), leatherMat);
          strap.rotation.x = Math.PI / 2;
          strap.position.y = -0.14 - s * 0.08;
          hipJoint.add(strap);
        }
        var holster = makeBevelPoly([[-0.035, -0.08], [0.035, -0.08], [0.042, 0.06], [-0.028, 0.06]], 0.036, leatherMat, 0.006);
        holster.position.set(0.086, -0.18, 0.01);
        holster.rotation.y = Math.PI / 2;
        hipJoint.add(holster);
      }

      var kneeJoint = new THREE.Group();
      kneeJoint.position.set(0, -0.41, 0);
      hipJoint.add(kneeJoint);

      // Calf
      var calf = makeSmoothLathe([
        [0.001, 0.02], [0.056, 0], [0.062, -0.11], [0.048, -0.24], [0.042, -0.3], [0.001, -0.31],
      ], 32, pantsMat);
      kneeJoint.add(calf);

      // Lace-up Tactical Combat Boot (sculpted leather shaft + contoured sole + criss-cross laces)
      var bootShaft = makeSmoothLathe([
        [0.001, -0.3], [0.047, -0.29], [0.046, -0.38], [0.052, -0.44], [0.001, -0.45],
      ], 32, leatherMat);
      kneeJoint.add(bootShaft);

      var bootSole = makeBevelPoly([[-0.048, -0.022], [0.052, -0.022], [0.056, 0.015], [-0.048, 0.018]], 0.19, vestMat, 0.008);
      bootSole.rotation.y = Math.PI / 2;
      bootSole.position.set(0, -0.45, 0.042);
      kneeJoint.add(bootSole);

      for (var lc = 0; lc < 3; lc++) {
        var ly = -0.33 - lc * 0.035;
        kneeJoint.add(makeCurvedTube([[-0.025, ly, 0.042], [0.025, ly - 0.018, 0.05]], 0.0035, trimMat, 6, 8));
        kneeJoint.add(makeCurvedTube([[0.025, ly, 0.042], [-0.025, ly - 0.018, 0.05]], 0.0035, trimMat, 6, 8));
      }

      return { hip: hipJoint, knee: kneeJoint };
    }
    var leftLeg = buildLeg(-1);
    var rightLeg = buildLeg(1);

    // Tactical Rifle Ready Posture
    rightArm.shoulder.rotation.set(-0.85, 0, -0.15);
    rightArm.elbow.rotation.set(-0.75, 0, 0);
    leftArm.shoulder.rotation.set(-0.95, 0.35, 0.25);
    leftArm.elbow.rotation.set(-0.85, 0, 0);

    var currentAnim = 'idle';
    var animTime = 0;
    var hairVel = 0;
    var lastYaw = 0;

    function setAnim(name) {
      currentAnim = name || 'idle';
    }

    function update(dt) {
      animTime += dt;
      var t = animTime;
      var isRun = currentAnim === 'run';
      var isWalk = currentAnim === 'walk';
      var isCover = currentAnim === 'cover';
      var spd = isRun ? 11 : isWalk ? 6.5 : 2.2;
      var amp = isRun ? 0.65 : isWalk ? 0.38 : 0.025;

      // Hip & breathing motion
      hips.position.y = (isCover ? 0.66 : 0.92) + Math.abs(Math.sin(t * spd)) * (isRun ? 0.055 : 0.01);
      torso.rotation.x = isRun ? 0.14 : isCover ? 0.28 : Math.sin(t * 2.2) * 0.02;

      // Legs stride
      leftLeg.hip.rotation.x = Math.sin(t * spd) * amp;
      rightLeg.hip.rotation.x = -Math.sin(t * spd) * amp;
      leftLeg.knee.rotation.x = Math.max(0, -Math.cos(t * spd) * amp * 1.15);
      rightLeg.knee.rotation.x = Math.max(0, Math.cos(t * spd) * amp * 1.15);

      // Arms combat sway
      rightArm.shoulder.rotation.x = -0.85 + Math.cos(t * spd) * amp * 0.22;
      leftArm.shoulder.rotation.x = -0.95 - Math.cos(t * spd) * amp * 0.22;

      // Flowing Hair Dynamics (ponytail & bangs bounce and whip on turns/sprints)
      var dYaw = root.rotation.y - lastYaw;
      lastYaw = root.rotation.y;
      hairVel = hairVel * 0.85 + dYaw * 2.5;
      ponytailPivot.rotation.x = (isRun ? -0.35 : -0.08) + Math.sin(t * spd * 1.5) * (isRun ? 0.22 : 0.04);
      ponytailPivot.rotation.z = Math.max(-0.55, Math.min(0.55, hairVel + Math.cos(t * spd) * (isRun ? 0.14 : 0.02)));
      bangsGroup.rotation.z = Math.sin(t * spd) * (isRun ? 0.05 : 0.01);
    }

    return {
      root: root,
      chestMats: [glowMat],
      setAnim: setAnim,
      update: update,
    };
  }

  window.GameFemale = {
    createFemaleOperativeRig: createFemaleOperativeRig,
  };
})();
