/** bentukLogo: data path simple-icons jadi BufferGeometry siap-ekstrusi.
 *
 *  Dipisahkan dari aktornya karena bentuknya TIDAK bergantung pada gulir, hover, atau
 *  ukuran layar: satu bahasa = satu geometri = satu draw call, dibangun sekali lalu
 *  dipakai bersama setiap pemasangan. Aktor hanya membaca angka ini dan menulis
 *  transform per frame, sama seperti AktorSF26 membaca cache useGLTF.
 *
 *  Tidak ada Math.random dan tidak ada urutan yang tidak ditentukan: Object.keys atas
 *  peta logo dan urutan subpath SVG keduanya tetap, jadi geometri yang sama keluar dari
 *  panggilan ke dua dan ke seratus. Itu yang membuat verifier boleh membandingkan
 *  jumlah segitiga antar muat. */
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { PATH_BAHASA } from "@/data/logoPath";
import type { BahasaId } from "@/data/logoBahasa";

/** Pecahan contour yang dibagi dua ujung kurva. 4 menghasilkan 916–1972 segitiga per
 *  logo (terukur di swiftshader, lihat docs/verify/ekstra-probe.mjs seksi 10b) — cukup
 *  halus untuk tepi kotak yang dilihat dari dekat, dan satu-dua orde di bawah mobil
 *  yang sudah lebih dulu ada di panggung ini. */
const SEGMEN_KURVA = 4;

/** Ketebalan dalam SATUAN DUNIA setelah normalisasi, bukan dalam viewBox. Angka viewBox
 *  tidak bisa dipakai: JavaScript dan TypeScript tingginya 24 unit, Go cuma 8,96 —
 *  kedalaman yang sama dalam viewBox memberi ketebalan yang beda 2,7 kali di layar. */
const TEBAL = 0.16;

/** Bevel sebagai pecahan ukuran contour, sehingga kemiringan tepi tetap proporsional
 *  pada logo kecil maupun besar. Bevel juga MEMPERLEBAR tapak: ExtrudeGeometry menulis
 *  cincin bevel di LUAR contour asal, jadi normalisasi harus menghitungnya atau logo
 *  keluar dari bujur sangkar satuan (terukur: 1,04 bukan 1,00). */
const BEVEL = 0.02;

/** Satu bahasa, satu geometri. Gagal bangun = cache nilai null, supaya kegagalan tidak
 *  diulang setiap frame dan tidak pernah menghasilkan bentuk karangan. */
const cache = new Map<BahasaId, THREE.BufferGeometry | null>();

const pemuat = new SVGLoader();

/** Bentuk 2D dari satu berkas SVG simple-icons. Whitespace di sekitar `d` sengaja tidak
 *  dibersihkan: yang di-parse adalah byte yang sama dengan yang tercatat di
 *  logoBahasa-LICENSE.txt. */
const bentuk2D = (logo: { viewBox: string; d: string }): THREE.Shape[] => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${logo.viewBox}"><path d="${logo.d}"/></svg>`;
  const shapes: THREE.Shape[] = [];
  // Argumen isCCW dituntut @types/three 0.182, tapi runtime three 0.186 sudah membuang
  // parameter itu: ShapePath.toShapes() r186 memisahkan tutup dan lubang lewat uji
  // titik-dalam-poligon aturan genap-ganjil, bukan lewat arah jarum jam. Jadi angka ini
  // tidak dibaca — yang dibaca hanya implementasi yang jalan, dan itu sudah dibuktikan
  // di browser (lubang "JS"/"TS" dan mata gopher muncul sebagai lubang, bukan timbunan).
  for (const jalur of pemuat.parse(svg).paths) shapes.push(...jalur.toShapes(true));
  return shapes;
};

