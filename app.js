const nameInput = document.querySelector('#faculty-name');
const photoInput = document.querySelector('#portrait-upload');
const photo = document.querySelector('#portrait-image');
const placeholder = document.querySelector('#portrait-placeholder');
const namePreview = document.querySelector('#faculty-display');
const fileName = document.querySelector('#file-name');
const uploadLabel = document.querySelector('#upload-label');
const button = document.querySelector('#download-button');
const postcard = document.querySelector('#postcard');
const toast = document.querySelector('#toast');

let currentImageUrl = '';
let toastTimer;

function readyToExport() {
  return Boolean(nameInput.value.trim() && photoInput.files[0]);
}

function updateCard() {
  const name = nameInput.value.trim();
  namePreview.textContent = name || 'FACULTY NAME';
  button.disabled = !readyToExport();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3400);
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function drawCover(context, image, x, y, width, height) {
  const ratio = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * ratio;
  const drawHeight = image.naturalHeight * ratio;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawContained(context, image, x, y, width, height) {
  const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * ratio;
  const drawHeight = image.naturalHeight * ratio;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function renderPostcardCanvas(background, portrait) {
  const width = 1200;
  const height = 1800;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  drawCover(context, background, 0, 0, width, height);
  const shade = context.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, 'rgba(8, 0, 11, .64)');
  shade.addColorStop(.42, 'rgba(19, 7, 22, .12)');
  shade.addColorStop(1, 'rgba(8, 4, 14, .68)');
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);

  context.fillStyle = '#ff75d3';
  context.font = 'italic 700 155px Georgia, serif';
  context.textBaseline = 'top';
  context.fillText('JASHN', 120, 90);
  context.fillStyle = '#dcff65';
  context.font = '500 37px "DM Mono", monospace';
  context.fillText("CSB FRESHERS '26", 122, 240);

  // A larger centred cover crop creates a full, photo-first keepsake layout.
  drawCover(context, portrait, 72, 360, 1056, 1120);

  context.fillStyle = '#dcff65';
  context.font = '500 32px "DM Mono", monospace';
  context.fillText('THE GUEST', 122, 1568);
  const name = nameInput.value.trim().toUpperCase();
  let nameSize = 90;
  context.font = `700 ${nameSize}px "Space Grotesk", Arial, sans-serif`;
  while (context.measureText(name).width > 960 && nameSize > 46) {
    nameSize -= 2;
    context.font = `700 ${nameSize}px "Space Grotesk", Arial, sans-serif`;
  }
  context.fillStyle = '#ffffff';
  context.fillText(name, 120, 1620);
  return canvas;
}

nameInput.addEventListener('input', updateCard);

photoInput.addEventListener('change', () => {
  const [file] = photoInput.files;
  if (!file) return;
  if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);
  currentImageUrl = URL.createObjectURL(file);
  photo.src = currentImageUrl;
  photo.classList.add('active');
  placeholder.style.display = 'none';
  fileName.textContent = file.name;
  uploadLabel.classList.add('has-file');
  updateCard();
});

button.addEventListener('click', async () => {
  if (!readyToExport()) return;
  if (!window.jspdf) {
    showToast('PDF tools are still loading. Please try again in a moment.');
    return;
  }
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<span>Preparing your PDF…</span><span aria-hidden="true">•</span>';
  try {
    await document.fonts.ready;
    const [background, portrait] = await Promise.all([
      loadImage(new URL('disco-background.png', import.meta.url).href),
      loadImage(currentImageUrl),
    ]);
    const canvas = renderPostcardCanvas(background, portrait);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [4, 6], compress: true });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, 4, 6, undefined, 'FAST');
    const slug = nameInput.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'faculty';
    pdf.save(`jashn-${slug}-postcard.pdf`);
    showToast('Your faculty postcard PDF is ready.');
  } catch (error) {
    console.error(error);
    showToast('Could not create the PDF. Please try a smaller image.');
  } finally {
    button.innerHTML = original;
    button.disabled = !readyToExport();
  }
});
