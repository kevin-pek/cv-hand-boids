import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-core';
// Register WebGL backend.
import '@tensorflow/tfjs-backend-webgl';
import '@mediapipe/hands';

const model = handPoseDetection.SupportedModels.MediaPipeHands;
const detectorConfig = {
  runtime: 'mediapipe', // or 'tfjs'
  solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
  modelType: 'lite'
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
    console.debug(hands)

    if (hands.length > 0) {
      hands.forEach((hand) => {
        const keypoints = hand.keypoints;

        // Draw keypoints
        keypoints.forEach((point) => {
          const x = canvasElement.width - point.x;
          const y = point.y;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = 'red';
          ctx.fill();
        });
      });
    }

    requestAnimationFrame(detect);
  }

  detect();
}

document.addEventListener("DOMContentLoaded", async () => {
  const videos = document.querySelectorAll("video[data-camera-feed]");

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    await initialiseDetector();

    videos.forEach(async (video) => {
      await startCamera(video);

      // Create a canvas overlay for each video
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = `${video.offsetTop}px`;
      canvas.style.left = `${video.offsetLeft}px`;
      canvas.style.width = `${video.offsetWidth}px`;
      canvas.style.height = `${video.offsetHeight}px`;
      document.body.appendChild(canvas);

      await detectHandPoses(video, canvas);
    });
  } else {
    alert("Camera feed is not supported in this browser.");
  }
});
