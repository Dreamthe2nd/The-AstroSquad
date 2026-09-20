const fs = require('fs');
const JSZip = require('jszip');

async function testViewerEngine(filePath) {
  console.log('Testing viewer engine on:', filePath);
  const data = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(data);

  // 1. Preload media
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

  // 2. Find slides
  const slideKeys = Object.keys(zip.files).filter(k => /^ppt\/slides\/slide\d+\.xml$/.test(k));
  slideKeys.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)\.xml/)[1], 10);
    const numB = parseInt(b.match(/slide(\d+)\.xml/)[1], 10);
    return numA - numB;
  });

  console.log(`Found ${slideKeys.length} slides.`);
  for (let i = 0; i < slideKeys.length; i++) {
    const sKey = slideKeys[i];
    const slideNum = i + 1;
    const xml = await zip.files[sKey].async('text');
    const rKey = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
    const rels = {};
    if (zip.files[rKey]) {
      const relXml = await zip.files[rKey].async('text');
      const relMatches = relXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g);
      for (const rm of relMatches) {
        rels[rm[1]] = rm[2].replace('../media/', '');
      }
    }

    // Check pictures
    const picMatches = [...xml.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g)];
    const images = [];
    for (const pm of picMatches) {
      const pXml = pm[1];
      const blipMatch = pXml.match(/<a:blip[^>]+r:embed="([^"]+)"/);
      if (blipMatch && rels[blipMatch[1]]) {
        const target = rels[blipMatch[1]];
        if (mediaMap[target]) {
          images.push(target);
        }
      }
    }

    // Title
    const titleMatch = xml.match(/<p:sp>(?:(?!<\/p:sp>)[\s\S])*?<p:ph type="title"[^>]*\/>(?:(?!<\/p:sp>)[\s\S])*?<a:t>([^<]+)<\/a:t>/i)
      || xml.match(/<p:sp>(?:(?!<\/p:sp>)[\s\S])*?<p:ph type="ctrTitle"[^>]*\/>(?:(?!<\/p:sp>)[\s\S])*?<a:t>([^<]+)<\/a:t>/i)
      || xml.match(/<a:t>([^<]+)<\/a:t>/);
    const title = titleMatch ? titleMatch[1].trim() : `Slide ${slideNum}`;

    if (i < 5 || i >= slideKeys.length - 2) {
      console.log(`Slide ${slideNum}: title="${title}", images count=${images.length} (${images.join(', ')})`);
    }
  }
}

async function run() {
  await testViewerEngine('C:/Users/h1465/Documents/AstroSquad/Learning-Material/hubbles-law-spectroscopy-project-plan.pptx');
  await testViewerEngine('C:/Users/h1465/Documents/AstroSquad/Learning-Material/exoplanet-transit-project-plan-1788629271763.pptx');
}

run();
