class Triangle {
    constructor(x, y, size, color, dirX = 0, dirY = 1) {
        this.type = "triangle";
        this.x = x;
        this.y = y;
        this.size = size;
        this.dirX = dirX;
        this.dirY = dirY;
        this.r = color[0];
        this.g = color[1];
        this.b = color[2];
        this.a = color[3];
    }

    render() {
        let d = this.size / 200.0;
        let forwardX = this.dirX;
        let forwardY = this.dirY;
        let perpX = -forwardY;
        let perpY = forwardX;

        let top_vertex = [this.x + forwardX * d, this.y + forwardY * d];
        let left_vertex = [this.x - forwardX * d + perpX * d, this.y - forwardY * d + perpY * d];
        let right_vertex = [this.x - forwardX * d - perpX * d, this.y - forwardY * d - perpY * d];
        let triangle_vertices = [
            top_vertex[0], top_vertex[1],
            left_vertex[0], left_vertex[1],
            right_vertex[0], right_vertex[1]
        ];

        let vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangle_vertices), gl.STATIC_DRAW);
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);
        gl.uniform4f(u_FragColor, this.r, this.g, this.b, this.a);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
}
