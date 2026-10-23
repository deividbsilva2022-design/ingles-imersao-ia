// dashboard-engine.js - Motor Dinâmico de Sincronização do Dashboard com registro-aulas.md

(function() {
  const isMed = document.title.includes('Rafael') || document.body.innerHTML.includes('Medicina');
  const studentType = isMed ? 'med' : 'physio';

  const PHASE_NAMES = {
    med: {
      1: 'Fundamentos Hospitalares',
      2: 'Anamnese & Semiologia',
      3: 'Raciocínio Diagnóstico',
      4: 'Passagem de Plantão & PBE'
    },
    physio: {
      1: 'Fundamentos da Saúde',
      2: 'Expressão Clínica',
      3: 'Raciocínio Clínico',
      4: 'Autonomia & PBE'
    }
  };

  const WEEK_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  // 1. Parser de Markdown do registro-aulas.md
  function parseRegistroAulas(md) {
    if (!md || !md.trim()) {
      return { classes: [], vocab: [], mistakes: [], currentWeek: 1, currentPhase: 1, totalClasses: 0 };
    }

    // Detectar última semana mencionada
    const weekMatches = [...md.matchAll(/##\s+Semana\s+(\d+)/gi)];
    let currentWeek = weekMatches.length > 0 ? parseInt(weekMatches[weekMatches.length - 1][1], 10) : 1;

    // Quebrar por aulas: ### Aula X
    const classBlocks = md.split(/(?=###\s+Aula\s+\d+)/i).filter(b => /###\s+Aula\s+\d+/i.test(b));

    const classes = [];
    const allVocab = [];
    const allMistakes = [];

    classBlocks.forEach(block => {
      const lines = block.trim().split('\n');
      const headerLine = lines[0] || '';

      // Regex para extrair: Aula [Num] - [Dia], [Data] (Fase [F] - [Tema])
      const headerMatch = headerLine.match(/###\s*Aula\s*(\d+)\s*[-–]\s*([^(]+?)(?:\s*\((?:Fase\s*(\d+)\s*[-–]\s*)?([^)]+)\))?$/i);
      const num = headerMatch ? parseInt(headerMatch[1], 10) : classes.length + 1;
      const dateStr = headerMatch ? headerMatch[2].trim() : '';
      const phaseNum = headerMatch && headerMatch[3] ? parseInt(headerMatch[3], 10) : Math.min(4, Math.ceil(num / 36) || 1);
      const topic = headerMatch && headerMatch[4] ? headerMatch[4].trim() : 'Prática Oral';

      let currentSection = null;
      const topics = [];
      const rawVocab = [];
      const rawMistakes = [];
      const observations = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (/^\*\*(?:Temas cobertos|Conteúdos?|Estruturas?):?\*\*/i.test(line)) {
          currentSection = 'topics';
          continue;
        }
        if (/^\*\*(?:Palavras novas|Vocabulário):?\*\*/i.test(line)) {
          currentSection = 'vocab';
          continue;
        }
        if (/^\*\*(?:Erros observados|Erros comuns|Erros e correções|Correções):?\*\*/i.test(line)) {
          currentSection = 'mistakes';
          continue;
        }
        if (/^\*\*(?:Observações|Observação|Notas|Feedback):?\*\*/i.test(line)) {
          currentSection = 'obs';
          continue;
        }

        if (currentSection === 'topics' && /^[-*]\s+/.test(line)) {
          topics.push(line.replace(/^[-*]\s+/, '').trim());
        } else if (currentSection === 'vocab') {
          const clean = line.replace(/^[-*]\s+/, '').trim();
          // Pode ser separado por vírgulas ou itens individuais
          const parts = clean.split(/,\s*(?=[a-zA-Z\s\/-]+(?:\(|$))/);
          parts.forEach(p => {
            if (p.trim()) rawVocab.push(p.trim());
          });
        } else if (currentSection === 'mistakes' && /^[-*]\s+/.test(line)) {
          rawMistakes.push(line.replace(/^[-*]\s+/, '').trim());
        } else if (currentSection === 'obs') {
          observations.push(line.replace(/^[-*]\s+/, '').trim());
        }
      }

      // Processar vocabulário da aula
      const classVocab = [];
      rawVocab.forEach(item => {
        // Ex: "gym (academia)", "physical therapy: fisioterapia", "hurt (doer)"
        const match = item.match(/^([^(:\-–]+)(?:[\(:–\-]\s*(.+?)\)?)?$/);
        if (match) {
          const term = match[1].trim();
          const meaning = (match[2] || '').replace(/\)$/, '').trim() || term;
          if (term) {
            const vObj = { term, meaning, aula: num };
            classVocab.push(vObj);
            allVocab.push(vObj);
          }
        }
      });

      // Processar erros da aula
      const classMistakes = [];
      rawMistakes.forEach(m => {
        let wrong = '', correct = '', why = m;
        // Padrão: "frase errada" → correção: "frase correta" (motivo)
        const arrowMatch = m.match(/"([^"]+)"\s*(?:→|->)\s*(?:correção:?\s*)?"([^"]+)"(?:\s*\((.*?)\))?/i);
        if (arrowMatch) {
          wrong = arrowMatch[1];
          correct = arrowMatch[2];
          why = arrowMatch[3] || 'Ajuste de estrutura ou pronúncia';
        } else {
          // Padrão alternativo: Confundiu X com Y / disse X ao invés de Y
          const altMatch = m.match(/disse\s*"([^"]+)"\s*(?:ao invés de|em vez de)\s*"([^"]+)"/i);
          if (altMatch) {
            wrong = altMatch[1];
            correct = altMatch[2];
            why = m;
          }
        }
        const mObj = { raw: m, wrong, correct, why, aula: num };
        classMistakes.push(mObj);
        allMistakes.push(mObj);
      });

      classes.push({
        number: num,
        date: dateStr,
        phase: phaseNum,
        topic,
        topics,
        vocab: classVocab,
        mistakes: classMistakes,
        observations
      });
    });

    const totalClasses = classes.length;
    const currentPhase = totalClasses > 0 ? Math.min(4, Math.ceil(totalClasses / 36) || 1) : 1;
    if (totalClasses > 0) {
      currentWeek = Math.min(24, Math.ceil(totalClasses / 6) || 1);
    }

    return {
      classes,
      vocab: allVocab,
      mistakes: allMistakes,
      currentWeek,
      currentPhase,
      totalClasses
    };
  }

  // 2. Renderizador dinâmico no DOM
  function renderDashboard(data) {
    const { classes, vocab, mistakes, currentWeek, currentPhase, totalClasses } = data;
    const pNames = PHASE_NAMES[studentType] || PHASE_NAMES['med'];

    // Sincronização Indicator
    const syncText = document.getElementById('syncText');
    const syncDot = document.getElementById('syncDot');
    if (syncText) {
      if (totalClasses === 0) {
        syncText.innerHTML = `Sincronizado com <code>registro-aulas.md</code> • <strong>Pronto para Aula 1</strong> (0 aulas registradas)`;
      } else {
        syncText.innerHTML = `Sincronizado com <code>registro-aulas.md</code> • <strong>${totalClasses} aulas registradas</strong> (Semana ${currentWeek}, Fase ${currentPhase})`;
      }
    }
    if (syncDot) {
      syncDot.className = 'sync-dot live';
    }

    // Top Header Streak / Status
    const streakElem = document.querySelector('.streak-pill span strong');
    if (streakElem) {
      if (totalClasses === 0) {
        streakElem.parentElement.innerHTML = `<span class="streak-sparkle">✨</span> <span><strong>Pronto para Iniciar</strong> • Aula 1 por Voz</span>`;
      } else {
        streakElem.parentElement.innerHTML = `<span class="streak-sparkle">🔥</span> <span><strong>${totalClasses} Aulas Concluídas</strong> • Ciclo Ativo</span>`;
      }
    }

    // Top Metric Cards
    const metricCards = document.querySelectorAll('.metrics-grid .metric-card');
    if (metricCards.length >= 4) {
      // 1. Progresso Geral
      const val1 = metricCards[0].querySelector('.metric-value');
      const sub1 = metricCards[0].querySelector('.metric-sub');
      if (val1) val1.innerHTML = `Aula ${totalClasses} <span style="font-size: 16px; font-weight: 500; color: var(--text-muted);">/ 144</span>`;
      if (sub1) sub1.textContent = `Semana ${currentWeek} de 24 (Fase ${currentPhase}: ${pNames[currentPhase] || ''})`;

      // 3. Vocabulário Mapeado
      const baseVocabCount = isMed ? 28 : 16;
      const totalVocabCount = baseVocabCount + vocab.length;
      const val3 = metricCards[2].querySelector('.metric-value');
      if (val3) val3.innerHTML = `${totalVocabCount} <span style="font-size: 16px; font-weight: 500; color: var(--text-muted);">termos</span>`;

      // 4. Próximo Marco
      const nextMilestoneWeek = Math.min(24, Math.ceil(currentWeek / 6) * 6);
      const val4 = metricCards[3].querySelector('.metric-value');
      const sub4 = metricCards[3].querySelector('.metric-sub');
      if (val4) val4.textContent = `Semana ${nextMilestoneWeek}`;
      if (sub4) sub4.textContent = `Checagem de Nível ${Math.min(4, Math.ceil(currentWeek / 6))} (${pNames[Math.min(4, Math.ceil(currentWeek / 6))] || ''})`;
    }

    // Trilha das 4 Fases
    const phaseCards = document.querySelectorAll('.phases-track .phase-card');
    phaseCards.forEach((card, idx) => {
      const pNum = idx + 1;
      const startClass = (pNum - 1) * 36;
      const endClass = pNum * 36;
      const classesInThisPhase = Math.max(0, Math.min(36, totalClasses - startClass));
      const pct = Math.round((classesInThisPhase / 36) * 100);

      const topStatus = card.querySelector('.phase-top span:nth-child(2)');
      const progressBar = card.querySelector('.progress-fill');
      const infoSpan = card.querySelector('div[style*="justify-content: space-between"]');

      if (totalClasses >= endClass) {
        card.className = 'phase-card completed';
        if (topStatus) {
          topStatus.textContent = '✓ CONCLUÍDA';
          topStatus.style.color = 'var(--emerald)';
        }
      } else if (pNum === currentPhase) {
        card.className = 'phase-card active';
        if (topStatus) {
          topStatus.textContent = classesInThisPhase === 0 ? 'INICIANDO' : 'EM ANDAMENTO';
          topStatus.style.color = 'var(--accent)';
        }
      } else {
        card.className = 'phase-card locked';
        if (topStatus) {
          topStatus.textContent = '🔒 Bloqueada';
          topStatus.style.color = 'var(--text-dim)';
        }
      }

      if (progressBar) progressBar.style.width = `${pct}%`;
      if (infoSpan) {
        infoSpan.innerHTML = `<span>Aulas concluídas: ${classesInThisPhase} / 36</span><span>${pct}%</span>`;
      }
    });

    // Rotina Semanal (Dias da semana)
    renderWeeklySchedule(totalClasses, currentWeek);

    // Tab 1: Histórico das Aulas
    renderClassHistory(classes, totalClasses, currentPhase);

    // Tab 2: Radar de Erros
    renderMistakesRadar(mistakes);

    // Tab 3: Vocabulário
    renderVocabBank(vocab);
  }

  // Renderizar Rotina Semanal Fixa
  function renderWeeklySchedule(totalClasses, currentWeek) {
    const daysContainer = document.querySelector('.week-days');
    if (!daysContainer) return;

    // Aulas concluídas na semana atual (0 a 6)
    const classesInWeek = totalClasses % 6;
    const completedDays = totalClasses === 0 ? 0 : (classesInWeek === 0 ? 6 : classesInWeek);

    const slots = daysContainer.querySelectorAll('.day-slot');
    slots.forEach((slot, idx) => {
      // Segunda=0, Terça=1, ..., Sábado=5, Domingo=6
      const statusElem = slot.querySelector('.day-status');
      if (idx === 6) {
        // Domingo
        slot.className = 'day-slot';
        if (statusElem) {
          statusElem.textContent = 'Descanso';
          statusElem.style.color = 'var(--text-dim)';
        }
        return;
      }

      if (idx < completedDays) {
        slot.className = 'day-slot completed';
        if (statusElem) {
          statusElem.textContent = `✓ Concluída`;
          statusElem.style.color = '#10b981';
          statusElem.style.fontWeight = '700';
        }
      } else if (idx === completedDays) {
        slot.className = 'day-slot today';
        if (statusElem) {
          statusElem.textContent = `▶ Próxima Aula`;
          statusElem.style.color = '#38bdf8';
          statusElem.style.fontWeight = '700';
        }
      } else {
        slot.className = 'day-slot';
        if (statusElem) {
          statusElem.textContent = `Aguardando`;
          statusElem.style.color = 'var(--text-dim)';
          statusElem.style.fontWeight = 'normal';
        }
      }
    });
  }

  // Renderizar Histórico das Aulas (Tab 1)
  function renderClassHistory(classes, totalClasses, currentPhase) {
    const tabClasses = document.getElementById('tab-classes');
    if (!tabClasses) return;

    if (totalClasses === 0) {
      // Estado Inicial: Aula 1 Protocolo
      tabClasses.innerHTML = `
        <div class="class-card" style="border-color: rgba(14, 165, 233, 0.4); background: linear-gradient(180deg, rgba(14, 165, 233, 0.05) 0%, rgba(21, 29, 48, 0.95) 100%);">
          <div class="class-head">
            <div>
              <div class="class-number">Aula 1 • Protocolo de Avaliação Inicial e Nivelamento (15 min)</div>
              <div class="class-date">Próxima Aula por Voz • Professor: Claude • Foco: Conversação Diagnóstica</div>
            </div>
            <span class="badge-med" style="background: rgba(14, 165, 233, 0.15); color: #38bdf8; padding: 3px 10px; border-radius: 20px; border: 1px solid rgba(14, 165, 233, 0.3); font-size: 11px; font-weight: 700;">Diagnóstico Inicial</span>
          </div>

          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
            Como o seu arquivo <code>registro-aulas.md</code> está pronto para iniciar, o Claude seguirá um bate-papo leve e descontraído de 15 minutos para calibrar seu nível de entrada:
          </p>

          <div class="step-box">
            <div class="step-box-header">
              <span>1. Boas-vindas & Aquecimento (2 min)</span>
              <span style="color: var(--text-dim);">Português</span>
            </div>
            <div class="step-box-desc">
              Cumprimento inicial, alinhamento dos 15 minutos e explicação de que é uma conversa amigável para calibrar o plano de ensino.
            </div>
          </div>

          <div class="step-box">
            <div class="step-box-header">
              <span>2. Diagnóstico Geral de Fala e Escuta (6 min)</span>
              <span style="color: var(--accent);">Inglês Cotidiano</span>
            </div>
            <div class="step-box-desc">
              Perguntas abertas sobre nome, rotina de estudos, hobbies e fim de semana. Teste natural de passado (<em>"What did you do yesterday?"</em>) e futuro simples (<em>"What are your plans?"</em>).
            </div>
          </div>

          <div class="step-box">
            <div class="step-box-header">
              <span>3. Diagnóstico Profissional e Compreensão (4 min)</span>
              <span style="color: var(--accent);">Inglês Técnico</span>
            </div>
            <div class="step-box-desc">
              Conversa sobre a área de formação, interesse profissional e compreensão de situações do cotidiano da saúde.
            </div>
          </div>

          <div class="step-box" style="margin-bottom: 0;">
            <div class="step-box-header">
              <span>4. Feedback e Registro de Nível (3 min)</span>
              <span style="color: #10b981;">Fechamento</span>
            </div>
            <div class="step-box-desc">
              Feedback caloroso sobre seus pontos fortes e registro automático no <code>registro-aulas.md</code> confirmando o nível inicial (A1, A2 ou B1).
            </div>
          </div>
        </div>

        <div style="background: rgba(255, 255, 255, 0.02); border: 1px dashed var(--border); border-radius: var(--radius-md); padding: 24px; text-align: center; margin-top: 16px;">
          <span style="font-size: 28px; display: block; margin-bottom: 8px;">🎙️</span>
          <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 4px;">Aguardando a Primeira Aula</h4>
          <p style="font-size: 13px; color: var(--text-muted); max-width: 500px; margin: 0 auto;">
            Assim que você concluir a chamada de voz no Claude, o registro adicionado ao seu <code>registro-aulas.md</code> aparecerá automaticamente aqui.
          </p>
        </div>
      `;
      return;
    }

    // Aulas já registradas: ordenar da mais recente para a mais antiga
    const reversed = [...classes].reverse();
    let html = `
      <div style="margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <h3 style="font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
          <span>📖</span> Histórico Completo • ${totalClasses} Sessões Realizadas
        </h3>
        <span style="font-size: 12px; color: var(--text-muted); background: var(--surface-card); padding: 4px 12px; border-radius: 20px; border: 1px solid var(--border);">
          Fase ${currentPhase} em andamento
        </span>
      </div>
    `;

    reversed.forEach(c => {
      // Temas cobertos
      const topicsHtml = c.topics.length > 0
        ? `<div class="class-block">
             <div class="class-block-title">Estruturas & Conteúdos Praticados</div>
             <ul class="topic-list">
               ${c.topics.map(t => `<li>${formatMarkdownInline(t)}</li>`).join('')}
             </ul>
           </div>`
        : '';

      // Palavras novas
      const vocabHtml = c.vocab.length > 0
        ? `<div class="class-block">
             <div class="class-block-title">Palavras Novas Desta Aula (${c.vocab.length})</div>
             <div class="tag-container">
               ${c.vocab.map(v => `<span class="word-badge" onclick="speak('${escapeQuote(v.term)}')">🔊 ${v.term} <span style="font-weight: 400; opacity: 0.85;">(${v.meaning})</span></span>`).join('')}
             </div>
           </div>`
        : '';

      // Erros observados
      const mistakesHtml = c.mistakes.length > 0
        ? `<div class="class-block">
             <div class="class-block-title">Pontos de Atenção & Ajustes Desta Aula (${c.mistakes.length})</div>
             <div style="display: flex; flex-direction: column; gap: 8px;">
               ${c.mistakes.map(m => {
                 if (m.wrong && m.correct) {
                   return `
                     <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px;">
                       <div>
                         <span style="color: #f87171; text-decoration: line-through; margin-right: 8px;">"${escapeHtml(m.wrong)}"</span>
                         <span style="color: #38bdf8; font-weight: 700;">→ "${escapeHtml(m.correct)}"</span>
                       </div>
                       <div style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">💡 ${escapeHtml(m.why)}</div>
                     </div>
                   `;
                 } else {
                   return `
                     <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 12px; color: var(--text-muted);">
                       • ${formatMarkdownInline(m.raw)}
                     </div>
                   `;
                 }
               }).join('')}
             </div>
           </div>`
        : '';

      // Observações
      const obsHtml = c.observations.length > 0
        ? `<div class="class-block" style="margin-bottom: 0;">
             <div class="class-block-title">Destaque de Evolução & Feedback</div>
             <div style="font-size: 13px; color: #94a3b8; background: rgba(255, 255, 255, 0.03); padding: 12px; border-radius: var(--radius-sm); border-left: 3px solid var(--accent);">
               ${c.observations.map(o => formatMarkdownInline(o)).join('<br>')}
             </div>
           </div>`
        : '';

      html += `
        <div class="class-card">
          <div class="class-head">
            <div>
              <div class="class-number">Aula ${c.number} • ${escapeHtml(c.topic)}</div>
              <div class="class-date">${escapeHtml(c.date)} • Fase ${c.phase} • Professor: Claude</div>
            </div>
            <span class="status-badge guide" style="font-size: 11px;">Aula ${c.number} Feita</span>
          </div>
          ${topicsHtml}
          ${vocabHtml}
          ${mistakesHtml}
          ${obsHtml}
        </div>
      `;
    });

    tabClasses.innerHTML = html;
  }

  // Renderizar Radar de Erros (Tab 2)
  function renderMistakesRadar(mistakes) {
    const radarTab = document.getElementById('tab-radar');
    if (!radarTab) return;

    // Atualizar badge do botão da tab
    const radarBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes('radar'));
    if (radarBtn) {
      radarBtn.innerHTML = `🎯 Radar de Erros & Padrões (${mistakes.length})`;
    }

    if (mistakes.length === 0) {
      return; // Mantém os itens pré-definidos caso não haja erros ainda
    }

    // Criar seção com os erros reais das aulas
    let dynamicCardsHtml = `
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
          <span>🎯</span> Monitor de Fixação • Erros Mapeados nas Suas Aulas (${mistakes.length})
        </h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          Padrões identificados pelo Claude durante as sessões de voz para você revisar e consolidar:
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
    `;

    mistakes.forEach(m => {
      if (m.wrong && m.correct) {
        dynamicCardsHtml += `
          <div class="mistake-card">
            <div class="mistake-content">
              <div>
                <span class="mistake-wrong">"${escapeHtml(m.wrong)}"</span>
                <span class="mistake-correct">"${escapeHtml(m.correct)}"</span>
              </div>
              <div class="mistake-why">
                💡 <strong>Motivo / Ajuste:</strong> ${escapeHtml(m.why)}
              </div>
            </div>
            <span class="status-badge attention">Aula ${m.aula}</span>
          </div>
        `;
      } else {
        dynamicCardsHtml += `
          <div class="mistake-card">
            <div class="mistake-content">
              <div style="font-size: 13px; color: #f8fafc;">
                ${formatMarkdownInline(m.raw)}
              </div>
            </div>
            <span class="status-badge attention">Aula ${m.aula}</span>
          </div>
        `;
      }
    });

    dynamicCardsHtml += `</div></div>`;

    // Se já existiam cartões fixos, coloca a seção dinâmica no topo
    const existingContent = radarTab.innerHTML;
    if (!existingContent.includes('Monitor de Fixação • Erros Mapeados nas Suas Aulas')) {
      radarTab.innerHTML = dynamicCardsHtml + existingContent;
    }
  }

  // Renderizar Vocabulário (Tab 3)
  function renderVocabBank(classVocab) {
    const vocabGrid = document.getElementById('vocabGrid');
    if (!vocabGrid) return;

    // Atualizar badge do botão da tab
    const vocabBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes('vocab'));
    const totalCount = vocabGrid.querySelectorAll('.vocab-card').length + classVocab.length;
    if (vocabBtn) {
      vocabBtn.innerHTML = `🔤 Banco de Vocabulário (${totalCount})`;
    }

    if (classVocab.length === 0) return;

    // Remover duplicatas de termos já existentes
    const existingTerms = new Set();
    vocabGrid.querySelectorAll('.vocab-card').forEach(c => {
      existingTerms.add(c.getAttribute('data-term').toLowerCase());
    });

    classVocab.forEach(v => {
      const termLower = v.term.toLowerCase();
      if (!existingTerms.has(termLower)) {
        existingTerms.add(termLower);

        const card = document.createElement('div');
        card.className = 'vocab-card';
        card.setAttribute('data-term', v.term);
        card.setAttribute('data-trans', v.meaning);
        card.innerHTML = `
          <div>
            <div class="vocab-term">${escapeHtml(v.term)}</div>
            <div class="vocab-meaning">${escapeHtml(v.meaning)}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="vocab-type" style="background: rgba(14, 165, 233, 0.15); color: #38bdf8;">Aula ${v.aula}</span>
            <button class="audio-btn" onclick="speak('${escapeQuote(v.term)}')">🔊</button>
          </div>
        `;
        vocabGrid.insertBefore(card, vocabGrid.firstChild);
      }
    });
  }

  // Helpers
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeQuote(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  function formatMarkdownInline(str) {
    if (!str) return '';
    return str
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  // 3. Gerenciamento de Arquivo & Live Loading
  function loadAndRender(mdContent) {
    if (!mdContent) return;
    const data = parseRegistroAulas(mdContent);
    renderDashboard(data);
    try {
      localStorage.setItem('cached_registro_aulas_' + studentType, mdContent);
    } catch(e) {}
  }

  // Handler de seleção de arquivo pelo usuário
  window.triggerFileSelect = function() {
    // Tenta modern File System Access API se disponível
    if ('showOpenFilePicker' in window) {
      window.showOpenFilePicker({
        types: [{
          description: 'Markdown de Registro de Aulas',
          accept: { 'text/markdown': ['.md'] }
        }],
        multiple: false
      }).then(async ([fileHandle]) => {
        const file = await fileHandle.getFile();
        const text = await file.text();
        loadAndRender(text);
      }).catch(err => {
        if (err.name !== 'AbortError') {
          // Fallback para input file comum
          const fi = document.getElementById('fileInput');
          if (fi) fi.click();
        }
      });
    } else {
      const fi = document.getElementById('fileInput');
      if (fi) fi.click();
    }
  };

  window.handleFileSelected = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      loadAndRender(evt.target.result);
    };
    reader.readAsText(file);
  };

  window.reloadRegistration = function() {
    // Tentar buscar novamente via fetch
    fetch('./registro-aulas.md?t=' + Date.now())
      .then(res => {
        if (!res.ok) throw new Error('Status ' + res.status);
        return res.text();
      })
      .then(text => {
        loadAndRender(text);
      })
      .catch(() => {
        // Se fetch falhar (CORS file://), tenta ler da tag embutida ou do localStorage
        const embedded = document.getElementById('registro-aulas-data');
        if (embedded && embedded.textContent.trim()) {
          loadAndRender(embedded.textContent);
        } else {
          window.triggerFileSelect();
        }
      });
  };

  // Inicialização no DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    // Configurar Drag and Drop no documento inteiro
    const overlay = document.getElementById('dropOverlay');
    
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (overlay) overlay.classList.add('active');
    });

    window.addEventListener('dragleave', (e) => {
      if (e.relatedTarget === null && overlay) {
        overlay.classList.remove('active');
      }
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (overlay) overlay.classList.remove('active');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.name.endsWith('.md')) {
          const reader = new FileReader();
          reader.onload = function(evt) {
            loadAndRender(evt.target.result);
          };
          reader.readAsText(file);
        }
      }
    });

    // 1. Tentar ler do script embutido gerado pelo sync_dashboards.py
    const embedded = document.getElementById('registro-aulas-data');
    if (embedded && embedded.textContent.trim()) {
      loadAndRender(embedded.textContent);
    }

    // 2. Tentar fetch assíncrono para servidores locais (VS Code Live Server, python http.server, etc.)
    fetch('./registro-aulas.md?t=' + Date.now())
      .then(res => {
        if (res.ok) return res.text();
        throw new Error('Local fetch not supported');
      })
      .then(text => {
        if (text && text.trim()) {
          loadAndRender(text);
        }
      })
      .catch(() => {
        // Em file:// silenciosamente usa o dado embutido ou localStorage
        if (!embedded || !embedded.textContent.trim()) {
          try {
            const cached = localStorage.getItem('cached_registro_aulas_' + studentType);
            if (cached) loadAndRender(cached);
          } catch(e) {}
        }
      });
  });

})();
