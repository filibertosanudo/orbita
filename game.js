/* ==========================================================================
   ÓRBITA — Motor de juego en JavaScript puro con Canvas 2D y Web Audio API
   Clases: AudioManager, Camera, Particle, Star, Asteroid, Planet, Player, Game
   ========================================================================== */

(() => {
  'use strict';

  // Paleta neón synthwave para planetas y efectos
  const PALETA_NEON = [
    { core: '#00f5ff', mid: '#0091ff', glow: 'rgba(0, 245, 255, 0.55)' }, // Cian
    { core: '#ff00e5', mid: '#9d00ff', glow: 'rgba(255, 0, 229, 0.55)' }, // Magenta
    { core: '#ffe600', mid: '#ff8800', glow: 'rgba(255, 230, 0, 0.55)' }, // Amarillo
    { core: '#39ff14', mid: '#00b85c', glow: 'rgba(57, 255, 20, 0.52)' }, // Verde
    { core: '#ff6b00', mid: '#ff1e56', glow: 'rgba(255, 107, 0, 0.55)' }  // Naranja
  ];

  const CLAVE_RECORD = 'orbita_high_score_v1';
  const CLAVE_SILENCIO = 'orbita_muted_v1';
  const CLAVE_DIFICULTAD = 'orbita_difficulty_v1';
  const CLAVE_DESAFIOS = 'orbita_daily_v1';

  // Catálogo de cosméticos temporales para la estela de la nave
  const ESTELAS_COSMETICAS = {
    clasica: {
      id: 'clasica',
      name: 'Clásica',
      flyingColors: ['#00f5ff'],
      orbitColors: ['#ff00e5'],
      shipAccent: '#00f5ff',
      shipGlow: 'rgba(0, 245, 255, 0.45)',
      bloomColor: 'rgba(0, 245, 255, 0.65)',
      alwaysUnlocked: true
    },
    solar: {
      id: 'solar',
      name: 'Solar',
      flyingColors: ['#ffe600', '#ff6b00', '#ffffff'],
      orbitColors: ['#ff8800', '#ffe600'],
      shipAccent: '#ffe600',
      shipGlow: 'rgba(255, 200, 0, 0.52)',
      bloomColor: 'rgba(255, 190, 0, 0.68)',
      alwaysUnlocked: false
    },
    esmeralda: {
      id: 'esmeralda',
      name: 'Esmeralda',
      flyingColors: ['#39ff14', '#00f5ff', '#b4ff9f'],
      orbitColors: ['#00f5ff', '#39ff14'],
      shipAccent: '#39ff14',
      shipGlow: 'rgba(57, 255, 20, 0.5)',
      bloomColor: 'rgba(57, 255, 20, 0.65)',
      alwaysUnlocked: false
    },
    prisma: {
      id: 'prisma',
      name: 'Prisma',
      flyingColors: ['#00f5ff', '#ff00e5', '#ffe600', '#39ff14'],
      orbitColors: ['#ff00e5', '#00f5ff', '#39ff14'],
      shipAccent: '#ff00e5',
      shipGlow: 'rgba(255, 0, 229, 0.5)',
      bloomColor: 'rgba(255, 0, 229, 0.65)',
      alwaysUnlocked: false
    },
    carmesi: {
      id: 'carmesi',
      name: 'Carmesí',
      flyingColors: ['#ff1e56', '#ff00e5', '#ff6b00'],
      orbitColors: ['#ff00e5', '#ff4d6d'],
      shipAccent: '#ff4d6d',
      shipGlow: 'rgba(255, 30, 86, 0.52)',
      bloomColor: 'rgba(255, 42, 109, 0.68)',
      alwaysUnlocked: false
    }
  };

  /** Devuelve la clave de calendario local YYYY-MM-DD */
  function obtenerFechaLocal(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Hash determinista simple para sembrar desafíos a partir de la fecha */
  function hashFecha(dateKey) {
    let h = 2166136261;
    for (let i = 0; i < dateKey.length; i++) {
      h ^= dateKey.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Plantillas de desafíos diarios agrupadas por categoría
  const PLANTILLAS_PLANETAS = [
    {
      id: 'planets_6',
      metric: 'planets',
      target: 6,
      title: 'Explorador orbital',
      desc: 'Alcanza 6 planetas en una partida',
      rewardType: 'points',
      rewardValue: 20,
      rewardLabel: '+20 pts'
    },
    {
      id: 'planets_10',
      metric: 'planets',
      target: 10,
      title: 'Salto interestelar',
      desc: 'Alcanza 10 planetas en una partida',
      rewardType: 'cosmetic',
      rewardValue: 'solar',
      rewardLabel: 'Estela Solar (hoy)'
    },
    {
      id: 'planets_14',
      metric: 'planets',
      target: 14,
      title: 'Viajero del vacío',
      desc: 'Alcanza 14 planetas en una partida',
      rewardType: 'points',
      rewardValue: 35,
      rewardLabel: '+35 pts'
    }
  ];

  const PLANTILLAS_COMBO = [
    {
      id: 'combo_3',
      metric: 'maxCombo',
      target: 3,
      title: 'Sincronía rápida',
      desc: 'Consigue un Combo x3',
      rewardType: 'cosmetic',
      rewardValue: 'esmeralda',
      rewardLabel: 'Estela Esmeralda (hoy)'
    },
    {
      id: 'combo_4',
      metric: 'maxCombo',
      target: 4,
      title: 'Impulso perfecto',
      desc: 'Consigue un Combo x4',
      rewardType: 'points',
      rewardValue: 25,
      rewardLabel: '+25 pts'
    },
    {
      id: 'combo_5',
      metric: 'maxCombo',
      target: 5,
      title: 'Maestro tangencial',
      desc: 'Consigue un Combo x5',
      rewardType: 'cosmetic',
      rewardValue: 'prisma',
      rewardLabel: 'Estela Prisma (hoy)'
    }
  ];

  const PLANTILLAS_ESTRELLAS_NIVEL = [
    {
      id: 'stars_3',
      metric: 'stars',
      target: 3,
      title: 'Cazador de luz',
      desc: 'Recoge 3 estrellas en una partida',
      rewardType: 'cosmetic',
      rewardValue: 'carmesi',
      rewardLabel: 'Estela Carmesí (hoy)'
    },
    {
      id: 'stars_5',
      metric: 'stars',
      target: 5,
      title: 'Cosecha estelar',
      desc: 'Recoge 5 estrellas en una partida',
      rewardType: 'points',
      rewardValue: 30,
      rewardLabel: '+30 pts'
    },
    {
      id: 'level_4',
      metric: 'level',
      target: 4,
      title: 'Órbita superior',
      desc: 'Alcanza el Nivel 4',
      rewardType: 'points',
      rewardValue: 25,
      rewardLabel: '+25 pts'
    }
  ];

  /** Genera de forma determinista los 3 desafíos del día con recompensa mixta */
  function generarDesafiosDelDia(dateKey) {
    const seed = hashFecha(String(dateKey || obtenerFechaLocal()));
    const selA = PLANTILLAS_PLANETAS[seed % PLANTILLAS_PLANETAS.length];
    const selB = PLANTILLAS_COMBO[(seed >>> 3) % PLANTILLAS_COMBO.length];
    const selC = PLANTILLAS_ESTRELLAS_NIVEL[(seed >>> 6) % PLANTILLAS_ESTRELLAS_NIVEL.length];

    let elegidos = [selA, selB, selC];
    const tienePuntos = elegidos.some((c) => c.rewardType === 'points');
    const tieneCosmetico = elegidos.some((c) => c.rewardType === 'cosmetic');

    if (!tienePuntos) {
      elegidos[0] = PLANTILLAS_PLANETAS[0];
    }
    if (!tieneCosmetico) {
      elegidos[1] = PLANTILLAS_COMBO[0];
    }

    return elegidos.map((tpl) => ({
      ...tpl,
      progress: 0,
      completed: false
    }));
  }

  // Configuración de modos de dificultad
  const DIFICULTADES = {
    facil: {
      id: 'facil',
      label: 'FÁCIL',
      speedMult: 0.82,
      captureMult: 1.14,
      gapMult: 0.9,
      movingMinLevel: 4,
      asteroidMinScore: 22,
      asteroidMinLevel: 7
    },
    normal: {
      id: 'normal',
      label: 'NORMAL',
      speedMult: 1.0,
      captureMult: 1.0,
      gapMult: 1.0,
      movingMinLevel: 3,
      asteroidMinScore: 15,
      asteroidMinLevel: 5
    },
    dificil: {
      id: 'dificil',
      label: 'DIFÍCIL',
      speedMult: 1.24,
      captureMult: 0.9,
      gapMult: 1.08,
      movingMinLevel: 2,
      asteroidMinScore: 10,
      asteroidMinLevel: 3
    }
  };

  /** Utilidad matemática: limita un valor entre min y max */
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  /** Interpolación lineal */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** Número aleatorio en el rango [min, max] */
  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  /* ========================================================================
     SpatialGrid — Rejilla espacial 2D para consultas de colisión O(1) promedio
     ======================================================================== */
  class SpatialGrid {
    constructor(cellSize = 220) {
      this.cellSize = cellSize;
      this.cells = new Map();
    }

    /** Limpia todas las celdas antes de reindexar el frame */
    clear() {
      this.cells.clear();
    }

    /** Calcula clave entera compacta para una celda (cx, cy) */
    _key(cx, cy) {
      return `${cx},${cy}`;
    }

    /** Inserta una entidad cubriendo el rectángulo de su radio de influencia */
    insert(entity, radius = 0, type = 'generic') {
      const minX = Math.floor((entity.x - radius) / this.cellSize);
      const maxX = Math.floor((entity.x + radius) / this.cellSize);
      const minY = Math.floor((entity.y - radius) / this.cellSize);
      const maxY = Math.floor((entity.y + radius) / this.cellSize);
      const entry = { entity, type };

      for (let cx = minX; cx <= maxX; cx++) {
        for (let cy = minY; cy <= maxY; cy++) {
          const k = this._key(cx, cy);
          let bucket = this.cells.get(k);
          if (!bucket) {
            bucket = [];
            this.cells.set(k, bucket);
          }
          bucket.push(entry);
        }
      }
    }

    /** Devuelve entidades cercanas al punto (x, y) dentro del radio sin duplicados */
    query(x, y, radius = 0) {
      const minX = Math.floor((x - radius) / this.cellSize);
      const maxX = Math.floor((x + radius) / this.cellSize);
      const minY = Math.floor((y - radius) / this.cellSize);
      const maxY = Math.floor((y + radius) / this.cellSize);

      const seen = new Set();
      const results = [];

      for (let cx = minX; cx <= maxX; cx++) {
        for (let cy = minY; cy <= maxY; cy++) {
          const bucket = this.cells.get(this._key(cx, cy));
          if (!bucket) continue;
          for (let i = 0; i < bucket.length; i++) {
            const entry = bucket[i];
            if (!seen.has(entry.entity)) {
              seen.add(entry.entity);
              results.push(entry);
            }
          }
        }
      }
      return results;
    }
  }

  /* ========================================================================
     AudioManager — Sintetizador procedural con Web Audio API (sin archivos)
     ======================================================================== */
  class AudioManager {
    constructor(storage) {
      this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      this.ctx = null;
      this.masterGain = null;
      this.padGain = null;
      this.padNodes = [];
      this.padActive = false;
      this.initialized = false;
      this.muted = this._cargarSilencio();
      this._padTimer = null;
      this._chordIndex = 0;
    }

    /** Lee el estado de silencio persistido en localStorage */
    _cargarSilencio() {
      try {
        return this.storage ? this.storage.getItem(CLAVE_SILENCIO) === '1' : false;
      } catch {
        return false;
      }
    }

    /** Guarda el estado de silencio */
    _guardarSilencio() {
      try {
        if (this.storage) {
          this.storage.setItem(CLAVE_SILENCIO, this.muted ? '1' : '0');
        }
      } catch {
        // Ignora errores de almacenamiento restringido
      }
    }

    /** Inicializa el AudioContext tras la primera interacción del usuario */
    unlock() {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.ctx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.72;
        this.masterGain.connect(this.ctx.destination);

        this.padGain = this.ctx.createGain();
        this.padGain.gain.value = 0.08;
        this.padGain.connect(this.masterGain);

        this.initialized = true;
        this._iniciarMusicaAmbiental();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    /** Alterna entre silenciado y activo */
    toggleMute() {
      this.muted = !this.muted;
      this._guardarSilencio();
      if (this.masterGain && this.ctx) {
        const ahora = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(ahora);
        this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.72, ahora, 0.04);
      }
      return this.muted;
    }

    /** Ajusta el volumen del pad ambiental según el estado del juego */
    setAmbientLevel(level) {
      if (!this.padGain || !this.ctx) return;
      const ahora = this.ctx.currentTime;
      this.padGain.gain.cancelScheduledValues(ahora);
      this.padGain.gain.setTargetAtTime(level, ahora, 0.25);
    }

    /** Pad sintetizado suave de fondo (acordes synthwave cálidos) */
    _iniciarMusicaAmbiental() {
      if (this.padActive || !this.ctx || !this.padGain) return;
      this.padActive = true;

      const filtro = this.ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 520;
      filtro.Q.value = 1.2;
      filtro.connect(this.padGain);

      // Tres osciladores suavemente desafinados para un pad espacioso
      const frecuenciasBase = [110, 164.81, 220]; // La2, Mi3, La3
      const oscs = frecuenciasBase.map((freq, idx) => {
        const osc = this.ctx.createOscillator();
        osc.type = idx === 1 ? 'triangle' : 'sawtooth';
        osc.frequency.value = freq;
        osc.detune.value = (idx - 1) * 7;

        const subGain = this.ctx.createGain();
        subGain.gain.value = idx === 0 ? 0.38 : 0.24;
        osc.connect(subGain);
        subGain.connect(filtro);
        osc.start();
        return osc;
      });

      this.padNodes = oscs;

      // Progresión lenta de acordes ambientales (Am9 - Fmaj7 - Cmaj7 - G6)
      const progresion = [
        [110.0, 164.81, 261.63],
        [87.31, 130.81, 220.0],
        [130.81, 196.0, 246.94],
        [98.0, 146.83, 220.0]
      ];

      this._padTimer = setInterval(() => {
        if (!this.ctx || this.ctx.state !== 'running') return;
        this._chordIndex = (this._chordIndex + 1) % progresion.length;
        const acorde = progresion[this._chordIndex];
        const t = this.ctx.currentTime;
        for (let i = 0; i < oscs.length; i++) {
          oscs[i].frequency.setTargetAtTime(acorde[i], t, 0.8);
        }
      }, 4500);
    }

    /** Sonido de salto: whoosh corto con barrido filtrado */
    playJump() {
      if (!this.ctx || !this.masterGain || this.muted) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(680, t + 0.13);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420, t);
      filter.frequency.exponentialRampToValueAtTime(1400, t + 0.13);
      filter.Q.value = 1.8;

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.17);
    }

    /** Sonido de captura: tono armónico ascendente según el combo */
    playCapture(combo = 1) {
      if (!this.ctx || !this.masterGain || this.muted) return;
      const t = this.ctx.currentTime;
      const pasos = Math.min(combo - 1, 10);
      const baseFreq = 330 * Math.pow(1.09, pasos);

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, t);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, t + 0.12);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 1.5, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.24, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.25);
      osc2.stop(t + 0.25);
    }

    /** Sonido de estrella: campanita brillante doble */
    playStar() {
      if (!this.ctx || !this.masterGain || this.muted) return;
      const t = this.ctx.currentTime;
      const notas = [987.77, 1318.51]; // Si5 -> Mi6

      notas.forEach((freq, idx) => {
        const inicio = t + idx * 0.055;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, inicio);

        gain.gain.setValueAtTime(0.001, inicio);
        gain.gain.linearRampToValueAtTime(0.2, inicio + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, inicio + 0.28);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(inicio);
        osc.stop(inicio + 0.3);
      });
    }

    /** Sonido de muerte: tono descendente grave */
    playDeath() {
      if (!this.ctx || !this.masterGain || this.muted) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(52, t + 0.45);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, t);
      filter.frequency.exponentialRampToValueAtTime(140, t + 0.45);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.5);
    }
  }

  /* ========================================================================
     Camera — Seguimiento suave (lerp), zoom de aterrizaje y sacudida (juice)
     ======================================================================== */
  class Camera {
    constructor() {
      this.x = 0;
      this.y = 0;
      this.targetX = 0;
      this.targetY = 0;
      this.zoom = 1;
      this.targetZoom = 1;
      this.shakeTime = 0;
      this.shakeDuration = 0;
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    /** Reinicia la cámara a la posición inicial */
    reset(x = 0, y = 0) {
      this.x = x;
      this.y = y;
      this.targetX = x;
      this.targetY = y;
      this.anchorY = y;
      this.zoom = 1;
      this.targetZoom = 1;
      this.shakeTime = 0;
      this.shakeDuration = 0;
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    /** Fija la altura de referencia cuando el jugador orbita un planeta */
    setAnchorY(y) {
      this.anchorY = y;
    }

    /** Activa una sacudida temporal en pantalla */
    addShake(intensity, duration = 0.2) {
      this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
      this.shakeDuration = duration;
      this.shakeTime = duration;
    }

    /** Pulso sutil de zoom al capturar un planeta */
    pulseZoom(amount = 1.055) {
      this.zoom = amount;
      this.targetZoom = 1;
    }

    /** Actualiza seguimiento suave y efectos de cámara con delta time */
    update(dt, playerX, playerY, isFlying = false) {
      // Seguimiento horizontal moderado para mantener la nave centrada sin perder referencias
      this.targetX = playerX * 0.32;
      // Al volar, la cámara avanza hacia arriba pero nunca persigue una caída hacia abajo
      const desiredY = playerY - 85;
      this.targetY = isFlying ? Math.min(this.anchorY, desiredY) : desiredY;

      const factorPos = 1 - Math.exp(-6.2 * dt);
      const factorZoom = 1 - Math.exp(-8.5 * dt);

      this.x = lerp(this.x, this.targetX, factorPos);
      this.y = lerp(this.y, this.targetY, factorPos);
      this.zoom = lerp(this.zoom, this.targetZoom, factorZoom);

      if (this.shakeTime > 0) {
        this.shakeTime = Math.max(0, this.shakeTime - dt);
        const progreso = this.shakeDuration > 0 ? this.shakeTime / this.shakeDuration : 0;
        const fuerza = this.shakeIntensity * progreso * progreso;
        this.shakeOffsetX = randRange(-fuerza, fuerza);
        this.shakeOffsetY = randRange(-fuerza, fuerza);
      } else {
        this.shakeIntensity = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
    }
  }

  /* ========================================================================
     Particle — Partícula reutilizable (pool de tamaño fijo sin GC)
     ======================================================================== */
  class Particle {
    constructor() {
      this.active = false;
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.life = 0;
      this.maxLife = 1;
      this.size = 3;
      this.color = '#00f5ff';
      this.drag = 0.96;
      this.isRing = false;
      this.ringRadius = 10;
      this.ringGrowth = 120;
    }

    /** Configura la partícula al obtenerla del pool */
    spawn(opts) {
      this.active = true;
      this.x = opts.x || 0;
      this.y = opts.y || 0;
      this.vx = opts.vx || 0;
      this.vy = opts.vy || 0;
      this.life = opts.life || 0.5;
      this.maxLife = this.life;
      this.size = opts.size || 3;
      this.color = opts.color || '#00f5ff';
      this.drag = opts.drag !== undefined ? opts.drag : 0.96;
      this.isRing = Boolean(opts.isRing);
      this.ringRadius = opts.ringRadius || 10;
      this.ringGrowth = opts.ringGrowth || 140;
    }

    /** Actualiza posición, rozamiento y vida restante */
    update(dt) {
      if (!this.active) return;
      this.life -= dt;
      if (this.life <= 0) {
        this.active = false;
        return;
      }
      if (this.isRing) {
        this.ringRadius += this.ringGrowth * dt;
      } else {
        const damping = Math.pow(this.drag, dt * 60);
        this.vx *= damping;
        this.vy *= damping;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
      }
    }

    /** Dibuja la partícula en coordenadas de mundo */
    draw(ctx) {
      if (!this.active) return;
      const alpha = clamp(this.life / this.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (this.isRing) {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5 * alpha + 0.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Halo suave y núcleo brillante sin shadowBlur para máximo rendimiento
        const r = Math.max(0.8, this.size * alpha);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha * 0.28;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ========================================================================
     Star — Estrella coleccionable flotante entre planetas (+5 puntos)
     ======================================================================== */
  class Star {
    constructor(x, y) {
      this.x = x;
      this.baseY = y;
      this.y = y;
      this.radius = 12;
      this.hitRadius = 22;
      this.collected = false;
      this.phase = Math.random() * Math.PI * 2;
      this.rot = 0;
    }

    /** Animación de flotación suave y rotación */
    update(dt, time) {
      if (this.collected) return;
      this.y = this.baseY + Math.sin(time * 2.6 + this.phase) * 5;
      this.rot += dt * 1.8;
    }

    /** Dibuja la estrella neón dorada de 4 puntas con brillo exterior */
    draw(ctx) {
      if (this.collected) return;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);

      // Halo exterior difuso
      const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius * 2.1);
      halo.addColorStop(0, 'rgba(255, 230, 0, 0.55)');
      halo.addColorStop(1, 'rgba(255, 230, 0, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 2.1, 0, Math.PI * 2);
      ctx.fill();

      // Forma de estrella de 4 puntas estilizada con capa de brillo
      ctx.fillStyle = 'rgba(255, 230, 0, 0.35)';
      ctx.beginPath();
      const puntas = 4;
      const extGlow = this.radius * 1.32;
      const intGlow = this.radius * 0.56;
      for (let i = 0; i < puntas * 2; i++) {
        const r = i % 2 === 0 ? extGlow : intGlow;
        const a = (i * Math.PI) / puntas;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      const ext = this.radius;
      const int = this.radius * 0.42;
      for (let i = 0; i < puntas * 2; i++) {
        const r = i % 2 === 0 ? ext : int;
        const a = (i * Math.PI) / puntas;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Núcleo blanco brillante
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  /* ========================================================================
     Asteroid — Peligro móvil que aparece a partir de puntuación 15
     ======================================================================== */
  class Asteroid {
    constructor(x, y, vx, vy, radius) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.radius = radius;
      this.hitRadius = radius * 0.78;
      this.rot = Math.random() * Math.PI * 2;
      this.rotSpeed = randRange(-1.8, 1.8) || 0.9;
      this.active = true;

      // Genera silueta poligonal irregular fija para el asteroide
      this.vertices = [];
      const lados = 8;
      for (let i = 0; i < lados; i++) {
        const ang = (i / lados) * Math.PI * 2;
        const dist = radius * randRange(0.76, 1.12);
        this.vertices.push({
          x: Math.cos(ang) * dist,
          y: Math.sin(ang) * dist
        });
      }
    }

    /** Mueve y rota el asteroide lentamente */
    update(dt) {
      if (!this.active) return;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.rot += this.rotSpeed * dt;
    }

    /** Dibuja el asteroide con borde neón rojo-naranja amenazante */
    draw(ctx) {
      if (!this.active) return;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);

      // Aura de peligro
      const aura = ctx.createRadialGradient(0, 0, this.radius * 0.3, 0, 0, this.radius * 1.7);
      aura.addColorStop(0, 'rgba(255, 42, 109, 0.25)');
      aura.addColorStop(1, 'rgba(255, 42, 109, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.7, 0, Math.PI * 2);
      ctx.fill();

      // Cuerpo rocoso oscuro con doble contorno luminoso
      ctx.fillStyle = '#1b1126';
      ctx.strokeStyle = 'rgba(255, 42, 109, 0.35)';
      ctx.lineWidth = 5.5;

      ctx.beginPath();
      for (let i = 0; i < this.vertices.length; i++) {
        const v = this.vertices[i];
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#ff4d6d';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Grieta luminosa interior
      ctx.strokeStyle = 'rgba(255, 107, 0, 0.78)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-this.radius * 0.35, -this.radius * 0.2);
      ctx.lineTo(this.radius * 0.05, this.radius * 0.12);
      ctx.lineTo(this.radius * 0.32, -this.radius * 0.1);
      ctx.stroke();

      ctx.restore();
    }
  }

  /* ========================================================================
     Planet — Planeta con órbita gravitacional, dirección y movimiento opcional
     ======================================================================== */
  class Planet {
    constructor(opts) {
      this.id = opts.id;
      this.baseX = opts.x;
      this.x = opts.x;
      this.y = opts.y;
      this.radius = opts.radius;
      this.captureRadius = opts.captureRadius || opts.radius * 2.4;
      this.orbitRadius = opts.orbitRadius || opts.radius * 1.66;
      this.orbitSpeed = opts.orbitSpeed || 2.4; // Radianes/seg
      this.orbitDir = opts.orbitDir || 1; // 1 horario, -1 antihorario
      this.palette = opts.palette || PALETA_NEON[0];
      this.hasRings = Boolean(opts.hasRings);
      this.ringTilt = opts.ringTilt !== undefined ? opts.ringTilt : randRange(-0.42, 0.42);

      // Movimiento lateral para planetas avanzados
      this.moveAmp = opts.moveAmp || 0;
      this.moveFreq = opts.moveFreq || 1.15;
      this.movePhase = opts.movePhase || 0;

      this.visited = Boolean(opts.visited);
      this.ringAngle = 0;
      this.pulseScale = 1;
    }

    /** Actualiza rotación visual del anillo de captura y oscilación lateral */
    update(dt, time) {
      this.ringAngle += this.orbitDir * this.orbitSpeed * 0.45 * dt;
      if (this.moveAmp > 0) {
        this.x = this.baseX + Math.sin(time * this.moveFreq + this.movePhase) * this.moveAmp;
      }
      if (this.pulseScale > 1) {
        this.pulseScale = lerp(this.pulseScale, 1, 1 - Math.exp(-10 * dt));
      }
    }

    /** Dibuja el planeta con degradado radial, anillos Saturno y zona de captura animada */
    draw(ctx, isPlayerHere, comboTimerProgress) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(this.pulseScale, this.pulseScale);

      // 1. Anillo exterior punteado animado que marca la zona de captura
      ctx.save();
      ctx.rotate(this.ringAngle);
      ctx.beginPath();
      ctx.arc(0, 0, this.captureRadius, 0, Math.PI * 2);
      ctx.strokeStyle = isPlayerHere ? this.palette.core : 'rgba(220, 235, 255, 0.34)';
      ctx.lineWidth = isPlayerHere ? 2.2 : 1.5;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pequeños marcadores direccionales en el anillo para telegrafiar sentido de giro
      const numFlechas = 3;
      for (let i = 0; i < numFlechas; i++) {
        const a = (i * Math.PI * 2) / numFlechas;
        const ax = Math.cos(a) * this.captureRadius;
        const ay = Math.sin(a) * this.captureRadius;
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(a + (this.orbitDir > 0 ? Math.PI / 2 : -Math.PI / 2));
        ctx.fillStyle = this.palette.core;
        ctx.globalAlpha = isPlayerHere ? 0.95 : 0.65;
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(-4, -3.5);
        ctx.lineTo(-4, 3.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // 2. Indicador visual de ventana de combo rápido (< 1s) cuando el jugador orbita aquí
      if (isPlayerHere && comboTimerProgress > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          this.orbitRadius,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * comboTimerProgress
        );
        ctx.strokeStyle = 'rgba(255, 230, 0, 0.72)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      // 3. Brillo atmosférico exterior (capas suaves)
      const outerGlow = ctx.createRadialGradient(
        0,
        0,
        this.radius * 0.7,
        0,
        0,
        this.radius * 1.9
      );
      outerGlow.addColorStop(0, this.palette.glow);
      outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.9, 0, Math.PI * 2);
      ctx.fill();

      // 4. Anillo trasero tipo Saturno (si corresponde)
      if (this.hasRings) {
        this._drawSaturnRing(ctx, true);
      }

      // 5. Esfera del planeta con degradado radial desplazado hacia la luz y borde neón
      ctx.save();
      const grad = ctx.createRadialGradient(
        -this.radius * 0.32,
        -this.radius * 0.32,
        this.radius * 0.14,
        0,
        0,
        this.radius
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.28, this.palette.core);
      grad.addColorStop(0.78, this.palette.mid);
      grad.addColorStop(1, '#120826');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = this.palette.core;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // 6. Anillo delantero tipo Saturno
      if (this.hasRings) {
        this._drawSaturnRing(ctx, false);
      }

      ctx.restore();
    }

    /** Dibuja mitad trasera o delantera de los anillos planetarios */
    _drawSaturnRing(ctx, backHalf) {
      ctx.save();
      ctx.rotate(this.ringTilt);
      ctx.beginPath();
      const start = backHalf ? Math.PI : 0;
      const end = backHalf ? Math.PI * 2 : Math.PI;
      ctx.ellipse(0, 0, this.radius * 1.72, this.radius * 0.44, 0, start, end);
      ctx.strokeStyle = this.palette.core;
      ctx.globalAlpha = backHalf ? 0.45 : 0.85;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 1.5, this.radius * 0.36, 0, start, end);
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = backHalf ? 0.2 : 0.45;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ========================================================================
     Player — Nave espacial luminosa con física orbital y lanzamiento tangencial
     ======================================================================== */
  class Player {
    constructor() {
      this.reset();
    }

    /** Restablece la nave en estado orbital sobre el planeta inicial */
    reset(planet = null) {
      this.state = 'orbiting'; // 'orbiting' | 'flying' | 'dead'
      this.planet = planet;
      this.lastPlanetId = planet ? planet.id : null;
      this.orbitAngle = -Math.PI / 2;
      this.orbitRadius = planet ? planet.orbitRadius : 60;
      this.targetOrbitRadius = this.orbitRadius;
      this.x = planet ? planet.x : 0;
      this.y = planet ? planet.y - this.orbitRadius : -60;
      this.vx = 0;
      this.vy = 0;
      this.angle = 0;
      this.radius = 8;
      this.hitRadius = 7;
      this.timeInOrbit = 0;
      this.launchedQuickly = false;
      this.trailTimer = 0;
    }

    /** Suelta la órbita y dispara la nave por la tangente exacta */
    launch() {
      if (this.state !== 'orbiting' || !this.planet) return false;

      const p = this.planet;
      // Ventana de combo rápido (< 1.0 s tras ser capturado)
      this.launchedQuickly = p.visited && this.timeInOrbit < 1.0;

      // Vector unitario tangente al sentido de órbita
      const dir = p.orbitDir;
      const tx = -Math.sin(this.orbitAngle) * dir;
      const ty = Math.cos(this.orbitAngle) * dir;

      // Rapidez tangencial balanceada para una respuesta arcade precisa
      const speed = clamp(p.orbitSpeed * p.orbitRadius * 2.35, 450, 680);

      this.vx = tx * speed;
      this.vy = ty * speed;
      this.angle = Math.atan2(this.vy, this.vx);
      this.lastPlanetId = p.id;
      this.planet = null;
      this.state = 'flying';
      return true;
    }

    /** Captura la nave dentro de la órbita de un nuevo planeta */
    capture(planet) {
      this.planet = planet;
      this.state = 'orbiting';
      this.orbitAngle = Math.atan2(this.y - planet.y, this.x - planet.x);
      const distActual = Math.hypot(this.x - planet.x, this.y - planet.y);
      this.orbitRadius = clamp(distActual, planet.radius + 14, planet.captureRadius);
      this.targetOrbitRadius = planet.orbitRadius;
      this.vx = 0;
      this.vy = 0;
      this.timeInOrbit = 0;
    }

    /** Actualiza el movimiento orbital o rectilíneo y emite estela de partículas */
    update(dt, emitTrail) {
      if (this.state === 'dead') return;

      if (this.state === 'orbiting' && this.planet) {
        const p = this.planet;
        this.timeInOrbit += dt;
        this.orbitAngle += p.orbitDir * p.orbitSpeed * dt;
        this.orbitRadius = lerp(this.orbitRadius, this.targetOrbitRadius, 1 - Math.exp(-12 * dt));

        this.x = p.x + Math.cos(this.orbitAngle) * this.orbitRadius;
        this.y = p.y + Math.sin(this.orbitAngle) * this.orbitRadius;

        const tx = -Math.sin(this.orbitAngle) * p.orbitDir;
        const ty = Math.cos(this.orbitAngle) * p.orbitDir;
        this.angle = Math.atan2(ty, tx);
      } else if (this.state === 'flying') {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
      }

      // Emisión constante de estela luminosa
      this.trailTimer += dt;
      const intervalo = this.state === 'flying' ? 0.014 : 0.028;
      if (this.trailTimer >= intervalo && emitTrail) {
        this.trailTimer = 0;
        emitTrail(this.x, this.y, this.angle, this.state === 'flying');
      }
    }

    /** Dibuja la nave luminosa orientada en su dirección de movimiento */
    draw(ctx, trailConfig = null) {
      if (this.state === 'dead') return;
      const accent = trailConfig ? trailConfig.shipAccent : '#00f5ff';
      const glow = trailConfig ? trailConfig.shipGlow : 'rgba(0, 245, 255, 0.45)';

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      // Resplandor del propulsor trasero
      const flame = ctx.createRadialGradient(-9, 0, 1, -9, 0, 14);
      flame.addColorStop(0, '#ffffff');
      flame.addColorStop(0.35, accent);
      flame.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.arc(-9, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      // Halo neón alrededor de la nave
      const shipGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
      shipGlow.addColorStop(0, glow);
      shipGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shipGlow;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();

      // Silueta delta luminosa de la nave
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(-9, -7.5);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-9, 7.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cabina neón magenta
      ctx.fillStyle = trailConfig && trailConfig.id !== 'clasica' ? accent : '#ff00e5';
      ctx.beginPath();
      ctx.ellipse(2, 0, 3.6, 2.1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  /* ========================================================================
     Game — Controlador principal, bucle rAF, generación procedural y UI
     ======================================================================== */
  class Game {
    constructor(opts = {}) {
      this.canvas = opts.canvas || null;
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
      this.storage = opts.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      this.getDateKey = typeof opts.getDateKey === 'function' ? opts.getDateKey : () => obtenerFechaLocal();

      this.width = opts.width || 1280;
      this.height = opts.height || 720;
      this.dpr = 1;

      this.state = 'title'; // 'title' | 'playing' | 'paused' | 'gameover'
      this.difficulty = this._cargarDificultad();
      this.level = 1;
      this.score = 0;
      this.highScore = this._cargarRecord();
      this.prevHighScoreAtStart = this.highScore;
      this.isNewRecord = false;
      this.combo = 1;
      this.maxCombo = 1;
      this.planetsReached = 0;
      this.starsCollected = 0;
      this.elapsedTime = 0;
      this.asteroidSpawnTimer = 0;
      this.nextPlanetId = 1;
      this.gameOverDelayTimer = 0;
      this.pendingGameOver = false;
      this._trailStep = 0;

      // Arreglo de logros desbloqueados para el componente Bitácora de Vuelo
      this.flightLog = [];
      this._unlockedLogIds = new Set();

      // Estado diario de desafíos y cosméticos temporales
      this.dailyState = this._cargarEstadoDiario();

      this.camera = new Camera();
      this.player = new Player();
      this.audio = new AudioManager(this.storage);
      this.spatialGrid = new SpatialGrid(220);

      // Buffers fuera de pantalla para Doble Buffering y Bloom Buffer
      this.backBufferCanvas = null;
      this.backBufferCtx = null;
      this.bloomCanvas = null;
      this.bloomCtx = null;

      this.planets = [];
      this.stars = [];
      this.asteroids = [];
      this.floatingTexts = [];

      // Pool fijo de partículas para rendimiento constante sin asignaciones
      this.particlePool = [];
      this.particleCursor = 0;
      const MAX_PARTICLES = 260;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        this.particlePool.push(new Particle());
      }

      // Tres capas de estrellas de fondo con parallax y nebulosas
      this.bgStarLayers = this._crearEstrellasFondo();
      this.nebulas = this._crearNebulosas();

      this._rafId = null;
      this._lastTimestamp = 0;
      this._ui = {};

      if (typeof document !== 'undefined') {
        this._vincularUI();
        this._vincularEventos();
        this.resize();
      }

      this._prepararDemoInicio();
      this._sincronizarUI();

      // Permite saltar directo a la partida con ?autostart=1
      if (typeof window !== 'undefined' && window.location && window.location.search.includes('autostart=1')) {
        this.startNewGame();
      }
    }

    /** Crea el estado diario limpio para una fecha dada */
    _crearEstadoDiarioNuevo(dateKey) {
      return {
        dateKey,
        challenges: generarDesafiosDelDia(dateKey),
        unlockedTrails: [],
        equippedTrail: 'clasica'
      };
    }

    /** Carga desafíos diarios desde localStorage o reinicia si cambió el día */
    _cargarEstadoDiario() {
      const today = this.getDateKey();
      try {
        const raw = this.storage ? this.storage.getItem(CLAVE_DESAFIOS) : null;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.dateKey === today && Array.isArray(parsed.challenges) && parsed.challenges.length > 0) {
            const unlocked = Array.isArray(parsed.unlockedTrails)
              ? parsed.unlockedTrails.filter((id) => Boolean(ESTELAS_COSMETICAS[id]))
              : [];
            const equipped =
              parsed.equippedTrail &&
              ESTELAS_COSMETICAS[parsed.equippedTrail] &&
              (ESTELAS_COSMETICAS[parsed.equippedTrail].alwaysUnlocked || unlocked.includes(parsed.equippedTrail))
                ? parsed.equippedTrail
                : 'clasica';
            return {
              dateKey: today,
              challenges: parsed.challenges,
              unlockedTrails: unlocked,
              equippedTrail: equipped
            };
          }
        }
      } catch {
        // Ignora JSON inválido y regenera desafíos del día
      }
      const nuevo = this._crearEstadoDiarioNuevo(today);
      this._guardarEstadoDiario(nuevo);
      return nuevo;
    }

    /** Persiste los desafíos diarios y estelas temporales desbloqueadas hoy */
    _guardarEstadoDiario(stateObj = this.dailyState) {
      try {
        if (this.storage && stateObj) {
          this.storage.setItem(CLAVE_DESAFIOS, JSON.stringify(stateObj));
        }
      } catch {
        // Ignora errores de almacenamiento
      }
    }

    /** Comprueba si cambió el calendario local para reiniciar desafíos y expirar cosméticos temporales */
    _verificarCambioDeDia() {
      const today = this.getDateKey();
      if (!this.dailyState || this.dailyState.dateKey !== today) {
        this.dailyState = this._crearEstadoDiarioNuevo(today);
        this._guardarEstadoDiario();
        return true;
      }
      return false;
    }

    /** Devuelve la configuración visual de la estela equipada actualmente */
    getActiveTrail() {
      this._verificarCambioDeDia();
      const id = this.dailyState.equippedTrail;
      const cfg = ESTELAS_COSMETICAS[id];
      if (cfg && (cfg.alwaysUnlocked || this.dailyState.unlockedTrails.includes(id))) {
        return cfg;
      }
      return ESTELAS_COSMETICAS.clasica;
    }

    /** Lista de estelas mostradas en el selector (clásica + las recompensas del día) */
    getAvailableTrailsForUI() {
      this._verificarCambioDeDia();
      const ids = ['clasica'];
      for (let i = 0; i < this.dailyState.challenges.length; i++) {
        const ch = this.dailyState.challenges[i];
        if (ch.rewardType === 'cosmetic' && ESTELAS_COSMETICAS[ch.rewardValue] && !ids.includes(ch.rewardValue)) {
          ids.push(ch.rewardValue);
        }
      }
      for (let i = 0; i < this.dailyState.unlockedTrails.length; i++) {
        const id = this.dailyState.unlockedTrails[i];
        if (ESTELAS_COSMETICAS[id] && !ids.includes(id)) {
          ids.push(id);
        }
      }
      return ids.map((id) => {
        const cfg = ESTELAS_COSMETICAS[id];
        return {
          ...cfg,
          unlocked: Boolean(cfg.alwaysUnlocked || this.dailyState.unlockedTrails.includes(id)),
          equipped: this.dailyState.equippedTrail === id
        };
      });
    }

    /** Equipa un cosmético de estela si está desbloqueado hoy */
    equipTrail(trailId) {
      this._verificarCambioDeDia();
      const cfg = ESTELAS_COSMETICAS[trailId];
      if (!cfg) return false;
      const unlocked = cfg.alwaysUnlocked || this.dailyState.unlockedTrails.includes(trailId);
      if (!unlocked) return false;
      this.dailyState.equippedTrail = trailId;
      this._guardarEstadoDiario();
      this._needsStaticRender = true;
      this._sincronizarUI();
      return true;
    }

    /** Lee la dificultad seleccionada de localStorage */
    _cargarDificultad() {
      try {
        const raw = this.storage ? this.storage.getItem(CLAVE_DIFICULTAD) : null;
        return raw && DIFICULTADES[raw] ? raw : 'normal';
      } catch {
        return 'normal';
      }
    }

    /** Cambia el modo de dificultad y lo guarda */
    setDifficulty(diffId) {
      if (!DIFICULTADES[diffId]) return;
      this.difficulty = diffId;
      try {
        if (this.storage) {
          this.storage.setItem(CLAVE_DIFICULTAD, diffId);
        }
      } catch {
        // Ignora almacenamiento restringido
      }
      this._sincronizarUI();
    }

    /** Carga el récord guardado en localStorage */
    _cargarRecord() {
      try {
        const raw = this.storage ? this.storage.getItem(CLAVE_RECORD) : null;
        const parsed = raw ? parseInt(raw, 10) : 0;
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      } catch {
        return 0;
      }
    }

    /** Guarda el nuevo récord en localStorage */
    _guardarRecord(valor) {
      try {
        if (this.storage) {
          this.storage.setItem(CLAVE_RECORD, String(valor));
        }
      } catch {
        // Ignora errores de almacenamiento
      }
    }

    /** Genera 3 capas de estrellas parallax para el fondo espacial */
    _crearEstrellasFondo() {
      const capas = [
        { speed: 0.08, count: 55, sizeMin: 0.8, sizeMax: 1.5, alpha: 0.45 },
        { speed: 0.2, count: 42, sizeMin: 1.2, sizeMax: 2.1, alpha: 0.68 },
        { speed: 0.38, count: 28, sizeMin: 1.6, sizeMax: 2.7, alpha: 0.9 }
      ];
      return capas.map((cfg) => {
        const items = [];
        for (let i = 0; i < cfg.count; i++) {
          items.push({
            rx: Math.random(), // Coordenada normalizada [0..1]
            ry: Math.random(),
            size: randRange(cfg.sizeMin, cfg.sizeMax),
            baseAlpha: cfg.alpha,
            twinkleSpeed: randRange(1.2, 3.6),
            twinklePhase: Math.random() * Math.PI * 2,
            tint: i % 7 === 0 ? '#9ffcff' : i % 11 === 0 ? '#ffc7fa' : '#ffffff'
          });
        }
        return { speed: cfg.speed, items };
      });
    }

    /** Define nebulosas difusas pre-renderizadas para máximo rendimiento */
    _crearNebulosas() {
      const specs = [
        { rx: 0.22, ry: 0.28, radiusFactor: 0.46, color: 'rgba(255, 0, 229, 0.14)', driftX: 12, driftY: 8, phase: 0.3 },
        { rx: 0.78, ry: 0.42, radiusFactor: 0.52, color: 'rgba(0, 245, 255, 0.12)', driftX: -14, driftY: 10, phase: 2.1 },
        { rx: 0.48, ry: 0.76, radiusFactor: 0.58, color: 'rgba(138, 43, 226, 0.18)', driftX: 10, driftY: -12, phase: 4.4 }
      ];
      return specs.map((spec) => {
        let sprite = null;
        if (typeof document !== 'undefined') {
          const size = 256;
          const c = document.createElement('canvas');
          c.width = size;
          c.height = size;
          const sctx = c.getContext('2d');
          if (sctx) {
            const half = size * 0.5;
            const g = sctx.createRadialGradient(half, half, 4, half, half, half);
            g.addColorStop(0, spec.color);
            g.addColorStop(1, 'rgba(0, 0, 0, 0)');
            sctx.fillStyle = g;
            sctx.fillRect(0, 0, size, size);
            sprite = c;
          }
        }
        return { ...spec, sprite };
      });
    }

    /** Obtiene y guarda referencias a los elementos del DOM */
    _vincularUI() {
      this._ui = {
        titleBest: document.getElementById('title-best'),
        titleTrailSelector: document.getElementById('title-trail-selector'),
        hudLevel: document.getElementById('hud-level'),
        hudDifficulty: document.getElementById('hud-difficulty'),
        hudScore: document.getElementById('hud-score'),
        hudCombo: document.getElementById('hud-combo'),
        pauseScore: document.getElementById('pause-score'),
        gameoverScore: document.getElementById('gameover-score'),
        gameoverBest: document.getElementById('gameover-best'),
        gameoverNewRecord: document.getElementById('gameover-new-record'),
        gameoverDetails: document.getElementById('gameover-details'),
        dailyChallengesList: document.getElementById('daily-challenges-list'),
        dailyChallengesCount: document.getElementById('daily-challenges-count'),
        gameoverTrailSelector: document.getElementById('gameover-trail-selector'),
        flightLogList: document.getElementById('flight-log-list'),
        flightLogCount: document.getElementById('flight-log-count'),
        diffButtons: Array.from(document.querySelectorAll('.diff-btn')),
        btnStart: document.getElementById('btn-start'),
        btnMute: document.getElementById('btn-mute'),
        btnPause: document.getElementById('btn-pause'),
        btnResume: document.getElementById('btn-resume'),
        btnRestartPause: document.getElementById('btn-restart-pause'),
        btnMenuPause: document.getElementById('btn-menu-pause'),
        btnRetry: document.getElementById('btn-retry'),
        btnMenuGameover: document.getElementById('btn-menu-gameover')
      };
    }

    /** Conecta eventos de teclado, ratón, táctil, redimensionado y cambio de foco */
    _vincularEventos() {
      window.addEventListener('resize', () => this.resize());

      // Pausa automática si la pestaña pierde visibilidad
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.state === 'playing') {
          this.pauseGame();
        }
      });

      // Controles de teclado
      window.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        const code = e.code;

        if (code === 'KeyM') {
          e.preventDefault();
          this.toggleMute();
          return;
        }

        if (code === 'KeyP' || code === 'Escape') {
          if (this.state === 'playing') {
            e.preventDefault();
            this.pauseGame();
          } else if (this.state === 'paused') {
            e.preventDefault();
            this.resumeGame();
          }
          return;
        }

        if (code === 'Space' || code === 'Enter') {
          e.preventDefault();
          this.audio.unlock();
          if (this.state === 'title') {
            this.startNewGame();
          } else if (this.state === 'playing') {
            if (code === 'Space') this.handleActionInput();
          } else if (this.state === 'gameover') {
            this.startNewGame();
          }
        }
      });

      // Entrada por puntero / táctil sobre el lienzo y pantalla de inicio
      const handlePointerAction = (e) => {
        // Ignora clics sobre botones de control superior
        if (e.target && e.target.closest && e.target.closest('button')) {
          return;
        }
        this.audio.unlock();
        if (this.state === 'title') {
          this.startNewGame();
        } else if (this.state === 'playing') {
          this.handleActionInput();
        }
      };

      if (this.canvas) {
        this.canvas.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          handlePointerAction(e);
        });
      }

      const screenTitle = document.getElementById('screen-title');
      if (screenTitle) {
        screenTitle.addEventListener('pointerdown', (e) => {
          if (
            e.target &&
            e.target.closest &&
            e.target.closest('button, #btn-mute, .difficulty-selector, .trail-selector')
          ) {
            return;
          }
          e.preventDefault();
          this.audio.unlock();
          this.startNewGame();
        });
      }

      if (this._ui.diffButtons) {
        this._ui.diffButtons.forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.audio.unlock();
            const diffId = btn.getAttribute('data-difficulty');
            if (diffId) this.setDifficulty(diffId);
          });
        });
      }

      // Delegación para selector de estela en título y en Game Over
      const bindTrailSelector = (container) => {
        if (!container) return;
        container.addEventListener('pointerdown', (e) => e.stopPropagation());
        container.addEventListener('click', (e) => {
          e.stopPropagation();
          const btn = e.target && e.target.closest ? e.target.closest('.trail-btn') : null;
          if (!btn || btn.disabled) return;
          this.audio.unlock();
          const trailId = btn.getAttribute('data-trail');
          if (trailId) this.equipTrail(trailId);
        });
      };
      bindTrailSelector(this._ui.titleTrailSelector);
      bindTrailSelector(this._ui.gameoverTrailSelector);

      if (this._ui.btnStart) {
        this._ui.btnStart.addEventListener('click', (e) => {
          e.stopPropagation();
          this.audio.unlock();
          this.startNewGame();
        });
      }

      if (this._ui.btnMute) {
        this._ui.btnMute.addEventListener('click', (e) => {
          e.stopPropagation();
          this.audio.unlock();
          this.toggleMute();
          e.currentTarget.blur();
        });
      }

      if (this._ui.btnPause) {
        this._ui.btnPause.addEventListener('click', (e) => {
          e.stopPropagation();
          this.audio.unlock();
          this.pauseGame();
          e.currentTarget.blur();
        });
      }

      if (this._ui.btnResume) {
        this._ui.btnResume.addEventListener('click', () => {
          this.audio.unlock();
          this.resumeGame();
        });
      }

      if (this._ui.btnRestartPause) {
        this._ui.btnRestartPause.addEventListener('click', () => {
          this.audio.unlock();
          this.startNewGame();
        });
      }

      if (this._ui.btnMenuPause) {
        this._ui.btnMenuPause.addEventListener('click', () => {
          this.audio.unlock();
          this.returnToMenu();
        });
      }

      if (this._ui.btnRetry) {
        this._ui.btnRetry.addEventListener('click', () => {
          this.audio.unlock();
          this.startNewGame();
        });
      }

      if (this._ui.btnMenuGameover) {
        this._ui.btnMenuGameover.addEventListener('click', () => {
          this.audio.unlock();
          this.returnToMenu();
        });
      }
    }

    /** Ajusta el tamaño del canvas principal, Back Buffer y Bloom Buffer */
    resize() {
      if (!this.canvas || !this.ctx) return;
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      const physW = Math.max(1, Math.floor(this.width * this.dpr));
      const physH = Math.max(1, Math.floor(this.height * this.dpr));

      this.canvas.width = physW;
      this.canvas.height = physH;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Doble Buffering: canvas secundario de escena completa
      if (typeof document !== 'undefined') {
        if (!this.backBufferCanvas) {
          this.backBufferCanvas = document.createElement('canvas');
          this.backBufferCtx = this.backBufferCanvas.getContext('2d');
        }
        this.backBufferCanvas.width = physW;
        this.backBufferCanvas.height = physH;
        if (this.backBufferCtx) {
          this.backBufferCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }

        // Bloom Buffer: canvas de baja resolución (25%) para resplandor aditivo rápido
        if (!this.bloomCanvas) {
          this.bloomCanvas = document.createElement('canvas');
          this.bloomCtx = this.bloomCanvas.getContext('2d');
        }
        this.bloomScale = 0.25;
        this.bloomCanvas.width = Math.max(1, Math.floor(this.width * this.bloomScale));
        this.bloomCanvas.height = Math.max(1, Math.floor(this.height * this.bloomScale));
        if (this.bloomCtx) {
          this.bloomCtx.setTransform(this.bloomScale, 0, 0, this.bloomScale, 0, 0);
        }
      }

      this._needsStaticRender = true;
    }

    /** Prepara el mundo de fondo animado para la pantalla de título */
    _prepararDemoInicio() {
      this.planets = [];
      this.stars = [];
      this.asteroids = [];
      this.floatingTexts = [];
      this.nextPlanetId = 1;

      const planetaDemo = new Planet({
        id: this.nextPlanetId++,
        x: 0,
        y: 64,
        radius: 40,
        captureRadius: 96,
        orbitRadius: 68,
        orbitSpeed: 1.85,
        orbitDir: 1,
        palette: PALETA_NEON[0],
        hasRings: true,
        visited: true
      });
      this.planets.push(planetaDemo);
      this.player.reset(planetaDemo);
      this.camera.reset(0, -10);
    }

    /** Inicia una nueva partida desde cero */
    startNewGame() {
      this.state = 'playing';
      this.level = 1;
      this.score = 0;
      this.prevHighScoreAtStart = this.highScore;
      this.isNewRecord = false;
      this.combo = 1;
      this.maxCombo = 1;
      this.planetsReached = 0;
      this.starsCollected = 0;
      this.elapsedTime = 0;
      this.asteroidSpawnTimer = 1.5;
      this.pendingGameOver = false;
      this.gameOverDelayTimer = 0;
      this.nextPlanetId = 1;

      this.flightLog = [];
      this._unlockedLogIds.clear();

      this.planets = [];
      this.stars = [];
      this.asteroids = [];
      this.floatingTexts = [];
      for (let i = 0; i < this.particlePool.length; i++) {
        this.particlePool[i].active = false;
      }

      const cfgDiff = DIFICULTADES[this.difficulty] || DIFICULTADES.normal;

      // Planeta inicial centrado
      const planetaInicial = new Planet({
        id: this.nextPlanetId++,
        x: 0,
        y: 0,
        radius: 34,
        captureRadius: 84 * cfgDiff.captureMult,
        orbitRadius: 60,
        orbitSpeed: 2.15 * cfgDiff.speedMult,
        orbitDir: 1,
        palette: PALETA_NEON[0],
        hasRings: false,
        visited: true
      });

      this.planets.push(planetaInicial);
      this.player.reset(planetaInicial);
      this.camera.reset(0, -85);

      // Genera los primeros planetas y estrellas por encima del jugador
      this._generarHasta(-this.height * 1.5);

      if (typeof document !== 'undefined' && document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }

      this.audio.setAmbientLevel(0.1);
      this._sincronizarUI();
    }

    /** Registra un hito único en la Bitácora de Vuelo de la sesión */
    _registrarHito(id, title, meta = '') {
      if (this._unlockedLogIds.has(id)) return false;
      this._unlockedLogIds.add(id);
      this.flightLog.push({ id, title, meta });
      return true;
    }

    /** Evalúa el progreso de los Desafíos Diarios y otorga puntos extra o cosméticos temporales */
    _evaluarDesafiosDiarios() {
      this._verificarCambioDeDia();
      const challenges = this.dailyState.challenges;
      let dirty = false;

      const valorMetrica = (metric) => {
        if (metric === 'planets') return this.planetsReached;
        if (metric === 'maxCombo') return this.maxCombo;
        if (metric === 'stars') return this.starsCollected;
        if (metric === 'level') return this.level;
        if (metric === 'score') return this.score;
        return 0;
      };

      for (let i = 0; i < challenges.length; i++) {
        const ch = challenges[i];
        const actual = valorMetrica(ch.metric);
        const nuevoProgreso = Math.min(ch.target, Math.max(ch.progress || 0, actual));
        if (nuevoProgreso !== ch.progress) {
          ch.progress = nuevoProgreso;
          dirty = true;
        }

        if (!ch.completed && ch.progress >= ch.target) {
          ch.completed = true;
          dirty = true;

          if (ch.rewardType === 'points') {
            this.score += ch.rewardValue;
            this._registrarHito(`daily_${ch.id}`, `Desafío: ${ch.title}`, `+${ch.rewardValue} pts`);
            if (this.player) {
              this._agregarTextoFlotante(
                this.player.x,
                this.player.y - 34,
                `¡DESAFÍO +${ch.rewardValue}!`,
                '#39ff14',
                1.18
              );
            }
            this._actualizarRecordSiSuperado();
          } else if (ch.rewardType === 'cosmetic') {
            const trailId = ch.rewardValue;
            if (!this.dailyState.unlockedTrails.includes(trailId)) {
              this.dailyState.unlockedTrails.push(trailId);
            }
            if (this.dailyState.equippedTrail === 'clasica') {
              this.dailyState.equippedTrail = trailId;
            }
            const trailCfg = ESTELAS_COSMETICAS[trailId];
            const nombreEstela = trailCfg ? trailCfg.name : trailId;
            this._registrarHito(`daily_${ch.id}`, `Estela ${nombreEstela}`, 'Hoy');
            if (this.player) {
              this._agregarTextoFlotante(
                this.player.x,
                this.player.y - 34,
                `¡ESTELA ${nombreEstela.toUpperCase()}!`,
                trailCfg ? trailCfg.shipAccent : '#ffe600',
                1.14
              );
            }
          }

          if (this.audio) {
            this.audio.playStar();
          }
        }
      }

      if (dirty) {
        this._guardarEstadoDiario();
      }
    }

    /** Sale de la partida actual y regresa limpiamente al menú principal */
    returnToMenu() {
      this.state = 'title';
      this.pendingGameOver = false;
      this.gameOverDelayTimer = 0;
      this.floatingTexts = [];
      for (let i = 0; i < this.particlePool.length; i++) {
        this.particlePool[i].active = false;
      }
      this._verificarCambioDeDia();
      this._prepararDemoInicio();
      this._needsStaticRender = true;
      if (this.audio) {
        this.audio.setAmbientLevel(0.06);
      }
      if (typeof document !== 'undefined' && document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
      this._sincronizarUI();
    }

    /** Pausa la partida actual */
    pauseGame() {
      if (this.state !== 'playing') return;
      this.state = 'paused';
      this._needsStaticRender = true;
      this.audio.setAmbientLevel(0.03);
      this._sincronizarUI();
    }

    /** Reanuda la partida pausada */
    resumeGame() {
      if (this.state !== 'paused') return;
      this.state = 'playing';
      this._lastTimestamp = performance.now();
      this.audio.setAmbientLevel(0.1);
      this._sincronizarUI();
    }

    /** Alterna el estado de silencio de audio */
    toggleMute() {
      this.audio.toggleMute();
      this._sincronizarUI();
    }

    /** Procesa la acción principal de un solo botón: soltar órbita */
    handleActionInput() {
      if (this.state !== 'playing' || this.pendingGameOver) return;
      const lanzado = this.player.launch();
      if (lanzado) {
        this._registrarHito('first_jump', 'Primer salto', `Nv. ${this.level}`);
        this.audio.playJump();
        this._emitirExplosion(this.player.x, this.player.y, '#00f5ff', 8, 130);
      }
    }

    /** Parámetros de dificultad progresiva combinando nivel, puntuación y modo elegido */
    getDifficultyParams(score = this.score, level = this.level) {
      const cfg = DIFICULTADES[this.difficulty] || DIFICULTADES.normal;
      const progreso = clamp(Math.max(score / 45, (level - 1) / 11), 0, 1);

      return {
        difficultyId: cfg.id,
        difficultyLabel: cfg.label,
        level,
        minGap: lerp(165, 225, progreso) * cfg.gapMult,
        maxGap: lerp(225, 315, progreso) * cfg.gapMult,
        minRadius: lerp(31, 21, progreso),
        maxRadius: lerp(42, 33, progreso),
        orbitSpeedMin: lerp(2.1, 3.1, progreso) * cfg.speedMult,
        orbitSpeedMax: lerp(2.7, 4.35, progreso) * cfg.speedMult,
        captureMult: cfg.captureMult,
        movingChance:
          level >= cfg.movingMinLevel || score >= 6
            ? clamp((Math.max(score - 5, (level - cfg.movingMinLevel + 1) * 3)) * 0.045, 0, 0.65)
            : 0,
        asteroidActive: score >= cfg.asteroidMinScore || level >= cfg.asteroidMinLevel,
        asteroidInterval: clamp((3.8 - Math.max(0, score - cfg.asteroidMinScore) * 0.06) / cfg.speedMult, 1.35, 4.0)
      };
    }

    /** Genera planetas y estrellas proceduralmente hasta una altura objetivo */
    _generarHasta(targetY) {
      let ultimo = this.planets[this.planets.length - 1];
      const halfSpan = clamp(this.width * 0.31, 105, 220);

      while (ultimo && ultimo.y > targetY) {
        const nivelEstimado = Math.floor((this.planetsReached + this.planets.length) / 3) + 1;
        const diff = this.getDifficultyParams(this.score + this.planets.length, nivelEstimado);
        const gapMaxSeguro = Math.min(diff.maxGap, Math.max(210, this.height * 0.44));
        const gapMinSeguro = Math.min(diff.minGap, gapMaxSeguro - 30);
        const dy = randRange(gapMinSeguro, gapMaxSeguro);
        const nextY = ultimo.y - dy;

        // Evita que dos planetas consecutivos queden demasiado alineados en el borde
        let nextX = randRange(-halfSpan, halfSpan);
        if (Math.abs(nextX - ultimo.baseX) < 42) {
          nextX = clamp(ultimo.baseX + (ultimo.baseX > 0 ? -95 : 95), -halfSpan, halfSpan);
        }

        const radius = randRange(diff.minRadius, diff.maxRadius);
        const captureRadius = radius * randRange(2.25, 2.55) * diff.captureMult;
        const orbitRadius = radius * 1.66;
        const orbitSpeed = randRange(diff.orbitSpeedMin, diff.orbitSpeedMax);
        const orbitDir = Math.random() < 0.5 ? 1 : -1;
        const palette = PALETA_NEON[(this.nextPlanetId - 1) % PALETA_NEON.length];
        const hasRings = Math.random() < 0.34;

        let moveAmp = 0;
        let moveFreq = 1.1;
        if (Math.random() < diff.movingChance) {
          moveAmp = randRange(36, Math.min(82, halfSpan * 0.48));
          moveFreq = randRange(0.95, 1.65);
          nextX = clamp(nextX, -halfSpan + moveAmp * 0.6, halfSpan - moveAmp * 0.6);
        }

        const nuevo = new Planet({
          id: this.nextPlanetId++,
          x: nextX,
          y: nextY,
          radius,
          captureRadius,
          orbitRadius,
          orbitSpeed,
          orbitDir,
          palette,
          hasRings,
          moveAmp,
          moveFreq,
          movePhase: Math.random() * Math.PI * 2,
          visited: false
        });

        this.planets.push(nuevo);

        // Genera una estrella coleccionable flotando entre el planeta anterior y el nuevo
        if (Math.random() < 0.68) {
          const t = randRange(0.38, 0.62);
          const sx = lerp(ultimo.baseX, nuevo.baseX, t) + randRange(-38, 38);
          const sy = lerp(ultimo.y, nuevo.y, t);
          this.stars.push(new Star(clamp(sx, -halfSpan, halfSpan), sy));
        }

        ultimo = nuevo;
      }
    }

    /** Libera un asteroide lateral cuando la puntuación >= 15 */
    _generarAsteroide() {
      const desdeIzquierda = Math.random() < 0.5;
      const margen = 65;
      const mitadAncho = this.width * 0.5 + margen;
      const spawnX = this.camera.x + (desdeIzquierda ? -mitadAncho : mitadAncho);
      const spawnY = this.camera.y - randRange(this.height * 0.1, this.height * 0.45);
      const speedX = (desdeIzquierda ? 1 : -1) * randRange(82, 138);
      const speedY = randRange(12, 34);
      const radius = randRange(16, 24);
      this.asteroids.push(new Asteroid(spawnX, spawnY, speedX, speedY, radius));
    }

    /** Toma la siguiente partícula disponible del pool circular */
    _spawnParticle(opts) {
      const p = this.particlePool[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % this.particlePool.length;
      p.spawn(opts);
    }

    /** Emite estela detrás de la nave usando el cosmético de estela activo */
    _emitirEstela(x, y, angle, isFlying) {
      const trail = this.getActiveTrail();
      const palette = isFlying ? trail.flyingColors : trail.orbitColors;
      const color = palette[this._trailStep % palette.length];
      this._trailStep = (this._trailStep + 1) % 10000;
      const isCustom = trail.id !== 'clasica';

      const spread = isFlying ? (isCustom ? 0.45 : 0.35) : 0.22;
      const speed = isFlying ? randRange(30, 82) : randRange(10, 32);
      const backAngle = angle + Math.PI + randRange(-spread, spread);
      this._spawnParticle({
        x: x - Math.cos(angle) * 8,
        y: y - Math.sin(angle) * 8,
        vx: Math.cos(backAngle) * speed,
        vy: Math.sin(backAngle) * speed,
        life: isFlying ? (isCustom ? 0.48 : 0.42) : 0.28,
        size: isFlying ? randRange(isCustom ? 2.8 : 2.4, isCustom ? 4.8 : 4.2) : randRange(1.8, 3.0),
        color,
        drag: 0.92
      });
    }

    /** Emite explosión radial de partículas (estrellas, captura, muerte) */
    _emitirExplosion(x, y, color, count = 16, maxSpeed = 240) {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + randRange(-0.2, 0.2);
        const s = randRange(maxSpeed * 0.3, maxSpeed);
        this._spawnParticle({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: randRange(0.35, 0.72),
          size: randRange(2.5, 5.2),
          color,
          drag: 0.93
        });
      }
    }

    /** Agrega un texto flotante animado (+1, +5, ¡PERFECTO!) */
    _agregarTextoFlotante(x, y, text, color = '#ffffff', scale = 1) {
      this.floatingTexts.push({
        x,
        y,
        text,
        color,
        scale,
        life: 0.95,
        maxLife: 0.95
      });
    }

    /** Maneja la captura de un planeta, puntuación y sistema de combos */
    _onCapturePlanet(planet) {
      this.player.capture(planet);
      this.camera.setAnchorY(planet.y - 85);
      planet.pulseScale = 1.12;

      // Efectos de "juice": sacudida, zoom sutil y onda expansiva
      this.camera.addShake(5.5, 0.18);
      this.camera.pulseZoom(1.055);
      this._spawnParticle({
        x: planet.x,
        y: planet.y,
        life: 0.42,
        color: planet.palette.core,
        isRing: true,
        ringRadius: planet.radius,
        ringGrowth: 190
      });

      if (!planet.visited) {
        planet.visited = true;
        this.planetsReached += 1;
        this._registrarHito('first_capture', 'Primera órbita enlazada', `${this.score + 1} pts`);

        if (this.player.launchedQuickly) {
          this.combo += 1;
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          if (this.combo >= 3) {
            this._registrarHito('combo_3', 'Combo x3', `${this.planetsReached} plan.`);
          }
          if (this.combo >= 5) {
            this._registrarHito('combo_5', 'Combo x5', `${this.planetsReached} plan.`);
          }
        } else {
          this.combo = 1;
        }

        const puntos = 1 * this.combo;
        this.score += puntos;

        // Progresión de nivel cada 3 planetas alcanzados
        const nuevoNivel = Math.floor(this.planetsReached / 3) + 1;
        if (nuevoNivel > this.level) {
          this.level = nuevoNivel;
          this._agregarTextoFlotante(
            planet.x,
            planet.y - planet.radius - 42,
            `¡NIVEL ${this.level}!`,
            '#ff00e5',
            1.22
          );
          if (this.level >= 4) {
            this._registrarHito('level_3', 'Superado el nivel 3', `Nv. ${this.level}`);
          }
          if (this.level >= 6) {
            this._registrarHito('level_5', 'Superado el nivel 5', `Nv. ${this.level}`);
          }
          if (this.level >= 11) {
            this._registrarHito('level_10', 'Superado el nivel 10', `Nv. ${this.level}`);
          }
        }

        if (this.combo > 1) {
          this._agregarTextoFlotante(
            planet.x,
            planet.y - planet.radius - 18,
            `¡PERFECTO! x${this.combo} (+${puntos})`,
            '#ffe600',
            1.15
          );
        } else {
          this._agregarTextoFlotante(
            planet.x,
            planet.y - planet.radius - 16,
            `+${puntos}`,
            planet.palette.core,
            1
          );
        }

        this.audio.playCapture(this.combo);
        this._emitirExplosion(this.player.x, this.player.y, planet.palette.core, 14, 180);
        this._evaluarDesafiosDiarios();
        this._actualizarRecordSiSuperado();
        this._sincronizarUI();
      } else {
        this.audio.playCapture(1);
      }
    }

    /** Actualiza el récord en memoria y localStorage si fue superado */
    _actualizarRecordSiSuperado() {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.isNewRecord = true;
        if (this.prevHighScoreAtStart > 0) {
          this._registrarHito('new_record', '¡Nuevo récord!', `${this.highScore} pts`);
        }
        this._guardarRecord(this.highScore);
      }
    }

    /** Inicia la secuencia de derrota tras chocar o salir de pantalla */
    triggerGameOver() {
      if (this.pendingGameOver || this.state !== 'playing') return;
      this.pendingGameOver = true;
      this.gameOverDelayTimer = 0.45;
      this.player.state = 'dead';

      this.camera.addShake(14, 0.38);
      this.audio.playDeath();
      this.audio.setAmbientLevel(0.03);
      this._emitirExplosion(this.player.x, this.player.y, '#ff00e5', 26, 310);
      this._emitirExplosion(this.player.x, this.player.y, '#00f5ff', 16, 220);
      this._actualizarRecordSiSuperado();
    }

    /** Comprueba si la nave salió fuera de los límites visibles de la cámara */
    _estaFueraDePantalla() {
      const marginX = this.width * 0.5 + 36;
      const marginTop = this.height * 0.5 + 140;
      const marginBottom = this.height * 0.5 + 40;
      const dx = Math.abs(this.player.x - this.camera.x);
      const dy = this.player.y - this.camera.y;
      return dx > marginX || dy > marginBottom || dy < -marginTop;
    }

    /** Actualización física y lógica de un paso de simulación (dt ya limitado) */
    update(rawDt) {
      const dt = Math.min(rawDt, 0.05);
      if (this.state === 'paused') return;

      this.elapsedTime += dt;

      // Modo demo en la pantalla de título
      if (this.state === 'title') {
        const planetaDemo = this.planets[0];
        if (planetaDemo) {
          planetaDemo.update(dt, this.elapsedTime);
          this.player.update(dt, (x, y, a, fly) => this._emitirEstela(x, y, a, fly));
          this.camera.update(dt, planetaDemo.x, planetaDemo.y + 40);
        }
        for (let i = 0; i < this.particlePool.length; i++) {
          this.particlePool[i].update(dt);
        }
        return;
      }

      // Actualiza partículas y cámara incluso durante la pausa breve de Game Over
      for (let i = 0; i < this.particlePool.length; i++) {
        this.particlePool[i].update(dt);
      }

      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.life -= dt;
        ft.y -= 42 * dt;
        if (ft.life <= 0) {
          this.floatingTexts.splice(i, 1);
        }
      }

      if (this.pendingGameOver) {
        this.camera.update(dt, this.player.x, this.player.y);
        this.gameOverDelayTimer -= dt;
        if (this.gameOverDelayTimer <= 0) {
          this.pendingGameOver = false;
          this.state = 'gameover';
          this._sincronizarUI();
        }
        return;
      }

      if (this.state !== 'playing') return;

      // 1. Actualizar planetas y generar más arriba según avance la cámara
      for (let i = 0; i < this.planets.length; i++) {
        this.planets[i].update(dt, this.elapsedTime);
      }
      this._generarHasta(this.camera.y - this.height * 1.45);

      // Limpia entidades que quedaron muy abajo fuera de cámara
      const limiteInferior = this.camera.y + this.height * 0.9;
      while (this.planets.length > 3 && this.planets[0].y > limiteInferior && this.planets[0] !== this.player.planet) {
        this.planets.shift();
      }

      for (let i = this.stars.length - 1; i >= 0; i--) {
        const s = this.stars[i];
        s.update(dt, this.elapsedTime);
        if (s.y > limiteInferior || s.collected) {
          this.stars.splice(i, 1);
        }
      }

      const diff = this.getDifficultyParams(this.score, this.level);
      if (diff.asteroidActive) {
        this._registrarHito('asteroid_zone', 'Zona de asteroides', `Nv. ${this.level}`);
        this.asteroidSpawnTimer -= dt;
        if (this.asteroidSpawnTimer <= 0) {
          this._generarAsteroide();
          this.asteroidSpawnTimer = diff.asteroidInterval;
        }
      }

      for (let i = this.asteroids.length - 1; i >= 0; i--) {
        const a = this.asteroids[i];
        a.update(dt);
        if (
          Math.abs(a.x - this.camera.x) > this.width * 0.8 + 120 ||
          a.y > limiteInferior + 100
        ) {
          this.asteroids.splice(i, 1);
        }
      }

      // 2. Actualizar jugador
      this.player.update(dt, (x, y, a, fly) => this._emitirEstela(x, y, a, fly));

      // 3. Indexar entidades en SpatialGrid y consultar únicamente las cercanas a la nave
      this.spatialGrid.clear();
      for (let i = 0; i < this.planets.length; i++) {
        const p = this.planets[i];
        this.spatialGrid.insert(p, p.captureRadius, 'planet');
      }
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        if (!s.collected) {
          this.spatialGrid.insert(s, s.hitRadius, 'star');
        }
      }
      for (let i = 0; i < this.asteroids.length; i++) {
        const a = this.asteroids[i];
        this.spatialGrid.insert(a, a.hitRadius, 'asteroid');
      }

      const cercanos = this.spatialGrid.query(
        this.player.x,
        this.player.y,
        this.player.hitRadius + 12
      );

      let capturedThisFrame = false;
      for (let i = 0; i < cercanos.length; i++) {
        const { entity, type } = cercanos[i];

        if (type === 'planet' && !capturedThisFrame && this.player.state === 'flying') {
          if (entity.id === this.player.lastPlanetId) continue;
          const dist = Math.hypot(this.player.x - entity.x, this.player.y - entity.y);
          if (dist <= entity.captureRadius) {
            this._onCapturePlanet(entity);
            capturedThisFrame = true;
          }
        } else if (type === 'star' && !entity.collected && this.player.state !== 'dead') {
          const dist = Math.hypot(this.player.x - entity.x, this.player.y - entity.y);
          if (dist <= entity.hitRadius + this.player.hitRadius) {
            entity.collected = true;
            this.starsCollected += 1;
            this._registrarHito('first_star', 'Cazador estelar', '+5 ★');
            if (this.starsCollected >= 3) {
              this._registrarHito('three_stars', 'Coleccionista estelar', `${this.starsCollected} ★`);
            }
            const bonus = 5 * (this.combo > 1 ? this.combo : 1);
            this.score += bonus;
            this.audio.playStar();
            this._emitirExplosion(entity.x, entity.y, '#ffe600', 18, 220);
            this._agregarTextoFlotante(
              entity.x,
              entity.y - 12,
              `+${bonus} ★`,
              '#ffe600',
              1.1
            );
            this._evaluarDesafiosDiarios();
            this._actualizarRecordSiSuperado();
            this._sincronizarUI();
          }
        } else if (type === 'asteroid' && this.player.state !== 'dead') {
          const dist = Math.hypot(this.player.x - entity.x, this.player.y - entity.y);
          if (dist < entity.hitRadius + this.player.hitRadius) {
            this.triggerGameOver();
            return;
          }
        }
      }

      // 4. Actualizar cámara y comprobar salida fuera de pantalla
      this.camera.update(dt, this.player.x, this.player.y, this.player.state === 'flying');
      if (this.player.state === 'flying' && this._estaFueraDePantalla()) {
        this.triggerGameOver();
      }
    }

    /** Renderiza botones del selector de estelas temporales en un contenedor dado */
    _renderTrailSelector(container) {
      if (!container) return;
      const trails = this.getAvailableTrailsForUI();
      container.textContent = '';

      for (let i = 0; i < trails.length; i++) {
        const t = trails[i];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'trail-btn';
        if (t.equipped) btn.classList.add('is-active');
        if (!t.unlocked) btn.classList.add('is-locked');
        btn.setAttribute('data-trail', t.id);
        btn.setAttribute('aria-pressed', String(t.equipped));
        btn.disabled = !t.unlocked;
        btn.title = t.unlocked
          ? `Equipar estela ${t.name}`
          : `Estela ${t.name}: complétala en Desafíos Diarios para desbloquear hoy`;

        const swatch = document.createElement('span');
        swatch.className = 'trail-swatch';
        swatch.setAttribute('aria-hidden', 'true');
        swatch.style.background = t.shipAccent;
        swatch.style.boxShadow = `0 0 8px ${t.shipAccent}`;

        const label = document.createElement('span');
        label.textContent = t.unlocked ? t.name : `${t.name} (Bloq.)`;

        btn.appendChild(swatch);
        btn.appendChild(label);
        container.appendChild(btn);
      }
    }

    /** Sincroniza el estado del DOM (body[data-state], marcador, nivel, desafíos, estelas y Bitácora) */
    _sincronizarUI() {
      if (typeof document === 'undefined') return;
      document.body.dataset.state = this.state;
      const cfgDiff = DIFICULTADES[this.difficulty] || DIFICULTADES.normal;

      if (this._ui.titleBest) {
        this._ui.titleBest.textContent = String(this.highScore);
      }
      if (this._ui.diffButtons) {
        this._ui.diffButtons.forEach((btn) => {
          const active = btn.getAttribute('data-difficulty') === this.difficulty;
          btn.classList.toggle('is-active', active);
          btn.setAttribute('aria-pressed', String(active));
        });
      }
      if (this.state === 'title') {
        this._renderTrailSelector(this._ui.titleTrailSelector);
      }
      if (this._ui.hudLevel) {
        this._ui.hudLevel.textContent = String(this.level);
      }
      if (this._ui.hudDifficulty) {
        this._ui.hudDifficulty.textContent = cfgDiff.label;
      }
      if (this._ui.hudScore) {
        this._ui.hudScore.textContent = String(this.score);
      }
      if (this._ui.hudCombo) {
        const activo = this.combo > 1 && this.state === 'playing';
        this._ui.hudCombo.classList.toggle('is-active', activo);
        this._ui.hudCombo.textContent = `COMBO x${this.combo}`;
      }
      if (this._ui.pauseScore) {
        this._ui.pauseScore.textContent = String(this.score);
      }
      if (this._ui.gameoverScore) {
        this._ui.gameoverScore.textContent = String(this.score);
      }
      if (this._ui.gameoverBest) {
        this._ui.gameoverBest.textContent = String(this.highScore);
      }
      if (this._ui.gameoverNewRecord) {
        const mostrar = this.isNewRecord && this.score > 0;
        this._ui.gameoverNewRecord.classList.toggle('is-visible', mostrar);
      }
      if (this._ui.gameoverDetails) {
        this._ui.gameoverDetails.textContent = `Nivel: ${this.level} (${cfgDiff.label}) · Planetas: ${this.planetsReached} · Mejor combo: x${this.maxCombo}`;
      }

      if (this.state === 'gameover') {
        // Renderizar Desafíos Diarios y selector de estela activa en Game Over
        const challenges = this.dailyState ? this.dailyState.challenges : [];
        const completados = challenges.filter((c) => c.completed).length;
        if (this._ui.dailyChallengesCount) {
          this._ui.dailyChallengesCount.textContent = `${completados}/${challenges.length} hoy`;
        }
        if (this._ui.dailyChallengesList) {
          this._ui.dailyChallengesList.textContent = '';
          for (let i = 0; i < challenges.length; i++) {
            const ch = challenges[i];
            const li = document.createElement('li');
            li.className = 'daily-challenge-item';
            if (ch.completed) li.classList.add('is-completed');

            const top = document.createElement('div');
            top.className = 'daily-challenge-top';
            const name = document.createElement('span');
            name.className = 'daily-challenge-name';
            name.textContent = ch.title;
            const reward = document.createElement('span');
            reward.className = 'daily-challenge-reward';
            reward.textContent = ch.completed ? `${ch.rewardLabel} ✓` : ch.rewardLabel;
            top.appendChild(name);
            top.appendChild(reward);

            const sub = document.createElement('div');
            sub.className = 'daily-challenge-sub';
            const desc = document.createElement('span');
            desc.className = 'daily-challenge-desc';
            desc.textContent = ch.desc;
            const progTxt = document.createElement('span');
            progTxt.className = 'daily-challenge-progress-text tabular';
            progTxt.textContent = `${Math.min(ch.progress || 0, ch.target)}/${ch.target}`;
            sub.appendChild(desc);
            sub.appendChild(progTxt);

            const track = document.createElement('div');
            track.className = 'daily-progress-track';
            const fill = document.createElement('div');
            fill.className = 'daily-progress-fill';
            const pct = clamp(((ch.progress || 0) / ch.target) * 100, 0, 100);
            fill.style.width = `${pct}%`;
            track.appendChild(fill);

            li.appendChild(top);
            li.appendChild(sub);
            li.appendChild(track);
            this._ui.dailyChallengesList.appendChild(li);
          }
        }
        this._renderTrailSelector(this._ui.gameoverTrailSelector);
      }

      if (this._ui.flightLogCount) {
        const n = this.flightLog.length;
        this._ui.flightLogCount.textContent = n === 1 ? '1 hito' : `${n} hitos`;
      }
      if (this._ui.flightLogList && this.state === 'gameover') {
        this._ui.flightLogList.textContent = '';
        if (this.flightLog.length === 0) {
          const li = document.createElement('li');
          li.className = 'flight-log-empty';
          li.textContent = 'Sin hitos registrados en este vuelo';
          this._ui.flightLogList.appendChild(li);
        } else {
          for (let i = 0; i < this.flightLog.length; i++) {
            const hito = this.flightLog[i];
            const li = document.createElement('li');
            li.className = 'flight-log-item';

            const main = document.createElement('span');
            main.className = 'flight-log-item-main';
            const mark = document.createElement('span');
            mark.className = 'flight-log-mark';
            mark.setAttribute('aria-hidden', 'true');
            const label = document.createElement('span');
            label.textContent = hito.title;
            main.appendChild(mark);
            main.appendChild(label);

            li.appendChild(main);
            if (hito.meta) {
              const meta = document.createElement('span');
              meta.className = 'flight-log-item-meta';
              meta.textContent = hito.meta;
              li.appendChild(meta);
            }
            this._ui.flightLogList.appendChild(li);
          }
        }
      }
      if (this._ui.btnMute) {
        this._ui.btnMute.classList.toggle('is-muted', this.audio.muted);
        this._ui.btnMute.setAttribute('aria-pressed', String(this.audio.muted));
        this._ui.btnMute.setAttribute(
          'aria-label',
          this.audio.muted ? 'Activar sonido' : 'Silenciar sonido'
        );
      }
    }

    /** Dibuja el fondo espacial synthwave, nebulosas y 3 capas de estrellas */
    _dibujarFondo(ctx) {
      // Fondo degradado azul marino oscuro hacia violeta
      const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
      bgGrad.addColorStop(0, '#0a0a1f');
      bgGrad.addColorStop(0.55, '#0e0b29');
      bgGrad.addColorStop(1, '#1a0a36');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Nebulosas difusas en movimiento lento
      for (let i = 0; i < this.nebulas.length; i++) {
        const neb = this.nebulas[i];
        const nx =
          neb.rx * this.width +
          Math.sin(this.elapsedTime * 0.18 + neb.phase) * neb.driftX -
          ((this.camera.x * 0.04) % this.width);
        const ny =
          ((neb.ry * this.height - this.camera.y * 0.03 + Math.cos(this.elapsedTime * 0.14 + neb.phase) * neb.driftY) %
            (this.height * 1.3) +
            this.height * 1.3) %
            (this.height * 1.3) -
          this.height * 0.15;
        const r = Math.max(this.width, this.height) * neb.radiusFactor;

        if (neb.sprite) {
          ctx.drawImage(neb.sprite, nx - r, ny - r, r * 2, r * 2);
        } else {
          const radGrad = ctx.createRadialGradient(nx, ny, r * 0.05, nx, ny, r);
          radGrad.addColorStop(0, neb.color);
          radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = radGrad;
          ctx.fillRect(0, 0, this.width, this.height);
        }
      }

      // Tres capas de estrellas con parallax y parpadeo suave
      for (let l = 0; l < this.bgStarLayers.length; l++) {
        const layer = this.bgStarLayers[l];
        const offsetX = this.camera.x * layer.speed;
        const offsetY = this.camera.y * layer.speed;

        for (let i = 0; i < layer.items.length; i++) {
          const st = layer.items[i];
          const sx = (((st.rx * this.width - offsetX) % this.width) + this.width) % this.width;
          const sy = (((st.ry * this.height - offsetY) % this.height) + this.height) % this.height;
          const twinkle = 0.65 + 0.35 * Math.sin(this.elapsedTime * st.twinkleSpeed + st.twinklePhase);

          ctx.globalAlpha = st.baseAlpha * twinkle;
          ctx.fillStyle = st.tint;
          ctx.beginPath();
          ctx.arc(sx, sy, st.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    /** Dibuja las fuentes luminosas en el Bloom Buffer reducido */
    _renderBloomBuffer() {
      if (!this.bloomCtx || !this.bloomCanvas) return;
      const bctx = this.bloomCtx;
      bctx.clearRect(0, 0, this.width, this.height);

      bctx.save();
      bctx.translate(
        this.width * 0.5 + this.camera.shakeOffsetX,
        this.height * 0.5 + this.camera.shakeOffsetY
      );
      bctx.scale(this.camera.zoom, this.camera.zoom);
      bctx.translate(-this.camera.x, -this.camera.y);

      // Emisión de planetas neón
      for (let i = 0; i < this.planets.length; i++) {
        const p = this.planets[i];
        if (Math.abs(p.y - this.camera.y) < this.height * 0.95) {
          bctx.fillStyle = p.palette.glow;
          bctx.beginPath();
          bctx.arc(p.x, p.y, p.radius * 1.55, 0, Math.PI * 2);
          bctx.fill();
        }
      }

      // Emisión de estrellas doradas
      bctx.fillStyle = 'rgba(255, 230, 0, 0.45)';
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        if (!s.collected) {
          bctx.beginPath();
          bctx.arc(s.x, s.y, s.radius * 1.7, 0, Math.PI * 2);
          bctx.fill();
        }
      }

      // Emisión de la nave
      if (this.player.state !== 'dead') {
        const trail = this.getActiveTrail();
        bctx.fillStyle = trail.bloomColor;
        bctx.beginPath();
        bctx.arc(this.player.x, this.player.y, 18, 0, Math.PI * 2);
        bctx.fill();
      }

      bctx.restore();
    }

    /** Renderizado completo con Doble Buffering y Bloom Buffer aditivo */
    render() {
      if (!this.ctx) return;
      const ctx = this.backBufferCtx || this.ctx;

      if (!this.backBufferCtx) {
        ctx.save();
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      }

      // 1. Fondo espacial y parallax
      this._dibujarFondo(ctx);

      // 2. Transformación de cámara (centrada en el viewport + zoom + sacudida)
      ctx.save();
      ctx.translate(
        this.width * 0.5 + this.camera.shakeOffsetX,
        this.height * 0.5 + this.camera.shakeOffsetY
      );
      ctx.scale(this.camera.zoom, this.camera.zoom);
      ctx.translate(-this.camera.x, -this.camera.y);

      // 3. Partículas (estelas y explosiones)
      for (let i = 0; i < this.particlePool.length; i++) {
        this.particlePool[i].draw(ctx);
      }

      // 4. Planetas y anillos de captura
      const comboProgress =
        this.state === 'playing' &&
        this.player.state === 'orbiting' &&
        this.player.planet &&
        this.player.planet.visited
          ? clamp(1 - this.player.timeInOrbit / 1.0, 0, 1)
          : 0;

      for (let i = 0; i < this.planets.length; i++) {
        const p = this.planets[i];
        if (Math.abs(p.y - this.camera.y) < this.height * 0.95) {
          const esActual = this.player.state === 'orbiting' && this.player.planet === p;
          p.draw(ctx, esActual, esActual ? comboProgress : 0);
        }
      }

      // 5. Estrellas coleccionables
      for (let i = 0; i < this.stars.length; i++) {
        this.stars[i].draw(ctx);
      }

      // 6. Asteroides
      for (let i = 0; i < this.asteroids.length; i++) {
        this.asteroids[i].draw(ctx);
      }

      // 7. Nave del jugador con la estela cosmética activa
      this.player.draw(ctx, this.getActiveTrail());

      // 8. Textos flotantes de puntos, nivel y combo
      for (let i = 0; i < this.floatingTexts.length; i++) {
        const ft = this.floatingTexts[i];
        const alpha = clamp(ft.life / ft.maxLife, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `800 ${Math.round(17 * ft.scale)}px Orbitron, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(10, 10, 31, 0.85)';
        ctx.lineWidth = 4;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      ctx.restore();

      // 9. Composición del Bloom Buffer sobre el Back Buffer
      if (this.bloomCanvas && this.bloomCtx) {
        this._renderBloomBuffer();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.4;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.bloomCanvas, 0, 0, this.width, this.height);
        ctx.restore();
      }

      // 10. Volcado atómico del Back Buffer al canvas visible (Doble Buffering)
      if (this.backBufferCanvas && this.backBufferCtx) {
        this.ctx.drawImage(
          this.backBufferCanvas,
          0,
          0,
          this.canvas.width,
          this.canvas.height
        );
      } else {
        ctx.restore();
      }
    }

    /** Inicia el bucle principal con requestAnimationFrame */
    startLoop() {
      if (this._rafId !== null) return;
      this._lastTimestamp = performance.now();

      const tick = (now) => {
        const rawDt = (now - this._lastTimestamp) / 1000;
        this._lastTimestamp = now;

        if (this.state === 'paused') {
          if (this._needsStaticRender) {
            this.render();
            this._needsStaticRender = false;
          }
        } else if (this.state === 'gameover') {
          const hasEffects =
            this.floatingTexts.length > 0 ||
            this.camera.shakeTime > 0 ||
            this.particlePool.some((p) => p.active);
          if (hasEffects || this._needsStaticRender) {
            this.update(rawDt);
            this.render();
            this._needsStaticRender = false;
          }
        } else {
          this.update(rawDt);
          this.render();
        }
        this._rafId = requestAnimationFrame(tick);
      };

      this._rafId = requestAnimationFrame(tick);
    }
  }

  // Exportación segura para pruebas unitarias en Node sin afectar al navegador
  if (typeof globalThis !== 'undefined') {
    globalThis.OrbitaClasses = {
      Game,
      Player,
      Planet,
      Star,
      Asteroid,
      Particle,
      Camera,
      AudioManager,
      SpatialGrid,
      DIFICULTADES,
      PALETA_NEON,
      ESTELAS_COSMETICAS,
      obtenerFechaLocal,
      generarDesafiosDelDia
    };
  }

  // Arranque automático en el navegador cuando existe el DOM y el lienzo
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      const canvas = document.getElementById('game-canvas');
      if (!canvas) return;
      const game = new Game({ canvas });
      window.orbitaGame = game;
      game.startLoop();
    });
  }
})();