const bangun = (id: BahasaId): THREE.BufferGeometry | null => {
  const logo = PATH_BAHASA[id];

  // Tapak 2D diukur dari titik hasil teselasi (extractPoints), bukan dari kurva asalnya:
  // itu titik-titik yang benar-benar dipakai ExtrudeGeometry, jadi angka penormilan dan
  // angka geometri tidak bisa berbeda cerita.
  const kotak = new THREE.Box2();
  let shapes: THREE.Shape[];
  try {
    shapes = bentuk2D(logo);
    for (const s of shapes) {
      const titik = s.extractPoints(SEGMEN_KURVA);
      for (const cincin of [titik.shape, ...titik.holes]) {
        for (const p of cincin) kotak.expandByPoint(p);
      }
    }
  } catch {
    // SVG rusak / toShapes melempar: tanpa objek, bukan bentuk perkiraan.
    return null;
  }

  const ukuran = kotak.getSize(new THREE.Vector2());
  const terbesar = Math.max(ukuran.x, ukuran.y);
  if (!(terbesar > 0)) return null;

  const bevel = BEVEL * terbesar;
  // Kontur + dua cincin bevel harus pas di bujur sangkar satuan.
  const k = 1 / (terbesar + 2 * bevel);
  const dalam = Math.max(TEBAL / k - 2 * bevel, bevel);

  const opsi = (bevelHidup: boolean): THREE.ExtrudeGeometryOptions => ({
    curveSegments: SEGMEN_KURVA,
    steps: 1,
    depth: dalam,
    bevelEnabled: bevelHidup,
    bevelSegments: bevelHidup ? 1 : 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: 0,
  });

  let geometri: THREE.ExtrudeGeometry;
  try {
    geometri = new THREE.ExtrudeGeometry(shapes, opsi(true));
  } catch {
    // ShapeUtils.triangulateShape bisa melempar pada kontur yang bersinggungan sendiri
    // begitu bevel menambah cincin. Bevel mati adalah satu-satunya jalan keluar yang
    // masih menghasilkan bentuk yang sama, jadi dicoba dulu sebelum menyerah.
    try {
      geometri = new THREE.ExtrudeGeometry(shapes, opsi(false));
    } catch {
      return null;
    }
  }

  // Dua group (tutup + dinding) berarti dua material berarti dua draw call. Shader-nya
  // satu dan tidak peduli bagian mana yang sedang digambar, jadi group dibuang.
  geometri.clearGroups();

  // Eks SVG: y ke bawah. rotateX(π) membalik Y lewat rotasi murni (determinan +1) sehingga
  // winding dan normal tetap valid — menegatifkan koordinat kurva akan membalik wajah
  // segitiga dan membuat logo terpasang dari dalam. Sekalian membalik Z, yang tidak
  // masalah karena geometri dipusatkan sesudahnya.
  geometri.rotateX(Math.PI);

  geometri.computeBoundingBox();
  const pusat = geometri.boundingBox!.getCenter(new THREE.Vector3());
  geometri.translate(-pusat.x, -pusat.y, -pusat.z);
  geometri.scale(k, k, k);

  // Koreksi kedua, dan ini bukan kehiasan: cincin bevel pada sudut tajam bisa melebar
  // SEDIKIT lebih dari bevelSize (terukur 1,0006 pada Go, yang memang punya siku speed
  // lines). `k` di atas hanya menjamin kontur asal muat; yang menjamin bentuk utuh muat
  // di bujur sangkar satuan hanyalah tapak yang benar-benar diukur setelah diekstrusi.
  geometri.computeBoundingBox();
  const tapak = geometri.boundingBox!.getSize(new THREE.Vector3());
  const lebih = Math.max(tapak.x, tapak.y);
  if (lebih > 1) geometri.scale(1 / lebih, 1 / lebih, 1 / lebih);

  geometri.computeBoundingBox();
  geometri.computeBoundingSphere();
  return geometri;
};

/** Geometri logo dalam bujur sangkar satuan, terpusat di asal, bersisi TEBAL.
 *  Hasilnya dibagikan: jangan dispose lewat R3F (pakai dispose={null} di mesh-nya),
 *  pelepasan milik cache ini dan hanya terjadi lewat bersihkanBentuk(). */
export const bentukLogo = (id: BahasaId): THREE.BufferGeometry | null => {
  const ada = cache.get(id);
  if (ada !== undefined) return ada;
  const baru = bangun(id);
  cache.set(id, baru);
  return baru;
};

/** Hanya untuk verifier: jumlah segitiga yang akan masuk info.render.segmenTri. */
export const segitigaBentuk = (geom: THREE.BufferGeometry): number =>
  (geom.index ? geom.index.count : geom.attributes.position.count) / 3;

export default bentukLogo;
