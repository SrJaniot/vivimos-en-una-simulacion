/* PRESENTACIÓN WEB · VIVIMOS EN UNA SIMULACIÓN */
(() => {
'use strict';

const escenario = document.getElementById('escenario');
const slides = [...document.querySelectorAll('.slide')];
const capa = document.getElementById('capa-glitch');
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const azar = (a, b) => a + Math.random() * (b - a);

let idx = 0;
let paso = 0;
let glitcheando = false;
let generacion = 0;          // CAMBIA EN CADA DIAPOSITIVA PARA CANCELAR ANIMACIONES VIEJAS
let temporizadores = [];
let detenedores = [];
let microAuto = true;

/* --------------------------------------------------------------
   ESCALA DEL ESCENARIO
-------------------------------------------------------------- */
function escalar() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    escenario.style.transform = `scale(${s})`;
    escenario.style.left = ((innerWidth - 1920 * s) / 2) + 'px';
    escenario.style.top = ((innerHeight - 1080 * s) / 2) + 'px';
}
addEventListener('resize', escalar);
escalar();

/* --------------------------------------------------------------
   TEMPORIZADORES QUE SE LIMPIAN AL CAMBIAR DE DIAPOSITIVA
-------------------------------------------------------------- */
function luego(ms, fn) { const t = setTimeout(fn, ms); temporizadores.push(t); return t; }
function cada(ms, fn) { const t = setInterval(fn, ms); temporizadores.push(t); return t; }
function limpiar() {
    temporizadores.forEach(t => { clearTimeout(t); clearInterval(t); });
    temporizadores = [];
    detenedores.forEach(fn => fn());
    detenedores = [];
}

/* --------------------------------------------------------------
   SONIDOS SINTETIZADOS (SIN ARCHIVOS NI DERECHOS DE TERCEROS)
-------------------------------------------------------------- */
let ac = null, maestro = null, bufRuido = null, mudo = false;
function audio() {
    if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
        maestro = ac.createGain();
        maestro.gain.value = .55;
        maestro.connect(ac.destination);
        bufRuido = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
        const d = bufRuido.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
}
function env(g, t, a, v, r) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + r);
}
function tono(frec, dur, tipo = 'sine', vol = .3, retraso = 0, frecFin = null) {
    if (mudo || !audio()) return;
    const t = ac.currentTime + retraso;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(frec, t);
    if (frecFin) o.frequency.exponentialRampToValueAtTime(frecFin, t + dur);
    env(g, t, .01, vol, dur);
    o.connect(g).connect(maestro);
    o.start(t); o.stop(t + dur + .05);
}
function ruido(dur, filtro = 'bandpass', frec = 1200, vol = .3, q = 1, retraso = 0) {
    if (mudo || !audio()) return null;
    const t = ac.currentTime + retraso;
    const s = ac.createBufferSource(); s.buffer = bufRuido; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = filtro; f.frequency.value = frec; f.Q.value = q;
    const g = ac.createGain();
    env(g, t, .01, vol, dur);
    s.connect(f).connect(g).connect(maestro);
    s.start(t, Math.random()); s.stop(t + dur + .05);
    return f;
}
const sonido = {
    glitch(ms, fuerte) {
        if (mudo || !audio()) return;
        const dur = ms / 1000, t0 = ac.currentTime;
        const f = ruido(dur, 'bandpass', 900, fuerte ? .5 : .32, 3);
        if (f) for (let t = 0; t < dur; t += .045) f.frequency.setValueAtTime(azar(200, 5000), t0 + t);
        const pasos = Math.max(2, Math.round(dur / .07));
        for (let i = 0; i < pasos; i++) if (Math.random() < .6) tono(azar(80, 1400), .05, 'square', fuerte ? .12 : .07, i * .07);
    },
    micro() { ruido(.14, 'highpass', 2500, .12); tono(azar(300, 900), .06, 'square', .05); },
    clic() { tono(1800, .03, 'square', .08); ruido(.03, 'highpass', 4000, .1); },
    tecla() { ruido(.025, 'bandpass', azar(2500, 4200), .07, 2); },
    error() { tono(520, .18, 'triangle', .3); tono(390, .32, 'triangle', .3, .16); },
    ding() { tono(988, .5, 'sine', .22); tono(1318, .6, 'sine', .16, .09); },
    kaching() { tono(1318, .12, 'square', .08); tono(1760, .35, 'triangle', .22, .08); tono(2637, .4, 'sine', .12, .16); ruido(.25, 'highpass', 6000, .08, 1, .08); },
    pop() { tono(300, .12, 'sine', .25, 0, 900); },
    clink() { tono(2400, .25, 'triangle', .1); tono(3100, .3, 'sine', .08, .03); ruido(.18, 'highpass', 5000, .12); },
    whoosh() { const f = ruido(.5, 'bandpass', 400, .25, .8); if (f) f.frequency.exponentialRampToValueAtTime(2500, ac.currentTime + .45); },
    shh() { ruido(1.3, 'highpass', 3200, .35, .7); ruido(1.3, 'bandpass', 5500, .2, 1.5); },
    sube() { [523, 659, 784, 1046].forEach((f, i) => tono(f, .18, 'triangle', .14, i * .08)); }
};

