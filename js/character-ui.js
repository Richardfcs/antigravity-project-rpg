/**
 * 📜 CharacterUI - Registro de Bushido 2.0
 * Gerencia a interface de fichas dentro do Drawer do Combat Calculator.
 */
const CharacterUI = {
    state: {
        view: 'list', // 'list', 'create', 'edit', 'ancestors'
        editingId: null
    },

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    init() {
        console.log("📜 CharacterUI - Iniciado");
        window.toggleCharacterDrawer = this.toggleDrawer.bind(this);
        this.render();
    },

    toggleDrawer() {
        const drawer = document.getElementById('character-drawer');
        if (!drawer) return;
        drawer.classList.toggle('open');
        if (drawer.classList.contains('open')) {
            this.state.view = 'list';
            this.render();
        }
    },

    render() {
        const container = document.getElementById('character-drawer-content');
        if (!container) return;

        const allChars = CharacterManager.loadAll() || [];
        const actives = allChars.filter(c => !c.isLegacy);
        const ancestors = allChars.filter(c => c.isLegacy);

        if (this.state.view === 'list') {
            this.renderList(container, actives, ancestors.length);
        } else if (this.state.view === 'create' || this.state.view === 'edit') {
            this.renderForm(container);
        } else if (this.state.view === 'ancestors') {
            this.renderAncestors(container, ancestors);
        }
    },

    renderList(container, actives, ancestorCount) {
        if (actives.length === 0 && ancestorCount === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:30px 10px; border:1px dashed var(--border-panel); border-radius:var(--radius);">
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:15px;">Nenhum samurai cadastrado no Santuário.</p>
                    <a href="characters-sheet.html" class="btn btn-sm btn-gold" style="padding:10px; font-size:0.75rem; text-decoration:none; display:inline-block;">📜 Criar Primeiro Samurai</a>
                </div>
            `;
            return;
        }

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 class="field__label">Samurais Ativos</h3>
                <button class="btn btn-sm btn-gold" onclick="CharacterUI.setView('create')" style="padding: 5px 10px; font-size:0.7rem;">＋ Novo</button>
            </div>
            <div class="char-list">
                ${actives.map(c => this.getCharCardHtml(c)).join('')}
            </div>
        `;

        if (ancestorCount > 0) {
            html += `
                <button class="btn btn-ghost" onclick="CharacterUI.setView('ancestors')" style="width:100%; margin-top:20px; font-size:0.7rem;">
                    🪦 Ver Memórias dos Ancestrais (${ancestorCount})
                </button>
            `;
        }

        container.innerHTML = html;
    },

    getCharCardHtml(c) {
        const attrs = c.attributes || {};
        const dfns = c.defenses || {};
        
        const esq = dfns.dodge || Math.floor(((attrs.dx || 10) + (attrs.ht || 10)) / 4 + 3);
        const apr = dfns.parry || 8;

        return `
            <div class="char-card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span class="char-card__name">${this.escapeHtml(c.name)}</span>
                    <span style="font-size:0.65rem; color:var(--text-muted); opacity:0.8;">${this.escapeHtml(c.clan) || 'Ronin'}</span>
                </div>
                <!-- 8 STATS GRID -->
                <div class="char-card__stats" style="grid-template-columns: repeat(4, 1fr); row-gap: 10px;">
                    <div><span style="display:block; opacity:0.6; font-size:0.6rem;">ST</span><strong>${attrs.st || 10}</strong></div>
                    <div><span style="display:block; opacity:0.6; font-size:0.6rem;">DX</span><strong>${attrs.dx || 10}</strong></div>
                    <div><span style="display:block; opacity:0.6; font-size:0.6rem;">IQ</span><strong>${attrs.iq || 10}</strong></div>
                    <div><span style="display:block; opacity:0.6; font-size:0.6rem;">HT</span><strong>${attrs.ht || 10}</strong></div>
                    
                    <div><span style="display:block; opacity:0.6; font-size:0.6rem;">PV</span><strong style="color:var(--red-accent)">${attrs.hp || 10}</strong></div>
                    <div><span style="display:block; opacity:0.6; font-size:0.6rem;">PF</span><strong style="color:var(--gold)">${attrs.fp || 10}</strong></div>
                    <div><span style="display:block; opacity:0.6; font-size:0.6rem;">ESQ</span><strong style="color:var(--text-primary)">${esq}</strong></div>
                    <div><span style="display:block; opacity:0.6; font-size:0.6rem;">APR</span><strong style="color:var(--text-primary)">${apr}</strong></div>
                </div>

                <div style="font-size:0.65rem; color:var(--text-secondary); margin-top:12px; border-top:1px solid rgba(255,255,255,0.05); padding-top:6px; display:flex; align-items:center; gap:5px;">
                    <span style="opacity:0.5;">Equip:</span> ${c.equippedWeapon ? (typeof weaponsDB !== 'undefined' ? this.escapeHtml(weaponsDB.find(w=>w.id===c.equippedWeapon)?.nome || c.equippedWeapon) : this.escapeHtml(c.equippedWeapon)) : 'Mãos Nuas'}
                </div>
                <div class="char-card__actions">
                    <button class="btn btn-ghost" style="flex:1; font-size:0.6rem; padding:6px; border-color:var(--gold-glow); color:var(--gold);" onclick="CharacterUI.portToCombat('${c.id}')">⚔ Portar</button>
                    <button class="btn btn-ghost" style="flex:0.6; font-size:0.6rem; padding:6px;" onclick="CharacterUI.editChar('${c.id}')">📝 Editar</button>
                    <button class="btn btn-ghost" style="color:var(--red-accent); border-color:rgba(196,30,58,0.2); flex:0.4; font-size:0.6rem; padding:6px;" onclick="CharacterUI.markLegacy('${c.id}')">💀</button>
                </div>
            </div>
        `;
    },

    renderAncestors(container, ancestors) {
        container.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:20px;">
                <button class="btn btn-ghost" onclick="CharacterUI.setView('list')" style="padding:5px 10px;">⬅</button>
                <h3 class="field__label" style="color:var(--text-primary)">Túmulo dos Ancestrais</h3>
            </div>
            <div class="char-list">
                ${ancestors.length === 0 ? '<p style="text-align:center; font-size:0.8rem; color:var(--text-muted);">Nenhum ancestral registrado ainda.</p>' : 
                  ancestors.map(c => `
                    <div class="char-card ancestor-card">
                        <div class="char-card__name">${this.escapeHtml(c.name)} <span class="tag-dead">Legado</span></div>
                        <p style="font-size:0.7rem; color:var(--text-muted); margin-top:5px; font-style:italic;">"${this.escapeHtml(c.concept) || 'Guerreiro de honra imortal'}"</p>
                        <div class="char-card__actions">
                            <button class="btn btn-ghost" style="flex:1; font-size:0.6rem; color:var(--green-success);" onclick="CharacterUI.recover('${c.id}')">Restaurar</button>
                            <button class="btn btn-ghost" style="flex:1; font-size:0.6rem; color:var(--text-muted);" onclick="CharacterUI.deleteChar('${c.id}')">Apagar</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderForm(container) {
        const char = this.state.view === 'edit' ? CharacterManager.loadAll().find(c => c.id === this.state.editingId) : null;
        
        let weaponOptions = '<option value="">— Mãos Nuas —</option>';
        if (typeof weaponsDB !== 'undefined') {
            weaponOptions += weaponsDB.map(w => `<option value="${w.id}" ${char && char.equippedWeapon === w.id ? 'selected' : ''}>${w.nome} (${w.dano})</option>`).join('');
        }

        container.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:20px;">
                <button class="btn btn-ghost" onclick="CharacterUI.setView('list')" style="padding:5px 10px;">⬅</button>
                <h3 class="field__label" style="color:var(--gold)">${char ? 'Refinar Bushi' : 'Novo Samurai (Rápido)'}</h3>
            </div>
            
            <div class="field">
                <label class="field__label">Nome / Título</label>
                <input type="text" id="ui-char-name" class="field__input" value="${char ? this.escapeHtml(char.name) : ''}" placeholder="Ex: Miyamoto Musashi" style="text-align:left;">
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
                <div class="field">
                    <label class="field__label">ST (Força)</label>
                    <input type="number" id="ui-char-st" class="field__input" value="${char ? char.attributes.st : 10}">
                </div>
                <div class="field">
                    <label class="field__label">DX (Ataque)</label>
                    <input type="number" id="ui-char-dx" class="field__input" value="${char ? char.attributes.dx : 10}">
                </div>
                <div class="field">
                    <label class="field__label">IQ (Int)</label>
                    <input type="number" id="ui-char-iq" class="field__input" value="${char ? (char.attributes.iq || 10) : 10}">
                </div>
                <div class="field">
                    <label class="field__label">HT (Saúde)</label>
                    <input type="number" id="ui-char-ht" class="field__input" value="${char ? (char.attributes.ht || 10) : 10}">
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
                <div class="field">
                    <label class="field__label">PV (Vida)</label>
                    <input type="number" id="ui-char-hp" class="field__input" value="${char ? (char.attributes.hp) : 12}">
                </div>
                <div class="field">
                    <label class="field__label">PF (Fadiga)</label>
                    <input type="number" id="ui-char-fp" class="field__input" value="${char ? (char.attributes.fp || 10) : 10}">
                </div>
            </div>

            <div class="field" style="margin-top:10px;">
                <label class="field__label">Arma Inicial</label>
                <select id="ui-char-weapon" class="field__select">
                    ${weaponOptions}
                </select>
            </div>

            <div style="margin-top:20px; display:flex; gap:10px;">
                <button class="btn btn-primary" style="flex:1" onclick="CharacterUI.saveChar()">${char ? '📜 Selar' : '⚔️ Convocar'}</button>
                <button class="btn btn-ghost" style="flex:1" onclick="CharacterUI.setView('list')">Cancelar</button>
            </div>
            
            <div style="margin-top:10px; text-align:center;">
                <a href="characters-sheet.html${char ? '?id='+char.id : ''}" style="font-size:0.75rem; color:var(--text-secondary); text-decoration:none;">Ficha Completa ↗</a>
            </div>
        `;
    },

    setView(v) {
        this.state.view = v;
        if (v !== 'edit') this.state.editingId = null;
        this.render();
    },

    editChar(id) {
        this.state.view = 'edit';
        this.state.editingId = id;
        this.render();
    },

    saveChar() {
        const name = document.getElementById('ui-char-name').value;
        const st = parseInt(document.getElementById('ui-char-st').value) || 10;
        const dx = parseInt(document.getElementById('ui-char-dx').value) || 10;
        const iq = parseInt(document.getElementById('ui-char-iq').value) || 10;
        const ht = parseInt(document.getElementById('ui-char-ht').value) || 10;
        const hp = parseInt(document.getElementById('ui-char-hp').value) || 12;
        const fp = parseInt(document.getElementById('ui-char-fp').value) || 10;
        const weaponId = document.getElementById('ui-char-weapon').value;

        if (!name) return alert("Ronin sem nome não tem honra.");

        const allChars = CharacterManager.loadAll() || [];
        let char;

        if (this.state.editingId) {
            char = allChars.find(c => c.id === this.state.editingId);
        } else {
            char = CharacterManager.createNewCharacter();
            allChars.push(char);
        }

        char.name = name;
        char.attributes.st = st;
        char.attributes.dx = dx;
        char.attributes.iq = iq;
        char.attributes.ht = ht;
        char.attributes.hp = hp;
        char.attributes.fp = fp;
        char.equippedWeapon = weaponId;
        
        // Calcular defesas base se não existirem
        if (!char.defenses) {
            char.defenses = {
                dodge: Math.floor((dx + ht) / 4 + 3),
                parry: 8,
                block: 0
            };
        }

        CharacterManager.saveAll(allChars);
        this.setView('list');
    },

    markLegacy(id) {
        if (!confirm("Este samurai deixará o campo de batalha e se tornará um Ancestral (Legado). Continuar?")) return;
        const allChars = CharacterManager.loadAll();
        const char = allChars.find(c => c.id === id);
        if (char) {
            char.isLegacy = true;
            CharacterManager.saveAll(allChars);
            this.render();
        }
    },

    recover(id) {
        const allChars = CharacterManager.loadAll();
        const char = allChars.find(c => c.id === id);
        if (char) {
            char.isLegacy = false;
            CharacterManager.saveAll(allChars);
            CharacterUI.setView('list');
            alert(`${char.name} foi restaurado para os samurais ativos!`);
        } else {
            alert("Samurai não encontrado nos registros.");
        }
    },

    deleteChar(id) {
        if (!confirm("Apagar permanentemente este registro dos arquivos do Clã? Isso não pode ser desfeito.")) return;
        const allChars = CharacterManager.loadAll().filter(c => c.id !== id);
        CharacterManager.saveAll(allChars);
        this.render();
    },

    async portToCombat(id) {
        if (await CharacterManager.portToCombat(id)) {
            // Sincronizar stats com a calculadora se estivermos nela
            const char = CharacterManager.loadAll().find(c => c.id === id);
            
            // Tentar injetar automaticamente no Atacante da Calculadora
            const selAtk = document.getElementById('select-attacker-calc');
            if (selAtk) {
                // Forçar recarregamento do select se necessário
                if (window.loadAppState) await window.loadAppState();
                setTimeout(() => {
                    selAtk.value = id;
                    // Trigger custom logic to fill damage
                    const event = new Event('change');
                    selAtk.dispatchEvent(event);
                }, 100);
            }

            const event = new Event('daimyoStateUpdated');
            window.dispatchEvent(event);
            if (char) {
                alert(`${char.name} portado para a Calculadora com sucesso!`);
            } else {
                alert("Samurai portado com sucesso.");
            }
        }
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => CharacterUI.init());
