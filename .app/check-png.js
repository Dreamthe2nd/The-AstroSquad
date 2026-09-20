const fs = require('fs');
const JSZip = require('jszip');

async function checkPngHeader() {
  const data = fs.readFileSync('C:/Users/h1465/Documents/AstroSquad/Learning-Material/hubbles-law-spectroscopy-project-plan.pptx');
  const zip = await JSZip.loadAsync(data);
  const u8_1 = await zip.files['ppt/media/image1.png'].async('uint8array');
  // PNG width and height are at bytes 16-23 (big endian 32-bit int)
  const view1 = new DataView(u8_1.buffer, u8_1.byteOffset, u8_1.byteLength);
  const w1 = view1.getUint32(16);
  const h1 = view1.getUint32(20);
  console.log('image1.png dimensions:', w1, 'x', h1);

  const u8_2 = await zip.files['ppt/media/image2.png'].async('uint8array');
  const view2 = new DataView(u8_2.buffer, u8_2.byteOffset, u8_2.byteLength);
  const w2 = view2.getUint32(16);
  const h2 = view2.getUint32(20);
  console.log('image2.png dimensions:', w2, 'x', h2);
}
checkPngHeader();