/* --------------------------------------------------------------
   GLITCH (SEPARA CANALES RGB, CORTA FRANJAS Y AGREGA BLOQUES)
-------------------------------------------------------------- */
const COLORES_GLITCH = ['#ff2bd6', '#22e3ff', '#39ff7a', '#ffffff', '#0b0b1e'];
function clonar(src, extra) {
    const c = src.cloneNode(true);
    c.classList.add('gc', 'clon', 'activa');
    if (extra) c.classList.add(extra);
    $$('canvas', c).forEach(x => x.remove());
    return c;
}
function glitch({ dur = 560, etiqueta = '', fuerte = false, micro = false, grande = '', cambio = null } = {}) {
    if (glitcheando) return Promise.resolve();
    glitcheando = true;
    return new Promise(resolver => {
        let franjas = [], rojo, cian;
        const amp = fuerte ? 46 : micro ? 10 : 22;
        function construir(src) {
            capa.innerHTML = '';
            rojo = clonar(src, 'g-rojo');
            cian = clonar(src, 'g-cian');
            capa.append(rojo, cian);
            franjas = [];
            const n = micro ? 3 : fuerte ? 8 : 5;
            for (let i = 0; i < n; i++) { const f = clonar(src); capa.append(f); franjas.push(f); }
            const lineas = document.createElement('div'); lineas.className = 'g-lineas'; capa.append(lineas);
            for (let i = 0; i < (micro ? 3 : fuerte ? 16 : 9); i++) {
                const d = document.createElement('i'); d.className = 'g-deco'; capa.append(d);
            }
            if (etiqueta) { const e = document.createElement('div'); e.className = 'g-etiqueta'; e.textContent = etiqueta; capa.append(e); }
            if (grande) { const g = document.createElement('div'); g.className = 'g-grande'; g.textContent = grande; g.style.opacity = 0; capa.append(g); }
        }
        function cuadro(t) {
            const fuerza = micro ? 1 : Math.sin(Math.min(1, t) * Math.PI) * .7 + .3;
            const a = amp * fuerza;
            rojo.style.transform = `translate(${azar(-a, a)}px,${azar(-a / 4, a / 4)}px)`;
            cian.style.transform = `translate(${azar(-a, a)}px,${azar(-a / 4, a / 4)}px)`;
            franjas.forEach(f => {
                if (Math.random() < .35) { f.style.visibility = 'hidden'; return; }
                f.style.visibility = 'visible';
                const y = azar(0, 95), h = azar(1.5, fuerte ? 16 : 9);
                f.style.clipPath = `inset(${y}% 0 ${Math.max(0, 100 - y - h)}% 0)`;
                f.style.transform = `translateX(${azar(-a * 4, a * 4)}px)`;
            });
            $$('.g-deco', capa).forEach(d => {
                if (Math.random() < .3) { d.style.display = 'none'; return; }
                d.style.display = 'block';
                const barra = Math.random() < .55;
                d.style.left = azar(-100, 1900) + 'px';
                d.style.top = azar(0, 1070) + 'px';
                d.style.width = (barra ? azar(200, 1200) : azar(16, 60)) + 'px';
                d.style.height = (barra ? azar(3, 12) : azar(16, 60)) + 'px';
                d.style.background = COLORES_GLITCH[Math.floor(Math.random() * COLORES_GLITCH.length)];
                d.style.opacity = azar(.6, 1);
            });
            if (fuerte) capa.style.filter = Math.random() < .12 ? 'invert(1)' : Math.random() < .1 ? 'brightness(2.2)' : 'none';
            const g = $('.g-grande', capa);
            if (g) g.style.opacity = t > .35 && t < .85 && Math.random() < .8 ? 1 : 0;
        }
        construir(slides[idx]);
        capa.classList.add('on');
        if (micro) sonido.micro(); else sonido.glitch(dur, fuerte);
        avisarEvento('sim:glitch', { micro, fuerte });
        const inicio = performance.now();
        let cambiado = !cambio;
        cuadro(0);
        const reloj = setInterval(() => {
            const t = (performance.now() - inicio) / dur;
            if (!cambiado && t >= .5) {
                cambiado = true;
                cambio();
                construir(slides[idx]);
            }
            if (t >= 1) {
                clearInterval(reloj);
                capa.classList.remove('on');
                capa.style.filter = 'none';
                capa.innerHTML = '';
                glitcheando = false;
                resolver();
                return;
            }
            cuadro(t);
        }, 45);
    });
}

