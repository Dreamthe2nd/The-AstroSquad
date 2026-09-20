const fs = require('fs');
const JSZip = require('jszip');

async function checkAll(filePath) {
  console.log('Inspecting:', filePath);
  const data = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(data);
  const slideKeys = Object.keys(zip.files).filter(k => /^ppt\/slides\/slide\d+\.xml$/.test(k));
  // Sort numerically
  slideKeys.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)\.xml/)[1], 10);
    const numB = parseInt(b.match(/slide(\d+)\.xml/)[1], 10);
    return numA - numB;
  });

  console.log('Total slides:', slideKeys.length);
  for (const sKey of slideKeys) {
    const slideNum = sKey.match(/slide(\d+)\.xml/)[1];
    const relKey = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
    let images = [];
    if (zip.files[relKey]) {
      const relText = await zip.files[relKey].async('text');
      const re = /Target="([^"]+)"/g;
      let m;
      while ((m = re.exec(relText)) !== null) {
        if (m[1].includes('media/')) {
          images.push(m[1].replace('../media/', ''));
        }
      }
    }
    // Also let's check text / title in slide xml
    const slideXml = await zip.files[sKey].async('text');
    const titleMatch = slideXml.match(/<p:sp>(?:(?!<\/p:sp>)[\s\S])*?<p:ph type="title"[^>]*\/>(?:(?!<\/p:sp>)[\s\S])*?<a:t>([^<]+)<\/a:t>/i) 
      || slideXml.match(/<p:sp>(?:(?!<\/p:sp>)[\s\S])*?<p:ph type="ctrTitle"[^>]*\/>(?:(?!<\/p:sp>)[\s\S])*?<a:t>([^<]+)<\/a:t>/i)
      || slideXml.match(/<a:t>([^<]+)<\/a:t>/);
    const title = titleMatch ? titleMatch[1] : `Slide ${slideNum}`;

    console.log(`Slide ${slideNum}: images=[${images.join(', ')}] | title="${title}"`);
  }
}

async function run() {
  await checkAll('C:/Users/h1465/Documents/AstroSquad/Learning-Material/hubbles-law-spectroscopy-project-plan.pptx');
  console.log('----------------------------------------------------');
  await checkAll('C:/Users/h1465/Documents/AstroSquad/Learning-Material/exoplanet-transit-project-plan-1788629271763.pptx');
}

run();
