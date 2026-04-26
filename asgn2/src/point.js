class Point {
    constructor(x, y, size, color) {
        this.type = "point";
        this.x = x;
        this.y = y;
        this.size = size;
        this.r = color[0];
        this.g = color[1];
        this.b = color[2];
        this.a = color[3];
    }

    render() {
        gl.disableVertexAttribArray(a_Position);
        gl.vertexAttrib3f(a_Position, this.x, this.y, 0.0);
        gl.uniform1f(u_Size, this.size);
        gl.uniform4f(u_FragColor, this.r, this.g, this.b, this.a);
        gl.drawArrays(gl.POINTS, 0, 1);
    }
}
