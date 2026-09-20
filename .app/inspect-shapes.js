const fs = require('fs');
const JSZip = require('jszip');

async function checkDetails() {
  const data = fs.readFileSync('C:/Users/h1465/Documents/AstroSquad/Learning-Material/hubbles-law-spectroscopy-project-plan.pptx');
  const zip = await JSZip.loadAsync(data);
  for (let i = 1; i <= 27; i++) {
    const sKey = `ppt/slides/slide${i}.xml`;
    const xml = await zip.files[sKey].async('text');
    const pics = (xml.match(/<p:pic>/g) || []).length;
    const sps = (xml.match(/<p:sp>/g) || []).length;
    console.log(`Slide ${i}: pics=${pics}, shapes=${sps}`);
  }
}
checkDetails();
