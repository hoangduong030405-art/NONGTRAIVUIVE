import Phaser from 'phaser';
import { EventBus } from '../../bridge/EventBus';
import { AudioEngine } from '../../core/AudioEngine';
import type { ParticlePool } from '../pools/ParticlePool';
import { SpeechBubble } from './SpeechBubble';

export type AnimalType = 'sheep' | 'chicken' | 'cow' | 'dog';

const ANIMAL_IDIOMS: Record<AnimalType, string[]> = {
  sheep: [
    '🐑 "Black sheep of the family"',
    '🐑 "Two shakes of a lamb\'s tail!"',
    '🐑 "Wolf in sheep\'s clothing"',
    '🐑 "Count sheep for good sleep!"',
  ],
  chicken: [
    '🐔 "Don\'t count your chickens before they hatch!"',
    '🐔 "Running around like a headless chicken"',
    '🐔 "Chicken-and-egg situation"',
    '🐔 "Rule the roost!"',
  ],
  cow: [
    '🐮 "Till the cows come home"',
    '🐮 "Holy cow! (Surprise)"',
    '🐮 "Cash cow = steady profit"',
    '🐮 "Sacred cow = immune to criticism"',
  ],
  dog: [
    '🐶 "Barking up the wrong tree"',
    '🐶 "Every dog has its day"',
    '🐶 "Let sleeping dogs lie"',
    '🐶 "Dog-eat-dog competition"',
  ],
};

export class AnimalActor extends Phaser.GameObjects.Container {
  public animalType: AnimalType;
  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private particles: ParticlePool;
  private boundsRect: Phaser.Geom.Rectangle;
  private activeBubble: SpeechBubble | null = null;

  private isDancing = false;
  private isMoving = false;
  private moveSpeed = 38;
  private targetX = 0;
  private targetY = 0;
  private nextActionTime = 0;
  private walkTimer = 0;
  private walkFrame = 0;

