const form = document.getElementById('uploadForm');
const resultEl = document.getElementById('result');
const preview = document.getElementById('preview');

const startCamBtn = document.getElementById('startCam');
const stopCamBtn = document.getElementById('stopCam');
const captureBtn = document.getElementById('captureBtn');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');

let stream = null;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultEl.textContent = 'Predicting...';

  const input = document.getElementById('imageInput');
  if (!input.files || input.files.length === 0) {
    resultEl.textContent = 'Please choose an image.';
    return;
  }

  const file = input.files[0];
  await sendFileToPredict(file);
});

startCamBtn.addEventListener('click', async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
    video.style.display = 'block';
    startCamBtn.disabled = true;
    stopCamBtn.disabled = false;
    captureBtn.disabled = false;
    resultEl.textContent = '';
  } catch (err) {
    resultEl.textContent = 'Could not access camera: ' + err.message;
  }
});

stopCamBtn.addEventListener('click', () => {
  stopCamera();
});

captureBtn.addEventListener('click', async () => {
  if (!stream) {
    resultEl.textContent = 'Camera not started.';
    return;
  }

  
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);


  canvas.toBlob(async (blob) => {
    if (!blob) {
      resultEl.textContent = 'Capture failed.';
      return;
    }

    const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    preview.src = url;
    preview.style.display = 'block';

    await sendFileToPredict(file);

    
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/jpeg', 0.9);
});

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  video.srcObject = null;
  video.style.display = 'none';
  startCamBtn.disabled = false;
  stopCamBtn.disabled = true;
  captureBtn.disabled = true;
}

async function sendFileToPredict(file) {
  resultEl.textContent = 'Predicting...';
  const formData = new FormData();
  formData.append('image', file);

  try {
    const resp = await fetch('/predict', { method: 'POST', body: formData });
    const data = await resp.json();
    if (!resp.ok) {
      resultEl.textContent = 'Error: ' + (data.error || resp.statusText);
      document.getElementById('confidence').textContent = '';
    } else {
      resultEl.textContent = `Predicted age: ${data.age}`;
      document.getElementById('confidence').textContent = `(${data.confidence || 'verified'})`;
    }
  } catch (err) {
    resultEl.textContent = 'Network error: ' + err.message;
  }
}

