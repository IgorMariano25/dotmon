/* ============================================================
   dotmon IDE — Application Logic
   Monaco Editor + Compiler Integration + File System API
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // ─── API Client ──────────────────────────────────────────
  const API_BASE = window.location.origin;
  let backendAvailable = false;

  const api = {
    async check() {
      try {
        const r = await fetch(`${API_BASE}/api/files`, {
          signal: AbortSignal.timeout(2000),
        });
        return r.ok;
      } catch {
        return false;
      }
    },
    async loadProject() {
      const r = await fetch(`${API_BASE}/api/project`);
      if (!r.ok) throw new Error("Falha ao carregar projeto");
      const data = await r.json();
      const files = data.files;
      if (data.folders) files.__folders__ = data.folders;
      return files;
    },
    async saveFile(path, content) {
      await fetch(`${API_BASE}/api/files/${path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    },
    async createFile(path, content) {
      await fetch(`${API_BASE}/api/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content }),
      });
    },
    async deleteFile(path) {
      await fetch(`${API_BASE}/api/files/${path}`, { method: "DELETE" });
    },
    async renameFile(oldPath, newPath) {
      await fetch(`${API_BASE}/api/files/${oldPath}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_path: newPath }),
      });
    },
    async saveGenerated(filename, content) {
      await fetch(`${API_BASE}/api/generated/${filename}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    },
    async createFolder(path) {
      await fetch(`${API_BASE}/api/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
    },
    async deleteFolder(path) {
      await fetch(`${API_BASE}/api/folders/${path}`, {
        method: "DELETE",
      });
    },
  };

  // ─── Virtual File System ─────────────────────────────────
  const DEFAULT_FILES = {
    "src/main.mon": `// Digimon Evolution System
// Main game logic for dotmon

Start
{
    // Define base stats
    Baby nivel = 10;
    Pup experiencia = 250;
    Moji nome = "Agumon";
    Moji evolucao = "Greymon";
    Bit pronto = true;

    // Check evolution conditions
    Evo (nivel > 15) {
        Show("Mega evolucao disponivel!");
        Show(evolucao);
    }
    AltEvo (nivel == 10) {
        Show("Evolucao padrao");
        Show(nome);
    }
    FailEvo {
        Show("Nivel insuficiente");
    }

    // Battle calculation
    Champ dano = experiencia * nivel;
    Show(dano);

    // Display results
    Show("Batalha concluida!");
}
Finish
`,
    "src/batalha.mon": `// Battle System Module
// Handles combat logic between Digimons

Start
{
    // Attacker stats
    Moji atacante = "WarGreymon";
    Champ ataque = 850;
    Champ velocidade = 120;

    // Defender stats
    Moji defensor = "MetalGarurumon";
    Champ defesa = 780;
    Champ hp = 1200;

    // Calculate damage
    Champ dano = ataque - defesa;

    Evo (dano > 0) {
        hp = hp - dano;
        Show("Dano causado!");
        Show(dano);
    }
    FailEvo {
        Show("Ataque bloqueado!");
    }

    Show(hp);
}
Finish
`,
    "src/evolucao.mon": `// Evolution System Module
// Manages Digimon evolution paths

Start
{
    Moji digimon = "Koromon";
    Baby stage = 1;
    Pup xp = 500;

    // Evolution check
    Evo (xp > 1000) {
        stage = 4;
        digimon = "WarGreymon";
        Show("Mega Evolution!");
    }
    AltEvo (xp > 500) {
        stage = 3;
        digimon = "Greymon";
        Show("Champion Evolution!");
    }
    AltEvo (xp > 100) {
        stage = 2;
        digimon = "Agumon";
        Show("Rookie Evolution!");
    }
    FailEvo {
        Show("Not enough XP");
    }

    Show(digimon);
    Show(stage);
}
Finish
`,
    "src/digimon.mon": `// Digimon Data Module
// Base definitions for Digimon creatures

Start
{
    // Agumon stats
    Moji nome = "Agumon";
    Baby ataque = 45;
    Baby defesa = 30;
    Pup hp = 120;
    Bit ativo = true;

    // Show Digimon info
    Show("=== Digimon Info ===");
    Show(nome);
    Show(ataque);
    Show(defesa);
    Show(hp);
}
Finish
`,
    "src/utils.mon": `// Utility Module
// Helper functions and common calculations

Start
{
    // Power calculation
    Baby base = 10;
    Baby multiplicador = 3;
    Champ poder = base * multiplicador;

    Show("Poder calculado:");
    Show(poder);

    // Status check
    Bit is_forte = true;
    Evo (poder > 25) {
        Show("Digimon forte!");
    }
    FailEvo {
        Show("Digimon fraco...");
    }
}
Finish
`,
  };

  // Load from backend API with localStorage fallback
  let fileSystem = {};
  let emptyFolders = new Set();

  function saveFS() {
    try {
      localStorage.setItem("dotmon-fs", JSON.stringify(fileSystem));
      localStorage.setItem("dotmon-folders", JSON.stringify([...emptyFolders]));
    } catch (_) {
      /* ignore */
    }
  }

  function saveFileToBackend(path) {
    if (backendAvailable && fileSystem[path] !== undefined) {
      api.saveFile(path, fileSystem[path]).catch(() => {});
    }
  }

  async function initFileSystem() {
    backendAvailable = await api.check();
    if (backendAvailable) {
      try {
        const project = await api.loadProject();
        fileSystem = project;
        // Load empty folders from backend if returned separately
        if (project.__folders__) {
          project.__folders__.forEach((f) => emptyFolders.add(f));
          delete fileSystem.__folders__;
        }
        saveFS(); // sync to localStorage as cache
        updateBackendStatus(true);
        return;
      } catch (_) {
        backendAvailable = false;
      }
    }
    // Fallback: localStorage or defaults
    try {
      const saved = localStorage.getItem("dotmon-fs");
      if (saved) fileSystem = JSON.parse(saved);
    } catch (_) {
      /* ignore */
    }
    if (Object.keys(fileSystem).length === 0) fileSystem = { ...DEFAULT_FILES };
    // Load empty folders from localStorage
    try {
      const savedFolders = localStorage.getItem("dotmon-folders");
      if (savedFolders) emptyFolders = new Set(JSON.parse(savedFolders));
    } catch (_) {
      /* ignore */
    }
    updateBackendStatus(false);
  }

  function updateBackendStatus(connected) {
    const el = document.getElementById("statusBackend");
    if (!el) return;
    el.innerHTML = connected
      ? '<span style="color:#4ec9b0">● API</span>'
      : '<span style="color:#858585">○ Local</span>';
    el.title = connected
      ? "Conectado ao backend FastAPI"
      : "Modo offline (localStorage)";
  }

  // ─── Compilation state ─────────────────────────────────────
  let compiledResults = {};
  let currentFile = "src/main.mon";
  let mainEditor = null;
  let cEditor = null;

  // ─── Monaco Setup ──────────────────────────────────────────
  require.config({
    paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs" },
  });

  require(["vs/editor/editor.main"], function () {
    // Register dotmon language
    monaco.languages.register({ id: "dotmon" });

    monaco.languages.setMonarchTokensProvider("dotmon", {
      keywords: [
        "Start",
        "Finish",
        "Evo",
        "AltEvo",
        "FailEvo",
        "Loop",
        "Spiral",
        "Jam",
        "Skip",
        "Xros",
        "Send",
        "World",
        "Core",
        "Call",
      ],
      typeKeywords: ["Baby", "Pup", "Rook", "Champ", "Moji", "Bit"],
      builtins: ["Show", "Ask"],
      operators: ["=", "==", "!=", ">", "<", ">=", "<=", "+", "-", "*", "/"],
      symbols: /[=><!~?:&|+\-*\/\^%]+/,

      tokenizer: {
        root: [
          [/\/\/.*$/, "comment"],
          [/\/\*/, "comment", "@comment"],
          [/"[^"\\]*(?:\\.[^"\\]*)*"/, "string"],
          [/'[^'\\]'/, "string.char"],
          [/\b(true|false)\b/, "keyword.boolean"],
          [/\b\d+\.\d+\b/, "number.float"],
          [/\b\d+\b/, "number"],
          [
            /[a-zA-Z_]\w*/,
            {
              cases: {
                "@keywords": "keyword",
                "@typeKeywords": "type",
                "@builtins": "support.function",
                "@default": "identifier",
              },
            },
          ],
          [/[{}()]/, "@brackets"],
          [/[;,.]/, "delimiter"],
          [
            /@symbols/,
            {
              cases: {
                "@operators": "operator",
                "@default": "",
              },
            },
          ],
          [/\s+/, "white"],
        ],
        comment: [
          [/[^/*]+/, "comment"],
          [/\*\//, "comment", "@pop"],
          [/[/*]/, "comment"],
        ],
      },
    });

    // Custom dark theme matching the IDE design
    monaco.editor.defineTheme("dotmon-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "c586c0", fontStyle: "bold" },
        { token: "type", foreground: "4ec9b0" },
        { token: "support.function", foreground: "dcdcaa" },
        { token: "string", foreground: "ce9178" },
        { token: "string.char", foreground: "ce9178" },
        { token: "number", foreground: "b5cea8" },
        { token: "number.float", foreground: "b5cea8" },
        { token: "keyword.boolean", foreground: "569cd6" },
        { token: "comment", foreground: "6a9955", fontStyle: "italic" },
        { token: "identifier", foreground: "9cdcfe" },
        { token: "operator", foreground: "d4d4d4" },
        { token: "delimiter", foreground: "ffd700" },
      ],
      colors: {
        "editor.background": "#1e1e1e",
        "editor.foreground": "#cccccc",
        "editor.lineHighlightBackground": "#ffffff0f",
        "editor.selectionBackground": "#264f78",
        "editorCursor.foreground": "#ffffff",
        "editorLineNumber.foreground": "#5a5a5a",
        "editorLineNumber.activeForeground": "#cccccc",
        "editorGutter.background": "#1e1e1e",
        "minimap.background": "#1e1e1e",
      },
    });

    // Autocompletion
    monaco.languages.registerCompletionItemProvider("dotmon", {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const suggestions = [
          ...["Baby", "Pup", "Rook", "Champ", "Moji", "Bit"].map((t) => ({
            label: t,
            kind: monaco.languages.CompletionItemKind.TypeParameter,
            insertText: t,
            range,
            detail: "Tipo dotmon",
          })),
          ...[
            "Start",
            "Finish",
            "Evo",
            "AltEvo",
            "FailEvo",
            "Loop",
            "Spiral",
            "Jam",
            "Skip",
            "Xros",
            "Send",
            "Show",
            "Ask",
          ].map((k) => ({
            label: k,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: k,
            range,
            detail: "Keyword dotmon",
          })),
          {
            label: "Start...Finish",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "Start\n{\n    ${1}\n}\nFinish\n",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: "Programa dotmon completo",
          },
          {
            label: "Evo...FailEvo",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              "Evo (${1:condition}) {\n    ${2}\n}\nFailEvo {\n    ${3}\n}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: "Condicional Evo/FailEvo",
          },
          {
            label: "Show()",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "Show(${1:value});",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: "Imprimir valor",
          },
          {
            label: "Loop()",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "Loop (${1:condition}) {\n    ${2}\n}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: "Loop while",
          },
        ];
        return { suggestions };
      },
    });

    // ─── Hover Provider (tooltips para keywords) ─────────────
    const dotmonHovers = {
      // Tipos de Dados
      Baby: {
        desc: "**Tipo inteiro** — Equivalente a `int` em C. Armazena números inteiros.",
        example: "Baby nivel = 10;\nShow(nivel);",
      },
      Pup: {
        desc: "**Tipo ponto flutuante** — Equivalente a `float` em C. Armazena números decimais.",
        example: "Pup peso = 45.5;\nShow(peso);",
      },
      Rook: {
        desc: "**Tipo inteiro longo** — Equivalente a `long` em C. Armazena inteiros grandes.",
        example: "Rook experiencia = 999999;\nShow(experiencia);",
      },
      Champ: {
        desc: "**Tipo inteiro** — Equivalente a `int` em C. Inteiro estágio Champion.",
        example: "Champ poder = 500;\nShow(poder);",
      },
      Moji: {
        desc: "**Tipo string** — Equivalente a `char[256]` em C. Armazena texto.",
        example: 'Moji nome = "Agumon";\nShow(nome);',
      },
      Bit: {
        desc: "**Tipo booleano** — Equivalente a `bool` em C. Armazena `true` ou `false`.",
        example: 'Bit ativo = true;\nEvo (ativo) {\n    Show("Ativo!");\n}',
      },
      // Inicializar e Finalizar
      Start: {
        desc: "**Início do programa** — Marca o ponto de entrada. Equivalente a `int main() {` em C.",
        example: 'Start\n{\n    Show("Ola, Mundo Digital!");\n}\nFinish',
      },
      Finish: {
        desc: "**Fim do programa** — Marca o encerramento. Equivalente a `return 0; }` em C.",
        example: 'Start\n{\n    Show("Fim!");\n}\nFinish',
      },
      // Controle de Fluxo (Condicionais)
      Evo: {
        desc: "**Condicional if** — Executa o bloco se a condição for verdadeira.",
        example: 'Evo (nivel > 10) {\n    Show("Nivel alto!");\n}',
      },
      AltEvo: {
        desc: "**Condicional else if** — Condição alternativa, testada se o `Evo` anterior for falso.",
        example:
          'Evo (nivel > 10) {\n    Show("Alto");\n}\nAltEvo (nivel > 5) {\n    Show("Medio");\n}',
      },
      FailEvo: {
        desc: "**Condicional else** — Executado quando todas as condições anteriores falharam.",
        example:
          'Evo (nivel > 10) {\n    Show("Alto");\n}\nFailEvo {\n    Show("Baixo");\n}',
      },
      // Loops
      Loop: {
        desc: "**Laço for / while** — Repete o bloco. Suporta forma completa `(init; cond; step)` ou apenas `(cond)`.",
        example:
          "// Forma while:\nLoop (x < 10) {\n    Show(x);\n    x = x + 1;\n}\n\n// Forma for:\nLoop (Baby i = 0; i < 5; i = i + 1) {\n    Show(i);\n}",
      },
      Spiral: {
        desc: "**Laço while** — Repete o bloco enquanto a condição for verdadeira.",
        example: "Baby x = 1;\nSpiral (x < 100) {\n    x = x * 2;\n}\nShow(x);",
      },
      // Controle de Fluxo (dentro de loops)
      Jam: {
        desc: "**Break** — Interrompe a execução do loop atual imediatamente.",
        example:
          "Loop (Baby i = 0; i < 100; i = i + 1) {\n    Evo (i == 10) {\n        Jam;\n    }\n}",
      },
      Skip: {
        desc: "**Continue** — Pula para a próxima iteração do loop, ignorando o restante do bloco.",
        example:
          "Loop (Baby i = 0; i < 10; i = i + 1) {\n    Evo (i == 5) {\n        Skip;\n    }\n    Show(i);\n}",
      },
      // Funções
      Xros: {
        desc: "**Declaração de função** — Define uma função reutilizável com parâmetros e retorno opcional.",
        example: "Xros Baby somar(Baby a, Baby b) {\n    Send a + b;\n}",
      },
      Send: {
        desc: "**Return** — Retorna um valor de dentro de uma função.",
        example: "Xros Baby dobro(Baby n) {\n    Send n * 2;\n}",
      },
      Call: {
        desc: "**Chamada de função** — Invoca uma função declarada com `Xros`.",
        example: "Call somar(5, 3);",
      },
      // Entrada e Saída
      Show: {
        desc: "**Imprimir** — Equivalente a `printf()` em C. Exibe valores no terminal.",
        example: 'Show("Ola mundo!");\nShow(42);\nShow(nome);',
      },
      Ask: {
        desc: "**Ler entrada** — Equivalente a `scanf()` em C. Lê um valor do usuário e armazena na variável.",
        example: 'Moji nome = "";\nAsk(nome);\nShow(nome);',
      },
      // Interoperabilidade / Escopo
      World: {
        desc: "**Escopo global** — Declara elementos no escopo global do programa.",
        example: "World {\n    Baby globalVar = 100;\n}",
      },
      Core: {
        desc: "**Módulo** — Define um módulo de código para organização.",
        example: "Core utils {\n    // funcoes utilitarias\n}",
      },
      // Operadores (literais booleanos)
      true: {
        desc: "**Literal booleano verdadeiro** — Valor `true` do tipo `Bit`.",
        example: "Bit ativo = true;",
      },
      false: {
        desc: "**Literal booleano falso** — Valor `false` do tipo `Bit`.",
        example: "Bit ativo = false;",
      },
    };

    monaco.languages.registerHoverProvider("dotmon", {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        const info = dotmonHovers[word.word];
        if (!info) return null;
        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn,
          ),
          contents: [
            { value: `**\`${word.word}\`**` },
            { value: info.desc },
            { value: "```dotmon\n" + info.example + "\n```" },
          ],
        };
      },
    });

    // ─── Create Editors ──────────────────────────────────────
    const editorContainer = document.getElementById("monacoEditorContainer");
    mainEditor = monaco.editor.create(editorContainer, {
      value: fileSystem[currentFile] || "",
      language: "dotmon",
      theme: "dotmon-dark",
      fontFamily:
        "'JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
      fontSize: 13,
      lineHeight: 22,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 4,
      renderWhitespace: "selection",
      bracketPairColorization: { enabled: true },
      smoothScrolling: true,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      padding: { top: 8 },
      glyphMargin: true,
      overviewRulerLanes: 3,
    });

    const cContainer = document.getElementById("cEditorContainer");
    cEditor = monaco.editor.create(cContainer, {
      value: "// Compile a .mon file to see C output here",
      language: "c",
      theme: "dotmon-dark",
      fontFamily:
        "'JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
      fontSize: 12,
      lineHeight: 20,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      readOnly: true,
      tabSize: 4,
      padding: { top: 4 },
    });

    // Real-time diagnostics as you type
    let diagnosticTimer = null;
    let editorReady = false;
    mainEditor.onDidChangeModelContent(() => {
      if (!editorReady) return; // Skip saves during initialization
      fileSystem[currentFile] = mainEditor.getValue();
      saveFS();
      saveFileToBackend(currentFile);
      markTabModified(currentFile, true);
      clearTimeout(diagnosticTimer);
      diagnosticTimer = setTimeout(() => runDiagnostics(), 200);
    });

    mainEditor.onDidChangeCursorPosition((e) => {
      updateStatusCursor(e.position.lineNumber, e.position.column);
    });

    // Async initialization: load files from API then render
    initFileSystem()
      .then(() => {
        // Ensure defaults are loaded if filesystem is empty or file is missing
        if (Object.keys(fileSystem).length === 0 || !fileSystem[currentFile]) {
          fileSystem = { ...DEFAULT_FILES, ...fileSystem };
          saveFS();
        }
        renderEditor(currentFile);
        doCompile(currentFile);
        renderFileTree();
        activateTab("src/main.mon");
        editorReady = true;
      })
      .catch(() => {
        // Absolute fallback
        fileSystem = { ...DEFAULT_FILES };
        saveFS();
        renderEditor(currentFile);
        doCompile(currentFile);
        renderFileTree();
        activateTab("src/main.mon");
        editorReady = true;
      });

    // ─── Diagnostics (real-time) ─────────────────────────────
    let currentDecorations = [];

    function runDiagnostics() {
      const source = mainEditor.getValue();
      if (!source.trim()) {
        monaco.editor.setModelMarkers(mainEditor.getModel(), "dotmon", []);
        clearDiagnosticDecorations();
        renderErrors([]);
        updateStatusErrors(0, 0);
        updateErrorBadge(0);
        return;
      }

      // Skip real-time diagnostics for .c files (no diagnose-only mode for C)
      if (isCFile(currentFile)) return;

      try {
        const result = DotmonCompiler.diagnose(source, currentFile);

        // Update markers and error panel
        setMonacoMarkers(result.diagnostics);
        renderErrors(result.diagnostics);

        // Update AST panel
        const astEl = document.getElementById("astContent");
        if (astEl) astEl.textContent = result.astString || "No AST available";

        const errCount = result.diagnostics.filter(
          (d) => d.severity === "error",
        ).length;
        const warnCount = result.diagnostics.filter(
          (d) => d.severity === "warning",
        ).length;
        updateStatusErrors(errCount, warnCount);
        updateErrorBadge(errCount + warnCount);

        // Auto-switch to Errors panel when problems are detected
        if (errCount + warnCount > 0) {
          showErrorsPanel();
        }
      } catch (_) {
        monaco.editor.setModelMarkers(mainEditor.getModel(), "dotmon", []);
        clearDiagnosticDecorations();
        renderErrors([]);
        updateStatusErrors(0, 0);
        updateErrorBadge(0);
      }
    }

    function showErrorsPanel() {
      const tabBar = document.querySelector(".panel-tab-bar");
      if (!tabBar) return;
      const errorsTab = tabBar.querySelector('[data-panel="errors"]');
      if (!errorsTab || errorsTab.classList.contains("active")) return;
      tabBar
        .querySelectorAll(".panel-tab")
        .forEach((t) => t.classList.remove("active"));
      errorsTab.classList.add("active");
      const panels = {
        "c-output": document.getElementById("panelCOutput"),
        errors: document.getElementById("panelErrors"),
        ast: document.getElementById("panelAst"),
      };
      Object.values(panels).forEach((p) => p.classList.remove("active"));
      panels.errors.classList.add("active");
    }

    function setMonacoMarkers(diagnostics) {
      const markers = diagnostics.map((d) => ({
        severity:
          d.severity === "error"
            ? monaco.MarkerSeverity.Error
            : monaco.MarkerSeverity.Warning,
        message: d.message,
        startLineNumber: d.line,
        startColumn: d.column,
        endLineNumber: d.line,
        endColumn: d.endColumn || d.column + 1,
      }));
      monaco.editor.setModelMarkers(mainEditor.getModel(), "dotmon", markers);
      applyDiagnosticDecorations(diagnostics);
    }

    function clearDiagnosticDecorations() {
      currentDecorations = mainEditor.deltaDecorations(currentDecorations, []);
      clearLensStyles();
    }

    // Inject dynamic CSS for Error Lens inline messages
    const lensStyleMap = {};
    function injectLensStyle(id, message, isError) {
      if (lensStyleMap[id]) lensStyleMap[id].remove();
      const color = isError
        ? "rgba(241, 76, 76, 0.7)"
        : "rgba(204, 167, 0, 0.65)";
      const symbol = isError ? "\u00D7" : "\u26A0";
      const escaped = message
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/'/g, "\\'");
      const style = document.createElement("style");
      style.textContent = `.${id}::after { content: "   ${symbol} ${escaped}"; color: ${color}; font-style: italic; font-size: 0.9em; opacity: 0.85; pointer-events: none; }`;
      document.head.appendChild(style);
      lensStyleMap[id] = style;
    }

    function clearLensStyles() {
      for (const [id, style] of Object.entries(lensStyleMap)) {
        style.remove();
        delete lensStyleMap[id];
      }
    }

    function applyDiagnosticDecorations(diagnostics) {
      clearLensStyles();
      const decorations = [];
      for (const d of diagnostics) {
        const isError = d.severity === "error";
        const line = d.line || 1;
        const model = mainEditor.getModel();
        const lineLength = model.getLineLength(line);

        // 1) Gutter icon
        decorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: false,
            glyphMarginClassName: isError
              ? "dotmon-glyph-error"
              : "dotmon-glyph-warning",
            glyphMarginHoverMessage: {
              value: `**${isError ? "Error" : "Warning"}:** ${d.message}`,
            },
          },
        });

        // 2) Full line background highlight
        decorations.push({
          range: new monaco.Range(line, 1, line, lineLength + 1),
          options: {
            isWholeLine: true,
            className: isError ? "dotmon-line-error" : "dotmon-line-warning",
            overviewRuler: {
              color: isError ? "#f14c4c" : "#cca700",
              position: monaco.editor.OverviewRulerLane.Full,
            },
            minimap: {
              color: isError ? "#f14c4c" : "#cca700",
              position: monaco.editor.MinimapPosition.Inline,
            },
          },
        });

        // 3) Error Lens: inline message after the line
        const lensId = `dotmon-lens-${line}-${isError ? "e" : "w"}`;
        injectLensStyle(lensId, d.message, isError);
        decorations.push({
          range: new monaco.Range(line, lineLength + 1, line, lineLength + 1),
          options: {
            afterContentClassName: lensId,
          },
        });
      }

      currentDecorations = mainEditor.deltaDecorations(
        currentDecorations,
        decorations,
      );
    }

    // ─── Compile Pipeline ────────────────────────────────────
    function isMonFile(f) { return f.endsWith(".mon"); }
    function isCFile(f) { return f.endsWith(".c"); }

    function doCompile(filename) {
      const source = fileSystem[filename];
      if (!source) return;

      if (isCFile(filename)) {
        return doCompileC(filename, source);
      }
      return doCompileMon(filename, source);
    }

    // .mon → C
    function doCompileMon(filename, source) {
      const startTime = performance.now();
      const result = DotmonCompiler.compile(source, filename);
      const elapsed = (performance.now() - startTime).toFixed(1);

      compiledResults[filename] = result;

      // Update output editor
      cEditor.setValue(result.cCode || "// Compilation failed");
      const cFileName = filename.replace("src/", "").replace(".mon", ".c");
      updateOutputPanelLabel(`generated/${cFileName}`, "C Gerado");

      // Save generated C to backend
      if (backendAvailable && result.cCode) {
        api.saveGenerated(cFileName, result.cCode).catch(() => {});
      }

      // Update error panel
      renderErrors(result.diagnostics);

      // Update AST panel
      document.getElementById("astContent").textContent =
        result.astString || "No AST available";

      // Update markers
      setMonacoMarkers(result.diagnostics);

      // Update status bar
      const errCount = result.diagnostics.filter(
        (d) => d.severity === "error",
      ).length;
      const warnCount = result.diagnostics.filter(
        (d) => d.severity === "warning",
      ).length;
      updateStatusErrors(errCount, warnCount);
      updateErrorBadge(errCount + warnCount);

      // Terminal output
      const lines = [];
      lines.push({
        cls: "terminal-info",
        text: `[info] dotmon compiler v0.1.0`,
      });
      lines.push({
        cls: "terminal-info",
        text: `[info] Compiling ${filename} → C...`,
      });
      lines.push({
        cls: "terminal-info",
        text: `[info] Lexical analysis: ${result.tokens.length} tokens`,
      });
      if (result.ast) {
        lines.push({
          cls: "terminal-info",
          text: `[info] Syntax analysis: AST generated`,
        });
      }
      for (const d of result.diagnostics) {
        const cls =
          d.severity === "error" ? "terminal-error" : "terminal-warning";
        const prefix = d.severity === "error" ? "[error]" : "[warn]";
        lines.push({ cls, text: `${prefix} ${d.message} (line ${d.line})` });
      }
      if (result.cCode) {
        lines.push({ cls: "terminal-info", text: `[info] C code generated` });
      }
      const status = errCount > 0 ? "terminal-error" : "terminal-success";
      lines.push({
        cls: status,
        text: `[done] Compilation finished in ${elapsed}ms — ${errCount} error(s), ${warnCount} warning(s)`,
      });
      appendTerminalBlock(lines);

      // Auto-switch panel: show errors if any, else show output
      if (errCount > 0) {
        showErrorsPanel();
      } else {
        showCOutputPanel();
      }

      return result;
    }

    // .c → Dotmon
    function doCompileC(filename, source) {
      const startTime = performance.now();
      const result = CToDotmon.transpile(source, filename);
      const elapsed = (performance.now() - startTime).toFixed(1);

      compiledResults[filename] = result;

      // Update output editor with generated Dotmon code
      cEditor.setValue(result.dotmonCode || "// Transpilation failed");
      const monFileName = filename.replace("src/", "").replace(".c", ".mon");
      updateOutputPanelLabel(`generated/${monFileName}`, "Dotmon Gerado");

      // Update error panel
      renderErrors(result.diagnostics);

      // Update AST panel
      document.getElementById("astContent").textContent =
        result.ast ? JSON.stringify(result.ast, null, 2) : "No AST available";

      // Update markers
      setMonacoMarkers(result.diagnostics);

      // Update status bar
      const errCount = result.diagnostics.filter(
        (d) => d.severity === "error",
      ).length;
      const warnCount = result.diagnostics.filter(
        (d) => d.severity === "warning",
      ).length;
      updateStatusErrors(errCount, warnCount);
      updateErrorBadge(errCount + warnCount);

      // Terminal output
      const lines = [];
      lines.push({
        cls: "terminal-info",
        text: `[info] C → Dotmon transpiler v0.1.0`,
      });
      lines.push({
        cls: "terminal-info",
        text: `[info] Transpiling ${filename} → Dotmon...`,
      });
      lines.push({
        cls: "terminal-info",
        text: `[info] Lexical analysis: ${result.tokens.length} tokens`,
      });
      if (result.ast) {
        lines.push({
          cls: "terminal-info",
          text: `[info] Syntax analysis: AST generated`,
        });
      }
      for (const d of result.diagnostics) {
        const cls =
          d.severity === "error" ? "terminal-error" : "terminal-warning";
        const prefix = d.severity === "error" ? "[error]" : "[warn]";
        lines.push({ cls, text: `${prefix} ${d.message} (line ${d.line})` });
      }
      if (result.dotmonCode) {
        lines.push({ cls: "terminal-info", text: `[info] Dotmon code generated` });
      }
      const status = errCount > 0 ? "terminal-error" : "terminal-success";
      lines.push({
        cls: status,
        text: `[done] Transpilation finished in ${elapsed}ms — ${errCount} error(s), ${warnCount} warning(s)`,
      });
      appendTerminalBlock(lines);

      if (errCount > 0) {
        showErrorsPanel();
      } else {
        showCOutputPanel();
      }

      return result;
    }

    function updateOutputPanelLabel(filenameText, tabLabel) {
      const panelFilename = document.querySelector(".panel-filename");
      if (panelFilename) panelFilename.textContent = filenameText;
      const tabEl = document.querySelector('.panel-tab[data-panel="c-output"]');
      if (tabEl) {
        // Preserve the SVG icon, update only the text node
        const textNode = Array.from(tabEl.childNodes).find(
          (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
        );
        if (textNode) textNode.textContent = ` ${tabLabel} `;
      }
    }

    function showCOutputPanel() {
      const tabBar = document.querySelector(".panel-tab-bar");
      if (!tabBar) return;
      const cTab = tabBar.querySelector('[data-panel="c-output"]');
      if (!cTab || cTab.classList.contains("active")) return;
      tabBar
        .querySelectorAll(".panel-tab")
        .forEach((t) => t.classList.remove("active"));
      cTab.classList.add("active");
      const panels = {
        "c-output": document.getElementById("panelCOutput"),
        errors: document.getElementById("panelErrors"),
        ast: document.getElementById("panelAst"),
      };
      Object.values(panels).forEach((p) => p.classList.remove("active"));
      panels["c-output"].classList.add("active");
      setTimeout(() => cEditor.layout(), 50);
    }

    // ─── Render Editor ───────────────────────────────────────
    function renderEditor(filename) {
      const content = fileSystem[filename];
      if (content === undefined) return;
      currentFile = filename;

      mainEditor.setValue(content);
      const model = mainEditor.getModel();
      monaco.editor.setModelLanguage(
        model,
        isMonFile(filename) ? "dotmon" : isCFile(filename) ? "c" : "plaintext",
      );

      // Breadcrumb
      const parts = filename.split("/");
      const breadcrumbEl = document.querySelector(".breadcrumb");
      let bcHTML = '<span class="breadcrumb-item">dotmon-project</span>';
      parts.forEach((p, i) => {
        bcHTML +=
          '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
        const isLast = i === parts.length - 1;
        bcHTML += `<span class="breadcrumb-item${isLast ? " active" : ""}">${p}</span>`;
      });
      breadcrumbEl.innerHTML = bcHTML;

      // Title bar
      document.querySelector(".titlebar-project").textContent =
        parts[parts.length - 1];

      // Update status bar language
      const langEl = document.querySelector(".statusbar-lang");
      if (isMonFile(filename)) {
        langEl.innerHTML =
          '<span class="file-icon mon-icon" style="font-size:9px;width:14px;height:14px;line-height:14px;">M</span> dotmon';
      } else if (isCFile(filename)) {
        langEl.innerHTML =
          '<span class="file-icon" style="font-size:9px;width:14px;height:14px;line-height:14px;background:#005f9e;color:#fff;border-radius:3px;display:inline-block;text-align:center;">C</span> C';
      } else {
        langEl.textContent = filename.split(".").pop();
      }

      // Restore compiled output if exists
      if (compiledResults[filename]) {
        const r = compiledResults[filename];
        cEditor.setValue(r.cCode || r.dotmonCode || "");
      } else {
        const hint = isCFile(filename)
          ? '// Click "Compilar" or press Ctrl+B to transpile to Dotmon'
          : '// Click "Compilar" or press Ctrl+B to compile to C';
        cEditor.setValue(hint);
      }

      // Update output panel label based on file type
      if (isCFile(filename)) {
        const monName = filename.replace("src/", "").replace(".c", ".mon");
        updateOutputPanelLabel(`generated/${monName}`, "Dotmon Gerado");
      } else {
        const cName = filename.replace("src/", "").replace(".mon", ".c");
        updateOutputPanelLabel(`generated/${cName}`, "C Gerado");
      }

      // Always run diagnostics for real-time errors/warnings
      runDiagnostics();
    }

    // ─── Error Panel ─────────────────────────────────────────
    function renderErrors(diagnostics) {
      const errorListEl = document.getElementById("errorList");
      const errors = diagnostics.filter((d) => d.severity === "error");
      const warnings = diagnostics.filter((d) => d.severity === "warning");

      // Summary
      const summaryEl = document.querySelector(".error-summary");
      if (summaryEl) {
        summaryEl.innerHTML = `
          <span class="error-count error-type">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#f14c4c" stroke="none"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15" stroke="#1e1e1e" stroke-width="2.5"/><line x1="9" y1="9" x2="15" y2="15" stroke="#1e1e1e" stroke-width="2.5"/></svg>
            ${errors.length} Error${errors.length !== 1 ? "s" : ""}
          </span>
          <span class="error-count warning-type">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#cca700" stroke="none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13" stroke="#1e1e1e" stroke-width="2"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="#1e1e1e" stroke-width="2"/></svg>
            ${warnings.length} Warning${warnings.length !== 1 ? "s" : ""}
          </span>`;
      }

      let html = "";
      for (const d of diagnostics) {
        const isErr = d.severity === "error";
        const color = isErr ? "#f14c4c" : "#cca700";
        const label = isErr ? "error" : "warning";
        const icon = isErr
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="${color}" stroke="none"><circle cx="12" cy="12" r="10"/><path d="M8 8l8 8M16 8l-8 8" stroke="#1e1e1e" stroke-width="2.5" stroke-linecap="round"/></svg>`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="${color}" stroke="none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01" stroke="#1e1e1e" stroke-width="2" stroke-linecap="round"/></svg>`;
        html += `
          <div class="error-item" data-line="${d.line}" data-col="${d.column}">
            <div class="error-item-icon">${icon}</div>
            <div class="error-item-body">
              <div class="error-item-message">${escHTML(d.message)}</div>
              <div class="error-item-location">
                <span class="file">${currentFile}</span>
                <span style="color:#858585">[Ln ${d.line}, Col ${d.column}]</span>
                <span style="color:${color};font-size:10px;margin-left:6px;text-transform:uppercase;font-weight:600;letter-spacing:0.5px">${label}</span>
              </div>
            </div>
          </div>`;
      }
      errorListEl.innerHTML =
        html ||
        '<div style="padding:24px;color:#5a5a5a;text-align:center;font-size:13px">No problems detected</div>';

      // Click to navigate
      errorListEl.querySelectorAll(".error-item").forEach((el) => {
        el.addEventListener("click", () => {
          const line = parseInt(el.dataset.line);
          const col = parseInt(el.dataset.col) || 1;
          mainEditor.revealLineInCenter(line);
          mainEditor.setPosition({ lineNumber: line, column: col });
          mainEditor.focus();
        });
      });
    }

    // ─── Tab Management ──────────────────────────────────────
    const tabList = document.querySelector(".tab-list");

    function getOpenTabs() {
      return [...tabList.querySelectorAll(".tab")].map((t) => t.dataset.file);
    }

    function createTab(filename) {
      const existing = tabList.querySelector(`.tab[data-file="${filename}"]`);
      if (existing) return existing;
      const displayName = filename.split("/").pop();
      const isMon = filename.endsWith(".mon");
      const tab = document.createElement("div");
      tab.className = "tab";
      tab.dataset.file = filename;
      tab.innerHTML = `
        ${isMon ? '<span class="tab-icon mon-icon">M</span>' : '<span class="tab-icon c-icon">C</span>'}
        <span class="tab-name">${displayName}</span>
        <button class="tab-close" title="Fechar">&times;</button>`;
      tabList.appendChild(tab);
      return tab;
    }

    function activateTab(filename) {
      tabList
        .querySelectorAll(".tab")
        .forEach((t) => t.classList.remove("active"));
      const tab = createTab(filename);
      tab.classList.add("active");
      renderEditor(filename);
    }

    function markTabModified(filename, modified) {
      const tab = tabList.querySelector(`.tab[data-file="${filename}"]`);
      if (!tab) return;
      const nameEl = tab.querySelector(".tab-name");
      const base = filename.split("/").pop();
      nameEl.textContent = modified ? base + " \u25CF" : base;
    }

    tabList.addEventListener("click", (e) => {
      if (e.target.closest(".tab-close")) {
        const tab = e.target.closest(".tab");
        const tabs = tabList.querySelectorAll(".tab");
        if (tabs.length <= 1) return;
        const wasActive = tab.classList.contains("active");
        tab.remove();
        if (wasActive) {
          const first = tabList.querySelector(".tab");
          if (first) activateTab(first.dataset.file);
        }
        return;
      }
      const tab = e.target.closest(".tab");
      if (tab) activateTab(tab.dataset.file);
    });

    // ─── File Tree ───────────────────────────────────────────
    const fileTree = document.getElementById("fileTree");

    function buildFileTree() {
      const tree = {};
      for (const path of Object.keys(fileSystem)) {
        const parts = path.split("/");
        let node = tree;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!node[parts[i]]) node[parts[i]] = {};
          node = node[parts[i]];
        }
        node[parts[parts.length - 1]] = null; // leaf = file
      }
      // Also add generated files from compilation
      for (const [file, result] of Object.entries(compiledResults)) {
        if (result && result.cCode) {
          const cName = file
            .replace("src/", "generated/")
            .replace(".mon", ".c");
          const parts = cName.split("/");
          let node = tree;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!node[parts[i]]) node[parts[i]] = {};
            node = node[parts[i]];
          }
          node[parts[parts.length - 1]] = null;
        }
      }
      // Also add empty folders
      for (const folderPath of emptyFolders) {
        const parts = folderPath.split("/");
        let node = tree;
        for (const part of parts) {
          if (!node[part]) node[part] = {};
          node = node[part];
        }
      }
      return tree;
    }

    function renderFileTree() {
      const tree = buildFileTree();
      let html = "";

      function renderNode(name, value, path, depth) {
        const fullPath = path ? path + "/" + name : name;
        if (value !== null && typeof value === "object") {
          // folder
          const isOpen = name === "src" || name === "generated";
          const folderColor =
            name === "src"
              ? "#dcb67a"
              : name === "generated"
                ? "#8a8a5c"
                : "#6a9fb5";
          html += `<div class="tree-item tree-folder${isOpen ? " open" : ""}" data-folder="${fullPath}">`;
          html += `<div class="tree-item-row" style="padding-left:${12 + depth * 20}px">`;
          html += `<svg class="tree-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
          html += `<svg class="tree-icon folder-icon" width="15" height="15" viewBox="0 0 24 24" fill="${folderColor}" stroke="none"><path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"/></svg>`;
          html += `<span class="tree-label">${name}</span></div>`;
          html += '<div class="tree-children">';
          const entries = Object.entries(value).sort(([a, av], [b, bv]) => {
            const af = av === null ? 1 : 0;
            const bf = bv === null ? 1 : 0;
            return af - bf || a.localeCompare(b);
          });
          for (const [childName, childVal] of entries) {
            renderNode(childName, childVal, fullPath, depth + 1);
          }
          html += "</div></div>";
        } else {
          // file
          const isMon = name.endsWith(".mon");
          const isC = name.endsWith(".c");
          const isActive = fullPath === currentFile;
          html += `<div class="tree-item tree-file${isActive ? " active" : ""}" data-file="${fullPath}">`;
          html += `<div class="tree-item-row" style="padding-left:${12 + depth * 20}px">`;
          if (isMon) html += '<span class="file-icon mon-icon">M</span>';
          else if (isC) html += '<span class="file-icon c-icon">C</span>';
          else
            html += `<svg class="tree-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#519aba" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
          html += `<span class="tree-label">${name}</span></div></div>`;
        }
      }

      for (const [name, val] of Object.entries(buildFileTree())) {
        renderNode(name, val, "", 0);
      }
      fileTree.innerHTML = html;
    }

    renderFileTree();

    fileTree.addEventListener("click", (e) => {
      const row = e.target.closest(".tree-item-row");
      if (!row) return;
      const item = row.parentElement;

      if (item.classList.contains("tree-folder")) {
        item.classList.toggle("open");
        return;
      }

      if (item.classList.contains("tree-file")) {
        const filename = item.dataset.file;
        if (fileSystem[filename] !== undefined) {
          activateTab(filename);
          updateFileTreeActive(filename);
        }
      }
    });

    function updateFileTreeActive(filename) {
      fileTree
        .querySelectorAll(".tree-file")
        .forEach((f) => f.classList.remove("active"));
      const target = fileTree.querySelector(
        `.tree-file[data-file="${filename}"]`,
      );
      if (target) target.classList.add("active");
    }

    // ─── New File / Folder ─────────────────────────────────
    const newFileBtn = document.querySelector(
      '.sidebar-action-btn[title="Novo arquivo .mon"]',
    );
    const newFolderBtn = document.querySelector(
      '.sidebar-action-btn[title="Nova pasta"]',
    );
    const importBtn = document.querySelector(
      '.sidebar-action-btn[title="Importar .mon"]',
    );

    // Helper to determine parent folder from a context target element
    function getTargetFolder(el) {
      if (!el) return "src";
      const folder = el.closest(".tree-folder");
      if (folder) return folder.dataset.folder || "src";
      // If it's a file, use its parent folder
      const file = el.dataset && el.dataset.file;
      if (file && file.includes("/"))
        return file.substring(0, file.lastIndexOf("/"));
      return "src";
    }

    function createNewFile(parentFolder) {
      const name = prompt("Nome do arquivo (ex: meuarquivo.mon ou meuarquivo.c):");
      if (!name) return;
      const safeName = name.replace(/[^a-zA-Z0-9._\-]/g, "");
      if (!safeName) return;
      const hasExt = safeName.endsWith(".mon") || safeName.endsWith(".c");
      const finalName = hasExt ? safeName : safeName + ".mon";
      const path = `${parentFolder}/${finalName}`;
      if (fileSystem[path]) {
        alert("Arquivo ja existe!");
        return;
      }
      let newContent;
      if (finalName.endsWith(".c")) {
        newContent = `#include <stdio.h>\n\nint main(void) {\n    \n    return 0;\n}\n`;
      } else {
        newContent = `// ${finalName}\n\nStart\n{\n    \n}\nFinish\n`;
      }
      fileSystem[path] = newContent;
      // Remove parent from emptyFolders since it now has content
      emptyFolders.delete(parentFolder);
      saveFS();
      if (backendAvailable) api.createFile(path, newContent).catch(() => {});
      renderFileTree();
      activateTab(path);
    }

    function createNewFolder(parentFolder) {
      const name = prompt("Nome da pasta:");
      if (!name) return;
      const safeName = name.replace(/[^a-zA-Z0-9_\-]/g, "");
      if (!safeName) return;
      const folderPath = parentFolder
        ? `${parentFolder}/${safeName}`
        : safeName;
      // Check if folder already exists (either has files or is tracked as empty)
      const tree = buildFileTree();
      const parts = folderPath.split("/");
      let node = tree;
      let exists = true;
      for (const part of parts) {
        if (node && typeof node === "object" && node[part] !== undefined) {
          node = node[part];
        } else {
          exists = false;
          break;
        }
      }
      if (exists) {
        alert("Pasta ja existe!");
        return;
      }
      emptyFolders.add(folderPath);
      saveFS();
      if (backendAvailable) api.createFolder(folderPath).catch(() => {});
      renderFileTree();
    }

    if (newFileBtn) {
      newFileBtn.addEventListener("click", () => createNewFile("src"));
    }

    if (newFolderBtn) {
      newFolderBtn.addEventListener("click", () => createNewFolder("src"));
    }

    if (importBtn) {
      importBtn.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".mon,.c";
        input.multiple = true;
        input.onchange = (e) => {
          const files = Array.from(e.target.files);
          if (!files.length) return;
          files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const path = `src/${file.name}`;
              const content = ev.target.result;
              if (fileSystem[path]) {
                if (!confirm(`"${file.name}" ja existe. Deseja substituir?`))
                  return;
              }
              fileSystem[path] = content;
              saveFS();
              if (backendAvailable) {
                if (fileSystem[path]) {
                  api.saveFile(path, content).catch(() => {});
                } else {
                  api.createFile(path, content).catch(() => {});
                }
              }
              renderFileTree();
              activateTab(path);
            };
            reader.readAsText(file);
          });
        };
        input.click();
      });
    }

    // Refresh button — reload files from backend
    const refreshBtn = document.querySelector(
      '.sidebar-action-btn[title="Atualizar"]',
    );
    if (refreshBtn) {
      refreshBtn.addEventListener("click", async () => {
        if (backendAvailable) {
          try {
            const project = await api.loadProject();
            fileSystem = project;
            if (project.__folders__) {
              project.__folders__.forEach((f) => emptyFolders.add(f));
              delete fileSystem.__folders__;
            }
            saveFS();
            renderFileTree();
            if (currentFile && fileSystem[currentFile]) {
              mainEditor.setValue(fileSystem[currentFile]);
            }
            appendTerminalLine(
              "terminal-success",
              "[info] Projeto recarregado do backend",
            );
          } catch (_) {
            appendTerminalLine(
              "terminal-error",
              "[error] Falha ao recarregar projeto",
            );
          }
        } else {
          renderFileTree();
          appendTerminalLine(
            "terminal-info",
            "[info] Modo offline — file tree atualizada",
          );
        }
      });
    }

    // ─── Context Menu ────────────────────────────────────────
    const contextMenu = document.getElementById("contextMenu");
    const folderContextMenu = document.getElementById("folderContextMenu");
    let contextTarget = null;

    function hideAllContextMenus() {
      contextMenu.classList.remove("visible");
      folderContextMenu.classList.remove("visible");
    }

    fileTree.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const row = e.target.closest(".tree-item-row");
      if (!row) return;
      contextTarget = row.parentElement;
      hideAllContextMenus();

      const isFolder = contextTarget.classList.contains("tree-folder");
      const menu = isFolder ? folderContextMenu : contextMenu;
      menu.style.top = `${e.clientY}px`;
      menu.style.left = `${e.clientX}px`;
      menu.classList.add("visible");
    });

    document.addEventListener("click", hideAllContextMenus);

    // File context menu handler
    contextMenu.addEventListener("click", (e) => {
      const item = e.target.closest(".context-menu-item");
      if (!item || !contextTarget) return;
      const action = item.dataset.action;
      const filename = contextTarget.dataset.file;
      const folderTarget = getTargetFolder(contextTarget);

      if (action === "compile" && filename) {
        activateTab(filename);
        doCompile(filename);
      }
      if (action === "delete" && filename && fileSystem[filename]) {
        if (confirm(`Excluir ${filename}?`)) {
          delete fileSystem[filename];
          saveFS();
          if (backendAvailable) api.deleteFile(filename).catch(() => {});
          const tab = tabList.querySelector(`.tab[data-file="${filename}"]`);
          if (tab) tab.remove();
          renderFileTree();
          const first = tabList.querySelector(".tab");
          if (first) activateTab(first.dataset.file);
        }
      }
      if (action === "rename" && filename && fileSystem[filename]) {
        const newName = prompt("Novo nome:", filename.split("/").pop());
        if (!newName) return;
        const dir = filename.substring(0, filename.lastIndexOf("/"));
        const newPath = dir + "/" + newName;
        fileSystem[newPath] = fileSystem[filename];
        delete fileSystem[filename];
        saveFS();
        if (backendAvailable) api.renameFile(filename, newPath).catch(() => {});
        renderFileTree();
        activateTab(newPath);
      }
      if (action === "new-file") {
        createNewFile(folderTarget);
      }
      if (action === "new-folder") {
        createNewFolder(folderTarget);
      }
      hideAllContextMenus();
    });

    // Folder context menu handler
    folderContextMenu.addEventListener("click", (e) => {
      const item = e.target.closest(".context-menu-item");
      if (!item || !contextTarget) return;
      const action = item.dataset.action;
      const folderPath = contextTarget.dataset.folder;

      if (action === "new-file" && folderPath) {
        createNewFile(folderPath);
      }
      if (action === "new-folder" && folderPath) {
        createNewFolder(folderPath);
      }
      if (action === "rename-folder" && folderPath) {
        const oldName = folderPath.split("/").pop();
        const newName = prompt("Novo nome da pasta:", oldName);
        if (!newName || newName === oldName) {
          hideAllContextMenus();
          return;
        }
        const safeName = newName.replace(/[^a-zA-Z0-9_\-]/g, "");
        if (!safeName) {
          hideAllContextMenus();
          return;
        }
        const parentDir = folderPath.includes("/")
          ? folderPath.substring(0, folderPath.lastIndexOf("/"))
          : "";
        const newFolderPath = parentDir ? `${parentDir}/${safeName}` : safeName;
        // Rename all files under this folder
        const keysToRename = Object.keys(fileSystem).filter(
          (k) => k === folderPath + "/" || k.startsWith(folderPath + "/"),
        );
        for (const key of keysToRename) {
          const newKey = newFolderPath + key.substring(folderPath.length);
          fileSystem[newKey] = fileSystem[key];
          delete fileSystem[key];
          if (backendAvailable) api.renameFile(key, newKey).catch(() => {});
          // Update open tabs
          const tab = tabList.querySelector(`.tab[data-file="${key}"]`);
          if (tab) {
            tab.dataset.file = newKey;
            tab.querySelector(".tab-name").textContent = newKey
              .split("/")
              .pop();
          }
        }
        // Update empty folders set
        for (const f of [...emptyFolders]) {
          if (f === folderPath || f.startsWith(folderPath + "/")) {
            emptyFolders.delete(f);
            emptyFolders.add(newFolderPath + f.substring(folderPath.length));
          }
        }
        if (currentFile && currentFile.startsWith(folderPath + "/")) {
          currentFile =
            newFolderPath + currentFile.substring(folderPath.length);
        }
        saveFS();
        renderFileTree();
      }
      if (action === "delete-folder" && folderPath) {
        // Gather all files inside this folder
        const filesInFolder = Object.keys(fileSystem).filter((k) =>
          k.startsWith(folderPath + "/"),
        );
        const count = filesInFolder.length;
        const msg =
          count > 0
            ? `Excluir pasta "${folderPath}" e seus ${count} arquivo(s)?`
            : `Excluir pasta vazia "${folderPath}"?`;
        if (!confirm(msg)) {
          hideAllContextMenus();
          return;
        }
        // Delete all files inside
        for (const key of filesInFolder) {
          delete fileSystem[key];
          const tab = tabList.querySelector(`.tab[data-file="${key}"]`);
          if (tab) tab.remove();
        }
        // Remove from emptyFolders
        for (const f of [...emptyFolders]) {
          if (f === folderPath || f.startsWith(folderPath + "/")) {
            emptyFolders.delete(f);
          }
        }
        saveFS();
        if (backendAvailable) api.deleteFolder(folderPath).catch(() => {});
        renderFileTree();
        // If current file was in deleted folder, switch to first available tab
        if (currentFile && currentFile.startsWith(folderPath + "/")) {
          const first = tabList.querySelector(".tab");
          if (first) activateTab(first.dataset.file);
        }
      }
      hideAllContextMenus();
    });

    // ─── Compile Buttons ─────────────────────────────────────
    // Title bar compile button
    const compileBtns = document.querySelectorAll(
      '.titlebar-action-btn[title="Compilar"]',
    );
    compileBtns.forEach((btn) => {
      btn.addEventListener("click", () => doCompile(currentFile));
    });

    // Title bar generate C button
    const genCBtns = document.querySelectorAll(
      '.titlebar-action-btn[title="Gerar C"]',
    );
    genCBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        doCompile(currentFile);
        // Switch to C output panel
        panelTabBar.querySelector('[data-panel="c-output"]').click();
      });
    });

    // Title bar errors button
    const errBtns = document.querySelectorAll(
      '.titlebar-action-btn[title="Erros"]',
    );
    errBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        panelTabBar.querySelector('[data-panel="errors"]').click();
      });
    });

    // Export output button
    const exportBtns = document.querySelectorAll(
      '.panel-action-btn[title="Exportar .c"]',
    );
    exportBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const code = cEditor.getValue();
        if (!code || code.startsWith("//")) return;
        const blob = new Blob([code], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        if (isCFile(currentFile)) {
          a.download = currentFile.split("/").pop().replace(".c", ".mon");
        } else {
          a.download = currentFile.split("/").pop().replace(".mon", ".c");
        }
        a.click();
        URL.revokeObjectURL(url);
      });
    });

    // Copy C button
    const copyBtns = document.querySelectorAll(
      '.panel-action-btn[title="Copiar"]',
    );
    copyBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(cEditor.getValue());
      });
    });

    // Regenerate button
    const regenBtns = document.querySelectorAll(
      '.panel-action-btn[title="Regenerar"]',
    );
    regenBtns.forEach((btn) => {
      btn.addEventListener("click", () => doCompile(currentFile));
    });

    // Keyboard shortcut: Ctrl+B to compile
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        doCompile(currentFile);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        fileSystem[currentFile] = mainEditor.getValue();
        saveFS();
        saveFileToBackend(currentFile);
        markTabModified(currentFile, false);
        appendTerminalLine(
          "terminal-success",
          `[info] Arquivo salvo: ${currentFile}`,
        );
        const autoCompileSetting =
          document.getElementById("settingAutoCompile");
        if (autoCompileSetting && autoCompileSetting.value === "on") {
          doCompile(currentFile);
        }
      }
    });

    // ─── Right Panel Tabs ────────────────────────────────────
    const panelTabBar = document.querySelector(".panel-tab-bar");
    const panelContents = {
      "c-output": document.getElementById("panelCOutput"),
      errors: document.getElementById("panelErrors"),
      ast: document.getElementById("panelAst"),
    };

    panelTabBar.addEventListener("click", (e) => {
      const tab = e.target.closest(".panel-tab");
      if (!tab) return;
      panelTabBar
        .querySelectorAll(".panel-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const panelId = tab.dataset.panel;
      Object.values(panelContents).forEach((p) => p.classList.remove("active"));
      if (panelContents[panelId])
        panelContents[panelId].classList.add("active");
      // Re-layout Monaco if switching to C panel
      if (panelId === "c-output") setTimeout(() => cEditor.layout(), 50);
    });

    // ─── Bottom Panel Tabs ────────────────────────────────────
    const bottomTabBar = document.querySelector(".bottom-tabs");
    const bottomPanes = {
      terminal: document.getElementById("bottomTerminal"),
      output: document.getElementById("bottomOutput"),
      build: document.getElementById("bottomBuild"),
      "debug-output": document.getElementById("bottomDebugOutput"),
    };

    bottomTabBar.addEventListener("click", (e) => {
      const tab = e.target.closest(".bottom-tab");
      if (!tab) return;
      bottomTabBar
        .querySelectorAll(".bottom-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const paneId = tab.dataset.bottom;
      Object.values(bottomPanes).forEach((p) => p.classList.remove("active"));
      if (bottomPanes[paneId]) bottomPanes[paneId].classList.add("active");
      if (paneId === "terminal") terminalInput.focus();
    });

    // ─── Bottom Panel Toggle ──────────────────────────────────
    const bottomPanel = document.getElementById("bottomPanel");
    const bottomToggle = document.getElementById("bottomToggle");
    bottomToggle.addEventListener("click", () =>
      bottomPanel.classList.toggle("collapsed"),
    );

    // ─── Terminal ────────────────────────────────────────────
    const terminalContent = document.getElementById("terminalContent");
    const terminalInput = document.getElementById("terminalInput");

    function appendTerminalLine(cls, text) {
      const div = document.createElement("div");
      div.className = `terminal-line ${cls}`;
      div.textContent = text;
      const inputLine = terminalContent.querySelector(".terminal-input-line");
      terminalContent.insertBefore(div, inputLine);
      terminalContent.scrollTop = terminalContent.scrollHeight;
    }

    function appendTerminalBlock(lines) {
      const inputLine = terminalContent.querySelector(".terminal-input-line");
      for (const l of lines) {
        const div = document.createElement("div");
        div.className = `terminal-line ${l.cls}`;
        div.textContent = l.text;
        terminalContent.insertBefore(div, inputLine);
      }
      terminalContent.scrollTop = terminalContent.scrollHeight;
    }

    function appendTerminalPrompt(cmd) {
      const div = document.createElement("div");
      div.className = "terminal-line";
      div.innerHTML = `<span class="terminal-prompt">dotmon@project</span> <span class="terminal-path">~/dotmon-project</span> <span class="terminal-cmd">$</span> ${escHTML(cmd)}`;
      const inputLine = terminalContent.querySelector(".terminal-input-line");
      terminalContent.insertBefore(div, inputLine);
    }

    if (terminalInput) {
      // ─── WebSocket Terminal Connection ─────────────────────
      let terminalWs = null;

      function connectTerminalWs() {
        if (!backendAvailable) return;
        const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${wsProto}//${window.location.host}/ws/terminal`;
        try {
          terminalWs = new WebSocket(wsUrl);
          terminalWs.onopen = () => {
            appendTerminalLine(
              "terminal-success",
              "[info] Terminal conectado ao backend",
            );
          };
          terminalWs.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.lines) {
              for (const l of data.lines) {
                if (l.text === "__CLEAR__") {
                  const lines = terminalContent.querySelectorAll(
                    ".terminal-line:not(.terminal-input-line)",
                  );
                  lines.forEach((el) => {
                    if (!el.classList.contains("terminal-input-line"))
                      el.remove();
                  });
                } else if (l.text.startsWith("__COMPILE__:")) {
                  // Compilation handled client-side
                  const compileCmd = l.text.replace("__COMPILE__:", "");
                  handleCompileCommand(compileCmd);
                } else {
                  appendTerminalLine(l.cls, l.text);
                }
              }
            }
          };
          terminalWs.onclose = () => {
            terminalWs = null;
            appendTerminalLine(
              "terminal-muted",
              "[info] Terminal desconectado",
            );
          };
          terminalWs.onerror = () => {
            terminalWs = null;
          };
        } catch (_) {
          terminalWs = null;
        }
      }

      function handleCompileCommand(cmd) {
        const arg = cmd.replace("dotmon compile", "").trim();
        if (arg === "all") {
          for (const f of Object.keys(fileSystem)) {
            if (isMonFile(f) || isCFile(f)) doCompile(f);
          }
          renderFileTree();
          return;
        }
        let target = arg;
        if (!fileSystem[target]) target = "src/" + arg;
        if (!fileSystem[target]) {
          appendTerminalLine(
            "terminal-error",
            `[error] File not found: ${arg}`,
          );
          return;
        }
        activateTab(target);
        doCompile(target);
        renderFileTree();
      }

      // Connect WebSocket after short delay
      setTimeout(connectTerminalWs, 500);

      // Terminal command history
      const cmdHistory = [];
      let historyIndex = -1;

      terminalInput.addEventListener("keydown", (e) => {
        // Arrow Up — navigate history backward
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (cmdHistory.length === 0) return;
          if (historyIndex < cmdHistory.length - 1) historyIndex++;
          terminalInput.value =
            cmdHistory[cmdHistory.length - 1 - historyIndex];
          return;
        }
        // Arrow Down — navigate history forward
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (historyIndex > 0) {
            historyIndex--;
            terminalInput.value =
              cmdHistory[cmdHistory.length - 1 - historyIndex];
          } else {
            historyIndex = -1;
            terminalInput.value = "";
          }
          return;
        }
        if (e.key !== "Enter") return;
        const cmd = terminalInput.value.trim();
        terminalInput.value = "";
        if (!cmd) return;

        // Add to history
        cmdHistory.push(cmd);
        historyIndex = -1;

        appendTerminalPrompt(cmd);

        // Client-side clear (always local)
        if (cmd === "clear") {
          const lines = terminalContent.querySelectorAll(
            ".terminal-line:not(.terminal-input-line)",
          );
          lines.forEach((l) => {
            if (!l.classList.contains("terminal-input-line")) l.remove();
          });
          return;
        }

        // Compilation always runs client-side (compiler is in JS)
        if (cmd.startsWith("dotmon compile")) {
          handleCompileCommand(cmd);
          return;
        }

        // Route through WebSocket if connected, else local fallback
        if (terminalWs && terminalWs.readyState === WebSocket.OPEN) {
          terminalWs.send(JSON.stringify({ cmd }));
          return;
        }

        // Local fallback for common commands
        if (cmd === "help") {
          appendTerminalLine("terminal-info", "Commands:");
          appendTerminalLine(
            "terminal-info",
            "  dotmon compile [file]  — Compile a .mon file",
          );
          appendTerminalLine(
            "terminal-info",
            "  dotmon compile all     — Compile all .mon files",
          );
          appendTerminalLine(
            "terminal-info",
            "  ls                     — List files",
          );
          appendTerminalLine(
            "terminal-info",
            "  cat <file>             — Show file content (backend)",
          );
          appendTerminalLine(
            "terminal-info",
            "  clear                  — Clear terminal",
          );
          appendTerminalLine(
            "terminal-info",
            "  help                   — Show this help",
          );
          return;
        }

        if (cmd === "ls") {
          for (const f of Object.keys(fileSystem)) {
            appendTerminalLine("terminal-info", "  " + f);
          }
          return;
        }

        appendTerminalLine(
          "terminal-error",
          `Command not found: ${cmd}. Type 'help' for available commands.`,
        );
      });
    }

    // ─── Activity Bar ────────────────────────────────────────
    const activityBtns = document.querySelectorAll(".activity-btn[data-panel]");
    const sidebar = document.getElementById("sidebar");
    const sidebarTitle = document.querySelector(".sidebar-title");

    const panelLabels = {
      explorer: "EXPLORER",
      search: "SEARCH",
      structure: "STRUCTURE",
      build: "BUILD",
      debug: "DEBUG",
      extensions: "EXTENSIONS",
    };

    activityBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const panel = btn.dataset.panel;
        const wasActive = btn.classList.contains("active");
        if (wasActive) {
          sidebar.style.display =
            sidebar.style.display === "none" ? "" : "none";
          btn.classList.toggle("active");
        } else {
          activityBtns.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          sidebar.style.display = "";
          if (sidebarTitle)
            sidebarTitle.textContent =
              panelLabels[panel] || panel.toUpperCase();
        }
        // Re-layout Monaco editors after sidebar toggle
        setTimeout(() => {
          mainEditor.layout();
          cEditor.layout();
        }, 100);
      });
    });

    // ─── Resize: Sidebar ─────────────────────────────────────
    const resizeSidebar = document.getElementById("resizeSidebar");
    let isSidebarResizing = false;

    resizeSidebar.addEventListener("mousedown", (e) => {
      isSidebarResizing = true;
      resizeSidebar.classList.add("active");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    });

    // ─── Resize: Right Panel ─────────────────────────────────
    const resizePanel = document.getElementById("resizePanel");
    const rightPanel = document.getElementById("rightPanel");
    let isPanelResizing = false;

    resizePanel.addEventListener("mousedown", (e) => {
      isPanelResizing = true;
      resizePanel.classList.add("active");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    });

    // ─── Resize: Bottom Panel ────────────────────────────────
    const resizeBottom = document.getElementById("resizeBottom");
    let isBottomResizing = false;

    resizeBottom.addEventListener("mousedown", (e) => {
      isBottomResizing = true;
      resizeBottom.classList.add("active");
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    });

    // ─── Global Mouse Events for Resize ──────────────────────
    document.addEventListener("mousemove", (e) => {
      if (isSidebarResizing) {
        const activityBarWidth = 56;
        const newWidth = e.clientX - activityBarWidth - 16;
        if (newWidth >= 160 && newWidth <= 500)
          sidebar.style.width = newWidth + "px";
      }
      if (isPanelResizing) {
        const wrapperRect = document
          .querySelector(".editor-panel-wrapper")
          .getBoundingClientRect();
        const newWidth = wrapperRect.right - e.clientX;
        if (newWidth >= 240 && newWidth <= 700)
          rightPanel.style.width = newWidth + "px";
      }
      if (isBottomResizing) {
        const windowRect = document
          .querySelector(".ide-window")
          .getBoundingClientRect();
        const newHeight = windowRect.bottom - e.clientY - 28;
        if (newHeight >= 80 && newHeight <= 500) {
          bottomPanel.style.height = newHeight + "px";
          bottomPanel.classList.remove("collapsed");
        }
      }
    });

    document.addEventListener("mouseup", () => {
      if (isSidebarResizing || isPanelResizing || isBottomResizing) {
        isSidebarResizing = false;
        isPanelResizing = false;
        isBottomResizing = false;
        resizeSidebar.classList.remove("active");
        resizePanel.classList.remove("active");
        resizeBottom.classList.remove("active");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        // Re-layout Monaco editors
        setTimeout(() => {
          mainEditor.layout();
          cEditor.layout();
        }, 50);
      }
    });

    // ─── Status Bar ──────────────────────────────────────────
    function updateStatusCursor(line, col) {
      const items = document.querySelectorAll(
        ".statusbar-right .statusbar-item",
      );
      items.forEach((item) => {
        if (item.textContent.startsWith("Ln")) {
          item.textContent = `Ln ${line}, Col ${col}`;
        }
      });
    }

    function updateStatusErrors(errCount, warnCount) {
      const el = document.getElementById("statusErrors");
      if (!el) return;
      el.innerHTML = `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="${errCount > 0 ? "#f14c4c" : "#858585"}" stroke="none"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15" stroke="#1e1e1e" stroke-width="2.5"/><line x1="9" y1="9" x2="15" y2="15" stroke="#1e1e1e" stroke-width="2.5"/></svg>
        ${errCount}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="${warnCount > 0 ? "#cca700" : "#858585"}" stroke="none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13" stroke="#1e1e1e" stroke-width="2"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="#1e1e1e" stroke-width="2"/></svg>
        ${warnCount}`;
    }

    function updateErrorBadge(count) {
      const badge = document.querySelector(".error-badge");
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? "" : "none";
      }
    }

    document.getElementById("statusErrors").addEventListener("click", () => {
      panelTabBar.querySelector('[data-panel="errors"]').click();
    });

    // ─── Settings Panel ────────────────────────────────────
    const settingsOverlay = document.getElementById("settingsOverlay");
    const settingsClose = document.getElementById("settingsClose");
    const settingFontSize = document.getElementById("settingFontSize");
    const settingTabSize = document.getElementById("settingTabSize");
    const settingWordWrap = document.getElementById("settingWordWrap");
    const settingMinimap = document.getElementById("settingMinimap");
    const settingAutoCompile = document.getElementById("settingAutoCompile");

    // Load saved settings
    const savedSettings = JSON.parse(
      localStorage.getItem("dotmon-settings") || "{}",
    );
    if (savedSettings.fontSize) settingFontSize.value = savedSettings.fontSize;
    if (savedSettings.tabSize) settingTabSize.value = savedSettings.tabSize;
    if (savedSettings.wordWrap) settingWordWrap.value = savedSettings.wordWrap;
    if (savedSettings.minimap) settingMinimap.value = savedSettings.minimap;
    if (savedSettings.autoCompile)
      settingAutoCompile.value = savedSettings.autoCompile;

    function applySettings() {
      const opts = {
        fontSize: parseInt(settingFontSize.value, 10),
        tabSize: parseInt(settingTabSize.value, 10),
        wordWrap: settingWordWrap.value,
        minimap: { enabled: settingMinimap.value === "on" },
      };
      mainEditor.updateOptions(opts);
      cEditor.updateOptions({ fontSize: opts.fontSize, tabSize: opts.tabSize });
      localStorage.setItem(
        "dotmon-settings",
        JSON.stringify({
          fontSize: settingFontSize.value,
          tabSize: settingTabSize.value,
          wordWrap: settingWordWrap.value,
          minimap: settingMinimap.value,
          autoCompile: settingAutoCompile.value,
        }),
      );
    }

    // Apply on load
    applySettings();

    function openSettings() {
      settingsOverlay.classList.add("visible");
    }
    function closeSettings() {
      applySettings();
      settingsOverlay.classList.remove("visible");
    }

    // Wire both settings buttons (titlebar + activity bar)
    document.querySelectorAll('[title="Configuracoes"]').forEach((btn) => {
      btn.addEventListener("click", openSettings);
    });
    settingsClose.addEventListener("click", closeSettings);
    settingsOverlay.addEventListener("click", (e) => {
      if (e.target === settingsOverlay) closeSettings();
    });

    // Apply on input change
    [
      settingFontSize,
      settingTabSize,
      settingWordWrap,
      settingMinimap,
      settingAutoCompile,
    ].forEach((el) => {
      el.addEventListener("change", applySettings);
    });

    // ─── Search in Titlebar ──────────────────────────────────
    const titlebarSearch = document.querySelector(".titlebar-search");
    if (titlebarSearch) {
      titlebarSearch.addEventListener("click", () => {
        if (mainEditor) {
          mainEditor.getAction("actions.find").run();
        }
      });
    }

    // ─── Window Resize ──────────────────────────────────────
    window.addEventListener("resize", () => {
      mainEditor.layout();
      cEditor.layout();
    });
  }); // end require Monaco

  // ─── Helper: escape HTML ───────────────────────────────────
  function escHTML(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
});
