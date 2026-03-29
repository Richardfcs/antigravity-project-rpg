/**
 * ════════════ CÓDEX DE ESPÓLIOS E ALQUIMIA ════════════
 * Calculadora de Comerciante e Oráculo de Loot
 * Adiciona um sistema de "carrinho" com multiplicadores GURPS.
 */

// ════════════ ESTADO DO CARRINHO ════════════
const merchantState = {
  cart: [],
  modifierCondition: 1.0, // 0.5 = Sangue/Ferrugem
  modifierReaction: 1.0,  // 0.8 = Mercador Hostil (-20%), 1.0 = Normal, 1.2 = Bom (+20%)
  isOpen: false
};

// ════════════ TABELAS DO ORÁCULO DE LOOT ════════════
const lootTables = {
  moedas: [
    "3 Mon de Cobre (¥30)", "12 Mon de Cobre (¥120)", "1 Bu de Prata (¥400)",
    "2 Shu de Prata (¥200)", "Nada além de poeira", "1 Ryo de Ouro (¥4000) [Raro]"
  ],
  itens: [
    "1 Ofuda sujo", "1 Carta selada manchada de sangue", "Ração de viagem (1 refeição)",
    "Pederneira gasta", "Faca enferrujada (Dano -1, quebra fácil)",
    "Garrafa de Saquê pela metade", "Dado de madeira viciado",
    "Pó Cegante (1 uso)", "Corda de cânhamo descascada (3m)",
    "Amuleto (Omamori) rasgado"
  ],
  peculiaridades: [
    "Cheiro forte de saquê", "Marcas pontiagudas de dentes na moeda",
    "Cheio de sujeira e barro", "Escondido em um bolso falso"
  ]
};

// ════════════ LÓGICA PRINCIPAL ════════════

function initMerchant() {
  injectMerchantUI();
  attachCardEvents();
  updateCartUI();

  // Floating button event
  document.getElementById('merchant-fab').addEventListener('click', () => {
    toggleMerchantPanel();
  });

  // Controls
  document.getElementById('mod-condition').addEventListener('change', (e) => {
    merchantState.modifierCondition = e.target.checked ? 0.5 : 1.0;
    updateCartUI();
  });

  document.getElementById('mod-reaction').addEventListener('change', (e) => {
    merchantState.modifierReaction = parseFloat(e.target.value);
    updateCartUI();
  });

  document.getElementById('btn-loot-oracle').addEventListener('click', generateLoot);
  
  document.getElementById('btn-clear-cart').addEventListener('click', () => {
    merchantState.cart = [];
    updateCartUI();
  });

  document.getElementById('merchant-close').addEventListener('click', toggleMerchantPanel);
}

function parsePriceCents(custoStr) {
  // Converte string "$600" ou "¥600" para número inteiro. Extrai apenas os dígitos.
  if(!custoStr || custoStr === "-" || custoStr === "Varia") return 0;
  const numStr = custoStr.replace(/[^\d]/g, '');
  return parseInt(numStr, 10) || 0;
}

function formatPrice(num) {
  if(num === 0) return "-";
  return "$" + num.toFixed(0);
}

function addToCart(item) {
  const price = parsePriceCents(item.custo);
  if (price === 0 && (!item.custo || item.custo === "-")) {
    // If it literally has no price, we still add it but value is 0.
  }
  
  merchantState.cart.push({
    id: 'cart_' + Date.now() + Math.random(),
    nome: item.nome,
    basePrice: price,
    refCusto: item.custo
  });
  
  if (!merchantState.isOpen) {
    toggleMerchantPanel(true);
  } else {
    updateCartUI();
  }

  // Efeito visual no FAB
  const fab = document.getElementById('merchant-fab');
  fab.classList.add('pop');
  setTimeout(() => fab.classList.remove('pop'), 300);
}

function removeFromCart(cartId) {
  merchantState.cart = merchantState.cart.filter(i => i.id !== cartId);
  updateCartUI();
}

