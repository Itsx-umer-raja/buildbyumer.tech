/**
 * Standard PDF security handler, revision 2 (40-bit RC4, algorithm 3.2–3.5
 * of the PDF specification). This encrypts a PDF produced by pdf-lib so a
 * standard PDF reader asks for the password before opening it.
 *
 * The encryption dictionary and all string/stream objects are encrypted with
 * RC4 using per-object keys derived from the file key. The file is rebuilt
 * with a fresh cross-reference table.
 *
 * NOTE: 40-bit RC4 is the basic, widely compatible encryption level. It
 * stops casual opening without the password but is not strong by modern
 * standards. The Protect tool page says this plainly.
 */

// ---------------------------------------------------------------- MD5
const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const MD5_K: number[] = [];
for (let i = 0; i < 64; i++) {
  MD5_K.push(Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0);
}

function md5(input: Uint8Array): Uint8Array {
  const bitLen = input.length * 8;
  const paddedLen = (((input.length + 8) >> 6) + 1) << 6;
  const msg = new Uint8Array(paddedLen);
  msg.set(input);
  msg[input.length] = 0x80;
  const view = new DataView(msg.buffer);
  view.setUint32(paddedLen - 8, bitLen >>> 0, true);
  view.setUint32(paddedLen - 4, Math.floor(bitLen / 0x100000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const rotl = (x: number, c: number) => ((x << c) | (x >>> (32 - c))) >>> 0;
  const add = (x: number, y: number) => (x + y) >>> 0;

  for (let off = 0; off < paddedLen; off += 64) {
    const M: number[] = [];
    for (let j = 0; j < 16; j++) M.push(view.getUint32(off + j * 4, true));
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = add(add(add(F, A), MD5_K[i]), M[g]);
      A = D;
      D = C;
      C = B;
      B = add(B, rotl(F, MD5_S[i]));
    }
    a0 = add(a0, A);
    b0 = add(b0, B);
    c0 = add(c0, C);
    d0 = add(d0, D);
  }

  const out = new Uint8Array(16);
  const oview = new DataView(out.buffer);
  oview.setUint32(0, a0, true);
  oview.setUint32(4, b0, true);
  oview.setUint32(8, c0, true);
  oview.setUint32(12, d0, true);
  return out;
}

// ---------------------------------------------------------------- RC4
function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  const S = new Uint8Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key[i % key.length]) & 0xff;
    const t = S[i];
    S[i] = S[j];
    S[j] = t;
  }
  const out = new Uint8Array(data.length);
  let i = 0;
  j = 0;
  for (let n = 0; n < data.length; n++) {
    i = (i + 1) & 0xff;
    j = (j + S[i]) & 0xff;
    const t = S[i];
    S[i] = S[j];
    S[j] = t;
    out[n] = data[n] ^ S[(S[i] + S[j]) & 0xff];
  }
  return out;
}

// ---------------------------------------------------------------- helpers
const PADDING = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56,
  0xff, 0xfa, 0x01, 0x08, 0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80,
  0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

function padPassword(password: string): Uint8Array {
  // PDF passwords are byte strings (PDF spec algorithm 3.2 / 3.5): each
  // character is a SINGLE byte. Readers derive the key with the same rule —
  // pdfjs-dist's stringToBytes is `charCodeAt(i) & 0xff`. The old code used
  // TextEncoder (UTF-8), so e.g. "ä" became 2 bytes (0xC3 0xA4) here but
  // 1 byte (0xE4) in every reader, and the same password could never open
  // the file (B-08: user locks themselves out). Encode Latin-1 instead.
  // Characters above U+00FF have no single-byte form at all; encryptPdf
  // rejects those before calling this, so this never silently truncates one.
  const out = new Uint8Array(32);
  const n = Math.min(password.length, 32);
  for (let i = 0; i < n; i++) out[i] = password.charCodeAt(i) & 0xff;
  if (password.length < 32) out.set(PADDING.slice(0, 32 - password.length), password.length);
  return out;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToLatin1(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function latin1ToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(out);
  } else {
    for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  }
  return out;
}

/** Per-object RC4 key (algorithm 3.1). */
function objectKey(fileKey: Uint8Array, objNum: number, genNum: number): Uint8Array {
  const ext = new Uint8Array(fileKey.length + 5);
  ext.set(fileKey);
  ext[fileKey.length] = objNum & 0xff;
  ext[fileKey.length + 1] = (objNum >> 8) & 0xff;
  ext[fileKey.length + 2] = (objNum >> 16) & 0xff;
  ext[fileKey.length + 3] = genNum & 0xff;
  ext[fileKey.length + 4] = (genNum >> 8) & 0xff;
  return md5(ext).slice(0, Math.min(fileKey.length + 5, 16));
}

