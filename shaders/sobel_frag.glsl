precision mediump float;

#define NUM_HAND_POINTS 21 // count no. keypoints in hand pose detection model
#define HAND_POINT_RADIUS 0.005

uniform sampler2D u_image;
uniform vec2 u_textureSize; // Add uniform for texture size
varying vec2 v_texCoord;
uniform vec2 u_detectedHandCoordinates[NUM_HAND_POINTS * 2];

void main() {
  vec2 texelSize = 1.0 / u_textureSize; // Use the uniform for texture size
  vec4 color = vec4(0.0);

  // Sobel kernel for edge detection
  float kernel[9];
  kernel[0] = -1.0; kernel[1] = -1.0; kernel[2] = -1.0;
  kernel[3] = -1.0; kernel[4] =  8.0; kernel[5] = -1.0;
  kernel[6] = -1.0; kernel[7] = -1.0; kernel[8] = -1.0;

  // check if pixel overlaps with any hand coordinates within a certain radius
  for (int i = 0; i < NUM_HAND_POINTS * 2; i++) {
    vec2 handPos = u_detectedHandCoordinates[i];
    float distance = length(v_texCoord - handPos);
    if (distance < HAND_POINT_RADIUS) {
      gl_FragColor = vec4(1.0);
      return;
    }
  }

  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      vec4 sample = texture2D(u_image, v_texCoord + vec2(i, j) * texelSize);
      color += sample * kernel[(i + 1) * 3 + (j + 1)];
    }
  }

  gl_FragColor = vec4(vec3(length(color.rgb)), 1.0); // Output the edge intensity
}