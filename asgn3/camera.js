class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.fov = 60;
    this.eye = new Vector3([15.5, 1.7, 29.5]);
    this.at = new Vector3([15.5, 1.7, 28.5]);
    this.up = new Vector3([0, 1, 0]);
    this.yaw = -90;
    this.pitch = 0;
    this.speed = 0.16;
    this.turnSpeed = 5;
    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();
    this.updateMatrices();
  }

  updateMatrices() {
    const e = this.eye.elements;
    const a = this.at.elements;
    const u = this.up.elements;
    this.viewMatrix.setLookAt(e[0], e[1], e[2], a[0], a[1], a[2], u[0], u[1], u[2]);
    this.projectionMatrix.setPerspective(this.fov, this.canvas.width / this.canvas.height, 0.1, 1000);
  }

  forwardVector() {
    return new Vector3(this.at).sub(this.eye).normalize();
  }

  movementForwardVector() {
    const yaw = (this.yaw * Math.PI) / 180;
    return new Vector3([Math.cos(yaw), 0, Math.sin(yaw)]).normalize();
  }

  moveForward(speed = this.speed) {
    const f = this.movementForwardVector().mul(speed);
    this.eye.add(f);
    this.syncAtFromAngles();
  }

  moveBackwards(speed = this.speed) {
    const b = this.movementForwardVector().mul(-speed);
    this.eye.add(b);
    this.syncAtFromAngles();
  }

  moveLeft(speed = this.speed) {
    const s = Vector3.cross(this.up, this.movementForwardVector()).normalize().mul(speed);
    this.eye.add(s);
    this.syncAtFromAngles();
  }

  moveRight(speed = this.speed) {
    const s = Vector3.cross(this.movementForwardVector(), this.up).normalize().mul(speed);
    this.eye.add(s);
    this.syncAtFromAngles();
  }

  moveUp(speed = this.speed) {
    this.eye.elements[1] += speed;
    this.syncAtFromAngles();
  }

  moveDown(speed = this.speed) {
    this.eye.elements[1] -= speed;
    this.syncAtFromAngles();
  }

  panLeft(alpha = this.turnSpeed) {
    this.yaw -= alpha;
    this.syncAtFromAngles();
  }

  panRight(alpha = this.turnSpeed) {
    this.yaw += alpha;
    this.syncAtFromAngles();
  }

  look(deltaYaw, deltaPitch) {
    this.yaw += deltaYaw;
    this.pitch = Math.max(-78, Math.min(78, this.pitch + deltaPitch));
    this.syncAtFromAngles();
  }

  syncAtFromAngles() {
    const yaw = (this.yaw * Math.PI) / 180;
    const pitch = (this.pitch * Math.PI) / 180;
    const dir = new Vector3([
      Math.cos(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.sin(yaw) * Math.cos(pitch),
    ]).normalize();
    this.at.set(this.eye).add(dir);
    this.updateMatrices();
  }
}
