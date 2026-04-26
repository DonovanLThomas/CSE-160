let canvas;
let gl;

let a_Position;
let u_FragColor;
let u_ModelMatrix;

let u_GlobalRotation;
let gAnimalGlobalRotation = 0;
let gAnimalGlobalXRotation = 0;
let gFrontNearUpperLegAngle = 0;
let gFrontNearLowerLegAngle = 0;
let gFrontNearFootAngle = 0;
let gFrontFarUpperLegAngle = 0;
let gFrontFarLowerLegAngle = 0;
let gFrontFarFootAngle = 0;
let gBackNearUpperLegAngle = 0;
let gBackNearLowerLegAngle = 0;
let gBackNearFootAngle = 0;
let gBackFarUpperLegAngle = 0;
let gBackFarLowerLegAngle = 0;
let gBackFarFootAngle = 0;
let gTailBaseAngle = 0;
let gTailMiddleAngle = 0;
let gTailTipAngle = 0;

let g_seconds = 0;
let g_startTime = performance.now() / 1000.0;
let gAnimationOn = false;
let gPokeAnimation = false;
let gPokeStartTime = 0;
let gPokeBodyBounce = 0;
let gMouseDragging = false;
let gLastMouseX = 0;
let gLastMouseY = 0;


let VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'uniform mat4 u_ModelMatrix;\n' +
    'uniform mat4 u_GlobalRotation;\n' +
    'void main() {\n' +
    '  gl_Position = u_GlobalRotation * u_ModelMatrix * a_Position;\n' +
    '}\n';
    
let FSHADER_SOURCE =
    'precision mediump float;\n' +
    'uniform vec4 u_FragColor;\n' +
    'void main() {\n' +
    '  gl_FragColor = u_FragColor;\n' +
    '}\n';

function setupWebGL() {
    canvas = document.getElementById('webgl');
    gl = canvas.getContext('webgl');

    gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to initialize shaders.');
        return;
    }

    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    u_GlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');
}

function drawLeg(hipX, hipY, hipZ, upperAngle, lowerAngle, footAngle, footXOffset, footZOffset) {
    let hip = new Matrix4();
    hip.translate(hipX, hipY, hipZ);
    hip.rotate(upperAngle, 0, 0, 1);

    let upperLeg = new Cube();
    upperLeg.color = [0.4, 0.4, 0.4, 1.0];
    upperLeg.matrix = new Matrix4(hip);
    upperLeg.matrix.translate(0, -0.11, 0);
    upperLeg.matrix.scale(0.12, 0.22, 0.12);
    upperLeg.render();

    let knee = new Matrix4(hip);
    knee.translate(0, -0.22, 0);
    knee.rotate(lowerAngle, 0, 0, 1);

    let lowerLeg = new Cube();
    lowerLeg.color = [0.35, 0.35, 0.35, 1.0];
    lowerLeg.matrix = new Matrix4(knee);
    lowerLeg.matrix.translate(0, -0.09, 0);
    lowerLeg.matrix.scale(0.10, 0.18, 0.10);
    lowerLeg.render();

    let ankle = new Matrix4(knee);
    ankle.translate(0, -0.18, 0);
    ankle.rotate(footAngle, 0, 0, 1);

    let foot = new Cube();
    foot.color = [0.3, 0.3, 0.3, 1.0];
    foot.matrix = new Matrix4(ankle);
    foot.matrix.translate(footXOffset, -0.03, footZOffset);
    foot.matrix.scale(0.16, 0.06, 0.18);
    foot.render();
}

function drawTrunk(bodyBounce) {
    let trunk1 = new Cube();
    trunk1.color = [0.42, 0.42, 0.42, 1.0];
    trunk1.matrix.translate(-0.45, 0.1 + bodyBounce, 0);
    trunk1.matrix.scale(0.15, 0.08, 0.1);
    trunk1.render();

    let trunk2 = new Cube();
    trunk2.color = [0.42, 0.42, 0.42, 1.0];
    trunk2.matrix.translate(-0.57, 0.1 + bodyBounce, 0);
    trunk2.matrix.scale(0.1, 0.07, 0.1);
    trunk2.render();

    let trunk3 = new Cube();
    trunk3.color = [0.42, 0.42, 0.42, 1.0];
    trunk3.matrix.translate(-0.66, 0.07 + bodyBounce, 0);
    trunk3.matrix.scale(0.09, 0.065, 0.09);
    trunk3.render();

    let trunk4 = new Cube();
    trunk4.color = [0.42, 0.42, 0.42, 1.0];
    trunk4.matrix.translate(-0.73, 0.03 + bodyBounce, 0);
    trunk4.matrix.scale(0.08, 0.06, 0.085);
    trunk4.render();

    let trunk5 = new Cube();
    trunk5.color = [0.42, 0.42, 0.42, 1.0];
    trunk5.matrix.translate(-0.78, -0.02 + bodyBounce, 0);
    trunk5.matrix.scale(0.07, 0.055, 0.08);
    trunk5.render();

    let trunk6 = new Cube();
    trunk6.color = [0.42, 0.42, 0.42, 1.0];
    trunk6.matrix.translate(-0.80, -0.05 + bodyBounce, 0);
    trunk6.matrix.scale(0.065, 0.04, 0.075);
    trunk6.render();
}

