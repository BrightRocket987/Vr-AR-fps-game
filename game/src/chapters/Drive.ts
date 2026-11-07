import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three';
import type { AppContext, Chapter, DebugChapter } from '../app/XRApp';

/**
 * PLACEHOLDER for Chapter 2 · Are We Home Yet?. Replaced by the real chapter (same class name, same no-argument constructor).
 * Shows a title card and completes after 4 s so the campaign sequence can be tested end to end.
 */
export class Drive implements Chapter, DebugChapter {
  readonly name = 'drive';
  private ctx!: AppContext;
  private card!: Mesh;
  private t = 0;
  private done = false;

  start(ctx: AppContext): void {
    this.ctx = ctx;
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = 'rgba(20,18,28,0.9)';
    g.fillRect(0, 0, 1024, 256);
    g.fillStyle = '#ffcc33';
    g.font = 'bold 64px "Trebuchet MS", sans-serif';
    g.textAlign = 'center';
    g.fillText('Chapter 2 · Are We Home Yet?', 512, 150);
    this.card = new Mesh(new PlaneGeometry(1.2, 0.3), new MeshBasicMaterial({ map: new CanvasTexture(c), transparent: true }));
    const head = ctx.headPosition(new Vector3());
    const fwd = ctx.headForward(new Vector3()).setY(0).normalize();
    this.card.position.copy(head).addScaledVector(fwd, 1.6);
    this.card.lookAt(head);
    ctx.world.add(this.card);
  }

  update(dt: number): void {
    this.t += dt;
    if (!this.done && this.t > 4) this.debugFinish();
  }

  debugFinish(): void {
    if (this.done) return;
    this.done = true;
    this.ctx.complete({ title: 'Chapter 2 · Are We Home Yet?', lines: ['(placeholder)'] });
  }

  snapshot(): Record<string, unknown> {
    return { phase: this.done ? 'done' : 'play', placeholder: true };
  }

  dispose(): void {
    this.ctx?.world.remove(this.card);
  }
}
