---
name: auto-sync-dashboard
description: Sincroniza automaticamente o dashboard.html (Deivid, Rafael ou template-aluno) toda vez que o arquivo registro-aulas.md for atualizado, ou quando o usuário solicitar "atualiza o dashboard" ou "sincronizar". Monitora o diário de bordo e atualiza métricas, fases, histórico de aulas, radar de erros e vocabulário.
---

# Skill de Atualização Automática do Dashboard

Esta skill garante que o `dashboard.html` de qualquer aluno reflita com fidelidade imediata o conteúdo do `registro-aulas.md`.

## Quando Esta Skill é Acionada
1. **Automático:** Toda vez que um arquivo `registro-aulas.md` for criado ou editado por qualquer ferramenta no Antigravity (via lifecycle hook `PostToolUse` em `.agents/hooks.json`).
2. **Por Solicitação do Usuário:** Quando o usuário pedir:
   - *"atualiza o dashboard"*
   - *"sincroniza o registro de aulas"*
   - *"atualiza o progresso do Rafael / Deivid"*
   - *"inicia a sincronização contínua"*

---

## Como Executar a Sincronização

### 1. Sincronização Imediata (One-shot)
Para sincronizar todos os alunos imediatamente após registrar uma aula:
```powershell
python sync_dashboards.py
```

Para sincronizar apenas um aluno específico:
```powershell
python sync_dashboards.py Rafael
# ou
python sync_dashboards.py Deivid
```

### 2. Modo Sentinela em Segundo Plano (Watch Mode)
Para manter o dashboard atualizando sozinho em tempo real enquanto o usuário ou professor edita o arquivo:
```powershell
python sync_dashboards.py --watch
```
*O script monitora as alterações no `registro-aulas.md` a cada 2 segundos e atualiza o `dashboard.html` em menos de 100ms.*

---

## O Que É Atualizado Automaticamente
- **Métricas:** Total de aulas (`Aula N / 144`), semana atual e fase pedagógica (1 a 4).
- **Trilha das 4 Fases:** Progresso percentual e contagem de aulas na fase atual (`N / 36`).
- **Rotina Semanal Fixa:** Marcação visual dos dias concluídos (`✓ Concluída`) e indicação da próxima aula (`▶ Próxima Aula`).
- **Histórico de Aulas:** Todos os cards das sessões em ordem cronológica reversa (com temas, vocabulário com pronúncia falada 🔊, correções de frases e observações).
- **Radar de Erros:** Identificação e compilação de todas as armadilhas fonéticas e gramaticais registradas pelo professor.
- **Banco de Vocabulário:** Consolidação de todas as novas palavras aprendidas para treino e busca.

---

## Sincronização Direta no Navegador
Lembre sempre ao aluno que o `dashboard.html` possui:
- Botão **"📂 Conectar registro-aulas.md"** (na barra superior).
- Suporte a **Drag & Drop** (basta soltar o `registro-aulas.md` na janela do navegador).
- Auto-carregamento dos dados salvos no navegador (`localStorage`).
