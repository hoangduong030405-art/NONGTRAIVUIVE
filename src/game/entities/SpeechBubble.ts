import Phaser from 'phaser';

/**
 * SpeechBubble - A lightweight procedural speech bubble for animal IELTS idioms.
 * Auto-destroys after duration, self-adjusting padding and tail pointer.
 */
export class SpeechBubble extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private contentText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, duration: number = 3200) {
    super(scene, x, y);

    this.bg = scene.add.graphics();
    this.contentText = scene.add.text(0, 0, text, {
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#2b1d14',
      align: 'center',
      wordWrap: { width: 150 },
    }).setOrigin(0.5, 0.5);

    this.add([this.bg, this.contentText]);
    this.setDepth(100);

    this.renderBubble();
    scene.add.existing(this);

    // Pop-in bounce animation
    this.setScale(0.2);
    this.setAlpha(0);
    scene.tweens.add({
      targets: this,
      scale: 1,
      alpha: 1,
      duration: 240,
      ease: 'Back.easeOut',
    });

    // Auto fadeout
    scene.time.delayedCall(duration, () => {
      scene.tweens.add({
        targets: this,
        scale: 0.8,
        alpha: 0,
        y: this.y - 12,
        duration: 250,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          this.destroy();
        },
      });
    });
  }

  private renderBubble(): void {
    const padX = 14;
    const padY = 8;
    const w = Math.max(70, this.contentText.width + padX * 2);
    const h = this.contentText.height + padY * 2;
    const r = 10;
    const tailH = 8;

    this.bg.clear();

    // Drop shadow
    this.bg.fillStyle(0x000000, 0.18);
    this.bg.fillRoundedRect(-w / 2, -h - tailH + 3, w, h, r);

    // Bubble body
    this.bg.fillStyle(0xffffff, 1);
    this.bg.lineStyle(2.5, 0x3a2718, 1);
    this.bg.fillRoundedRect(-w / 2, -h - tailH, w, h, r);
    this.bg.strokeRoundedRect(-w / 2, -h - tailH, w, h, r);

    // Tail pointer pointing down to animal
    this.bg.fillStyle(0xffffff, 1);
    this.bg.beginPath();
    this.bg.moveTo(-6, -tailH);
    this.bg.lineTo(0, 0);
    this.bg.lineTo(6, -tailH);
    this.bg.closePath();
    this.bg.fillPath();

    this.bg.beginPath();
    this.bg.moveTo(-6, -tailH);
    this.bg.lineTo(0, 0);
    this.bg.lineTo(6, -tailH);
    this.bg.strokePath();

    // Clean seam between tail & rect
    this.bg.fillStyle(0xffffff, 1);
    this.bg.fillRect(-5, -tailH - 1, 10, 3);

    this.contentText.setPosition(0, -h / 2 - tailH);
  }
}
