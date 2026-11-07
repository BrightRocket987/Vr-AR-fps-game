import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Sprite, SpriteMaterial, Vector3 } from 'three';
import type { Input } from '../xr/Input';

export interface HudState {
  pops: number;
  tierName: string;
  toNext: number;
  patience: number;
  wave: string;
  ammo: number;
  mag: number;
  fps: number;
  hint: string;
}

/**
 * Three things: a wrist panel on the off hand (pops, tier, patience, wave, ammo), a floating hint
 * card in front of the player for onboarding and subtitles, and a red flash when you take damage.
 */
export class Hud {
  readonly group = new Group();
  private readonly wrist: Mesh;
  private readonly wristCanvas = document.createElement('canvas');
  private readonly wristTex: CanvasTexture;
  private readonly card: Mesh;
  private readonly cardCanvas = document.createElement('canvas');
  private readonly cardTex: CanvasTexture;
  private readonly flash: Sprite;
  private flashLife = 0;
  private readonly cushion: Sprite;
  private cushionLife = 0;
  private cardText = '';
  private cardSub = '';
  private cardLife = 0;
  private cardUntil = 0;
  private redrawTimer = 0;
  private lastWristKey = '';
  private lastCardKey = '';
  state: HudState = { pops: 0, tierName: 'Foam Dart Popper', toNext: 15, patience: 100, wave: '—', ammo: 6, mag: 6, fps: 0, hint: '' };

  constructor(private readonly input: Input, private readonly head: (out?: Vector3) => Vector3, private readonly forward: (out?: Vector3) => Vector3) {
    this.wristCanvas.width = 512;
    this.wristCanvas.height = 320;
    this.wristTex = new CanvasTexture(this.wristCanvas);
    this.wrist = new Mesh(new PlaneGeometry(0.12, 0.075), new MeshBasicMaterial({ map: this.wristTex, transparent: true, depthTest: false }));
    this.wrist.renderOrder = 50;
    this.group.add(this.wrist);

    this.cardCanvas.width = 1024;
    this.cardCanvas.height = 384;
    this.cardTex = new CanvasTexture(this.cardCanvas);
    this.card = new Mesh(new PlaneGeometry(0.8, 0.3), new MeshBasicMaterial({ map: this.cardTex, transparent: true, depthTest: false }));
    this.card.renderOrder = 51;
    this.card.visible = false;
    this.group.add(this.card);

    this.flash = new Sprite(new SpriteMaterial({ color: 0xff2200, transparent: true, opacity: 0, depthTest: false }));
    this.flash.scale.set(4, 4, 1);
    this.flash.renderOrder = 60;
    this.group.add(this.flash);
    this.cushion = new Sprite(new SpriteMaterial({ color: 0x8a5a2b, transparent: true, opacity: 0, depthTest: false }));
    this.cushion.scale.set(1.2, 0.9, 1);
    this.cushion.renderOrder = 61;
    this.cushion.visible = false;
    this.group.add(this.cushion);
  }

  /** A thrown cushion covers the view for `seconds`. */
  block(seconds: number): void {
    this.cushionLife = seconds;
  }

  /** Show a message in front of the player for `seconds` (0 = until replaced). */
  say(text: string, sub = '', seconds = 5): void {
    this.cardText = text;
    this.cardSub = sub;
    this.cardLife = seconds;
    this.cardUntil = seconds > 0 ? performance.now() + seconds * 1000 : Infinity;
    this.card.visible = true;
    this.redrawCard();
  }

  subtitle(text: string, speaker: string): void {
    if (this.cardLife > 0 && this.cardText && performance.now() < this.cardUntil && !this.cardSub.startsWith('“')) return; // don't stomp onboarding cards
    this.say(speakerLabel(speaker), `“${text}”`, Math.min(4, 1.5 + text.length * 0.06));
  }

  damageFlash(): void {
    this.flashLife = 0.35;
  }

  update(dt: number): void {
    // Wrist panel follows the off hand.
    const off = this.input.offHand;
    this.wrist.visible = off.connected;
    if (off.connected) {
      this.wrist.position.copy(off.position).add(new Vector3(0, 0.04, 0.06).applyQuaternion(off.quaternion));
      this.wrist.quaternion.copy(off.quaternion);
      this.wrist.rotateX(-Math.PI / 2 + 0.6);
    }
    // Card floats 1.6 m ahead at eye height minus a bit, smoothed.
    const h = this.head(new Vector3());
    const f = this.forward(new Vector3()).setY(0).normalize();
    const target = h.clone().addScaledVector(f, 1.6).add(new Vector3(0, -0.25, 0));
    this.card.position.lerp(target, Math.min(1, 4 * dt));
    this.card.lookAt(h);
    if (this.card.visible && this.cardLife > 0 && performance.now() > this.cardUntil) this.card.visible = false;
    // Damage flash sits on the head.
    if (this.flashLife > 0) {
      this.flashLife -= dt;
      this.flash.position.copy(h).addScaledVector(this.forward(new Vector3()), 0.3);
      this.flash.material.opacity = Math.max(0, this.flashLife / 0.35) * 0.35;
      this.flash.visible = true;
    } else this.flash.visible = false;
    if (this.cushionLife > 0) {
      this.cushionLife -= dt;
      this.cushion.position.copy(h).addScaledVector(this.forward(new Vector3()), 0.4);
      this.cushion.material.opacity = Math.min(0.9, this.cushionLife * 3);
      this.cushion.visible = true;
    } else this.cushion.visible = false;

    this.redrawTimer -= dt;
    if (this.redrawTimer <= 0) {
      this.redrawTimer = 0.2;
      this.redrawWrist();
    }
  }

