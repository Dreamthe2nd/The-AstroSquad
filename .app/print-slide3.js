const fs = require('fs');
const JSZip = require('jszip');

async function printSlide3() {
  const data = fs.readFileSync('C:/Users/h1465/Documents/AstroSquad/Learning-Material/hubbles-law-spectroscopy-project-plan.pptx');
  const zip = await JSZip.loadAsync(data);
  console.log(await zip.files['ppt/slides/slide3.xml'].async('text'));
}
printSlide3();
