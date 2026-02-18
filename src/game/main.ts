import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { GameScene } from './scenes/GameScene';
import { AUTO, Game } from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#2d4a3e',
  pixelArt: true,
  scene: [Boot, Preloader, GameScene]
};

export default (parent: string) => new Game({ ...config, parent });