/** Encrypt the string literals / hex strings inside a non-stream object body. */
function encryptStringsInBody(body: string, key: Uint8Array): string {
  let out = "";
  let i = 0;
  while (i < body.length) {
    const ch = body[i];
    if (ch === "(") {
      // literal string — decode with escapes, then re-encode as hex
      let depth = 1;
      let j = i + 1;
      const raw: number[] = [];
      while (j < body.length && depth > 0) {
        const c = body[j];
        if (c === "\\" && j + 1 < body.length) {
          const n = body[j + 1];
          if (n === "n") raw.push(10);
          else if (n === "r") raw.push(13);
          else if (n === "t") raw.push(9);
          else if (n === "b") raw.push(8);
          else if (n === "f") raw.push(12);
          else if (n >= "0" && n <= "7") {
            let oct = n;
            let k = j + 2;
            while (k < j + 4 && k < body.length && body[k] >= "0" && body[k] <= "7") {
              oct += body[k];
              k++;
            }
            raw.push(parseInt(oct, 8) & 0xff);
            j = k - 1;
          } else raw.push(n.charCodeAt(0) & 0xff);
          j += 2;
          continue;
        }
        if (c === "(") depth++;
        else if (c === ")") {
          depth--;
          if (depth === 0) break;
        }
        if (depth > 0) raw.push(c.charCodeAt(0) & 0xff);
        j++;
      }
      const enc = rc4(key, new Uint8Array(raw));
      out += "<" + toHex(enc) + ">";
      i = j + 1;
    } else if (ch === "<" && body[i + 1] !== "<") {
      // hex string
      const end = body.indexOf(">", i);
      if (end === -1) {
        out += ch;
        i++;
        continue;
      }
      const hex = body.slice(i + 1, end).replace(/\s+/g, "");
      if (/^[0-9a-fA-F]*$/.test(hex) && hex.length > 0) {
        const padded = hex.length % 2 === 1 ? hex + "0" : hex;
        const raw = new Uint8Array(padded.length / 2);
        for (let k = 0; k < raw.length; k++) raw[k] = parseInt(padded.slice(k * 2, k * 2 + 2), 16);
        out += "<" + toHex(rc4(key, raw)) + ">";
      } else {
        out += body.slice(i, end + 1);
      }
      i = end + 1;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

/**
 * Encrypt a PDF (as produced by pdf-lib with `useObjectStreams: false`) with
 * the standard 40-bit RC4 handler. Returns new PDF bytes.
 */
export function encryptPdf(
  pdfBytes: Uint8Array,
  userPassword: string,
  ownerPassword?: string,
): Uint8Array {
  if (!userPassword) throw new Error("A password is required to protect a PDF.");
  // B-08: a password character above U+00FF (emoji, CJK, ✓, …) has no
  // single-byte PDF representation, so no reader can reliably reproduce the
  // key we would derive from it. Refuse loudly instead of producing a file
  // the same password cannot open. Latin-1 characters (ä, ß, é, …) are fine.
  for (const pw of [userPassword, ownerPassword]) {
    if (pw && /[^\x00-\xFF]/.test(pw)) {
      throw new Error(
        "Password contains a character (for example an emoji, Chinese/Japanese/Korean character or ✓) that PDF readers cannot represent in a password. Use Latin letters, digits and symbols instead — accented letters such as ä are fine.",
      );
    }
  }

  const userPad = padPassword(userPassword);
  const ownerPad = padPassword(ownerPassword || userPassword);
  const ownerKey = md5(ownerPad).slice(0, 5);
  const oValue = rc4(ownerKey, userPad);

  // File identifier (two identical entries in the trailer).
  const seed = new Uint8Array(16 + 8);
  seed.set(randomBytes(16));
  const now = Date.now();
  for (let i = 0; i < 8; i++) seed[16 + i] = (now >> (i * 8)) & 0xff;
  const fileId = md5(seed);

  // Permissions: -4 (print, copy, modify and annotate allowed).
  const P = -4;
  const pBytes = new Uint8Array(4);
  new DataView(pBytes.buffer).setInt32(0, P, true);

  const keyInput = new Uint8Array(32 + 32 + 4 + 16);
  keyInput.set(userPad, 0);
  keyInput.set(oValue, 32);
  keyInput.set(pBytes, 64);
  keyInput.set(fileId, 68);
  const fileKey = md5(keyInput).slice(0, 5);
  const uValue = rc4(fileKey, PADDING);

  const src = bytesToLatin1(pdfBytes);
  const headerMatch = src.match(/^%PDF-[\d.]+/);
  const header = headerMatch ? headerMatch[0] : "%PDF-1.7";

  const rootMatch = src.match(/\/Root\s+(\d+)\s+(\d+)\s+R/);
  if (!rootMatch) throw new Error("Could not find the document catalog in this PDF.");
  const rootRef = `${rootMatch[1]} ${rootMatch[2]} R`;
  const infoMatch = src.match(/\/Info\s+(\d+)\s+(\d+)\s+R/);
  const infoRef = infoMatch ? `${infoMatch[1]} ${infoMatch[2]} R` : null;

  interface Obj {
    num: number;
    gen: number;
    body: string; // latin1 string, already encrypted where applicable
  }
  const objects: Obj[] = [];
  const objRe = /(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/g;
  let m: RegExpExecArray | null;
  let maxNum = 0;
  while ((m = objRe.exec(src)) !== null) {
    const num = parseInt(m[1], 10);
    const gen = parseInt(m[2], 10);
    maxNum = Math.max(maxNum, num);
    const rawBody = m[3];
    const key = objectKey(fileKey, num, gen);
    // Split off a stream, if present.
    const streamIdx = rawBody.search(/\bstream\r?\n/);
    let body: string;
    if (streamIdx === -1) {
      body = encryptStringsInBody(rawBody, key);
    } else {
      const marker = rawBody.slice(streamIdx).match(/\bstream(\r?\n)/);
      const markerLen = (marker ? marker[0].length : 7) - (marker ? marker[1].length : 1);
      void markerLen;
      const streamStart = streamIdx + (marker ? marker[0].length : 7);
      const endIdx = rawBody.lastIndexOf("endstream");
      const dictPart = rawBody.slice(0, streamIdx);
      const streamData = latin1ToBytes(rawBody.slice(streamStart, endIdx));
      // Trim the trailing newline before endstream (it is not stream data).
      let data = streamData;
      if (data.length > 0 && data[data.length - 1] === 0x0a) data = data.slice(0, -1);
      if (data.length > 0 && data[data.length - 1] === 0x0d) data = data.slice(0, -1);
      const encStream = rc4(key, data);
      const after = rawBody.slice(endIdx);
      body =
        encryptStringsInBody(dictPart, key) +
        "stream\n" +
        bytesToLatin1(encStream) +
        "\n" +
        after;
    }
    objects.push({ num, gen, body });
  }
  if (objects.length === 0) throw new Error("No objects found in this PDF.");

  // Encryption dictionary object.
  const encryptNum = maxNum + 1;
  const encryptBody = `<< /Filter /Standard /V 1 /R 2 /Length 40 /O <${toHex(oValue)}> /U <${toHex(uValue)}> /P ${P} >>`;
  objects.push({ num: encryptNum, gen: 0, body: `\n${encryptBody}\n` });

  objects.sort((a, b) => a.num - b.num);

  // Rebuild the file with a fresh xref table.
  let out = header + "\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  const size = maxNum + 2;
  for (const obj of objects) {
    offsets[obj.num] = latin1ToBytes(out).length;
    out += `${obj.num} ${obj.gen} obj${obj.body}endobj\n`;
  }
  const xrefPos = latin1ToBytes(out).length;
  out += "xref\n";
  out += `0 ${size}\n`;
  for (let i = 0; i < size; i++) {
    if (i === 0 || offsets[i] === undefined) {
      out += "0000000000 65535 f \n";
    } else {
      out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
  }
  const idHex = toHex(fileId);
  out += "trailer\n";
  out += `<< /Size ${size} /Root ${rootRef}${infoRef ? ` /Info ${infoRef}` : ""} /Encrypt ${encryptNum} 0 R /ID [<${idHex}><${idHex}>] >>\n`;
  out += "startxref\n";
  out += `${xrefPos}\n`;
  out += "%%EOF\n";
  return latin1ToBytes(out);
}

/** Quick check: does this PDF carry an /Encrypt dictionary? */
export function looksEncrypted(pdfBytes: Uint8Array): boolean {
  // The trailer (which holds /Encrypt) sits at the end of the file; check a
  // generous tail window plus the head. 16 KB covers trailers with long
  // metadata / ID strings that a 4 KB window could miss.
  const head = bytesToLatin1(pdfBytes.slice(0, Math.min(pdfBytes.length, 4096)));
  if (head.includes("/Encrypt")) return true;
  const tail = bytesToLatin1(pdfBytes.slice(Math.max(0, pdfBytes.length - 16384)));
  return tail.includes("/Encrypt");
}
