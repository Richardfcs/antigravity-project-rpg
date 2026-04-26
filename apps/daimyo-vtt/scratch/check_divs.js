
import fs from 'fs';

function checkTags(path, tagName) {
    const content = fs.readFileSync(path, 'utf8');
    const openMatches = content.match(new RegExp(`<${tagName}(\\s|>)`, 'g')) || [];
    const closeMatches = content.match(new RegExp(`</${tagName}>`, 'g')) || [];
    console.log(`${path}: <${tagName}>=${openMatches.length}, </${tagName}>=${closeMatches.length}`);
}

const files = [
    'c:/Users/richa/Documents/Programação 2026.1/antigravity-project/apps/daimyo-vtt/src/components/panels/maps-panel.tsx',
    'c:/Users/richa/Documents/Programação 2026.1/antigravity-project/apps/daimyo-vtt/src/components/panels/scenes-panel.tsx'
];

for (const file of files) {
    checkTags(file, 'div');
}
