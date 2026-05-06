import { PDFParse } from 'pdf-parse';
import fs from 'fs';

async function run() {
  const data = fs.readFileSync('package.json'); // not a pdf, but just testing initialization
  try {
    const parser = new PDFParse({ data });
    console.log(parser);
  } catch (e) {
    console.error(e);
  }
}
run();
