/*
  REGULAMINA — VERSIÓN EXTRAVAGANTE
  Pega este archivo en el editor p5.js. Es una visualización artística,
  no un medidor ni un regulador médico.
*/

let app, simulation, holoParticles = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  app = new Regulamina();
  simulation = new NeuralSimulation();
  initParticles();
}

function draw() {
  app.update();
  drawHologramScene();
  app.display();
}

function rgba(c, a) {
  return `rgba(${floor(c[0])},${floor(c[1])},${floor(c[2])},${a})`;
}

function stk(c, a) { stroke(c[0], c[1], c[2], a); }
function fl(c, a) { fill(c[0], c[1], c[2], a); }

// Perfil continuo de actividad: todos los rasgos de movimiento nacen del mismo valor.
// En 0% el tiempo, la amplitud, el ruido y el brillo quedan casi apagados; en 100% llegan a su máximo.
function activityProfile(level) {
  let raw = constrain(level / 100, 0, 1);
  let t = raw * raw * (3 - 2 * raw); // smoothstep: no saltos bruscos
  return {
    t,
    amplitude: lerp(0.025, 1, t),
    frequency: lerp(0.00015, 1, t),
    speed: lerp(0.00008, 1, t),
    noise: lerp(0, 1, t),
    glow: lerp(0.05, 1, t)
  };
}

class Regulamina {
  constructor() {
    this.mode = "MAIN";
    this.selected = 0;
    this.keyNav = false;
    this.holdFrames = 0;
    this.tint = [80, 225, 255];
    this.flicker = 1;
    this.modules = [
      { title: "CONTROLAR DOPAMINA", short: "DOPAMINA", color: [255, 55, 196], type: "DOPAMINE" },
      { title: "IMPULSOS ELÉCTRICOS", short: "IMPULSOS", color: [45, 225, 255], type: "ELECTRICAL" },
      { title: "MODULAR CORTISOL", short: "CORTISOL", color: [255, 174, 35], type: "CORTISOL" },
      { title: "EQUILIBRAR SEROTONINA", short: "SEROTONINA", color: [154, 105, 255], type: "SEROTONIN" }
    ];
    this.updateLayout();
  }

  updateLayout() {
    this.panelX = width * 0.05;
    this.panelY = height * 0.055;
    this.panelW = width * 0.90;
    this.panelH = height * 0.63;
  }

  menuRadius() { return min(this.panelW, this.panelH) * 0.28; }

  update() {
    this.updateLayout();
    let target = this.mode === "MODULE" ? this.modules[this.selected].color : [80, 225, 255];
    for (let i = 0; i < 3; i++) this.tint[i] = lerp(this.tint[i], target[i], 0.08);
    this.flicker = 0.9 + noise(frameCount * 0.2) * 0.1;
    if (this.mode === "MODULE") {
      this.handleHeldKeys();
      simulation.update(this.modules[this.selected].type);
    }
  }

  handleHeldKeys() {
    let dir = (keyIsDown(RIGHT_ARROW) || keyIsDown(UP_ARROW) ? 1 : 0) -
      (keyIsDown(LEFT_ARROW) || keyIsDown(DOWN_ARROW) ? 1 : 0);
    this.holdFrames = dir ? this.holdFrames + 1 : 0;
    if (this.holdFrames > 12) simulation.setLevel(simulation.target + dir);
  }

  display() {
    let t = this.tint;
    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(this.panelX + 2, this.panelY + 2, this.panelW - 4, this.panelH - 4);
    drawingContext.clip();
    drawingContext.globalAlpha = this.flicker;
    drawScreenBackground(this.panelX, this.panelY, this.panelW, this.panelH, t);
    this.mode === "MAIN" ? this.drawMain() : this.drawModule();
    drawScanlines(this.panelX, this.panelY, this.panelW, this.panelH, t);
    drawingContext.restore();
    pop();
    drawHoloBrackets(this.panelX, this.panelY, this.panelW, this.panelH, t);
  }