function drawTail(bodyBounce) {
    let tailJoint = new Matrix4();
    tailJoint.translate(0.50, 0.08 + bodyBounce, 0);
    tailJoint.rotate(18 + gTailBaseAngle, 0, 0, 1);

    let tailBase = new Cylinder();
    tailBase.color = [0.42, 0.42, 0.42, 1.0];
    tailBase.matrix = new Matrix4(tailJoint);
    tailBase.matrix.translate(0.08, 0, 0);
    tailBase.matrix.scale(0.16, 0.045, 0.045);
    tailBase.render();

    let tailMiddleJoint = new Matrix4(tailJoint);
    tailMiddleJoint.translate(0.16, 0, 0);
    tailMiddleJoint.rotate(gTailMiddleAngle, 0, 0, 1);

    let tailMiddle = new Cylinder();
    tailMiddle.color = [0.38, 0.38, 0.38, 1.0];
    tailMiddle.matrix = new Matrix4(tailMiddleJoint);
    tailMiddle.matrix.translate(0.07, 0, 0);
    tailMiddle.matrix.scale(0.14, 0.038, 0.038);
    tailMiddle.render();

    let tailTipJoint = new Matrix4(tailMiddleJoint);
    tailTipJoint.translate(0.14, 0, 0);
    tailTipJoint.rotate(gTailTipAngle, 0, 0, 1);

    let tailTip = new Cylinder();
    tailTip.color = [0.30, 0.30, 0.30, 1.0];
    tailTip.matrix = new Matrix4(tailTipJoint);
    tailTip.matrix.translate(0.055, 0, 0);
    tailTip.matrix.scale(0.11, 0.03, 0.03);
    tailTip.render();
}

function connectSlider(id, updateValue) {
    document.getElementById(id).addEventListener('input', function() {
        updateValue(Number(this.value));
        renderScene();
    })
}

function updateRotationSliders() {
    document.getElementById('xRotationSlide').value = gAnimalGlobalXRotation;
    document.getElementById('yRotationSlide').value = gAnimalGlobalRotation;
}

function renderScene() {
     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let globalRotMat = new Matrix4();
    globalRotMat.rotate(gAnimalGlobalXRotation, 1, 0, 0);
    globalRotMat.rotate(gAnimalGlobalRotation, 0, 1, 0);
    gl.uniformMatrix4fv(u_GlobalRotation, false, globalRotMat.elements);
    let bodyBounce = 0;
    if (gAnimationOn) {
        bodyBounce = 0.03 * Math.sin(g_seconds * 6);
    }
    bodyBounce += gPokeBodyBounce;

    let body = new Cube();
    body.color = [0.5, 0.5, 0.5, 1.0];
    body.matrix.scale(0.8, 0.3, 0.4);
    body.matrix.translate(.2, bodyBounce, 0)
    body.render();

    let head = new Cube();
    head.color = [0.5, 0.5, 0.5, 1.0];
    head.matrix.translate(-0.3, 0.15 + bodyBounce, 0);
    head.matrix.scale(0.2, 0.2, 0.2);
    head.render();

    drawTrunk(bodyBounce);
    drawTail(bodyBounce);

    drawLeg(-0.1, -0.11 + bodyBounce, 0.13, gFrontNearUpperLegAngle, gFrontNearLowerLegAngle, gFrontNearFootAngle, -0.08, 0.03);
    drawLeg(-0.1, -0.11 + bodyBounce, -0.13, gFrontFarUpperLegAngle, gFrontFarLowerLegAngle, gFrontFarFootAngle, -0.08, -0.03);
    drawLeg(0.38, -0.11 + bodyBounce, 0.13, gBackNearUpperLegAngle, gBackNearLowerLegAngle, gBackNearFootAngle, -0.03, 0.03);
    drawLeg(0.38, -0.11 + bodyBounce, -0.13, gBackFarUpperLegAngle, gBackFarLowerLegAngle, gBackFarFootAngle, -0.03, -0.03);

}

function tick() {
    g_seconds = performance.now() / 1000.0 - g_startTime;

    updateAnimationAngles();

    renderScene();

    requestAnimationFrame(tick);
}

