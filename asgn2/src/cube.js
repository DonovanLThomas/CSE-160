class Cube {
    constructor(){
        this.type = "cube";
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
    }

    render(){
        drawCube(this.matrix, this.color);
    }
}

function drawCube(matrix, color){
    gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);

    setFaceColor(color, 1.00);
    drawTriangle3D([
        -0.5, -0.5,  0.5,
         0.5, -0.5,  0.5,
         0.5,  0.5,  0.5,
        -0.5, -0.5,  0.5,
         0.5,  0.5,  0.5,
        -0.5,  0.5,  0.5,
    ]);

    setFaceColor(color, 0.70);
    drawTriangle3D([
         0.5, -0.5, -0.5,
        -0.5, -0.5, -0.5,
        -0.5,  0.5, -0.5,
         0.5, -0.5, -0.5,
        -0.5,  0.5, -0.5,
         0.5,  0.5, -0.5,
    ]);

    setFaceColor(color, 0.85);
    drawTriangle3D([
         0.5, -0.5,  0.5,
         0.5, -0.5, -0.5,
         0.5,  0.5, -0.5,
         0.5, -0.5,  0.5,
         0.5,  0.5, -0.5,
         0.5,  0.5,  0.5,
    ]);

    setFaceColor(color, 0.75);
    drawTriangle3D([
        -0.5, -0.5, -0.5,
        -0.5, -0.5,  0.5,
        -0.5,  0.5,  0.5,
        -0.5, -0.5, -0.5,
        -0.5,  0.5,  0.5,
        -0.5,  0.5, -0.5,
    ]);

    setFaceColor(color, 1.15);
    drawTriangle3D([
        -0.5,  0.5,  0.5,
         0.5,  0.5,  0.5,
         0.5,  0.5, -0.5,
        -0.5,  0.5,  0.5,
         0.5,  0.5, -0.5,
        -0.5,  0.5, -0.5,
    ]);

    setFaceColor(color, 0.60);
    drawTriangle3D([
        -0.5, -0.5, -0.5,
         0.5, -0.5, -0.5,
         0.5, -0.5,  0.5,
        -0.5, -0.5, -0.5,
         0.5, -0.5,  0.5,
        -0.5, -0.5,  0.5,
    ]);
}

function setFaceColor(color, shade) {
    gl.uniform4f(
        u_FragColor,
        Math.min(color[0] * shade, 1.0),
        Math.min(color[1] * shade, 1.0),
        Math.min(color[2] * shade, 1.0),
        color[3]
    );
}

function drawTriangle3D(vertices) {
    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
}
