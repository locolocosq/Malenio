/* Echo Party – Ähnlichkeits-Bewertung von zwei Tonaufnahmen (0–100).
 * Verglichen werden: Lautstärke-Verlauf, Tonhöhen-Melodie (unabhängig von der Stimmlage),
 * Klangfarbe (rauschig/hell vs. tonal) und die Länge. Beide Aufnahmen werden vorher auf
 * 16 kHz gebracht und Stille am Anfang/Ende wird entfernt. Funktioniert im Browser und in Node.
 */
(function (root) {
  'use strict';
  const SR = 16000;          // Analyse-Abtastrate
  const HOP = 320;           // 20 ms
  const WIN = 1024;          // Analysefenster

  // einfache Umrechnung auf 16 kHz (lineare Interpolation, vorher grob tiefpassgefiltert)
  function resample(data, from) {
    if (from === SR) return Float32Array.from(data);
    const ratio = from / SR, n = Math.floor(data.length / ratio), out = new Float32Array(n);
    const k = Math.max(1, Math.round(ratio)); // gleitender Mittelwert als Tiefpass
    let acc = 0; const sm = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) { acc += data[i]; if (i >= k) acc -= data[i - k]; sm[i] = acc / Math.min(i + 1, k); }
    for (let i = 0; i < n; i++) { const x = i * ratio, i0 = Math.floor(x), f = x - i0; out[i] = sm[i0] * (1 - f) + (sm[i0 + 1] || 0) * f; }
    return out;
  }

  // Tonhöhe per normalisierter Autokorrelation (70–1000 Hz)
  function pitchOf(buf, off) {
    const minLag = Math.floor(SR / 1000), maxLag = Math.floor(SR / 70), N = WIN - maxLag;
    let e0 = 0; for (let i = 0; i < N; i++) e0 += buf[off + i] * buf[off + i];
    if (e0 < 1e-7) return [0, 0];
    let best = 0, bestLag = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let c = 0, e1 = 0;
      for (let i = 0; i < N; i++) { const b = buf[off + i + lag]; c += buf[off + i] * b; e1 += b * b; }
      const r = c / Math.sqrt(e0 * e1 + 1e-12);
      if (r > best) { best = r; bestLag = lag; }
    }
    return bestLag ? [SR / bestLag, best] : [0, 0];
  }

  // Merkmale pro 20-ms-Schritt
  function features(samples, sampleRate) {
    const x = resample(samples, sampleRate);
    const frames = [];
    for (let off = 0; off + WIN <= x.length; off += HOP) {
      let s = 0, z = 0;
      for (let i = 0; i < WIN; i++) { const v = x[off + i]; s += v * v; if (i && (v >= 0) !== (x[off + i - 1] >= 0)) z++; }
      const rms = Math.sqrt(s / WIN);
      frames.push({ db: 20 * Math.log10(rms + 1e-6), zcr: z / WIN, off });
    }
    if (!frames.length) return null;
    const maxDb = Math.max(...frames.map((f) => f.db));
    if (maxDb < -50) return null; // praktisch Stille
    // Stille am Anfang/Ende abschneiden
    let a = 0, b = frames.length - 1;
    while (a < b && frames[a].db < maxDb - 30) a++;
    while (b > a && frames[b].db < maxDb - 30) b--;
    const fr = frames.slice(a, b + 1);
    for (const f of fr) {
      f.loud = Math.max(0, Math.min(1, (f.db - maxDb + 40) / 40));
      f.bright = Math.min(1, f.zcr / 0.25);
      const [hz, conf] = f.loud > 0.35 ? pitchOf(x, f.off) : [0, 0];
      f.hz = conf > 0.62 ? hz : 0;
    }
    const voiced = fr.filter((f) => f.hz);
    const med = voiced.length ? voiced.map((f) => f.hz).sort((p, q) => p - q)[voiced.length >> 1] : 0;
    for (const f of fr) f.st = f.hz && med ? 12 * Math.log2(f.hz / med) : null; // Halbtöne relativ zur eigenen Stimmlage
    return { frames: fr, voicedFrac: voiced.length / fr.length, seconds: fr.length * HOP / SR, maxDb, medHz: med };
  }

  // Dynamic Time Warping mit Band – erlaubt etwas schneller/langsamer
  function dtwCost(A, B, wL, wZ, wP) {
    const n = A.length, m = B.length, band = Math.max(8, Math.ceil(Math.max(n, m) * 0.35));
    const INF = 1e9; let prev = new Float64Array(m + 1).fill(INF), cur = new Float64Array(m + 1);
    let prevLen = new Float64Array(m + 1), curLen = new Float64Array(m + 1);
    prev[0] = 0;
    for (let i = 1; i <= n; i++) {
      cur.fill(INF); curLen.fill(0);
      const center = Math.round(i * m / n), j0 = Math.max(1, center - band), j1 = Math.min(m, center + band);
      for (let j = j0; j <= j1; j++) {
        const a = A[i - 1], b = B[j - 1];
        let pc;
        if (a.st !== null && b.st !== null) pc = Math.min(Math.abs(a.st - b.st), 12) / 12;
        else if (a.st === null && b.st === null) pc = 0; else pc = 0.45;
        const c = wL * Math.abs(a.loud - b.loud) + wZ * Math.abs(a.bright - b.bright) + wP * pc;
        let best = prev[j - 1], bl = prevLen[j - 1];
        if (prev[j] < best) { best = prev[j]; bl = prevLen[j]; }
        if (cur[j - 1] < best) { best = cur[j - 1]; bl = curLen[j - 1]; }
        cur[j] = best + c; curLen[j] = bl + 1;
      }
      [prev, cur] = [cur, prev]; [prevLen, curLen] = [curLen, prevLen];
    }
    return prev[m] >= INF ? 1 : prev[m] / Math.max(1, prevLen[m]);
  }

  // Ergebnis 0–100
  function compare(ref, rec) {
    if (!ref || !rec || rec.frames.length < 5) return 0;
    const v = ref.voicedFrac;
    // Lautstärke-Verlauf und Tonhöhe zählen stark, Klangfarbe weniger
    const wL = 1.6, wZ = 0.4, wP = 0.5 + 1.8 * v;
    const cost = dtwCost(ref.frames, rec.frames, wL, wZ, wP) / (wL + wZ + wP);
    const ratio = rec.seconds / Math.max(0.2, ref.seconds);
    const lenFactor = Math.exp(-Math.abs(Math.log(ratio)) * 0.9);
    // Tonlage: bis 5 Halbtöne Unterschied frei, danach Abzug (hohe Töne hoch, tiefe Töne tief nachmachen)
    let pitchFactor = 1;
    if (ref.medHz && rec.medHz) pitchFactor = Math.exp(-Math.max(0, Math.abs(12 * Math.log2(rec.medHz / ref.medHz)) - 5) / 14);
    else if (ref.medHz && !rec.medHz && v > 0.4) pitchFactor = 0.6; // Ton war gesungen/gepfiffen, Nachahmung ohne Ton
    // Lautstärke: zu leise (geflüstert) gibt Abzug
    const volFactor = Math.max(0.35, Math.min(1, (rec.maxDb + 42) / 22));
    const sim = Math.exp(-cost * 4.5) * (0.55 + 0.45 * lenFactor) * (0.6 + 0.4 * pitchFactor) * volFactor;
    return Math.round(100 * Math.max(0, Math.min(1, (sim - 0.12) / 0.78)));
  }

  const api = { SR, features, compare, resample };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.EchoScore = api;
})(typeof window !== 'undefined' ? window : globalThis);
