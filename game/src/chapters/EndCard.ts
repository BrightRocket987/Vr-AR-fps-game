import { CanvasTexture, Color, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three';
import type { AppContext, Chapter, DebugChapter } from '../app/XRApp';
import { PopFx } from '../combat/PopFx';

/**
 * The last "chapter": a results card floating in front of the player with confetti.
 * Weapon-hand trigger plays the campaign again; the system menu ends the session.
 */
export class EndCard implements Chapter, DebugChapter {
  readonly name = 'end';
  private ctx!: AppContext;
  private card!: Mesh;
  private readonly fx = new PopFx(false);
  private t = 0;
  private confettiTimer = 0;

  start(ctx: AppContext): void {
    this.ctx = ctx;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const g = canvas.getContext('2d')!;
    g.fillStyle = 'rgba(20,18,28,0.92)';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.textAlign = 'center';
    g.fillStyle = '#ffcc33';
    g.font = 'bold 96px "Trebuchet MS", sans-serif';
    g.fillText('GO TO BED!!!', 512, 120);
    g.fillStyle = '#f4efe6';
    g.font = '40px "Trebuchet MS", sans-serif';
    const results = ctx.results();
    let y = 210;
    if (results.length === 0) {
      g.fillText('Nobody went to bed. Yet.', 512, y);
      y += 60;
    }
    for (const r of results) {
      const title = r.title ?? r.chapter ?? 'Chapter';
      g.fillText(`${title}${r.rank ? `  ·  rank ${r.rank}` : ''}${r.pops !== undefined ? `  ·  ${r.pops} pops` : ''}`, 512, y);
      y += 54;
      for (const line of r.lines ?? []) {
        g.fillStyle = '#9a93a8';
        g.font = '30px "Trebuchet MS", sans-serif';
        g.fillText(line, 512, y);
        y += 40;
        g.fillStyle = '#f4efe6';
        g.font = '40px "Trebuchet MS", sans-serif';
      }
      if (y > 600) break;
    }
    g.fillStyle = '#3fd6c8';
    g.font = 'bold 44px "Trebuchet MS", sans-serif';
    g.fillText(`Lifetime pops: ${ctx.save.data.lifetimePops}`, 512, 650);
    g.fillStyle = '#ff9ad5';
    g.font = '34px "Trebuchet MS", sans-serif';
    g.fillText('Trigger: play again   ·   Menu button: leave', 512, 720);
    const tex = new CanvasTexture(canvas);
    this.card = new Mesh(new PlaneGeometry(1.2, 0.9), new MeshBasicMaterial({ map: tex, transparent: true }));
    const head = ctx.headPosition(new Vector3());
    const fwd = ctx.headForward(new Vector3()).setY(0).normalize();
    this.card.position.copy(head).addScaledVector(fwd, 1.8).add(new Vector3(0, -0.1, 0));
    this.card.lookAt(head);
    ctx.world.add(this.card, this.fx.group);
  }

  update(dt: number): void {
    this.t += dt;
    this.fx.update(dt);
    this.confettiTimer -= dt;
    if (this.confettiTimer <= 0 && this.t < 6) {
      this.confettiTimer = 0.5;
      const p = this.card.position.clone().add(new Vector3((Math.random() - 0.5) * 1.2, 0.5, 0));
      this.fx.pop(p, new Color().setHSL(Math.random(), 0.8, 0.6), 30);
    }
    if (this.t > 1.5 && this.ctx.input.weaponHand.triggerJustPressed) this.ctx.restart();
  }

  snapshot(): Record<string, unknown> {
    return { phase: 'end', results: this.ctx.results().length };
  }

  dispose(): void {
    this.ctx?.world.remove(this.card, this.fx.group);
  }
}
