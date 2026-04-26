class Cylinder {
    constructor(){
        this.type = "cylinder";
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.segments = 16;
    }

    render(){
        drawCylinder(this.matrix, this.color, this.segments);
    }
}

function drawCylinder(matrix, color, segments) {
    gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);

    for (let i = 0; i < segments; i++) {
        let angle1 = i * 2 * Math.PI / segments;
        let angle2 = (i + 1) * 2 * Math.PI / segments;
        let y1 = 0.5 * Math.cos(angle1);
        let z1 = 0.5 * Math.sin(angle1);
        let y2 = 0.5 * Math.cos(angle2);
        let z2 = 0.5 * Math.sin(angle2);
        let shade = 0.70 + 0.30 * Math.max(Math.cos((angle1 + angle2) / 2), 0);

        setCylinderColor(color, shade);
        drawCylinderTriangle3D([
            -0.5, y1, z1,
             0.5, y1, z1,
             0.5, y2, z2,
            -0.5, y1, z1,
             0.5, y2, z2,
            -0.5, y2, z2,
        ]);

        setCylinderColor(color, 0.95);
        drawCylinderTriangle3D([
             0.5, 0, 0,
             0.5, y1, z1,
             0.5, y2, z2,
        ]);

        setCylinderColor(color, 0.65);
        drawCylinderTriangle3D([
            -0.5, 0, 0,
            -0.5, y2, z2,
            -0.5, y1, z1,
        ]);
    }
}

function setCylinderColor(color, shade) {
    gl.uniform4f(
        u_FragColor,
        Math.min(color[0] * shade, 1.0),
        Math.min(color[1] * shade, 1.0),
        Math.min(color[2] * shade, 1.0),
        color[3]
    );
}

function drawCylinderTriangle3D(vertices) {
    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
}
