import Phaser from "phaser";

class MainScene extends Phaser.Scene {
  create(): void {
    this.add.text(24, 24, "openRender Phaser minimal", {
      color: "#ffffff",
      fontFamily: "monospace",
      fontSize: "20px"
    });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 640,
  height: 360,
  backgroundColor: "#111827",
  scene: MainScene
});