function updateCartUI() {
  const listEl = document.getElementById('cart-list');
  const totalEl = document.getElementById('cart-total');
  const badgeEl = document.getElementById('merchant-badge');

  listEl.innerHTML = '';
  let sum = 0;

  merchantState.cart.forEach(item => {
    sum += item.basePrice;
    
    const li = document.createElement('div');
    li.className = 'cart-item';
    li.innerHTML = `
      <div class="cart-item__info">
        <span class="cart-item__name">${item.nome}</span>
        <span class="cart-item__price">${item.refCusto}</span>
      </div>
      <button class="cart-item__del" onclick="removeFromCart('${item.id}')">✕</button>
    `;
    listEl.appendChild(li);
  });

  if (merchantState.cart.length === 0) {
    listEl.innerHTML = '<div class="cart-empty">Vazio. Clique em itens para adicionar aos espólios.</div>';
  }

  // Apply modifiers
  let finalTotal = sum * merchantState.modifierCondition * merchantState.modifierReaction;
  
  totalEl.innerHTML = `Base: ${formatPrice(sum)} <br> <span class="calc-final">Final: ${formatPrice(finalTotal)}</span>`;
  
  badgeEl.textContent = merchantState.cart.length;
  badgeEl.style.display = merchantState.cart.length > 0 ? 'flex' : 'none';
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateLoot() {
  const logEl = document.getElementById('oracle-log');
  
  const coin = getRandom(lootTables.moedas);
  const item1 = getRandom(lootTables.itens);
  let item2 = getRandom(lootTables.itens);
  while(item2 === item1) { item2 = getRandom(lootTables.itens); }
  const trait = getRandom(lootTables.peculiaridades);

  const lootMsg = `
    <div class="loot-entry anim-fade">
      <strong>📦 Espólios Encontrados:</strong>
      <ul>
        <li>${coin}</li>
        <li>${item1} (${trait})</li>
        <li>${item2}</li>
      </ul>
    </div>
  `;
  
  logEl.innerHTML = lootMsg + logEl.innerHTML;
}

function toggleMerchantPanel(forceOpen) {
  const panel = document.getElementById('merchant-panel');
  if (forceOpen === true) {
    merchantState.isOpen = true;
  } else if (forceOpen === false) {
    merchantState.isOpen = false;
  } else {
    merchantState.isOpen = !merchantState.isOpen;
  }
  
  panel.classList.toggle('merchant-panel--open', merchantState.isOpen);
}

// ════════════ INJEÇÃO DA UI & EVENTOS ════════════

function injectMerchantUI() {
  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    .merchant-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--bg-card);
      border: 1px solid var(--gold);
      color: var(--gold);
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.8);
      z-index: 1000;
      transition: transform 0.2s ease, background 0.2s ease;
    }
    .merchant-fab:hover {
      background: var(--bg-card-hover);
      transform: scale(1.05);
    }
    .merchant-fab.pop {
      transform: scale(1.2);
    }
    .merchant-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: var(--red-accent);
      color: white;
      font-size: 0.65rem;
      font-weight: bold;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--bg-deep);
    }
    .merchant-panel {
      position: fixed;
      top: 0;
      right: -350px;
      width: 320px;
      height: 100%;
      background: var(--bg-panel);
      border-left: 1px solid var(--border-panel);
      box-shadow: -4px 0 16px rgba(0,0,0,0.8);
      z-index: 1100;
      display: flex;
      flex-direction: column;
      transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: var(--font-body);
    }
    .merchant-panel--open {
      right: 0;
    }
    .merchant-header {
      padding: 16px;
      background: var(--bg-deep);
      border-bottom: 1px solid var(--border-panel);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .merchant-title {
      font-family: var(--font-display);
      font-weight: 700;
      color: var(--gold);
      font-size: 1rem;
    }
    .merchant-close {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.2rem;
      cursor: pointer;
    }
    .merchant-close:hover {
      color: var(--text-primary);
    }
    .merchant-body {
      padding: 16px;
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .cart-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .cart-empty {
      color: var(--text-muted);
      font-size: 0.8rem;
      text-align: center;
      padding: 20px 0;
      font-style: italic;
    }
    .cart-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-card);
      padding: 8px 12px;
      border-radius: var(--radius);
      border: 1px solid var(--border-panel);
    }
    .cart-item__info {
      display: flex;
      flex-direction: column;
      font-size: 0.8rem;
    }
    .cart-item__name {
      color: var(--text-primary);
      font-weight: 600;
    }
    .cart-item__price {
      color: var(--text-muted);
      font-size: 0.75rem;
    }
    .cart-item__del {
      background: none;
      border: none;
      color: var(--red-failure);
      cursor: pointer;
      font-size: 1rem;
      opacity: 0.7;
    }
    .cart-item__del:hover {
      opacity: 1;
    }
    .merchant-controls {
      background: var(--bg-card);
      padding: 12px;
      border-radius: var(--radius);
      border: 1px solid var(--border-panel);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .control-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
    .merchant-total {
      margin-top: auto;
      padding: 16px;
      background: var(--bg-deep);
      border-top: 1px solid var(--border-panel);
      text-align: right;
      font-weight: bold;
      font-size: 0.9rem;
      color: var(--text-muted);
    }
    .calc-final {
      color: var(--gold);
      font-size: 1.2rem;
    }
    .btn-merchant {
      width: 100%;
      padding: 8px;
      background: var(--bg-card-hover);
      color: var(--text-primary);
      border: 1px solid var(--border-input);
      border-radius: var(--radius);
      cursor: pointer;
      font-family: var(--font-body);
      font-weight: 600;
      transition: all var(--transition);
      margin-top: 8px;
    }
    .btn-merchant:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--gold);
    }
    .btn-merchant--gold {
      background: rgba(212, 168, 70, 0.1);
      border-color: rgba(212, 168, 70, 0.3);
      color: var(--gold);
    }
    .btn-merchant--gold:hover {
      background: rgba(212, 168, 70, 0.2);
    }
    .oracle-section {
      margin-top: 16px;
      border-top: 1px dashed var(--border-panel);
      padding-top: 16px;
    }
    .oracle-log {
      margin-top: 12px;
      font-size: 0.75rem;
      color: var(--text-secondary);
      max-height: 150px;
      overflow-y: auto;
    }
    .loot-entry {
      background: var(--bg-input);
      padding: 8px;
      border-radius: var(--radius);
      border-left: 2px solid var(--blue-steel);
      margin-bottom: 8px;
    }
    .loot-entry ul {
      margin: 4px 0 0 16px;
      padding: 0;
      color: var(--text-primary);
    }
    
    @media (max-width: 480px) {
      .merchant-panel {
        width: 100%;
        right: -100%;
      }
    }
  `;
  document.head.appendChild(style);

  // Inject HTML structure
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <!-- FAB BUTTON -->
    <button class="merchant-fab" id="merchant-fab" title="Códex de Comércio / Loot">
      ⚖️
      <div class="merchant-badge" id="merchant-badge" style="display:none;">0</div>
    </button>
    
    <!-- SIDE PANEL -->
    <aside class="merchant-panel" id="merchant-panel">
      <div class="merchant-header">
        <h3 class="merchant-title">Códex de Comércio</h3>
        <button class="merchant-close" id="merchant-close">✕</button>
      </div>
      
      <div class="merchant-body">
        
        <div class="cart-list" id="cart-list"></div>
        <button class="btn-merchant" id="btn-clear-cart" style="font-size:0.7rem;">Limpar Seleção</button>

        <div class="merchant-controls">
          <div class="control-row">
            <label for="mod-condition">Sucata / Ensanguentada (-50%)</label>
            <input type="checkbox" id="mod-condition">
          </div>
          <div class="control-row">
            <label for="mod-reaction">Reação Mercador</label>
            <select id="mod-reaction" style="background:var(--bg-input); color:white; border:1px solid var(--border-panel); border-radius:4px; padding:2px;">
              <option value="1.0">Normal / Neutro</option>
              <option value="0.8">Hostil (-20%)</option>
              <option value="1.2">Amigável (+20%)</option>
            </select>
          </div>
        </div>

        <div class="oracle-section">
          <h4 style="font-size:0.85rem; color:var(--text-primary); margin-bottom:8px;">🔮 Oráculo de Loot</h4>
          <button class="btn-merchant btn-merchant--gold" id="btn-loot-oracle">Gerar Bolsos de Bandido</button>
          <div class="oracle-log" id="oracle-log"></div>
        </div>

      </div>

      <div class="merchant-total" id="cart-total">
        Base: $0 <br> <span class="calc-final">Final: $0</span>
      </div>
    </aside>
  `;
  document.body.appendChild(wrapper);
}

