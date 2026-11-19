function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function getBest() {
  try {
    return (
      parseInt(localStorage.getItem("detetives_patrimonio_best") || "0", 10) ||
      0
    );
  } catch (e) {
    return 0;
  }
}
function setBest(v) {
  try {
    localStorage.setItem("detetives_patrimonio_best", String(v));
  } catch (e) {}
}

var canvas = document.getElementById("confettiCanvas");
var ctx = canvas.getContext("2d");
var confettiPieces = [];
var confettiRAF = null;
function resizeCanvas() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
addEventListener("resize", resizeCanvas);
resizeCanvas();

function launchConfetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var colors = ["#d99a3c", "#f0b256", "#4f8f58", "#e9e4d6", "#b4453a"];
  confettiPieces = [];
  for (var i = 0; i < 90; i++) {
    confettiPieces.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.4,
      vy: 2 + Math.random() * 3,
      vx: -1.5 + Math.random() * 3,
      size: 4 + Math.random() * 5,
      color: colors[i % colors.length],
      rot: Math.random() * 360,
      vr: -6 + Math.random() * 12,
    });
  }
  var start = Date.now();
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var alive = false;
    confettiPieces.forEach(function (p) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y < canvas.height + 20) alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    if (alive && Date.now() - start < 4500) {
      confettiRAF = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  if (confettiRAF) cancelAnimationFrame(confettiRAF);
  tick();
}

const $ = (s) => document.querySelector(s),
  app = $("#app"),
  byId = Object.fromEntries(sites.map((s) => [s.id, s]));
const difficulties = ["Fácil", "Médio", "Difícil"],
  ranks = [
    "Aprendiz de Arquivo",
    "Detetive Novato",
    "Investigador Experiente",
    "Mestre Detetive do Patrimônio",
  ];
const limits = [0, 250, 700, 1400],
  key = "detetives-arquivo-v2";
let profile = {
    xp: 0,
    solved: 0,
    seen: [],
    best: getBest(),
    sound: false,
    medals: [],
    run: null,
  },
  view = "",
  zoom = false,
  audio;