/* --------------------------------------------------------------
   NAVEGACIÓN
-------------------------------------------------------------- */
function mostrar(n) {
    limpiar();
    generacion++;
    const vieja = slides[idx];
    if (vieja) { vieja.classList.remove('activa'); escenas[claveDe(vieja)]?.salir?.(vieja); avisarEvento('sim:salir', { s: vieja, clave: claveDe(vieja) }); }
    idx = n; paso = 0;
    const s = slides[idx];
    $$('.paso', s).forEach(e => e.classList.remove('visible'));
    s.classList.add('activa');
    escenas[claveDe(s)]?.entrar?.(s);
    avisarEvento('sim:diapositiva', { s, clave: claveDe(s), idx });
    $('#progreso i').style.width = (idx / (slides.length - 1) * 100) + '%';
    try { history.replaceState(null, '', '#' + (idx + 1)); } catch (e) { /* file:// sin historial */ }
}
function avisarEvento(nombre, detalle) { document.dispatchEvent(new CustomEvent(nombre, { detail: detalle })); }
function claveDe(s) { return [...s.classList].find(c => c.startsWith('s-')); }

function ir(n, modo = 'adelante') {
    if (n < 0 || n >= slides.length || n === idx || glitcheando) return;
    const actual = slides[idx];
    if (modo === 'adelante') {
        const esCebo = actual.classList.contains('s-cebo');
        // EL ANZUELO SE TRABA, SALE EL PANTALLAZO AZUL Y LUEGO ENTRA LA PRESENTACIÓN REAL (extras.js)
        if (esCebo && window.SIM.transicionCebo) { window.SIM.transicionCebo(n); return; }
        glitch({
            dur: esCebo ? 1900 : 620,
            fuerte: esCebo,
            etiqueta: actual.dataset.error || '',
            grande: esCebo ? 'REINICIANDO SIMULACIÓN…' : '',
            cambio: () => mostrar(n)
        });
    } else {
        glitch({ dur: 260, micro: true, cambio: () => mostrar(n) });
    }
}
function maxPasos() { return +(slides[idx].dataset.pasos || 0); }
function aplicarPaso() {
    const s = slides[idx];
    $$('.paso', s).forEach(e => e.classList.toggle('visible', +e.dataset.paso <= paso));
    escenas[claveDe(s)]?.paso?.(s, paso);
    avisarEvento('sim:paso', { s, clave: claveDe(s), paso });
}
function siguiente() {
    if (glitcheando) return;
    if (paso < maxPasos()) { paso++; aplicarPaso(); return; }
    ir(idx + 1);
}
function anterior() {
    if (glitcheando) return;
    if (paso > 0) { paso--; aplicarPaso(); return; }
    ir(idx - 1, 'atras');
}

/* --------------------------------------------------------------
   UTILIDADES DE ANIMACIÓN
-------------------------------------------------------------- */
function escribir(el, texto, vel = 55, conSonido = true, parar = () => false) {
    const gen = generacion;
    el.textContent = '';
    el.classList.add('cursor');
    return new Promise(res => {
        let i = 0;
        const sig = () => {
            if (gen !== generacion || parar()) return res();
            if (i >= texto.length) { el.classList.remove('cursor'); return res(); }
            el.textContent += texto[i];
            if (conSonido && texto[i] !== ' ') sonido.tecla();
            i++;
            luego(vel * azar(.6, 1.4), sig);
        };
        sig();
    });
}
function contar(el, desde, hasta, ms, formato = n => Math.round(n).toLocaleString('es-CO')) {
    const t0 = performance.now(), gen = generacion;
    const paso = () => {
        if (gen !== generacion) return;
        const t = Math.min(1, (performance.now() - t0) / ms);
        const e = 1 - Math.pow(1 - t, 3);
        el.textContent = formato(desde + (hasta - desde) * e);
        if (t < 1) requestAnimationFrame(paso);
    };
    paso();
}

/* LLUVIA DE CÓDIGO EN UN CANVAS */
function lluvia(canvas, { color = '#39ff7a', tam = 22, alfa = .08, velocidad = 1, chars = '01アイウエオカキクケコ{}<>/;=+*' } = {}) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.clientWidth || canvas.offsetWidth || 1920;
    const h = canvas.height = canvas.clientHeight || canvas.offsetHeight || 1080;
    const cols = Math.ceil(w / tam);
    const y = Array.from({ length: cols }, () => azar(-h / tam, 0));
    let vivo = true, ultimo = 0;
    ctx.clearRect(0, 0, w, h);
    const dibujar = (t) => {
        if (!vivo) return;
        if (t - ultimo > 55 / velocidad) {
            ultimo = t;
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = `rgba(0,0,0,${alfa * 2})`;
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = color;
            ctx.font = `${tam}px 'JetBrains Mono', monospace`;
            for (let i = 0; i < cols; i++) {
                if (Math.random() < .5) continue;
                ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * tam, y[i] * tam);
                if (y[i] * tam > h && Math.random() > .975) y[i] = 0;
                y[i]++;
            }
        }
        requestAnimationFrame(dibujar);
    };
    requestAnimationFrame(dibujar);
    detenedores.push(() => { vivo = false; });
}

