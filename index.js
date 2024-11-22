async function startCamera(videoElement) {
  try {
    // Request access to the user's camera
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    
    // Attach the stream to the video element
    videoElement.srcObject = stream;
    videoElement.play();
  } catch (error) {
    console.error("Error accessing camera: ", error);
    alert("Unable to access your camera. Please ensure permissions are granted.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const videos = document.querySelectorAll("video[data-camera-feed]");

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    videos.forEach(video => {
      startCamera(video);
    });
  } else {
    alert("Camera feed is not supported in this browser.");
  }
});
