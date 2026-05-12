class Vector3 {
  constructor(src) {
    this.elements = new Float32Array(3);
    if (src && src.elements) this.set(src);
    else if (Array.isArray(src)) this.elements.set(src);
  }

  set(v) {
    this.elements.set(v.elements || v);
    return this;
  }

  add(v) {
    const a = this.elements;
    const b = v.elements;
    a[0] += b[0];
    a[1] += b[1];
    a[2] += b[2];
    return this;
  }

  sub(v) {
    const a = this.elements;
    const b = v.elements;
    a[0] -= b[0];
    a[1] -= b[1];
    a[2] -= b[2];
    return this;
  }

  mul(s) {
    const a = this.elements;
    a[0] *= s;
    a[1] *= s;
    a[2] *= s;
    return this;
  }

  normalize() {
    const a = this.elements;
    const length = Math.hypot(a[0], a[1], a[2]);
    if (length > 0.00001) this.mul(1 / length);
    return this;
  }

  static cross(a, b) {
    const ae = a.elements;
    const be = b.elements;
    return new Vector3([
      ae[1] * be[2] - ae[2] * be[1],
      ae[2] * be[0] - ae[0] * be[2],
      ae[0] * be[1] - ae[1] * be[0],
    ]);
  }
}

class Matrix4 {
  constructor(src) {
    this.elements = new Float32Array(16);
    if (src && src.elements) this.elements.set(src.elements);
    else this.setIdentity();
  }

  setIdentity() {
    const e = this.elements;
    e.fill(0);
    e[0] = 1;
    e[5] = 1;
    e[10] = 1;
    e[15] = 1;
    return this;
  }

  setPerspective(fovy, aspect, near, far) {
    const e = this.elements;
    const f = 1 / Math.tan((Math.PI * fovy) / 360);
    e.fill(0);
    e[0] = f / aspect;
    e[5] = f;
    e[10] = (far + near) / (near - far);
    e[11] = -1;
    e[14] = (2 * far * near) / (near - far);
    return this;
  }

  setLookAt(ex, ey, ez, ax, ay, az, ux, uy, uz) {
    const eye = new Vector3([ex, ey, ez]);
    const f = new Vector3([ax, ay, az]).sub(eye).normalize();
    const up = new Vector3([ux, uy, uz]).normalize();
    const s = Vector3.cross(f, up).normalize();
    const u = Vector3.cross(s, f);
    const e = this.elements;

    e[0] = s.elements[0];
    e[1] = u.elements[0];
    e[2] = -f.elements[0];
    e[3] = 0;
    e[4] = s.elements[1];
    e[5] = u.elements[1];
    e[6] = -f.elements[1];
    e[7] = 0;
    e[8] = s.elements[2];
    e[9] = u.elements[2];
    e[10] = -f.elements[2];
    e[11] = 0;
    e[12] = -(s.elements[0] * ex + s.elements[1] * ey + s.elements[2] * ez);
    e[13] = -(u.elements[0] * ex + u.elements[1] * ey + u.elements[2] * ez);
    e[14] = f.elements[0] * ex + f.elements[1] * ey + f.elements[2] * ez;
    e[15] = 1;
    return this;
  }

  multiply(other) {
    const a = this.elements;
    const b = other.elements;
    const e = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        e[i + j * 4] =
          a[i] * b[j * 4] +
          a[i + 4] * b[j * 4 + 1] +
          a[i + 8] * b[j * 4 + 2] +
          a[i + 12] * b[j * 4 + 3];
      }
    }
    a.set(e);
    return this;
  }

  translate(x, y, z) {
    const t = new Matrix4();
    t.elements[12] = x;
    t.elements[13] = y;
    t.elements[14] = z;
    return this.multiply(t);
  }

  scale(x, y, z) {
    const s = new Matrix4();
    s.elements[0] = x;
    s.elements[5] = y;
    s.elements[10] = z;
    return this.multiply(s);
  }

  setRotate(angle, x, y, z) {
    const e = this.elements;
    const rad = (Math.PI * angle) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const axis = new Vector3([x, y, z]).normalize().elements;
    const nc = 1 - c;

    e[0] = axis[0] * axis[0] * nc + c;
    e[1] = axis[1] * axis[0] * nc + axis[2] * s;
    e[2] = axis[2] * axis[0] * nc - axis[1] * s;
    e[3] = 0;
    e[4] = axis[0] * axis[1] * nc - axis[2] * s;
    e[5] = axis[1] * axis[1] * nc + c;
    e[6] = axis[2] * axis[1] * nc + axis[0] * s;
    e[7] = 0;
    e[8] = axis[0] * axis[2] * nc + axis[1] * s;
    e[9] = axis[1] * axis[2] * nc - axis[0] * s;
    e[10] = axis[2] * axis[2] * nc + c;
    e[11] = 0;
    e[12] = 0;
    e[13] = 0;
    e[14] = 0;
    e[15] = 1;
    return this;
  }

  multiplyVector3(v) {
    const e = this.elements;
    const a = v.elements;
    return new Vector3([
      e[0] * a[0] + e[4] * a[1] + e[8] * a[2],
      e[1] * a[0] + e[5] * a[1] + e[9] * a[2],
      e[2] * a[0] + e[6] * a[1] + e[10] * a[2],
    ]);
  }
}