/* --------------------------------------------------------------
   ESCENAS: QUÉ HACE CADA DIAPOSITIVA AL ENTRAR Y EN CADA PASO
-------------------------------------------------------------- */
const escenas = {

    's-real': {
        entrar(s) {
            const h = $('.real-titulo', s), hora = $('.real-hora', s);
            h.textContent = ''; hora.textContent = '';
            luego(500, () => escribir(h, h.dataset.escribir, 70).then(() => new Promise(r => luego(2200, r))).then(() => {
                const ahora = new Date();
                const hh = ahora.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
                const ff = ahora.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
                return escribir(hora, `Son las ${hh} del ${ff}…`, 45);
            }).then(() => new Promise(r => luego(1300, r))).then(() => {
                const extra = document.createElement('span'); extra.className = 'real-seguro'; hora.append(extra);
                return escribir(extra, ' ¿seguro que es real?', 60);
            }));
        }
    },

    's-hipotesis': {
        entrar(s) {
            const g = $('.hip-gorro', s);
            g.classList.remove('cae'); void g.offsetWidth;
            luego(1300, () => { g.classList.add('cae'); sonido.whoosh(); luego(660, sonido.clink); });
        }
    },

    's-partidas': {
        entrar(s) {
            const caja = $('.part-puntos', s);
            if (!caja.children.length) {
                for (let f = 0; f < 7; f++) for (let c = 0; c < 13; c++) {
                    const i = document.createElement('i');
                    if (f === 3 && c === 7) i.className = 'tu';
                    caja.append(i);
                }
            }
            $$('i', caja).forEach(i => i.style.setProperty('--d', (i.classList.contains('tu') ? 2.2 : azar(.4, 1.9)) + 's'));
            for (let k = 0; k < 14; k++) luego(400 + k * 110, sonido.pop);
        }
    },

    's-tu': {
        entrar(s) {
            lluvia($('.lluvia', s), { alfa: .06 });
            const rej = $('.tu-rejilla', s);
            if (!rej.children.length) for (let k = 0; k < 13 * 7; k++) rej.append(document.createElement('i'));
            const celdas = $$('i', rej);
            let pos = { c: 6, f: 3 }, radio = -1;
            const pintar = () => celdas.forEach((el, k) => {
                const c = k % 13, f = Math.floor(k / 13);
                const d = Math.max(Math.abs(c - pos.c), Math.abs(f - pos.f));
                const n = d > radio ? 5 : Math.min(d, 5);
                el.className = 'n' + n;
                el.textContent = d === 0 && radio >= 0 ? 'TÚ' : '';
            });
            pintar();
            for (let r = 0; r <= 6; r++) luego(500 + r * 160, () => { radio = r; pintar(); sonido.pop(); });
            luego(2600, () => cada(1500, () => {
                const op = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dc, df]) => pos.c + dc >= 2 && pos.c + dc <= 10 && pos.f + df >= 1 && pos.f + df <= 5);
                const [dc, df] = op[Math.floor(Math.random() * op.length)];
                pos = { c: pos.c + dc, f: pos.f + df };
                pintar();
            }));
        }
    },

    's-alien': {
        // FONDO HD + ALIEN DE LOS CUADROS · c01 = MIRANDO A SHAKIRA · c11–c15 = SE VOLTEA · c16–c20 = SHHH
        entrar(s) {
            const img = $('.alien-cuadro', s);
            this.img = img;
            if (!this.cargados) {
                this.cargados = Array.from({ length: 20 }, (_, k) => { const i = new Image(); i.src = `img/alien/c${String(k + 1).padStart(2, '0')}.jpg`; return i; });
            }
            img.src = this.cargados[0].src;
            this.ocupado = false;
            img.onclick = () => this.secuencia();
            const programar = (ms) => luego(ms, () => { this.secuencia(); programar(azar(7000, 12000)); });
            programar(3500);
        },
        secuencia() {
            if (this.ocupado) return;
            this.ocupado = true;
            const gen = generacion, img = this.img;
            const cuadro = n => { if (gen === generacion) img.src = this.cargados[n - 1].src; };
            const giro = [11, 12, 13, 14, 15];
            const shh = [16, 17, 18, 19, 20, 19, 18, 17, 16, 17, 18, 19, 20, 19, 18, 17, 16];
            let t = 0;
            giro.forEach(n => { luego(t, () => cuadro(n)); t += 120; });
            luego(t, () => sonido.shh());
            shh.forEach(n => { luego(t, () => cuadro(n)); t += 150; });
            [...giro].reverse().forEach(n => { luego(t, () => cuadro(n)); t += 120; });
            luego(t, () => { cuadro(1); this.ocupado = false; });
        }
    },

    's-sim': {
        entrar(s) {
            const t = $('.sim-cargando', s);
            const frases = ['Cargando realidad…', 'Reticulando splines…', 'Generando NPCs…', 'Escondiendo el código fuente…', 'Borrando recuerdos de la beta…', 'Cargando realidad…'];
            t.textContent = frases[0];
            let k = 0;
            cada(2300, () => { if (k < frases.length - 1) t.textContent = frases[++k]; });
        }
    },

    's-glitches': {
        entrar(s) {
            luego(900, sonido.error);
            const dlg = $('.gl-dialogo', s), p = $('p', dlg);
            p.textContent = 'La simulación detectó fallos en tu realidad. ¿Quieres reportarlos al jugador?';
            $('.gl-ignorar', s).onclick = (e) => {
                e.stopPropagation();
                sonido.error();
                p.textContent = 'No puedes ignorar la simulación. Intenta de nuevo.';
                dlg.classList.remove('sacude'); void dlg.offsetWidth; dlg.classList.add('sacude');
            };
        }
    },

    's-g12': { entrar(s) { luego(400, sonido.pop); luego(650, sonido.pop); alternarFotos(s); } },
    's-g56': { entrar(s) { luego(400, sonido.pop); luego(650, sonido.pop); alternarFotos(s); } },

    's-g9': {
        entrar(s) {
            luego(300, sonido.pop);
            lluvia($('.g9-codigo', s), { color: 'rgba(91,255,138,.9)', tam: 20, alfa: .05, velocidad: .6, chars: '01{}<>/;=' });
            // LA SIM DROGADA NO ENTIENDE NADA
            const g = $('.dr-globo', s);
            const frases = ['¿?', '¿Los colores tienen sonido?', '¿?¿?', 'Las paredes respiran…', '¿Quién soy?', '¿Eso es una gata o un código?', 'Wooooow', '¿Ya empezó la presentación?', '¿Qué día es hoy?'];
            let k = 0;
            g.textContent = frases[0];
            g.classList.remove('oculto');
            cada(2900, () => {
                g.classList.add('oculto');
                luego(260, () => { k = (k + 1) % frases.length; g.textContent = frases[k]; g.classList.remove('oculto'); });
            });
        }
    },

    's-trucos': {
        entrar(s) {
            const inp = $('.consola-local', s);
            inp.value = '';
            $('.tr-pista', s).classList.remove('on');
            luego(5000, () => $('.tr-pista', s).classList.add('on'));
        }
    },

    's-t12': {
        entrar(s) {
            const sw = $('.interruptor', s);
            sw.classList.remove('apagado');
            $('.edad', s).textContent = '39';
            escribirComandos(s);
            luego(2600, () => { sw.classList.add('apagado'); sonido.clic(); });
        },
        paso(s, n) {
            if (!n) return;
            sonido.kaching();
            if (n === 2) {
                const e = $('.edad', s);
                luego(900, () => contar(e, 39, 54, 900, Math.round));
                luego(2100, () => { e.textContent = '39'; sonido.error(); });
            }
        }
    },

    's-t34': {
        entrar(s) {
            const nec = $('.necesidades', s);
            nec.classList.remove('llenas');
            $$('i', nec).forEach(i => i.style.setProperty('--v', azar(8, 35) + '%'));
            escribirComandos(s).then(() => { nec.classList.add('llenas'); sonido.sube(); });
        },
        paso(s, n) { if (n) sonido.kaching(); }
    },

    's-npc': {
        entrar(s) {
            const g = $('.npc-globo', s);
            const frases = ['Buenos días.', 'Bonito día, ¿no?', 'Buenos días.', 'Tengo que ir al trabajo.', 'Buenos días.', '…', 'Buenos días.'];
            let k = 0;
            g.textContent = frases[0];
            g.classList.remove('oculto');
            cada(2600, () => {
                g.classList.add('oculto');
                luego(260, () => { k = (k + 1) % frases.length; g.textContent = frases[k]; g.classList.remove('oculto'); sonido.pop(); });
            });
        }
    },

    's-tienda': {
        entrar(s) {
            const saldo = $('.ti-saldo', s), aviso = $('.ti-aviso', s);
            saldo.textContent = '50.000';
            luego(800, () => contar(saldo, 50000, 12, 2600));
            luego(800, () => { for (let k = 0; k < 10; k++) luego(k * 200, () => tono(azar(600, 1200), .05, 'square', .05)); });
            $$('.comprable', s).forEach(c => c.onclick = () => {
                sonido.error();
                aviso.textContent = c.textContent.includes('AGOTADO') ? 'Agotado hasta Semana Santa' : 'Fondos insuficientes · § 12';
                aviso.classList.add('on');
                luego(1400, () => aviso.classList.remove('on'));
            });
        }
    },

    's-parche': {
        entrar(s) {
            const barra = $('.pa-barra', s);
            if (!barra.children.length) for (let k = 0; k < 24; k++) barra.append(document.createElement('i'));
            this.pct = 0;
            this.pintar(s, 0, true);
        },
        paso(s, n) {
            sonido.pop();
            this.pintar(s, [0, 21, 42, 61, 79, 87][n]);
        },
        pintar(s, objetivo, directo) {
            const pctEl = $('.pa-pct', s), seg = $$('.pa-barra i', s);
            const desde = this.pct || 0;
            this.pct = objetivo;
            const marcar = v => {
                const on = Math.round(v / 100 * 24);
                seg.forEach((el, k) => { el.classList.toggle('on', k < on); el.classList.remove('trabada'); });
                if (v >= 87 && on > 0) seg[on - 1].classList.add('trabada');
            };
            if (directo) { pctEl.textContent = objetivo; marcar(objetivo); return; }
            contar(pctEl, desde, objetivo, 700, v => { marcar(v); return Math.round(v); });
            if (objetivo >= 87) luego(1500, sonido.error);
        }
    },

    's-terminal': {
        entrar(s) {
            lluvia($('.lluvia', s), { alfa: .07, tam: 20 });
            const lineas = $$('.te-l', s);
            lineas.forEach(l => l.textContent = '');
            const tok = this.tok = { parar: false };
            let cadena = new Promise(r => luego(700, r));
            lineas.forEach((l, k) => {
                cadena = cadena.then(() => tok.parar ? null : escribir(l, l.dataset.escribir, 38, true, () => tok.parar)).then(() => new Promise(r => luego(k === 1 ? 1400 : 700, r)));
            });
        },
        // PASO 1: SE TERMINA DE ESCRIBIR TODO DE UNA (extras.js LO TUMBA CON GRAVEDAD)
        paso(s, n) {
            if (!n) return;
            if (this.tok) this.tok.parar = true;
            $$('.te-l', s).forEach(l => { l.classList.remove('cursor'); l.textContent = l.dataset.escribir; });
        }
    }
};

