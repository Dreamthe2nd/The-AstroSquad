const fs = require('fs');
const JSZip = require('jszip');

async function checkSlideXml() {
  const data = fs.readFileSync('C:/Users/h1465/Documents/AstroSquad/Learning-Material/hubbles-law-spectroscopy-project-plan.pptx');
  const zip = await JSZip.loadAsync(data);
  console.log('--- Slide 1 XML ---');
  console.log((await zip.files['ppt/slides/slide1.xml'].async('text')).slice(0, 1000));
  console.log('--- Slide 3 XML ---');
  console.log((await zip.files['ppt/slides/slide3.xml'].async('text')).slice(0, 1000));
}

checkSlideXml();
