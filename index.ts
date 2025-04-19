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
export let handCoordinates = placeholderHandCoordinates; // set these to placeholder values first so nothing gets rendered

// TODO: convert this to use worker threads for better performance
let hands: handPoseDetection.Hand[] = new Array();
async function runPoseDetection(videoElement: HTMLVideoElement) {
  if (!detector) return;
  hands = await detector.estimateHands(videoElement);
  if (hands.length > 0) console.debug(hands);
  if (hands.length > 0) {
    handCoordinates = new Float32Array(hands.flatMap(hand => hand.keypoints.flatMap(keypoint => [keypoint.x, keypoint.y])));
    console.debug(handCoordinates)
   } else
    handCoordinates = placeholderHandCoordinates;
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
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;

  if (!video || !canvas) {
    alert("Error: Could not find video or canvas element!");
    return;
  }

  try {
    await initDetector();
    await startCamera(video);

    await runPoseDetection(video);
    const render = setupWebGL(canvas, video);
    requestAnimationFrame(render);
  } catch (error) {
    console.error("Error starting application:", error);
    alert("An error occurred while starting the application.");
  }
});

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

function drawFrame(canvas: HTMLCanvasElement, scale = 1) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context!');
  // Clear the canvas and redraw black background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0, 0, 0, 0.95)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (hands.length > 0) {
    const l = 5;
    ctx.strokeStyle = 'white';
    ctx.font = '5px Arial';
    hands.forEach((hand) => {
      // Draw mesh
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

      connections.forEach(([start, end]) => {
        const startPoint = hand.keypoints[start];
        const endPoint = hand.keypoints[end];
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
      });

      // Draw keypoints and mesh
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
      });
    });  }

  requestAnimationFrame(() => drawFrame(canvas, scale));
}