  drawMain() {
    let cx = this.panelX + this.panelW / 2, cy = this.panelY + this.panelH / 2;
    noStroke(); textAlign(LEFT, CENTER); fill(100, 230, 255); textSize(22);
    text("REGULAMINA", this.panelX + 32, this.panelY + 34);
    fill(90, 155, 185); textSize(8); text("NEURAL REGULATION SYSTEM · VISUAL LAB", this.panelX + 34, this.panelY + 53);
    textAlign(RIGHT); fill(80, 255, 190); text("● HOLO-LINK ONLINE", this.panelX + this.panelW - 32, this.panelY + 34);
    drawCore(cx, cy, 54, [80, 225, 255]);
    let radius = this.menuRadius();
    for (let i = 0; i < this.modules.length; i++) {
      let angle = -HALF_PI + i * HALF_PI;
      let x = cx + cos(angle) * radius, y = cy + sin(angle) * radius;
      drawModuleConnection(cx, cy, x, y, this.modules[i].color, i);
      drawMainModule(x, y, this.modules[i], i);
    }
    textAlign(CENTER); fill(110, 170, 190); textSize(8);
    text("SELECT A NEURAL VISUALIZATION MODULE", cx, this.panelY + this.panelH - 20);
  }

  drawModule() {
    let module = this.modules[this.selected], c = module.color;
    noStroke(); textAlign(LEFT, CENTER); fill(c); textSize(19); text("REGULAMINA", this.panelX + 30, this.panelY + 31);
    fill(220, 242, 250); textSize(12); text(module.title, this.panelX + 30, this.panelY + 54);
    fill(100, 170, 190); textSize(7); text(getModuleDescription(module.type), this.panelX + 30, this.panelY + 72);
    textAlign(RIGHT); fill(80, 150, 175); text("← → INTENSITY    1–4 MODULE    ESC RETURN", this.panelX + this.panelW - 30, this.panelY + 72);
    let sx = this.panelX + 25, sy = this.panelY + 88, sw = this.panelW * 0.65, sh = this.panelH - 135;
    simulation.display(sx, sy, sw, sh, c, module.type);
    // El panel ocupa toda la altura útil; evita recortar controles en pantallas bajas.
    this.drawControls(this.panelX + this.panelW * 0.71, this.panelY + 95, this.panelW * 0.23, this.panelH - 95, c, module.type);
    textAlign(LEFT); fill(100, 195, 225); textSize(8); text("ESC  ←  RETURN TO NEURAL CORE", this.panelX + 30, this.panelY + this.panelH - 19);
  }

  drawControls(x, y, w, h, c, type) {
    fill(3, 20, 32, 150); stroke(c[0], c[1], c[2], 120); rect(x, y, w, h, 6);
    noStroke(); fill(c); textAlign(LEFT); textSize(9); text("VISUAL INTENSITY", x + 17, y + 18);
    fill(120, 180, 200); textSize(6); text("ARTISTIC NEURAL STATE", x + 17, y + 31);
    fill(200, 235, 242); textSize(7); text("ACTIVITY", x + 17, y + 49);
    textAlign(RIGHT); fill(c); textSize(16); text(`${nf(simulation.level, 2, 0)}%`, x + w - 17, y + 51);
    let sx = x + 20, sy = y + 72, sw = w - 40, active = sw * simulation.level / 100;
    stroke(45, 75, 92); strokeWeight(3); line(sx, sy, sx + sw, sy);
    stroke(c[0], c[1], c[2], 220); strokeWeight(4); line(sx, sy, sx + active, sy);
    noStroke(); fl(c, 45); circle(sx + active, sy, 26); fill(c); circle(sx + active, sy, 11);
    fill(110, 165, 185); textAlign(LEFT); textSize(6); text("LOW", sx, sy + 13); textAlign(RIGHT); text("HIGH", sx + sw, sy + 13);
    let state = getState(simulation.level, type);
    fill(150, 210, 225); textAlign(LEFT); textSize(7); text("STATE", x + 17, y + 103);
    fill(c); textSize(10); text(state, x + 17, y + 119);
    drawMetrics(x + 17, y + 128, w - 34, c, type, 27);
  }
}

function getModuleDescription(type) {
  let descriptions = {
    DOPAMINE: "REWARD SIGNAL / ORBITAL PULSES / AMPLIFICATION",
    ELECTRICAL: "NEURAL SIGNAL PROPAGATION / VOLTAGE CASCADES",
    CORTISOL: "CORTISOL RHYTHM / RELEASE WAVES / SETTLING FIELD",
    SEROTONIN: "SEROTONIN BALANCE / HARMONIC FLOW / CALM PATTERNS"
  };
  return descriptions[type];
}