  private redrawWrist(): void {
    const s = this.state;
    const key = `${s.pops}|${s.tierName}|${s.toNext}|${Math.round(s.patience)}|${s.wave}|${s.ammo}|${s.mag}|${Math.round(s.fps)}|${s.hint}`;
    if (key === this.lastWristKey) return;
    this.lastWristKey = key;
    const g = this.wristCanvas.getContext('2d')!;
    const W = this.wristCanvas.width, H = this.wristCanvas.height;
    g.clearRect(0, 0, W, H);
    roundRect(g, 0, 0, W, H, 28, 'rgba(20,18,28,0.85)');
    g.fillStyle = '#ffcc33';
    g.font = 'bold 64px "Trebuchet MS", sans-serif';
    g.fillText(`${s.pops} POPS`, 24, 70);
    g.fillStyle = '#f4efe6';
    g.font = '34px "Trebuchet MS", sans-serif';
    g.fillText(s.tierName, 24, 118);
    g.fillStyle = '#9a93a8';
    g.font = '26px "Trebuchet MS", sans-serif';
    g.fillText(s.toNext > 0 ? `${s.toNext} to next tier` : 'max tier', 24, 152);
    g.fillText(`Wave: ${s.wave}`, 24, 186);
    g.fillText(`${s.fps} fps`, W - 130, 186);
    // Patience bar
    g.fillStyle = '#3a3344';
    roundRect(g, 24, 206, W - 48, 30, 12, '#3a3344');
    roundRect(g, 24, 206, (W - 48) * Math.max(0, Math.min(1, s.patience / 100)), 30, 12, s.patience > 35 ? '#3fd6c8' : '#ff5a5a');
    g.fillStyle = '#f4efe6';
    g.font = '24px "Trebuchet MS", sans-serif';
    g.fillText(`PATIENCE ${Math.round(s.patience)}`, 30, 229);
    // Ammo
    g.fillStyle = '#ffcc33';
    for (let i = 0; i < Math.min(40, s.mag); i++) {
      const x = 24 + (i % 20) * 23, y = 258 + Math.floor(i / 20) * 24;
      g.globalAlpha = i < s.ammo ? 1 : 0.2;
      g.fillRect(x, y, 16, 18);
    }
    g.globalAlpha = 1;
    if (s.hint) {
      g.fillStyle = '#ff9ad5';
      g.font = 'italic 24px "Trebuchet MS", sans-serif';
      g.fillText(s.hint.slice(0, 38), 24, 310);
    }
    this.wristTex.needsUpdate = true;
  }

  private redrawCard(): void {
    const key = this.cardText + '|' + this.cardSub;
    if (key === this.lastCardKey) {
      this.cardTex.needsUpdate = true;
      return;
    }
    this.lastCardKey = key;
    const g = this.cardCanvas.getContext('2d')!;
    const W = this.cardCanvas.width, H = this.cardCanvas.height;
    g.clearRect(0, 0, W, H);
    roundRect(g, 0, 0, W, H, 40, 'rgba(20,18,28,0.82)');
    g.fillStyle = '#ffcc33';
    g.font = 'bold 72px "Trebuchet MS", sans-serif';
    g.textAlign = 'center';
    wrapText(g, this.cardText, W / 2, 110, W - 80, 78, 2);
    g.fillStyle = '#f4efe6';
    g.font = '44px "Trebuchet MS", sans-serif';
    wrapText(g, this.cardSub, W / 2, 250, W - 80, 52, 3);
    g.textAlign = 'left';
    this.cardTex.needsUpdate = true;
  }
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.fill();
}

function wrapText(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, maxLines: number): void {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y + lines * lineH);
      lines++;
      line = w;
      if (lines >= maxLines) return;
    } else line = test;
  }
  if (line && lines < maxLines) g.fillText(line, x, y + lines * lineH);
}

function speakerLabel(s: string): string {
  const map: Record<string, string> = { scamp: 'Scamp', clinger: 'Clinger', potato: 'Couch Potato', breacher: 'Breacher', stinky: 'Stinky', siren: 'Siren', zombie: 'Tablet Zombie', crawler: 'Crawler', ghost: 'ghost', bigbean: 'Big Bean', narrator: 'The Dreamgate' };
  return map[s] ?? s;
}
