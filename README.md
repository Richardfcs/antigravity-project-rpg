# ⚔️ Escudo do Daimyo (PWA)

**Escudo do Daimyo** é um Companion App robusto e nativo da web, desenvolvido especialmente para Mestres de RPG que utilizam o sistema **GURPS 4ª Edição** em ambientações de Japão Feudal (como *A Era das Espadas Quebradas*). 

Este aplicativo transforma o seu navegador em uma central de comando para o mestre, com automação de regras complexas, gestão de iniciativa e ferramentas narrativas, tudo funcionando de forma **totalmente offline**.

---

## 🌟 Funcionalidades Principais

### 1. Rastreador de Iniciativa (Combat Tracker)
Gestão dinâmica de turnos baseada em **Velocidade Básica** e **DX/IQ**. 
- Adição rápida de combatentes e controle de HP/PF.
- Aplicação automática de **Penalidades de Choque (-4)**, **Ferimentos Graves** e **Risco de Morte**.
- Gestão de condições (Bleeding, Stun, etc).

### 2. Calculadora de Dano GURPS 4e
Automação completa do cálculo de ferimento:
- Suporte a todos os tipos de dano (**cut, imp, cr, pi-, pi+, pi++**).
- Multiplicadores por localização de hit (**Skull, Face, Torso, Vitals, Limbs**).
- Integração de RD (Resistência a Dano) de armaduras.

### 3. Gerador Procedural de Inimigos (IA/Regras) 🎲
Criação instantânea de NPCs com um clique:
- **Níveis de Ameaça**: Capanga, Elite e Mestre.
- **Arsenal Dinâmico**: O gerador equipa automaticamente armas compatíveis do banco de dados `weaponsDB`.
- **Nomes Japoneses**: Geração de nomes e sobrenomes autênticos.
- **Oráculo Narrativo**: Cada inimigo vem com uma personalidade e motivação aleatória para improvisos rápidos.

### 4. Ferramentas de Narrativa (GM Tools)
Exclusivo na página inicial para fácil acesso:
- **Anotações do Mestre**: Notas que persistem localmente entre sessões.
- **Relógios de Campanha (Progress Clocks)**: Gestão de eventos, progresso de vilões ou perigos ambientais.
- **Combate em Massa**: Resolução rápida de guerras e escaramuças.

### 5. Biblioteca e Arsenal
Base de dados completa e centralizada de:
- **Arsenal**: Armas brancas, arcos, armaduras e itens ninja.
- **Biblioteca**: Referência rápida para Vantagens, Desvantagens e Regras de Sistema (Kegare, O Véu, etc).
- **Herdeiro/Legado**: Sistema para registrar mortes heroicas e herança de itens.

---

## 📱 PWA & Experiência Nativa

O projeto foi construído como um **Progressive Web App**:
- **Offline First**: Graças ao Service Worker (`sw.js`), o app funciona integralmente sem internet após o primeiro acesso.
- **Instalável**: Pode ser adicionado à tela inicial do Android/iOS, removendo a barra de endereço do navegador e operando em tela cheia.
- **Identidade Visual**: Ícones gerados via IA com temática de máscara Daimyo e tema visual rubro-negro refinado.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, Vanilla CSS (Design Premium/Dark Mode).
- **Lógica**: JavaScript Puro (ES6) - Sem dependências externas para garantir performance instantânea.
- **Persistência**: LocalStorage (Sincronização entre abas e sessões).
- **PWA**: Web App Manifest e Service Worker (Stale-While-Revalidate).

---

## 📂 Estrutura de Arquivos

```text
/
├── index.html              # Central de Combate e GM Tools
├── library.html            # Biblioteca de Referência
├── equipment-database.html # Arsenal e Catálogo
├── time-management.html    # Relógios e Log de Legado
├── js/
│   ├── header-loader.js    # Injeção de UI e Registro PWA
│   ├── weapons-data.js     # Banco de Dados de Itens
│   ├── library-data.js     # Referência de Regras
│   ├── enemy-generator.js  # Motor Procedural
│   └── narrative-tools.js  # Lógica de Relógios e Notas
├── sw.js                   # Service Worker (Motor Offline)
└── manifest.json           # Manifesto PWA
```

---

## ⛩️ Como Instalar
1. Acesse o URL do projeto (ou abra o `index.html` via Live Server).
2. No Chrome/Safari, selecione "Compartilhar" ou o ícone de instalação na barra de busca.
3. Escolha **"Adicionar à Tela de Início"**.
4. Abra o **Escudo do Daimyo** como um aplicativo nativo!

---
*Desenvolvido em parceria com Antigravity Kit — Elevando a experiência do mestre à era das espadas.*
