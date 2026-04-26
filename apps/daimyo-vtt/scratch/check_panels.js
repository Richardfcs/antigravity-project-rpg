
import fs from 'fs';

function check(path) {
    console.log(`Checking ${path}...`);
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split('\n');
    let balance = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const char of line) {
            if (char === '{' || char === '<' && line[line.indexOf(char)+1] !== '/') balance++;
            if (char === '}' || char === '<' && line[line.indexOf(char)+1] === '/') balance--;
        }
        // This simple check is not perfect for JSX but let's try a simpler one
    }
}

// Actually, let's just count { and } for now as most JSX is inside { }
function checkBraces(path) {
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split('\n');
    let balance = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let lineBalance = 0;
        for (const char of line) {
            if (char === '{') { balance++; lineBalance++; }
            if (char === '}') { balance--; lineBalance--; }
        }
        if (line.includes('<article') || line.includes('<section') || line.includes('<div') || line.includes('<p') || line.includes('<span') || line.includes('<button') || line.includes('<input')) {
            // Very rough tag check
        }
    }
    console.log(`${path} final brace balance: ${balance}`);
}

checkBraces('c:/Users/richa/Documents/Programação 2026.1/antigravity-project/apps/daimyo-vtt/src/components/panels/maps-panel.tsx');
checkBraces('c:/Users/richa/Documents/Programação 2026.1/antigravity-project/apps/daimyo-vtt/src/components/panels/scenes-panel.tsx');
