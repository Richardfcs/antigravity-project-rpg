/**
 * O SELO DO DAIMYO - Sistema de Backup e Sincronização
 * Permite exportar e importar todo o estado do localStorage da aplicação.
 */

window.DaimyoSeal = (function() {
  
  /**
   * Exporta todo o localStorage para um arquivo JSON.
   */
  function exportCampaign() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Formatar data e hora para o nome do arquivo
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.getHours().toString().padStart(2, '0') + '-' + 
                    now.getMinutes().toString().padStart(2, '0');
    
    const filename = `kamamura_backup_${dateStr}_${timeStr}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
    
    console.log('✨ O Selo do Daimyo: Campanha exportada com sucesso.');
  }

  /**
   * Importa um arquivo JSON e sobrescreve o localStorage.
   * @param {File} file - O arquivo JSON selecionado pelo usuário.
   */
  function importCampaign(file) {
    if (!file) return;

    if (!confirm('⚠️ ATENÇÃO: Importar um backup irá SOBRESCREVER todos os dados atuais (combatentes, notas, configurações). Deseja continuar?')) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        
        // Validação básica: verificar se contém chaves essenciais
        if (!data['daimyoShieldState'] && !data['daimyo-theme-preference']) {
            alert('❌ Erro: O arquivo selecionado não parece ser um backup válido do Escudo do Daimyo.');
            return;
        }

        // Limpar e aplicar novos dados
        localStorage.clear();
        for (const key in data) {
            localStorage.setItem(key, data[key]);
        }

        alert('✅ Campanha restaurada com sucesso! A página será recarregada.');
        window.location.reload();
        
      } catch (err) {
        console.error('Erro na importação:', err);
        alert('❌ Erro crítico ao processar o arquivo de backup.');
      }
    };
    
    reader.onerror = function() {
        alert('❌ Erro ao ler o arquivo selecionado.');
    };
    
    reader.readAsText(file);
  }

  return {
    exportCampaign,
    importCampaign
  };
})();