  // Dog follow logic
  private leader: Phaser.GameObjects.Container | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: AnimalType,
    bounds: Phaser.Geom.Rectangle,
    particles: ParticlePool,
    leader?: Phaser.GameObjects.Container,
  ) {
    super(scene, x, y);
    this.animalType = type;
    this.boundsRect = bounds;
    this.particles = particles;
    this.leader = leader ?? null;

    this.shadow = scene.add.image(0, 10, 'shadow').setOrigin(0.5, 0.5);
    const shadowScale = type === 'cow' ? 0.9 : type === 'sheep' ? 0.75 : type === 'dog' ? 0.6 : 0.45;
    this.shadow.setScale(shadowScale, shadowScale * 0.7);

    this.sprite = scene.add.image(0, 0, `${type}-0`).setOrigin(0.5, 0.85);

    this.add([this.shadow, this.sprite]);
    this.setDepth(y);

    // Click/tap interaction
    this.setSize(this.sprite.width, this.sprite.height);
    this.setInteractive({ useHandCursor: true });
    this.on(Phaser.Input.Events.POINTER_DOWN, this.onTapped, this);

    scene.add.existing(this);
    this.nextActionTime = scene.time.now + 1000 + Math.random() * 2000;
  }

  public setBounds(rect: Phaser.Geom.Rectangle): void {
    this.boundsRect = rect;
  }

  public onTapped(): void {
    AudioEngine.playAnimal(this.animalType);
    this.particles.emitHeartBurst(this.x, this.y - 30);

    // Joy hop
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      y: this.y - 18,
      duration: 180,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.setDepth(this.y);
      },
    });

    // Emit interaction to store for collecting eggs, milk, wool, patting dog
    EventBus.emit('game:animal-interact', {
      animalType: this.animalType,
      action: this.animalType === 'chicken' ? 'egg' : this.animalType === 'cow' ? 'milk' : this.animalType === 'sheep' ? 'wool' : 'pet',
    });

    // Idiom speech bubble
    const idioms = ANIMAL_IDIOMS[this.animalType];
    const quote = idioms[Math.floor(Math.random() * idioms.length)] ?? 'Hello!';

    if (this.activeBubble && this.activeBubble.active) {
      this.activeBubble.destroy();
    }
    this.activeBubble = new SpeechBubble(this.scene, this.x, this.y - 45, quote, 3800);
  }

  public triggerHappyDance(): void {
    this.isDancing = true;
    this.particles.emitComboBurst(this.x, this.y - 20, true);

    const origY = this.y;
    this.scene.tweens.add({
      targets: this,
      y: origY - 24,
      scaleX: 1.15,
      scaleY: 0.9,
      duration: 200,
      yoyo: true,
      repeat: 4,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.y = origY;
        this.setScale(1);
        this.isDancing = false;
        this.nextActionTime = this.scene.time.now + 1500;
      },
    });
  }

  update(time: number, delta: number): void {
    if (this.isDancing) return;

    if (this.animalType === 'dog' && this.leader) {
      this.updateDogFollow(time, delta);
    } else {
      this.updateRoaming(time, delta);
    }

    this.setDepth(this.y);
  }

  private updateDogFollow(time: number, delta: number): void {
    if (!this.leader) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.leader.x, this.leader.y);

    if (dist > 85) {
      this.isMoving = true;
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.leader.x + 20, this.leader.y + 15);
      const vx = Math.cos(angle) * (this.moveSpeed * 1.5) * (delta * 0.001);
      const vy = Math.sin(angle) * (this.moveSpeed * 1.5) * (delta * 0.001);

      this.x += vx;
      this.y += vy;
      this.sprite.setFlipX(vx < 0);

      this.walkTimer += delta;
      if (this.walkTimer > 160) {
        this.walkTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % 2;
        this.sprite.setTexture(`dog-${this.walkFrame}`);
      }
    } else {
      this.isMoving = false;
      if (time > this.nextActionTime) {
        this.nextActionTime = time + 2500 + Math.random() * 3000;
        const sit = Math.random() < 0.6;
        this.sprite.setTexture(sit ? 'dog-sit' : 'dog-0');
      }
    }
  }

  private updateRoaming(time: number, delta: number): void {
    if (this.isMoving) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.targetX, this.targetY);
      if (dist < 4) {
        this.isMoving = false;
        this.sprite.setTexture(`${this.animalType}-0`);
        this.nextActionTime = time + 2000 + Math.random() * 4000;
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetX, this.targetY);
        const vx = Math.cos(angle) * this.moveSpeed * (delta * 0.001);
        const vy = Math.sin(angle) * this.moveSpeed * (delta * 0.001);

        this.x += vx;
        this.y += vy;
        this.sprite.setFlipX(vx < 0);

        this.walkTimer += delta;
        if (this.walkTimer > 200) {
          this.walkTimer = 0;
          this.walkFrame = (this.walkFrame + 1) % 2;
          this.sprite.setTexture(`${this.animalType}-${this.walkFrame}`);
        }
      }
    } else {
      if (time > this.nextActionTime) {
        const rand = Math.random();
        if (rand < 0.5) {
          // Pick new random point in pasture
          this.targetX = Phaser.Math.Clamp(
            this.boundsRect.x + 20 + Math.random() * (this.boundsRect.width - 40),
            this.boundsRect.left + 10,
            this.boundsRect.right - 10,
          );
          this.targetY = Phaser.Math.Clamp(
            this.boundsRect.y + 20 + Math.random() * (this.boundsRect.height - 40),
            this.boundsRect.top + 10,
            this.boundsRect.bottom - 10,
          );
          this.isMoving = true;
        } else {
          // Play special idle frame (peck, graze)
          if (this.animalType === 'chicken') {
            this.sprite.setTexture(rand < 0.8 ? 'chicken-peck' : 'chicken-flap');
          } else if (this.animalType === 'cow') {
            this.sprite.setTexture('cow-graze');
          } else if (this.animalType === 'sheep') {
            this.sprite.setTexture('sheep-2');
          }
          this.nextActionTime = time + 2500 + Math.random() * 2500;
        }
      }
    }
  }
}
