import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-core';
// Register WebGL backend.
import '@tensorflow/tfjs-backend-webgl';
import '@mediapipe/hands';
import { inject } from '@vercel/analytics';
import { setupWebGL } from './shader';

inject();

// hand pose detection model
const model = handPoseDetection.SupportedModels.MediaPipeHands;
const detectorConfig: handPoseDetection.MediaPipeHandsMediaPipeModelConfig = {
  runtime: 'mediapipe', // or 'tfjs'
  solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
  modelType: 'lite'
};
let detector: handPoseDetection.HandDetector | null;

async function initDetector() {
  detector = await handPoseDetection.createDetector(model, detectorConfig);
  console.debug("Hand pose detector initialized.");
}

// detected hand pose data
const NUM_HAND_POINTS = 21;
const placeholderHandCoordinates = new Float32Array(NUM_HAND_POINTS * 2 * 2); // x + y coords, left + right hand
for (let i = 0; i < NUM_HAND_POINTS * 2; i++) {
  placeholderHandCoordinates[i * 2] = -1.0;
  placeholderHandCoordinates[i * 2 + 1] = -1.0;
}
// list of xy coordinates to draw detected hand pose points
// set these to placeholder values first so nothing gets rendered
export let handCoordinates = placeholderHandCoordinates;

// define list of indices to connect the different hand points
const handConnectionIndices = [
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
// list of xy coordinate pairs to draw lines, keep empty if no lines to draw
export let lineVertices = new Float32Array();
let hands: handPoseDetection.Hand[];

// TODO: convert this to use worker threads for better performance
async function runPoseDetection(videoElement: HTMLVideoElement) {
  if (!detector) return;
  hands = await detector.estimateHands(videoElement);
  if (hands.length > 0) {
    handCoordinates = new Float32Array(hands.flatMap(hand => hand.keypoints.flatMap(keypoint => [keypoint.x, keypoint.y])));
    lineVertices = new Float32Array(
      hands.flatMap((hand) =>
        handConnectionIndices.flatMap(([start, end]) =>
          [hand.keypoints[start].x, hand.keypoints[start].y, hand.keypoints[end].x, hand.keypoints[end].y])
    ));
    console.debug('Detected hands', hands);
    console.debug('line vertices', lineVertices);
  } else {
    handCoordinates = placeholderHandCoordinates;
    lineVertices = new Float32Array();
  }
  setTimeout(() => runPoseDetection(videoElement), 1000);
}

async function startCamera(videoElement: HTMLVideoElement) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
    await videoElement.play();
  } catch (error) {
    console.error("Error accessing camera: ", error);
    alert("Unable to access your camera. Please ensure permissions are granted.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const video = document.querySelector<HTMLVideoElement>("video[data-camera-feed]");
  const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
  const overlay = document.getElementById('overlay-canvas') as HTMLCanvasElement;

  if (!video || !canvas || !overlay) {
    alert("Error: Could not find video or canvas element!");
    return;
  }

  try {
    await initDetector();
    await startCamera(video);

    await runPoseDetection(video);
    const renderShaders = setupWebGL(canvas, video);
    const renderOverlay = setupOverlay(overlay, video, window.devicePixelRatio);
    const render = () => {
      renderShaders();
      renderOverlay();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  } catch (error) {
    console.error("Error starting application:", error);
    alert("An error occurred while starting the application.");
  }
});

function setupOverlay(canvas: HTMLCanvasElement, videoElement: HTMLVideoElement, scale = 1) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to get context!');

  canvas.width = videoElement.videoWidth * scale;
  canvas.height = videoElement.videoHeight * scale;
  ctx.scale(scale, scale);
  ctx.translate(canvas.width / scale, 0);
  ctx.scale(-1, 1);

  function renderOverlay() {
    if (!ctx) throw new Error('Context is no longer defined!');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const l = 5; // line width
    ctx.strokeStyle = 'white';
    ctx.font = '5px Arial';

    // draw line segments to make up the detected hand mesh
    for (let i = 0; i < lineVertices.length; i += 4) {
      ctx.beginPath();
      ctx.moveTo(lineVertices[i], lineVertices[i + 1]);
      ctx.lineTo(lineVertices[i + 2], lineVertices[i + 3]);
      ctx.stroke();
    }

    // draw text labels for detected hand points
    hands.forEach(hand =>
      hand.keypoints.forEach((point) => {
        // Draw a small square with label around the fingertips
        ctx.strokeRect(point.x - l / 2, point.y - l / 2, l, l);
        ctx.save();

        ctx.translate(canvas.width / scale, 0);
        ctx.scale(-1, 1);
        // Calculate the flipped x position
        const flippedX = canvas.width / scale - point.x;

        // Draw the text at the flipped position
        ctx.strokeText(poseNameToLabel.get(point.name ?? 'unknown') || 'unknown', flippedX - 2 * l, point.y - l);

        ctx.restore();
      })
    );
  }
  return renderOverlay
}


const poseNameToLabel = new Map(Object.entries({
  pinky_finger_tip: 'pinky fingertip',
  ring_finger_tip: 'ring fingertip',
  middle_finger_tip: 'middle fingertip',
  index_finger_tip: 'index fingertip',
  thumb_tip: 'thumb fingertip',
  wrist: 'wrist',
  thumb_cmc: 'thumb cmc',
  thumb_mcp: 'thumb mcp',
  thumb_ip: 'thumb ip',
  index_finger_mcp: 'index finger mcp',
  index_finger_pip: 'index finger pip',
  index_finger_dip: 'index finger dip',
  middle_finger_mcp: 'middle finger mcp',
  middle_finger_pip: 'middle finger pip',
  middle_finger_dip: 'middle finger dip',
  ring_finger_mcp: 'ring finger mcp',
  ring_finger_pip: 'ring finger pip',
  ring_finger_dip: 'ring finger dip',
  pinky_finger_mcp: 'pinky finger mcp',
  pinky_finger_pip: 'pinky finger pip',
  pinky_finger_dip: 'pinky finger dip',
  unknown: 'unknown',
}));