function updateAnimationAngles() {
    gPokeBodyBounce = 0;

    if (gAnimationOn) {
        let walkSpeed = g_seconds * 3;

        gFrontNearUpperLegAngle = 20 * Math.sin(walkSpeed);
        gFrontFarUpperLegAngle = 20 * Math.sin(walkSpeed + Math.PI);
        gBackNearUpperLegAngle = 20 * Math.sin(walkSpeed + Math.PI);
        gBackFarUpperLegAngle = 20 * Math.sin(walkSpeed);

        gFrontNearLowerLegAngle = 12 * Math.sin(walkSpeed + 1);
        gFrontFarLowerLegAngle = 12 * Math.sin(walkSpeed + Math.PI + 1);
        gBackNearLowerLegAngle = 12 * Math.sin(walkSpeed + Math.PI + 1);
        gBackFarLowerLegAngle = 12 * Math.sin(walkSpeed + 1);

        gFrontNearFootAngle = 10 * Math.sin(walkSpeed + 2);
        gFrontFarFootAngle = 10 * Math.sin(walkSpeed + Math.PI + 2);
        gBackNearFootAngle = 10 * Math.sin(walkSpeed + Math.PI + 2);
        gBackFarFootAngle = 10 * Math.sin(walkSpeed + 2);

        gTailBaseAngle = 15 * Math.sin(walkSpeed + 0.5);
        gTailMiddleAngle = 12 * Math.sin(walkSpeed + 1.2);
        gTailTipAngle = 10 * Math.sin(walkSpeed + 1.9);
    }

    if (gPokeAnimation) {
        let pokeTime = g_seconds - gPokeStartTime;
        let pokeDuration = 1.2;

        if (pokeTime > pokeDuration) {
            gPokeAnimation = false;
            gPokeBodyBounce = 0;
        } else {
            let pokeWave = Math.sin(Math.PI * pokeTime / pokeDuration);
            let shakeWave = Math.sin(pokeTime * 22);

            gPokeBodyBounce = 0.08 * pokeWave;
            gFrontNearUpperLegAngle = -25 * pokeWave;
            gFrontFarUpperLegAngle = -25 * pokeWave;
            gBackNearUpperLegAngle = 18 * pokeWave;
            gBackFarUpperLegAngle = 18 * pokeWave;
            gTailBaseAngle = 35 * pokeWave + 10 * shakeWave;
            gTailMiddleAngle = -25 * pokeWave;
            gTailTipAngle = 30 * shakeWave;
        }
    }
}

function main() {
    setupWebGL();
    connectVariablesToGLSL();
    canvas.onmousedown = function(ev) {
        if (ev.shiftKey) {
            gPokeAnimation = true;
            gPokeStartTime = g_seconds;
            return;
        }

        gMouseDragging = true;
        gLastMouseX = ev.clientX;
        gLastMouseY = ev.clientY;
    };

    canvas.onmousemove = function(ev) {
        if (!gMouseDragging) {
            return;
        }

        let dx = ev.clientX - gLastMouseX;
        let dy = ev.clientY - gLastMouseY;
        gLastMouseX = ev.clientX;
        gLastMouseY = ev.clientY;

        gAnimalGlobalRotation += dx * 0.5;
        gAnimalGlobalXRotation += dy * 0.5;
        gAnimalGlobalXRotation = Math.max(-45, Math.min(45, gAnimalGlobalXRotation));
        gAnimalGlobalRotation = Math.max(-180, Math.min(180, gAnimalGlobalRotation));
        updateRotationSliders();
        renderScene();
    };

    canvas.onmouseup = function() {
        gMouseDragging = false;
    };

    canvas.onmouseleave = function() {
        gMouseDragging = false;
    };

    document.getElementById('animationOnButton').onclick = function() {
    gAnimationOn = true;
    };

    document.getElementById('animationOffButton').onclick = function() {
        gAnimationOn = false;
        renderScene();
    };


    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    connectSlider('xRotationSlide', function(value) { gAnimalGlobalXRotation = value; });
    connectSlider('yRotationSlide', function(value) { gAnimalGlobalRotation = value; });
    connectSlider('frontNearUpperLegSlide', function(value) { gFrontNearUpperLegAngle = value; });
    connectSlider('frontNearLowerLegSlide', function(value) { gFrontNearLowerLegAngle = value; });
    connectSlider('frontNearFootSlide', function(value) { gFrontNearFootAngle = value; });
    connectSlider('tailBaseSlide', function(value) { gTailBaseAngle = value; });
    connectSlider('tailMiddleSlide', function(value) { gTailMiddleAngle = value; });
    connectSlider('tailTipSlide', function(value) { gTailTipAngle = value; });
    tick();
}
