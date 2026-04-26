
import fs from 'fs';

function traceTags(path, tagName) {
    console.log(`Tracing <${tagName}> in ${path}...`);
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split('\n');
    let balance = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const openMatches = line.match(new RegExp(`<${tagName}(\\s|>)`, 'g')) || [];
        const closeMatches = line.match(new RegExp(`</${tagName}>`, 'g')) || [];
        const oldBalance = balance;
        balance += openMatches.length;
        balance -= closeMatches.length;
        if (balance !== oldBalance) {
            // console.log(`${i + 1}: ${balance} | ${line.trim().slice(0, 50)}`);
            if (balance < 0) {
                console.log(`NEGATIVE BALANCE at line ${i + 1}: ${balance}`);
            }
        }
    }
    console.log(`Final balance for <${tagName}>: ${balance}`);
}

const files = [
    'c:/Users/richa/Documents/Programação 2026.1/antigravity-project/apps/daimyo-vtt/src/components/panels/maps-panel.tsx',
    'c:/Users/richa/Documents/Programação 2026.1/antigravity-project/apps/daimyo-vtt/src/components/panels/scenes-panel.tsx'
];

for (const file of files) {
    traceTags(file, 'div');
    traceTags(file, 'section');
}
