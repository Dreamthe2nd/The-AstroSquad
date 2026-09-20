const fs = require('fs');
const JSZip = require('jszip');

async function checkMedia() {
  const data = fs.readFileSync('C:/Users/h1465/Documents/AstroSquad/Learning-Material/hubbles-law-spectroscopy-project-plan.pptx');
  const zip = await JSZip.loadAsync(data);
  const mediaFiles = Object.keys(zip.files).filter(k => k.startsWith('ppt/media/'));
  for (const m of mediaFiles) {
    const u8 = await zip.files[m].async('uint8array');
    console.log(m, 'size:', u8.length);
  }
}
checkMedia();
