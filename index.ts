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
  modelType: 'full'
};
let detector;

// Initialize the hand pose detector
async function initialiseDetector() {
  detector = await handPoseDetection.createDetector(model, detectorConfig);
  console.log("Hand pose detector initialized.");
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

// Individual particle systems for each fingertip
const particleSystems = new Map<string, ParticleSystem>();

// Detect hand poses and render on canvas
async function detectHandPoses(videoElement, canvasElement) {
  const ctx = canvasElement.getContext('2d');
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  // Flip the canvas for a mirrored view
  ctx.translate(canvasElement.width, 0);
  ctx.scale(-1, 1);

  async function detect() {
    const hands = await detector.estimateHands(videoElement);

    // Clear the canvas
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw semi-transparent black rectangle
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; // Adjust opacity as needed
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    if (hands.length > 0) {
      hands.forEach((hand) => {
        hand.keypoints.forEach((point) => {
          if (fingertips.has(point.name)) {
            // Update or create particle system
            if (!particleSystems.has(point.name)) {
              particleSystems.set(point.name, new ParticleSystem(point.x, point.y));
            }
            const system = particleSystems.get(point.name);
            if (!system) return;

            const x = canvasElement.width - point.x;
            const y = point.y;
            system.targetX = x;
            system.targetY = y;
            system.update();
            system.draw(ctx);

            // Draw circles on detected fingertips
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
          }
        });
      });
    } else {
      particleSystems.forEach((system) => {
        system.update();
        system.draw(ctx);
      });
    }    

    requestAnimationFrame(detect);
  }

  detect();
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
    detectHandPoses(video, canvas);
  } else {
    alert("Camera feed is not supported in this browser.");
  }
});