function getState(level, type) {
  if (type === "DOPAMINE") return level > 75 ? "PEAK RESPONSE" : level > 45 ? "REWARD FLOW" : "QUIET SIGNAL";
  if (type === "ELECTRICAL") return level > 75 ? "VOLTAGE SURGE" : level > 45 ? "SIGNAL FLOW" : "LOW CURRENT";
  if (type === "CORTISOL") return level > 75 ? "RELEASE WAVE" : level > 45 ? "MODULATING" : "SETTLED RHYTHM";
  return level > 75 ? "RADIANT BALANCE" : level > 45 ? "HARMONIZING" : "QUIET FLOW";
}

class NeuralSimulation {
  constructor() {
    this.level = 75; this.target = 75; this.neurons = []; this.connections = [];
    this.metricValues = { DOPAMINE: [84, 72, 68], ELECTRICAL: [90, 83, 76], CORTISOL: [74, 64, 56], SEROTONIN: [88, 78, 69] };
    this.createNetwork();
  }

  createNetwork() {
    this.neurons = []; this.connections = [];
    for (let i = 0; i < 96; i++) this.neurons.push(new SimNeuron(random(25, 975), random(25, 575)));
    for (let i = 0; i < this.neurons.length; i++) for (let j = i + 1; j < this.neurons.length; j++) {
      let a = this.neurons[i], b = this.neurons[j];
      if (dist(a.x, a.y, b.x, b.y) < 125 && random() < 0.34) this.connections.push(new NeuralConnection(a, b));
    }
  }

  update(type) {
    this.level = lerp(this.level, this.target, 0.07);
    for (let n of this.neurons) n.update(this.level / 100, type);
    for (let c of this.connections) c.update(this.level / 100);
  }
  setLevel(value) { this.target = constrain(value, 0, 100); }
  getMetrics(type) { return this.metricValues[type]; }
  setMetric(type, index, value) { this.metricValues[type][index] = constrain(value, 0, 100); }

  display(x, y, w, h, c, type) {
    push(); noFill(); stroke(c[0], c[1], c[2], 125); strokeWeight(1); rect(x, y, w, h, 6);
    drawingContext.save(); drawingContext.beginPath(); drawingContext.rect(x, y, w, h); drawingContext.clip();
    if (type === "DOPAMINE") this.drawDopamine(x, y, w, h, c);
    if (type === "ELECTRICAL") this.drawElectrical(x, y, w, h, c);
    if (type === "CORTISOL") this.drawCortisol(x, y, w, h, c);
    if (type === "SEROTONIN") this.drawSerotonin(x, y, w, h, c);
    drawActivationState(x, y, w, h, c, this.level);
    drawingContext.restore(); pop();
  }

  glowDot(x, y, size, c, alpha = 220) {
    noStroke(); fl(c, alpha * 0.10); circle(x, y, size * 5); fl(c, alpha * 0.28); circle(x, y, size * 2.4); fl(c, alpha); circle(x, y, size);
  }

  drawDopamine(x, y, w, h, c) {
    let cx = x + w / 2, cy = y + h / 2, power = this.level / 100;
    let motion = activityProfile(this.level);
    let [signal, response, pulse] = this.getMetrics("DOPAMINE").map(v => v / 100);
    let active = pow(power, 1.7) * signal * motion.amplitude;
    // 0% = núcleo casi dormido; 100% = una constelación expansiva y agresiva.
    noFill();
    let ringCount = floor(1 + active * 11);
    for (let ring = 0; ring < ringCount; ring++) {
      let r = 30 + ring * 34 + sin(frameCount * .08 * motion.speed + ring) * (active * 17);
      stroke(c[0], c[1], c[2], (18 + active * 195 - ring * 10) * motion.glow); strokeWeight(ring % 3 === 0 ? 1 + active * 3 : 1);
      push(); translate(cx, cy); rotate(frameCount * .05 * motion.speed * (ring % 2 ? -1 : 1) + ring); arc(0, 0, r * 2, r * 0.72, 0.15, PI * 1.6); pop();
    }
    let armCount = floor(active * 20);
    for (let arm = 0; arm < armCount; arm++) {
      let angle = arm * TWO_PI / armCount + frameCount * (.002 + active * .04) * motion.speed;
      let tip = 35 + active * 265 + sin(frameCount * (.01 + pulse * .12) * motion.speed + arm * 2) * active * motion.noise * 36;
      stroke(c[0], c[1], c[2], (65 + active * 180) * motion.glow); strokeWeight(1 + active * 3);
      line(cx + cos(angle) * 28, cy + sin(angle) * 28, cx + cos(angle) * tip, cy + sin(angle) * tip);
      this.glowDot(cx + cos(angle) * tip, cy + sin(angle) * tip, 2 + active * 7, c, (60 + active * 190) * motion.glow);
    }
    let dotCount = floor(3 + active * response * 57);
    for (let i = 0; i < dotCount; i++) {
      let a = i * 2.399 + frameCount * .03 * motion.speed, r = 25 + (i / 42) * min(w, h) * .43;
      this.glowDot(cx + cos(a) * r, cy + sin(a) * r, 1 + active * 4 + (i % 3), c, (20 + active * 220) * motion.glow);
    }
    drawCore(cx, cy, 10 + active * 46 + sin(frameCount * .12 * motion.speed) * active * motion.amplitude * 7, c, motion.glow);
    label("REWARD CONSTELLATION", x, y, c);
  }

