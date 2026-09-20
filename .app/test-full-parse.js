const fs = require('fs');
const JSZip = require('jszip');

async function testFullParse() {
  const t0 = Date.now();
  const data = fs.readFileSync('C:/Users/h1465/Documents/AstroSquad/Learning-Material/hubbles-law-spectroscopy-project-plan.pptx');
  const zip = await JSZip.loadAsync(data);

  // 1. Preload media images
  const mediaMap = {};
  for (const [path, file] of Object.entries(zip.files)) {
    if (path.startsWith('ppt/media/')) {
      const ext = path.split('.').pop().toLowerCase();
      let mime = 'image/png';
      if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
      else if (ext === 'gif') mime = 'image/gif';
      else if (ext === 'webp') mime = 'image/webp';
      else if (ext === 'svg') mime = 'image/svg+xml';
      const base64 = await file.async('base64');
      mediaMap[path.replace('ppt/media/', '')] = `data:${mime};base64,${base64}`;
    }
  }

  // 2. Parse slides
  const slideKeys = Object.keys(zip.files).filter(k => /^ppt\/slides\/slide\d+\.xml$/.test(k));
  slideKeys.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)\.xml/)[1], 10);
    const numB = parseInt(b.match(/slide(\d+)\.xml/)[1], 10);
    return numA - numB;
  });

  console.log(`Parsed ${slideKeys.length} slides and ${Object.keys(mediaMap).length} media items in ${Date.now() - t0}ms`);
}

testFullParse();
