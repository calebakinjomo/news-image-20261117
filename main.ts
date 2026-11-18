// The World in One Picture — Tuesday 17 November 2026.
// A program that draws the day's world news as a newspaper front page and
// writes it to /output/entry.png. Node 22, standard library only. No network,
// no randomness, no clock: the same input always produces the same bytes.
//
// Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// Canvas: a plain RGB pixel buffer with tiny drawing helpers.
// ---------------------------------------------------------------------------

type RGB = [number, number, number];

const PAPER: RGB = [247, 242, 231];
const NAVY: RGB = [20, 33, 61];
const INK: RGB = [24, 24, 28];
const RED: RGB = [193, 39, 45];
const GOLD: RGB = [217, 164, 65];
const WHITE: RGB = [255, 255, 255];
const SKY: RGB = [191, 217, 232];
const SEA: RGB = [46, 107, 138];
const TEAL: RGB = [14, 107, 107];
const BLAST: RGB = [255, 176, 32];
const PANEL: RGB = [255, 255, 255];

const px = new Uint8Array(W * H * 3);

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, c);
  }
}

function strokeRect(x: number, y: number, w: number, h: number, t: number, c: RGB): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

function drawLine(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPixel(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

// ---------------------------------------------------------------------------
// PNG encoding: colour type 2 (truecolour RGB), 8-bit, filter 0 per row.
// ---------------------------------------------------------------------------

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePng(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Bitmap font: 5x7 glyphs, one row per number, bit 4 = leftmost pixel.
// All poster text is uppercase, so only capitals, digits and punctuation.
// ---------------------------------------------------------------------------

const FONT: Record<string, number[]> = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  "!": [4, 4, 4, 4, 4, 0, 4],
  "'": [4, 4, 8, 0, 0, 0, 0],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  ",": [0, 0, 0, 0, 12, 4, 8],
  "-": [0, 0, 0, 31, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 12, 12],
  "/": [1, 2, 2, 4, 8, 8, 16],
  ":": [0, 12, 12, 0, 12, 12, 0],
  ";": [0, 12, 12, 0, 12, 4, 8],
  "?": [14, 17, 1, 2, 4, 0, 4],
  "$": [4, 15, 20, 14, 5, 30, 4],
  "%": [24, 25, 2, 4, 8, 19, 24],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 6, 8, 16, 31],
  "3": [31, 2, 4, 2, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [6, 8, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 2, 12],
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [1, 1, 1, 1, 17, 17, 14],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 27, 17],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
};

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale;
}

function drawChar(ch: string, x: number, y: number, scale: number, c: RGB): void {
  const glyph = FONT[ch] ?? FONT["?"];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if ((glyph[row] >> (4 - col)) & 1) {
        fillRect(x + col * scale, y + row * scale, scale, scale, c);
      }
    }
  }
}

function drawText(text: string, x: number, y: number, scale: number, c: RGB): void {
  for (let i = 0; i < text.length; i++) drawChar(text[i], x + i * 6 * scale, y, scale, c);
}

function drawTextCentred(text: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(text, cx - Math.floor(textWidth(text, scale) / 2), y, scale, c);
}