/* FOTOS DOBLES QUE CAMBIAN SOLAS CON UN SALTO DE GLITCH */
function alternarFotos(s) {
    $$('.foto.alterna', s).forEach((f, k) => {
        f.classList.remove('b', 'salto');
        luego(2200 + k * 1300, () => {
            const saltar = () => {
                f.classList.remove('salto'); void f.offsetWidth; f.classList.add('salto');
                sonido.micro();
                luego(160, () => f.classList.toggle('b'));
                luego(450, () => f.classList.remove('salto'));
            };
            saltar();
            cada(3600 + k * 500, saltar);
        });
    });
}

function escribirComandos(s) {
    const cmds = $$('.tr-cmd[data-escribir]', s);
    cmds.forEach(c => c.textContent = '');
    let cadena = new Promise(r => luego(800, r));
    cmds.forEach(c => { cadena = cadena.then(() => escribir(c, c.dataset.escribir, 60)).then(() => { sonido.ding(); return new Promise(r => luego(250, r)); }); });
    return cadena;
}

/* --------------------------------------------------------------
   CONSOLA DE TRUCOS
-------------------------------------------------------------- */
const consola = $('#consola'), consolaInput = $('#consola input'), avisoTruco = $('#aviso-truco');
function avisar(texto, mal = false) {
    avisoTruco.textContent = texto;
    avisoTruco.classList.toggle('mal', mal);
    avisoTruco.classList.add('on');
    clearTimeout(avisar.t);
    avisar.t = setTimeout(() => avisoTruco.classList.remove('on'), 2200);
}
function indiceDe(clase) { return slides.findIndex(s => s.classList.contains(clase)); }
function ejecutarTruco(texto, desdeDiapositiva) {
    const t = texto.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!t) return;
    const trucos = {
        'motherlode': ['+50.000 simoleones', 'kaching'],
        'kaching': ['+1.000 simoleones', 'kaching'],
        'rosebud': ['+1.000 simoleones', 'kaching'],
        'freerealestate on': ['Casa gratis desbloqueada', 'kaching'],
        'freerealestate': ['Casa gratis desbloqueada', 'kaching'],
        'testingcheats true': ['Trucos de prueba activados ✔', 'sube'],
        'testingcheats on': ['Trucos de prueba activados ✔', 'sube'],
        'sims.fill_all_commodities': ['Necesidades al 100 %', 'sube'],
        'careers.promote': ['¡Ascenso!', 'sube'],
        'bb.moveobjects on': ['Mover objetos: ACTIVADO', 'sube'],
        'bb.moveobjects': ['Mover objetos: ACTIVADO', 'sube']
    };
    if (t === 'glitch') { cerrarConsola(); glitch({ dur: 700, etiqueta: '⚠ ERROR 0x5IM · glitch invocado por el jugador' }); return; }
    if (t === 'shh' || t === 'shhh' || t === 'alien') {
        cerrarConsola();
        const n = indiceDe('s-alien');
        if (idx === n) escenas['s-alien'].secuencia();
        else { glitch({ dur: 500, cambio: () => mostrar(n) }).then(() => luego(300, () => escenas['s-alien'].secuencia())); }
        return;
    }
    avisarEvento('sim:consola', { truco: t });
    if (t === 'kiki') {
        if (desdeDiapositiva) { document.activeElement.blur(); $('.consola-local', slides[idx]).value = ''; } else cerrarConsola();
        avisar('🍬 ¡Lluvia de Quipitos!');
        window.SIM.quipitos?.();
        return;
    }
    if (t === 'crash' || t === 'caida' || t === 'caída') { cerrarConsola(); window.SIM.caida?.(); return; }
    if (t === 'resetsim' || t === 'reiniciar') { cerrarConsola(); ir(1, 'adelante'); return; }
    if (t === 'exit' || t === 'salir') { cerrarConsola(); return; }
    const r = trucos[t];
    if (!r) { sonido.error(); avisar('Truco desconocido: ' + t, true); return; }
    sonido[r[1]]();
    avisar(r[0]);
    if (desdeDiapositiva) { document.activeElement.blur(); luego(1200, () => ir(idx + 1)); }
    else cerrarConsola();
}
function abrirConsola() { consola.classList.add('on'); consolaInput.value = ''; consolaInput.focus(); sonido.clic(); }
function cerrarConsola() { consola.classList.remove('on'); consolaInput.blur(); }

