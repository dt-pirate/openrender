import Phaser from "phaser";
import "./style.css";

class DemoScene extends Phaser.Scene {
  constructor() {
    super("demo");
  }

  create() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, "openRender target project", {
      color: "#f6f3e8",
      fontFamily: "system-ui, sans-serif",
      fontSize: "24px"
    }).setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: 800,
  height: 480,
  backgroundColor: "#152326",
  scene: [DemoScene]
});
