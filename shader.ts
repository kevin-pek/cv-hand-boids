import vertexShaderSource from './shaders/sobel_vert.glsl';
import fragmentShaderSource from './shaders/sobel_frag.glsl';
import { lineVertices, handCoordinates } from '.';

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

  // define a_position for vertex shader, we render the entire coordinate space [-1, 1]
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
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Set the texture size uniform
  const textureSizeLocation = gl.getUniformLocation(program, 'u_textureSize');

  // get location of the hand coordinates
  const handCoordinatesLocation = gl.getUniformLocation(program, 'u_detHandCoord');

  // set the line drawing coordinate buffer
  const lineBuffer = gl.createBuffer();

  function render(gl: WebGLRenderingContext, program: WebGLProgram, videoElement: HTMLVideoElement) {
    if (!gl) throw new Error('WebGL context is null');
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // update location of the hand coordinates
    gl.uniform2fv(handCoordinatesLocation, handCoordinates.map((coord, i) => {
      // normalise to 0-1 range, even indices are x coords
      return i % 2 === 0 ? coord / videoElement.videoWidth : coord / videoElement.videoHeight;
    }));

    gl.uniform2f(textureSizeLocation, videoElement.videoWidth, videoElement.videoHeight);

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

    // draw main video quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // update the buffer with the new array of coordinate pairs to draw lines
    if (lineVertices.length > 0) {
      console.log('drawing lines');
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
      const lineVerticesNorm = new Float32Array(lineVertices.map((coord, i) =>
        // normalise to 0-1 range, even indices are x coords
        i % 2 === 0 ? (coord / videoElement.videoWidth - 0.5) * 2 : (coord / videoElement.videoHeight - 0.5) * 2
      ));
      console.debug(lineVerticesNorm);
      gl.bufferData(gl.ARRAY_BUFFER, lineVerticesNorm, gl.STATIC_DRAW);
      gl.drawArrays(gl.LINES, 0, lineVertices.length / 2);
    }

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