  drawElectrical(x, y, w, h, c) {
    let power = this.level / 100;
    let motion = activityProfile(this.level);
    let [frequency, propagation, voltage] = this.getMetrics("ELECTRICAL").map(v => v / 100);
    // A 0% solo quedan tres conductos apagados; a 100% toda la red descarga.
    if (power < .06) {
      for (let lane = 0; lane < 3; lane++) {
        let yy = y + h * (.35 + lane * .15);
        stroke(c[0], c[1], c[2], 35); strokeWeight(1); line(x + 40, yy, x + w - 40, yy);
        this.glowDot(x + w * (.2 + lane * .28), yy, 1, c, 10);
      }
      label("STANDBY CONDUITS", x, y, c);
      return;
    }
    let connectionCount = floor(this.connections.length * pow(power * propagation, .55));
    for (let ci = 0; ci < connectionCount; ci++) {
      let c0 = this.connections[ci];
      let ax = x + c0.a.x / 1000 * w, ay = y + c0.a.y / 600 * h;
      let bx = x + c0.b.x / 1000 * w, by = y + c0.b.y / 600 * h;
      stroke(c[0], c[1], c[2], (45 + power * 115) * motion.glow); strokeWeight(power > .65 ? 2 : 1);
      beginShape();
      for (let k = 0; k <= 7; k++) {
        let t = k / 7, px = lerp(ax, bx, t), py = lerp(ay, by, t);
        let zig = (k === 0 || k === 7) ? 0 : sin(frameCount * (.03 + frequency * .25) * motion.frequency + k * 2 + c0.phase * 20) * (1 + power * voltage * 27) * motion.amplitude;
        vertex(px, py + zig);
      }
      endShape();
      for (let trail = 0; trail < floor(1 + power * 5); trail++) {
        let t = (c0.phase + frameCount * c0.speed * (1 + power * frequency * 22) * motion.speed - trail * .10 + 1) % 1;
        this.glowDot(lerp(ax, bx, t), lerp(ay, by, t), 3 + power * 3 - trail, c, (240 - trail * 65) * motion.glow);
      }
    }
    let gy = y + h - 52;
    noFill(); stroke(c[0], c[1], c[2], (60 + power * 195) * motion.glow); strokeWeight(1 + power * 3); beginShape();
    for (let px = x; px < x + w; px += 4) {
      let t = (px - x) / w;
      let spike = pow(sin(t * 20 + frameCount * .18 * frequency * motion.speed), 11) * 92 * power * voltage * motion.noise;
      vertex(px, gy + sin(t * 44 * motion.frequency + frameCount * .16 * frequency * motion.speed) * (1 + power * voltage * 30) * motion.amplitude - spike);
    }
    endShape(); label("VOLTAGE CASCADE", x, y, c);
  }

