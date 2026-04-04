# dotmon

> Linguagem de programação temática de Digimon que compila para C — com IDE web completa.

Repositório criado para a disciplina de **Linguagens Formais e Compiladores**. O projeto implementa a linguagem **dotmon**, compilada e transformada para **C**, pensada para rodar em Arduino como um Tamagotchi versão Digimon.

---

## Índice

- [Visão Geral](#visão-geral)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [A Linguagem dotmon](#a-linguagem-dotmon)
  - [Tipos de Dados](#tipos-de-dados)
  - [Palavras-chave](#palavras-chave)
  - [Operadores](#operadores)
  - [Estrutura de um Programa](#estrutura-de-um-programa)
  - [Exemplos de Código](#exemplos-de-código)
- [Pipeline de Compilação](#pipeline-de-compilação)
  - [Análise Léxica (Lexer)](#1-análise-léxica-lexer)
  - [Análise Sintática (Parser)](#2-análise-sintática-parser)
  - [Análise Semântica](#3-análise-semântica)
  - [Geração de Código C](#4-geração-de-código-c)
- [A IDE Web](#a-ide-web)
  - [Layout e Painéis](#layout-e-painéis)
  - [Editor Monaco](#editor-monaco)
  - [Terminal Integrado](#terminal-integrado)
  - [Sistema de Arquivos](#sistema-de-arquivos)
  - [Atalhos de Teclado](#atalhos-de-teclado)
- [Backend FastAPI](#backend-fastapi)
  - [API REST](#api-rest)
  - [WebSocket Terminal](#websocket-terminal)
  - [Segurança](#segurança)
- [Como Executar](#como-executar)
- [Mapeamento dotmon → C](#mapeamento-dotmon--c)

---

## Visão Geral

O sistema possui três componentes principais:

```
┌─────────────────────────────────────────────────────┐
│                  IDE Web (Browser)                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Editor   │  │ Compiler │  │  Painéis (C/AST/  │  │
│  │  Monaco   │→ │   JS     │→ │   Erros/Terminal) │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
└────────────────────┬────────────────────────────────┘
                     │ REST API + WebSocket
┌────────────────────▼────────────────────────────────┐
│              Backend FastAPI (Python)                 │
│  File System real  │  Terminal WS  │  Static Files   │
└────────────────────┴──────────────┴─────────────────┘
```

- **Compilador 100% JavaScript** — roda no browser, sem necessidade de servidor para compilar
- **Backend FastAPI** — persistência real dos arquivos em disco e terminal interativo via WebSocket
- **Fallback localStorage** — a IDE funciona offline, usando o armazenamento do browser quando o backend não está disponível

---

## Estrutura do Projeto

```
dotmon/
├── server.py                    # Backend FastAPI (API + WebSocket + Static Files)
├── requirements.txt             # Dependências Python (FastAPI, uvicorn, websockets)
├── Análise_Lexico_Dotmon_C.ipynb  # Notebook com análise léxica original em C
├── nfa_estados_detalhados.html  # Visualização do NFA de estados
├── README.md                    # Este arquivo
│
├── ide/                         # Frontend da IDE (servido como estático)
│   ├── index.html               # Estrutura HTML completa da IDE
│   ├── css/
│   │   └── styles.css           # Tema dark premium (~1400 linhas)
│   └── js/
│       ├── compiler.js          # Compilador completo (Lexer → Parser → Analyzer → CodeGen)
│       └── app.js               # Lógica da IDE (Monaco + API + Terminal + UI)
│
└── workspace/                   # Diretório de trabalho do projeto (criado pelo backend)
    ├── src/                     # Código-fonte .mon
    │   ├── main.mon
    │   ├── batalha.mon
    │   ├── evolucao.mon
    │   ├── digimon.mon
    │   └── utils.mon
    └── generated/               # Código C gerado pela compilação
        └── *.c
```

---

## A Linguagem dotmon

### Tipos de Dados

Todos os tipos são nomeados com referências a estágios de evolução Digimon:

| Tipo dotmon | Tipo C equivalente | Descrição |
|-------------|-------------------|-----------|
| `Baby` | `int` | Inteiro (estágio bebê) |
| `Pup` | `float` | Ponto flutuante (estágio filhote) |
| `Rook` | `long` | Inteiro longo (estágio rookie) |
| `Champ` | `int` | Inteiro (estágio champion) |
| `Moji` | `char[256]` | String / cadeia de caracteres |
| `Bit` | `bool` | Booleano (verdadeiro/falso) |

### Palavras-chave

| Categoria | dotmon | C equivalente | Descrição |
|-----------|--------|---------------|-----------|
| **Programa** | `Start` / `Finish` | `int main() {` / `return 0; }` | Delimitadores do programa |
| **Condicional** | `Evo` | `if` | Condição principal |
| | `AltEvo` | `else if` | Condição alternativa |
| | `FailEvo` | `else` | Caso padrão |
| **Repetição** | `Loop` | `for` / `while` | Laço for (ou while se sem init/step) |
| | `Spiral` | `while` | Laço while |
| **Controle de fluxo** | `Jam` | `break` | Interromper laço |
| | `Skip` | `continue` | Pular iteração |
| **Funções** | `Xros` | declaração de função | Declarar função |
| | `Send` | `return` | Retornar valor |
| | `Call` | chamada de função | Chamar função |
| **I/O** | `Show()` | `printf()` | Imprimir na tela |
| | `Ask()` | `scanf()` | Ler entrada do usuário |
| **Módulos** | `World` | (global scope) | Escopo global |
| | `Core` | (module) | Módulo |

### Operadores

| Operador | Descrição |
|----------|-----------|
| `=` | Atribuição |
| `+` `-` `*` `/` | Aritméticos |
| `==` `!=` | Igualdade / diferença |
| `>` `<` `>=` `<=` | Comparação |

### Estrutura de um Programa

Todo programa dotmon segue o formato:

```
Start
{
    // Corpo do programa
}
Finish
```

### Exemplos de Código

**Hello World:**
```
Start
{
    Show("Olá, Mundo Digital!");
}
Finish
```

**Variáveis e condicionais:**
```
Start
{
    Moji nome = "Agumon";
    Baby nivel = 10;
    Pup experiencia = 250;
    Bit pronto = true;

    Evo (nivel > 15) {
        Show("Mega evolucao disponivel!");
    }
    AltEvo (nivel == 10) {
        Show("Evolucao padrao");
        Show(nome);
    }
    FailEvo {
        Show("Nivel insuficiente");
    }

    Champ dano = experiencia * nivel;
    Show(dano);
}
Finish
```

**Loop (while-style):**
```
Start
{
    Baby contador = 0;
    Loop (contador < 10) {
        Show(contador);
        contador = contador + 1;
    }
}
Finish
```

**Loop (for-style):**
```
Start
{
    Loop (Baby i = 0; i < 10; i = i + 1) {
        Show(i);
    }
}
Finish
```

**Spiral (while):**
```
Start
{
    Baby x = 1;
    Spiral (x < 100) {
        x = x * 2;
    }
    Show(x);
}
Finish
```

---

## Pipeline de Compilação

O compilador processa o código-fonte dotmon em 4 etapas sequenciais:

```
Código .mon → [Lexer] → Tokens → [Parser] → AST → [Analyzer] → AST validada → [CodeGen] → Código C
```

### 1. Análise Léxica (Lexer)

O lexer percorre o código-fonte caractere a caractere e produz uma lista de **tokens**. Cada token possui tipo, lexema, linha e coluna.

**Características:**
- Reconhece 49 tipos de tokens (6 tipos, 16 keywords, 6 literais, 11 operadores, 7 delimitadores, 2 especiais + `IDENTIFIER`)
- Suporta comentários de linha (`//`) e bloco (`/* */`)
- Suporta strings (`"..."`), chars (`'c'`), inteiros, floats e booleanos (`true`/`false`)
- Sequências de escape em strings e chars
- Reporta tokens inválidos com posição exata

**Exemplo de saída:**
```
"Baby nivel = 10;" → [TYPE_BABY, IDENTIFIER("nivel"), OP_ASSIGN, INT_LITERAL(10), SEMICOLON]
```

### 2. Análise Sintática (Parser)

Parser de **descida recursiva** (recursive descent) que transforma tokens em uma **Árvore Sintática Abstrata (AST)**.

**Nós da AST (15 tipos):**

| Nó | Descrição | Campos |
|----|-----------|--------|
| `Program` | Raiz do programa | `body[]` |
| `VarDecl` | Declaração de variável | `varType, name, init` |
| `Assignment` | Atribuição | `name, value` |
| `IfChain` | Cadeia Evo/AltEvo/FailEvo | `branches[], elseBranch` |
| `WhileLoop` | Loop while | `condition, body[]` |
| `ForLoop` | Loop for (Spiral) | `init, condition, step, body[]` |
| `FuncDecl` | Declaração de função | `returnType, name, params[], body[]` |
| `ShowStmt` | Impressão | `args[]` |
| `AskStmt` | Leitura de input | `name` |
| `ReturnStmt` | Retorno | `value` |
| `BreakStmt` | Break (Jam) | — |
| `SkipStmt` | Continue (Skip) | — |
| `ExprStmt` | Expressão como statement | `expression` |

**Expressões** suportam precedência: comparação → adição → multiplicação → unário → primário, com chamadas de função e parênteses.

### 3. Análise Semântica

Verifica a **correção semântica** da AST antes da geração de código:

- **Tabela de símbolos** com pilha de escopos (escopo global + escopos de bloco)
- **Declaração de variáveis** — detecta redeclaração no mesmo escopo
- **Resolução de identificadores** — reporta variáveis não declaradas
- **Compatibilidade de tipos** — verifica atribuições incompatíveis (ex: `int` ← `string`)
- **Variáveis não utilizadas** — emite warnings para variáveis declaradas mas nunca lidas
- **Verificação de funções** — valida chamadas a funções não declaradas

**Tipos de diagnóstico:**
- `error` — erro que impede a compilação
- `warning` — aviso que não impede, mas indica problema potencial

### 4. Geração de Código C

Traduz a AST validada para código C compilável:

**Mapeamento de tipos:**
```
Baby, Champ → int
Pup → float
Rook → long
Moji → char[256] (com strcpy para atribuições)
Bit → bool (inclui <stdbool.h>)
```

**Características:**
- Gera `#include` automáticos conforme os tipos usados (`<stdio.h>`, `<string.h>`, `<stdbool.h>`)
- `Show()` → `printf()` com formato correto (`%d`, `%s`, `%ld`, `%f`)
- `Ask()` → `scanf()` com `&` para tipos numéricos e sem `&` para strings
- Strings usam `char[]` com `strcpy()` para atribuições
- Indentação correta do código gerado
- Suporte a `for`, `while`, `if/else if/else`, `break`, `continue`, `return`

---

## A IDE Web

Interface inspirada no VS Code com tema dark premium.

### Layout e Painéis

```
┌──────────────── Title Bar ──────────────────────────────┐
│ [●●●]  main.mon — dotmon IDE   [Compilar][Gerar C][Erros]│
├────┬─────────┬──────────────────────┬───────────────────┤
│    │         │                      │   C Gerado        │
│ A  │  File   │    Monaco Editor     │   Erros           │
│ c  │  Tree   │    (Código .mon)     │   AST             │
│ t  │         │                      │                   │
│    │         │                      │                   │
├────┴─────────┴──────────────────────┴───────────────────┤
│ Terminal │ Output │ Build │ Debug                        │
│ > dotmon compile main.mon                               │
│ [info] Compilation finished in 2.3ms — 0 errors         │
└─────────────────────────────────────────────────────────┘
│ main  │ Ln 14, Col 28 │ UTF-8 │ dotmon │ ● API         │
└─────────────────────────────────────────────────────────┘
```

**6 áreas principais:**

1. **Barra de Título** — botões de Compilar, Gerar C, Erros e busca
2. **Barra de Atividade** (esquerda) — Explorer, Buscar, Estrutura, Build, Debug
3. **Sidebar / File Tree** — árvore de arquivos com ações (novo, importar, renomear, excluir)
4. **Editor Central** — Monaco Editor com syntax highlighting dotmon
5. **Painel Direito** — 3 abas: Código C gerado, Lista de Erros, AST
6. **Painel Inferior** — 4 abas: Terminal, Output, Build, Debug

Todos os painéis são **redimensionáveis** arrastando as bordas.

### Editor Monaco

O editor usa [Monaco Editor](https://microsoft.github.io/monaco-editor/) (o mesmo do VS Code) com:

- **Linguagem customizada** `dotmon` registrada com tokenizer Monarch
- **Syntax highlighting** com cores distintas:
  - Keywords (`Evo`, `Loop`, etc.) → roxo `#c586c0` (negrito)
  - Tipos (`Baby`, `Moji`, etc.) → verde-água `#4ec9b0`
  - Funções built-in (`Show`, `Ask`) → amarelo `#dcdcaa`
  - Strings → laranja `#ce9178`
  - Números → verde claro `#b5cea8`
  - Comentários → verde `#6a9955` (itálico)
  - Identificadores → azul claro `#9cdcfe`
- **Autocompletion** com sugestões de tipos, keywords e snippets
- **Snippets** prontos: `Start...Finish`, `Evo...FailEvo`, `Show()`, `Loop()`
- **Diagnóstico em tempo real** — sublinhado vermelho/amarelo nos erros (500ms debounce)
- **Minimap**, bracket colorization, smooth scrolling

### Terminal Integrado

| Comando | Descrição |
|---------|-----------|
| `dotmon compile <arquivo>` | Compila um arquivo .mon específico |
| `dotmon compile all` | Compila todos os arquivos .mon |
| `ls` | Lista os arquivos do projeto |
| `cat <arquivo>` | Exibe o conteúdo de um arquivo (via backend) |
| `clear` | Limpa o terminal |
| `help` | Mostra os comandos disponíveis |

Quando o backend está ativo, `ls` e `cat` executam via **WebSocket** no servidor (acesso real ao disco). A compilação sempre roda no browser (o compilador é JavaScript).

### Sistema de Arquivos

| Modo | Quando | Persistência |
|------|--------|-------------|
| **● API** (verde) | Backend rodando | Arquivos salvos em `workspace/` no disco |
| **○ Local** (cinza) | Sem backend | Arquivos no `localStorage` do browser |

O indicador aparece na barra de status (canto inferior direito).

**Operações disponíveis:**
- Criar arquivo (botão `+` ou context menu)
- Importar arquivo `.mon` do computador
- Renomear (context menu → Renomear)
- Excluir (context menu → Excluir)
- Salvar (`Ctrl+S`)

### Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl+B` | Compilar arquivo atual |
| `Ctrl+S` | Salvar arquivo atual |
| `Ctrl+F` | Buscar no editor (nativo Monaco) |
| `Ctrl+Z` / `Ctrl+Y` | Desfazer / Refazer (nativo Monaco) |

---

## Backend FastAPI

### API REST

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/project` | Carrega todos os arquivos de uma vez (initial load) |
| `GET` | `/api/files` | Lista arquivos com tamanhos `{path: bytes}` |
| `GET` | `/api/files/{path}` | Lê conteúdo de um arquivo |
| `PUT` | `/api/files/{path}` | Salva/atualiza um arquivo |
| `POST` | `/api/files` | Cria um novo arquivo |
| `DELETE` | `/api/files/{path}` | Exclui um arquivo |
| `PATCH` | `/api/files/{path}` | Renomeia/move um arquivo |
| `PUT` | `/api/generated/{file}` | Salva código C gerado |

### WebSocket Terminal

**Endpoint:** `ws://localhost:8000/ws/terminal`

**Protocolo JSON:**
```
Cliente → Servidor:  { "cmd": "ls" }
Servidor → Cliente:  { "lines": [{"cls": "terminal-info", "text": "  src/main.mon"}] }
```

Códigos especiais de controle:
- `__CLEAR__` — cliente limpa o terminal
- `__COMPILE__:...` — compilação delegada ao cliente (compilador roda no JS)

### Segurança

- **Validação de path** — regex `^[a-zA-Z0-9_\-./]+$` rejeita caracteres perigosos
- **Prevenção de directory traversal** — paths resolvidos devem estar dentro de `workspace/`
- **Extensões permitidas** — apenas `.mon`, `.c`, `.h`, `.txt`, `.md`
- **Limite de tamanho** — máximo 1 MB por arquivo (HTTP 413 se excedido)
- **CORS** habilitado para desenvolvimento local

---

## Como Executar

### Pré-requisitos

- Python 3.10+ instalado
- Browser moderno (Chrome, Firefox, Edge)

### Instalação

```bash
# Clonar o repositório
git clone <url-do-repositório>
cd dotmon

# Criar ambiente virtual e instalar dependências
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/Mac
source .venv/bin/activate

pip install -r requirements.txt
```

### Executar

```bash
python -m uvicorn server:app --host 0.0.0.0 --port 8000
```

Abra **http://localhost:8000** no navegador.

### Modo Offline (sem backend)

Abra `ide/index.html` diretamente no navegador. A IDE funciona completamente usando `localStorage` — o indicador na status bar mostrará **○ Local**.

---

## Mapeamento dotmon → C

Exemplo completo de compilação:

**Entrada (dotmon):**
```
Start
{
    Moji nome = "Agumon";
    Baby nivel = 10;
    Bit pronto = true;

    Evo (nivel > 5) {
        Show("Evolucao!");
        Show(nome);
    }
    FailEvo {
        Show("Nivel baixo");
    }

    Show(nivel);
}
Finish
```

**Saída (C gerado):**
```c
/* Generated by dotmon compiler v0.1.0 */

#include <stdio.h>
#include <string.h>
#include <stdbool.h>

int main(void) {
    char nome[256] = "Agumon";
    int nivel = 10;
    bool pronto = true;

    if (nivel > 5) {
        printf("Evolucao!\n");
        printf("%s\n", nome);
    }
    else {
        printf("Nivel baixo\n");
    }

    printf("%d\n", nivel);

    return 0;
}
```