/* --------------------------------------------------------------
   VOTACIÓN DE MANOS
-------------------------------------------------------------- */
const votacion = $('#votacion');
const CLAVE_VOTOS = 'votacion-simulacion';
function leerVotos() { try { return JSON.parse(localStorage.getItem(CLAVE_VOTOS)) || { antes: 0, despues: 0 }; } catch (e) { return { antes: 0, despues: 0 }; } }
function guardarVotos(v) { try { localStorage.setItem(CLAVE_VOTOS, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
let votos = leerVotos();
function pintarVotos() {
    const max = Math.max(1, votos.antes, votos.despues);
    $$('.vo-fila', votacion).forEach(f => {
        const v = votos[f.dataset.clave];
        $('input', f).value = v;
        $('.vo-barra i', f).style.width = (v / max * 100) + '%';
    });
    const r = $('.vo-resultado', votacion);
    if (votos.antes && votos.despues) {
        const dif = votos.antes - votos.despues;
        r.textContent = dif > 0 ? `La simulación convenció a ${dif} ${dif === 1 ? 'persona' : 'personas'}.`
            : dif === 0 ? 'Nadie cambió de opinión… sospechoso.' : 'Ahora hay más gente segura. Típico de un NPC.';
    } else r.textContent = '';
}
$$('.vo-fila', votacion).forEach(f => {
    const clave = f.dataset.clave;
    $$('button', f).forEach(b => b.onclick = () => { votos[clave] = Math.max(0, votos[clave] + +b.dataset.d); sonido.clic(); guardarVotos(votos); pintarVotos(); });
    $('input', f).oninput = e => { votos[clave] = Math.max(0, parseInt(e.target.value, 10) || 0); guardarVotos(votos); pintarVotos(); };
});
pintarVotos();

/* --------------------------------------------------------------
   TECLADO
-------------------------------------------------------------- */
function estado(texto) {
    const e = $('#estado'); e.textContent = texto; e.classList.add('on');
    clearTimeout(estado.t); estado.t = setTimeout(() => e.classList.remove('on'), 1600);
}
function pantallaCompleta() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
}
function teclasTrucos(e, abajo) {
    const s = slides[idx];
    if (!s.classList.contains('s-trucos')) return;
    const mapa = { Control: 'Control', Shift: 'Shift' };
    const nombre = mapa[e.key] || (e.code === 'KeyC' ? 'c' : null);
    if (!nombre) return;
    const k = $(`kbd[data-tecla="${nombre}"]`, s);
    if (k) { k.classList.toggle('presionada', abajo); if (abajo && !e.repeat) sonido.clic(); }
}
addEventListener('keyup', e => teclasTrucos(e, false));
addEventListener('keydown', e => {
    audio();
    teclasTrucos(e, true);
    const enInput = e.target.tagName === 'INPUT';

    // CONSOLA DE TRUCOS: CTRL+SHIFT+C (O LA TECLA ` / º)
    if ((e.ctrlKey && e.shiftKey && e.code === 'KeyC') || (!enInput && e.code === 'Backquote')) {
        e.preventDefault();
        const local = $('.consola-local', slides[idx]);
        if (local) { local.focus(); sonido.clic(); } else if (consola.classList.contains('on')) cerrarConsola(); else abrirConsola();
        return;
    }
    if (enInput) {
        if (e.key === 'Enter' && e.target === consolaInput) { ejecutarTruco(consolaInput.value, false); consolaInput.value = ''; }
        else if (e.key === 'Enter' && e.target.classList.contains('consola-local')) { ejecutarTruco(e.target.value, true); }
        else if (e.key === 'Escape') { e.target.blur(); cerrarConsola(); }
        else if (e.target.closest('.tr-consola, #consola') && e.key.length === 1) sonido.tecla();
        return;
    }
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter':
            e.preventDefault(); siguiente(); break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace':
            e.preventDefault(); anterior(); break;
        case 'Home': ir(0, 'atras'); break;
        case 'End': ir(slides.length - 1); break;
        case 'f': case 'F': pantallaCompleta(); break;
        case 'm': case 'M': mudo = !mudo; estado(mudo ? 'Sonido: APAGADO' : 'Sonido: ENCENDIDO'); break;
        case 'v': case 'V': votacion.classList.toggle('on'); pintarVotos(); break;
        case 'g': case 'G': glitch({ dur: 650, etiqueta: slides[idx].dataset.error || '' }); break;
        case 'a': case 'A': microAuto = !microAuto; estado(microAuto ? 'Mini glitches: ON' : 'Mini glitches: OFF'); break;
        case 'b': case 'B': case '.': $('#negro').classList.toggle('on'); break;
        case 'h': case 'H': case '?': $('#ayuda').classList.toggle('on'); break;
        case 'Escape': $('#ayuda').classList.remove('on'); votacion.classList.remove('on'); cerrarConsola(); break;
    }
});
document.addEventListener('pointerdown', () => audio(), { once: false });
$$('.accion-siguiente').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); sonido.clic(); paso = maxPasos(); ir(idx + 1); }));

