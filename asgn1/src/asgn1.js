let canvas;
let gl;
var a_Position;
var u_Size;
var u_FragColor;
let g_shapes = [];
let g_size = 10;
let g_r = 1;
let g_g = 0;
let g_b = 0;
let g_a = 1;
let g_segments = 12;
let isDrawing = false;
let lastDragX = null;
let lastDragY = null;
const DRAG_SPACING = 20;
var current_shape = "point";


var VSHADER_SOURCE =
    'attribute vec4 a_Position; \n' +
    'uniform float u_Size; \n' +
    'void main() {\n' +
        'gl_Position = a_Position; \n' +
        'gl_PointSize = u_Size; \n' +
    '}\n'
;

var FSHADER_SOURCE =
    'precision mediump float;\n' +
    'uniform vec4 u_FragColor; \n' +
    'void main() {\n' +
    'gl_FragColor = u_FragColor; \n' +
    '}\n';


function setupWebGL(){
    canvas = document.getElementById("webgl");
    gl = canvas.getContext("webgl");
}
//compile the shader programs, attach the javascript variables to the GLSL variables
function connectVariablesToGLSL(){
    
    if(!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)){
        console.log("Could not open shaders");
        return;
    }
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    u_Size = gl.getUniformLocation(gl.program, 'u_Size');
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');

}

//based on some data structure that is holding all the information about what to draw, actually draw all the shapes.
function renderAllShapes(){
    gl.clear(gl.COLOR_BUFFER_BIT);

    for (let i = 0; i < g_shapes.length; i++) {
        let shape = g_shapes[i];


        if(shape.type == "point"){
            gl.disableVertexAttribArray(a_Position);
            gl.vertexAttrib3f(a_Position, shape.x, shape.y, 0.0);
            gl.uniform1f(u_Size, shape.size);
            gl.uniform4f(u_FragColor, shape.r, shape.g, shape.b, shape.a);
            gl.drawArrays(gl.POINTS, 0, 1);
        }

        else if(shape.type == "triangle"){
            let d = shape.size / 200.0;
            let forwardX = shape.dirX;
            let forwardY = shape.dirY;
            let perpX = -forwardY;
            let perpY = forwardX;

            let top_vertex = [shape.x + forwardX * d, shape.y + forwardY * d];
            let left_vertex = [shape.x - forwardX * d + perpX * d, shape.y - forwardY * d + perpY * d];
            let right_vertex = [shape.x - forwardX * d - perpX * d, shape.y - forwardY * d - perpY * d];
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
            gl.uniform4f(u_FragColor, shape.r, shape.g, shape.b, shape.a);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        else if(shape.type == "circle"){
            let radius = shape.size / 200.0;
            let segments = shape.segments;

            for (let angle = 0; angle < 360; angle += 360 / segments) {
                let angle1 = angle * Math.PI / 180;
                let angle2 = (angle + 360 / segments) * Math.PI / 180;

                let circle_vertices = [
                    shape.x, shape.y,
                    shape.x + radius * Math.cos(angle1), shape.y + radius * Math.sin(angle1),
                    shape.x + radius * Math.cos(angle2), shape.y + radius * Math.sin(angle2)
                ];

                let vertexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circle_vertices), gl.STATIC_DRAW);
                gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(a_Position);
                gl.uniform4f(u_FragColor, shape.r, shape.g, shape.b, shape.a);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
            }
        }

}
}

function addShapeFromEvent(ev, dirX = 0, dirY = 1){
    let rect = canvas.getBoundingClientRect();
    let mouse_x = ev.clientX;
    let mouse_y = ev.clientY;
    let canvas_width = canvas.width;
    let canvas_height = canvas.height;

    let x_position = mouse_x - rect.left;
    let y_position = mouse_y - rect.top;


    let webGL_x = (x_position - (canvas_width/2) ) / (canvas_width/2);
    let webGL_y = - (y_position - (canvas_height/2) ) / (canvas_height/2);

    console.log(webGL_x, webGL_y);

        g_shapes.push({
            type: current_shape,
            x: webGL_x,
            y: webGL_y,
            dirX: dirX,
            dirY: dirY,
            size: g_size,
            segments: g_segments,
            r: g_r,
            g: g_g,
            b: g_b,
            a: g_a
        });
   

    renderAllShapes();
}

function click(ev){
    isDrawing = true;
    lastDragX = ev.clientX;
    lastDragY = ev.clientY;
    addShapeFromEvent(ev, 0, 1);
}

function drag(ev){
    if (isDrawing) {
        let dx = ev.clientX - lastDragX;
        let dy = ev.clientY - lastDragY;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance >= DRAG_SPACING) {
            let dirX = dx / distance;
            let dirY = -dy / distance;
            lastDragX = ev.clientX;
            lastDragY = ev.clientY;
            addShapeFromEvent(ev, dirX, dirY);
        }
    }
}

function stopDrawing(){
    isDrawing = false;
    lastDragX = null;
    lastDragY = null;
}

function logDrawingData(){
    console.log("=== COPY THIS DRAWING DATA ===");
    console.log(JSON.stringify(g_shapes, null, 2));
}

function drawLiftoff(){
    g_shapes = JSON.parse(JSON.stringify(liftoffScene));
    renderAllShapes();
}

function main(){
    setupWebGL();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clear(gl.COLOR_BUFFER_BIT);
    connectVariablesToGLSL();
    renderAllShapes();

    canvas.onmousedown = click;
    canvas.onmousemove = drag;
    canvas.onmouseup = stopDrawing;
    canvas.onmouseleave = stopDrawing;
    let size_slider = document.getElementById("size_slider");
    let size_value = document.getElementById("size_value");
    let r_slider = document.getElementById("r_slider");
    let r_value = document.getElementById("r_value");
    let g_slider = document.getElementById("g_slider");
    let g_value = document.getElementById("g_value");
    let b_slider = document.getElementById("b_slider");
    let b_value = document.getElementById("b_value");
    let a_slider = document.getElementById("a_slider");
    let a_value = document.getElementById("a_value");
    let segments_slider = document.getElementById("segments_slider");
    let segments_value = document.getElementById("segments_value");
    let clear_button = document.getElementById("clear");
    let undo_button = document.getElementById("undo");
    let log_button = document.getElementById("log_drawing");
    let liftoff_button = document.getElementById("liftoff");
    let point_button = document.getElementById("point");
    let triangle_button = document.getElementById("triangle");
    let circle_button = document.getElementById("circle");

    size_slider.oninput = function() {
        g_size = Number(this.value);
        size_value.textContent = this.value;
    };

    r_slider.oninput = function() {
        g_r = Number(this.value) / 255;
        r_value.textContent = this.value;
    };
    g_slider.oninput = function() {
        g_g = Number(this.value) / 255;
        g_value.textContent = this.value;
    };
    b_slider.oninput = function() {
        g_b = Number(this.value) / 255;
        b_value.textContent = this.value;
    };
    a_slider.oninput = function() {
        g_a = Number(this.value) / 100;
        a_value.textContent = this.value;
    };
    segments_slider.oninput = function() {
        g_segments = Number(this.value);
        segments_value.textContent = this.value;
    };

    clear_button.onclick = function() {
        g_shapes = [];
        renderAllShapes();
    };
    undo_button.onclick = function() {
        g_shapes.pop();
        renderAllShapes();
    };
    log_button.onclick = logDrawingData;
    liftoff_button.onclick = drawLiftoff;

    point_button.onclick = function() {
        current_shape = "point";
    };

    triangle_button.onclick = function() {
        current_shape = "triangle";
    };

    circle_button.onclick = function() {
        current_shape = "circle";
    };





}
