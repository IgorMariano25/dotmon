/* ============================================================
   dotmon IDE — Application Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ─── File Contents ─────────────────────────────────────────
  const files = {
    'main.mon': {
      breadcrumb: ['dotmon-project', 'src', 'main.mon'],
      lines: [
        { text: '// Digimon Evolution System', cls: '' },
        { text: '// Main game logic for dotmon', cls: '' },
        { text: '', cls: '' },
        { text: 'Start', cls: '' },
        { text: '{', cls: '' },
        { text: '    // Define base stats', cls: '' },
        { text: '    Baby nivel = 10;', cls: '' },
        { text: '    Pup experiencia = 250;', cls: '' },
        { text: '    Moji nome = "Agumon";', cls: '' },
        { text: '    Moji evolucao = "Greymon";', cls: '' },
        { text: '    Bit pronto = true;', cls: 'warning-line' },
        { text: '', cls: '' },
        { text: '    // Check evolution conditions', cls: '' },
        { text: '    Evo (nivel > 15) {', cls: 'highlight' },
        { text: '        Show("Mega evolucao disponivel!");', cls: '' },
        { text: '        Show(evolucao);', cls: '' },
        { text: '    }', cls: '' },
        { text: '    AltEvo (nivel == 10) {', cls: '' },
        { text: '        Show("Evolucao padrao");', cls: '' },
        { text: '        Show(nome);', cls: '' },
        { text: '    }', cls: '' },
        { text: '    FailEvo {', cls: '' },
        { text: '        Show("Nivel insuficiente");', cls: '' },
        { text: '    }', cls: '' },
        { text: '', cls: '' },
        { text: '    // Battle calculation', cls: '' },
        { text: '    Champ dano = experiencia * nivel;', cls: '' },
        { text: '    Rook poder = forca + defesa;', cls: 'error-line' },
        { text: '    Show(dano);', cls: '' },
        { text: '', cls: '' },
        { text: '    // Display results', cls: '' },
        { text: '    Baby resultado = nivel + dano;', cls: 'error-line' },
        { text: '    Show("Batalha concluida!");', cls: '' },
        { text: '}', cls: '' },
        { text: 'Finish', cls: '' },
        { text: '', cls: '' },
      ]
    },
    'batalha.mon': {
      breadcrumb: ['dotmon-project', 'src', 'batalha.mon'],
      lines: [
        { text: '// Battle System Module', cls: '' },
        { text: '// Handles combat logic between Digimons', cls: '' },
        { text: '', cls: '' },
        { text: 'Start', cls: '' },
        { text: '{', cls: '' },
        { text: '    // Attacker stats', cls: '' },
        { text: '    Moji atacante = "WarGreymon";', cls: '' },
        { text: '    Champ ataque = 850;', cls: '' },
        { text: '    Champ velocidade = 120;', cls: '' },
        { text: '', cls: '' },
        { text: '    // Defender stats', cls: '' },
        { text: '    Moji defensor = "MetalGarurumon";', cls: '' },
        { text: '    Champ defesa = 780;', cls: '' },
        { text: '    Champ hp = 1200;', cls: '' },
        { text: '', cls: '' },
        { text: '    // Calculate damage', cls: '' },
        { text: '    Champ dano = ataque - defesa;', cls: '' },
        { text: '', cls: '' },
        { text: '    Evo (dano > 0) {', cls: '' },
        { text: '        hp = hp - dano;', cls: '' },
        { text: '        Show("Dano causado!");', cls: '' },
        { text: '        Show(dano);', cls: '' },
        { text: '    }', cls: '' },
        { text: '    FailEvo {', cls: '' },
        { text: '        Show("Ataque bloqueado!");', cls: '' },
        { text: '    }', cls: '' },
        { text: '', cls: '' },
        { text: '    Show(hp);', cls: '' },
        { text: '}', cls: '' },
        { text: 'Finish', cls: '' },
        { text: '', cls: '' },
      ]
    },
    'evolucao.mon': {
      breadcrumb: ['dotmon-project', 'src', 'evolucao.mon'],
      lines: [
        { text: '// Evolution System Module', cls: '' },
        { text: '// Manages Digimon evolution paths', cls: '' },
        { text: '', cls: '' },
        { text: 'Start', cls: '' },
        { text: '{', cls: '' },
        { text: '    Moji digimon = "Koromon";', cls: '' },
        { text: '    Baby stage = 1;', cls: '' },
        { text: '    Pup xp = 500;', cls: '' },
        { text: '', cls: '' },
        { text: '    // Evolution check', cls: '' },
        { text: '    Evo (xp > 1000) {', cls: '' },
        { text: '        stage = 4;', cls: '' },
        { text: '        digimon = "WarGreymon";', cls: '' },
        { text: '        Show("Mega Evolution!");', cls: '' },
        { text: '    }', cls: '' },
        { text: '    AltEvo (xp > 500) {', cls: '' },
        { text: '        stage = 3;', cls: '' },
        { text: '        digimon = "Greymon";', cls: '' },
        { text: '        Show("Champion Evolution!");', cls: '' },
        { text: '    }', cls: '' },
        { text: '    AltEvo (xp > 100) {', cls: '' },
        { text: '        stage = 2;', cls: '' },
        { text: '        digimon = "Agumon";', cls: '' },
        { text: '        Show("Rookie Evolution!");', cls: '' },
        { text: '    }', cls: '' },
        { text: '    FailEvo {', cls: '' },
        { text: '        Show("Not enough XP");', cls: '' },
        { text: '    }', cls: '' },
        { text: '', cls: '' },
        { text: '    Show(digimon);', cls: '' },
        { text: '    Show(stage);', cls: '' },
        { text: '}', cls: '' },
        { text: 'Finish', cls: '' },
        { text: '', cls: '' },
      ]
    }
  };

  // ─── C Generated Code ─────────────────────────────────────
  const cCode = {
    'main.mon': [
      '/* Generated by dotmon compiler v0.1.0 */',
      '/* Source: src/main.mon */',
      '',
      '#include <stdio.h>',
      '#include <string.h>',
      '#include <stdbool.h>',
      '',
      'int main(void) {',
      '    // Define base stats',
      '    int nivel = 10;',
      '    int experiencia = 250;',
      '    char nome[] = "Agumon";',
      '    char evolucao[] = "Greymon";',
      '    bool pronto = true;',
      '',
      '    // Check evolution conditions',
      '    if (nivel > 15) {',
      '        printf("Mega evolucao disponivel!\\n");',
      '        printf("%s\\n", evolucao);',
      '    }',
      '    else if (nivel == 10) {',
      '        printf("Evolucao padrao\\n");',
      '        printf("%s\\n", nome);',
      '    }',
      '    else {',
      '        printf("Nivel insuficiente\\n");',
      '    }',
      '',
      '    // Battle calculation',
      '    int dano = experiencia * nivel;',
      '    /* ERROR: undeclared identifier */',
      '    printf("%d\\n", dano);',
      '',
      '    // Display results',
      '    /* ERROR: type mismatch */',
      '    printf("Batalha concluida!\\n");',
      '',
      '    return 0;',
      '}',
      '',
    ],
    'batalha.mon': [
      '/* Generated by dotmon compiler v0.1.0 */',
      '/* Source: src/batalha.mon */',
      '',
      '#include <stdio.h>',
      '#include <string.h>',
      '',
      'int main(void) {',
      '    // Attacker stats',
      '    char atacante[] = "WarGreymon";',
      '    int ataque = 850;',
      '    int velocidade = 120;',
      '',
      '    // Defender stats',
      '    char defensor[] = "MetalGarurumon";',
      '    int defesa = 780;',
      '    int hp = 1200;',
      '',
      '    // Calculate damage',
      '    int dano = ataque - defesa;',
      '',
      '    if (dano > 0) {',
      '        hp = hp - dano;',
      '        printf("Dano causado!\\n");',
      '        printf("%d\\n", dano);',
      '    }',
      '    else {',
      '        printf("Ataque bloqueado!\\n");',
      '    }',
      '',
      '    printf("%d\\n", hp);',
      '',
      '    return 0;',
      '}',
      '',
    ],
    'evolucao.mon': [
      '/* Generated by dotmon compiler v0.1.0 */',
      '/* Source: src/evolucao.mon */',
      '',
      '#include <stdio.h>',
      '#include <string.h>',
      '',
      'int main(void) {',
      '    char digimon[] = "Koromon";',
      '    int stage = 1;',
      '    int xp = 500;',
      '',
      '    // Evolution check',
      '    if (xp > 1000) {',
      '        stage = 4;',
      '        strcpy(digimon, "WarGreymon");',
      '        printf("Mega Evolution!\\n");',
      '    }',
      '    else if (xp > 500) {',
      '        stage = 3;',
      '        strcpy(digimon, "Greymon");',
      '        printf("Champion Evolution!\\n");',
      '    }',
      '    else if (xp > 100) {',
      '        stage = 2;',
      '        strcpy(digimon, "Agumon");',
      '        printf("Rookie Evolution!\\n");',
      '    }',
      '    else {',
      '        printf("Not enough XP\\n");',
      '    }',
      '',
      '    printf("%s\\n", digimon);',
      '    printf("%d\\n", stage);',
      '',
      '    return 0;',
      '}',
      '',
    ]
  };

  // ─── Error Data ────────────────────────────────────────────
  const errors = [
    {
      type: 'error',
      message: "Undeclared identifier 'forca' in expression",
      file: 'src/main.mon',
      line: 28,
      col: 22,
      snippet: 'Rook poder = forca + defesa;',
      underline: 'forca'
    },
    {
      type: 'error',
      message: "Type mismatch: cannot assign expression of type Champ to Baby",
      file: 'src/main.mon',
      line: 32,
      col: 5,
      snippet: 'Baby resultado = nivel + dano;',
      underline: 'nivel + dano'
    },
    {
      type: 'warning',
      message: "Variable 'pronto' is declared but never used",
      file: 'src/main.mon',
      line: 11,
      col: 5,
      snippet: 'Bit pronto = true;',
      underline: 'pronto'
    }
  ];

  // ─── AST Data ──────────────────────────────────────────────
  const astContent = `Program
├── Block
│   ├── VarDecl
│   │   ├── Type: Baby (int)
│   │   ├── Name: nivel
│   │   └── Value: IntLiteral(10)
│   ├── VarDecl
│   │   ├── Type: Pup (int)
│   │   ├── Name: experiencia
│   │   └── Value: IntLiteral(250)
│   ├── VarDecl
│   │   ├── Type: Moji (string)
│   │   ├── Name: nome
│   │   └── Value: StringLiteral("Agumon")
│   ├── VarDecl
│   │   ├── Type: Moji (string)
│   │   ├── Name: evolucao
│   │   └── Value: StringLiteral("Greymon")
│   ├── VarDecl
│   │   ├── Type: Bit (bool)
│   │   ├── Name: pronto
│   │   └── Value: BoolLiteral(true)
│   ├── IfStatement (Evo)
│   │   ├── Condition
│   │   │   └── BinaryExpr(>)
│   │   │       ├── Identifier(nivel)
│   │   │       └── IntLiteral(15)
│   │   ├── ThenBlock
│   │   │   ├── FuncCall: Show
│   │   │   │   └── StringLiteral("Mega evolucao...")
│   │   │   └── FuncCall: Show
│   │   │       └── Identifier(evolucao)
│   │   ├── ElseIf (AltEvo)
│   │   │   ├── Condition
│   │   │   │   └── BinaryExpr(==)
│   │   │   │       ├── Identifier(nivel)
│   │   │   │       └── IntLiteral(10)
│   │   │   └── ThenBlock
│   │   │       ├── FuncCall: Show
│   │   │       │   └── StringLiteral("Evolucao padrao")
│   │   │       └── FuncCall: Show
│   │   │           └── Identifier(nome)
│   │   └── ElseBlock (FailEvo)
│   │       └── FuncCall: Show
│   │           └── StringLiteral("Nivel insuficiente")
│   ├── VarDecl
│   │   ├── Type: Champ (int)
│   │   ├── Name: dano
│   │   └── Value: BinaryExpr(*)
│   │       ├── Identifier(experiencia)
│   │       └── Identifier(nivel)
│   └── FuncCall: Show
│       └── Identifier(dano)
└── End`;

  // ─── Syntax Highlighting ─────────────────────────────────────
  // Segment-based: splits line into comment/string/code segments,
  // then only applies keyword highlighting to code segments.

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Split a line into segments: { type: 'comment'|'string'|'code', text }
  function segmentLine(text, commentPatterns) {
    const segments = [];
    let pos = 0;
    while (pos < text.length) {
      // Check for line comment
      if (text[pos] === '/' && text[pos + 1] === '/') {
        segments.push({ type: 'comment', text: text.slice(pos) });
        return segments;
      }
      // Check for block comment
      if (text[pos] === '/' && text[pos + 1] === '*') {
        const end = text.indexOf('*/', pos + 2);
        if (end !== -1) {
          segments.push({ type: 'comment', text: text.slice(pos, end + 2) });
          pos = end + 2;
          continue;
        } else {
          segments.push({ type: 'comment', text: text.slice(pos) });
          return segments;
        }
      }
      // Check for string
      if (text[pos] === '"') {
        let j = pos + 1;
        while (j < text.length && text[j] !== '"') {
          if (text[j] === '\\') j++; // skip escaped char
          j++;
        }
        segments.push({ type: 'string', text: text.slice(pos, j + 1) });
        pos = j + 1;
        continue;
      }
      // Check for preprocessor directive at start of trimmed line
      if (text[pos] === '#' && text.slice(0, pos).trim() === '') {
        segments.push({ type: 'directive', text: text.slice(pos) });
        return segments;
      }
      // Regular code character — accumulate
      let j = pos;
      while (j < text.length && text[j] !== '/' && text[j] !== '"' && text[j] !== '#') {
        j++;
      }
      // Edge case: single / not followed by / or *
      if (j === pos && text[j] === '/') {
        j++;
      }
      if (j === pos && text[j] === '#') {
        j++;
      }
      if (j > pos) {
        segments.push({ type: 'code', text: text.slice(pos, j) });
        pos = j;
      }
    }
    return segments;
  }

  function highlightMonCode(code) {
    let s = esc(code);
    s = s.replace(/\b(Start|Finish|Evo|AltEvo|FailEvo)\b/g, '<span class="syn-keyword">$1</span>');
    s = s.replace(/\b(Baby|Pup|Rook|Champ|Moji|Bit)\b/g, '<span class="syn-type">$1</span>');
    s = s.replace(/\b(Show)\b/g, '<span class="syn-function">$1</span>');
    s = s.replace(/\b(true|false)\b/g, '<span class="syn-bool">$1</span>');
    s = s.replace(/\b(\d+)\b/g, '<span class="syn-number">$1</span>');
    return s;
  }

  function highlightCCode(code) {
    let s = esc(code);
    s = s.replace(/\b(int|char|void|bool|return|if|else|for|while|do|switch|case|break|continue|struct|typedef|const|static|unsigned|long|short|float|double)\b/g, '<span class="syn-c-keyword">$1</span>');
    s = s.replace(/\b(true|false|NULL)\b/g, '<span class="syn-c-type">$1</span>');
    s = s.replace(/\b(printf|scanf|malloc|free|strlen|strcpy|strcat|strcmp|memcpy|memset|fprintf|sprintf|main)\b/g, '<span class="syn-c-function">$1</span>');
    s = s.replace(/\b(\d+)\b/g, '<span class="syn-c-number">$1</span>');
    return s;
  }

  function highlightMon(text) {
    if (!text) return '';
    const segs = segmentLine(text);
    return segs.map(seg => {
      if (seg.type === 'comment') return `<span class="syn-comment">${esc(seg.text)}</span>`;
      if (seg.type === 'string') return `<span class="syn-string">${esc(seg.text)}</span>`;
      return highlightMonCode(seg.text);
    }).join('');
  }

  function highlightC(text) {
    if (!text) return '';
    const segs = segmentLine(text);
    return segs.map(seg => {
      if (seg.type === 'comment') return `<span class="syn-c-comment">${esc(seg.text)}</span>`;
      if (seg.type === 'string') return `<span class="syn-c-string">${esc(seg.text)}</span>`;
      if (seg.type === 'directive') return `<span class="syn-c-directive">${esc(seg.text)}</span>`;
      return highlightCCode(seg.text);
    }).join('');
  }

  // ─── Render Editor Content ─────────────────────────────────
  const lineNumbersEl = document.getElementById('lineNumbers');
  const codeAreaEl = document.getElementById('codeArea');
  const minimapContentEl = document.getElementById('minimapContent');
  let currentFile = 'main.mon';

  function renderEditor(filename) {
    const file = files[filename];
    if (!file) return;

    currentFile = filename;

    // Line numbers
    let lnHTML = '';
    file.lines.forEach((line, i) => {
      const num = i + 1;
      let cls = '';
      if (line.cls === 'highlight') cls = ' active';
      if (line.cls === 'error-line') cls = ' error';
      lnHTML += `<span class="line-number${cls}">${num}</span>`;
    });
    lineNumbersEl.innerHTML = lnHTML;

    // Code
    let codeHTML = '';
    file.lines.forEach((line) => {
      const cls = line.cls ? ` ${line.cls}` : '';
      const highlighted = highlightMon(line.text);
      codeHTML += `<span class="code-line${cls}">${highlighted || ' '}</span>`;
    });
    codeAreaEl.innerHTML = codeHTML;

    // Minimap
    let mmText = file.lines.map(l => l.text).join('\n');
    minimapContentEl.textContent = mmText;

    // Breadcrumb
    const breadcrumbEl = document.querySelector('.breadcrumb');
    let bcHTML = '';
    file.breadcrumb.forEach((item, i) => {
      if (i > 0) {
        bcHTML += '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
      }
      const isLast = i === file.breadcrumb.length - 1;
      bcHTML += `<span class="breadcrumb-item${isLast ? ' active' : ''}">${item}</span>`;
    });
    breadcrumbEl.innerHTML = bcHTML;

    // Title bar
    document.querySelector('.titlebar-project').textContent = filename;

    // Update status bar cursor position
    const cursorLine = file.lines.findIndex(l => l.cls === 'highlight');
    if (cursorLine >= 0) {
      updateStatusCursor(cursorLine + 1, 28);
    } else {
      updateStatusCursor(1, 1);
    }
  }

  // ─── Render C Panel ────────────────────────────────────────
  const cLineNumbersEl = document.getElementById('cLineNumbers');
  const cCodeAreaEl = document.getElementById('cCodeArea');

  function renderCPanel(filename) {
    const code = cCode[filename];
    if (!code) {
      cLineNumbersEl.innerHTML = '';
      cCodeAreaEl.innerHTML = '<span class="code-line syn-c-comment">// No C output available for this file</span>';
      return;
    }

    let lnHTML = '';
    let codeHTML = '';
    code.forEach((line, i) => {
      lnHTML += `<span class="line-number">${i + 1}</span>`;
      codeHTML += `<span class="code-line">${highlightC(line) || ' '}</span>`;
    });

    cLineNumbersEl.innerHTML = lnHTML;
    cCodeAreaEl.innerHTML = codeHTML;

    // Update panel filename
    document.querySelector('.panel-filename').textContent = `generated/${filename.replace('.mon', '.c')}`;
  }

  // ─── Render Errors Panel ───────────────────────────────────
  const errorListEl = document.getElementById('errorList');

  function renderErrors() {
    let html = '';
    errors.forEach((err, i) => {
      const isError = err.type === 'error';
      const iconColor = isError ? '#f14c4c' : '#cca700';
      const iconSvg = isError
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="${iconColor}" stroke="none"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15" stroke="#1e1e1e" stroke-width="2.5"/><line x1="9" y1="9" x2="15" y2="15" stroke="#1e1e1e" stroke-width="2.5"/></svg>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="${iconColor}" stroke="none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13" stroke="#1e1e1e" stroke-width="2"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="#1e1e1e" stroke-width="2"/></svg>`;

      html += `
        <div class="error-item" data-line="${err.line}" data-file="${err.file}">
          <div class="error-item-icon">${iconSvg}</div>
          <div class="error-item-body">
            <div class="error-item-message">${escapeHTML(err.message)}</div>
            <div class="error-item-location">
              <span class="file">${err.file}</span> :${err.line}:${err.col}
            </div>
            <div class="error-item-snippet">${escapeHTML(err.snippet)}</div>
          </div>
        </div>
      `;
    });
    errorListEl.innerHTML = html;
  }

  // ─── Render AST Panel ──────────────────────────────────────
  function renderAST() {
    const el = document.getElementById('astContent');
    el.textContent = astContent;
  }

  // ─── Helper: escape HTML ───────────────────────────────────
  function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ─── Status Bar ────────────────────────────────────────────
  function updateStatusCursor(line, col) {
    const items = document.querySelectorAll('.statusbar-right .statusbar-item');
    items.forEach(item => {
      if (item.textContent.startsWith('Ln')) {
        item.textContent = `Ln ${line}, Col ${col}`;
      }
    });
  }

  // ─── Tab Switching ─────────────────────────────────────────
  const tabList = document.querySelector('.tab-list');
  tabList.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;

    // Handle close button
    if (e.target.closest('.tab-close')) {
      // Don't close the last tab
      const tabs = tabList.querySelectorAll('.tab');
      if (tabs.length <= 1) return;

      const wasActive = tab.classList.contains('active');
      tab.remove();
      if (wasActive) {
        const firstTab = tabList.querySelector('.tab');
        if (firstTab) {
          firstTab.classList.add('active');
          const file = firstTab.dataset.file;
          renderEditor(file);
          renderCPanel(file);
          updateFileTreeActive(file);
        }
      }
      return;
    }

    // Switch tab
    tabList.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const file = tab.dataset.file;
    renderEditor(file);
    renderCPanel(file);
    updateFileTreeActive(file);
  });

  // ─── File Tree ─────────────────────────────────────────────
  const fileTree = document.getElementById('fileTree');

  fileTree.addEventListener('click', (e) => {
    const row = e.target.closest('.tree-item-row');
    if (!row) return;

    const treeItem = row.parentElement;

    // Folder toggle
    if (treeItem.classList.contains('tree-folder')) {
      treeItem.classList.toggle('open');
      return;
    }

    // File click
    if (treeItem.classList.contains('tree-file')) {
      const filename = treeItem.dataset.file;

      // Only open .mon files in editor
      if (!filename.endsWith('.mon') || !files[filename]) return;

      // Update file tree active
      updateFileTreeActive(filename);

      // Check if tab exists
      let existingTab = tabList.querySelector(`.tab[data-file="${filename}"]`);
      if (!existingTab) {
        // Create new tab
        const newTab = document.createElement('div');
        newTab.className = 'tab';
        newTab.dataset.file = filename;
        newTab.innerHTML = `
          <span class="tab-icon mon-icon">M</span>
          <span class="tab-name">${filename}</span>
          <button class="tab-close" title="Fechar">&times;</button>
        `;
        tabList.appendChild(newTab);
        existingTab = newTab;
      }

      // Activate tab
      tabList.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      existingTab.classList.add('active');

      renderEditor(filename);
      renderCPanel(filename);
    }
  });

  function updateFileTreeActive(filename) {
    fileTree.querySelectorAll('.tree-file').forEach(f => f.classList.remove('active'));
    const target = fileTree.querySelector(`.tree-file[data-file="${filename}"]`);
    if (target) target.classList.add('active');
  }

  // ─── Context Menu ──────────────────────────────────────────
  const contextMenu = document.getElementById('contextMenu');

  fileTree.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const row = e.target.closest('.tree-item-row');
    if (!row) return;

    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.classList.add('visible');
  });

  document.addEventListener('click', () => {
    contextMenu.classList.remove('visible');
  });

  document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('.file-tree')) {
      contextMenu.classList.remove('visible');
    }
  });

  // ─── Right Panel Tabs ─────────────────────────────────────
  const panelTabBar = document.querySelector('.panel-tab-bar');
  const panelContents = {
    'c-output': document.getElementById('panelCOutput'),
    'errors': document.getElementById('panelErrors'),
    'ast': document.getElementById('panelAst')
  };

  panelTabBar.addEventListener('click', (e) => {
    const tab = e.target.closest('.panel-tab');
    if (!tab) return;

    panelTabBar.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const panelId = tab.dataset.panel;
    Object.values(panelContents).forEach(p => p.classList.remove('active'));
    if (panelContents[panelId]) {
      panelContents[panelId].classList.add('active');
    }
  });

  // ─── Bottom Panel Tabs ────────────────────────────────────
  const bottomTabBar = document.querySelector('.bottom-tabs');
  const bottomPanes = {
    'terminal': document.getElementById('bottomTerminal'),
    'output': document.getElementById('bottomOutput'),
    'build': document.getElementById('bottomBuild'),
    'debug-output': document.getElementById('bottomDebugOutput')
  };

  bottomTabBar.addEventListener('click', (e) => {
    const tab = e.target.closest('.bottom-tab');
    if (!tab) return;

    bottomTabBar.querySelectorAll('.bottom-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const paneId = tab.dataset.bottom;
    Object.values(bottomPanes).forEach(p => p.classList.remove('active'));
    if (bottomPanes[paneId]) {
      bottomPanes[paneId].classList.add('active');
    }
  });

  // ─── Bottom Panel Toggle ──────────────────────────────────
  const bottomPanel = document.getElementById('bottomPanel');
  const bottomToggle = document.getElementById('bottomToggle');

  bottomToggle.addEventListener('click', () => {
    bottomPanel.classList.toggle('collapsed');
  });

  // ─── Activity Bar ─────────────────────────────────────────
  const activityBtns = document.querySelectorAll('.activity-btn[data-panel]');
  const sidebar = document.getElementById('sidebar');

  activityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const wasActive = btn.classList.contains('active');

      // If clicking the active one, toggle sidebar
      if (wasActive) {
        sidebar.style.display = sidebar.style.display === 'none' ? '' : 'none';
        btn.classList.toggle('active');
        return;
      }

      // Switch active
      activityBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sidebar.style.display = '';
    });
  });

  // ─── Error Click Navigation ───────────────────────────────
  errorListEl.addEventListener('click', (e) => {
    const errorItem = e.target.closest('.error-item');
    if (!errorItem) return;

    const line = parseInt(errorItem.dataset.line);
    const file = errorItem.dataset.file;

    // Switch to C Gerado tab to show context
    panelTabBar.querySelector('[data-panel="c-output"]').click();

    // Highlight the error line in the editor
    const codeLines = codeAreaEl.querySelectorAll('.code-line');
    codeLines.forEach(cl => cl.classList.remove('highlight'));
    if (codeLines[line - 1]) {
      codeLines[line - 1].classList.add('highlight');
      codeLines[line - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Update line numbers
    const lineNums = lineNumbersEl.querySelectorAll('.line-number');
    lineNums.forEach(ln => ln.classList.remove('active'));
    if (lineNums[line - 1]) lineNums[line - 1].classList.add('active');

    updateStatusCursor(line, 1);
  });

  // ─── Resize: Sidebar ──────────────────────────────────────
  const resizeSidebar = document.getElementById('resizeSidebar');
  let isSidebarResizing = false;

  resizeSidebar.addEventListener('mousedown', (e) => {
    isSidebarResizing = true;
    resizeSidebar.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  // ─── Resize: Right Panel ──────────────────────────────────
  const resizePanel = document.getElementById('resizePanel');
  const rightPanel = document.getElementById('rightPanel');
  let isPanelResizing = false;

  resizePanel.addEventListener('mousedown', (e) => {
    isPanelResizing = true;
    resizePanel.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  // ─── Resize: Bottom Panel ─────────────────────────────────
  const resizeBottom = document.getElementById('resizeBottom');
  let isBottomResizing = false;

  resizeBottom.addEventListener('mousedown', (e) => {
    isBottomResizing = true;
    resizeBottom.classList.add('active');
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  // ─── Global Mouse Events for Resize ───────────────────────
  document.addEventListener('mousemove', (e) => {
    if (isSidebarResizing) {
      const activityBarWidth = 56;
      const newWidth = e.clientX - activityBarWidth - 16; // 16 for IDE window margin
      if (newWidth >= 160 && newWidth <= 500) {
        sidebar.style.width = newWidth + 'px';
      }
    }

    if (isPanelResizing) {
      const wrapperRect = document.querySelector('.editor-panel-wrapper').getBoundingClientRect();
      const newWidth = wrapperRect.right - e.clientX;
      if (newWidth >= 240 && newWidth <= 700) {
        rightPanel.style.width = newWidth + 'px';
      }
    }

    if (isBottomResizing) {
      const ideWindow = document.querySelector('.ide-window');
      const windowRect = ideWindow.getBoundingClientRect();
      const statusbarHeight = 28;
      const newHeight = windowRect.bottom - e.clientY - statusbarHeight;
      if (newHeight >= 80 && newHeight <= 500) {
        bottomPanel.style.height = newHeight + 'px';
        bottomPanel.classList.remove('collapsed');
      }
    }
  });

  document.addEventListener('mouseup', () => {
    if (isSidebarResizing || isPanelResizing || isBottomResizing) {
      isSidebarResizing = false;
      isPanelResizing = false;
      isBottomResizing = false;
      resizeSidebar.classList.remove('active');
      resizePanel.classList.remove('active');
      resizeBottom.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });

  // ─── Status Bar: Click Errors to Toggle Panel ─────────────
  document.getElementById('statusErrors').addEventListener('click', () => {
    panelTabBar.querySelector('[data-panel="errors"]').click();
  });

  // ─── Minimap: Scroll Interaction ──────────────────────────
  const editorScroll = document.getElementById('editorScroll');
  const editorContent = document.getElementById('editorContent');
  const minimapViewport = document.getElementById('minimapViewport');

  editorContent.addEventListener('scroll', () => {
    const scrollRatio = editorContent.scrollTop / (editorContent.scrollHeight - editorContent.clientHeight || 1);
    const minimap = document.getElementById('minimap');
    const maxTop = minimap.clientHeight - minimapViewport.clientHeight;
    minimapViewport.style.top = (scrollRatio * maxTop) + 'px';
  });

  // ─── Initialize ────────────────────────────────────────────
  renderEditor('main.mon');
  renderCPanel('main.mon');
  renderErrors();
  renderAST();
});
