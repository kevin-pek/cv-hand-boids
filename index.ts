import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-core';
// Register WebGL backend.
import '@tensorflow/tfjs-backend-webgl';
import '@mediapipe/hands';
import { ParticleSystem } from './particle';

const model = handPoseDetection.SupportedModels.MediaPipeHands;
const detectorConfig: handPoseDetection.MediaPipeHandsMediaPipeModelConfig = {
  runtime: 'mediapipe', // or 'tfjs'
  solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
  modelType: 'lite'
};
let detector;

// Initialize the hand pose detector
async function initialiseDetector() {
  detector = await handPoseDetection.createDetector(model, detectorConfig);
  console.debug("Hand pose detector initialized.");
}

// Start the camera
async function startCamera(videoElement) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
    await videoElement.play();
  } catch (error) {
    console.error("Error accessing camera: ", error);
    alert("Unable to access your camera. Please ensure permissions are granted.");
  }
}

// Define the names of the pose detection points we want to work with
const fingertips = new Set(['pinky_finger_tip', 'ring_finger_tip', 'middle_finger_tip', 'index_finger_tip', 'thumb_tip']);
const rgbColors = {
  'pinky_finger_tip': '255, 155, 50',
  'ring_finger_tip': '155, 255, 50',
  'middle_finger_tip': '50, 155, 255',
  'index_finger_tip': '255, 50, 155',
  'thumb_tip': '155, 50, 255'
}

// Individual particle systems for each fingertip
const particleSystems = new Map<string, ParticleSystem>();

let hands = new Array();
async function runPoseDetection(videoElement) {
  if (!detector) return
  hands = await detector.estimateHands(videoElement);
  setTimeout(() => runPoseDetection(videoElement), 50);
}

// Detect hand poses and render on canvas
function detectHandPoses(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) {
  const ctx = canvasElement.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  const scale = window.devicePixelRatio || 1;
  canvasElement.width = videoElement.videoWidth * scale;
  canvasElement.height = videoElement.videoHeight * scale;
  ctx.scale(scale, scale);

  // Flip the canvas for a mirrored view
  ctx.translate(canvasElement.width / scale, 0);
  ctx.scale(-1, 1);

  function drawFrame() {
    if (!ctx) throw new Error('Could not get canvas context');

    // Clear the canvas
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw semi-transparent black rectangle
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)"; // Adjust opacity as needed
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    ctx.globalCompositeOperation = 'lighter';

    if (hands.length > 0) {
      hands.forEach((hand) => {
        hand.keypoints.forEach((point) => {
          if (fingertips.has(point.name)) {
            // Update or create particle system for finger
            if (!particleSystems.has(point.name)) {
              particleSystems.set(point.name, new ParticleSystem(point.x, point.y, 100, rgbColors[point.name]));
            }
            const system = particleSystems.get(point.name);
            if (!system) return;

            system.update(canvasElement.width / scale, canvasElement.height / scale, point.x, point.y);
            system.draw(ctx);

            // Draw circles on detected fingertips if in dev environment
            if (process.env.NODE_ENV === 'development') {
              ctx.beginPath();
              ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
              ctx.fillStyle = 'red';
              ctx.fill();
            }
          }
        });
      });
    } else {
      particleSystems.forEach((system) => {
        system.update(canvasElement.width / scale, canvasElement.height / scale);
        system.draw(ctx);
      });
    }

    ctx.globalCompositeOperation = 'source-over';

    requestAnimationFrame(drawFrame);
  }

  drawFrame();
}

document.addEventListener("DOMContentLoaded", async () => {
  const video = document.querySelector<HTMLVideoElement>("video[data-camera-feed]");
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;

  if (!video || !canvas) {
    alert("Error: Could not find video or canvas element!");
    return;
  }

  if (navigator.mediaDevices) {
    await initialiseDetector();
    await startCamera(video);
    runPoseDetection(video);
    detectHandPoses(video, canvas);
  } else {
    alert("Camera feed is not supported in this browser.");
  }
});
