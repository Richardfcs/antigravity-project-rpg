
import fs from 'fs';

function findUnbalanced(path) {
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split('\n');
    let stack = [];
    
    // Simplistic tag matcher
    const tagRegex = /<\/?(div|section|article|button)(?:\s+[^>]*?)?>/g;
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let match;
        while ((match = tagRegex.exec(line)) !== null) {
            const tag = match[0];
            if (tag.startsWith('</')) {
                const tagName = tag.slice(2, -1).split(/\s|>/)[0];
                if (stack.length === 0) {
                    console.log(`${path}:${i+1} Extra closing tag ${tag}`);
                } else {
                    const last = stack.pop();
                    if (last.name !== tagName) {
                        console.log(`${path}:${i+1} Mismatched closing tag ${tag}, expected </${last.name}> (opened at ${last.line})`);
                        // Push back to keep going
                        // stack.push(last);
                    }
                }
            } else if (!tag.endsWith('/>')) {
                const tagName = tag.split(/\s|>/)[1];
                stack.push({ name: tagName, line: i + 1 });
            }
        }
    }
    
    for (const open of stack) {
        console.log(`${path}:${open.line} Unclosed tag <${open.name}>`);
    }
}

const files = [
    'c:/Users/richa/Documents/Programação 2026.1/antigravity-project/apps/daimyo-vtt/src/components/panels/maps-panel.tsx',
    'c:/Users/richa/Documents/Programação 2026.1/antigravity-project/apps/daimyo-vtt/src/components/panels/scenes-panel.tsx'
];

for (const file of files) {
    findUnbalanced(file);
}
