# Checklist - Fase 1

- [x] Criar workspace `apps/daimyo-vtt`
- [x] Configurar `package.json` raiz com scripts do VTT
- [x] Adicionar `Next.js`, `Tailwind`, `Zustand`, `Supabase` e `Cloudinary`
- [x] Criar `.env.example`
- [x] Criar helpers base para Supabase e Cloudinary
- [x] Criar rota de assinatura Cloudinary
- [x] Criar rota de healthcheck
- [x] Criar shell visual do Mestre
- [x] Criar shell visual do Jogador
- [x] Registrar migration inicial do Supabase

## Validação esperada
- `npm run dev:vtt` sobe a aplicação
- `/` mostra a landing do Daimyo VTT
- `/session/AKAI-01/gm` mostra o shell do mestre
- `/session/AKAI-01/player` mostra o shell do jogador
- `/api/health` retorna status da infraestrutura
