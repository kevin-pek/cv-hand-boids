import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import vertexShaderSource from './shaders/sobel_vert.glsl';
import fragmentShaderSource from './shaders/sobel_frag.glsl';
import { handCoordinates } from '.';

export function setupWebGL(canvas: HTMLCanvasElement, videoElement: HTMLVideoElement) {
  const gl = canvas.getContext('webgl');
  if (!gl) {
    throw new Error('WebGL not supported');
  }

  // Set canvas dimensions to match the desired resolution
  const scale = window.devicePixelRatio || 1;
  canvas.width = videoElement.videoWidth * scale;
  canvas.height = videoElement.videoHeight * scale;

  // Set the WebGL viewport to match the canvas dimensions
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Create program from the shaders
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    throw new Error('Could not create program');
  }

  // define a_position buffer for vertex shader
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const positions = [
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  const texCoords = [
    0, 0,
    1, 0,
    0, 1,
    1, 1,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Set the texture size uniform
  const textureSizeLocation = gl.getUniformLocation(program, 'u_textureSize');
  gl.useProgram(program);
  gl.uniform2f(textureSizeLocation, videoElement.videoWidth, videoElement.videoHeight);

  function render(gl: WebGLRenderingContext, program: WebGLProgram, videoElement: HTMLVideoElement) {
    if (!gl) throw new Error('WebGL context is null');
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // get location of the hand coordinates
    const handCoordinatesLocation = gl.getUniformLocation(program, 'u_detectedHandCoordinates');
    gl.useProgram(program);
    gl.uniform2fv(handCoordinatesLocation, handCoordinates.map((coord, i) => {
      return i % 2 === 0 ? coord / videoElement.videoWidth : coord / videoElement.videoHeight;
    }));

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);

    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElement);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(() => render(gl, program, videoElement));
  }

  return () => render(gl, program, videoElement);
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Could not create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const infoLog = gl.getShaderInfoLog(shader);
    console.error('Shader compilation failed:', infoLog);
    console.error('Shader source:', source);
    gl.deleteShader(shader);
    throw new Error('Could not create shader');
  }
  return shader;
}

// Function to draw hands using WebGL
export function drawHands(gl: WebGLRenderingContext, program: WebGLProgram, hands: handPoseDetection.Hand[]) {
  gl.useProgram(program);

  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], // Thumb to wrist
    [5, 6], [6, 7], [7, 8], // Index finger
    [5, 9], // Wrist to index base
    [9, 10], [10, 11], [11, 12], // Middle finger
    [9, 13], // Wrist to middle base
    [13, 14], [14, 15], [15, 16], // Ring finger
    [13, 17], // Wrist to ring base
    [0, 17], // Wrist to pinky base
    [1, 5], [1, 17], // Thumb base to index and pinky base
    [17, 18], [18, 19], [19, 20]  // Pinky finger
  ];

  hands.forEach((hand) => {
    connections.forEach(([start, end]) => {
      const startPoint = hand.keypoints[start];
      const endPoint = hand.keypoints[end];

      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      const positions = new Float32Array([
        startPoint.x, startPoint.y,
        endPoint.x, endPoint.y
      ]);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

      const positionLocation = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.LINES, 0, 2);
    });
  });
}