function attachCardEvents() {
  // O engine de busca pode recriar o DOM dos cards a qualquer momento, e a gente não quer 
  // perder o bind do evento. A forma mais segura é delegar o clique para #content.
  const content = document.getElementById('content');
  if (content) {
    content.addEventListener('click', (e) => {
      const card = e.target.closest('.item-card');
      if (card) {
        // Encontrar os dados do card
        // O card possui o nome na tag .item-card__name
        const nameEl = card.querySelector('.item-card__name');
        if (nameEl) {
          const itemName = nameEl.textContent;
          // Procurar no banco de dados
          const itemData = window.findWeapon(itemName) || 
                           window.armorDB.find(a => a.nome === itemName) || 
                           window.gearDB.find(g => g.nome === itemName);
          if (itemData) {
            addToCart({ nome: itemData.nome, custo: itemData.custo });
          }
        }
      }
    });

    // Indicação visual que o card é clicável
    const style = document.createElement('style');
    style.textContent = `
      .item-card {
        cursor: pointer !important;
        position: relative;
      }
      .item-card::after {
        content: '+ Loot';
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 0.65rem;
        background: var(--gold);
        color: var(--bg-deep);
        padding: 2px 6px;
        border-radius: 4px;
        opacity: 0;
        transition: opacity 0.2s;
        font-weight: bold;
      }
      .item-card:hover::after {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }
}

// Inicializa quando o DOM estiver pronto e os scripts anteriores rodarem
document.addEventListener('DOMContentLoaded', () => {
  // Give priority to existant renders
  setTimeout(initMerchant, 100);
});
