const canvas = document.getElementById('example');
const ctx = canvas.getContext('2d');

function drawVector(v, color){
  let x = v.elements[0];
  let y = v.elements[1];
  
  let endx = 200 + (x * 20);
  let endy = 200 - (y * 20);

  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(200,200);
  ctx.lineTo(endx, endy);
  ctx.stroke();
}

function handleDrawEvent(){
  ctx.fillStyle='black';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const x1_input = document.getElementById('x1_input');
  const x1_value = parseFloat(x1_input.value);
  const y1_input = document.getElementById('y1_input');
  const y1_value = parseFloat(y1_input.value);

  let v1 = new Vector3([x1_value,y1_value,0]);
  drawVector(v1, "red");


  const x2_input = document.getElementById('x2_input');
  const x2_value = parseFloat(x2_input.value);
  const y2_input = document.getElementById('y2_input');
  const y2_value = parseFloat(y2_input.value);

  let v2 = new Vector3([x2_value,y2_value,0]);
  drawVector(v2, "blue");


}

function handleDrawOperationEvent(){
  let v3 = NaN
  ctx.fillStyle='black';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const x1_input = document.getElementById('x1_input');
  const x1_value = parseFloat(x1_input.value);
  const y1_input = document.getElementById('y1_input');
  const y1_value = parseFloat(y1_input.value);

  let v1 = new Vector3([x1_value,y1_value,0]);
  drawVector(v1, "red");


  const x2_input = document.getElementById('x2_input');
  const x2_value = parseFloat(x2_input.value);
  const y2_input = document.getElementById('y2_input');
  const y2_value = parseFloat(y2_input.value);

  let v2 = new Vector3([x2_value,y2_value,0]);
  drawVector(v2, "blue");

  const operation_selected = document.getElementById('operation');
  const operation_type = operation_selected.value;

  const scalar_selected = document.getElementById('scalar')
  const scalar = parseFloat(scalar_selected.value);

  if (operation_type == 'add'){
    v3 = v1.add(v2);
    drawVector(v3,"green")
  }

  else if (operation_type == 'sub'){
    v3 = v1.sub(v2);
    drawVector(v3,"green")
  }

  else if (operation_type == 'div'){
    v3 = v1.div(scalar);
    drawVector(v3, "green");
    v3 = v2.div(scalar);
    drawVector(v3, "green");
  }

  else if (operation_type == 'mul'){
    v3 = v1.mul(scalar);
    drawVector(v3, "green");
    v3 = v2.mul(scalar);
    drawVector(v3, "green");

  }
}

const drawButton = document.getElementById('Draw');
const drawOperationButton = document.getElementById('Draw_Op');

drawButton.onclick = handleDrawEvent;
drawOperationButton.onclick = handleDrawOperationEvent;


function main() {  
  ctx.fillStyle='black';
  ctx.fillRect(0,0,canvas.width,canvas.height);

}
