# Operação Contínua do Daimyo VTT

## Objetivo
Este guia fecha a rotina de uso contínuo da mesa:

- preparar e conduzir sessão
- exportar snapshot oficial
- restaurar snapshot sem perder a mídia remota
- ler o diagnóstico local da aba do mestre
- validar rapidamente a saúde do projeto

## Fluxo recomendado do mestre
1. Abra a mesa e confirme no `Conselho da sessão` se o palco e a trilha ativos estão corretos.
2. Use `Domínio` apenas para export, restore, limpeza e diagnóstico.
3. Antes de sessão importante, exporte um snapshot oficial.
4. Depois de mudanças grandes de preparo, exporte outro snapshot.
5. Se precisar recuperar a mesa, use `Domínio -> escolher snapshot -> restaurar snapshot`.

## O que o snapshot oficial guarda
- fotografia da sessão
- assets e retratos
- fichas
- cenas e elenco
- mapas e tokens
- atlas, pins e vínculos
- trilhas e estado do player
- conversa
- efeitos
- notas
- memória recente da sessão

## O que o snapshot não substitui
- participantes e vínculos de conta continuam pertencendo à sessão atual
- o restore reaplica o conteúdo jogável, não recria ownership nem auth

## Restore oficial
- o restore limpa os registros da mesa no banco antes de reaplicar o snapshot
- a limpeza usada no restore preserva a mídia remota do Cloudinary
- isso permite restaurar assets e trilhas já exportados sem quebrar URLs

## Diagnóstico da mesa
O painel `Diagnóstico da mesa` mostra:

- estado atual da sincronização
- latência textual da aba
- jogadores online
- volume resumido de dados carregados
- erros capturados por `window.error` e `unhandledrejection`
- checagem rápida de infra:
  - Supabase público
  - Service Role
  - Cloudinary
  - Lobby/Auth

## Comandos de verificação
Na raiz do repositório:

```powershell
npm.cmd run test:vtt
npm.cmd run typecheck:vtt
npm.cmd run lint:vtt
npm.cmd run build:vtt
```

## Checklist antes de sessão longa
- login do mestre funcionando
- jogador consegue entrar e seguir o palco
- troca de `teatro <-> mapa <-> atlas` sincroniza
- trilha toca, pausa e para sem drift
- atlas revela nome/detalhes em tempo real
- snapshot recente exportado

## Checklist depois de incidente
- abrir `Domínio -> Diagnóstico da mesa`
- conferir se a sincronização entrou em `degraded`
- exportar snapshot, se a mesa ainda estiver íntegra
- restaurar último snapshot estável, se necessário

## Mobile-first
- priorizar palco e ações curtas
- usar a biblioteca/apoio apenas quando necessário
- confirmar no celular:
  - login
  - ficha
  - conversa
  - palco imersivo

## Segurança operacional
- apenas mestre pode usar reset, limpeza e restore
- eventos privados e notas seguem fluxo protegido
- memória da sessão no jogador mostra apenas eventos públicos ou direcionados