try {
  const old = JSON.parse(localStorage.getItem(key));
  if (
    old &&
    Number.isFinite(old.xp) &&
    Array.isArray(old.seen) &&
    Array.isArray(old.medals)
  )
    Object.assign(profile, old);
} catch {}
function save() {
  try {
    localStorage.setItem(key, JSON.stringify(profile));
  } catch {
    $("#alert").textContent =
      "O navegador bloqueou o salvamento. Esta sessão continua disponível enquanto a página estiver aberta.";
  }
}
function sound(kind) {
  if (!profile.sound) return;
  try {
    audio ??= new AudioContext();
    audio.resume().catch(() => {});
    let notes =
      kind === "stamp"
        ? [110, 70]
        : kind === "type"
          ? [950, 1300, 1100]
          : [370, 240];
    notes.forEach((hz, i) => {
      let o = audio.createOscillator(),
        g = audio.createGain(),
        t = audio.currentTime + i * 0.045;
      o.type = kind === "type" ? "square" : "triangle";
      o.frequency.value = hz;
      o.connect(g);
      g.connect(audio.destination);
      g.gain.setValueAtTime(0.045, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
      o.start(t);
      o.stop(t + 0.08);
    });
  } catch {}
}
function soundLabel() {
  $("#sound").textContent = profile.sound ? "♪ Som ligado" : "♪ Som desligado";
  $("#sound").setAttribute("aria-pressed", profile.sound);
}
$("#sound").onclick = () => {
  profile.sound = !profile.sound;
  soundLabel();
  sound("type");
  save();
};
const rank = () => limits.filter((v) => profile.xp >= v).length - 1,
  available = () => sites.slice(0, [12, 22, 32, 40][rank()]);
const numeral = (n) => String(n).padStart(2, "0");
const medals = () =>
  profile.medals
    .map((x) => '<span class="badge">✧ ' + x + "</span>")
    .join("") || "Resolva um caso para receber a primeira medalha.";
function central() {
  view = "central";
  zoom = false;
  app.innerHTML = `<section class="hero"><img src="${byId[274].img}" alt=""><article><div class="ey">Divisão de investigação histórica</div><h1>Detetives do<br><i>Patrimônio</i></h1><p>Uma fotografia perdeu a legenda. Examine a paisagem, cruze as pistas e identifique o Patrimônio Mundial.</p></article><span class="caption">Negativo 274 · Andes, Peru</span></section>
 <div class="grid"><section class="panel"><div class="ey">Mesa de investigação</div><h3>${profile.run ? "Expedição em andamento" : "Preparar expedição"}</h3>${profile.run ? `<p>Oito dossiês · Caso ${profile.run.index + 1} · ${difficulties[profile.run.diff]}</p><br><button class="primary" id="resume">Retomar investigação →</button>` : `<div class="fields"><label>Modalidade<select id="mode"><option value="field">Investigação</option><option value="train">Treinamento</option></select></label><label>Dificuldade<select id="diff">${difficulties.map((v, i) => '<option value="' + i + '">' + v + "</option>").join("")}</select></label></div><label class="check"><input type="checkbox" id="clock"> Prazo de 60 segundos por caso</label><p class="muted note" id="rules">Oito casos sorteados. Pistas e perícia reduzem o valor do caso.</p><button class="primary large" id="start">Abrir primeiro dossiê <span>→</span></button>`}</section>
 <aside class="panel"><div class="ey">Credencial de investigador</div><h3>${ranks[rank()]}</h3><div class="stats">${profile.xp} <small>XP</small></div><div class="track"><b style="width:${rank() === 3 ? 100 : (100 * (profile.xp - limits[rank()])) / (limits[rank() + 1] - limits[rank()])}%"></b></div><p class="muted">${rank() === 3 ? "Acervo completo" : "Próximo nível em " + (limits[rank() + 1] - profile.xp) + " XP"} · ${available().length}/40 liberados</p><p class="muted">${profile.solved} casos resolvidos · Recorde ${profile.best} pts</p></aside></div>
 <section class="paper"><small>Missões especiais · Investigação</small><div class="tiles"><div class="tile"><b>Olho clínico</b><p class="muted">Identifique um sítio sem pedir pista ou eliminação.</p><small>${profile.medals.includes("Olho clínico") ? "Concluída ✓" : "Em aberto"}</small></div><div class="tile"><b>Três em sequência</b><p class="muted">Resolva três casos seguidos na mesma expedição.</p><small>${profile.medals.includes("Três em sequência") ? "Concluída ✓" : "Em aberto"}</small></div><div class="tile"><b>Especialista do Brasil</b><p class="muted">Acerte um patrimônio brasileiro no nível difícil.</p><small>${profile.medals.includes("Especialista do Brasil") ? "Concluída ✓" : "Em aberto"}</small></div></div></section><div class="section"><h3>Caderno de campo</h3><small>${profile.seen.length} / 40 estudados</small></div><details class="paper"><summary>Consultar acervo e medalhas</summary><p class="note">${medals()}</p><div class="tiles">${sites.map((s, i) => `<div class="tile"><small>Dossiê ${numeral(i + 1)}</small>${profile.seen.includes(s.id) ? `<details><summary>${s.name}</summary><img loading="lazy" src="${s.img}" alt="${s.name}">${facts(s)}</details>` : `<p>${i < available().length ? "Disponível para investigar" : "Libera em " + limits[i < 22 ? 1 : i < 32 ? 2 : 3] + " XP"}</p>`}</div>`).join("")}</div></details>`;
  if (profile.run) $("#resume").onclick = round;
  else {
    $("#start").onclick = start;
    $("#mode").onchange = () => {
      let t = $("#mode").value === "train";
      $("#clock").disabled = t;
      if (t) $("#clock").checked = false;
      $("#rules").textContent = t
        ? "Pistas grátis. Cada erro reduz em 25% o valor inicial do caso e zera o combo. O treino não altera o recorde."
        : "Oito casos sorteados. Pistas e perícia reduzem o valor do caso.";
    };
  }
}
function start() {
  let pool = available(),
    order = shuffle(pool.filter((s) => !profile.seen.includes(s.id)))
      .concat(shuffle(pool.filter((s) => profile.seen.includes(s.id))))
      .slice(0, 8);
  profile.run = {
    ids: shuffle(order).map((s) => s.id),
    index: 0,
    diff: +$("#diff").value,
    train: $("#mode").value === "train",
    timed: $("#clock").checked,
    points: 0,
    combo: 0,
    maxCombo: 0,
    rows: [],
  };
  prepare();
}
function prepare() {
  const r = profile.run,
    s = byId[r.ids[r.index]],
    group = (x) => x.place.split(", ").at(-1),
    others = shuffle(sites.filter((x) => x !== s));
  const similarity = (x) =>
    4 * (x.cat === s.cat) +
    2 * (x.region === s.region) +
    3 * (group(x) === group(s));
  let candidates = others.sort(
    (a, b) => (r.diff === 0 ? 1 : -1) * (similarity(a) - similarity(b)),
  );
  let n = [15, 12, 3][r.diff];
  Object.assign(r, {
    choices: shuffle([
      s.id,
      ...shuffle(candidates.slice(0, n))
        .slice(0, 3)
        .map((x) => x.id),
    ]),
    clues: 0,
    cut: null,
    miss: [],
    done: false,
    deadline: r.timed ? Date.now() + 60000 : null,
    bonus: null,
    notice: "",
  });
  save();
  round();
  sound("paper");
}
function hints(s, d) {
  return d === 0
    ? [s.place, s.history, s.fact]
    : d === 1
      ? [s.period, s.value, s.place]
      : [s.value, s.fact, s.history];
}
function worth(r) {
  return (
    [100, 150, 200][r.diff] -
    (r.train
      ? Math.round([0, 25, 50, 75][r.miss.length] * [1, 1.5, 2][r.diff])
      : [0, 10, 30, 60][r.clues] + (r.cut ? 20 : 0))
  );
}
function facts(s) {
  return `<div class="factgrid">${[
    ["Localização", s.place],
    ["Período", s.period],
    ["Contexto", s.history],
    ["Valor universal excepcional", s.value],
    ["Curiosidade", s.fact],
    [
      "Inscrição na UNESCO",
      s.year + " · " + s.cat + " · critérios " + s.criteria,
    ],
  ]
    .map(([k, v]) => `<div><small>${k}</small><p>${v}</p></div>`)
    .join(
      "",
    )}</div><p class="note"><a href="https://whc.unesco.org/en/list/${s.id}/" target="_blank" rel="noopener">Consultar ficha e galeria da UNESCO ↗</a> · ${s.id === 606 ? '<a href="https://commons.wikimedia.org/wiki/File:Parque_nacional_serra_da_capivara-THIAGO_CAMPI-03.jpg" target="_blank" rel="noopener">Fotografia: Thiago Campi · licença e original ↗</a>' : "Fotografia do acervo do Centro do Patrimônio Mundial."}</p>`;
}
function round() {
  view = "round";
  zoom = false;
  let r = profile.run,
    s = byId[r.ids[r.index]],
    row = r.rows[r.index],
    cl = hints(s, r.diff),
    blur = r.done ? 0 : [3, 7, 12][r.diff] * (1 - r.clues / 3);
  app.innerHTML = `<div class="file"><div class="hud"><span>ARQUIVO / ${numeral(r.index + 1)} DE 08</span><span>${difficulties[r.diff]} · ${r.train ? "Treinamento" : "Investigação"}</span><span>${r.points} pts · Combo ×${r.combo}</span><span class="time" id="timer"></span></div><div class="ey">Dossiê fotográfico</div><h2>${r.done ? s.name : "Patrimônio sem identificação"}</h2><div class="stage"><div><div class="plate"><div class="photo scan" id="photo"><img id="negative" src="${s.img}" alt="${r.done ? s.name : "Fotografia de campo. Consulte as pistas textuais abaixo."}" style="filter:blur(${blur}px) sepia(${r.done ? 0 : 0.15 + 0.14 * (3 - r.clues)})"></div><div class="actions"><small>Restauro · ${r.done ? 100 : Math.round((r.clues + 1) * 25)}%</small><button id="lens" aria-pressed="false">⌕ Lupa 2×</button></div></div><div class="paper evidence"><small>Evidências recuperadas</small><ol>${cl.map((h, i) => "<li>" + (r.done || i < r.clues ? h : "Pista lacrada") + "</li>").join("")}</ol></div></div><section class="paper"><div class="ey">Folha de identificação</div><h3>Qual é o patrimônio?</h3><div class="opts">${r.choices.map((id, i) => `<button data-id="${id}" ${r.done || id === r.cut || r.miss.includes(id) ? "disabled" : ""} class="${r.done && id === s.id ? "yes" : r.done && row.answer === id ? "no" : ""}"><em>${i + 1}</em>${byId[id].name}${id === r.cut ? " · eliminada" : ""}</button>`).join("")}</div><div class="actions tools"><button id="hint" ${r.done || r.clues === 3 ? "disabled" : ""}>Pista (P) · ${r.train ? "grátis" : ["−10", "−20", "−30", "0"][r.clues] + " pts"}</button><button id="cut" ${r.done || r.cut ? "disabled" : ""}>Eliminar · ${r.train ? "grátis" : "−20 pts"}</button></div><p class="muted note">Valor do caso: ${worth(r)} pts antes do combo.</p><p role="status">${r.notice}</p></section></div>
 ${
   r.done
     ? `<section id="verdict" class="paper result" tabindex="-1"><small class="stamp">${row.ok ? "Caso resolvido" : "Caso encerrado"}</small><h3>${row.message} · +${row.points} pts</h3>${facts(s)}${
         r.index % 3 === 2
           ? `<div class="panel"><small>Desafio bônus · memória de campo</small><p>Em que ano este patrimônio entrou na Lista?</p><div class="actions">${[
               s.year - 4,
               s.year,
               s.year + 6,
             ]
               .sort((a, b) => ((a * 17 + s.id) % 13) - ((b * 17 + s.id) % 13))
               .map(
                 (y) =>
                   `<button data-year="${y}" ${r.bonus !== null ? "disabled" : ""}>${y}</button>`,
               )
               .join(
                 "",
               )}</div>${r.bonus !== null ? (r.bonus ? "Correto! +25 pontos." : "Inscrição em " + s.year + ".") : ""}</div>`
           : ""
       }<button class="primary" id="next">${r.index === 7 ? "Ver relatório final" : "Abrir próximo dossiê"} →</button></section>`
     : ""
 }</div>`;
  $("#lens").onclick = () => {
    zoom = !zoom;
    $("#negative").style.transform = zoom ? "scale(2)" : "";
    $("#lens").setAttribute("aria-pressed", zoom);
    $("#lens").textContent = zoom ? "Fechar lupa" : "⌕ Lupa 2×";
  };
  $("#photo").onpointermove = $("#photo").onpointerdown = (e) => {
    if (zoom) {
      let b = e.currentTarget.getBoundingClientRect();
      $("#negative").style.transformOrigin =
        ((e.clientX - b.left) / b.width) * 100 +
        "% " +
        ((e.clientY - b.top) / b.height) * 100 +
        "%";
    }
  };
  document
    .querySelectorAll("[data-id]")
    .forEach((b) => (b.onclick = () => answer(+b.dataset.id)));
  $("#hint").onclick = () => {
    if (expired()) return;
    r.clues++;
    save();
    round();
    sound("type");
    ($("#hint").disabled
      ? $(".opts button:not(:disabled)")
      : $("#hint")
    ).focus();
  };
  $("#cut").onclick = () => {
    if (expired()) return;
    r.cut =
      shuffle(
        r.choices.filter((id) => id !== s.id && !r.miss.includes(id)),
      )[0] || r.choices.find((id) => id !== s.id);
    save();
    round();
    sound("paper");
  };
  if (r.done) {
    $("#next").onclick = next;
    document.querySelectorAll("[data-year]").forEach(
      (b) =>
        (b.onclick = () => {
          if (r.bonus !== null) return;
          r.bonus = +b.dataset.year === s.year;
          if (r.bonus) {
            r.points += 25;
            row.points += 25;
            if (!r.train) profile.xp += 25;
          }
          save();
          round();
          $("#next").focus();
        }),
    );
  }
  tick();
}
function expired() {
  let r = profile.run;
  if (r && !r.done && r.deadline && Date.now() >= r.deadline) {
    answer(null, true);
    return true;
  }
  return false;
}
function tick() {
  if (view !== "round" || !profile.run) return;
  let r = profile.run;
  if (expired()) return;
  $("#timer").textContent =
    r.timed && !r.done
      ? Math.max(0, Math.ceil((r.deadline - Date.now()) / 1000)) + " s"
      : "";
}
function award(m) {
  if (!profile.medals.includes(m)) profile.medals.push(m);
}
function answer(id, timeout = false) {
  let r = profile.run;
  if (!r || r.done || (!timeout && expired())) return;
  let s = byId[r.ids[r.index]],
    ok = id === s.id;
  if (
    !timeout &&
    (!r.choices.includes(id) || id === r.cut || r.miss.includes(id))
  )
    return;
  if (r.train && !ok) {
    r.miss.push(id);
    r.combo = 0;
    r.notice =
      "Essa hipótese foi descartada. Compare outra alternativa com as pistas.";
    save();
    round();
    return;
  }
  r.done = true;
  r.combo = ok ? r.combo + 1 : 0;
  r.maxCombo = Math.max(r.maxCombo, r.combo);
  let pts = ok ? worth(r) + Math.min(50, (r.combo - 1) * 10) : 0;
  r.points += pts;
  r.notice = "";
  let message = timeout
    ? "Tempo esgotado"
    : ok
      ? [
          "Identificação confirmada",
          "As evidências conferem",
          "Legenda recuperada",
        ][r.index % 3]
      : [
          "Confira a identificação no arquivo",
          "A fotografia pertencia a outro dossiê",
        ][r.index % 2];
  r.rows.push({
    id: s.id,
    answer: id,
    ok,
    points: pts,
    message,
    clues: r.clues,
  });
  if (!profile.seen.includes(s.id)) profile.seen.push(s.id);
  if (!r.train) {
    profile.xp += ok ? pts : 15;
    if (ok) {
      profile.solved++;
      award("Primeiro caso");
      if (r.combo >= 3) award("Três em sequência");
      if (!r.clues && !r.cut) award("Olho clínico");
      if (s.place.includes("Brasil") && r.diff === 2)
        award("Especialista do Brasil");
    }
  }
  save();
  round();
  sound("stamp");
  $("#verdict").focus();
}
function next() {
  let r = profile.run;
  if (!r || !r.done) return;
  if (r.index < 7) {
    r.index++;
    prepare();
    window.scrollTo(0, 0);
    return;
  }
  let previous = profile.best;
  if (!r.train) {
    profile.best = Math.max(profile.best, r.points);
    setBest(profile.best);
    if (r.rows.every((x) => x.ok)) award("Expedição perfeita");
  }
  profile.run = null;
  save();
  view = "final";
  app.innerHTML = `<section class="paper file"><small class="stamp">Expedição concluída</small><h2>Relatório de campo</h2><div class="stats">${r.points} pontos</div><p>${r.rows.filter((x) => x.ok).length}/8 identificações · Melhor combo ×${r.maxCombo} · ${r.train ? "Treinamento" : r.points > previous ? "Novo recorde" : ranks[rank()]}</p><p class="note">${medals()}</p><ol class="records">${r.rows.map((x) => `<li>${byId[x.id].name} · ${x.ok ? "Resolvido" : "Revisado"} · ${x.clues}/3 pistas · <b>${x.points} pts</b></li>`).join("")}</ol><button class="primary" id="back">Voltar à central</button></section>`;
  $("#back").onclick = central;
  if (r.rows.filter((x) => x.ok).length >= 6) launchConfetti();
  window.scrollTo(0, 0);
}
$("#home").onclick = () => {
  central();
  window.scrollTo(0, 0);
};
document.addEventListener("keydown", (e) => {
  if (view !== "round" || e.repeat || e.ctrlKey || e.altKey || e.metaKey)
    return;
  if (/^[1-4]$/.test(e.key))
    document.querySelectorAll("[data-id]")[+e.key - 1]?.click();
  if (e.key.toLowerCase() === "p") $("#hint").click();
  if (
    e.key === "Enter" &&
    profile.run.done &&
    !["BUTTON", "A", "SUMMARY"].includes(document.activeElement.tagName)
  ) {
    e.preventDefault();
    next();
  }
});
setInterval(tick, 250);
soundLabel();
central();
