const fs = require('fs');
const path = require('path');

const targetFiles = [
  'index.html',
  'library.html',
  'equipment-database.html',
  'time-management.html',
  'oracle-generators.html',
  'kegare-panico.html',
  'combat-calculator.html'
];

const pwaTags = `
  <!-- PWA METATAGS -->
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#0A0A0A">
  <link rel="apple-touch-icon" href="icons/app-icon-192.png">
  <link rel="icon" type="image/png" href="icons/app-icon-192.png">
`;

targetFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`Arquivo não encontrado: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  const pwaComment = '<!-- PWA METATAGS -->';
  const startIdx = content.indexOf(pwaComment);
  
  if (startIdx !== -1) {
    // Busca o fim do bloco (próximo tag de fechamento de bloco ou </head>)
    const endIdx = content.indexOf('</head>', startIdx);
    if (endIdx !== -1) {
      // Substitui o bloco existente (do comentário até antes do </head>)
      const before = content.slice(0, startIdx);
      const after = content.slice(endIdx);
      content = before + pwaTags + after;
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`↻ PWA Tags atualizadas em ${file}`);
      return;
    }
  }

  // Se não existia, insere antes da tag </head>
  const headClosingIndex = content.indexOf('</head>');
  if (headClosingIndex !== -1) {
    content = content.slice(0, headClosingIndex) + pwaTags + content.slice(headClosingIndex);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✔ PWA Tags injetadas em ${file}`);
  } else {
    console.warn(`Tag </head> não encontrada em ${file}`);
  }
});

console.log('Injeção do PWA finalizada.');