  drawCortisol(x, y, w, h, c) {
    let cx = x + w / 2, cy = y + h / 2, intensity = this.level / 100;
    let motion = activityProfile(this.level);
    let [rhythm, release, settling] = this.getMetrics("CORTISOL").map(v => v / 100);
    // 0% es una única respiración elíptica; 100% libera halos y rayos fragmentados.
    noFill();
    let ringCount = floor(1 + intensity * rhythm * 14);
    for (let ring = 0; ring < ringCount; ring++) {
      let radius = 30 + ((frameCount * (0.3 + rhythm * (1 + intensity * 2.7)) * motion.speed + ring * 35) % 390);
      stroke(c[0], c[1], c[2], (20 + intensity * 175) * map(radius, 30, 420, 1, .05) * motion.glow); strokeWeight(ring % 2 ? 1 : 1 + intensity * 3);
      beginShape();
      for (let a = 0; a <= TWO_PI + .08; a += .16) {
        let jag = sin(a * 9 + frameCount * .08 * motion.frequency + ring) * (2 + intensity * release * 24) * motion.amplitude * (1 - settling * .55);
        vertex(cx + cos(a) * (radius + jag), cy + sin(a) * (radius * .58 + jag));
      }
      endShape(CLOSE);
    }
    let rayCount = floor(intensity * release * 26);
    for (let ray = 0; ray < rayCount; ray++) {
      let a = ray * TWO_PI / rayCount - frameCount * .014 * motion.speed, inner = 35 + sin(frameCount * .08 * motion.frequency + ray) * 10 * motion.amplitude;
      let outer = 90 + intensity * 260 + sin(frameCount * .06 * motion.frequency + ray * 4) * 35 * motion.noise;
      stroke(c[0], c[1], c[2], (85 + intensity * 100) * motion.glow); strokeWeight(ray % 3 === 0 ? 3 : 1);
      line(cx + cos(a) * inner, cy + sin(a) * inner, cx + cos(a) * outer, cy + sin(a) * outer);
      this.glowDot(cx + cos(a) * outer, cy + sin(a) * outer, 3 + intensity * 4, c, 220 * motion.glow);
    }
    let neuronCount = floor(this.neurons.length * intensity * (1 - settling * .35));
    for (let ni = 0; ni < neuronCount; ni++) {
      let n = this.neurons[ni];
      let nx = x + n.x / 1000 * w, ny = y + n.y / 600 * h;
      this.glowDot(nx, ny, 2 + intensity * 4, c, (105 + intensity * 130) * motion.glow);
    }
    drawCore(cx, cy, 8 + intensity * 38, c, motion.glow); label(intensity < .06 ? "SETTLED RHYTHM" : "RELEASE WAVE → SETTLING FIELD", x, y, c);
  }

  drawSerotonin(x, y, w, h, c) {
    let cx = x + w / 2, cy = y + h / 2, balance = this.level / 100;
    let motion = activityProfile(this.level);
    let [balanceControl, harmony, flow] = this.getMetrics("SEROTONIN").map(v => v / 100);
    // 0% solo dibuja un hilo sereno; 100% forma una flor de cintas y órbitas.
    let bandCount = floor(1 + balance * balanceControl * 10);
    for (let band = 0; band < bandCount; band++) {
      noFill(); stroke(c[0], c[1], c[2], (28 + balance * (80 + band * 13)) * motion.glow); strokeWeight(1 + balance * (band % 3 === 0 ? 3 : 1));
      beginShape();
      for (let px = x - 20; px < x + w + 20; px += 7) {
        let t = (px - x) / w, phase = frameCount * (.006 + flow * .08) * motion.speed + band * .82;
        let wave = sin(t * TWO_PI * (1.2 + band * .22) * motion.frequency + phase) * (1 + balance * harmony * 60) * motion.amplitude;
        let weave = cos(t * TWO_PI * 3 * motion.frequency - phase) * balance * harmony * (8 + band * 2) * motion.noise;
        vertex(px, cy + (band - 4) * 16 + wave + weave);
      }
      endShape();
    }
    noFill();
    let petalCount = floor(balance * harmony * 16);
    for (let petal = 0; petal < petalCount; petal++) {
      let a = petal * TWO_PI / petalCount + frameCount * (.003 + flow * .025) * motion.speed, reach = 35 + balance * harmony * 180;
      stroke(c[0], c[1], c[2], (35 + balance * 175) * motion.glow); strokeWeight(1 + balance * 2);
      arc(cx + cos(a) * reach * .42, cy + sin(a) * reach * .42, reach, reach * .42, a - 1.2, a + 1.2);
      this.glowDot(cx + cos(a) * reach, cy + sin(a) * reach, 3 + balance * 4, c, 220 * motion.glow);
    }
    let orbitCount = floor(balance * flow * 6);
    for (let orbit = 0; orbit < orbitCount; orbit++) {
      push(); translate(cx, cy); rotate(frameCount * .025 * motion.speed * (orbit % 2 ? -1 : 1) + orbit);
      stroke(c[0], c[1], c[2], 95 * motion.glow); strokeWeight(2); ellipse(0, 0, 125 + orbit * 58, 45 + orbit * 25); pop();
    }
    drawCore(cx, cy, 8 + balance * 39 + sin(frameCount * .08 * motion.speed) * balance * motion.amplitude * 6, c, motion.glow); label(balance < .06 ? "QUIET FLOW" : "HARMONIC CALM PATTERN", x, y, c);
  }
}

