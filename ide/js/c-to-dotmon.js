// ============================================================
// C → Dotmon Transpiler
// CLexer → CParser → DotmonGenerator
// Converts C code back into Dotmon (.mon) source
// ============================================================

const CToDotmon = (() => {
  "use strict";

  // ─── C Token Types ─────────────────────────────────────
  const CT = {
    // Types
    KW_INT: "KW_INT",
    KW_FLOAT: "KW_FLOAT",
    KW_LONG: "KW_LONG",
    KW_CHAR: "KW_CHAR",
    KW_BOOL: "KW_BOOL",
    KW_VOID: "KW_VOID",
    KW_DOUBLE: "KW_DOUBLE",
    // Control flow
    KW_IF: "KW_IF",
    KW_ELSE: "KW_ELSE",
    KW_FOR: "KW_FOR",
    KW_WHILE: "KW_WHILE",
    KW_RETURN: "KW_RETURN",
    KW_BREAK: "KW_BREAK",
    KW_CONTINUE: "KW_CONTINUE",
    // Literals
    KW_TRUE: "KW_TRUE",
    KW_FALSE: "KW_FALSE",
    // C-specific
    KW_INCLUDE: "KW_INCLUDE",
    KW_PRINTF: "KW_PRINTF",
    KW_SCANF: "KW_SCANF",
    KW_STRCPY: "KW_STRCPY",
    // Identifiers & literals
    IDENTIFIER: "IDENTIFIER",
    INT_LITERAL: "INT_LITERAL",
    FLOAT_LITERAL: "FLOAT_LITERAL",
    STRING_LITERAL: "STRING_LITERAL",
    CHAR_LITERAL: "CHAR_LITERAL",
    // Operators
    OP_ASSIGN: "OP_ASSIGN",
    OP_PLUS: "OP_PLUS",
    OP_MINUS: "OP_MINUS",
    OP_MUL: "OP_MUL",
    OP_DIV: "OP_DIV",
    OP_EQ: "OP_EQ",
    OP_NE: "OP_NE",
    OP_GT: "OP_GT",
    OP_LT: "OP_LT",
    OP_GE: "OP_GE",
    OP_LE: "OP_LE",
    OP_AND: "OP_AND",
    OP_OR: "OP_OR",
    OP_NOT: "OP_NOT",
    OP_MOD: "OP_MOD",
    OP_AMP: "OP_AMP",
    // Delimiters
    LPAREN: "LPAREN",
    RPAREN: "RPAREN",
    LBRACE: "LBRACE",
    RBRACE: "RBRACE",
    LBRACKET: "LBRACKET",
    RBRACKET: "RBRACKET",
    SEMICOLON: "SEMICOLON",
    COMMA: "COMMA",
    DOT: "DOT",
    HASH: "HASH",
    // Special
    LINE_COMMENT: "LINE_COMMENT",
    BLOCK_COMMENT: "BLOCK_COMMENT",
    PREPROCESSOR: "PREPROCESSOR",
    EOF: "EOF",
    INVALID: "INVALID",
  };

  const C_KEYWORDS = {
    int: CT.KW_INT,
    float: CT.KW_FLOAT,
    double: CT.KW_DOUBLE,
    long: CT.KW_LONG,
    char: CT.KW_CHAR,
    bool: CT.KW_BOOL,
    void: CT.KW_VOID,
    if: CT.KW_IF,
    else: CT.KW_ELSE,
    for: CT.KW_FOR,
    while: CT.KW_WHILE,
    return: CT.KW_RETURN,
    break: CT.KW_BREAK,
    continue: CT.KW_CONTINUE,
    true: CT.KW_TRUE,
    false: CT.KW_FALSE,
    printf: CT.KW_PRINTF,
    scanf: CT.KW_SCANF,
    strcpy: CT.KW_STRCPY,
  };

  const C_TYPE_TOKENS = new Set([
    CT.KW_INT,
    CT.KW_FLOAT,
    CT.KW_DOUBLE,
    CT.KW_LONG,
    CT.KW_CHAR,
    CT.KW_BOOL,
    CT.KW_VOID,
  ]);

  // ─── C Lexer ──────────────────────────────────────────
  class CLexer {
    constructor(source) {
      this.source = source;
      this.tokens = [];
      this.start = 0;
      this.current = 0;
      this.line = 1;
      this.column = 1;
      this.startLine = 1;
      this.startColumn = 1;
    }

    tokenize() {
      while (!this.isAtEnd()) {
        this.skipWhitespace();
        if (this.isAtEnd()) break;
        this.start = this.current;
        this.startLine = this.line;
        this.startColumn = this.column;
        this.scanToken();
      }
      this.tokens.push({
        type: CT.EOF,
        lexeme: "",
        line: this.line,
        column: this.column,
      });
      return this.tokens;
    }

    scanToken() {
      const c = this.advance();

      if (this.isAlpha(c)) return this.identifier();
      if (this.isDigit(c)) return this.number();

      switch (c) {
        case '"':
          return this.string();
        case "'":
          return this.charLiteral();
        case "#":
          return this.preprocessor();
        case "(":
          return this.addToken(CT.LPAREN);
        case ")":
          return this.addToken(CT.RPAREN);
        case "{":
          return this.addToken(CT.LBRACE);
        case "}":
          return this.addToken(CT.RBRACE);
        case "[":
          return this.addToken(CT.LBRACKET);
        case "]":
          return this.addToken(CT.RBRACKET);
        case ";":
          return this.addToken(CT.SEMICOLON);
        case ",":
          return this.addToken(CT.COMMA);
        case ".":
          return this.addToken(CT.DOT);
        case "+":
          return this.addToken(CT.OP_PLUS);
        case "-":
          return this.addToken(CT.OP_MINUS);
        case "*":
          return this.addToken(CT.OP_MUL);
        case "/":
          return this.addToken(CT.OP_DIV);
        case "%":
          return this.addToken(CT.OP_MOD);
        case "&":
          return this.addToken(this.match("&") ? CT.OP_AND : CT.OP_AMP);
        case "|":
          return this.addToken(this.match("|") ? CT.OP_OR : CT.INVALID);
        case "=":
          return this.addToken(this.match("=") ? CT.OP_EQ : CT.OP_ASSIGN);
        case "!":
          return this.addToken(this.match("=") ? CT.OP_NE : CT.OP_NOT);
        case ">":
          return this.addToken(this.match("=") ? CT.OP_GE : CT.OP_GT);
        case "<":
          return this.addToken(this.match("=") ? CT.OP_LE : CT.OP_LT);
        default:
          return this.addToken(CT.INVALID);
      }
    }

    skipWhitespace() {
      while (!this.isAtEnd()) {
        const c = this.peek();
        if (c === " " || c === "\r" || c === "\t" || c === "\n") {
          this.advance();
          continue;
        }
        // Line comment
        if (c === "/" && this.peekNext() === "/") {
          this.start = this.current;
          this.startLine = this.line;
          this.startColumn = this.column;
          while (!this.isAtEnd() && this.peek() !== "\n") this.advance();
          const text = this.source.slice(this.start, this.current);
          this.tokens.push({
            type: CT.LINE_COMMENT,
            lexeme: text,
            line: this.startLine,
            column: this.startColumn,
          });
          continue;
        }
        // Block comment
        if (c === "/" && this.peekNext() === "*") {
          this.start = this.current;
          this.startLine = this.line;
          this.startColumn = this.column;
          this.advance(); // /
          this.advance(); // *
          while (!this.isAtEnd()) {
            if (this.peek() === "*" && this.peekNext() === "/") {
              this.advance();
              this.advance();
              break;
            }
            this.advance();
          }
          const text = this.source.slice(this.start, this.current);
          this.tokens.push({
            type: CT.BLOCK_COMMENT,
            lexeme: text,
            line: this.startLine,
            column: this.startColumn,
          });
          continue;
        }
        break;
      }
    }

    identifier() {
      while (!this.isAtEnd() && this.isAlphaNumeric(this.peek()))
        this.advance();
      const text = this.source.slice(this.start, this.current);
      this.addToken(C_KEYWORDS[text] || CT.IDENTIFIER);
    }

    number() {
      while (!this.isAtEnd() && this.isDigit(this.peek())) this.advance();
      if (this.peek() === "." && this.isDigit(this.peekNext())) {
        this.advance();
        while (!this.isAtEnd() && this.isDigit(this.peek())) this.advance();
        return this.addToken(CT.FLOAT_LITERAL);
      }
      this.addToken(CT.INT_LITERAL);
    }

    string() {
      while (!this.isAtEnd() && this.peek() !== '"') {
        if (this.peek() === "\\") this.advance();
        this.advance();
      }
      if (this.isAtEnd()) return this.addToken(CT.INVALID);
      this.advance();
      this.addToken(CT.STRING_LITERAL);
    }

    charLiteral() {
      if (!this.isAtEnd() && this.peek() !== "'") {
        if (this.peek() === "\\") this.advance();
        this.advance();
        if (this.match("'")) return this.addToken(CT.CHAR_LITERAL);
      }
      this.addToken(CT.INVALID);
    }

    preprocessor() {
      // e.g. #include <stdio.h>
      while (!this.isAtEnd() && this.peek() !== "\n") this.advance();
      this.addToken(CT.PREPROCESSOR);
    }

    // ─── Helpers ───────────────────────────────────────────
    isAtEnd() {
      return this.current >= this.source.length;
    }
    peek() {
      return this.isAtEnd() ? "\0" : this.source[this.current];
    }
    peekNext() {
      return this.current + 1 >= this.source.length
        ? "\0"
        : this.source[this.current + 1];
    }
    advance() {
      const c = this.source[this.current++];
      if (c === "\n") {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      return c;
    }
    match(expected) {
      if (this.isAtEnd() || this.source[this.current] !== expected)
        return false;
      this.advance();
      return true;
    }
    isAlpha(c) {
      return /[a-zA-Z_]/.test(c);
    }
    isDigit(c) {
      return /[0-9]/.test(c);
    }
    isAlphaNumeric(c) {
      return /[a-zA-Z0-9_]/.test(c);
    }
    addToken(type) {
      this.tokens.push({
        type,
        lexeme: this.source.slice(this.start, this.current),
        line: this.startLine,
        column: this.startColumn,
      });
    }
  }

  // ─── C Parser ─────────────────────────────────────────
  // Builds a Dotmon-compatible AST from C tokens
  class CParseError extends Error {
    constructor(message, token) {
      super(message);
      this.line = token ? token.line : 1;
      this.column = token ? token.column : 1;
    }
  }

  class CParser {
    constructor(tokens) {
      this.tokens = tokens;
      this.pos = 0;
      this.pendingComments = [];
      // Track variable types for disambiguation (char[] vs char)
      this.symbolTypes = {};
    }

    parse() {
      const functions = [];
      const mainBody = [];

      // Skip preprocessor directives
      while (this.check(CT.PREPROCESSOR)) this.advance();

      // Parse top-level: functions and main
      while (!this.isAtEnd()) {
        this.collectComments();
        if (this.isAtEnd()) break;

        // Skip preprocessor
        if (this.check(CT.PREPROCESSOR)) {
          this.advance();
          continue;
        }

        // Discard compiler-generated block comments (/* Generated by ... */)
        const comments = this.drainComments().filter(
          (c) => !c.startsWith("/*"),
        );

        // Detect: type name(...) { ... }  →  function or main
        if (this.isTypeToken() && this.looksLikeFunction()) {
          const func = this.parseFunctionOrMain();
          if (func.leadingComments === undefined && comments.length > 0) {
            func.leadingComments = comments;
          }
          if (func.isMain) {
            // main body statements get merged
            for (const s of func.body) mainBody.push(s);
          } else {
            functions.push(func);
          }
        } else {
          // top-level statement (shouldn't happen in valid C, skip)
          this.advance();
        }
      }

      // Build AST: functions inside body (like Dotmon does), then main stmts
      const body = [...functions, ...mainBody];
      return { type: "Program", body };
    }

    // ─── Top-level Parsing ──────────────────────────────
    looksLikeFunction() {
      // Save position, look ahead: type [name] ( ...
      const saved = this.pos;
      try {
        this.advanceRaw(); // type
        if (this.checkRaw(CT.IDENTIFIER) || this.checkRaw(CT.KW_PRINTF) || this.checkRaw(CT.KW_SCANF)) {
          this.advanceRaw(); // name or "main"
          return this.checkRaw(CT.LPAREN);
        }
        return false;
      } finally {
        this.pos = saved;
      }
    }

    parseFunctionOrMain() {
      const retTypeTok = this.advance();
      const retType = retTypeTok.lexeme;
      const nameTok = this.advance();
      const name = nameTok.lexeme;

      this.expect(CT.LPAREN, "Esperado '('");

      if (name === "main") {
        // Skip main params: void or empty
        while (!this.check(CT.RPAREN) && !this.isAtEnd()) this.advance();
        this.expect(CT.RPAREN, "Esperado ')'");
        const body = this.blockStatements();
        return { isMain: true, body };
      }

      // Parse function parameters
      const params = [];
      if (!this.check(CT.RPAREN)) {
        do {
          const pType = this.advance(); // type token
          const pName = this.expect(CT.IDENTIFIER, "Esperado nome do parametro");
          let paramCType = pType.lexeme;
          // Handle char name[] → Moji
          if (pType.lexeme === "char" && this.check(CT.LBRACKET)) {
            this.advance(); // [
            this.advance(); // ]
            paramCType = "char[]";
          }
          params.push({
            varType: this.cTypeToDotmon(paramCType),
            name: pName.lexeme,
          });
          this.symbolTypes[pName.lexeme] = paramCType;
        } while (this.check(CT.COMMA) && this.advance());
      }
      this.expect(CT.RPAREN, "Esperado ')'");

      const body = this.blockStatements();

      return {
        type: "FuncDecl",
        returnType: this.cTypeToDotmon(retType),
        name,
        params,
        body,
        line: retTypeTok.line,
        column: retTypeTok.column,
      };
    }

    // ─── Block & Statements ─────────────────────────────
    blockStatements() {
      this.expect(CT.LBRACE, "Esperado '{'");
      const stmts = [];
      while (!this.check(CT.RBRACE) && !this.isAtEnd()) {
        const comments = this.drainComments();
        if (this.check(CT.RBRACE)) {
          // trailing comments
          if (comments.length > 0) {
            stmts.push({ type: "CommentBlock", leadingComments: comments });
          }
          break;
        }
        const stmt = this.statement();
        if (stmt) {
          if (comments.length > 0) stmt.leadingComments = comments;
          stmts.push(stmt);
        }
      }
      this.expect(CT.RBRACE, "Esperado '}'");
      return stmts;
    }

    statement() {
      const tok = this.peek();

      // return 0; → skip (dotmon doesn't have explicit return 0 in main)
      if (tok.type === CT.KW_RETURN) return this.returnStatement();
      if (tok.type === CT.KW_BREAK) return this.breakStatement();
      if (tok.type === CT.KW_CONTINUE) return this.continueStatement();
      if (tok.type === CT.KW_IF) return this.ifStatement();
      if (tok.type === CT.KW_WHILE) return this.whileStatement();
      if (tok.type === CT.KW_FOR) return this.forStatement();
      if (tok.type === CT.KW_PRINTF) return this.printfStatement();
      if (tok.type === CT.KW_SCANF) return this.scanfStatement();
      if (tok.type === CT.KW_STRCPY) return this.strcpyStatement();
      if (this.isTypeToken()) return this.varDeclStatement();
      if (tok.type === CT.IDENTIFIER) return this.assignmentOrExpr();

      // Skip unknown
      this.advance();
      return null;
    }

    // ─── Variable Declaration ───────────────────────────
    varDeclStatement() {
      const typeTok = this.advance();
      let cType = typeTok.lexeme;
      const nameTok = this.expect(CT.IDENTIFIER, "Esperado nome da variavel");
      const name = nameTok.lexeme;

      // char name[256] = "..." → Moji
      if (cType === "char" && this.check(CT.LBRACKET)) {
        this.advance(); // [
        // Skip size if present
        while (!this.check(CT.RBRACKET) && !this.isAtEnd()) this.advance();
        this.expect(CT.RBRACKET, "Esperado ']'");
        cType = "char[]";
      }

      this.symbolTypes[name] = cType;

      this.expect(CT.OP_ASSIGN, "Esperado '='");
      const init = this.expression();
      this.expect(CT.SEMICOLON, "Esperado ';'");

      return {
        type: "VarDecl",
        varType: this.cTypeToDotmon(cType),
        name,
        init,
        line: typeTok.line,
        column: typeTok.column,
      };
    }

    // ─── Assignment or Expression Statement ─────────────
    assignmentOrExpr() {
      const nameTok = this.peek();

      // Check if it's name = expr;
      if (this.peekNextSkipComments().type === CT.OP_ASSIGN) {
        this.advance(); // name
        this.advance(); // =
        const value = this.expression();
        this.expect(CT.SEMICOLON, "Esperado ';'");
        return {
          type: "Assignment",
          name: nameTok.lexeme,
          value,
          line: nameTok.line,
          column: nameTok.column,
        };
      }

      // It's a function call: name(args);
      if (this.peekNextSkipComments().type === CT.LPAREN) {
        const expr = this.expression();
        this.expect(CT.SEMICOLON, "Esperado ';'");
        // Wrap as ExprStmt → becomes Call in dotmon
        return {
          type: "ExprStmt",
          expression: expr,
          line: nameTok.line,
          column: nameTok.column,
        };
      }

      // Fallback: skip as expression statement
      const expr = this.expression();
      this.expect(CT.SEMICOLON, "Esperado ';'");
      return {
        type: "ExprStmt",
        expression: expr,
        line: nameTok.line,
        column: nameTok.column,
      };
    }

    // ─── printf → Show ──────────────────────────────────
    printfStatement() {
      const tok = this.advance(); // printf
      this.expect(CT.LPAREN, "Esperado '('");

      const fmtTok = this.expect(CT.STRING_LITERAL, "Esperado format string");
      const fmt = fmtTok.lexeme.slice(1, -1); // strip quotes

      const args = [];
      while (this.check(CT.COMMA)) {
        this.advance(); // ,
        args.push(this.expression());
      }
      this.expect(CT.RPAREN, "Esperado ')'");
      this.expect(CT.SEMICOLON, "Esperado ';'");

      // Parse the format string and match with args
      return this.convertPrintfToShow(fmt, args, tok);
    }

    convertPrintfToShow(fmt, args, tok) {
      // Strip trailing \n
      let clean = fmt;
      if (clean.endsWith("\\n")) clean = clean.slice(0, -2);

      // Simple cases
      // 1) Pure string literal: printf("Hello!\n");
      if (args.length === 0 && !this.hasFormatSpec(clean)) {
        return {
          type: "ShowStmt",
          args: [
            {
              type: "StringLiteral",
              value: this.unescapeC(clean),
              line: tok.line,
              column: tok.column,
            },
          ],
          line: tok.line,
          column: tok.column,
        };
      }

      // 2) Single format specifier with no surrounding text: printf("%d\n", x);
      if (args.length === 1 && this.isPureFormatSpec(clean)) {
        return {
          type: "ShowStmt",
          args: [args[0]],
          line: tok.line,
          column: tok.column,
        };
      }

      // 3) Mixed: printf("Name: %s, Age: %d\n", name, age);
      // Split into multiple Show args (strings interleaved with variables)
      const showArgs = [];
      const specRegex = /%([-+0 #]*)(\d+|\*)?(\.\d+|\.\*)?([hlLqjzt]*)(d|i|u|f|e|g|x|o|s|c|ld|lf|p|%|255s)/g;
      let lastIndex = 0;
      let argIndex = 0;
      let m;

      while ((m = specRegex.exec(clean)) !== null) {
        // Text before the specifier
        if (m.index > lastIndex) {
          const textBefore = this.unescapeC(clean.slice(lastIndex, m.index));
          if (textBefore) {
            showArgs.push({
              type: "StringLiteral",
              value: textBefore,
              line: tok.line,
              column: tok.column,
            });
          }
        }
        // The format specifier → use the corresponding arg
        if (m[5] !== "%" && argIndex < args.length) {
          showArgs.push(args[argIndex++]);
        }
        lastIndex = m.index + m[0].length;
      }
      // Trailing text
      if (lastIndex < clean.length) {
        const trailing = this.unescapeC(clean.slice(lastIndex));
        if (trailing) {
          showArgs.push({
            type: "StringLiteral",
            value: trailing,
            line: tok.line,
            column: tok.column,
          });
        }
      }

      if (showArgs.length === 0) {
        // Fallback: empty Show
        showArgs.push({
          type: "StringLiteral",
          value: "",
          line: tok.line,
          column: tok.column,
        });
      }

      return {
        type: "ShowStmt",
        args: showArgs,
        line: tok.line,
        column: tok.column,
      };
    }

    hasFormatSpec(s) {
      return /%[^%]/.test(s);
    }

    isPureFormatSpec(s) {
      return /^%([-+0 #]*)(\d+|\*)?(\.\d+|\.\*)?([hlLqjzt]*)(d|i|u|f|e|g|x|o|s|c|ld|lf|p|255s)$/.test(
        s.trim(),
      );
    }

    unescapeC(s) {
      return s
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\")
        .replace(/%%/g, "%");
    }

    // ─── scanf → Ask ────────────────────────────────────
    scanfStatement() {
      const tok = this.advance(); // scanf
      this.expect(CT.LPAREN, "Esperado '('");

      // Skip the format string
      this.expect(CT.STRING_LITERAL, "Esperado format string");
      this.expect(CT.COMMA, "Esperado ','");

      // Get variable name (may have & prefix)
      let varName;
      if (this.check(CT.OP_AMP)) {
        this.advance(); // skip &
      }
      varName = this.expect(CT.IDENTIFIER, "Esperado nome da variavel").lexeme;

      this.expect(CT.RPAREN, "Esperado ')'");
      this.expect(CT.SEMICOLON, "Esperado ';'");

      return {
        type: "AskStmt",
        name: varName,
        line: tok.line,
        column: tok.column,
      };
    }

    // ─── strcpy → Assignment ────────────────────────────
    strcpyStatement() {
      const tok = this.advance(); // strcpy
      this.expect(CT.LPAREN, "Esperado '('");
      const dest = this.expect(CT.IDENTIFIER, "Esperado nome da variavel");
      this.expect(CT.COMMA, "Esperado ','");
      const value = this.expression();
      this.expect(CT.RPAREN, "Esperado ')'");
      this.expect(CT.SEMICOLON, "Esperado ';'");

      return {
        type: "Assignment",
        name: dest.lexeme,
        value,
        line: tok.line,
        column: tok.column,
      };
    }

    // ─── if/else if/else → Evo/AltEvo/FailEvo ──────────
    ifStatement() {
      const tok = this.advance(); // if
      const branches = [];
      let elseBranch = null;

      this.expect(CT.LPAREN, "Esperado '('");
      const condition = this.expression();
      this.expect(CT.RPAREN, "Esperado ')'");
      const body = this.blockStatements();
      branches.push({ condition, body });

      while (this.check(CT.KW_ELSE)) {
        this.advance(); // else
        if (this.check(CT.KW_IF)) {
          this.advance(); // if
          this.expect(CT.LPAREN, "Esperado '('");
          const altCond = this.expression();
          this.expect(CT.RPAREN, "Esperado ')'");
          const altBody = this.blockStatements();
          branches.push({ condition: altCond, body: altBody });
        } else {
          elseBranch = this.blockStatements();
        }
      }

      return {
        type: "IfChain",
        branches,
        elseBranch,
        line: tok.line,
        column: tok.column,
      };
    }

    // ─── while → Spiral ─────────────────────────────────
    whileStatement() {
      const tok = this.advance(); // while
      this.expect(CT.LPAREN, "Esperado '('");
      const condition = this.expression();
      this.expect(CT.RPAREN, "Esperado ')'");
      const body = this.blockStatements();
      return {
        type: "WhileLoop",
        condition,
        body,
        line: tok.line,
        column: tok.column,
      };
    }

    // ─── for → Loop ─────────────────────────────────────
    forStatement() {
      const tok = this.advance(); // for
      this.expect(CT.LPAREN, "Esperado '('");

      // Init: type name = expr;
      let init;
      if (this.isTypeToken()) {
        init = this.varDeclStatement();
      } else {
        // name = expr;
        const n = this.advance();
        this.expect(CT.OP_ASSIGN, "Esperado '='");
        const v = this.expression();
        this.expect(CT.SEMICOLON, "Esperado ';'");
        init = { type: "VarDecl", varType: "Baby", name: n.lexeme, init: v, line: n.line, column: n.column };
      }

      // Condition
      const condition = this.expression();
      this.expect(CT.SEMICOLON, "Esperado ';'");

      // Step: name = expr
      const stepName = this.expect(CT.IDENTIFIER, "Esperado identificador");
      this.expect(CT.OP_ASSIGN, "Esperado '='");
      const stepValue = this.expression();
      const step = {
        type: "Assignment",
        name: stepName.lexeme,
        value: stepValue,
      };

      this.expect(CT.RPAREN, "Esperado ')'");
      const body = this.blockStatements();

      return {
        type: "ForLoop",
        init,
        condition,
        step,
        body,
        line: tok.line,
        column: tok.column,
      };
    }

    // ─── return → Send ──────────────────────────────────
    returnStatement() {
      const tok = this.advance(); // return
      let value = null;
      if (!this.check(CT.SEMICOLON)) {
        value = this.expression();
      }
      this.expect(CT.SEMICOLON, "Esperado ';'");

      // "return 0;" at the end of main is skipped by the caller
      if (
        value &&
        value.type === "IntLiteral" &&
        value.value === 0
      ) {
        return null; // Skip return 0 (dotmon uses Finish instead)
      }

      return {
        type: "ReturnStmt",
        value,
        line: tok.line,
        column: tok.column,
      };
    }

    breakStatement() {
      const tok = this.advance();
      this.expect(CT.SEMICOLON, "Esperado ';'");
      return { type: "BreakStmt", line: tok.line, column: tok.column };
    }

    continueStatement() {
      const tok = this.advance();
      this.expect(CT.SEMICOLON, "Esperado ';'");
      return { type: "SkipStmt", line: tok.line, column: tok.column };
    }

    // ─── Expression Parsing ─────────────────────────────
    expression() {
      return this.logicalOr();
    }

    logicalOr() {
      let left = this.logicalAnd();
      while (this.check(CT.OP_OR)) {
        const op = this.advance();
        const right = this.logicalAnd();
        left = {
          type: "BinaryExpr",
          op: op.lexeme,
          left,
          right,
          line: op.line,
          column: op.column,
        };
      }
      return left;
    }

    logicalAnd() {
      let left = this.comparison();
      while (this.check(CT.OP_AND)) {
        const op = this.advance();
        const right = this.comparison();
        left = {
          type: "BinaryExpr",
          op: op.lexeme,
          left,
          right,
          line: op.line,
          column: op.column,
        };
      }
      return left;
    }

    comparison() {
      let left = this.addition();
      while (
        this.checkAny([CT.OP_EQ, CT.OP_NE, CT.OP_GT, CT.OP_LT, CT.OP_GE, CT.OP_LE])
      ) {
        const op = this.advance();
        const right = this.addition();
        left = {
          type: "BinaryExpr",
          op: op.lexeme,
          left,
          right,
          line: op.line,
          column: op.column,
        };
      }
      return left;
    }

    addition() {
      let left = this.multiplication();
      while (this.checkAny([CT.OP_PLUS, CT.OP_MINUS])) {
        const op = this.advance();
        const right = this.multiplication();
        left = {
          type: "BinaryExpr",
          op: op.lexeme,
          left,
          right,
          line: op.line,
          column: op.column,
        };
      }
      return left;
    }

    multiplication() {
      let left = this.unary();
      while (this.checkAny([CT.OP_MUL, CT.OP_DIV, CT.OP_MOD])) {
        const op = this.advance();
        const right = this.unary();
        left = {
          type: "BinaryExpr",
          op: op.lexeme,
          left,
          right,
          line: op.line,
          column: op.column,
        };
      }
      return left;
    }

    unary() {
      if (this.check(CT.OP_MINUS)) {
        const op = this.advance();
        const operand = this.unary();
        return {
          type: "UnaryExpr",
          op: "-",
          operand,
          line: op.line,
          column: op.column,
        };
      }
      if (this.check(CT.OP_NOT)) {
        const op = this.advance();
        const operand = this.unary();
        return {
          type: "UnaryExpr",
          op: "!",
          operand,
          line: op.line,
          column: op.column,
        };
      }
      return this.primary();
    }

    primary() {
      const tok = this.peek();

      if (tok.type === CT.INT_LITERAL) {
        this.advance();
        return {
          type: "IntLiteral",
          value: parseInt(tok.lexeme, 10),
          line: tok.line,
          column: tok.column,
        };
      }
      if (tok.type === CT.FLOAT_LITERAL) {
        this.advance();
        return {
          type: "FloatLiteral",
          value: parseFloat(tok.lexeme),
          line: tok.line,
          column: tok.column,
        };
      }
      if (tok.type === CT.STRING_LITERAL) {
        this.advance();
        return {
          type: "StringLiteral",
          value: tok.lexeme.slice(1, -1),
          line: tok.line,
          column: tok.column,
        };
      }
      if (tok.type === CT.CHAR_LITERAL) {
        this.advance();
        return {
          type: "CharLiteral",
          value: tok.lexeme.slice(1, -1),
          line: tok.line,
          column: tok.column,
        };
      }
      if (tok.type === CT.KW_TRUE || tok.type === CT.KW_FALSE) {
        this.advance();
        return {
          type: "BoolLiteral",
          value: tok.type === CT.KW_TRUE,
          line: tok.line,
          column: tok.column,
        };
      }
      if (tok.type === CT.IDENTIFIER) {
        this.advance();
        // Function call
        if (this.check(CT.LPAREN)) {
          this.advance(); // (
          const args = [];
          if (!this.check(CT.RPAREN)) {
            args.push(this.expression());
            while (this.check(CT.COMMA)) {
              this.advance();
              args.push(this.expression());
            }
          }
          this.expect(CT.RPAREN, "Esperado ')'");
          return {
            type: "CallExpr",
            callee: tok.lexeme,
            args,
            line: tok.line,
            column: tok.column,
          };
        }
        return {
          type: "Identifier",
          name: tok.lexeme,
          line: tok.line,
          column: tok.column,
        };
      }
      if (tok.type === CT.LPAREN) {
        this.advance();
        const expr = this.expression();
        this.expect(CT.RPAREN, "Esperado ')'");
        return expr;
      }

      throw new CParseError(`Token C inesperado: '${tok.lexeme}'`, tok);
    }

    // ─── Type Mapping ───────────────────────────────────
    cTypeToDotmon(cType) {
      const map = {
        int: "Baby",
        float: "Pup",
        double: "Pup",
        long: "Rook",
        bool: "Champ",
        "char[]": "Moji",
        char: "Bit",
        void: "void",
      };
      return map[cType] || "Baby";
    }

    isTypeToken() {
      return C_TYPE_TOKENS.has(this.peek().type);
    }

    // ─── Token Helpers ──────────────────────────────────
    collectComments() {
      while (
        this.pos < this.tokens.length &&
        (this.tokens[this.pos].type === CT.LINE_COMMENT ||
          this.tokens[this.pos].type === CT.BLOCK_COMMENT)
      ) {
        this.pendingComments.push(this.tokens[this.pos]);
        this.pos++;
      }
    }

    drainComments() {
      const c = this.pendingComments.map((t) => t.lexeme);
      this.pendingComments = [];
      return c;
    }

    peek() {
      this.collectComments();
      return this.tokens[this.pos] || { type: CT.EOF, lexeme: "", line: 0, column: 0 };
    }

    // Raw peek/advance that don't skip comments (for lookahead)
    checkRaw(type) {
      return (
        this.pos < this.tokens.length && this.tokens[this.pos].type === type
      );
    }
    advanceRaw() {
      return this.tokens[this.pos++];
    }

    peekNextSkipComments() {
      let next = this.pos + 1;
      while (
        next < this.tokens.length &&
        (this.tokens[next].type === CT.LINE_COMMENT ||
          this.tokens[next].type === CT.BLOCK_COMMENT)
      ) {
        next++;
      }
      return next < this.tokens.length
        ? this.tokens[next]
        : { type: CT.EOF, lexeme: "", line: 0, column: 0 };
    }

    advance() {
      this.collectComments();
      return this.tokens[this.pos++];
    }
    check(type) {
      return this.peek().type === type;
    }
    checkAny(types) {
      return types.includes(this.peek().type);
    }
    isAtEnd() {
      return this.peek().type === CT.EOF;
    }
    expect(type, message) {
      if (this.check(type)) return this.advance();
      const p = this.peek();
      throw new CParseError(`${message}, encontrado '${p.lexeme}'`, p);
    }
  }

  // ─── Dotmon Code Generator ────────────────────────────
  // Takes the AST and emits .mon source code
  class DotmonGenerator {
    constructor() {
      this.output = [];
      this.indent = 0;
    }

    generate(ast) {
      if (!ast || !ast.body) return "// Falha na conversao\n";

      // Separate functions from main body
      const functions = ast.body.filter((s) => s.type === "FuncDecl");
      const mainStmts = ast.body.filter((s) => s.type !== "FuncDecl");

      this.emit("Start");
      this.emit("{");
      this.indent = 1;

      // Emit main body first
      for (const stmt of mainStmts) this.genStmt(stmt);

      // Emit functions inside Start/Finish
      if (functions.length > 0 && mainStmts.length > 0) {
        this.emit("");
      }
      for (const func of functions) this.genStmt(func);

      this.indent = 0;
      this.emit("}");
      this.emit("Finish");

      return this.output.join("\n") + "\n";
    }

    emit(line) {
      this.output.push("    ".repeat(this.indent) + line);
    }

    emitComments(stmt) {
      if (stmt.leadingComments) {
        for (const c of stmt.leadingComments) {
          this.emit(c);
        }
      }
    }

    genStmt(stmt) {
      if (!stmt) return;
      this.emitComments(stmt);

      switch (stmt.type) {
        case "CommentBlock":
          return; // already emitted by emitComments
        case "VarDecl":
          return this.genVarDecl(stmt);
        case "Assignment":
          return this.genAssignment(stmt);
        case "IfChain":
          return this.genIfChain(stmt);
        case "ShowStmt":
          return this.genShow(stmt);
        case "AskStmt":
          return this.genAsk(stmt);
        case "WhileLoop":
          return this.genWhileLoop(stmt);
        case "ForLoop":
          return this.genForLoop(stmt);
        case "FuncDecl":
          return this.genFuncDecl(stmt);
        case "ReturnStmt":
          return this.genReturn(stmt);
        case "BreakStmt":
          return this.emit("Jam;");
        case "SkipStmt":
          return this.emit("Skip;");
        case "ExprStmt":
          return this.genExprStmt(stmt);
      }
    }

    genVarDecl(stmt) {
      this.emit(
        `${stmt.varType} ${stmt.name} = ${this.genExpr(stmt.init)};`,
      );
    }

    genAssignment(stmt) {
      this.emit(`${stmt.name} = ${this.genExpr(stmt.value)};`);
    }

    genIfChain(stmt) {
      stmt.branches.forEach((branch, i) => {
        const kw = i === 0 ? "Evo" : "AltEvo";
        this.emit(`${kw} (${this.genExpr(branch.condition)}) {`);
        this.indent++;
        for (const s of branch.body) this.genStmt(s);
        this.indent--;
        this.emit("}");
      });
      if (stmt.elseBranch) {
        this.emit("FailEvo {");
        this.indent++;
        for (const s of stmt.elseBranch) this.genStmt(s);
        this.indent--;
        this.emit("}");
      }
    }

    genShow(stmt) {
      const args = stmt.args.map((a) => this.genExpr(a)).join(", ");
      this.emit(`Show(${args});`);
    }

    genAsk(stmt) {
      this.emit(`Ask(${stmt.name});`);
    }

    genWhileLoop(stmt) {
      this.emit(`Spiral (${this.genExpr(stmt.condition)}) {`);
      this.indent++;
      for (const s of stmt.body) this.genStmt(s);
      this.indent--;
      this.emit("}");
    }

    genForLoop(stmt) {
      const init = `${stmt.init.varType} ${stmt.init.name} = ${this.genExpr(stmt.init.init)}`;
      const cond = this.genExpr(stmt.condition);
      const step = `${stmt.step.name} = ${this.genExpr(stmt.step.value)}`;
      this.emit(`Loop (${init}; ${cond}; ${step}) {`);
      this.indent++;
      for (const s of stmt.body) this.genStmt(s);
      this.indent--;
      this.emit("}");
    }

    genFuncDecl(stmt) {
      const retPart =
        stmt.returnType === "void" ? "" : ` ${stmt.returnType}`;
      const params = stmt.params
        .map((p) => `${p.varType} ${p.name}`)
        .join(", ");
      this.emit(`Xros${retPart} ${stmt.name}(${params}) {`);
      this.indent++;
      for (const s of stmt.body) this.genStmt(s);
      this.indent--;
      this.emit("}");
    }

    genReturn(stmt) {
      if (stmt.value) {
        this.emit(`Send ${this.genExpr(stmt.value)};`);
      } else {
        this.emit("Send;");
      }
    }

    genExprStmt(stmt) {
      const expr = stmt.expression;
      if (expr && expr.type === "CallExpr") {
        const args = expr.args.map((a) => this.genExpr(a)).join(", ");
        this.emit(`Call ${expr.callee}(${args});`);
      } else {
        this.emit(`${this.genExpr(expr)};`);
      }
    }

    genExpr(expr) {
      if (!expr) return "?";
      switch (expr.type) {
        case "IntLiteral":
          return String(expr.value);
        case "FloatLiteral":
          return String(expr.value);
        case "StringLiteral":
          return `"${expr.value}"`;
        case "CharLiteral":
          return `'${expr.value}'`;
        case "BoolLiteral":
          return expr.value ? "true" : "false";
        case "Identifier":
          return expr.name;
        case "BinaryExpr":
          return `${this.genExpr(expr.left)} ${expr.op} ${this.genExpr(expr.right)}`;
        case "UnaryExpr":
          return `${expr.op}${this.genExpr(expr.operand)}`;
        case "CallExpr":
          return `${expr.callee}(${expr.args.map((a) => this.genExpr(a)).join(", ")})`;
      }
      return "?";
    }
  }

  // ─── Main Transpile Function ──────────────────────────
  function transpile(cSource, filename) {
    const result = {
      tokens: [],
      ast: null,
      dotmonCode: "",
      diagnostics: [],
      filename: filename || "unknown.c",
    };

    // 1. Lexer
    const lexer = new CLexer(cSource);
    result.tokens = lexer.tokenize();

    for (const t of result.tokens) {
      if (t.type === CT.INVALID) {
        result.diagnostics.push({
          severity: "warning",
          message: `Token C nao reconhecido: '${t.lexeme}'`,
          line: t.line,
          column: t.column,
          endColumn: t.column + t.lexeme.length,
        });
      }
    }

    // 2. Parser
    try {
      const parser = new CParser(result.tokens);
      result.ast = parser.parse();
    } catch (e) {
      result.diagnostics.push({
        severity: "error",
        message: e.message,
        line: e.line || 1,
        column: e.column || 1,
        endColumn: (e.column || 1) + 10,
      });
      result.dotmonCode = `// Erro ao fazer parse do C: ${e.message}\n`;
      return result;
    }

    // 3. Generate Dotmon code
    try {
      const generator = new DotmonGenerator();
      result.dotmonCode = generator.generate(result.ast);
    } catch (e) {
      result.diagnostics.push({
        severity: "error",
        message: `Erro na geracao de codigo Dotmon: ${e.message}`,
        line: 1,
        column: 1,
        endColumn: 10,
      });
      result.dotmonCode = `// Erro na geracao: ${e.message}\n`;
    }

    return result;
  }

  return {
    CT,
    C_KEYWORDS,
    CLexer,
    CParser,
    DotmonGenerator,
    transpile,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = CToDotmon;
}
