const fs = require('fs');
const JSZip = require('jszip');

const SCALE_X = 1920 / 12192000;
const SCALE_Y = 1080 / 6858000;

async function parseSlideElements(filePath) {
  const data = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(data);

  // 1. Preload media
  const mediaMap = {};
  for (const [p, file] of Object.entries(zip.files)) {
    if (p.startsWith('ppt/media/')) {
      const ext = p.split('.').pop().toLowerCase();
      let mime = 'image/png';
      if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
      else if (ext === 'gif') mime = 'image/gif';
      else if (ext === 'webp') mime = 'image/webp';
      else if (ext === 'svg') mime = 'image/svg+xml';
      mediaMap[p.replace('ppt/media/', '')] = `[data:${mime};base64,...]`;
    }
  }

  // Parse slide 3
  const xml = await zip.files['ppt/slides/slide3.xml'].async('text');
  const spMatches = [...xml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)];
  console.log('Slide 3 has shapes:', spMatches.length);
  for (let i = 0; i < spMatches.length; i++) {
    const sp = spMatches[i][1];
    const offMatch = sp.match(/<a:off x="(\d+)" y="(\d+)"\/>/);
    const extMatch = sp.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
    if (!offMatch || !extMatch) continue;
    const x = Math.round(parseInt(offMatch[1]) * SCALE_X);
    const y = Math.round(parseInt(offMatch[2]) * SCALE_Y);
    const w = Math.round(parseInt(extMatch[1]) * SCALE_X);
    const h = Math.round(parseInt(extMatch[2]) * SCALE_Y);

    const isEllipse = sp.includes('prst="ellipse"');
    const fillMatch = sp.match(/<a:solidFill><a:srgbClr val="([A-Fa-f0-9]{6})"\/>/);
    const fill = fillMatch ? '#' + fillMatch[1] : null;

    const tMatches = [...sp.matchAll(/<a:t>([^<]+)<\/a:t>/g)];
    const text = tMatches.map(m => m[1]).join(' ');
    console.log(`Shape ${i}: pos=(${x},${y}) size=(${w}x${h}) ${isEllipse ? 'ELLIPSE ' + fill : (fill ? 'FILL ' + fill : '')} ${text ? 'TEXT: "' + text.slice(0, 40) + '"' : ''}`);
  }
}

parseSlideElements('C:/Users/h1465/Documents/AstroSquad/Learning-Material/hubbles-law-spectroscopy-project-plan.pptx');
