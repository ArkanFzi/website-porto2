/** Sumber shader untuk kartu potret chiaroscuro + pabrik uniform-nya.
 *  Dipisah dari komponen supaya objek panggung lain (Aktor*) bisa memakai material
 *  dan konvensi uniform yang sama tanpa mengimpor komponen. */
import * as THREE from "three";

export const RASIO_POTRET = 1.64;

/** Panjang jejak pointer yang dipegang shader. Dua belas sampel = ±0,5 detik gerakan
 *  terakhir pada 24fps; lebih dari itu hanya memperbesar loop fragment tanpa terbaca. */
export const JUMLAH_JEJAK = 12;

/** Silang potret↔mobil: satu angka, dua pemakai. usePanggung menulisnya ke uniform
 *  kartu (uMobil) sementara AktorSF26 membacanya untuk alpha sendiri — dua penghalusan
 *  terpisah akan saling tertinggal satu frame dan perpindahan terbaca sebagai dua
 *  kejadian. Nilainya 0 di luar hover baris /01, jadi kartu diam tidak berubah. */
export const SILANG_MOBIL = { value: 0 };

/** Iris antar bab, dipakai bersama kartu dan mobil dengan alasan yang sama seperti
 *  SILANG_MOBIL: keduanya menutup pada ambang yang sama, dan dua angka yang tertinggal
 *  satu frame akan terlihat sebagai dua sapuan. usePanggung yang menulis nilainya;
 *  mobil hanya ikut. */
export const SAPU_IRIS = { value: 0 };

/** Satu hukum potong untuk semua objek panggung: bentuk apa pun dipotong pada kotak
 *  portal DOM yang sama, jadi tidak ada objek yang pernah menutupi teks. Butuh
 *  `vClip` (NDC), `uMask`, `uNdcPerPx`, `uWipe`, dan `alpha` dalam scope. */
export const glslPotongPortal = /* glsl */ `
    float tepiX = min(vClip.x - uMask.x, uMask.y - vClip.x) / uNdcPerPx.x;
    float tepiY = min(vClip.y - uMask.z, uMask.w - vClip.y) / uNdcPerPx.y;
    float jarak = min(tepiX, tepiY);
    float jari =
      min((uMask.y - uMask.x) / uNdcPerPx.x, (uMask.w - uMask.z) / uNdcPerPx.y) * 0.5;
    float tutup = uWipe * (jari + 1.5) - 1.5;
    alpha *= smoothstep(tutup - 1.5, tutup + 1.5, jarak);
`;

export const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uVelocity;
  uniform float uPersona;
  uniform float uHover;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vClip;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;

    // Organic kinetic displacement
    float fluidWave = sin(pos.y * 3.5 + uTime * 2.2) * cos(pos.x * 3.0 + uTime * 1.8) * 0.035;
    float mechVibe = sin(pos.y * 24.0 + uTime * 4.0) * 0.008;
    float wave = mix(mechVibe, fluidWave, uPersona);
    pos.z += wave * clamp(uVelocity * 0.1, -0.2, 0.2);

    // Subtle 3D parallax responsive to cursor
    pos.z += (uMouse.x * pos.x + uMouse.y * pos.y) * 0.12;

    // Hover ripple on project inspect
    if (uHover > 0.01) {
      pos.z += sin(pos.y * 10.0 + uTime * 4.0) * 0.08 * uHover;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
    vClip = gl_Position.xy / gl_Position.w;
  }
