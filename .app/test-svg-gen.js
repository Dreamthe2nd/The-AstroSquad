const fs = require('fs');
const JSZip = require('jszip');

async function testSvgGen() {
  const data = fs.readFileSync('C:/Users/h1465/Documents/AstroSquad/Learning-Material/hubbles-law-spectroscopy-project-plan.pptx');
  const zip = await JSZip.loadAsync(data);

  // Parse slide 1, 2, 3
  for (const slideNum of [1, 2, 3, 12, 18, 22]) {
    const sKey = `ppt/slides/slide${slideNum}.xml`;
    const rKey = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
    const xml = await zip.files[sKey].async('text');
    let rels = {};
    if (zip.files[rKey]) {
      const relXml = await zip.files[rKey].async('text');
      const relMatches = relXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g);
      for (const rm of relMatches) {
        rels[rm[1]] = rm[2].replace('../media/', '');
      }
    }

    console.log(`Slide ${slideNum} rels:`, rels);
  }
}

testSvgGen();
