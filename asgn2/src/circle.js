class Circle {
    constructor(x, y, size, color, segments) {
        this.type = "circle";
        this.x = x;
        this.y = y;
        this.size = size;
        this.segments = segments;
        this.r = color[0];
        this.g = color[1];
        this.b = color[2];
        this.a = color[3];
    }

    render() {
        let radius = this.size / 200.0;

        for (let angle = 0; angle < 360; angle += 360 / this.segments) {
            let angle1 = angle * Math.PI / 180;
            let angle2 = (angle + 360 / this.segments) * Math.PI / 180;

            let circle_vertices = [
                this.x, this.y,
                this.x + radius * Math.cos(angle1), this.y + radius * Math.sin(angle1),
                this.x + radius * Math.cos(angle2), this.y + radius * Math.sin(angle2)
            ];

            let vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circle_vertices), gl.STATIC_DRAW);
            gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(a_Position);
            gl.uniform4f(u_FragColor, this.r, this.g, this.b, this.a);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
    }
}
