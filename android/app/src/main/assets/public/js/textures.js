(function () {
  'use strict';

  var COUNTRIES = [
    { code: 'PH', name: 'Philippines', army: 'AFP Scout Rangers', names: ['Sgt. Reyes', 'Cpl. Santos', 'Lt. Mendoza', 'Pvt. Dela Cruz', 'Capt. Bautista'], colors: ['#0038a8', '#ce1126', '#fcd116', '#ffffff'] },
    { code: 'US', name: 'United States', army: 'US Army Rangers', names: ['Sgt. Vance', 'Cpl. Miller', 'Lt. Mercer', 'Pvt. Brooks', 'Maj. Hayes'], colors: ['#b22234', '#ffffff', '#3c3b6e', '#ffffff'] },
    { code: 'JP', name: 'Japan', army: 'JGSDF Airborne', names: ['Sgt. Tanaka', 'Cpl. Sato', 'Lt. Takahashi', 'Pvt. Kobayashi', 'Capt. Ito'], colors: ['#ffffff', '#bc002d', '#ffffff', '#bc002d'] },
    { code: 'KR', name: 'South Korea', army: 'ROK 707th Spec', names: ['Sgt. Park', 'Cpl. Kim', 'Lt. Kang', 'Pvt. Yoon', 'Capt. Choi'], colors: ['#ffffff', '#cd2e3a', '#0047a0', '#111111'] },
    { code: 'GB', name: 'United Kingdom', army: 'British SAS', names: ['Sgt. Clarke', 'Cpl. Price', 'Lt. Bennett', 'Pvt. Ward', 'Maj. Foster'], colors: ['#012169', '#c8102e', '#ffffff', '#c8102e'] },
    { code: 'DE', name: 'Germany', army: 'Bundeswehr KSK', names: ['Sgt. Weber', 'Cpl. Becker', 'Lt. Richter', 'Pvt. Braun', 'Maj. Hoffmann'], colors: ['#111111', '#dd0000', '#ffce00', '#111111'] },
    { code: 'BR', name: 'Brazil', army: 'BOPE Tactical', names: ['Sgt. Silva', 'Cpl. Costa', 'Lt. Almeida', 'Pvt. Rocha', 'Capt. Ribeiro'], colors: ['#009c3b', '#ffdf00', '#002776', '#ffffff'] },
    { code: 'CA', name: 'Canada', army: 'JTF2 Commandos', names: ['Sgt. Moreau', 'Cpl. Gagnon', 'Lt. Tremblay', 'Pvt. Roy', 'Maj. Fraser'], colors: ['#ff0000', '#ffffff', '#ff0000', '#ffffff'] },
  ];

  var UNIFORMS = [
    { id: 'multicam', name: 'Multicam Woodland', body: 0x4b583c, accent: 0x74694f, pattern: 'camo' },
    { id: 'desert', name: 'Desert Storm Tan', body: 0xb69766, accent: 0x755e3c, pattern: 'camo' },
    { id: 'midnight', name: 'Midnight Spec-Ops', body: 0x1b222c, accent: 0x384354, pattern: 'hex' },
    { id: 'arctic', name: 'Arctic Frost White', body: 0xd8e1eb, accent: 0x64748b, pattern: 'camo' },
    { id: 'crimson', name: 'Crimson Strike Red', body: 0x8b1e24, accent: 0x28191e, pattern: 'stripe' },
    { id: 'cobalt', name: 'Cobalt Navy Ops', body: 0x1e3a8a, accent: 0x3b82f6, pattern: 'hex' },
    { id: 'emerald', name: 'Emerald Jungle', body: 0x065f46, accent: 0x10b981, pattern: 'camo' },
    { id: 'amber', name: 'Solar Amber Gold', body: 0xb45309, accent: 0xf59e0b, pattern: 'stripe' },
    { id: 'violet', name: 'Nebula Violet', body: 0x581c87, accent: 0xa855f7, pattern: 'hex' },
    { id: 'teal', name: 'Abyssal Teal', body: 0x115e59, accent: 0x2dd4bf, pattern: 'camo' },
    { id: 'copper', name: 'Rust Copper Armor', body: 0x9a3412, accent: 0xfb923c, pattern: 'stripe' },
    { id: 'slate', name: 'Titanium Slate', body: 0x475569, accent: 0x94a3b8, pattern: 'hex' },
    { id: 'moss', name: 'Highland Moss', body: 0x3f6212, accent: 0x84cc16, pattern: 'camo' },
    { id: 'magenta', name: 'Plasma Magenta', body: 0x831843, accent: 0xf43f5e, pattern: 'stripe' },
    { id: 'cyan', name: 'Glacier Cyan', body: 0x155e75, accent: 0x06b6d4, pattern: 'hex' },
    { id: 'ochre', name: 'Canyon Ochre', body: 0x92400e, accent: 0xd97706, pattern: 'camo' },
    { id: 'plum', name: 'Shadow Plum', body: 0x4a044e, accent: 0xd946ef, pattern: 'hex' },
    { id: 'olive', name: 'Ranger Olive', body: 0x365314, accent: 0x65a30d, pattern: 'camo' },
  ];

  var ALIEN_HELMETS = [
    { id: 0, name: 'Xenomorph Bio-Visor', desc: 'Elongated crest + pulsing eye array + glowing chest core' },
    { id: 1, name: 'Predator Mandible', desc: 'Tri-laser eyes + articulated glowing jaw mandibles' },
    { id: 2, name: 'Cyber-Kraken Dome', desc: 'Smooth alien cephalon + sweeping plasma breather' },
    { id: 3, name: 'Viper Mantis Helm', desc: 'Insectoid visor + dual moving iris & fang glow' },
    { id: 4, name: 'Void Sentinel Crown', desc: 'Horned alien crown + cyclops slit & chest arc' },
  ];

  var THEME_COLORS = [
    { name: 'Gold Ops', hex: '#e5b842', num: 0xe5b842 },
    { name: 'Cyber Cyan', hex: '#06b6d4', num: 0x06b6d4 },
    { name: 'Crimson Viper', hex: '#ef4444', num: 0xef4444 },
    { name: 'Toxic Lime', hex: '#84cc16', num: 0x84cc16 },
    { name: 'Royal Violet', hex: '#a855f7', num: 0xa855f7 },
  ];

  var TERRAINS = [
    {
      id: 0,
      name: 'Dust Compound',
      desc: 'Sandstone walls, terracotta red blocks & concrete ramps',
      skyTop: '#3b82f6',
      skyMid: '#93c5fd',
      skyBot: '#f3d9b1',
      fogColor: 0xdac9b0,
      groundMode: 'sand',
      wallMode: 'redblock',
      crateMode: 'wood',
      containerColors: ['#d97706', '#dc2626', '#2563eb'],
    },
    {
      id: 1,
      name: 'Metro Tile Plaza',
      desc: 'Glossy colorful ceramic tiles, marble walkways & glass steel',
      skyTop: '#0284c7',
      skyMid: '#7dd3fc',
      skyBot: '#e0f2fe',
      fogColor: 0xcbe6f5,
      groundMode: 'tiles',
      wallMode: 'concrete',
      crateMode: 'metal',
      containerColors: ['#0ea5e9', '#10b981', '#f59e0b'],
    },
    {
      id: 2,
      name: 'Crimson Brick Yard',
      desc: 'Vibrant red blocks, iron girders & sunset industrial fort',
      skyTop: '#4c1d95',
      skyMid: '#ea580c',
      skyBot: '#fde68a',
      fogColor: 0xd99b72,
      groundMode: 'concrete',
      wallMode: 'redblock',
      crateMode: 'wood',
      containerColors: ['#b91c1c', '#f59e0b', '#0f766e'],
    },
    {
      id: 3,
      name: 'Titanium Metal Deck',
      desc: 'Diamond-plate metal surfaces, hazard stripes & neon bays',
      skyTop: '#1e293b',
      skyMid: '#475569',
      skyBot: '#94a3b8',
      fogColor: 0x64748b,
      groundMode: 'metal',
      wallMode: 'metal',
      crateMode: 'metal',
      containerColors: ['#eab308', '#06b6d4', '#ef4444'],
    },
    {
      id: 4,
      name: 'Concrete Fortress',
      desc: 'Textured poured concrete, emerald moss tiles & bright bunkers',
      skyTop: '#0369a1',
      skyMid: '#bae6fd',
      skyBot: '#bbf7d0',
      fogColor: 0xc5dcd4,
      groundMode: 'concrete',
      wallMode: 'concrete',
      crateMode: 'wood',
      containerColors: ['#16a34a', '#ea580c', '#3b82f6'],
    },
  ];

  function setSRGB(renderer, tex) {
    if ('SRGBColorSpace' in THREE) tex.colorSpace = THREE.SRGBColorSpace;
    else if ('sRGBEncoding' in THREE) tex.encoding = THREE.sRGBEncoding;
    if (renderer && renderer.capabilities && renderer.capabilities.getMaxAnisotropy) {
      tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    }
    tex.needsUpdate = true;
    return tex;
  }

  // High-detail procedural ripstop camo/tactical weave texture for uniform sleeves & armor
  function makeUniformFabricTexture(renderer, uniformObj) {
    var u = uniformObj || UNIFORMS[0];
    var c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    var ctx = c.getContext('2d');
    var baseCol = '#' + new THREE.Color(u.body).getHexString();
    var accCol = '#' + new THREE.Color(u.accent).getHexString();
    ctx.fillStyle = baseCol;
    ctx.fillRect(0, 0, 256, 256);

    if (u.pattern === 'camo') {
      for (var i = 0; i < 42; i++) {
        ctx.fillStyle = i % 2 === 0 ? accCol : 'rgba(15, 23, 42, 0.28)';
        ctx.beginPath();
        ctx.ellipse(Math.random() * 256, Math.random() * 256, 14 + Math.random() * 26, 8 + Math.random() * 18, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (u.pattern === 'hex') {
      ctx.strokeStyle = accCol;
      ctx.lineWidth = 2;
      for (var y = 0; y < 256; y += 22) {
        for (var x = 0; x < 256; x += 24) {
          ctx.strokeRect(x + ((y / 22) % 2) * 12, y, 16, 16);
        }
      }
    } else {
      ctx.fillStyle = accCol;
      for (var s = -256; s < 512; s += 32) {
        ctx.beginPath();
        ctx.moveTo(s, 0); ctx.lineTo(s + 14, 0); ctx.lineTo(s - 60, 256); ctx.lineTo(s - 74, 256); ctx.closePath();
        ctx.fill();
      }
    }

    // Fine ripstop weave crosshatch
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (var g = 0; g < 256; g += 8) {
      ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(256, g); ctx.stroke();
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return setSRGB(renderer, tex);
  }

  function makeGroundTexture(renderer, mode) {
    var c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    var ctx = c.getContext('2d');
    if (mode === 'tiles') {
      var palette = ['#e2e8f0', '#38bdf8', '#f8fafc', '#14b8a6'];
      var sz = 64;
      for (var y = 0; y < 512; y += sz) {
        for (var x = 0; x < 512; x += sz) {
          var idx = ((x / sz) + (y / sz)) % 4;
          ctx.fillStyle = palette[idx];
          ctx.fillRect(x, y, sz, sz);
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.32)';
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 1, y + 1, sz - 2, sz - 2);
        }
      }
    } else if (mode === 'metal') {
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.18)';
      ctx.lineWidth = 3;
      for (var i = 0; i < 512; i += 32) {
        for (var j = 0; j < 512; j += 32) {
          ctx.beginPath();
          ctx.moveTo(i + 6, j + 16);
          ctx.lineTo(i + 26, j + 16);
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#eab308';
      ctx.fillRect(0, 0, 512, 18);
      ctx.fillStyle = '#111827';
      for (var s = 0; s < 512; s += 48) ctx.fillRect(s, 0, 24, 18);
    } else if (mode === 'concrete') {
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(0, 0, 512, 512);
      for (var k = 0; k < 2200; k++) {
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(30,41,59,0.1)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
      }
      ctx.strokeStyle = 'rgba(30,41,59,0.35)';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, 508, 508);
    } else {
      ctx.fillStyle = '#c8a97e';
      ctx.fillRect(0, 0, 512, 512);
      for (var n = 0; n < 2400; n++) {
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,245,220,0.1)' : 'rgba(92,64,36,0.11)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
      }
      ctx.strokeStyle = 'rgba(84, 62, 38, 0.25)';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, 508, 508);
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(20, 20);
    return setSRGB(renderer, tex);
  }

  function makeWallTexture(renderer, mode) {
    var c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    var ctx = c.getContext('2d');
    if (mode === 'redblock') {
      ctx.fillStyle = '#b9382c';
      ctx.fillRect(0, 0, 256, 256);
      for (var row = 0; row < 8; row++) {
        var y = row * 32;
        var off = (row % 2) * 32;
        for (var col = -1; col < 5; col++) {
          ctx.fillStyle = (row + col) % 2 === 0 ? '#c44536' : '#a63429';
          ctx.fillRect(col * 64 + off + 2, y + 2, 60, 28);
        }
      }
    } else if (mode === 'metal') {
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, 256, 256);
      for (var x = 0; x < 256; x += 24) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x, 0, 8, 256);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x + 8, 0, 6, 256);
      }
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = 'rgba(30,41,59,0.28)';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, 252, 124);
      ctx.strokeRect(2, 128, 252, 126);
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return setSRGB(renderer, tex);
  }

  function makeCrateTexture(renderer, mode) {
    var c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    var ctx = c.getContext('2d');
    if (mode === 'metal') {
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 242, 242);
    } else {
      ctx.fillStyle = '#9a6b3e';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#5c3a1e';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 242, 242);
      ctx.beginPath();
      ctx.moveTo(14, 14); ctx.lineTo(242, 242);
      ctx.moveTo(242, 14); ctx.lineTo(14, 242);
      ctx.stroke();
    }
    return setSRGB(renderer, new THREE.CanvasTexture(c));
  }

  function makeContainerTexture(renderer, hex) {
    var c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    var ctx = c.getContext('2d');
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, 256, 256);
    for (var x = 0; x < 256; x += 16) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x, 0, 6, 256);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(x + 6, 0, 4, 256);
    }
    return setSRGB(renderer, new THREE.CanvasTexture(c));
  }

  function makeCountryPatchTexture(renderer, code) {
    var info = COUNTRIES.find(function (c) { return c.code === code; }) || COUNTRIES[0];
    var c = document.createElement('canvas');
    c.width = 128;
    c.height = 84;
    var ctx = c.getContext('2d');
    ctx.fillStyle = info.colors[0];
    ctx.fillRect(0, 0, 128, 28);
    ctx.fillStyle = info.colors[1];
    ctx.fillRect(0, 28, 128, 28);
    ctx.fillStyle = info.colors[2];
    ctx.fillRect(0, 56, 128, 28);
    if (info.code === 'PH') {
      ctx.fillStyle = '#0038a8';
      ctx.fillRect(0, 0, 128, 42);
      ctx.fillStyle = '#ce1126';
      ctx.fillRect(0, 42, 128, 42);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(54, 42); ctx.lineTo(0, 84); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fcd116';
      ctx.beginPath();
      ctx.arc(20, 42, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (info.code === 'JP') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 84);
      ctx.fillStyle = '#bc002d';
      ctx.beginPath();
      ctx.arc(64, 42, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 124, 80);
    return setSRGB(renderer, new THREE.CanvasTexture(c));
  }

  function createCaricatureDataUrl(srcUrl, cb) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      var w = 128, h = 128;
      var c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      var ctx = c.getContext('2d');
      ctx.filter = 'contrast(1.38) saturate(1.45) brightness(1.06)';
      ctx.drawImage(img, 0, 0, w, h);
      ctx.filter = 'none';
      var imgData = ctx.getImageData(0, 0, w, h);
      var d = imgData.data;
      for (var i = 0; i < d.length; i += 4) {
        d[i] = Math.round(d[i] / 36) * 36;
        d[i + 1] = Math.round(d[i + 1] / 36) * 36;
        d[i + 2] = Math.round(d[i + 2] / 36) * 36;
      }
      ctx.putImageData(imgData, 0, 0);
      ctx.strokeStyle = '#e5b842';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, w - 6, h - 6);
      cb(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = function () { cb(''); };
    img.src = srcUrl;
  }

  function pickUniqueUniforms(usedIds, count) {
    var taken = {};
    (usedIds || []).forEach(function (id) { taken[id] = true; });
    var result = [];
    for (var i = 0; i < UNIFORMS.length && result.length < count; i++) {
      if (!taken[UNIFORMS[i].id]) {
        taken[UNIFORMS[i].id] = true;
        result.push(UNIFORMS[i]);
      }
    }
    return result;
  }

  window.GameAssets = {
    COUNTRIES: COUNTRIES,
    UNIFORMS: UNIFORMS,
    ALIEN_HELMETS: ALIEN_HELMETS,
    THEME_COLORS: THEME_COLORS,
    TERRAINS: TERRAINS,
    setSRGB: setSRGB,
    makeUniformFabricTexture: makeUniformFabricTexture,
    makeGroundTexture: makeGroundTexture,
    makeWallTexture: makeWallTexture,
    makeCrateTexture: makeCrateTexture,
    makeContainerTexture: makeContainerTexture,
    makeCountryPatchTexture: makeCountryPatchTexture,
    createCaricatureDataUrl: createCaricatureDataUrl,
    pickUniqueUniforms: pickUniqueUniforms,
  };
})();