function label(textValue, x, y, c) {
  noStroke(); fill(c); textAlign(LEFT); textSize(8); text(textValue, x + 15, y + 20);
}

// Señal de estado deliberadamente obvia para que los extremos sean inequívocos.
function drawActivationState(x, y, w, h, c, level) {
  let low = level <= 10, high = level >= 90;
  if (!low && !high) return;

  let labelText = low ? "REPOSO · 0%" : "ACTIVACIÓN MÁXIMA · 100%";
  let labelColor = low ? [120, 145, 158] : c;
  let boxW = high ? 250 : 150;
  let boxX = x + w - boxW - 18, boxY = y + 18;

  noStroke();
  fill(2, 10, 18, 205); rect(boxX, boxY, boxW, 42, 3);
  stroke(labelColor[0], labelColor[1], labelColor[2], high ? 245 : 90);
  strokeWeight(high ? 3 : 1); noFill(); rect(boxX, boxY, boxW, 42, 3);
  noStroke(); fill(labelColor); textAlign(CENTER, CENTER); textSize(high ? 13 : 10);
  text(labelText, boxX + boxW / 2, boxY + 21);

  if (high) {
    noFill();
    for (let i = 0; i < 4; i++) {
      stroke(c[0], c[1], c[2], 145 - i * 25); strokeWeight(2);
      rect(x + 8 + i * 5, y + 8 + i * 5, w - 16 - i * 10, h - 16 - i * 10, 5);
    }
  }
}

class SimNeuron {
  constructor(x, y) { this.x = x; this.y = y; this.baseX = x; this.baseY = y; this.phase = random(TWO_PI); }
  update(activity, type) {
    let amp = type === "CORTISOL" ? 22 + activity * 66 : type === "SEROTONIN" ? 9 + activity * 28 : 8 + activity * 40;
    let speed = type === "ELECTRICAL" ? .07 : .027;
    this.x = lerp(this.x, this.baseX + sin(frameCount * speed + this.phase) * amp, .08);
    this.y = lerp(this.y, this.baseY + cos(frameCount * speed * 1.3 + this.phase) * amp, .08);
  }
}

class NeuralConnection {
  constructor(a, b) { this.a = a; this.b = b; this.phase = random(); this.speed = random(.004, .012); }
  update(activity) { this.phase = (this.phase + this.speed * (.3 + activity * 2)) % 1; }
}

function drawCore(x, y, radius, c, intensity = 1) {
  push(); translate(x, y); noStroke();
  for (let r = radius * 4; r > radius; r -= 9) { fl(c, map(r, radius, radius * 4, 38, 1) * intensity); circle(0, 0, r); }
  noFill(); stroke(c[0], c[1], c[2], 190 * intensity); strokeWeight(2); circle(0, 0, radius * 2);
  push(); rotate(frameCount * .018); arc(0, 0, radius * 3, radius * 3, 0, PI * 1.25); rotate(-frameCount * .031); arc(0, 0, radius * 2.25, radius * 2.25, PI, TWO_PI * .9); pop();
  noStroke(); fl(c, 255 * intensity); circle(0, 0, radius * .58); fill(242, 255, 255, 255 * intensity); circle(0, 0, radius * .18); pop();
}

function drawMainModule(x, y, module, index) {
  let c = module.color, hover = dist(mouseX, mouseY, x, y) < 52 || (app.keyNav && index === app.selected);
  push(); translate(x, y); noStroke(); fl(c, hover ? 82 : 28); circle(0, 0, hover ? 122 : 90);
  noFill(); stroke(c[0], c[1], c[2], hover ? 255 : 150); strokeWeight(hover ? 3 : 1); circle(0, 0, hover ? 68 : 58);
  push(); rotate(frameCount * .03 * (index % 2 ? -1 : 1)); arc(0, 0, 85, 85, 0, PI * 1.35); pop();
  fill(c); noStroke(); circle(0, 0, hover ? 17 : 10); textAlign(CENTER, CENTER); textSize(7); text(`0${index + 1}`, 0, -43);
  fill(210, 245, 250); textSize(hover ? 11 : 9); text(module.short, 0, 52); pop();
}

