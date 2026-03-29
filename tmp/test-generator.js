
const fs = require('fs');
const path = require('path');

// Mock window object
global.window = {};
global.weaponsDB = []; 

// Load the file
const scriptPath = path.join(__dirname, 'js', 'enemy-generator.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Replace UI-dependent parts of the IIFE
const modifiedContent = scriptContent.replace('typeof window.LibraryManager !== \'undefined\'', 'false');

eval(modifiedContent);

const results = [];
for (let i = 0; i < 50; i++) {
    const enemy = window.EnemyGenerator.generate('capanga');
    results.push({
        name: enemy.name,
        esquiva: enemy.esquiva,
        aparar: enemy.aparar,
        bloqueio: enemy.bloqueio,
        notas: enemy.notas
    });
}

console.log("=== TESTE DE GERAÇÃO (50 NPCs) ===");
console.table(results.slice(0, 10)); // Exibir os primeiros 10
const uniqueNames = new Set(results.map(r => r.name.split(' (')[0])).size;
console.log(`Nomes Únicos: ${uniqueNames}/50`);
const hasShieldCount = results.filter(r => r.bloqueio > 0).length;
console.log(`Inimigos com Escudo: ${hasShieldCount}/50`);
