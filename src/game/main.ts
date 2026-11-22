import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { FarmScene } from './scenes/FarmScene';

/**
 * Creates the Phaser game (Layer 1). Transparent WebGL canvas that resizes
 * with its parent so the themed CSS background and React HUD show through.
 */
export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO, // WebGL first, Canvas fallback
    parent,
    transparent: true,
    backgroundColor: 'rgba(0,0,0,0)',
    banner: false,
    disableContextMenu: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth || window.innerWidth,
      height: parent.clientHeight || window.innerHeight,
      autoRound: true,
    },
    render: {
      antialias: true,
      powerPreference: 'high-performance',
      roundPixels: false,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    } as Phaser.Types.Core.RenderConfig,
    fps: {
      target: 60,
      smoothStep: true,
    },
    input: {
      activePointers: 2,
    },
    scene: [BootScene, FarmScene],
  });
}