function drawModuleConnection(x1, y1, x2, y2, c, index) {
  noFill(); stroke(c[0], c[1], c[2], 110); strokeWeight(2); beginShape();
  for (let i = 0; i <= 28; i++) { let t = i / 28, sway = sin(t * PI * 6 + frameCount * .06 + index) * 7; vertex(lerp(x1, x2, t) + sway * sin(index + 1), lerp(y1, y2, t) + sway * cos(index + 1)); }
  endShape();
  for (let dot = 0; dot < 3; dot++) { let p = (frameCount * .012 + dot / 3 + index * .12) % 1; noStroke(); fl(c, 230 - dot * 50); circle(lerp(x1, x2, p), lerp(y1, y2, p), 7 - dot); }
}

function drawMetrics(x, y, w, c, type, rowGap = 27) {
  let labels = { DOPAMINE: ["SIGNAL", "RESPONSE", "PULSE"], ELECTRICAL: ["FREQUENCY", "PROPAGATION", "VOLTAGE"], CORTISOL: ["RHYTHM", "RELEASE", "SETTLING"], SEROTONIN: ["BALANCE", "HARMONY", "FLOW"] }[type];
  let values = simulation.getMetrics(type);
  for (let i = 0; i < labels.length; i++) {
    let yy = y + i * rowGap, value = values[i], start = x + 20, end = x + w - 25, knob = lerp(start, end, value / 100);
    noStroke(); fill(130, 190, 205); textAlign(LEFT); textSize(6); text(labels[i], x, yy); textAlign(RIGHT); fill(c); text(`${floor(value)}%`, x + w, yy);
    fill(12, 35, 48); stroke(c[0], c[1], c[2], 150); strokeWeight(1); circle(x + 6, yy + 11, 13); circle(x + w - 7, yy + 11, 13);
    noStroke(); fill(c); textAlign(CENTER, CENTER); textSize(9); text("−", x + 6, yy + 11); text("+", x + w - 7, yy + 11);
    stroke(40, 70, 85); strokeWeight(2); line(start, yy + 11, end, yy + 11); stroke(c[0], c[1], c[2], 220); strokeWeight(3); line(start, yy + 11, knob, yy + 11); noStroke(); fill(c); circle(knob, yy + 11, 8);
  }
}

function drawScreenBackground(x, y, w, h, t) {
  let ctx = drawingContext; noStroke(); fill(2, 12, 22, 155); rect(x, y, w, h);
  let g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, rgba(t, .05)); g.addColorStop(.55, rgba(t, .10)); g.addColorStop(1, rgba(t, .23)); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  stroke(t[0], t[1], t[2], 20); strokeWeight(1); for (let xx = x; xx < x + w; xx += 40) line(xx, y, xx, y + h); for (let yy = y; yy < y + h; yy += 40) line(x, yy, x + w, yy);
}

function drawScanlines(x, y, w, h, t) {
  stroke(t[0], t[1], t[2], 10); for (let yy = y + frameCount % 5; yy < y + h; yy += 5) line(x, yy, x + w, yy);
  let scanY = y + (frameCount * 2.4) % (h + 60) - 30; noStroke(); for (let k = 0; k < 14; k++) { fl(t, 30 - k * 2); rect(x, scanY - k * 3, w, 3); }
}

function drawHoloBrackets(x, y, w, h, t) {
  let L = 36; noFill(); strokeWeight(3); stk(t, 220);
  line(x, y, x + L, y); line(x, y, x, y + L); line(x + w, y, x + w - L, y); line(x + w, y, x + w, y + L); line(x, y + h, x + L, y + h); line(x, y + h, x, y + h - L); line(x + w, y + h, x + w - L, y + h); line(x + w, y + h, x + w, y + h - L);
  strokeWeight(1); stk(t, 70); rect(x, y, w, h);
}

function drawHologramScene() {
  let t = app.tint, ctx = drawingContext, hy = height * .70, cx = width / 2;
  let g = ctx.createLinearGradient(0, 0, 0, height); g.addColorStop(0, "#02050a"); g.addColorStop(1, "#020811"); ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
  let rg = ctx.createRadialGradient(cx, height * .38, 10, cx, height * .38, width * .55); rg.addColorStop(0, rgba(t, .18)); rg.addColorStop(1, rgba(t, 0)); ctx.fillStyle = rg; ctx.fillRect(0, 0, width, height);
  strokeWeight(1); stk(t, 25); for (let i = -14; i <= 14; i++) line(cx + i * 12, hy, cx + i * width * .09, height);
  for (let k = 0; k < 10; k++) { let u = (k + frameCount * .02 % 1) / 10; stk(t, 8 + u * 30); line(0, hy + (height - hy) * u * u, width, hy + (height - hy) * u * u); }
  drawHoloParticles(t, hy);
}

