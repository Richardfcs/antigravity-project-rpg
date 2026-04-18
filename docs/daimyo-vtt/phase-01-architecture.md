# Daimyo VTT - Fase 1

## Objetivo
Erguer a base técnica do VTT em paralelo ao PWA legado, sem alterar o fluxo atual do app de consulta.

## Decisão de Estrutura
- O VTT entra como uma aplicação independente em `apps/daimyo-vtt`.
- O repositório raiz passa a atuar como workspace npm leve, apenas para facilitar scripts e instalação.
- O PWA existente continua intacto na raiz.

## Stack da Fase
- Next.js 16 + React 19
- TailwindCSS 4
- Zustand para layout, sessão ativa e presença temporária
- Supabase configurado com clients `browser`, `server` e `admin`
- Cloudinary configurado com rota de assinatura para uploads diretos
- `react-resizable-panels` para o shell estilo VS Code do mestre

## Fronteira da Fase 1
Esta fase entrega apenas infraestrutura e shell visual:
- landing page do VTT
- shell do mestre
- shell do jogador
- rotas utilitárias (`health`, `cloudinary/sign`)
- stores, tipos e helpers de integração

Itens intencionalmente adiados:
- autenticação
- lobby real
- realtime Supabase
- upload final de assets
- mapas, teatro, áudio, chat e atlas