`;

export const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uVelocity;
  uniform float uPersona; // 0.0 = Engineer, 1.0 = Creator
  uniform float uScroll;  // 0.0 to 1.0
  uniform float uHover;
  uniform float uHoverIndex;
  uniform float uWireframe;
  uniform float uReveal;
  uniform vec2 uCursorUV;
  /** ${JUMLAH_JEJAK} sampel terakhir jejak pointer pada UV kartu: (u, v, umur). umur 1 =
   *  baru, meluruh ke 0; slot yang belum pernah dipakai berisi umur 0. Nilainya WAJIB
   *  disisipkan sebagai angka, bukan sebagai nama: GLSL tidak mengenal konstanta TypeScript
   *  dan shader yang gagal kompilasi membuat kartu tidak tergambar sama sekali. */
  uniform vec3 uJejak[${JUMLAH_JEJAK}];
  uniform vec4 uMask;      // batas portal dalam NDC: kiri, kanan, bawah, atas
  uniform vec2 uNdcPerPx;  // lebar/satu tinggi layar dalam NDC, untuk tepi potong
  /** Penutup iris antar bab, 0 = terbuka penuh sampai 1 = tertutup. Ambangnya dihitung
   *  dari bidang jarak yang sama dengan potongan portal, jadi wipe tidak membawa bentuk
   *  baru ke kartu — ia hanya menarik tepi potong yang sudah ada ke dalam. */
  uniform float uWipe;
  /** 0 = kartu potret penuh, 1 = kartu menyerahkan tempatnya ke mobil baris /01. */
  uniform float uMobil;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vClip;

  void main() {
    vec2 uv = vUv;

    // Velocity-based chromatic aberration at edges
    float aberrationBase = clamp(abs(uVelocity) * 0.015, 0.0, 0.025);
    float aberration = mix(aberrationBase * 0.6, aberrationBase * 1.4, uPersona);
    vec2 dir = normalize(uv - 0.5 + vec2(0.0001));

    float r = texture2D(uTexture, uv + dir * aberration).r;
    float g = texture2D(uTexture, uv).g;
    float b = texture2D(uTexture, uv - dir * aberration).b;
    vec3 baseColor = vec3(r, g, b);

    // Precision Leica Monochrom luminance calculation (Clean, natural black-and-white base)
    float lum = dot(baseColor, vec3(0.299, 0.587, 0.114));
    float contrastLum = smoothstep(0.04, 0.94, lum);
    vec3 monoBase = vec3(contrastLum);

    // ── NATURAL SCUDERIA RED ACCENTS (HALUS, ELEGAN, TIDAK MENOR) ──
    // 1. Subtle studio rim backlight on the outer silhouette/shoulders only
    float distCenter = length(uv - vec2(0.5));
    float rimLight = pow(distCenter * 1.4, 2.8);
    // Soft red rim accent only on outer edge (intensity 0.26)
    vec3 rossoRim = vec3(0.831, 0.117, 0.07) * rimLight * 0.26;

    // 2. Faint interactive cursor specular (warm reflection on suit, never flooding face)
    // uCursorUV adalah posisi pointer yang sudah diproyeksikan ke UV plane di JS;
    // memakai uMouse langsung (ndc*0.5+0.5) membuat "cahaya" tertinggal ~4x dari
    // kursor karena uv plane hanya membentang selebar kartu.
    vec2 cursorLightPos = uCursorUV;
    vec2 cursorSelisih = (uv - cursorLightPos) * vec2(1.0, 1.64); // koreksi rasio plane 1 : 1.64
    float cursorDist = length(cursorSelisih);
    float cursorGlow = smoothstep(0.45, 0.0, cursorDist);
    vec3 cursorSpecular = vec3(0.831, 0.117, 0.07) * cursorGlow * 0.14 * (1.0 - contrastLum);

    // ── PERSONA 1: THE ENGINEER (uPersona = 0.0) ──
    // Pristine high-contrast Leica monochrome with refined silhouette rim light
    vec3 engineerColor = monoBase + rossoRim + cursorSpecular;

    // ── PERSONA 2: THE CREATOR (uPersona = 1.0) ──
    // Natural warmth with subtle silk halation
    vec3 halation = vec3(0.831, 0.117, 0.07) * pow(contrastLum, 3.0) * 0.18;
    vec3 creatorColor = monoBase + rossoRim * 1.2 + halation + cursorSpecular * 1.3;

    // Smooth blend between personas
    vec3 finalColor = mix(engineerColor, creatorColor, uPersona);

    // ── MOUSE REVEAL MASK ──
    // Tekstur aslinya /FotoDiriFix.webp monokrom (saturasi rata terukur 0.003), jadi
    // "menyingkap warna asli" tidak menampilkan apa pun; yang dibuka adalah lapisan
    // rosso yang tetap mengikuti nada potret, bukan cakram warna datar.
    // uReveal sengaja 0 sampai pointer benar-benar bergerak, jadi perangkat sentuh dan
    // mode reduce-motion tidak melihat blob di tengah kartu.
    // Yang dibuka bukan hanya titik kursor: 12 sampel terakhir membentuk pita, jadi
    // gerakan membaca sebagai gerakan. max() dipakai (bukan jumlah) supaya dua sampel
    // yang berdekatan tidak saling menebal menjadi tambalan yang menutupi wajah.
    float jejak = 0.0;
    for (int i = 0; i < ${JUMLAH_JEJAK}; i++) {
      vec3 s = uJejak[i];
      if (s.z <= 0.002) continue;
      float d = length((uv - s.xy) * vec2(1.0, 1.64));
      jejak = max(jejak, smoothstep(0.30, 0.0, d) * s.z);
    }
    float reveal = max(jejak, smoothstep(0.30, 0.0, cursorDist)) * uReveal;
    vec3 duotoneReveal = mix(vec3(0.16, 0.02, 0.015), vec3(0.72, 0.10, 0.06), contrastLum)
      * (0.35 + 0.65 * contrastLum);
    finalColor = mix(finalColor, duotoneReveal, reveal * 0.75);

    // ── CHAPTER 3 HOVER: PROJECT AURA ──
    if (uHover > 0.01) {
      float pulse = sin(uTime * 2.5) * 0.5 + 0.5;
      vec3 projectAura = vec3(0.831, 0.117, 0.07) * pulse * 0.35;
      finalColor = mix(finalColor, finalColor * vec3(1.08, 0.7, 0.6) + projectAura, uHover * 0.5);
    }

    // ── CHAPTER 4 FINALE: SCUDERIA DUOTONE SHIFT ──
    float ch4Factor = smoothstep(0.82, 0.96, uScroll);
    if (ch4Factor > 0.001) {
      vec3 deepCrimson = vec3(0.48, 0.04, 0.02);
      vec3 brightRosso = vec3(0.90, 0.15, 0.08);
      vec3 duotone = mix(deepCrimson, brightRosso, contrastLum);
      finalColor = mix(finalColor, duotone * 1.1, ch4Factor * 0.85);
    }

    // ── GPU WIREFRAME INSPECTOR OVERLAY ──
    if (uWireframe > 0.001) {
      vec2 grid = abs(fract(uv * 42.0 - 0.5) - 0.5) / (fwidth(uv * 42.0) + 0.0001);
      float line = min(grid.x, grid.y);
      float wire = 1.0 - min(line, 1.0);
      vec3 wireColor = vec3(0.831, 0.117, 0.07);
      vec3 chassisBacking = vec3(0.04, 0.04, 0.05);
      vec3 wireRender = mix(chassisBacking, wireColor * 1.6, wire);
      finalColor = mix(finalColor, wireRender, uWireframe * 0.92);
    }

    // ── CLEAN RECTANGULAR MONOLITH FRAMING (RESTRAINED & NATURAL) ──
    vec2 cardUv = abs(uv - 0.5) * 2.0; // from 0.0 (center) to 1.0 (border)
    vec2 cornerDist = max(cardUv - vec2(0.91, 0.95), 0.0);
    float cornerRadius = length(cornerDist);
    float cardAlpha = 1.0 - smoothstep(0.03, 0.08, cornerRadius);

    // Delicate restrained hairline edge (subtle dark titanium with faint red gleam)
    float hairline = smoothstep(0.08, 0.05, cornerRadius) - smoothstep(0.05, 0.02, cornerRadius);
    finalColor += vec3(0.831, 0.117, 0.07) * hairline * 0.35;

    // Fade out in Chapter 4
    float alpha = cardAlpha * (1.0 - ch4Factor * 0.85);

    // ── POTONG PORTAL ──
    // Kartu boleh lebih lebar dari kotaknya (parallax pointer, gelombang, miring);
    // sisanya dipotong pada batas kotak DOM bab, supaya kartu tidak pernah menutupi
    // teks. Tepi dibuat lunak ~3px agar tidak terlihat sebagai garis bergerigi.
    // ── POTONG PORTAL + WIPE ANTAR BAB ──
    // Satu bidang jarak, satu ambang. jarak = jarak bertanda ke tepi kotak portal dalam
    // pixel: positif di dalam (sampai setengah dimensi terkecil di tengah), nol di tepi,
    // negatif di luar. Kartu boleh lebih lebar dari kotaknya (parallax pointer, gelombang,
    // miring); sisanya dipotong pada batas kotak DOM bab supaya kartu tidak pernah menutupi
    // teks. uWipe menggeser ambangnya ke dalam, jadi berpindah bab adalah sapuan pada
    // bingkai yang sama, bukan bentuk baru. Pada uWipe = 0 hasilnya IDENTIK dengan potongan
    // saja: ramp 1.5px di kedua sisi membuat (-3,0) jatuh tepat seperti potongan lunak
    // 3px yang lama, dan kartu diam tidak kehilangan satu pixel pun di tepinya.
    // Potong + wipe ada di glslPotongPortal karena mobil baris /01 memotong pada kotak
    // yang sama; dua salinan hukum akan segera berbeda perilakunya.
${glslPotongPortal}
    // Kartu menyerahkan pixelnya ke mobil, bukan pindah tempat: alpha yang mati menjaga
    // potongan portal tetap sama dan tidak menyisakan bayangan tepi.
    alpha *= 1.0 - uMobil;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export interface UniformsPanggung {
  uTexture: { value: THREE.Texture };
  uTime: { value: number };
  uMouse: { value: THREE.Vector2 };
  uVelocity: { value: number };
  uPersona: { value: number };
  uScroll: { value: number };
  uHover: { value: number };
  uHoverIndex: { value: number };
  uWireframe: { value: number };
  uReveal: { value: number };
  uCursorUV: { value: THREE.Vector2 };
  uJejak: { value: THREE.Vector3[] };
  uMask: { value: THREE.Vector4 };
  uNdcPerPx: { value: THREE.Vector2 };
  uWipe: { value: number };
  uMobil: { value: number };
}

/** Ditambah index signature supaya bisa disuapkan ke prop `uniforms` milik
 *  <shaderMaterial>, yang tipenya record string -> IUniform. */
export const buatUniformPanggung = (
  texture: THREE.Texture
): UniformsPanggung & Record<string, THREE.IUniform> => ({
  uTexture: { value: texture },
  uTime: { value: 0 },
  uMouse: { value: new THREE.Vector2(0, 0) },
  uVelocity: { value: 0 },
  uPersona: { value: 0.0 },
  uScroll: { value: 0.0 },
  uHover: { value: 0 },
  uHoverIndex: { value: 0 },
  uWireframe: { value: 0.0 },
  uReveal: { value: 0.0 },
  uCursorUV: { value: new THREE.Vector2(0.5, 0.5) },
  // Umur 0 = slot kosong; shader melewati sampel itu, jadi kartu yang baru terpasang
  // tidak menampilkan pita hantu di tengah.
  uJejak: { value: Array.from({ length: JUMLAH_JEJAK }, () => new THREE.Vector3(0.5, 0.5, 0)) },
  // Terbuka penuh sampai portal pertama terukur, supaya frame sebelum effect
  // berjalan tidak memotong kartu seluruhnya.
  uMask: { value: new THREE.Vector4(-1, 1, -1, 1) },
  uNdcPerPx: { value: new THREE.Vector2(2 / 1440, 2 / 900) },
  // Terbuka: kartu penuh sampai panggung memutuskan bahwa ia sedang berpindah bab.
  // Holder module-level di sini hanya NILAI AWAL: R3F menyalin tiap entri props uniforms ke
  // objek baru, jadi usePanggung yang menulis tiap frame juga menulis SAPU_IRIS/SILANG_MOBIL
  // secara eksplisit — mobil (material imperatif) membaca holder itu.
  uWipe: SAPU_IRIS,
  uMobil: SILANG_MOBIL,
});