/* CURSOR QUE SE ESCONDE SOLO */
let tCursor;
addEventListener('mousemove', () => {
    document.body.classList.remove('sin-cursor');
    clearTimeout(tCursor);
    tCursor = setTimeout(() => document.body.classList.add('sin-cursor'), 2500);
});

/* MINI GLITCHES AUTOMÁTICOS */
(function programarMicro() {
    setTimeout(() => {
        const ocupado = glitcheando || document.activeElement.tagName === 'INPUT' || slides[idx].classList.contains('s-cebo') || $('#negro').classList.contains('on');
        if (microAuto && !ocupado && !document.hidden) glitch({ dur: azar(140, 240), micro: true });
        programarMicro();
    }, azar(22000, 45000));
})();

/* --------------------------------------------------------------
   FOTOS: SI EXISTE fotos/<nombre>.jpg|png|webp SE MUESTRA
-------------------------------------------------------------- */
$$('.foto[data-foto]').forEach(caja => {
    const ext = ['jpg', 'jpeg', 'png', 'webp'];
    const probar = (k) => {
        if (k >= ext.length) return;
        const img = new Image();
        img.onload = () => { caja.prepend(img); caja.classList.add('tiene-foto'); };
        img.onerror = () => probar(k + 1);
        img.alt = caja.textContent.trim();
        img.src = `fotos/${caja.dataset.foto}.${ext[k]}`;
    };
    probar(0);
});

