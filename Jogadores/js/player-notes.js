/**
 * 📓 PlayerNotes - Gerenciador de Anotações do Jogador
 * Versão simplificada e adaptada do NarrativeTools para a jornada do Ronin.
 */

const PlayerNotes = (function () {
  const STORE = 'vault';
  const KEY = 'player_notes';
  
  let notes = []; // { id, title, content }
  let activePageId = null;

  async function persistData() {
    if (!window.DaimyoDB) return;
    try {
      await window.DaimyoDB.put(STORE, KEY, notes);
    } catch (e) {
      console.error("PlayerNotes: Erro ao persistir no Cofre:", e);
    }
  }

  function addNotePage() {
    const title = prompt("Nome da nova página:", "Nova Anotação");
    if (!title) return;
    const newId = 'pnote_' + Date.now();
    notes.push({ id: newId, title: title, content: '' });
    activePageId = newId;
    persistData();
    renderUI();
    
    // Switch to editor on mobile
    if (window.innerWidth <= 768) {
        document.getElementById('notes-container').classList.add('view-editor');
    }
  }

  function deleteNotePage(id) {
    if (notes.length <= 1) {
        // Clear if only one
        const note = notes.find(n => n.id === id);
        if (note) {
            note.content = '';
            note.title = 'Minhas Crônicas';
            persistData();
            renderUI();
        }
        return;
    }
    if (!confirm("Excluir esta página permanentemente?")) return;
    notes = notes.filter(n => n.id !== id);
    if (activePageId === id) activePageId = notes[0].id;
    persistData();
    renderUI();
  }

  function renameNotePage(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    const newTitle = prompt("Novo nome:", note.title);
    if (!newTitle) return;
    note.title = newTitle;
    persistData();
    renderUI();
  }

  function switchNotePage(id) {
    activePageId = id;
    renderUI();
    
    // Switch to editor on mobile
    if (window.innerWidth <= 768) {
        document.getElementById('notes-container').classList.add('view-editor');
    }
  }

  function updateActiveNoteContent(content) {
    const note = notes.find(n => n.id === activePageId);
    if (note) {
      note.content = content;
      persistData();
      
      const status = document.getElementById('notes-status');
      if (status) {
        status.textContent = 'Salvando...';
        clearTimeout(window._pNoteSaveTimeout);
        window._pNoteSaveTimeout = setTimeout(() => {
          status.textContent = 'Sincronizado ✓';
        }, 500);
      }
    }
  }

  function parseMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br>');
  }

  function escapeHtml(text) {
    if (!text) return "";
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
  }

  function renderUI() {
    const nav = document.getElementById('notes-nav');
    const editor = document.getElementById('notes-editor');
    const preview = document.getElementById('notes-preview');
    if (!nav || !editor) return;

    // Render Tabs
    nav.innerHTML = notes.map(n => `
      <div class="note-tab ${n.id === activePageId ? 'active' : ''}" onclick="PlayerNotes.switchNotePage('${escapeHtml(n.id)}')">
        <span>${escapeHtml(n.title)}</span>
        <div class="note-tab-actions">
            <button onclick="event.stopPropagation(); PlayerNotes.renameNotePage('${escapeHtml(n.id)}')">✏️</button>
            <button onclick="event.stopPropagation(); PlayerNotes.deleteNotePage('${escapeHtml(n.id)}')">✕</button>
        </div>
      </div>
    `).join('');

    // Update Content
    const activeNote = notes.find(n => n.id === activePageId) || notes[0];
    if (activeNote) {
        editor.value = activeNote.content;
        if (preview && preview.style.display !== 'none') {
            preview.innerHTML = parseMarkdown(activeNote.content);
        }
    }
  }

  function togglePreview() {
    const editor = document.getElementById('notes-editor');
    const preview = document.getElementById('notes-preview');
    const btn = document.getElementById('btn-toggle-preview');
    
    if (preview.style.display === 'none') {
        preview.innerHTML = parseMarkdown(editor.value);
        preview.style.display = 'block';
        editor.style.display = 'none';
        btn.innerHTML = '✏️ Editar';
    } else {
        preview.style.display = 'none';
        editor.style.display = 'block';
        btn.innerHTML = '👁️ Preview';
    }
  }

  const init = async () => {
    if (!window.DaimyoDB) return;
    try {
      const saved = await window.DaimyoDB.get(STORE, KEY);
      if (saved && Array.isArray(saved)) {
        notes = saved;
      } else {
        notes = [{ id: 'pdefault', title: 'Diário de Viagem', content: '# Minhas Crônicas\nEscreva aqui suas observações sobre a campanha...' }];
      }

      if (!activePageId && notes.length > 0) activePageId = notes[0].id;
      
      // Sync Listener
      window.DaimyoDB.onSync(async (data) => {
        if (data.store === STORE && data.key === KEY) {
           notes = await window.DaimyoDB.get(STORE, KEY) || [];
           renderUI();
        }
      });

      renderUI();
      console.log("📓 PlayerNotes: Sincronizado.");
    } catch (e) {
      console.error("Erro ao inicializar PlayerNotes:", e);
    }
  };

  window.addEventListener('load', init);

  return { 
    addNotePage, deleteNotePage, renameNotePage, switchNotePage, 
    updateActiveNoteContent, togglePreview 
  };
})();