// Word-wrap plain text to fit maxWidth pixels at the given scale.
function wrapText(text: string, maxWidth: number, scale: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const trial = line === "" ? word : line + " " + word;
    if (textWidth(trial, scale) <= maxWidth || line === "") {
      line = trial;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

function drawLines(lines: string[], x: number, y: number, scale: number, c: RGB): void {
  const lh = 7 * scale + Math.max(2, Math.floor(scale * 1.2));
  for (let i = 0; i < lines.length; i++) drawText(lines[i], x, y + i * lh, scale, c);
}

// ---------------------------------------------------------------------------
// Front page layout, 1024 x 1024.
// ---------------------------------------------------------------------------

const MX = 24; // page margin
const CW = 1024 - MX * 2; // content width = 976

function drawMasthead(): void {
  fillRect(0, 0, W, 150, NAVY);
  drawTextCentred("THE WORLD", 512, 14, 10, WHITE);
  fillRect(212, 96, 600, 4, GOLD);
  fillRect(0, 106, W, 44, RED);
  drawTextCentred("TUESDAY 17 NOVEMBER 2026", 512, 116, 4, WHITE);
}

// A small bridge scene: sky, deck, two towers, suspension cables, water,
// and a blast star over the deck. Drawn inside the box (x, y, w, h).
function drawBridge(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  // sun
  fillRect(x + w - 52, y + 10, 34, 34, GOLD);
  // water
  fillRect(x, y + h - 34, w, 34, SEA);
  drawLine(x + 8, y + h - 24, x + w - 8, y + h - 24, WHITE);
  drawLine(x + 20, y + h - 14, x + w - 30, y + h - 14, WHITE);
  // towers
  const deckY = y + h - 52;
  fillRect(x + 52, y + 22, 10, deckY - y - 22, NAVY);
  fillRect(x + w - 62, y + 22, 10, deckY - y - 22, NAVY);
  // deck
  fillRect(x + 8, deckY, w - 16, 8, NAVY);
  // suspension cables
  drawLine(x + 57, y + 24, x + 8, deckY, NAVY);
  drawLine(x + 57, y + 24, x + w / 2, deckY, NAVY);
  drawLine(x + w - 57, y + 24, x + w - 8, deckY, NAVY);
  drawLine(x + w - 57, y + 24, x + w / 2, deckY, NAVY);
  // blast star above the deck centre
  const bx = x + Math.floor(w / 2);
  const by = deckY - 26;
  for (let i = -14; i <= 14; i += 2) {
    setPixel(bx + i, by, BLAST);
    setPixel(bx, by + i, BLAST);
  }
  for (const [dx, dy] of [[-10, -10], [10, -10], [-10, 10], [10, 10]] as const) {
    drawLine(bx, by, bx + dx, by + dy, BLAST);
  }
  fillRect(bx - 5, by - 5, 10, 10, BLAST);
}

function drawLead(): void {
  const x = MX;
  const y = 166;
  const w = CW;
  const h = 312;
  fillRect(x, y, w, h, PANEL);
  strokeRect(x, y, w, h, 3, NAVY);
  drawText("EUROPE - WAR IN UKRAINE", x + 24, y + 18, 2, RED);
  const headline = wrapText("UKRAINE HITS CRIMEA BRIDGE AGAIN", w - 48, 6);
  drawLines(headline, x + 24, y + 46, 6, NAVY);
  fillRect(x + 24, y + 158, w - 48, 3, GOLD);
  const body = wrapText(
    "UKRAINIAN STRIKE HIT THE KERCH BRIDGE FOR THE SECOND DAY RUNNING. TRAFFIC SUSPENDED. RUSSIA STRUCK KYIV'S BRIDGES OVER THE DNIPRO, HITTING HEATING, WATER AND POWER.",
    592,
    2,
  );
  drawLines(body, x + 24, y + 176, 2, INK);
  drawBridge(x + 648, y + 176, 304, 116);
}

function drawStoryPanel(
  x: number,
  y: number,
  w: number,
  h: number,
  bar: RGB,
  kicker: string,
  headline: string,
  summary: string,
): void {
  fillRect(x, y, w, h, PANEL);
  strokeRect(x, y, w, h, 2, NAVY);
  fillRect(x, y, w, 8, bar);
  drawText(kicker, x + 16, y + 20, 2, RED);
  const head = wrapText(headline, w - 32, 3);
  drawLines(head, x + 16, y + 48, 3, NAVY);
  const body = wrapText(summary, w - 32, 2);
  drawLines(body, x + 16, y + 108, 2, INK);
}

function drawGrid(): void {
  const w = 476;
  const h = 168;
  const y0 = 494;
  const y1 = 686;
  drawStoryPanel(
    MX, y0, w, h, RED, "MIDDLE EAST - HORMUZ",
    "TANKERS HIT BY MINES NEAR HORMUZ",
    "OIL TANKERS STRUCK MINES AND CAUGHT FIRE NEAR THE STRAIT. A THIRD US CARRIER ARRIVED IN THE REGION.",
  );
  drawStoryPanel(
    MX + 500, y0, w, h, GOLD, "DIPLOMACY - ASIA",
    "XI, TRUMP AND PUTIN TO MEET IN SHENZHEN",
    "CHINA CONFIRMED THE FIRST THREE-WAY MEETING OF THE THREE PRESIDENTS, THURSDAY 19 NOVEMBER, AT APEC.",
  );
  drawStoryPanel(
    MX, y1, w, h, NAVY, "HEALTH - UNITED STATES",
    "US LOSES MEASLES-FREE STATUS",
    "FIRST TIME SINCE 2000, AS CASES SOAR ACROSS THE COUNTRY.",
  );
  drawStoryPanel(
    MX + 500, y1, w, h, TEAL, "UNITED STATES - DEFENCE",
    "PENTAGON FAILS AUDIT FOR 9TH YEAR",
    "AUDITORS COULD NOT VERIFY ACCOUNTS COVERING $4.8 TRILLION IN ASSETS.",
  );
}

function drawCyclone(): void {
  const x = MX;
  const y = 874;
  const w = CW;
  const h = 88;
  fillRect(x, y, w, h, TEAL);
  drawTextCentred("CYCLONE AKVAN BEARS DOWN ON INDIA", 512, y + 12, 4, WHITE);
  drawTextCentred(
    "LANDFALL EXPECTED 20 NOVEMBER ON THE ANDHRA COAST; ODISHA EVACUATING",
    512,
    y + 52,
    2,
    WHITE,
  );
}

function drawFooter(): void {
  drawTextCentred("ALL EVENTS OF TUESDAY 17 NOVEMBER 2026", 512, 982, 2, NAVY);
}

function drawPage(): void {
  fillRect(0, 0, W, H, PAPER);
  drawMasthead();
  drawLead();
  drawGrid();
  drawCyclone();
  drawFooter();
}

function main(): void {
  drawPage();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.png"), encodePng());
}

main();