/* ARRANQUE (RESPETA #N EN LA URL PARA RETOMAR) */
const inicial = Math.min(slides.length, Math.max(1, parseInt(location.hash.slice(1), 10) || 1)) - 1;
window.SIM = {
    sonido, tono, ruido, audio, glitch, ir, mostrar, siguiente, luego, cada, escenas, slides, avisar, estado, escribir, lluvia, azar,
    get idx() { return idx; }, get paso() { return paso; }, get mudo() { return mudo; }, get glitcheando() { return glitcheando; },
    get generacion() { return generacion; }, get ac() { return ac; }, get maestro() { return maestro; },
    escala() { return escenario.getBoundingClientRect().width / 1920; },
    alEscenario(e) { const r = escenario.getBoundingClientRect(), k = r.width / 1920; return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; }
};
document.addEventListener('DOMContentLoaded', () => {
idx = inicial;
mostrar(inicial);
// PARA PROBAR: ?paso=N APLICA N PASOS AL CARGAR; ?prueba=glitch DEJA UN GLITCH LARGO
const params = new URLSearchParams(location.search);
for (let k = 0; k < (parseInt(params.get('paso'), 10) || 0); k++) if (paso < maxPasos()) { paso++; aplicarPaso(); }
if (params.get('prueba') === 'glitch') setTimeout(() => glitch({ dur: 60000, etiqueta: slides[idx].dataset.error || '' }), 300);
});
})();
