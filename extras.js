/* EXTRAS · LOGROS, MÚSICA, MENÚ CIRCULAR, CURSOR DEL JUGADOR, CAÍDA, GRAVEDAD, CÁMARA Y CRÉDITOS */
(() => {
'use strict';

const S = window.SIM;
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const azar = S.azar;
const esperar = ms => new Promise(r => setTimeout(r, ms));
const actual = () => S.slides[S.idx];
const claveActual = () => [...actual().classList].find(c => c.startsWith('s-'));
function centroDe(el) {
    const r = el.getBoundingClientRect();
    return S.alEscenario({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
}

/* --------------------------------------------------------------
   LOGROS
-------------------------------------------------------------- */
const vistos = new Set();
function logro(id, titulo, detalle, icono = '🏆') {
    if (vistos.has(id)) return;
    vistos.add(id);
    const el = document.createElement('div');
    el.className = 'logro';
    el.innerHTML = `<i>${icono}</i><div><small>LOGRO DESBLOQUEADO</small><b></b><span></span></div>`;
    $('b', el).textContent = titulo;
    $('span', el).textContent = detalle;
    $('#logros').append(el);
    [784, 988, 1175, 1568].forEach((f, k) => S.tono(f, .35, 'triangle', .12, k * .09));
    setTimeout(() => el.classList.add('sale'), 4800);
    setTimeout(() => el.remove(), 5400);
}

/* --------------------------------------------------------------
   MÚSICA DE FONDO ESTILO «MODO CONSTRUIR» (SINTETIZADA)
-------------------------------------------------------------- */
const musica = { on: true, sonando: false, gain: null, reloj: null, t: 0, compas: 0, volumen: .075 };
const ACORDES = [
    [60, 64, 67, 71], // Cmaj7
    [57, 60, 64, 67], // Am7
    [53, 57, 60, 64], // Fmaj7
    [55, 59, 62, 64]  // G6
];
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
function notaMusica(m, t, dur, tipo, vol, filtro = 2400) {
    const ac = S.ac;
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type = tipo; o.frequency.value = hz(m);
    f.type = 'lowpass'; f.frequency.value = filtro;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(.08, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(musica.gain);
    o.start(t); o.stop(t + dur + .05);
}
function programarMusica() {
    const ac = S.ac, negra = 60 / 84;
    while (musica.t < ac.currentTime + .4) {
        const acorde = ACORDES[musica.compas % 4];
        const t0 = musica.t;
        acorde.forEach(m => notaMusica(m, t0, negra * 4.2, 'triangle', .05, 1400));
        notaMusica(acorde[0] - 24, t0, negra * 1.8, 'sine', .16, 600);
        notaMusica(acorde[0] - 24, t0 + negra * 2, negra * 1.8, 'sine', .12, 600);
        for (let k = 0; k < 8; k++) {
            if (Math.random() < .3) continue;
            const m = acorde[Math.floor(Math.random() * 4)] + 12 + (Math.random() < .25 ? 12 : 0);
            notaMusica(m, t0 + k * negra / 2, negra * .9, 'sine', .06, 5000);
        }
        musica.t += negra * 4;
        musica.compas++;
    }
}
function iniciarMusica() {
    if (!musica.on || musica.sonando || !S.ac) return;
    const ac = S.ac;
    if (!musica.gain) { musica.gain = ac.createGain(); musica.gain.connect(S.maestro); }
    musica.gain.gain.cancelScheduledValues(ac.currentTime);
    musica.gain.gain.setValueAtTime(0.0001, ac.currentTime);
    musica.gain.gain.linearRampToValueAtTime(S.mudo ? 0 : musica.volumen, ac.currentTime + 2);
    musica.t = ac.currentTime + .1;
    musica.sonando = true;
    programarMusica();
    musica.reloj = setInterval(() => {
        musica.gain.gain.setTargetAtTime(S.mudo ? 0 : musica.volumen, S.ac.currentTime, .3);
        programarMusica();
    }, 150);
}
function pararMusica(suave = true) {
    if (!musica.sonando) return;
    clearInterval(musica.reloj);
    musica.sonando = false;
    const ac = S.ac;
    musica.gain.gain.cancelScheduledValues(ac.currentTime);
    musica.gain.gain.setTargetAtTime(0, ac.currentTime, suave ? .4 : .02);
}
function volumenMusica(v) { musica.volumen = v; }

/* --------------------------------------------------------------
   GLOBO DEL NPC (SIN VOZ)
-------------------------------------------------------------- */
const globoNpc = $('.npc-globo');
function npcDice(texto) {
    globoNpc.classList.add('oculto');
    setTimeout(() => { globoNpc.textContent = texto; globoNpc.classList.remove('oculto'); }, 200);
}

/* --------------------------------------------------------------
   MENÚ CIRCULAR DE LOS SIMS
-------------------------------------------------------------- */
const pastel = $('#pastel');
function reaccion(x, y, texto, ms = 2200) {
    const r = document.createElement('div');
    r.className = 'pa-reaccion';
    r.style.left = x + 'px'; r.style.top = (y - 30) + 'px';
    r.textContent = texto;
    $('#escenario').append(r);
    setTimeout(() => r.remove(), ms);
}
function cerrarPastel() { pastel.classList.remove('on'); pastel.innerHTML = ''; }
function abrirPastel(p, opciones, icono = '🙂') {
    cerrarPastel();
    // CON MÁS DE 4 OPCIONES EL CÍRCULO CRECE PARA QUE NO SE MONTEN (Y SE ALEJA DE LOS BORDES)
    const grande = opciones.length > 4;
    const rx = grande ? 360 : 250, ry = grande ? 210 : 150;
    const x = Math.min(1920 - rx - 190, Math.max(rx + 190, p.x)), y = Math.min(1080 - ry - 60, Math.max(ry + 60, p.y));
    const c = document.createElement('div'); c.className = 'pa-centro'; c.textContent = icono;
    c.style.left = x + 'px'; c.style.top = y + 'px';
    pastel.append(c);
    opciones.forEach((op, k) => {
        const a = -Math.PI / 2 + k * (2 * Math.PI / opciones.length);
        const b = document.createElement('button');
        b.className = 'pa-opcion';
        b.textContent = op.t;
        b.style.left = (x + Math.cos(a) * rx) + 'px';
        b.style.top = (y + Math.sin(a) * ry) + 'px';
        b.style.animationDelay = (k * .05) + 's';
        b.onclick = (e) => { e.stopPropagation(); S.sonido.clic(); cerrarPastel(); op.fn(x, y); };
        pastel.append(b);
    });
    pastel.classList.add('on');
    S.sonido.pop();
    logro('pastel', 'Interacción desbloqueada', 'Abriste el menú de Los Sims', '🖱️');
}
pastel.addEventListener('click', e => { if (e.target === pastel) cerrarPastel(); });

const MENUS = {
    npc: () => [
        { t: 'Charlar', fn: () => npcDice('Buenos días.') },
        { t: 'Preguntar si es real', fn: () => npcDice('Buenos días.') },
        { t: 'Estudiar', fn: () => { S.sonido.error(); npcDice('No puedo, sigo internado.'); } },
        { t: 'Trabajar', fn: () => { S.sonido.error(); npcDice('No puedo, sigo internado.'); } },
        { t: 'Pedir un aumento', fn: (x, y) => { S.sonido.error(); reaccion(x, y, 'Interacción no disponible para NPC'); } },
        { t: 'Despedir', fn: () => despedirNpc() }
    ],
    gato: () => [
        { t: 'Acariciar', fn: (x, y) => reaccion(x, y, '😾 Agata te ignora') },
        { t: 'Preguntar qué ve', fn: (x, y) => { S.glitch({ dur: 220, micro: true }); reaccion(x, y, '01001000 01001111 01001100 01000001', 2600); } },
        { t: 'Odiar a Gigi', fn: (x, y) => { bufido(); reaccion(x, y, '😾 Odio a Gigi. Mucho.', 2600); logro('gigi', 'Enemiga jurada', 'Agata odia a Gigi', '😾'); } },
        { t: 'Mearle la almohada a Tomás', fn: (x, y) => { meada(); reaccion(x, y, '💦 Almohada de Tomás: arruinada', 2800); logro('tomas', 'Venganza felina', 'Tomás tendrá que lavar la almohada', '💦'); } },
        { t: 'Darle comida', fn: (x, y) => { S.sonido.kaching(); reaccion(x, y, '+10 Hambre · ahora la dueña es ella'); } }
    ],
    drogada: () => [
        { t: 'Hablarle', fn: () => drogadaDice('¿Eh? ¿Tú también eres un holograma?') },
        { t: 'Preguntar qué ve', fn: () => { S.glitch({ dur: 260, micro: true }); drogadaDice('Veo el código… y está bailando'); } },
        { t: 'Ofrecerle agua', fn: () => drogadaDice('¿El agua moja o nosotros somos secos?') },
        { t: 'Llamar a su mamá', fn: (x, y) => { S.sonido.error(); reaccion(x, y, '📵 Se escondió detrás del hongo'); } }
    ],
    alien: () => [
        { t: 'Saludar', fn: () => S.escenas['s-alien'].secuencia() },
        { t: 'Preguntar por Shakira', fn: (x, y) => { reaccion(x, y, 'Shhh… no digas nada'); S.escenas['s-alien'].secuencia(); } },
        { t: 'Abducir', fn: () => S.glitch({ dur: 900, fuerte: true, etiqueta: '⚠ ABDUCCIÓN EN CURSO' }) }
    ]
};
function despedirNpc() {
    const sim = $('.npc-sim');
    S.sonido.whoosh();
    sim.classList.add('despedido');
    setTimeout(() => { sim.style.transition = 'none'; sim.classList.remove('despedido'); sim.style.transform = 'translateX(900px)'; }, 1300);
    setTimeout(() => { sim.style.transition = 'transform 1.4s cubic-bezier(.2,.8,.3,1)'; sim.style.transform = ''; }, 2600);
    setTimeout(() => { sim.style.transition = ''; npcDice('Buenos días.'); }, 4100);
}
function bufido() { S.ruido(.7, 'highpass', 2600, .4, .6); S.tono(180, .5, 'sawtooth', .06, 0, 120); }
function meada() { for (let k = 0; k < 14; k++) S.ruido(.09, 'bandpass', azar(1800, 3200), .14, 4, k * .08); }
function drogadaDice(texto) {
    const g = $('.dr-globo');
    g.classList.add('oculto');
    S.tono(500, .6, 'sine', .1, 0, 1400);
    setTimeout(() => { g.textContent = texto; g.classList.remove('oculto'); }, 220);
}
$('.npc-sim img').addEventListener('click', e => { e.stopPropagation(); abrirPastel(S.alEscenario(e), MENUS.npc(), '🧍'); });
$('.g9-foto').addEventListener('click', e => { e.stopPropagation(); abrirPastel(S.alEscenario(e), MENUS.gato(), '🐱'); });
$('.dr-sim').addEventListener('click', e => { e.stopPropagation(); abrirPastel(S.alEscenario(e), MENUS.drogada(), '🍄'); });

/* --------------------------------------------------------------
   NEVERA: AL SIM SE LE CANCELA LA ACCIÓN SIN MOTIVO
-------------------------------------------------------------- */
const ACCIONES_NEVERA = ['Preparar huevos con tostadas', 'Buscar algo de comer', 'Mirar dentro de la nevera', 'Recordar a qué vino', 'Preparar huevos con tostadas'];
function nevera(s) {
    const acc = $('.accion-sim', s), globo = $('.ac-globo', s), foto = $('.tarjeta-g .foto', s);
    let k = 0, cancelable = false;
    acc.className = 'accion-sim oculta';
    $$('.ac-duda', s).forEach(d => d.remove());
    const encolar = () => {
        $$('.ac-duda', s).forEach(d => d.remove());
        globo.textContent = ACCIONES_NEVERA[k++ % ACCIONES_NEVERA.length];
        acc.className = 'accion-sim';
        cancelable = true;
        S.sonido.pop();
    };
    const cancelar = () => {
        if (!cancelable) return;
        cancelable = false;
        acc.classList.add('cancelada');
        S.tono(660, .08, 'square', .07); S.tono(440, .1, 'square', .07, .08); S.tono(300, .25, 'triangle', .12, .17);
        S.luego(900, () => acc.classList.add('fuera'));
        S.luego(1200, () => {
            const d = document.createElement('div'); d.className = 'ac-duda'; d.textContent = '?';
            foto.append(d);
            S.sonido.pop();
            logro('nevera', 'Tarea cancelada', '¿A qué vino a la cocina?', '🍳');
        });
    };
    $('.ac-icono', s).onclick = e => { e.stopPropagation(); cancelar(); };
    // SE ENCOLA, SE CANCELA SOLA Y VUELVE A EMPEZAR
    const ciclo = () => { encolar(); S.luego(2600, cancelar); };
    S.luego(2200, ciclo);
    S.luego(2200, () => S.cada(8000, ciclo));
}

/* --------------------------------------------------------------
   TRUCO «kiki»: LLUVIA DE QUIPITOS (MATTER.JS)
-------------------------------------------------------------- */
const quip = { motor: null, piso: null, raf: 0, bolsas: [], tPiso: 0, tFin: 0 };
function quipitos() {
    if (!window.Matter) return;
    const { Engine, Bodies, Composite, Body } = Matter;
    const caja = $('#quipitos');
    if (!quip.motor) {
        quip.motor = Engine.create();
        quip.motor.gravity.y = 1.1;
        Composite.add(quip.motor.world, [
            Bodies.rectangle(-60, 540, 120, 3000, { isStatic: true }),
            Bodies.rectangle(1980, 540, 120, 3000, { isStatic: true })
        ]);
        let previo = performance.now();
        const bucle = (t) => {
            if (!quip.motor) return;
            Engine.update(quip.motor, Math.min(32, t - previo));
            previo = t;
            quip.bolsas.forEach(({ el, b, w, h }) => {
                el.style.transform = `translate(${b.position.x - w / 2}px,${b.position.y - h / 2}px) rotate(${b.angle}rad)`;
            });
            quip.raf = requestAnimationFrame(bucle);
        };
        quip.raf = requestAnimationFrame(bucle);
    }
    if (!quip.piso) { quip.piso = Bodies.rectangle(960, 1130, 2400, 100, { isStatic: true }); Composite.add(quip.motor.world, quip.piso); }
    S.sonido.kaching();
    logro('kiki', 'Antojo desbloqueado', 'Lluvia de Quipitos', '🍬');
    const n = 38;
    for (let k = 0; k < n; k++) {
        setTimeout(() => {
            if (!quip.motor) return;
            const w = azar(105, 165), h = w * 1458 / 1079;
            const b = Bodies.rectangle(azar(120, 1800), azar(-420, -180), w * .9, h * .92, { restitution: .25, friction: .6, frictionAir: .012, angle: azar(-.6, .6), chamfer: { radius: 14 } });
            Body.setAngularVelocity(b, azar(-.08, .08));
            const el = document.createElement('img');
            el.src = 'img/quipitos.png'; el.alt = ''; el.style.width = w + 'px';
            caja.append(el);
            quip.bolsas.push({ el, b, w, h });
            Composite.add(quip.motor.world, b);
            if (k % 3 === 0) S.ruido(.12, 'highpass', azar(3500, 6500), .1, .5);
        }, k * 70);
    }
    // DESPUÉS DE UN RATO SE QUITA EL PISO, SE CAEN TODAS Y SE LIMPIA
    clearTimeout(quip.tPiso); clearTimeout(quip.tFin);
    quip.tPiso = setTimeout(() => { if (quip.piso) { Composite.remove(quip.motor.world, quip.piso); quip.piso = null; S.sonido.whoosh(); } }, n * 70 + 9000);
    quip.tFin = setTimeout(limpiarQuipitos, n * 70 + 12000);
}
function limpiarQuipitos() {
    clearTimeout(quip.tPiso); clearTimeout(quip.tFin);
    cancelAnimationFrame(quip.raf);
    quip.motor = null; quip.piso = null; quip.bolsas = [];
    $('#quipitos').innerHTML = '';
}
S.quipitos = quipitos;

/* --------------------------------------------------------------
   CURSOR DEL JUGADOR (ALGUIEN MÁS TE ESTÁ JUGANDO)
-------------------------------------------------------------- */
const cursor = $('#cursor-jugador');
let posCursor = { x: 2000, y: 1150 };
function ponerCursor(p) { posCursor = p; cursor.style.transform = `translate(${p.x - 6}px,${p.y - 4}px)`; }
function moverCursor(dest, ms, gen) {
    const ini = { ...posCursor }, t0 = performance.now();
    const curva = azar(-120, 120);
    return new Promise(res => {
        const paso = () => {
            if (gen !== S.generacion) return res(false);
            const t = Math.min(1, (performance.now() - t0) / ms);
            const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            const arco = Math.sin(Math.PI * e) * curva;
            ponerCursor({ x: ini.x + (dest.x - ini.x) * e + arco * .4, y: ini.y + (dest.y - ini.y) * e - arco * .3 });
            if (t < 1) requestAnimationFrame(paso); else res(true);
        };
        paso();
    });
}
async function clicCursor() {
    cursor.classList.add('clic'); S.sonido.clic();
    await esperar(130);
    cursor.classList.remove('clic');
}
let cursorOcupado = false;
async function guionJugador(pasos) {
    if (cursorOcupado) return;
    cursorOcupado = true;
    const gen = S.generacion;
    ponerCursor({ x: 2000, y: azar(700, 1150) });
    cursor.classList.add('on');
    for (const p of pasos) {
        if (gen !== S.generacion) break;
        if (p.ir) { const destino = typeof p.ir === 'function' ? p.ir() : p.ir; if (!destino || !(await moverCursor(destino, p.ms || 900, gen))) break; }
        if (p.espera) await esperar(p.espera);
        if (p.clic) await clicCursor();
        if (p.hacer && gen === S.generacion) p.hacer();
    }
    await moverCursor({ x: 2050, y: 1180 }, 900, gen);
    cursor.classList.remove('on');
    cursorOcupado = false;
}
function opcionPastel(texto) {
    const b = $$('.pa-opcion', pastel).find(x => x.textContent === texto);
    return b ? centroDe(b) : null;
}
const GUIONES = {
    's-tienda': () => {
        const exp = $$('.s-tienda .ti-exp')[0], hidrante = $$('.s-tienda .ti-obj')[2];
        return [
            { ir: () => centroDe(exp), ms: 1300, espera: 500, clic: true, hacer: () => exp.click() },
            { espera: 1300 },
            { ir: () => centroDe(hidrante), ms: 1000, espera: 400, clic: true, hacer: () => hidrante.click() },
            { espera: 1200 }
        ];
    },
    's-npc': () => {
        const img = $('.npc-sim img');
        return [
            { ir: () => { const c = centroDe(img); return { x: c.x - 20, y: c.y - 120 }; }, ms: 1300, espera: 400, clic: true, hacer: () => { const c = centroDe(img); abrirPastel({ x: c.x - 20, y: c.y - 120 }, MENUS.npc(), '🧍'); } },
            { espera: 700 },
            { ir: () => opcionPastel('Despedir'), ms: 700, espera: 500, clic: true, hacer: () => $$('.pa-opcion', pastel).find(x => x.textContent === 'Despedir')?.click() },
            { espera: 600 }
        ];
    }
};
const RETRASO_GUION = { 's-tienda': 5200, 's-npc': 7500 };
function deambular() {
    const pasos = [];
    for (let k = 0; k < 4; k++) pasos.push({ ir: { x: azar(300, 1600), y: azar(200, 900) }, ms: azar(500, 900), espera: azar(150, 400), clic: Math.random() < .5 });
    guionJugador(pasos);
}

/* --------------------------------------------------------------
   CAÍDA DE LA SIMULACIÓN (PANTALLA AZUL Y REINICIO)
-------------------------------------------------------------- */
const caidaEl = $('#caida');
let enCaida = false, saltarCaida = false;
function dibujarQR(cv) {
    const ctx = cv.getContext('2d'), n = 25, t = cv.width / n;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#0a64c8';
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (Math.random() < .45) ctx.fillRect(i * t, j * t, t, t);
    [[0, 0], [n - 7, 0], [0, n - 7]].forEach(([a, b]) => {
        ctx.fillStyle = '#0a64c8'; ctx.fillRect(a * t, b * t, 7 * t, 7 * t);
        ctx.fillStyle = '#fff'; ctx.fillRect((a + 1) * t, (b + 1) * t, 5 * t, 5 * t);
        ctx.fillStyle = '#0a64c8'; ctx.fillRect((a + 2) * t, (b + 2) * t, 3 * t, 3 * t);
    });
}
// PANTALLAZO AZUL CON LA CARITA :( , CUENTA HASTA 100 % Y QUEDA EN NEGRO CON «REINICIANDO…»
async function pantallaAzul({ texto, codigo, extra = '' }) {
    caidaEl.className = 'on';
    caidaEl.innerHTML = `<div class="bs">
        <div class="bs-cara">:(</div>
        <div class="bs-txt"></div>
        ${extra ? '<div class="bs-cebo"></div>' : ''}
        <div class="bs-pct"><span>0</span>% completado</div>
        <div class="bs-pie"><canvas width="250" height="250"></canvas>
          <p>Para más información sobre este problema y posibles soluciones, abre la consola de trucos.<br><br>
          Si llamas a un técnico de soporte de la simulación, dale esta información:<br><b></b></p></div></div>`;
    $('.bs-txt', caidaEl).textContent = texto;
    if (extra) $('.bs-cebo', caidaEl).textContent = extra;
    $('.bs-pie b', caidaEl).textContent = 'Código de detención: ' + codigo;
    dibujarQR($('canvas', caidaEl));
    S.tono(220, 1.2, 'sawtooth', .12, 0, 40);
    const pct = $('.bs-pct span', caidaEl);
    let v = 0;
    while (v < 100 && !saltarCaida) {
        await esperar(azar(120, 420));
        v = Math.min(100, v + Math.floor(azar(3, 17)));
        pct.textContent = v;
    }
    await esperar(saltarCaida ? 50 : 900);
    caidaEl.className = 'on reinicio';
    caidaEl.innerHTML = '';
    await esperar(700);
    caidaEl.innerHTML = `<div class="rein"><svg viewBox="0 0 100 200"><polygon points="50,0 92,92 50,200 8,92" fill="#5be36a"/><polygon points="50,0 92,92 50,110" fill="#fff" opacity=".3"/></svg><div>Reiniciando realidad…</div></div>`;
    S.sonido.sube();
    await esperar(saltarCaida ? 600 : 2400);
}
async function caida() {
    if (enCaida) { saltarCaida = true; return; }
    enCaida = true; saltarCaida = false;
    cerrarPastel();
    pararMusica(false);
    S.sonido.glitch(500, true);
    await esperar(350);
    await pantallaAzul({ texto: 'Tu realidad tuvo un problema y necesita reiniciarse. Estamos recopilando información sobre el error y te reiniciaremos.', codigo: 'REALITY_NOT_FOUND' });
    caidaEl.className = '';
    caidaEl.innerHTML = '';
    S.glitch({ dur: 450, etiqueta: '⚠ Realidad restaurada desde la copia de seguridad' });
    enCaida = false;
    if (S.idx > 0) setTimeout(iniciarMusica, 600);
    setTimeout(() => logro('caida', 'Sobreviviste a la caída', 'El servidor de la realidad se reinició', '💥'), 900);
}
S.caida = caida;

/* --------------------------------------------------------------
   ANZUELO → SE «CUELGA» EL PC DE VERDAD (SIN NINGUNA PISTA DE LA SIMULACIÓN)
   1. SE CONGELA Y SALE EL CÍRCULO DE CARGA   2. (No responde)   3. AVISO DE WINDOWS
   4. PANTALLAZO AZUL QUE SE QUEDA HASTA QUE LA PRESENTADORA PASE LA DIAPOSITIVA
   5. AL PASAR: GLITCH Y «REINICIANDO SIMULACIÓN…»
   CADA «SIGUIENTE» ADELANTA UNA FASE (POR SI QUIERE IR MÁS RÁPIDO)
-------------------------------------------------------------- */
let enCebo = false, ceboSigue = null;
function esperarCebo(ms) {
    return new Promise(r => {
        const fin = () => { clearTimeout(t); ceboSigue = null; r(); };
        const t = setTimeout(fin, ms);
        ceboSigue = fin;
    });
}
function zumbidoTrabado(veces) {
    // EL SONIDO PEGADO DE CUANDO SE CONGELA EL PC
    const f = azar(90, 150);
    for (let k = 0; k < veces; k++) { S.tono(f, .065, 'sawtooth', .09, k * .075); S.ruido(.06, 'bandpass', 1400, .1, 2, k * .075); }
}
async function transicionCebo(n) {
    if (enCebo || enCaida) return;
    enCebo = true;
    cerrarPastel();
    const s = actual();
    const nuevos = [];
    const poner = (clase, html = '') => { const d = document.createElement('div'); d.className = clase; d.innerHTML = html; s.append(d); nuevos.push(d); return d; };
    // 1 · SE CONGELA
    s.classList.add('trabado');
    const giro = poner('cb-giro'); giro.style.left = '1190px'; giro.style.top = '640px';
    zumbidoTrabado(12);
    await esperarCebo(3200);
    // 2 · SE PONE BLANCA Y DICE (No responde)
    const barra = poner('cb-barra', '<span>Bacterias.pptx - PowerPoint (No responde)</span><span class="cb-btns"><span>—</span><span>☐</span><span>✕</span></span>');
    const velo = poner('cb-velo');
    void velo.offsetWidth;
    barra.classList.add('on'); velo.classList.add('on');
    await esperarCebo(2600);
    // 3 · AVISO DE WINDOWS
    poner('cb-dialogo', `<div class="cb-tit">Microsoft PowerPoint</div><div class="cb-cuerpo"><b>Microsoft PowerPoint no responde</b>Si cierra el programa, puede perder información.
        <span class="cb-op">→ Cerrar el programa</span><span class="cb-op">→ Esperar a que el programa responda</span></div>`);
    S.tono(880, .35, 'sine', .14); S.tono(660, .5, 'sine', .1, .12);
    giro.style.left = '1250px'; giro.style.top = '790px';
    await esperarCebo(5500);
    // 4 · PANTALLAZO AZUL (SE QUEDA HASTA QUE PASEN LA DIAPOSITIVA)
    caidaEl.className = 'on reinicio';
    caidaEl.innerHTML = '';
    await esperar(650);
    caidaEl.className = 'on win';
    caidaEl.innerHTML = `<div class="bs">
        <div class="bs-cara">:(</div>
        <div class="bs-txt">Se produjo un problema en su PC y es necesario reiniciarlo. Solo estamos recopilando información sobre el error y, a continuación, reiniciaremos el equipo.</div>
        <div class="bs-pct"><span>0</span>% completado</div>
        <div class="bs-pie"><canvas width="250" height="250"></canvas>
          <p>Para obtener más información acerca de este problema y posibles correcciones, visite https://www.windows.com/stopcode<br><br>
          Si llama a un técnico de soporte, proporciónele esta información:<br>Código de detención: CRITICAL_PROCESS_DIED</p></div></div>`;
    dibujarQR($('canvas', caidaEl));
    const pct = $('.bs-pct span', caidaEl);
    let contando = true;
    (async () => {
        let v = 0;
        await esperar(1500);
        while (contando && v < 100) {
            if (contando) pct.textContent = v;
            await esperar(azar(500, 1700));
            v = Math.min(100, v + Math.floor(azar(1, 9)));
        }
        if (contando) pct.textContent = 100;
    })();
    await new Promise(r => { ceboSigue = () => { ceboSigue = null; r(); }; });
    contando = false;
    // 5 · AHORA SÍ: SE REVELA LA SIMULACIÓN
    nuevos.forEach(el => el.remove());
    s.classList.remove('trabado');
    S.sonido.glitch(900, true);
    S.mostrar(n);
    caidaEl.className = '';
    caidaEl.innerHTML = '';
    enCebo = false;
    await S.glitch({ dur: 1600, fuerte: true, grande: 'REINICIANDO SIMULACIÓN…', etiqueta: '⚠ ERROR 0x5IM · presentación equivocada cargada' });
}
S.transicionCebo = transicionCebo;

/* --------------------------------------------------------------
   GRAVEDAD EN LA TERMINAL: CADA PALABRA SE CAE (MATTER.JS)
-------------------------------------------------------------- */
const fisica = { activa: false, motor: null, cuerpos: [], raf: 0, agarre: null, quitar: [] };
function derrumbe(s, elementos) {
    if (fisica.activa || !window.Matter) return;
    fisica.activa = true;
    const { Engine, Bodies, Composite, Body, Events } = Matter;
    s.classList.add('temblor');
    S.ruido(.9, 'lowpass', 120, .5, 1);
    S.tono(60, .9, 'sine', .3);
    setTimeout(() => {
        if (!fisica.activa) return;
        s.classList.remove('temblor');
        const motor = Engine.create();
        motor.gravity.y = 1.3;
        fisica.motor = motor;
        const paredes = [
            Bodies.rectangle(960, 1130, 2400, 100, { isStatic: true }),
            Bodies.rectangle(-50, 540, 100, 2400, { isStatic: true }),
            Bodies.rectangle(1970, 540, 100, 2400, { isStatic: true })
        ];
        Composite.add(motor.world, paredes);
        const k = S.escala();
        const piezas = elementos.map(el => [el, 0x0004, 0x0001 | 0x0004]);
        fisica.cuerpos = piezas.map(([el, cat, mask]) => {
            const c = centroDe(el), r = el.getBoundingClientRect();
            const w = Math.max(12, r.width / k), h = Math.max(12, r.height / k);
            const b = Bodies.rectangle(c.x, c.y, w, h, { restitution: .35, friction: .4, frictionAir: .01, chamfer: { radius: Math.min(10, h / 3) }, collisionFilter: { category: cat, mask } });
            Body.setVelocity(b, { x: azar(-4, 4), y: azar(-6, 0) });
            Body.setAngularVelocity(b, azar(-.04, .04));
            el.style.transition = 'none';
            el.classList.add('fisica-on');
            return { el, b, x0: c.x, y0: c.y };
        });
        Composite.add(motor.world, fisica.cuerpos.map(c => c.b));
        let ultimoGolpe = 0;
        Events.on(motor, 'collisionStart', ev => {
            const ahora = performance.now();
            if (ahora - ultimoGolpe < 70) return;
            const fuerte = ev.pairs.some(p => Math.abs(p.bodyA.velocity.y - p.bodyB.velocity.y) > 6);
            if (fuerte) { ultimoGolpe = ahora; S.tono(azar(70, 130), .15, 'sine', .25); S.ruido(.08, 'lowpass', 400, .2); }
        });
        let previo = performance.now();
        const bucle = (t) => {
            if (!fisica.activa) return;
            Engine.update(motor, Math.min(32, t - previo));
            previo = t;
            fisica.cuerpos.forEach(({ el, b, x0, y0 }) => {
                el.style.transform = `translate(${b.position.x - x0}px,${b.position.y - y0}px) rotate(${b.angle}rad)`;
            });
            fisica.raf = requestAnimationFrame(bucle);
        };
        fisica.raf = requestAnimationFrame(bucle);
        // ARRASTRAR Y LANZAR CON EL MOUSE
        const abajo = e => {
            e.preventDefault(); e.stopPropagation();
            const p = S.alEscenario(e);
            const hit = Matter.Query.point(fisica.cuerpos.map(c => c.b), p)[0];
            if (!hit) return;
            fisica.agarre = Matter.Constraint.create({ pointA: p, bodyB: hit, pointB: { x: p.x - hit.position.x, y: p.y - hit.position.y }, stiffness: .15, damping: .05, length: 0 });
            Composite.add(motor.world, fisica.agarre);
        };
        const mueve = e => { if (fisica.agarre) fisica.agarre.pointA = S.alEscenario(e); };
        const arriba = () => { if (fisica.agarre) { Composite.remove(motor.world, fisica.agarre); fisica.agarre = null; } };
        const bloqueaClic = e => { e.stopPropagation(); e.preventDefault(); };
        s.addEventListener('pointerdown', abajo, true);
        addEventListener('pointermove', mueve);
        addEventListener('pointerup', arriba);
        s.addEventListener('click', bloqueaClic, true);
        fisica.quitar = [
            () => s.removeEventListener('pointerdown', abajo, true),
            () => removeEventListener('pointermove', mueve),
            () => removeEventListener('pointerup', arriba),
            () => s.removeEventListener('click', bloqueaClic, true)
        ];
        logro('gravedad', 'Rompiste la física', 'La simulación olvidó cargar el piso… casi', '🍎');
    }, 750);
}
function partirPalabras(s) {
    // CADA PALABRA DE LA TERMINAL QUEDA EN SU PROPIO <span> PARA SER UN CUERPO
    $$('.te-l', s).forEach(l => {
        const texto = l.textContent;
        l.textContent = '';
        texto.split(/(\s+)/).forEach(w => {
            if (!w) return;
            if (/^\s+$/.test(w)) { l.append(w); return; }
            const sp = document.createElement('span'); sp.className = 'pz'; sp.textContent = w; l.append(sp);
        });
    });
    return $$('.te-l .pz', s);
}
function restaurarFisica(s) {
    if (!fisica.activa) return;
    fisica.activa = false;
    cancelAnimationFrame(fisica.raf);
    fisica.quitar.forEach(fn => fn());
    fisica.cuerpos.forEach(({ el }) => { el.style.transform = ''; el.style.transition = ''; el.classList.remove('fisica-on'); });
    fisica.cuerpos = [];
    s.classList.remove('temblor');
}

/* --------------------------------------------------------------
   CÁMARA · ESCANEANDO SIMS (pico.js, SIN INTERNET)
-------------------------------------------------------------- */
const camara = { flujo: null, raf: 0, caras: [], vivo: false, clasificar: null, memoria: null, inicio: 0, sello: false, etiquetas: 0 };
const ETIQUETAS = ['SIM #4821', 'NPC', 'JUGADOR 1', 'NPC · repite su frase', 'SIM SIN TRUCOS', 'ESTADO: confundido', 'SIM #0042', 'CARGANDO TEXTURAS…', 'NPC DE FONDO', 'MODO DIOS: NO'];
function cascada() {
    if (!camara.clasificar) {
        const bin = atob(window.FACEFINDER_B64);
        const bytes = new Int8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) << 24 >> 24;
        camara.clasificar = pico.unpack_cascade(bytes);
        camara.memoria = pico.instantiate_detection_memory(5);
    }
}
async function encenderCamara(s) {
    s.classList.remove('sin-camara');
    $('.ca-sello', s).classList.remove('on');
    camara.caras = []; camara.sello = false; camara.etiquetas = 0;
    const video = $('.ca-video', s), capa = $('.ca-capa', s);
    capa.width = 1920; capa.height = 1080;
    const ctx = capa.getContext('2d');
    ctx.clearRect(0, 0, 1920, 1080);
    const gen = S.generacion;
    try {
        camara.flujo = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
    } catch (e) {
        if (gen === S.generacion) { s.classList.add('sin-camara'); S.sonido.error(); }
        return;
    }
    if (gen !== S.generacion) { apagarCamara(); return; }
    video.srcObject = camara.flujo;
    await video.play().catch(() => {});
    cascada();
    camara.vivo = true;
    camara.inicio = performance.now();
    const ancho = 640, alto = 360;
    const lienzo = document.createElement('canvas'); lienzo.width = ancho; lienzo.height = alto;
    const lctx = lienzo.getContext('2d', { willReadFrequently: true });
    const gris = new Uint8Array(ancho * alto);
    let ultimo = 0, pitido = 0;
    const bucle = (t) => {
        if (!camara.vivo) return;
        camara.raf = requestAnimationFrame(bucle);
        if (t - ultimo > 70 && video.videoWidth) {
            ultimo = t;
            // EL VIDEO SE MUESTRA CON object-fit: cover; SE RECORTA IGUAL PARA DETECTAR
            const vw = video.videoWidth, vh = video.videoHeight, esc = Math.max(1920 / vw, 1080 / vh);
            const sw = 1920 / esc, sh = 1080 / esc, sx = (vw - sw) / 2, sy = (vh - sh) / 2;
            lctx.drawImage(video, sx, sy, sw, sh, 0, 0, ancho, alto);
            const rgba = lctx.getImageData(0, 0, ancho, alto).data;
            for (let i = 0; i < ancho * alto; i++) gris[i] = (rgba[i * 4] * 2 + rgba[i * 4 + 1] * 7 + rgba[i * 4 + 2]) / 10;
            let dets = pico.run_cascade({ pixels: gris, nrows: alto, ncols: ancho, ldim: ancho }, camara.clasificar, { shiftfactor: .1, minsize: 26, maxsize: 400, scalefactor: 1.1 });
            dets = camara.memoria(dets);
            dets = pico.cluster_detections(dets, .2).filter(d => d[3] > 50);
            actualizarCaras(dets.map(d => ({ x: 1920 - d[1] * 3, y: d[0] * 3, s: d[2] * 3 })));
        }
        dibujarCaras(ctx, t);
        $('.ca-contador b', s).textContent = camara.caras.length;
        $('.ca-puntos', s).textContent = '.'.repeat(1 + Math.floor(t / 400) % 3);
        if (t - pitido > 900) { pitido = t; S.tono(1760, .05, 'sine', .05); }
        if (!camara.sello && performance.now() - camara.inicio > 6500) {
            camara.sello = true;
            $('.ca-sello', s).classList.add('on');
            S.tono(90, .3, 'square', .2); S.ruido(.2, 'lowpass', 300, .3);
            if (camara.caras.length) logro('camara', 'Escaneado', 'Ya sabemos quién eres, Sim', '🔍');
        }
    };
    camara.raf = requestAnimationFrame(bucle);
}
function actualizarCaras(dets) {
    camara.caras.forEach(c => c.visto = false);
    dets.forEach(d => {
        let mejor = null, dist = 1e9;
        camara.caras.forEach(c => { const dd = Math.hypot(c.x - d.x, c.y - d.y); if (!c.visto && dd < dist && dd < c.s * .9) { dist = dd; mejor = c; } });
        if (mejor) {
            mejor.x += (d.x - mejor.x) * .45; mejor.y += (d.y - mejor.y) * .45; mejor.s += (d.s - mejor.s) * .3;
            mejor.visto = true; mejor.vida = 8;
        } else {
            camara.caras.push({ ...d, visto: true, vida: 8, nace: performance.now(), etiqueta: ETIQUETAS[camara.etiquetas++ % ETIQUETAS.length] });
            S.tono(1320, .08, 'square', .06); S.tono(1760, .1, 'square', .05, .08);
        }
    });
    camara.caras = camara.caras.filter(c => c.visto || --c.vida > 0);
}
function dibujarCaras(ctx, t) {
    ctx.clearRect(0, 0, 1920, 1080);
    camara.caras.forEach((c, k) => {
        const aparece = Math.min(1, (performance.now() - c.nace) / 400);
        const m = c.s * .62;
        // ESQUINAS DEL RECUADRO
        ctx.strokeStyle = 'rgba(91,255,138,.95)'; ctx.lineWidth = 5; ctx.shadowColor = '#39ff7a'; ctx.shadowBlur = 12;
        const L = m * .35;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
            const x = c.x + sx * m, y = c.y + sy * m;
            ctx.beginPath(); ctx.moveTo(x, y - sy * -L); ctx.lineTo(x, y); ctx.lineTo(x - sx * L, y); ctx.stroke();
        });
        // DIAMANTE VERDE GIRANDO SOBRE LA CABEZA
        const pb = c.s * .32 * aparece, px = c.x, py = c.y - m - pb * 1.6 + Math.sin(t / 300 + k) * 10;
        const giro = Math.cos(t / 450 + k);
        ctx.save();
        ctx.translate(px, py);
        ctx.shadowColor = '#39ff7a'; ctx.shadowBlur = 30;
        const g = ctx.createLinearGradient(0, -pb, 0, pb * 1.2);
        g.addColorStop(0, '#c4ff8f'); g.addColorStop(1, '#1f9e3a');
        ctx.fillStyle = g;
        const ax = pb * .55 * (.35 + .65 * Math.abs(giro));
        ctx.beginPath(); ctx.moveTo(0, -pb); ctx.lineTo(ax, -pb * .1); ctx.lineTo(0, pb * 1.2); ctx.lineTo(-ax, -pb * .1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.3)';
        ctx.beginPath(); ctx.moveTo(0, -pb); ctx.lineTo(ax * (giro > 0 ? 1 : -1), -pb * .1); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
        // ETIQUETA
        ctx.shadowBlur = 0;
        ctx.font = "700 30px 'JetBrains Mono', monospace";
        const w = ctx.measureText(c.etiqueta).width + 36, ey = c.y + m + 24;
        ctx.fillStyle = 'rgba(5,20,12,.85)'; ctx.strokeStyle = '#5bff8a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(c.x - w / 2, ey, w, 48, 24); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#5bff8a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(c.etiqueta, c.x, ey + 25);
    });
}
function apagarCamara() {
    camara.vivo = false;
    cancelAnimationFrame(camara.raf);
    camara.flujo?.getTracks().forEach(tr => tr.stop());
    camara.flujo = null;
    const v = $('.s-camara .ca-video');
    if (v) v.srcObject = null;
}

/* --------------------------------------------------------------
   CRÉDITOS
-------------------------------------------------------------- */
function entrarCreditos(s) {
    const rollo = $('.cr-rollo', s), gracias = $('.cr-gracias', s);
    rollo.style.animation = 'none'; void rollo.offsetWidth; rollo.style.animation = '';
    const fin = -(rollo.offsetTop + gracias.offsetTop + gracias.offsetHeight / 2 - 540);
    rollo.style.setProperty('--fin', fin + 'px');
    volumenMusica(.14);
    S.luego(36000, () => { if (claveActual() === 's-creditos') S.ir(S.idx + 1); });
}

/* --------------------------------------------------------------
   EVENTOS DE LA PRESENTACIÓN
-------------------------------------------------------------- */
let microVistos = 0;
document.addEventListener('sim:diapositiva', ({ detail: { s, clave } }) => {
    cerrarPastel();
    volumenMusica(.075);
    if (clave !== 's-cebo') iniciarMusica();
    if (clave === 's-real') S.luego(2500, () => logro('despertar', 'Despertaste', 'Saliste de la presentación falsa', '🧠'));
    if (clave === 's-camara') encenderCamara(s);
    if (clave === 's-g56') nevera(s);
    if (clave === 's-creditos') entrarCreditos(s);
    if (clave === 's-final') S.luego(4000, () => logro('final', 'Sobreviviste a la presentación', 'Partida guardada… o eso creemos', '🏁'));
    if (clave === 's-alien') $('.alien-cuadro', s).onclick = e => { e.stopPropagation(); abrirPastel(S.alEscenario(e), MENUS.alien(), '👽'); };
    if (GUIONES[clave]) S.luego(RETRASO_GUION[clave], () => guionJugador(GUIONES[clave]()));
});
document.addEventListener('sim:salir', ({ detail: { s, clave } }) => {
    if (clave === 's-camara') apagarCamara();
    if (clave === 's-terminal') restaurarFisica(s);
    cursor.classList.remove('on');
    cursorOcupado = false;
});
document.addEventListener('sim:paso', ({ detail: { s, clave, paso } }) => {
    if (clave !== 's-terminal') return;
    if (paso >= 1) derrumbe(s, partirPalabras(s)); else restaurarFisica(s);
});
document.addEventListener('sim:glitch', ({ detail: { micro } }) => {
    if (micro && ++microVistos === 2) logro('micro', 'Glitch detectado', 'La realidad parpadeó. ¿Lo viste?', '👁️');
});
document.addEventListener('sim:consola', () => logro('consola', 'Hacker de la realidad', 'Usaste la consola de trucos', '💻'));

// EL ALIEN: LOGRO LA PRIMERA VEZ QUE HACE «SHHH»
const secuenciaAlien = S.escenas['s-alien'].secuencia;
S.escenas['s-alien'].secuencia = function () {
    S.luego(900, () => logro('alien', 'Testigo', 'Viste lo que no debías ver', '👽'));
    return secuenciaAlien.apply(this, arguments);
};

/* --------------------------------------------------------------
   TECLADO (EN CAPTURA PARA BLOQUEAR TODO DURANTE LA CAÍDA)
-------------------------------------------------------------- */
addEventListener('keydown', e => {
    if (enCebo) {
        // DURANTE EL CUELGUE FALSO SOLO SIRVE «SIGUIENTE» (Y X / ESC), QUE ADELANTA UNA FASE
        e.preventDefault(); e.stopImmediatePropagation();
        if (!e.repeat && ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter', 'x', 'X', 'Escape'].includes(e.key)) ceboSigue?.();
        return;
    }
    if (enCaida) {
        e.preventDefault(); e.stopImmediatePropagation();
        if (e.key === 'x' || e.key === 'X' || e.key === 'Escape') saltarCaida = true;
        return;
    }
    if (e.target.tagName === 'INPUT' || e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Escape') cerrarPastel();
    if (e.key === 'x' || e.key === 'X') { e.stopImmediatePropagation(); caida(); }
    if (e.key === 'j' || e.key === 'J') { e.stopImmediatePropagation(); deambular(); }
    if (e.key === 'u' || e.key === 'U') {
        e.stopImmediatePropagation();
        musica.on = !musica.on;
        if (musica.on) iniciarMusica(); else pararMusica();
        S.estado(musica.on ? 'Música: ENCENDIDA' : 'Música: APAGADA');
    }
    if (e.key === 'v' || e.key === 'V') logro('votacion', 'Democracia simulada', 'Abriste la votación de manos', '🗳️');
}, true);
// LA MÚSICA ARRANCA CON LA PRIMERA TECLA (EL NAVEGADOR NO DEJA SONAR ANTES)
addEventListener('keydown', () => { if (S.idx > 0) setTimeout(iniciarMusica, 50); });
})();