function initParticles() { holoParticles = Array.from({ length: 95 }, () => ({ x: random(), y: random(), speed: random(.001, .004), size: random(1, 3) })); }
function drawHoloParticles(t, hy) { noStroke(); for (let p of holoParticles) { p.y -= p.speed; if (p.y < .03) p.y = 1; let xx = width * .5 + (p.x - .5) * width * (.2 + p.y * .7), yy = lerp(hy, height * .94, p.y); fl(t, sin(p.y * PI) * 170); circle(xx, yy, p.size); } }

function goBack() { if (app.mode === "MODULE") { app.mode = "MAIN"; app.keyNav = false; } }
function openModule(i) { app.selected = i; app.mode = "MODULE"; app.keyNav = false; simulation.setLevel(75); }
function changeModule(dir) { app.selected = (app.selected + dir + app.modules.length) % app.modules.length; simulation.setLevel(75); }
function setSliderFromMouse(requireClose) { let x = app.panelX + app.panelW * .71, y = app.panelY + 95, w = app.panelW * .23, sy = y + 72, start = x + 20, end = x + w - 20; if (requireClose && (abs(mouseY - sy) > 22 || mouseX < start - 15 || mouseX > end + 15)) return false; simulation.setLevel(map(mouseX, start, end, 0, 100)); return true; }
function setMetricFromMouse(requireClose) {
  let panelX = app.panelX + app.panelW * .71, panelY = app.panelY + 95, panelW = app.panelW * .23;
  let x = panelX + 17, y = panelY + 128, w = panelW - 34;
  let type = app.modules[app.selected].type;
  for (let i = 0; i < 3; i++) {
    let yy = y + i * 27 + 11, start = x + 20, end = x + w - 25;
    if (abs(mouseY - yy) > 14) continue;
    if (dist(mouseX, mouseY, x + 6, yy) < 12) { simulation.setMetric(type, i, simulation.getMetrics(type)[i] - 10); return true; }
    if (dist(mouseX, mouseY, x + w - 7, yy) < 12) { simulation.setMetric(type, i, simulation.getMetrics(type)[i] + 10); return true; }
    if (!requireClose || (mouseX >= start - 12 && mouseX <= end + 12)) { simulation.setMetric(type, i, map(mouseX, start, end, 0, 100)); return true; }
  }
  return false;
}
function mouseMoved() { if (app) app.keyNav = false; }
function mousePressed() { if (app.mode === "MODULE") { if (mouseY > app.panelY + app.panelH - 34 && mouseX < app.panelX + 280) goBack(); else if (!setMetricFromMouse(true)) setSliderFromMouse(true); return; } let cx = app.panelX + app.panelW / 2, cy = app.panelY + app.panelH / 2, r = app.menuRadius(); for (let i = 0; i < 4; i++) { let a = -HALF_PI + i * HALF_PI; if (dist(mouseX, mouseY, cx + cos(a) * r, cy + sin(a) * r) < 56) return openModule(i); } }
function mouseDragged() { if (app.mode === "MODULE" && !setMetricFromMouse(true)) setSliderFromMouse(true); }
function keyPressed() { if (keyCode === ESCAPE || keyCode === BACKSPACE) { goBack(); return false; } if (key === "r" || key === "R") { simulation.createNetwork(); return false; } if (key >= "1" && key <= "4") { openModule(int(key) - 1); return false; } if (app.mode === "MODULE") { if (keyCode === RIGHT_ARROW || keyCode === UP_ARROW) simulation.setLevel(simulation.target + 5); else if (keyCode === LEFT_ARROW || keyCode === DOWN_ARROW) simulation.setLevel(simulation.target - 5); else if (key === ",") changeModule(-1); else if (key === ".") changeModule(1); return false; } if (keyCode === LEFT_ARROW || keyCode === UP_ARROW) { app.keyNav = true; app.selected = (app.selected + 3) % 4; return false; } if (keyCode === RIGHT_ARROW || keyCode === DOWN_ARROW) { app.keyNav = true; app.selected = (app.selected + 1) % 4; return false; } if (keyCode === ENTER || keyCode === RETURN) { openModule(app.selected); return false; } }
function windowResized() { resizeCanvas(windowWidth, windowHeight); simulation.createNetwork(); }
