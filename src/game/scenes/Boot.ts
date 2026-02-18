import { Scene } from 'phaser';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // No assets needed for prototype - use Graphics
  }

  create() {
    this.scene.start('Preloader');
  }
}
