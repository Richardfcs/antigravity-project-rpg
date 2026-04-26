
import fs from 'fs';

const content = fs.readFileSync('c:/Users/richa/Documents/Programação 2026.1/antigravity-project/apps/daimyo-vtt/src/app/actions/combat-actions.ts', 'utf8');
const lines = content.split('\n');

let balance = 0;
let inFunction = false;
const startLine = 563;
const endLine = 1358;

for (let i = startLine - 1; i < endLine; i++) {
    const line = lines[i];
    for (const char of line) {
        if (char === '{') balance++;
        if (char === '}') balance--;
    }
    console.log(`${i + 1}: ${balance} | ${line.trim().slice(0, 50)}`);
}
