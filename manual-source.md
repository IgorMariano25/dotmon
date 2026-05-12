# Manual-Source — Análise Léxica do dotmon

> Documento técnico-didático que descreve, passo a passo, a **fase de análise léxica** do compilador da linguagem **dotmon** (`.mon → C`).
> Material complementar do projeto da disciplina **Linguagens Formais e Compiladores**.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Fundamentos Teóricos](#2-fundamentos-teóricos)
3. [Vocabulário da Linguagem dotmon](#3-vocabulário-da-linguagem-dotmon)
4. [Especificação dos Padrões Léxicos](#4-especificação-dos-padrões-léxicos)
5. [Arquitetura do Scanner](#5-arquitetura-do-scanner)
6. [Algoritmo Passo a Passo](#6-algoritmo-passo-a-passo)
7. [Reconhecimento de Cada Categoria de Token](#7-reconhecimento-de-cada-categoria-de-token)
8. [Tratamento de Comentários e Whitespace](#8-tratamento-de-comentários-e-whitespace)
9. [Resolução de Keywords vs Identificadores](#9-resolução-de-keywords-vs-identificadores)
10. [Posicionamento e Diagnóstico de Erros](#10-posicionamento-e-diagnóstico-de-erros)
11. [Trace Completo de Exemplo](#11-trace-completo-de-exemplo)
12. [Saída do Scanner — Lista de Tokens](#12-saída-do-scanner--lista-de-tokens)
13. [Implementação em C (Didática)](#13-implementação-em-c-didática)
14. [Implementação em JavaScript (Produção)](#14-implementação-em-javascript-produção)
15. [Apêndice — Autômatos (NFA) por Categoria](#15-apêndice--autômatos-nfa-por-categoria)

---

## 1. Visão Geral

A **análise léxica** (ou *scanning*) é a **primeira fase** do compilador. Sua responsabilidade é transformar o **fluxo de caracteres** do arquivo-fonte (`.mon`) em uma **sequência de tokens** — unidades lexicais classificadas que servirão de entrada para a próxima fase, o *parser*.

```
┌─────────────┐    caracteres    ┌─────────┐    tokens    ┌────────┐
│  arquivo    │ ───────────────▶ │  LEXER  │ ───────────▶ │ PARSER │
│  .mon       │                  │ (scan)  │              │  (AST) │
└─────────────┘                  └─────────┘              └────────┘
```

No pipeline completo do `dotmon`, o lexer é o ponto de entrada:

```
Código .mon → [LEXER] → Tokens → [PARSER] → AST → [ANALYZER] → AST validada → [CODEGEN] → C
```

**No projeto, a análise léxica é implementada em dois lugares:**

| Implementação | Local | Finalidade |
|---|---|---|
| Em **C** | `Análise_Lexico_Dotmon_C.ipynb` (notebook) | Versão didática original, exibida em aula |
| Em **JavaScript** | `ide/js/compiler.js` — classe `Lexer` | Versão de produção, integrada à IDE Web |

Ambas seguem a **mesma especificação**, o mesmo conjunto de tokens e a mesma estratégia de varredura. Este manual descreve o **algoritmo conceitual** e referencia trechos das duas implementações.

---

## 2. Fundamentos Teóricos

### 2.1. Token, Lexema e Padrão

| Conceito | Definição | Exemplo dotmon |
|---|---|---|
| **Lexema** | A sequência *bruta* de caracteres lida no fonte | `nivel`, `10`, `"Agumon"`, `Evo`, `==` |
| **Token** | Categoria *classificada* atribuída a um lexema | `IDENTIFIER`, `INT_LITERAL`, `STRING_LITERAL`, `KW_EVO`, `OP_EQ` |
| **Padrão** | A regra (geralmente uma regex ou autômato) que descreve quais lexemas pertencem a um token | `[a-zA-Z_][a-zA-Z0-9_]*` para `IDENTIFIER` |

Cada token produzido pelo scanner do `dotmon` carrega quatro campos:

```c
typedef struct {
    TokenType type;     // categoria (enum)
    char     *lexeme;   // texto bruto
    int       line;     // linha (1-based)
    int       column;   // coluna (1-based)
} Token;
```

### 2.2. Autômatos Finitos

A teoria por trás de cada padrão é o **autômato finito**:

- **NFA** (Nondeterministic Finite Automaton) — pode descrever várias alternativas em paralelo (`true|false`, `Baby|Pup|...`).
- **DFA** (Deterministic Finite Automaton) — uma única transição por símbolo; é o que se implementa de fato no código (por meio de `switch`/`if`/regex).

O arquivo `nfa_estados_detalhados.html` do projeto apresenta visualizações dos NFAs para cada categoria léxica (Identificador, Booleano, Literal Inteiro, Literal Decimal, Literal String, Literal Char, Tipos, e os cabeçalhos sintáticos `Evo`, `Loop`, `Spiral`, `Xros`, `Show`).

### 2.3. Princípio do **Maximal Munch** (Longest Match)

Quando duas regras casam, escolhe-se a **mais longa**. Isso é fundamental para:

- Distinguir `==` de duas ocorrências de `=` — o scanner do dotmon lê o primeiro `=` e tenta consumir um segundo (`match('=')`). Se houver, emite `OP_EQ`; caso contrário, emite `OP_ASSIGN`.
- Distinguir `>=` de `>`, `<=` de `<`, `!=` de `!`.
- Distinguir `&&` de um único `&` (que é inválido em dotmon e gera token `INVALID`).
- Distinguir `||` de um único `|` (também inválido).
- Distinguir o identificador `level10` do par identificador `level` + literal `10` — o lexer continua consumindo enquanto `isAlphaNumeric` for verdadeiro.

### 2.4. Estratégia Geral — Scanner *à la* Lox/Crafting Interpreters

O lexer do `dotmon` adota o padrão clássico de **scanner por advance/peek**:

```
loop:
    skipWhitespace()
    if isAtEnd: break
    marca início do lexema
    c = advance()
    despacha por c:
        - se for letra/underscore  → reconhece identificador (ou keyword)
        - se for dígito            → reconhece número (int/float)
        - se for "                 → reconhece string
        - se for '                 → reconhece char
        - se for operador          → tenta operador composto via match()
        - caso contrário           → emite token INVALID
```

---

## 3. Vocabulário da Linguagem dotmon

A linguagem possui **49 categorias de token**, distribuídas em:

### 3.1. Tipos (6)

| Token | Lexema | Mapeia para C |
|---|---|---|
| `TYPE_BABY` | `Baby` | `int` |
| `TYPE_PUP` | `Pup` | `float` |
| `TYPE_ROOK` | `Rook` | `long` |
| `TYPE_CHAMP` | `Champ` | `int` (ou `bool`) |
| `TYPE_MOJI` | `Moji` | `char[256]` |
| `TYPE_BIT` | `Bit` | `bool` |

### 3.2. Palavras-Chave (16)

| Categoria | Token | Lexema |
|---|---|---|
| Programa | `KW_START` / `KW_FINISH` | `Start` / `Finish` |
| Condicional | `KW_EVO` / `KW_ALTEVO` / `KW_FAILEVO` | `Evo` / `AltEvo` / `FailEvo` |
| Repetição | `KW_LOOP` / `KW_SPIRAL` | `Loop` / `Spiral` |
| Fluxo | `KW_JAM` / `KW_SKIP` | `Jam` / `Skip` |
| Funções | `KW_XROS` / `KW_SEND` / `KW_CALL` | `Xros` / `Send` / `Call` |
| I/O | `KW_SHOW` / `KW_ASK` | `Show` / `Ask` |
| Módulos | `KW_WORLD` / `KW_CORE` | `World` / `Core` |

### 3.3. Literais (6)

| Token | Forma reconhecida | Exemplo |
|---|---|---|
| `IDENTIFIER` | `[a-zA-Z_][a-zA-Z0-9_]*` | `nivel`, `nomeDigimon`, `_x1` |
| `INT_LITERAL` | `[0-9]+` | `10`, `999999` |
| `FLOAT_LITERAL` | `[0-9]+\.[0-9]+` | `27.49`, `0.85` |
| `BOOL_LITERAL` | `true` / `false` | `true` |
| `STRING_LITERAL` | `"..."` (com escapes) | `"Agumon"` |
| `CHAR_LITERAL` | `'.'` | `'A'` |

### 3.4. Operadores (13)

| Token | Símbolo | Categoria |
|---|---|---|
| `OP_ASSIGN` | `=` | atribuição |
| `OP_PLUS` `OP_MINUS` `OP_MUL` `OP_DIV` | `+ - * /` | aritmético |
| `OP_EQ` `OP_NE` | `== !=` | igualdade |
| `OP_GT` `OP_LT` `OP_GE` `OP_LE` | `> < >= <=` | comparação |
| `OP_AND` `OP_OR` | `&& \|\|` | lógico |

### 3.5. Delimitadores (7)

| Token | Símbolo |
|---|---|
| `LPAREN` `RPAREN` | `( )` |
| `LBRACE` `RBRACE` | `{ }` |
| `SEMICOLON` | `;` |
| `COMMA` | `,` |
| `DOT` | `.` |

### 3.6. Especiais (2 + comentários)

| Token | Significado |
|---|---|
| `EOF` | Fim do arquivo |
| `INVALID` | Lexema não reconhecido |
| `LINE_COMMENT` | `// ...` |
| `BLOCK_COMMENT` | `/* ... */` |

> **Nota:** Comentários **são emitidos como tokens** na implementação JavaScript (para serem reanexados pelo parser e preservados no C gerado). Na implementação C didática, eles são apenas pulados.

---

## 4. Especificação dos Padrões Léxicos

Cada categoria de token possui um padrão formal expresso como expressão regular e um autômato equivalente.

```
Identificador      ::= [a-zA-Z_] [a-zA-Z0-9_]*
Literal inteiro    ::= [0-9]+
Literal float      ::= [0-9]+ '.' [0-9]+
Literal string     ::= '"' ( '\\' . | [^"\\] )* '"'
Literal char       ::= '\'' ( '\\' . | [^'\\] ) '\''
Booleano           ::= 'true' | 'false'
Comentário linha   ::= '//' [^\n]*
Comentário bloco   ::= '/*' .*? '*/'
Whitespace         ::= [ \t\r\n]+
```

**Operadores compostos** seguem o padrão `c1 c2?`:

```
=    →  OP_EQ      se seguido de '='   ; senão OP_ASSIGN
!    →  OP_NE      se seguido de '='   ; senão INVALID
>    →  OP_GE      se seguido de '='   ; senão OP_GT
<    →  OP_LE      se seguido de '='   ; senão OP_LT
&    →  OP_AND     se seguido de '&'   ; senão INVALID
|    →  OP_OR      se seguido de '|'   ; senão INVALID
```

---

## 5. Arquitetura do Scanner

O scanner é uma **máquina de estados implícita**, mantida em uma única estrutura:

```javascript
class Lexer {
  constructor(source) {
    this.source      = source;   // texto-fonte completo (string)
    this.tokens      = [];       // lista de tokens emitidos
    this.start       = 0;        // índice de início do lexema atual
    this.current     = 0;        // índice do próximo caractere a ler
    this.line        = 1;        // linha atual (1-based)
    this.column      = 1;        // coluna atual (1-based)
    this.startLine   = 1;        // linha onde o token atual começou
    this.startColumn = 1;        // coluna onde o token atual começou
  }
}
```

### 5.1. Invariantes

1. `0 ≤ start ≤ current ≤ source.length`
2. `source.slice(start, current)` é sempre o **lexema em construção**.
3. `line` e `column` referem-se à **posição do próximo caractere**.
4. `startLine` / `startColumn` são *congelados* no início de cada token.

### 5.2. Funções Auxiliares

| Função | Comportamento |
|---|---|
| `isAtEnd()` | `current >= source.length` |
| `peek()` | Caractere em `current` sem consumir (ou `'\0'` no fim) |
| `peekNext()` | Caractere em `current+1` sem consumir |
| `advance()` | Consome 1 caractere, atualiza `line`/`column`, retorna o caractere |
| `match(c)` | Se `peek() === c`, consome e retorna `true`; senão `false` |
| `isAlpha(c)` | `c` é letra ou `_` |
| `isDigit(c)` | `c` é `0..9` |
| `isAlphaNumeric(c)` | letra, dígito ou `_` |
| `addToken(type)` | Empurra `{type, lexeme, line, column}` em `tokens[]` |

---

## 6. Algoritmo Passo a Passo

### 6.1. Loop Principal — `tokenize()`

```
função tokenize():
    enquanto NÃO isAtEnd():
        skipWhitespace()                # pula espaços e comentários
        se isAtEnd(): break             # fim após whitespace
        start       ← current           # congela início do lexema
        startLine   ← line
        startColumn ← column
        scanToken()                     # produz exatamente 1 token
    adiciona token EOF
    retorna tokens
```

**Detalhamento:**

1. **Pular brancos.** Antes de cada token, descartar quaisquer espaços, tabulações, quebras de linha e comentários. Tokens *nunca* começam com whitespace.
2. **Marcar início.** A posição (linha/coluna) do token a ser emitido é a posição **após** o whitespace.
3. **Despachar.** A função `scanToken()` lê **um** caractere e decide qual sub-rotina invocar.
4. **EOF.** Ao final, sempre se emite um token `EOF` para que o parser saiba que o fluxo terminou.

### 6.2. Despachador — `scanToken()`

A função-pivô consome o **primeiro caractere** do lexema e direciona para a sub-rotina apropriada:

```javascript
scanToken() {
  const c = this.advance();
  if (this.isAlpha(c)) return this.identifier();   // letra/_ → identificador
  if (this.isDigit(c)) return this.number();       // dígito → número
  switch (c) {
    case '"':  return this.string();
    case "'":  return this.charLiteral();
    case '(':  return this.addToken(TT.LPAREN);
    case ')':  return this.addToken(TT.RPAREN);
    case '{':  return this.addToken(TT.LBRACE);
    case '}':  return this.addToken(TT.RBRACE);
    case ';':  return this.addToken(TT.SEMICOLON);
    case ',':  return this.addToken(TT.COMMA);
    case '.':  return this.addToken(TT.DOT);
    case '+':  return this.addToken(TT.OP_PLUS);
    case '-':  return this.addToken(TT.OP_MINUS);
    case '*':  return this.addToken(TT.OP_MUL);
    case '/':  return this.addToken(TT.OP_DIV);
    case '&':  return this.addToken(this.match('&') ? TT.OP_AND : TT.INVALID);
    case '|':  return this.addToken(this.match('|') ? TT.OP_OR  : TT.INVALID);
    case '=':  return this.addToken(this.match('=') ? TT.OP_EQ  : TT.OP_ASSIGN);
    case '!':  return this.addToken(this.match('=') ? TT.OP_NE  : TT.INVALID);
    case '>':  return this.addToken(this.match('=') ? TT.OP_GE  : TT.OP_GT);
    case '<':  return this.addToken(this.match('=') ? TT.OP_LE  : TT.OP_LT);
    default:   return this.addToken(TT.INVALID);
  }
}
```

> **Importante:** o operador `/` é sempre `OP_DIV` em `scanToken`, porque os casos `//` (linha) e `/*` (bloco) **foram interceptados antes**, dentro de `skipWhitespace()`. Esta é uma decisão arquitetural — comentários são tratados como brancos *enriquecidos*.

---

## 7. Reconhecimento de Cada Categoria de Token

### 7.1. Identificadores e Keywords — `identifier()`

```javascript
identifier() {
  while (!this.isAtEnd() && this.isAlphaNumeric(this.peek()))
    this.advance();
  const text = this.source.slice(this.start, this.current);
  this.addToken(KEYWORDS[text] || TT.IDENTIFIER);
}
```

**Passos:**

1. O primeiro caractere já foi consumido (era letra ou `_`).
2. Consome **caracteres alfanuméricos ou `_`** até encontrar algo diferente.
3. Extrai o lexema do trecho `[start, current)`.
4. Consulta a **tabela de keywords**:
   - Se o lexema for `Baby`, `Evo`, `Show`, `true`, etc. → emite o token **específico** dessa keyword.
   - Caso contrário → emite `IDENTIFIER`.

**NFA equivalente:**

```
   [a-zA-Z_]              [a-zA-Z0-9_]
q0 ────────▶ q1 ─────────────────────▶ q1 (loop) ──ε──▶ qf
                              ▲────────────┘
```

### 7.2. Números — `number()`

```javascript
number() {
  while (!this.isAtEnd() && this.isDigit(this.peek())) this.advance();
  if (this.peek() === '.' && this.isDigit(this.peekNext())) {
    this.advance();   // consome '.'
    while (!this.isAtEnd() && this.isDigit(this.peek())) this.advance();
    return this.addToken(TT.FLOAT_LITERAL);
  }
  this.addToken(TT.INT_LITERAL);
}
```

**Sutilezas:**

- O lexer **só** consome o `.` se houver dígito **logo após** (`peekNext`). Isso permite que `27.foo` seja lido como `INT_LITERAL(27)` + `DOT` + `IDENTIFIER(foo)`.
- Não aceita números negativos diretamente; o `-` é tratado como `OP_MINUS` no parser (operador unário).
- Não suporta notação científica (`1e10`), hexadecimal (`0xFF`) ou octal — escopo intencional.

### 7.3. Strings — `string()`

```javascript
string() {
  while (!this.isAtEnd() && this.peek() !== '"') {
    if (this.peek() === '\\') this.advance();   // pula char após '\'
    this.advance();
  }
  if (this.isAtEnd()) return this.addToken(TT.INVALID);  // não fechou
  this.advance();   // consome '"' de fechamento
  this.addToken(TT.STRING_LITERAL);
}
```

**Comportamento:**

- O `"` inicial já foi consumido pelo dispatcher.
- Consome qualquer caractere até encontrar `"` ou EOF.
- Se vier `\`, **adiciona um avanço extra** — isso preserva sequências de escape como `\n`, `\t`, `\"`, `\\`.
- Se EOF for atingido sem fechar a string → `INVALID`.

**Observação:** O lexer **não decodifica** os escapes — ele apenas garante que `\"` não encerre a string prematuramente. A decodificação é feita pelo gerador de código C (que reescreve os escapes para o C).

### 7.4. Caracteres — `charLiteral()`

```javascript
charLiteral() {
  if (!this.isAtEnd() && this.peek() !== "'") {
    if (this.peek() === '\\') this.advance();
    this.advance();
    if (this.match("'")) return this.addToken(TT.CHAR_LITERAL);
  }
  this.addToken(TT.INVALID);
}
```

- Aceita exatamente **um** caractere (ou um escape `\x`) entre aspas simples.
- Qualquer outra forma (`''`, `'ab'`, `'a` sem fechar) gera `INVALID`.

### 7.5. Operadores Compostos

O scanner usa **lookahead de 1 caractere** via `match()`:

```javascript
case '=':  return this.addToken(this.match('=') ? TT.OP_EQ : TT.OP_ASSIGN);
case '>':  return this.addToken(this.match('=') ? TT.OP_GE : TT.OP_GT);
case '<':  return this.addToken(this.match('=') ? TT.OP_LE : TT.OP_LT);
case '!':  return this.addToken(this.match('=') ? TT.OP_NE : TT.INVALID);
case '&':  return this.addToken(this.match('&') ? TT.OP_AND : TT.INVALID);
case '|':  return this.addToken(this.match('|') ? TT.OP_OR  : TT.INVALID);
```

**Regras de leitura:**

- `=`  isolado → `OP_ASSIGN`
- `==` → `OP_EQ`
- `!`  isolado → **erro** (não há negação lógica unária `!` em dotmon)
- `!=` → `OP_NE`
- `>` / `>=` / `<` / `<=` → comparações
- `&` isolado → erro (não há AND bitwise)
- `&&` → `OP_AND` (lógico)
- `|` isolado → erro (não há OR bitwise)
- `||` → `OP_OR` (lógico)

Este é um exemplo direto do **princípio do maximal munch**.

---

## 8. Tratamento de Comentários e Whitespace

A função `skipWhitespace()` é executada **antes** de cada token. Ela pula:

1. **Espaços e tabulações** (` `, `\t`, `\r`)
2. **Quebras de linha** (`\n`) — também incrementam `line` e resetam `column` (via `advance()`)
3. **Comentários de linha** `// ... \n`
4. **Comentários de bloco** `/* ... */` (não suporta aninhamento)

```javascript
skipWhitespace() {
  while (!this.isAtEnd()) {
    const c = this.peek();
    if (c === ' ' || c === '\r' || c === '\t' || c === '\n') {
      this.advance();
      continue;
    }
    if (c === '/' && this.peekNext() === '/') {
      // comentário de linha — captura como token LINE_COMMENT
      this.start = this.current; this.startLine = this.line; this.startColumn = this.column;
      while (!this.isAtEnd() && this.peek() !== '\n') this.advance();
      this.tokens.push({type: TT.LINE_COMMENT, lexeme: this.source.slice(this.start, this.current),
                        line: this.startLine, column: this.startColumn});
      continue;
    }
    if (c === '/' && this.peekNext() === '*') {
      // comentário de bloco — captura como token BLOCK_COMMENT
      this.start = this.current; this.startLine = this.line; this.startColumn = this.column;
      this.advance(); this.advance();   // consome '/*'
      while (!this.isAtEnd()) {
        if (this.peek() === '*' && this.peekNext() === '/') {
          this.advance(); this.advance();   // consome '*/'
          break;
        }
        this.advance();
      }
      this.tokens.push({type: TT.BLOCK_COMMENT, lexeme: this.source.slice(this.start, this.current),
                        line: this.startLine, column: this.startColumn});
      continue;
    }
    break;
  }
}
```

> **Diferença C × JS:** na versão C (notebook), comentários são **simplesmente descartados**. Na versão JavaScript, eles são **emitidos como tokens** `LINE_COMMENT` / `BLOCK_COMMENT` para que o parser os anexe a nós da AST e o gerador de C os preserve no código compilado (útil para depuração).

---

## 9. Resolução de Keywords vs Identificadores

A estratégia adotada é a **clássica "identifier first, then lookup"**:

1. O scanner **sempre** reconhece o lexema como um identificador (padrão `[a-zA-Z_][a-zA-Z0-9_]*`).
2. **Após** terminar de ler o lexema, consulta a tabela hash de keywords.
3. Se for keyword reservada → emite o token específico (`KW_EVO`, `TYPE_BABY`, etc.).
4. Caso contrário → emite `IDENTIFIER`.

```javascript
const KEYWORDS = {
  Baby: TT.TYPE_BABY,    Pup: TT.TYPE_PUP,      Rook: TT.TYPE_ROOK,
  Champ: TT.TYPE_CHAMP,  Moji: TT.TYPE_MOJI,    Bit: TT.TYPE_BIT,
  Evo: TT.KW_EVO,        AltEvo: TT.KW_ALTEVO,  FailEvo: TT.KW_FAILEVO,
  Jam: TT.KW_JAM,        Skip: TT.KW_SKIP,
  Xros: TT.KW_XROS,      Send: TT.KW_SEND,
  Loop: TT.KW_LOOP,      Spiral: TT.KW_SPIRAL,
  World: TT.KW_WORLD,    Core: TT.KW_CORE,      Call: TT.KW_CALL,
  Show: TT.KW_SHOW,      Ask: TT.KW_ASK,
  Start: TT.KW_START,    Finish: TT.KW_FINISH,
  true: TT.BOOL_LITERAL, false: TT.BOOL_LITERAL,
};
```

**Vantagem desta abordagem:**
- O autômato dos identificadores casa **todas** as keywords (que também são identificadores no padrão `[a-zA-Z_]\w*`).
- A distinção é feita por **busca O(1)** em uma tabela hash, em vez de exigir um autômato gigante com um ramo por keyword.
- Adicionar uma nova keyword exige apenas **uma linha** na tabela.

---

## 10. Posicionamento e Diagnóstico de Erros

### 10.1. Rastreamento de Linha/Coluna

O scanner mantém duas variáveis:

- `line` — incrementada quando `advance()` encontra `\n`.
- `column` — incrementada a cada caractere; resetada para `1` em `\n`.

Sempre que um token é emitido, registra-se a posição **inicial** do lexema, congelada em `startLine`/`startColumn`. Isto é essencial para que mensagens de erro do parser/analisador **apontem para o trecho correto** no editor Monaco.

```javascript
advance() {
  const c = this.source[this.current++];
  if (c === '\n') { this.line++; this.column = 1; }
  else            { this.column++; }
  return c;
}
```

### 10.2. Tokens `INVALID`

Quando o scanner não consegue casar nenhum padrão, ele emite um token do tipo `INVALID` com o lexema do caractere ofensor. Casos:

| Caso | Lexema | Token |
|---|---|---|
| String não fechada | `"Agumon` (sem `"` final) | `INVALID` |
| Char malformado | `'ab'` ou `'` | `INVALID` |
| Caractere desconhecido | `@`, `#`, `$`, `~` | `INVALID` |
| `!` isolado | `!` | `INVALID` |
| `&` isolado | `&` | `INVALID` |
| `\|` isolado | `\|` | `INVALID` |

A função `compile()` percorre os tokens **antes** do parser e converte cada `INVALID` em um `diagnostic` de severidade `error`:

```javascript
for (const t of result.tokens) {
  if (t.type === TT.INVALID) {
    result.diagnostics.push({
      severity: 'error',
      message: `Token invalido: '${t.lexeme}'`,
      line: t.line, column: t.column,
      endColumn: t.column + t.lexeme.length,
    });
  }
}
```

A IDE Web (`app.js`) recebe esses diagnósticos e os exibe:
- **Sublinhado vermelho** no editor (Monaco markers).
- **Aba "Erros"** do painel direito.
- **Tooltip** ao passar o mouse.

---

## 11. Trace Completo de Exemplo

Considere o seguinte trecho dotmon (extraído de `workspace/src/digimon.mon`):

```
Start
{
    Moji nome = "Agumon";
    Baby ataque = 45;
}
Finish
```

**Trace da análise léxica (linha-por-linha):**

| # | Linha | Coluna | Lexema | Tipo de Token | Observação |
|---|---|---|---|---|---|
|  1 | 1 | 1 | `Start` | `KW_START` | keyword reservada |
|  2 | 2 | 1 | `{` | `LBRACE` | delimitador |
|  3 | 3 | 5 | `Moji` | `TYPE_MOJI` | tipo |
|  4 | 3 | 10 | `nome` | `IDENTIFIER` | não é keyword |
|  5 | 3 | 15 | `=` | `OP_ASSIGN` | não há `=` após |
|  6 | 3 | 17 | `"Agumon"` | `STRING_LITERAL` | string fechada |
|  7 | 3 | 25 | `;` | `SEMICOLON` | delimitador |
|  8 | 4 | 5 | `Baby` | `TYPE_BABY` | tipo |
|  9 | 4 | 10 | `ataque` | `IDENTIFIER` | identificador |
| 10 | 4 | 17 | `=` | `OP_ASSIGN` | |
| 11 | 4 | 19 | `45` | `INT_LITERAL` | dígitos, sem `.` |
| 12 | 4 | 21 | `;` | `SEMICOLON` | |
| 13 | 5 | 1 | `}` | `RBRACE` | |
| 14 | 6 | 1 | `Finish` | `KW_FINISH` | |
| 15 | 7 | 1 | — | `EOF` | fim do arquivo |

### 11.1. Trace estado-a-estado da expressão `nivel >= 10`

A leitura do trecho `nivel >= 10` ilustra o uso de `peek`/`advance`/`match`:

```
estado inicial:  current=0, line=1, column=1
texto:           [n][i][v][e][l][ ][>][=][ ][1][0]
```

| Passo | Ação | Estado pós | Token emitido |
|---|---|---|---|
| 1 | `skipWhitespace()` (nada a pular) | `current=0` | — |
| 2 | `start=0`, `advance()='n'` → `isAlpha` → `identifier()` | | |
| 3 | Loop: consome `i`,`v`,`e`,`l` enquanto `isAlphaNumeric(peek())` | `current=5` | |
| 4 | `peek()=' '` (não-alfanum) → sai do loop | | `IDENTIFIER("nivel")` |
| 5 | Próxima iteração: `skipWhitespace()` consome ` ` | `current=6` | |
| 6 | `start=6`, `advance()='>'` → caso `'>'` | | |
| 7 | `match('=')` → `true`, consome `=` | `current=8` | `OP_GE(">=")` |
| 8 | `skipWhitespace()` consome ` ` | `current=9` | |
| 9 | `start=9`, `advance()='1'` → `isDigit` → `number()` | | |
| 10 | Loop: consome `0` | `current=11` | |
| 11 | `peek()` é EOF ou whitespace → não consome `.` | | `INT_LITERAL("10")` |

Tokens finais: `[IDENTIFIER, OP_GE, INT_LITERAL]`.

---

## 12. Saída do Scanner — Lista de Tokens

A função `tokenize()` retorna um **array de objetos token**, cada um no formato:

```json
{ "type": "IDENTIFIER", "lexeme": "nivel", "line": 7, "column": 10 }
```

Para o programa de exemplo da seção anterior, a saída completa do scanner é:

```
[1:1]   KW_START         Start
[2:1]   LBRACE           {
[3:5]   TYPE_MOJI        Moji
[3:10]  IDENTIFIER       nome
[3:15]  OP_ASSIGN        =
[3:17]  STRING_LITERAL   "Agumon"
[3:25]  SEMICOLON        ;
[4:5]   TYPE_BABY        Baby
[4:10]  IDENTIFIER       ataque
[4:17]  OP_ASSIGN        =
[4:19]  INT_LITERAL      45
[4:21]  SEMICOLON        ;
[5:1]   RBRACE           }
[6:1]   KW_FINISH        Finish
[7:1]   EOF
```

Esta lista é o **input direto** da próxima fase, o parser (`Parser` em `compiler.js`).

---

## 13. Implementação em C (Didática)

A implementação de referência em C está no notebook `Análise_Lexico_Dotmon_C.ipynb`. Resumo da arquitetura:

```c
typedef enum { TK_TYPE_BABY, TK_KW_EVO, ..., TK_EOF, TK_INVALID } TokenType;

typedef struct { TokenType type; char *lexeme; int line; int column; } Token;

typedef struct {
    const char *source;  size_t length;
    size_t      start;   size_t current;
    int         line;    int    column;
    int         token_line; int token_column;
} Scanner;

static Token scan_token(Scanner *s);             // loop principal
static Token scan_identifier(Scanner *s);        // [a-zA-Z_]\w*
static Token scan_number(Scanner *s);            // [0-9]+ (\.[0-9]+)?
static Token scan_string(Scanner *s);            // "..."
static Token scan_char_literal(Scanner *s);      // '.'
static void  skip_whitespace_and_comments(Scanner *s);
static TokenType identifier_type(const Scanner *s);  // busca em RESERVED[]

int main(int argc, char *argv[]) {
    char *source = read_file(argv[1]);
    Scanner scanner;
    scanner_init(&scanner, source);
    for (;;) {
        Token token = scan_token(&scanner);
        print_token(&token);
        if (token.type == TK_EOF) break;
        free_token(&token);
    }
    free(source);
    return 0;
}
```

**Diferenças relativas à versão JS:**

| Aspecto | C (didática) | JS (produção) |
|---|---|---|
| Memória | `malloc` manual de lexemas, `free_token` ao final | GC automático |
| Comentários | descartados em `skip_whitespace_and_comments` | emitidos como tokens `LINE_COMMENT` / `BLOCK_COMMENT` |
| Erros | `make_invalid_token` recebe mensagem específica | apenas `INVALID` com lexema; mensagem é gerada depois |
| I/O | lê arquivo via `fopen` / `fread` | recebe string em memória |
| Operadores `&&` / `\|\|` | não implementados na versão original | implementados |

---

## 14. Implementação em JavaScript (Produção)

A versão JavaScript fica em `ide/js/compiler.js`, dentro do IIFE `DotmonCompiler`. Os elementos principais são:

```javascript
const TT       = { TYPE_BABY: 'TYPE_BABY', /* ... 49 categorias ... */ };
const KEYWORDS = { Baby: TT.TYPE_BABY, /* ... */ };

class Lexer {
  constructor(source) { /* ... */ }
  tokenize()      { /* loop principal — retorna tokens[] */ }
  scanToken()     { /* dispatcher por primeiro caractere */ }
  skipWhitespace(){ /* pula espaços E emite tokens de comentário */ }
  identifier()    { /* [a-zA-Z_]\w* + lookup em KEYWORDS */ }
  number()        { /* [0-9]+ com .float opcional */ }
  string()        { /* "..." com escapes */ }
  charLiteral()   { /* '.' com escape */ }
  /* helpers: isAtEnd, peek, peekNext, advance, match, isAlpha, isDigit, isAlphaNumeric, addToken */
}

function tokenize(source) { return new Lexer(source).tokenize(); }
```

### 14.1. Pontos de integração com a IDE

1. **`compile(source, filename)`** (linha ~1664) — chama `new Lexer(source).tokenize()` e converte tokens `INVALID` em diagnostics.
2. **`diagnose(source)`** (linha ~1718) — versão *light* para validação em tempo real durante digitação (sem gerar C).
3. **`tokenize(source)`** (linha ~1764) — função pública para inspeção dos tokens (útil em debug).

### 14.2. Diagnóstico em tempo real

O `app.js` executa `DotmonCompiler.diagnose()` **com debounce de 500 ms** após cada keypress no Monaco. Os diagnósticos são convertidos em **markers** do Monaco, que renderizam sublinhados vermelhos (errors) e amarelos (warnings) no editor — exatamente como em IDEs profissionais.

---

## 15. Apêndice — Autômatos (NFA) por Categoria

Visualizações interativas estão em `nfa_estados_detalhados.html`. Reproduzidos abaixo em ASCII:

### 15.1. Identificador `[a-zA-Z_][a-zA-Z0-9_]*`

```
       [a-zA-Z_]            [a-zA-Z0-9_]
 (q0) ───────────▶ (q1) ───────────────────▶ (q2)
                   │                         ↑│
                   │ ε (1 char)              │└── [a-zA-Z0-9_] (loop)
                   ▼                         ε
                  ((qf)) ◀─────────────────  
```

### 15.2. Literal inteiro `[0-9]+`

```
       [0-9]            [0-9] (loop)
 (q0) ─────▶ (q1) ─────────────────▶ (q1)
              │
              │ ε
              ▼
             ((qf))
```

### 15.3. Literal float `[0-9]+ '.' [0-9]+`

```
       [0-9]   [0-9](loop)   '.'    [0-9]   [0-9](loop)   ε
 (q0) ───────▶ (q1) ────────▶ (q2) ──────▶ (q3) ─────────▶ ((qf))
```

### 15.4. Literal string `"..."`

```
        "        [^"]          [^"](loop)         "
 (q0) ─────▶ (q1) ─────▶ (q2) ───────────▶ (q2) ─────▶ ((qf))
              │                                       ↑
              └─────────── " (vazia) ─────────────────┘
```

### 15.5. Literal char `'.'`

```
        '        qualquer        '
 (q0) ─────▶ (q1) ─────────▶ (q2) ─────▶ ((qf))
```

### 15.6. Booleano `true | false`

```
       t      r u e
 (q0) ───▶ (q1) ──────▶ ((qf))
   │
   │ f      a l s e
   └─────▶ (q2) ──────▶ ((qf))
```

### 15.7. Tipos `Baby | Pup | Rook | Champ | Moji | Bit`

```
       ε ──▶ (q1) ── "Baby"  ─▶ ((qf))
       ε ──▶ (q2) ── "Pup"   ─▶ ((qf))
 (q0) ─ε ──▶ (q3) ── "Rook"  ─▶ ((qf))
       ε ──▶ (q4) ── "Champ" ─▶ ((qf))
       ε ──▶ (q5) ── "Moji"  ─▶ ((qf))
       ε ──▶ (q6) ── "Bit"   ─▶ ((qf))
```

---

## Referências Internas

- `ide/js/compiler.js:101-308` — implementação completa da classe `Lexer` (JS)
- `ide/js/compiler.js:10-90` — definição de `TT` (token types) e `KEYWORDS`
- `ide/js/compiler.js:1664-1712` — função `compile()` que orquestra lexer → parser → analyzer → codegen
- `Análise_Lexico_Dotmon_C.ipynb` — implementação didática em C, célula 8
- `nfa_estados_detalhados.html` — visualização interativa dos NFAs
- `README.md` — visão geral do projeto e da linguagem

---

> *Documento gerado como material de apoio para a disciplina **Linguagens Formais e Compiladores** — projeto dotmon.*
