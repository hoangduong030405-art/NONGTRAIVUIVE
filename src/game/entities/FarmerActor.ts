import Phaser from 'phaser';

export type FarmerAction = 'idle' | 'walk' | 'water' | 'seed' | 'cheer' | 'wave' | 'fish' | 'shear';

export class FarmerActor extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;

  private isMoving = false;
  private targetX = 0;
  private targetY = 0;
  private moveSpeed = 160;
  private onArrivedCallback: (() => void) | null = null;

  private walkTimer = 0;
  private walkFrame = 1;
  private idleTimer = 0;
  private isPerformingAction = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.shadow = scene.add.image(0, 16, 'shadow').setOrigin(0.5, 0.5).setScale(0.8, 0.5);
    this.sprite = scene.add.image(0, 0, 'farmer-stand').setOrigin(0.5, 0.9);

    this.add([this.shadow, this.sprite]);
    this.setDepth(y);
    scene.add.existing(this);

    this.idleTimer = scene.time.now + 2000 + Math.random() * 2000;
  }

  public walkTo(x: number, y: number, onArrived?: () => void): void {
    this.targetX = x;
    this.targetY = y;
    this.isMoving = true;
    this.isPerformingAction = false;
    this.onArrivedCallback = onArrived ?? null;
  }

  public playAction(action: 'water' | 'seed' | 'cheer' | 'wave' | 'fish' | 'shear', duration = 900, onDone?: () => void): void {
    this.isMoving = false;
    this.isPerformingAction = true;
    
    // Choose closest available texture
    const tex = (action === 'fish' || action === 'shear') ? 'farmer-water' : `farmer-${action}`;
    this.sprite.setTexture(tex);

    // Cute punch/bob animation
    this.scene.tweens.killTweensOf(this.sprite);
    if (action === 'cheer') {
      this.scene.tweens.add({
        targets: this.sprite,
        y: -14,
        duration: 200,
        yoyo: true,
        repeat: 2,
        ease: 'Quad.easeOut',
      });
    } else {
      this.scene.tweens.add({
        targets: this.sprite,
        scaleX: 1.08,
        scaleY: 0.94,
        duration: 220,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    }

    this.scene.time.delayedCall(duration, () => {
      this.isPerformingAction = false;
      this.sprite.setTexture('farmer-stand');
      this.sprite.y = 0;
      this.sprite.setScale(1);
      onDone?.();
    });
  }

  update(time: number, delta: number): void {
    if (this.isMoving) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.targetX, this.targetY);
      if (dist < 6) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.isMoving = false;
        this.sprite.setTexture('farmer-stand');
        const cb = this.onArrivedCallback;
        this.onArrivedCallback = null;
        cb?.();
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetX, this.targetY);
        const step = this.moveSpeed * (delta * 0.001);
        this.x += Math.cos(angle) * step;
        this.y += Math.sin(angle) * step;

        this.sprite.setFlipX(this.targetX < this.x);

        this.walkTimer += delta;
        if (this.walkTimer > 130) {
          this.walkTimer = 0;
          this.walkFrame = this.walkFrame === 1 ? 2 : 1;
          this.sprite.setTexture(`farmer-walk-${this.walkFrame}`);
        }
      }
    } else if (!this.isPerformingAction) {
      // Idle behaviors (occasional blink, wave)
      if (time > this.idleTimer) {
        this.idleTimer = time + 3000 + Math.random() * 4000;
        if (Math.random() < 0.6) {
          // Blink
          this.sprite.setTexture('farmer-blink');
          this.scene.time.delayedCall(220, () => {
            if (!this.isMoving && !this.isPerformingAction) {
              this.sprite.setTexture('farmer-stand');
            }
          });
        } else if (Math.random() < 0.25) {
          // Autonomous wave
          this.playAction('wave', 1000);
        }
      }
    }

    this.setDepth(this.y);
  }
}
