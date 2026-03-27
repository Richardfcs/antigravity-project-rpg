const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filepath = path.join(dir, file);
  let content = fs.readFileSync(filepath, 'utf8');
  
  // Replace <header class="header"> ... </header>
  const regex = /<header class="header">.*?<\/header>/s;
  
  const replacement = '<div id="daimyo-header"></div>\n  <script src="js/header-loader.js"></script>';
  
  if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filepath, content, 'utf8');
    console.log('Processed:', file);
  } else {
    console.log('No header found in:', file);
  }
});
