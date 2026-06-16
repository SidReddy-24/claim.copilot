const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../frontend/src');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath);
    } else if (filePath.endsWith('.jsx') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('e6eef8')) {
        console.log(`Updating colors in: ${filePath}`);
        content = content.replace(/e6eef8/gi, 'f4f6fa');
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }
  }
}

walk(srcDir);
console.log('Finished updating colors!');
