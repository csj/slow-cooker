import { Scene } from 'phaser';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  preload() {
    // No assets for prototype
  }

  create() {
    this.scene.start('GameScene');
  }
}
