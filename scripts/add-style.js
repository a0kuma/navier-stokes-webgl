const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');
const marker = '<!-- hide-unwanted-elements -->';
const styleSnippet = `${marker}\n<style>\n#indicators {\n  display: none;\n}\n\n#canvas-buttons-column {\n  display: none;\n}\n</style>`;

if (!html.includes(marker)) {
  html = html.replace('</head>', `${styleSnippet}\n</head>`);
  fs.writeFileSync(filePath, html, 'utf8');
  console.log('Added style to hide indicators and canvas buttons.');
} else {
  console.log('Hide style already applied.');
}
