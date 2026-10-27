// @ts-nocheck — moved from v1.1.0; not fully typed yet. `npm run typecheck` still fails on any unresolved shared name (tools/check-names.mjs).
/* घोषदंड संकेत — the घोष प्रमुख figure (style C, in uniform) and the 8 signals of घोष परिचय pp. 28–36.
   Model frame (the प्रमुख's own): x = his right, y = up (ground 0), z = forward (towards the band). Units ≈ cm × 1.1.
   A pose gives hand targets; arms are solved with two-bone IK, the staff is placed from its grip. */
  const L = 150;                       // staff: about shoulder height (p. 27)
  const UA = 38, FA = 36;              // upper arm, forearm (+ hand)
  const SH = { r: [22, 150, 0], l: [-22, 150, 0] };
  const add = (a, b) => a.map((v, i) => v + b[i]), sub = (a, b) => a.map((v, i) => v - b[i]), mul = (a, k) => a.map(v => v * k);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = a => Math.sqrt(dot(a, a)), nrm = a => mul(a, 1 / (len(a) || 1));
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const deg = (d, e, z = 0) => { const r = d * Math.PI / 180; return [Math.cos(r), Math.sin(r), z]; };   // in the x-y plane, d° above his right

  function ik(S, T, pole) {
    let v = sub(T, S), d = len(v); const u = nrm(v);
    d = Math.max(Math.abs(UA - FA) + 1, Math.min(UA + FA - .01, d)); const Tc = add(S, mul(u, d));
    const ca = (UA * UA + d * d - FA * FA) / (2 * UA * d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
    let n = sub(pole, mul(u, dot(pole, u))); if (len(n) < 1e-3) n = cross(u, [0, 0, 1]); n = nrm(n);
    return { S, E: add(add(S, mul(u, UA * ca)), mul(n, UA * sa)), H: Tc };
  }
  /* staff: grip = hand ('r'|'l'), dir = tail → कलश, f = grip point measured from the tail (0 = शेषपुच्छ, 1 = कलश) */
  function staffOf(p, hands) {
    const s = p.staff, H = hands[s.grip || 'r'], d = nrm(s.dir);
    return { tail: sub(H, mul(d, s.f * L)), top: add(H, mul(d, (1 - s.f) * L)), d };
  }
  const onStaff = (st, f) => add(st.tail, mul(st.d, f * L));

  /* ---------- poses (book text, घोष परिचय) ---------- */
  const DOWN_L = { to: [-25, 78, 2], pole: [0, 0, -1] };     // left arm hanging (दक्ष)
  const DOWN_R = { to: [25, 78, 2], pole: [0, 0, -1] };
  const PRANAM_POLE = [1, -.4, .1];
  const P = {
    daksh: { r: { to: [22, 112, 36], pole: [0, -1, -.2] }, l: DOWN_L, staff: { dir: [0, 1, 0], f: 112 / L } },
    carry: { r: { to: [22, 116, 32], pole: [0, -1, -.2] }, l: DOWN_L, staff: { dir: [0, 1, 0], f: .66 } },   // while marching: staff held clear of the ground (not a signal)
    vadananta1: { r: { to: [15, 223, 2], pole: [1, 0, 0] }, l: DOWN_L, staff: { dir: [0, 1, 0], f: .03 } },
    vadananta2: { r: { to: [22, 112, 36], pole: [0, -1, -.2] }, l: DOWN_L, staff: { dir: [0, 1, 0], f: .03 } },
    anak: { r: { to: [17, 80, 14], pole: [.3, 0, -1] }, l: { staff: .45, pole: [-.3, 0, -1] }, staff: { dir: [1, 0, 0], f: .75 } },
    vanshi: { r: { to: [17, 152, 15], pole: [.2, -1, .3] }, l: { staff: .52, pole: [-.2, -1, .3] }, staff: { dir: [1, 0, 0], f: .75 } },
    shankh: { r: { to: [17, 222, 6], pole: [1, 0, 0] }, l: { staff: .52, pole: [-1, 0, 0] }, staff: { dir: [1, 0, 0], f: .75 } },
    shring: { r: { to: [22, 202, 52], pole: [1, -1, 0] }, l: { to: [-22, 150, 72], pole: [-1, -1, 0] }, staff: { dir: [44, 52, -20], f: .78 }, lOnStaff: true },
    prachal1: { r: { to: [15, 223, 2], pole: [1, 0, 0] }, l: DOWN_L, staff: { dir: [0, -1, 0], f: .93 } },
    prachal2: { r: { to: [22, 166, 26], pole: [.2, -1, .4] }, l: DOWN_L, staff: { dir: [0, -1, 0], f: .93 } },
    mandchal1: { r: { to: add(SH.r, mul(deg(45), 74)), pole: [0, -1, 0] }, l: DOWN_L, staff: { dir: mul(deg(45), -1), f: .93 } },
    mandchal2: { r: { at: 'kalashChest' }, l: DOWN_L, staff: { dir: mul(deg(45), -1), f: .93 } },
    stambh1: { r: { to: add(SH.r, mul(deg(20), 74)), pole: [0, -1, 0] }, l: DOWN_L, staff: { aimTop: [0, 0, 0], f: .03 } },
    stambh2: { r: { to: [-4, 136, 24], pole: PRANAM_POLE }, l: DOWN_L, staff: { keepTopOf: 'stambh1', f: .03 }, step: 'R' },
    dakshinBhram: { r: { to: [12, 147, 12], pole: PRANAM_POLE }, l: { to: [-94, 148, 9], pole: [0, -1, 0] }, staff: { dir: [1, 0, .02], f: .9 } },
    gatyantar1: { r: { to: add(SH.r, mul(deg(45), 74)), pole: [0, -1, 0] }, l: DOWN_L, staff: { dir: deg(45), f: .1 } },
    gatyantar2: { r: { to: [4, 136, 24], pole: PRANAM_POLE }, l: DOWN_L, staff: { dir: deg(45), f: .1 } },
  };
  // मंदचल 2: staff keeps its angle, कलश in front of the chest; the hand is just above the कलश
  { const d = nrm(mul(deg(45), -1)), kal = [3, 128, 26]; P.mandchal2.r = { to: sub(kal, mul(d, .07 * L)), pole: [1, -1, .2] }; }
  // स्तभ् 1: the staff slants so the कलश is over the head
  { const H = P.stambh1.r.to, top = [2, 0, 0]; const dx = top[0] - H[0]; top[1] = H[1] + Math.sqrt(L * L * .97 * .97 - dx * dx); P.stambh1.staff.dir = sub(top, H); P.stambh1._top = top; }
  { const H = P.stambh2.r.to, top = P.stambh1._top; P.stambh2.staff.dir = sub(top, H); }
  // वाम भ्रम = दक्षिण भ्रम mirrored
  const mirror = v => [-v[0], v[1], v[2]];
  P.vamBhram = { r: { to: mirror(P.dakshinBhram.l.to), pole: [0, -1, 0] }, l: { to: mirror(P.dakshinBhram.r.to), pole: mirror(PRANAM_POLE) }, staff: { dir: mirror(P.dakshinBhram.staff.dir), f: .9, grip: 'l' } };

  function solve(p) {
    const hands = {};
    const arm = (side, a) => { if (!a || a.staff != null) return null; const s = ik(SH[side], a.to, a.pole); hands[side] = s.H; return s; };
    const R = arm('r', p.r), Lf = arm('l', p.l);
    const st = staffOf(p, hands);
    const out = { r: R, l: Lf, staff: { ...st, f: p.staff.f, grip: p.staff.grip || 'r' }, step: p.step, freeL: p.l === DOWN_L };
    if (p.l && p.l.staff != null) out.l = ik(SH.l, onStaff(st, p.l.staff), p.l.pole);
    return out;
  }

  /* ---------- drawing ---------- */
  const C = { shirt: '#F4F2EC', shirtLine: '#A9A79E', trouser: '#7A4A1F', belt: '#26241F', skin: '#C98E5B', cap: '#1F1E1B', shoe: '#1F1E1B',
              shaft: '#7B4B22', metal: '#8C8A84', kalash: '#E3A21A', kalashLine: '#9A6A08' };
  const f1 = n => Math.round(n * 10) / 10;
  function project(view) { return view === 'side' ? (q => [q[2], -q[1], q[0]]) : (view === 'pramukh' ? (q => [q[0], -q[1], -q[2]]) : (q => [-q[0], -q[1], q[2]])); }
  const line = (a, b, col, w, cap = 'round') => `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${col}" stroke-width="${w}" stroke-linecap="${cap}"/>`;
  function svg(name, opt = {}) { return draw(solve(typeof name === 'string' ? P[name] : name), opt); }
  function draw(s, opt = {}) {
    const view = opt.view || 'front', pr = project(view);
    const items = [];   // [depth, svg]
    const push = (depth, str) => items.push([depth, str]);
    const pt = q => pr(q);
    // legs
    const legs = s.legs || { R: { lift: 0, z: s.step === 'R' ? 28 : 0 }, L: { lift: 0, z: 0 } };
    [['R', 9], ['L', -9]].forEach(([k, x]) => {
      const lg = legs[k] || { lift: 0, z: 0 }, z = lg.z || 0, th = (lg.lift || 0) * 1.25;   // thigh raised by up to ~70°
      const hipW = [x, 97, 0], kneeW = th ? [x, 97 - 47 * Math.cos(th), 47 * Math.sin(th)] : [x, 50, z * .5];
      const footW = th ? [x, kneeW[1] - 44, kneeW[2] - 4] : [x, 6, z];
      const hip = pt(hipW), knee = pt(kneeW), foot = pt(footW), toe = pt([footW[0], footW[1] - 3, footW[2] + 9]);
      push(knee[2] - 1, line(hip, knee, C.trouser, 15) + line(knee, foot, C.trouser, 14) + line(foot, toe, C.shoe, 9));
    });
    // torso
    { const a = pt([-22, 152, 0]), b = pt([22, 152, 0]), c = pt([16, 98, 0]), d = pt([-16, 98, 0]);
      let body;
      if (view === 'side') { const z0 = -11, z1 = 12; body = `<path d="M${f1(z0)} ${-153} L${z1} ${-153} L${z1 - 1} ${-98} L${z0 + 1} ${-98} Z" fill="${C.shirt}" stroke="${C.shirtLine}" stroke-width="1"/>` + line([z0 + 1, -97], [z1 - 1, -97], C.belt, 5, 'butt') + line([z0 + 1, -101], [z1 - 1, -101], C.belt, 1.5, 'butt'); }
      else body = `<path d="M${f1(a[0])} ${f1(a[1])} L${f1(b[0])} ${f1(b[1])} L${f1(c[0])} ${f1(c[1])} L${f1(d[0])} ${f1(d[1])} Z" fill="${C.shirt}" stroke="${C.shirtLine}" stroke-width="1" stroke-linejoin="round"/>`
        + `<line x1="0" y1="-150" x2="0" y2="-99" stroke="${C.shirtLine}" stroke-width=".8"/>` + line([d[0], -97], [c[0], -97], C.belt, 5, 'butt');
      push(0, body); }
    // head (with black cap)
    { const h = pt([0, 171, 0]);
      let head = `<rect x="${f1(h[0] - 4)}" y="${f1(h[1] + 6)}" width="8" height="9" fill="${C.skin}"/>` + `<circle cx="${f1(h[0])}" cy="${f1(h[1])}" r="11.5" fill="${C.skin}"/>`;
      const cx = h[0], cy = h[1];
      // संघ टोपी: black, rises to a soft ridge (front/back), a long low boat from the side
      const capFront = `<path d="M${f1(cx - 12.5)} ${f1(cy - 3)} L${f1(cx - 9)} ${f1(cy - 15)} Q${f1(cx)} ${f1(cy - 25)} ${f1(cx + 9)} ${f1(cy - 15)} L${f1(cx + 12.5)} ${f1(cy - 3)} Q${f1(cx)} ${f1(cy - 6)} ${f1(cx - 12.5)} ${f1(cy - 3)} Z" fill="${C.cap}"/>`
        + `<path d="M${f1(cx - 4)} ${f1(cy - 19.5)} Q${f1(cx)} ${f1(cy - 15)} ${f1(cx + 4)} ${f1(cy - 19.5)}" stroke="#3A3833" stroke-width="1" fill="none"/>`;
      if (view === 'side') head += `<circle cx="${f1(cx + 6)}" cy="${f1(cy + 1)}" r="1.3" fill="#2A1A10"/><path d="M${f1(cx + 10)} ${f1(cy - 1)} l4 4 l-4 1 Z" fill="${C.skin}"/>`
        + `<path d="M${f1(cx - 14)} ${f1(cy - 2)} L${f1(cx - 11)} ${f1(cy - 15)} Q${f1(cx)} ${f1(cy - 17)} ${f1(cx + 9)} ${f1(cy - 15)} L${f1(cx + 13)} ${f1(cy - 5)} Q${f1(cx)} ${f1(cy - 7)} ${f1(cx - 14)} ${f1(cy - 2)} Z" fill="${C.cap}"/>`;
      else if (view === 'pramukh') head += `<circle cx="${f1(cx)}" cy="${f1(cy - 1)}" r="11.6" fill="#2B2116"/><rect x="${f1(cx - 4)}" y="${f1(cy + 8)}" width="8" height="7" fill="${C.skin}"/>` + capFront;
      else head += `<circle cx="${f1(cx - 4)}" cy="${f1(cy + 1)}" r="1.4" fill="#2A1A10"/><circle cx="${f1(cx + 4)}" cy="${f1(cy + 1)}" r="1.4" fill="#2A1A10"/><path d="M${f1(cx - 3)} ${f1(cy + 6)} Q${f1(cx)} ${f1(cy + 7.5)} ${f1(cx + 3)} ${f1(cy + 6)}" stroke="#2A1A10" stroke-width="1" fill="none"/>` + capFront;
      push(.5, head); }
    // arms
    const arm = a => { if (!a) return; const S = pt(a.S), E = pt(a.E), H = pt(a.H);
      const sl = line(S, E, C.shirtLine, 12) + line(S, E, C.shirt, 10) + line(E, H, C.shirtLine, 11) + line(E, H, C.shirt, 9);
      push((S[2] + E[2] + H[2]) / 3 + .2, sl);
      push(H[2] + .6, `<circle cx="${f1(H[0])}" cy="${f1(H[1])}" r="5.2" fill="${C.skin}"/>`); };
    arm(s.r); arm(s.l);
    // staff: wooden शेष, metal शेषपुच्छ, golden कलश
    { const T = pt(s.staff.tail), K = pt(s.staff.top), d3 = s.staff.d, dd = nrm(sub(K, T).slice(0, 2).concat([0]));
      const near = add(s.staff.tail, mul(d3, 14)), N = pt(near), kc = add(s.staff.top, mul(d3, 7)), KC = pt(kc), nk = pt(add(s.staff.top, mul(d3, 14)));
      const g = line(T, K, C.shaft, 4) + line(T, N, C.metal, 4.5) + `<circle cx="${f1(KC[0])}" cy="${f1(KC[1])}" r="8.5" fill="${C.kalash}" stroke="${C.kalashLine}" stroke-width="1.2"/>`
        + `<circle cx="${f1(nk[0])}" cy="${f1(nk[1])}" r="2.6" fill="${C.kalash}" stroke="${C.kalashLine}" stroke-width=".8"/>`;
      push((T[2] + K[2]) / 2 + .1, g); }
    items.sort((a, b) => a[0] - b[0]);
    const vb = view === 'side' ? '-95 -392 200 402' : '-190 -392 380 402';
    const ground = view === 'side' ? '<line x1="-90" y1="0" x2="100" y2="0" stroke="currentColor" stroke-opacity=".25" stroke-width="1.5"/>' : '<line x1="-180" y1="0" x2="180" y2="0" stroke="currentColor" stroke-opacity=".25" stroke-width="1.5"/>';
    return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${opt.label || ''}">${ground}${items.map(x => x[1]).join('')}</svg>`;
  }

  /* ---------- the 8 signals (घोष परिचय pp. 28–36) ----------
     Text: { mr, hi, en }. The book's own words (book) stay in Hindi in every language. */
  const tr = (mr, hi, en) => ({ mr, hi, en });
  const PH = { pre: tr('पूर्वसूचना', 'पूर्वसूचना', 'Advance notice'), s: tr('सूचना', 'सूचना', 'Notice'), do: tr('पालनार्थ', 'पालनार्थ', 'Execute'), base: tr('स्थिती', 'स्थिति', 'Position') };
  const SIGNALS = [
    { id: 'daksh', n: 0, name: tr('दक्ष (घोषदंडासह)', 'दक्ष (घोषदंड सहित)', 'दक्ष — attention, with the staff'), page: 28,
      steps: [{ pose: 'daksh', ph: 'base', book: 'घोषदंड दाहिने हाथ में, दाहिना प्रकोष्ठ जमीन से समानांतर, दाहिनी कोहनी में समकोण … शेषपुच्छ दाहिनी पादांगुलि के पास जमीन पर।' }],
      does: tr('सर्व संकेतांची मूळ स्थिती.', 'सब संकेतों की मूल स्थिति।', 'The starting position for every signal.') },
    { id: 'vadananta', n: 1, name: tr('वादनान्त', 'वादनान्त', 'वादनान्त — stop playing'), page: 30, steps: [
      { pose: 'vadananta1', ph: 's', book: 'शेषपुच्छ दाहिने हाथ में, तर्जनी घोषदंड पर कलश की ओर, हाथ कर्णरेखा में सीधा ऊपर, कलश आकाश की ओर।' },
      { pose: 'vadananta2', ph: 'do', book: 'दाहिना हाथ नीचे लाना, प्रकोष्ठ जमीन से समानांतर, भुजा शरीर से सटी हुई, घोषदंड जमीन से लंबरूप।' }],
      when: tr('पालनार्थ: सामान्यतः चरणाच्या शेवटच्या गणाच्या सुरुवातीला.', 'पालनार्थ: सामान्यतः चरण के अंतिम गण के आरंभ में।', 'Execute: normally at the start of the charan’s last gan.'),
      does: tr('चरण संपल्यावर वादन थांबते; चालताना संचलन सुरू राहते.', 'चरण समाप्त होने पर वादन रुकता है; चलते समय संचलन जारी रहता है।', 'Playing stops at the end of the charan; marching goes on.') },
    { id: 'nirdesh', n: 2, name: tr('वाद्यनिर्देश', 'वाद्यनिर्देश', 'वाद्यनिर्देश — instrument'), page: 31, steps: [
      { pose: 'anak', ph: 'pre', label: tr('आनक', 'आनक', 'आनक (drum)'), book: 'घोषदंड दोनों हाथों में जमीन से समानांतर; हाथ सीधे नीचे।' },
      { pose: 'vanshi', ph: 'pre', label: tr('वंशी', 'वंशी', 'वंशी (flute)'), book: 'घोषदंड कंधों के सामने जमीन से समानांतर; हाथ कोहनी में पूर्णतः मुड़े हुए।' },
      { pose: 'shankh', ph: 'pre', label: tr('शंख', 'शंख', 'शंख (bugle)'), book: 'हाथ कर्णरेखा में सीधे ऊपर, घोषदंड जमीन से समानांतर।' },
      { pose: 'shring', ph: 'pre', label: tr('शृंग', 'शृंग', 'शृंग (horn)'), book: 'बायां हाथ कंधे की सीध में सामने; घोषदंड जमीन से लगभग 45°, दाहिना हाथ सीधा सामने से ऊपर तिरछा।' }],
      does: tr('फक्त पूर्वसूचना — पुढे कोणते वाद्य वाजणार ते सांगते.', 'केवल पूर्वसूचना — आगे कौन सा वाद्य बजेगा यह बताती है।', 'Advance notice only — which instrument plays next.') },
    { id: 'nirdeshVadananta', n: 3, name: tr('वाद्यनिर्देश सहित वादनान्त', 'वाद्यनिर्देश सहित वादनान्त', 'वाद्यनिर्देश सहित वादनान्त — change instrument'), page: 32, seq: [
      { pose: 'shankh', count: '१–८', ph: 'pre', label: tr('वाद्यनिर्देश (उदा. शंख)', 'वाद्यनिर्देश (उदा. शंख)', 'Instrument (e.g. शंख)') }, { pose: null, count: '९–१०', label: tr('हात बदलणे', 'हाथ बदलना', 'Change hands') },
      { pose: 'vadananta1', count: '११–१४', ph: 's', label: tr('वादनान्त सूचना', 'वादनान्त सूचना', 'Stop: notice') }, { pose: 'vadananta2', count: '१५', ph: 'do', label: tr('पालनार्थ', 'पालनार्थ', 'Execute') }, { pose: null, count: '१६', label: tr('अंतर', 'अंतर', 'Gap') }],
      does: tr('मग रणन, आणि सांगितलेल्या वाद्यावर पूर्वघोषित रचना.', 'फिर रणन, और निर्दिष्ट वाद्य पर पूर्वघोषित रचना।', 'Then the रणन, and the announced rachana on the named instrument.') },
    { id: 'chal', n: 4, name: tr('चल — प्रचल / मंदचल', 'चल — प्रचल / मंदचल', 'चल — march (प्रचल / मंदचल)'), page: 33, steps: [
      { pose: 'prachal1', ph: 'pre', label: tr('प्रचल', 'प्रचल', 'प्रचल'), book: 'शेषपुच्छ आकाश की ओर, दाहिना हाथ कर्णरेखा में सीधा ऊपर, कलश कंधे के ऊपर किन्तु दूर।' },
      { pose: 'prachal2', ph: 'do', label: tr('प्रचल', 'प्रचल', 'प्रचल'), book: 'दाहिना हाथ कोहनी में मोड़कर कलश कंधे के निकट सामने की ओर, घोषदंड लंबरूप।' },
      { pose: 'mandchal1', ph: 's', label: tr('मंदचल', 'मंदचल', 'मंदचल'), book: 'प्रचल ‘1’ जैसी पकड़; घोषदंड सहित सीधा दाहिना हाथ दाहिनी ओर तिरछा, करीब 135°।' },
      { pose: 'mandchal2', ph: 'do', label: tr('मंदचल', 'मंदचल', 'मंदचल'), book: 'घोषदंड की स्थिति वही; दाहिना हाथ कोहनी में मोड़कर, कलश सीने के सामने।' }],
      when: tr('उजव्या पायावर पूर्ण झाल्यास पुढच्या डाव्या पायाने चालणे; डाव्यावर पूर्ण झाल्यास एक उजवा सोडून पुढच्या डाव्याने.', 'दाहिने पैर पर पूर्ण हो तो अगले बाएं पैर से; बाएं पर पूर्ण हो तो एक दाहिना छोड़कर अगले बाएं से।', 'Completed on a right foot: step off with the next left. On a left foot: skip one right, then the next left.'),
      does: tr('संचलन सुरू होते.', 'संचलन प्रारंभ होता है।', 'The band moves off.') },
    { id: 'stambh', n: 5, name: tr('स्तभ्', 'स्तभ्', 'स्तभ् — halt'), page: 34, steps: [
      { pose: 'stambh1', ph: 's', book: 'शेषपुच्छ पकड़कर हाथ सीधा बाजू में तिरछा, शरीर से लगभग 110°; कलश सिर पर आवे इस प्रकार घोषदंड तिरछा।' },
      { pose: 'stambh2', ph: 'do', book: 'कलश उसी बिंदु पर; दाहिना पैर आगे लाते समय दाहिना हाथ और शेषपुच्छ सीने के सामने — प्रणाम जैसी स्थिति।' }],
      when: tr('मग त्याच तालात डावा पाय पुढे, उजवा त्याला जोडणे.', 'फिर उसी ताल में बायां पैर आगे, दाहिना उससे मिलाना।', 'Then, in time, left foot forward and the right joins it.'),
      does: tr('संचलन थांबते; वादन चालू राहते.', 'संचलन रुकता है; वादन जारी रहता है।', 'Marching stops; playing goes on.') },
    { id: 'vadanantaStambh', n: 6, name: tr('वादनान्त सहित स्तभ्', 'वादनान्त सहित स्तभ्', 'वादनान्त सहित स्तभ् — stop and halt'), page: 34, seq: [
      { pose: 'vadananta1', ph: 's', label: tr('वादनान्त सूचना', 'वादनान्त सूचना', 'Stop: notice') }, { pose: 'stambh1', ph: 's', label: tr('थेट स्तभ् सूचना', 'सीधे स्तभ् सूचना', 'Straight to halt notice') }, { pose: 'stambh2', ph: 'do', label: tr('स्तभ् पालनार्थ', 'स्तभ् पालनार्थ', 'Halt: execute') }],
      when: tr('वादनान्त-सूचनेतून हात खाली न आणता थेट स्तभ्-सूचनेकडे.', 'वादनान्त-सूचना से हाथ नीचे लाए बिना सीधे स्तभ्-सूचना।', 'From the stop notice go straight to the halt notice, without lowering the hand.'),
      does: tr('वादन आणि संचलन एकत्र थांबतात.', 'वादन और संचलन एक साथ रुकते हैं।', 'Playing and marching stop together.') },
    { id: 'bhram', n: 7, name: tr('भ्रम — दक्षिण / वाम / प्रति', 'भ्रम — दक्षिण / वाम / प्रति', 'भ्रम — wheel right / left / countermarch'), page: 35, steps: [
      { pose: 'dakshinBhram', ph: 's', label: tr('दक्षिण भ्रम', 'दक्षिण भ्रम', 'दक्षिण (right)'), book: 'घोषदंड सीने के समीप समानांतर, दाहिना हाथ प्रणाम जैसा, कलश दाहिने कंधे के सामने; बायां हाथ बायीं ओर सीधा तना, हथेली सामने, शेष अंगूठे-तर्जनी के बीच।' },
      { pose: 'vamBhram', ph: 's', label: tr('वाम भ्रम', 'वाम भ्रम', 'वाम (left)'), book: 'हाथ और घोषदंड की दिशा बदलकर दक्षिण भ्रम जैसी क्रिया।' },
      { pose: 'daksh', ph: 's', label: tr('प्रति भ्रम', 'प्रति भ्रम', 'प्रति (countermarch)'), book: 'संचलन करते समय घोष प्रमुख स्तभ् कर ‘दक्ष’ स्थिति में खड़ा रहेगा — यही संकेत।' }],
      when: tr('घोष प्रमुखासोबत वळणे सुरू; पहिल्या दोन तती वळल्यावर घोषदंड पूर्वस्थितीत.', 'घोष प्रमुख के साथ भ्रमण आरंभ; प्रथम दो ततियाँ घूमने पर घोषदंड पूर्व स्थिति में।', 'The turn starts with the प्रमुख; after the first two ranks have turned, the staff comes back.'),
      does: tr('घोष वळतो.', 'घोष घूमता है।', 'The band turns.') },
    { id: 'gatyantar', n: 8, name: tr('गत्यंतर', 'गत्यंतर', 'गत्यंतर — change speed'), page: 35, steps: [
      { pose: 'gatyantar1', ph: 'pre', book: 'शेषपुच्छ से थोड़ा ऊपर पकड़, तर्जनी घोषदंड की दिशा में; हाथ और घोषदंड एक सीध में, शरीर से लगभग 135°, शेषपुच्छ प्रकोष्ठ पर।' },
      { pose: 'gatyantar2', ph: 'do', book: 'घोषदंड की दिशा तथा कोण वही; दाहिना हाथ सीने के पास, कोहनी प्रणाम जैसी मुड़ी।' }],
      does: tr('वादनाची (आणि संचलनाची) गती बदलते.', 'वादन (और संचलन) की गति बदलती है।', 'The speed of playing (and marching) changes.') },
  ];
  /* poses where the book's words leave room — shown as a note on the card */
  const FLAGS = {
    anak: tr('कलश कोणत्या बाजूला? पुस्तक “दाहिने हाथ की पकड़ दक्ष जैसी” म्हणते — म्हणून कलश प्रमुखाच्या उजवीकडे घेतला आहे.', 'कलश किस ओर? पुस्तक “दाहिने हाथ की पकड़ दक्ष जैसी” कहती है — इसलिए कलश प्रमुख के दाहिनी ओर रखा है।', 'Which side is the कलश? The book says the right hand grips “as in दक्ष”, so the कलश is on the प्रमुख’s right.'),
    shring: tr('घोषदंडाचा ४५° तिरकस नेमका कोणत्या दिशेने (समोरून वर की बाजूने) ते वर्णनावरून स्पष्ट नाही.', 'घोषदंड का ४५° झुकाव किस दिशा में (सामने से ऊपर या बगल से) — वर्णन से स्पष्ट नहीं।', 'The book does not say whether the 45° slant runs forward-up or across the body.'),
    prachal1: tr('“शेषपुच्छ आकाश की ओर” — घोषदंड उलटा (कलश खाली, हाताजवळ) असा वाचला आहे.', '“शेषपुच्छ आकाश की ओर” — घोषदंड उलटा (कलश नीचे, हाथ के पास) माना है।', '“शेषपुच्छ towards the sky” is read as the staff upside down, कलश low near the hand.'),
    mandchal1: tr('प्रचल १ सारखी पकड (उलटा घोषदंड), हात आणि घोषदंड एका रेषेत असा वाचला आहे.', 'प्रचल १ जैसी पकड़ (उलटा घोषदंड), हाथ और घोषदंड एक रेखा में माना है।', 'Read as the प्रचल 1 grip (staff upside down), arm and staff in one line.'),
    stambh2: tr('कलश “उसी बिंदु पर” — म्हणून हात छातीसमोर आला तरी कलश डोक्यावरच ठेवला आहे.', 'कलश “उसी बिंदु पर” — इसलिए हाथ सीने के सामने आने पर भी कलश सिर पर ही रखा है।', 'कलश “at the same point”: it stays over the head while the hand comes to the chest.'),
    vamBhram: tr('दक्षिण भ्रमाचा आरसा: घोषदंड डाव्या हातात, उजवा हात बाजूला.', 'दक्षिण भ्रम का दर्पण: घोषदंड बाएं हाथ में, दाहिना हाथ बगल में।', 'A mirror of दक्षिण भ्रम: staff in the left hand, right arm out.'),
  };

  /* ---------- animations: counts (one per foot), poses landing on counts ----------
     pose: [count, pose, over] — the move lands ON the count, taking `over` counts (default .35, a quick snap).
     march: [first, last] counts on which a foot lands (odd = डावा, even = उजवा). tempo: [[count, steps per minute]].
     music: [first, last] counts while वादन is heard. dd: counts with the पणव ध्वंकार-द्वय. notes: [count, caption]. */
  const ANIM = {
    vadananta: [{ label: tr('वादनान्त (चालताना)', 'वादनान्त (चलते हुए)', 'Stop playing, on the march'), n: 12, bpm: 120, march: [1, 12], music: [1, 8], dd: [2],
      pose: [[1, 'daksh'], [3, 'vadananta1'], [7, 'vadananta2']],
      notes: [[1, tr('प्रचल, वादन चालू', 'प्रचल, वादन जारी', 'Marching, playing')], [2, tr('पणवावर ध्वंकार-द्वय', 'पणव पर ध्वंकार-द्वय', 'पणव double stroke: look up')], [3, tr('सूचना — किमान ४ अंक धरा', 'सूचना — कम से कम ४ अंक', 'Notice — hold at least 4 counts')], [7, tr('पालनार्थ — चरणाच्या शेवटच्या गणाच्या सुरुवातीला', 'पालनार्थ — चरण के अंतिम गण के आरंभ में', 'Execute — at the start of the last gan')], [9, tr('चरण संपला: वादन थांबले, संचलन चालू', 'चरण समाप्त: वादन रुका, संचलन जारी', 'Charan ends: playing stops, marching goes on')]] }],
    nirdesh: [{ label: tr('चारही वाद्यनिर्देश', 'चारों वाद्यनिर्देश', 'All four instruments'), n: 18, bpm: 120, march: [1, 18],
      pose: [[1, 'daksh'], [2, 'anak'], [6, 'vanshi'], [10, 'shankh'], [14, 'shring'], [18, 'daksh']],
      notes: [[1, tr('प्रचल', 'प्रचल', 'Marching')], [2, tr('आनक', 'आनक', 'आनक')], [6, tr('वंशी', 'वंशी', 'वंशी')], [10, tr('शंख', 'शंख', 'शंख')], [14, tr('शृंग', 'शृंग', 'शृंग')], [18, tr('दक्ष', 'दक्ष', 'दक्ष')]] }],
    nirdeshVadananta: [{ label: tr('१६ अंक (शंख)', '१६ अंक (शंख)', '16 counts (शंख)'), n: 18, bpm: 120, march: [1, 18], music: [1, 16],
      pose: [[1, 'shankh', .6], [11, 'vadananta1', 2], [15, 'vadananta2'], [17, 'daksh', .6]],
      notes: [[1, tr('१–८: वाद्यनिर्देश (शंख) — पूर्वसूचना', '१–८: वाद्यनिर्देश (शंख) — पूर्वसूचना', '1–8: instrument (शंख) — advance notice')], [9, tr('९–१०: हात बदलणे', '९–१०: हाथ बदलना', '9–10: change hands')], [11, tr('११–१४: वादनान्त सूचना', '११–१४: वादनान्त सूचना', '11–14: stop — notice')], [15, tr('१५: पालनार्थ', '१५: पालनार्थ', '15: execute')], [16, tr('१६: अंतर', '१६: अंतर', '16: gap')], [17, tr('आता रणन, मग शंखावर रचना', 'अब रणन, फिर शंख पर रचना', 'Now the रणन, then the शंख rachana')]] }],
    chal: [
      { label: tr('प्रचल (स्थिर स्थितीतून)', 'प्रचल (स्थिर से)', 'प्रचल from standing'), n: 14, bpm: 120, march: [7, 14],
        pose: [[1, 'daksh'], [2, 'prachal1', .6], [6, 'prachal2'], [9, 'daksh', .6]],
        notes: [[1, tr('स्थिर, दक्ष', 'स्थिर, दक्ष', 'Standing, दक्ष')], [2, tr('पूर्वसूचना — किमान ४ अंक', 'पूर्वसूचना — कम से कम ४ अंक', 'Advance notice — at least 4 counts')], [6, tr('पालनार्थ उजव्या पायाच्या अंकावर', 'पालनार्थ दाहिने पैर के अंक पर', 'Execute on a right-foot count')], [7, tr('पुढच्या डाव्या पायाने प्रचल सुरू', 'अगले बाएं पैर से प्रचल', 'Step off with the next left foot')]] },
      { label: tr('प्रचलातून मंदचल', 'प्रचल से मंदचल', 'प्रचल to मंदचल'), n: 14, bpm: 120, tempo: [[10, 60]], march: [1, 14],
        pose: [[1, 'daksh'], [3, 'mandchal1'], [7, 'mandchal2'], [11, 'daksh', .6]],
        notes: [[1, tr('प्रचल', 'प्रचल', 'Marching')], [3, tr('सूचना', 'सूचना', 'Notice')], [7, tr('पालनार्थ डाव्या पायावर', 'पालनार्थ बाएं पैर पर', 'Execute on the left foot')], [8, tr('उजवा, डावा — अजून प्रचलाच्या गतीने', 'दाहिना, बायां — अभी प्रचल की गति से', 'Right, left — still at प्रचल speed')], [10, tr('उजवा पाय मंदचलाच्या गतीने', 'दाहिना पैर मंदचल की गति से', 'Right foot at मंदचल speed')]] }],
    stambh: [{ label: tr('स्तभ् (प्रचलातून)', 'स्तभ् (प्रचल से)', 'Halt from the march'), n: 12, bpm: 120, march: [1, 10], music: [1, 12], dd: [2],
      pose: [[1, 'daksh'], [3, 'stambh1'], [8, 'stambh2'], [11, 'daksh', .6]],
      notes: [[1, tr('प्रचल, वादन चालू', 'प्रचल, वादन जारी', 'Marching, playing')], [3, tr('सूचना', 'सूचना', 'Notice')], [8, tr('पालनार्थ — उजवा पाय पुढे येताना', 'पालनार्थ — दाहिना पैर आगे आते समय', 'Execute — as the right foot comes forward')], [9, tr('डावा पाय पुढे', 'बायां पैर आगे', 'Left foot forward')], [10, tr('उजवा जोडला — स्तभ्', 'दाहिना मिलाया — स्तभ्', 'Right joins — halted')], [11, tr('वादन चालूच', 'वादन जारी', 'Playing goes on')]] }],
    vadanantaStambh: [{ label: tr('वादन आणि संचलन एकत्र थांबवणे', 'वादन और संचलन एक साथ रोकना', 'Stop and halt together'), n: 12, bpm: 120, march: [1, 10], music: [1, 10], dd: [2],
      pose: [[1, 'daksh'], [3, 'vadananta1'], [7, 'stambh1'], [8, 'stambh2'], [11, 'daksh', .6]],
      notes: [[1, tr('प्रचल, वादन चालू', 'प्रचल, वादन जारी', 'Marching, playing')], [3, tr('वादनान्त सूचना', 'वादनान्त सूचना', 'Stop — notice')], [7, tr('हात खाली न आणता थेट स्तभ् सूचना', 'हाथ नीचे लाए बिना सीधे स्तभ् सूचना', 'Straight to the halt notice')], [8, tr('पालनार्थ — उजवा पाय', 'पालनार्थ — दाहिना पैर', 'Execute — right foot')], [10, tr('वादन आणि संचलन एकत्र थांबले', 'वादन और संचलन एक साथ रुके', 'Playing and marching stop together')]] }],
    bhram: [
      { label: tr('दक्षिण भ्रम', 'दक्षिण भ्रम', 'दक्षिण भ्रम'), n: 14, bpm: 120, march: [1, 14], pose: [[1, 'daksh'], [3, 'dakshinBhram'], [11, 'daksh', .6]],
        notes: [[1, tr('प्रचल', 'प्रचल', 'Marching')], [3, tr('दक्षिण भ्रम सूचना — प्रमुखासोबत वळणे सुरू', 'दक्षिण भ्रम सूचना — प्रमुख के साथ भ्रमण', 'Notice — the turn starts with the प्रमुख')], [9, tr('पहिल्या दोन तती वळल्या', 'प्रथम दो ततियाँ घूम गईं', 'The first two ranks have turned')], [11, tr('घोषदंड पूर्वस्थितीत', 'घोषदंड पूर्व स्थिति में', 'Staff back')]] },
      { label: tr('वाम भ्रम', 'वाम भ्रम', 'वाम भ्रम'), n: 14, bpm: 120, march: [1, 14], pose: [[1, 'daksh'], [3, 'vamBhram'], [11, 'daksh', .6]],
        notes: [[1, tr('प्रचल', 'प्रचल', 'Marching')], [3, tr('वाम भ्रम सूचना', 'वाम भ्रम सूचना', 'Notice')], [9, tr('पहिल्या दोन तती वळल्या', 'प्रथम दो ततियाँ घूम गईं', 'The first two ranks have turned')], [11, tr('घोषदंड पूर्वस्थितीत', 'घोषदंड पूर्व स्थिति में', 'Staff back')]] },
      { label: tr('प्रति भ्रम', 'प्रति भ्रम', 'प्रति भ्रम'), n: 10, bpm: 120, march: [1, 6], pose: [[1, 'daksh'], [6, 'daksh', .6]],
        notes: [[1, tr('प्रचल', 'प्रचल', 'Marching')], [6, tr('प्रमुख स्तभ् करून दक्ष — हाच प्रतिभ्रम संकेत', 'प्रमुख स्तभ् कर दक्ष — यही प्रतिभ्रम संकेत', 'The प्रमुख halts in दक्ष — that is the signal')], [7, tr('घोष पुढे जाऊन मागे वळतो', 'घोष आगे जाकर पीछे घूमता है', 'The band passes him and turns back')]] }],
    gatyantar: [{ label: tr('गत्यंतर (उदा. १२० → १००)', 'गत्यंतर (उदा. १२० → १००)', 'Speed change (e.g. 120 → 100)'), n: 14, bpm: 120, tempo: [[8, 100]], march: [1, 14], dd: [2],
      pose: [[1, 'daksh'], [3, 'gatyantar1'], [7, 'gatyantar2'], [10, 'daksh', .6]],
      notes: [[1, tr('प्रचल १२०', 'प्रचल १२०', 'Marching at 120')], [3, tr('पूर्वसूचना', 'पूर्वसूचना', 'Advance notice')], [7, tr('पालनार्थ', 'पालनार्थ', 'Execute')], [8, tr('नवी गती: १००', 'नई गति: १००', 'New speed: 100')]] }],
  };
  // while the feet are moving the staff is carried clear of the ground
  Object.values(ANIM).flat().forEach(a => { const m = a.march || [0, -1]; a.pose.forEach(p => { if (p[1] === 'daksh' && p[0] >= m[0] && p[0] < m[1]) p[1] = 'carry'; }); });
  SIGNALS.forEach(sg => { if (ANIM[sg.id]) sg.anim = ANIM[sg.id]; });

  /* the frame at time t (seconds) of an animation */
  function timeline(a) {
    const T = [], D = []; let t = .8, bpm = a.bpm;
    for (let k = 1; k <= a.n; k++) { const ch = (a.tempo || []).find(x => x[0] === k); if (ch) bpm = ch[1]; const d = 60 / bpm; if (k > 1) t += d; T[k] = t; D[k] = d; }
    return { T, D, end: T[a.n] + D[a.n] + .4 };
  }
  function frameAt(a, tl, t) {
    const { T, D } = tl;
    let k = 0; for (let i = 1; i <= a.n; i++) if (t >= T[i] - .001) k = i;
    let st = state(a.pose[0][1]);
    for (let i = 1; i < a.pose.length; i++) {
      const [c, name, over = .35] = a.pose[i], end = T[c], start = end - over * D[c];
      if (t >= end) { st = state(name); continue; }
      if (t > start) { const u = (t - start) / (end - start); st = blend(st, state(name), u * u * (3 - 2 * u)); }
      break;
    }
    const m = a.march || [0, -1], legs = { L: { lift: 0 }, R: { lift: 0 } };
    for (let i = Math.max(m[0], 1); i <= m[1]; i++) {
      const start = T[i] - D[i] * .9, end = T[i];
      if (t > start && t < end) { const u = (t - start) / (end - start); legs[i % 2 ? 'L' : 'R'].lift = Math.sin(Math.PI * u) * .55; }
    }
    let sw = 0;
    if (m[1] >= m[0] && t >= T[m[0]] - D[m[0]] && t <= T[m[1]]) { let kf = 0; for (let i = 1; i <= a.n; i++) if (t >= T[i] - D[i]) kf = i - 1 + Math.min(1, (t - (T[i] - D[i])) / D[i]); sw = Math.cos(Math.PI * kf); }
    st = swingLeft(st, sw);
    return { state: { ...st, legs }, count: k, marching: k >= m[0] && k <= m[1], music: a.music ? (k >= a.music[0] && k <= a.music[1]) : null,
             note: (a.notes || []).filter(x => x[0] <= Math.max(k, 1)).pop() };
  }

  const RULES = [
    tr('पालनार्थ संकेतापूर्वी घोषदंड किमान ४ अंक त्याच स्थितीत ठेवावा.', 'पालनार्थ संकेत से पहले घोषदंड कम से कम ४ अंक उसी स्थिति में रखें।', 'Hold the staff still for at least 4 counts before the execute move.'),
    tr('लक्ष वेधण्यासाठी पणवावर ध्वंकार-द्वय.', 'ध्यान खींचने के लिए पणव पर ध्वंकार-द्वय।', 'A पणव double stroke (ध्वंकार-द्वय) calls the players to look up.'),
    tr('पूर्वसूचना / सूचनेनंतर एका चरणात पालनार्थ न आल्यास संकेत रद्द.', 'पूर्वसूचना / सूचना के बाद एक चरण तक पालनार्थ न हो तो संकेत निरस्त।', 'No execute move within one charan after a notice: the signal is cancelled.'),
    tr('डाव्या हाताने दिलेल्या संकेतांचा अर्थ तोच.', 'बाएं हाथ से दिए संकेतों का अर्थ वही।', 'Signals given with the left hand mean the same.'),
  ];
  const T = (x, lang) => x == null ? '' : typeof x === 'string' ? x : (x[lang] || x.mr);
  /* ---------- animation helpers ---------- */
  const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  function slerp(a, b, t) {
    const c = Math.max(-1, Math.min(1, dot(a, b)));
    if (c > .9995) return nrm(lerp(a, b, t));
    if (c < -.9995) { let m = cross(a, [0, 0, 1]); if (len(m) < .1) m = cross(a, [1, 0, 0]); m = nrm(m); return t < .5 ? slerp(a, m, t * 2) : slerp(m, b, t * 2 - 1); }
    const th = Math.acos(c), sa = Math.sin(th);
    return add(mul(a, Math.sin((1 - t) * th) / sa), mul(b, Math.sin(t * th) / sa));
  }
  function blendArm(a, b, t) {
    const H = lerp(a.H, b.H, t), E = lerp(a.E, b.E, t), u = nrm(sub(H, a.S));
    const pole = sub(sub(E, a.S), mul(u, dot(sub(E, a.S), u)));
    return ik(a.S, H, len(pole) > 1e-3 ? pole : [0, -1, 0]);
  }
  function blend(A, B, t) {
    if (t <= 0) return A; if (t >= 1) return B;
    const r = blendArm(A.r, B.r, t), l = blendArm(A.l, B.l, t), d = slerp(A.staff.d, B.staff.d, t), f = A.staff.f + (B.staff.f - A.staff.f) * t;
    let staff;
    if (A.staff.grip === B.staff.grip) { const H = (A.staff.grip === 'l' ? l : r).H; staff = { tail: sub(H, mul(d, f * L)), top: add(H, mul(d, (1 - f) * L)), d, f, grip: A.staff.grip }; }
    else { const cA = lerp(A.staff.tail, A.staff.top, .5), cB = lerp(B.staff.tail, B.staff.top, .5), c = lerp(cA, cB, t); staff = { tail: sub(c, mul(d, L / 2)), top: add(c, mul(d, L / 2)), d, f, grip: t < .5 ? A.staff.grip : B.staff.grip }; }
    return { r, l, staff, freeL: A.freeL && B.freeL };
  }
  /* the free left hand swings while marching (संचलन): forward with the right foot, back with the left */
  function swingLeft(s, sw) { if (!s.freeL || !sw) return s; return { ...s, l: ik(SH.l, [-25, 80, 2 + 24 * sw], [0, 0, -1]) }; }
  const cache = {};
  const state = name => cache[name] || (cache[name] = solve(P[name]));

  export const Figure = { POSES: P, SIGNALS, RULES, PH, ANIM, FLAGS, T, svg, draw, solve, blend, swingLeft, state, timeline, frameAt };
export { SIGNALS, RULES, PH, ANIM, FLAGS, T, svg, draw, solve, blend, swingLeft, state, timeline, frameAt, P as POSES };
