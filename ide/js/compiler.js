// ============================================================
// dotmon Compiler — Complete Pipeline
// Lexer → Parser → Semantic Analyzer → C Code Generator
// ============================================================

const DotmonCompiler = (() => {
  "use strict";

  // ─── Token Types ─────────────────────────────────────────
  const TT = {
    TYPE_BABY: "TYPE_BABY",
    TYPE_PUP: "TYPE_PUP",
    TYPE_ROOK: "TYPE_ROOK",
    TYPE_CHAMP: "TYPE_CHAMP",
    TYPE_MOJI: "TYPE_MOJI",
    TYPE_BIT: "TYPE_BIT",
    KW_EVO: "KW_EVO",
    KW_ALTEVO: "KW_ALTEVO",
    KW_FAILEVO: "KW_FAILEVO",
    KW_JAM: "KW_JAM",
    KW_SKIP: "KW_SKIP",
    KW_XROS: "KW_XROS",
    KW_SEND: "KW_SEND",
    KW_LOOP: "KW_LOOP",
    KW_SPIRAL: "KW_SPIRAL",
    KW_WORLD: "KW_WORLD",
    KW_CORE: "KW_CORE",
    KW_CALL: "KW_CALL",
    KW_SHOW: "KW_SHOW",
    KW_ASK: "KW_ASK",
    KW_START: "KW_START",
    KW_FINISH: "KW_FINISH",
    IDENTIFIER: "IDENTIFIER",
    INT_LITERAL: "INT_LITERAL",
    FLOAT_LITERAL: "FLOAT_LITERAL",
    BOOL_LITERAL: "BOOL_LITERAL",
    STRING_LITERAL: "STRING_LITERAL",
    CHAR_LITERAL: "CHAR_LITERAL",
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
    LPAREN: "LPAREN",
    RPAREN: "RPAREN",
    LBRACE: "LBRACE",
    RBRACE: "RBRACE",
    SEMICOLON: "SEMICOLON",
    COMMA: "COMMA",
    DOT: "DOT",
    EOF: "EOF",
    INVALID: "INVALID",
  };

  const KEYWORDS = {
    Baby: TT.TYPE_BABY,
    Pup: TT.TYPE_PUP,
    Rook: TT.TYPE_ROOK,
    Champ: TT.TYPE_CHAMP,
    Moji: TT.TYPE_MOJI,
    Bit: TT.TYPE_BIT,
    Evo: TT.KW_EVO,
    AltEvo: TT.KW_ALTEVO,
    FailEvo: TT.KW_FAILEVO,
    Jam: TT.KW_JAM,
    Skip: TT.KW_SKIP,
    Xros: TT.KW_XROS,
    Send: TT.KW_SEND,
    Loop: TT.KW_LOOP,
    Spiral: TT.KW_SPIRAL,
    World: TT.KW_WORLD,
    Core: TT.KW_CORE,
    Call: TT.KW_CALL,
    Show: TT.KW_SHOW,
    Ask: TT.KW_ASK,
    Start: TT.KW_START,
    Finish: TT.KW_FINISH,
    true: TT.BOOL_LITERAL,
    false: TT.BOOL_LITERAL,
  };

  const TYPE_TOKENS = new Set([
    TT.TYPE_BABY,
    TT.TYPE_PUP,
    TT.TYPE_ROOK,
    TT.TYPE_CHAMP,
    TT.TYPE_MOJI,
    TT.TYPE_BIT,
  ]);

  // ─── Lexer ───────────────────────────────────────────────
  class Lexer {
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
        type: TT.EOF,
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
        case "(":
          return this.addToken(TT.LPAREN);
        case ")":
          return this.addToken(TT.RPAREN);
        case "{":
          return this.addToken(TT.LBRACE);
        case "}":
          return this.addToken(TT.RBRACE);
        case ";":
          return this.addToken(TT.SEMICOLON);
        case ",":
          return this.addToken(TT.COMMA);
        case ".":
          return this.addToken(TT.DOT);
        case "+":
          return this.addToken(TT.OP_PLUS);
        case "-":
          return this.addToken(TT.OP_MINUS);
        case "*":
          return this.addToken(TT.OP_MUL);
        case "/":
          return this.addToken(TT.OP_DIV);
        case "=":
          return this.addToken(this.match("=") ? TT.OP_EQ : TT.OP_ASSIGN);
        case "!":
          return this.addToken(this.match("=") ? TT.OP_NE : TT.INVALID);
        case ">":
          return this.addToken(this.match("=") ? TT.OP_GE : TT.OP_GT);
        case "<":
          return this.addToken(this.match("=") ? TT.OP_LE : TT.OP_LT);
        default:
          return this.addToken(TT.INVALID);
      }
    }

    skipWhitespace() {
      while (!this.isAtEnd()) {
        const c = this.peek();
        if (c === " " || c === "\r" || c === "\t" || c === "\n") {
          this.advance();
          continue;
        }
        if (c === "/" && this.peekNext() === "/") {
          while (!this.isAtEnd() && this.peek() !== "\n") this.advance();
          continue;
        }
        if (c === "/" && this.peekNext() === "*") {
          this.advance();
          this.advance();
          while (!this.isAtEnd()) {
            if (this.peek() === "*" && this.peekNext() === "/") {
              this.advance();
              this.advance();
              break;
            }
            this.advance();
          }
          continue;
        }
        break;
      }
    }

    identifier() {
      while (!this.isAtEnd() && this.isAlphaNumeric(this.peek()))
        this.advance();
      const text = this.source.slice(this.start, this.current);
      this.addToken(KEYWORDS[text] || TT.IDENTIFIER);
    }

    number() {
      while (!this.isAtEnd() && this.isDigit(this.peek())) this.advance();
      if (this.peek() === "." && this.isDigit(this.peekNext())) {
        this.advance();
        while (!this.isAtEnd() && this.isDigit(this.peek())) this.advance();
        return this.addToken(TT.FLOAT_LITERAL);
      }
      this.addToken(TT.INT_LITERAL);
    }

    string() {
      while (!this.isAtEnd() && this.peek() !== '"') {
        if (this.peek() === "\\") this.advance();
        this.advance();
      }
      if (this.isAtEnd()) return this.addToken(TT.INVALID);
      this.advance();
      this.addToken(TT.STRING_LITERAL);
    }

    charLiteral() {
      if (!this.isAtEnd() && this.peek() !== "'") {
        if (this.peek() === "\\") this.advance();
        this.advance();
        if (this.match("'")) return this.addToken(TT.CHAR_LITERAL);
      }
      this.addToken(TT.INVALID);
    }

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

  // ─── Parser ──────────────────────────────────────────────
  class ParseError extends Error {
    constructor(message, token) {
      super(message);
      this.line = token ? token.line : 1;
      this.column = token ? token.column : 1;
    }
  }

  class Parser {
    constructor(tokens) {
      this.tokens = tokens;
      this.pos = 0;
    }

    parse() {
      return this.program();
    }

    program() {
      this.expect(TT.KW_START, "Esperado 'Start' no inicio do programa");
      const body = this.block();
      this.expect(TT.KW_FINISH, "Esperado 'Finish' no final do programa");
      return { type: "Program", body };
    }

    block() {
      this.expect(TT.LBRACE, "Esperado '{'");
      const stmts = [];
      while (!this.check(TT.RBRACE) && !this.isAtEnd()) {
        stmts.push(this.statement());
      }
      this.expect(TT.RBRACE, "Esperado '}'");
      return stmts;
    }

    statement() {
      const tok = this.peek();
      if (TYPE_TOKENS.has(tok.type)) return this.varDecl();
      if (tok.type === TT.KW_EVO) return this.ifChain();
      if (tok.type === TT.KW_SHOW) return this.showStmt();
      if (tok.type === TT.KW_ASK) return this.askStmt();
      if (tok.type === TT.KW_LOOP) return this.forLoop();
      if (tok.type === TT.KW_SPIRAL) return this.whileLoop();
      if (tok.type === TT.KW_XROS) return this.funcDecl();
      if (tok.type === TT.KW_SEND) return this.returnStmt();
      if (tok.type === TT.KW_JAM) return this.breakStmt();
      if (tok.type === TT.KW_SKIP) return this.skipStmt();
      if (tok.type === TT.KW_WORLD) return this.worldStmt();
      if (tok.type === TT.KW_CALL) return this.callDecl();
      if (tok.type === TT.IDENTIFIER && this.peekNext().type === TT.OP_ASSIGN) {
        return this.assignment();
      }
      return this.exprStmt();
    }

    varDecl() {
      const typeTok = this.advance();
      const varType = typeTok.lexeme;
      const nameTok = this.expect(TT.IDENTIFIER, "Esperado nome da variavel");
      this.expect(TT.OP_ASSIGN, "Esperado '='");
      const init = this.expression();
      this.expect(TT.SEMICOLON, "Esperado ';'");
      return {
        type: "VarDecl",
        varType,
        name: nameTok.lexeme,
        init,
        line: typeTok.line,
        column: typeTok.column,
      };
    }

    assignment() {
      const nameTok = this.advance();
      this.expect(TT.OP_ASSIGN, "Esperado '='");
      const value = this.expression();
      this.expect(TT.SEMICOLON, "Esperado ';'");
      return {
        type: "Assignment",
        name: nameTok.lexeme,
        value,
        line: nameTok.line,
        column: nameTok.column,
      };
    }

    ifChain() {
      const branches = [];
      let elseBranch = null;
      const evoTok = this.expect(TT.KW_EVO, "Esperado 'Evo'");
      this.expect(TT.LPAREN, "Esperado '(' apos 'Evo'");
      const condition = this.expression();
      this.expect(TT.RPAREN, "Esperado ')'");
      const body = this.block();
      branches.push({ condition, body });

      while (this.check(TT.KW_ALTEVO)) {
        this.advance();
        this.expect(TT.LPAREN, "Esperado '(' apos 'AltEvo'");
        const altCond = this.expression();
        this.expect(TT.RPAREN, "Esperado ')'");
        const altBody = this.block();
        branches.push({ condition: altCond, body: altBody });
      }

      if (this.check(TT.KW_FAILEVO)) {
        this.advance();
        elseBranch = this.block();
      }

      return {
        type: "IfChain",
        branches,
        elseBranch,
        line: evoTok.line,
        column: evoTok.column,
      };
    }

    showStmt() {
      const tok = this.advance();
      this.expect(TT.LPAREN, "Esperado '(' apos 'Show'");
      const args = [this.expression()];
      while (this.check(TT.COMMA)) {
        this.advance();
        args.push(this.expression());
      }
      this.expect(TT.RPAREN, "Esperado ')'");
      this.expect(TT.SEMICOLON, "Esperado ';'");
      return { type: "ShowStmt", args, line: tok.line, column: tok.column };
    }

    askStmt() {
      const tok = this.advance();
      this.expect(TT.LPAREN, "Esperado '(' apos 'Ask'");
      const nameTok = this.expect(TT.IDENTIFIER, "Esperado identificador");
      this.expect(TT.RPAREN, "Esperado ')'");
      this.expect(TT.SEMICOLON, "Esperado ';'");
      return {
        type: "AskStmt",
        name: nameTok.lexeme,
        line: tok.line,
        column: tok.column,
      };
    }

    whileLoop() {
      const tok = this.advance();
      this.expect(TT.LPAREN, "Esperado '(' apos 'Spiral'");
      const condition = this.expression();
      this.expect(TT.RPAREN, "Esperado ')'");
      const body = this.block();
      return {
        type: "WhileLoop",
        condition,
        body,
        line: tok.line,
        column: tok.column,
      };
    }

    forLoop() {
      const tok = this.advance();
      this.expect(TT.LPAREN, "Esperado '(' apos 'Loop'");

      // Detect if this is a full for-loop (has type token as init) or a while-style loop
      if (TYPE_TOKENS.has(this.peek().type)) {
        // Full for-loop: Loop (Baby x = 0; x < 10; x = x + 1) { ... }
        const init = this.varDecl();
        const condition = this.expression();
        this.expect(TT.SEMICOLON, "Esperado ';'");
        const stepName = this.expect(TT.IDENTIFIER, "Esperado identificador");
        this.expect(TT.OP_ASSIGN, "Esperado '='");
        const stepValue = this.expression();
        const step = {
          type: "Assignment",
          name: stepName.lexeme,
          value: stepValue,
        };
        this.expect(TT.RPAREN, "Esperado ')'");
        const body = this.block();
        return {
          type: "ForLoop",
          init,
          condition,
          step,
          body,
          line: tok.line,
          column: tok.column,
        };
      } else {
        // While-style loop: Loop (condition) { ... }
        const condition = this.expression();
        this.expect(TT.RPAREN, "Esperado ')'");
        const body = this.block();
        return {
          type: "WhileLoop",
          condition,
          body,
          line: tok.line,
          column: tok.column,
        };
      }
    }

    funcDecl() {
      const tok = this.advance();
      let retType = "void";
      // If next token is a type keyword, it's the return type
      if (TYPE_TOKENS.has(this.peek().type)) {
        const retTypeTok = this.advance();
        retType = retTypeTok.lexeme;
      }
      const nameTok = this.expect(TT.IDENTIFIER, "Esperado nome da funcao");
      this.expect(TT.LPAREN, "Esperado '('");
      const params = [];
      if (!this.check(TT.RPAREN)) {
        do {
          // Parameters can be typed (Baby x) or untyped (x)
          if (TYPE_TOKENS.has(this.peek().type)) {
            const pType = this.advance().lexeme;
            const pName = this.expect(
              TT.IDENTIFIER,
              "Esperado nome do parametro",
            ).lexeme;
            params.push({ varType: pType, name: pName });
          } else {
            const pName = this.expect(
              TT.IDENTIFIER,
              "Esperado nome do parametro",
            ).lexeme;
            params.push({ varType: "Baby", name: pName });
          }
        } while (this.check(TT.COMMA) && this.advance());
      }
      this.expect(TT.RPAREN, "Esperado ')'");
      const body = this.block();
      return {
        type: "FuncDecl",
        returnType: retType,
        name: nameTok.lexeme,
        params,
        body,
        line: tok.line,
        column: tok.column,
      };
    }

    returnStmt() {
      const tok = this.advance();
      let value = null;
      if (!this.check(TT.SEMICOLON)) value = this.expression();
      this.expect(TT.SEMICOLON, "Esperado ';'");
      return { type: "ReturnStmt", value, line: tok.line, column: tok.column };
    }

    breakStmt() {
      const tok = this.advance();
      this.expect(TT.SEMICOLON, "Esperado ';'");
      return { type: "BreakStmt", line: tok.line, column: tok.column };
    }

    skipStmt() {
      const tok = this.advance();
      this.expect(TT.SEMICOLON, "Esperado ';'");
      return { type: "SkipStmt", line: tok.line, column: tok.column };
    }

    worldStmt() {
      const tok = this.advance();
      const nameTok = this.expect(TT.IDENTIFIER, "Esperado nome do modulo");
      this.expect(TT.SEMICOLON, "Esperado ';'");
      return {
        type: "ExprStmt",
        expression: {
          type: "Identifier",
          name: nameTok.lexeme,
          line: tok.line,
          column: tok.column,
        },
        line: tok.line,
        column: tok.column,
      };
    }

    callDecl() {
      const tok = this.advance();
      const nameTok = this.expect(TT.IDENTIFIER, "Esperado nome da funcao");
      this.expect(TT.LPAREN, "Esperado '('");
      const args = [];
      if (!this.check(TT.RPAREN)) {
        args.push(this.expression());
        while (this.check(TT.COMMA)) {
          this.advance();
          args.push(this.expression());
        }
      }
      this.expect(TT.RPAREN, "Esperado ')'");
      this.expect(TT.SEMICOLON, "Esperado ';'");
      return {
        type: "ExprStmt",
        expression: {
          type: "CallExpr",
          callee: nameTok.lexeme,
          args,
          line: tok.line,
          column: tok.column,
        },
        line: tok.line,
        column: tok.column,
      };
    }

    exprStmt() {
      const expr = this.expression();
      this.expect(TT.SEMICOLON, "Esperado ';'");
      return {
        type: "ExprStmt",
        expression: expr,
        line: expr.line,
        column: expr.column,
      };
    }

    // ─── Expression Parsing ────────────────────────────────
    expression() {
      return this.comparison();
    }

    comparison() {
      let left = this.addition();
      while (
        this.checkAny([
          TT.OP_EQ,
          TT.OP_NE,
          TT.OP_GT,
          TT.OP_LT,
          TT.OP_GE,
          TT.OP_LE,
        ])
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
      while (this.checkAny([TT.OP_PLUS, TT.OP_MINUS])) {
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
      while (this.checkAny([TT.OP_MUL, TT.OP_DIV])) {
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
      if (this.check(TT.OP_MINUS)) {
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
      return this.primary();
    }

    primary() {
      const tok = this.peek();
      if (tok.type === TT.INT_LITERAL) {
        this.advance();
        return {
          type: "IntLiteral",
          value: parseInt(tok.lexeme, 10),
          line: tok.line,
          column: tok.column,
        };
      }
      if (tok.type === TT.FLOAT_LITERAL) {
        this.advance();
        return {
          type: "FloatLiteral",
          value: parseFloat(tok.lexeme),
          line: tok.line,
          column: tok.column,
        };
      }
      if (tok.type === TT.STRING_LITERAL) {
        this.advance();
        return {
          type: "StringLiteral",
          value: tok.lexeme.slice(1, -1),
          line: tok.line,
          column: tok.column,
        };
      }
      if (tok.type === TT.CHAR_LITERAL) {
        this.advance();
        return {
          type: "CharLiteral",
          value: tok.lexeme.slice(1, -1),
          line: tok.line,
          column: tok.column,
        };
      }
      if (tok.type === TT.BOOL_LITERAL) {
        this.advance();
        return {
          type: "BoolLiteral",
          value: tok.lexeme === "true",
          line: tok.line,
          column: tok.column,
        };
      }
      if (tok.type === TT.IDENTIFIER) {
        this.advance();
        if (this.check(TT.LPAREN)) {
          this.advance();
          const args = [];
          if (!this.check(TT.RPAREN)) {
            args.push(this.expression());
            while (this.check(TT.COMMA)) {
              this.advance();
              args.push(this.expression());
            }
          }
          this.expect(TT.RPAREN, "Esperado ')'");
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
      if (tok.type === TT.LPAREN) {
        this.advance();
        const expr = this.expression();
        this.expect(TT.RPAREN, "Esperado ')'");
        return expr;
      }
      throw new ParseError(`Token inesperado: '${tok.lexeme}'`, tok);
    }

    // ─── Parser Helpers ────────────────────────────────────
    peek() {
      return this.tokens[this.pos];
    }
    peekNext() {
      return this.pos + 1 < this.tokens.length
        ? this.tokens[this.pos + 1]
        : this.tokens[this.pos];
    }
    advance() {
      return this.tokens[this.pos++];
    }
    check(type) {
      return this.peek().type === type;
    }
    checkAny(types) {
      return types.includes(this.peek().type);
    }
    isAtEnd() {
      return this.peek().type === TT.EOF;
    }
    expect(type, message) {
      if (this.check(type)) return this.advance();
      throw new ParseError(
        `${message}, encontrado '${this.peek().lexeme}'`,
        this.peek(),
      );
    }
  }

  // ─── Semantic Analyzer ───────────────────────────────────
  class Analyzer {
    constructor() {
      this.scopes = [{}];
      this.declarations = {};
      this.diagnostics = [];
      this.usedVars = new Set();
    }

    get currentScope() {
      return this.scopes[this.scopes.length - 1];
    }
    get symbolTable() {
      const table = {};
      for (const scope of this.scopes) Object.assign(table, scope);
      return table;
    }

    pushScope() {
      this.scopes.push({});
    }
    popScope() {
      return this.scopes.pop();
    }

    declare(name, type, line, col) {
      if (this.currentScope[name]) {
        this.addDiag(
          "error",
          `Variavel '${name}' ja declarada neste escopo`,
          line,
          col,
          col + name.length,
        );
      }
      this.currentScope[name] = type;
      const scopeKey = `${name}@${this.scopes.length - 1}`;
      this.declarations[scopeKey] = { type, line, column: col, name };
    }

    lookup(name) {
      for (let i = this.scopes.length - 1; i >= 0; i--) {
        if (this.scopes[i][name]) return this.scopes[i][name];
      }
      return null;
    }

    addDiag(severity, message, line, col, endCol) {
      this.diagnostics.push({
        severity,
        message,
        line: line || 1,
        column: col || 1,
        endColumn: endCol || (col || 1) + 1,
      });
    }

    analyze(ast) {
      if (!ast) return this.diagnostics;
      this.visitStatements(ast.body);
      for (const [scopeKey, info] of Object.entries(this.declarations)) {
        const varName = info.name || scopeKey;
        if (!this.usedVars.has(varName) && !info.type.startsWith("func:")) {
          this.addDiag(
            "warning",
            `Variavel '${varName}' declarada mas nunca utilizada`,
            info.line,
            info.column,
            info.column + varName.length,
          );
        }
      }
      return this.diagnostics;
    }

    visitStatements(stmts) {
      for (const s of stmts) this.visitStmt(s);
    }

    visitStmt(stmt) {
      switch (stmt.type) {
        case "VarDecl":
          return this.visitVarDecl(stmt);
        case "Assignment":
          return this.visitAssignment(stmt);
        case "IfChain":
          return this.visitIfChain(stmt);
        case "ShowStmt":
          return this.visitShow(stmt);
        case "AskStmt":
          return this.visitAsk(stmt);
        case "WhileLoop":
          return this.visitWhileLoop(stmt);
        case "ForLoop":
          return this.visitForLoop(stmt);
        case "FuncDecl":
          return this.visitFuncDecl(stmt);
        case "ReturnStmt":
          return this.visitReturn(stmt);
        case "ExprStmt":
          return this.visitExpr(stmt.expression);
        case "BreakStmt":
        case "SkipStmt":
          break;
      }
    }

    visitVarDecl(stmt) {
      const initType = this.visitExpr(stmt.init);
      const declType = this.dotmonToInternal(stmt.varType);
      const warnNarrow = () => {
        this.addDiag(
          "warning",
          `Conversao implicita de '${initType}' para '${stmt.varType}' pode perder dados`,
          stmt.line,
          stmt.column,
          stmt.column + stmt.varType.length,
        );
      };
      if (
        initType &&
        declType &&
        !this.compatible(declType, initType, warnNarrow)
      ) {
        this.addDiag(
          "error",
          `Incompatibilidade de tipos: nao e possivel atribuir '${initType}' a '${stmt.varType}'`,
          stmt.line,
          stmt.column,
          stmt.column + stmt.varType.length,
        );
      }
      this.declare(
        stmt.name,
        stmt.varType,
        stmt.line,
        stmt.column + stmt.varType.length + 1,
      );
    }

    visitAssignment(stmt) {
      const varType = this.lookup(stmt.name);
      if (!varType) {
        this.addDiag(
          "error",
          `Identificador nao declarado: '${stmt.name}'`,
          stmt.line,
          stmt.column,
          stmt.column + stmt.name.length,
        );
        this.visitExpr(stmt.value);
        return;
      }
      this.usedVars.add(stmt.name);
      const valType = this.visitExpr(stmt.value);
      const expected = this.dotmonToInternal(varType);
      const warnNarrow = () => {
        this.addDiag(
          "warning",
          `Conversao implicita de '${valType}' para '${varType}' pode perder dados`,
          stmt.line,
          stmt.column,
          stmt.column + stmt.name.length,
        );
      };
      if (
        valType &&
        expected &&
        !this.compatible(expected, valType, warnNarrow)
      ) {
        this.addDiag(
          "error",
          `Incompatibilidade de tipos: nao e possivel atribuir '${valType}' a '${varType}'`,
          stmt.line,
          stmt.column,
          stmt.column + stmt.name.length,
        );
      }
    }

    visitIfChain(stmt) {
      for (const branch of stmt.branches) {
        this.visitExpr(branch.condition);
        this.pushScope();
        this.visitStatements(branch.body);
        this.popScope();
      }
      if (stmt.elseBranch) {
        this.pushScope();
        this.visitStatements(stmt.elseBranch);
        this.popScope();
      }
    }

    visitShow(stmt) {
      for (const arg of stmt.args) this.visitExpr(arg);
    }

    visitAsk(stmt) {
      const type = this.lookup(stmt.name);
      if (!type)
        this.addDiag(
          "error",
          `Identificador nao declarado: '${stmt.name}'`,
          stmt.line,
          stmt.column,
          stmt.column + stmt.name.length,
        );
      this.usedVars.add(stmt.name);
    }

    visitWhileLoop(stmt) {
      this.visitExpr(stmt.condition);
      this.pushScope();
      this.visitStatements(stmt.body);
      this.popScope();
    }

    visitForLoop(stmt) {
      this.pushScope();
      this.visitVarDecl(stmt.init);
      this.visitExpr(stmt.condition);
      if (stmt.step) this.visitStmt(stmt.step);
      this.visitStatements(stmt.body);
      this.popScope();
    }

    visitFuncDecl(stmt) {
      this.declare(
        stmt.name,
        `func:${stmt.returnType}`,
        stmt.line,
        stmt.column,
      );
      this.pushScope();
      for (const p of stmt.params)
        this.declare(p.name, p.varType, stmt.line, stmt.column);
      this.visitStatements(stmt.body);
      this.popScope();
    }

    visitReturn(stmt) {
      if (stmt.value) this.visitExpr(stmt.value);
    }

    visitExpr(expr) {
      if (!expr) return null;
      switch (expr.type) {
        case "IntLiteral":
          return "int";
        case "FloatLiteral":
          return "float";
        case "StringLiteral":
          return "string";
        case "CharLiteral":
          return "char";
        case "BoolLiteral":
          return "bool";
        case "Identifier": {
          const t = this.lookup(expr.name);
          if (!t) {
            this.addDiag(
              "error",
              `Identificador nao declarado: '${expr.name}'`,
              expr.line,
              expr.column,
              expr.column + expr.name.length,
            );
            return null;
          }
          this.usedVars.add(expr.name);
          return this.dotmonToInternal(t);
        }
        case "BinaryExpr": {
          const lt = this.visitExpr(expr.left);
          const rt = this.visitExpr(expr.right);
          if (["==", "!=", ">", "<", ">=", "<="].includes(expr.op))
            return "bool";
          if (lt === "string" || rt === "string") {
            this.addDiag(
              "error",
              `Operacao '${expr.op}' nao suportada para strings`,
              expr.line,
              expr.column,
              expr.column + 1,
            );
            return null;
          }
          if (lt === "float" || rt === "float") return "float";
          return "int";
        }
        case "UnaryExpr":
          return this.visitExpr(expr.operand);
        case "CallExpr": {
          for (const a of expr.args) this.visitExpr(a);
          const funcType = this.lookup(expr.callee);
          if (!funcType) {
            this.addDiag(
              "error",
              `Funcao nao declarada: '${expr.callee}'`,
              expr.line,
              expr.column,
              expr.column + expr.callee.length,
            );
            return null;
          }
          if (funcType.startsWith("func:"))
            return this.dotmonToInternal(funcType.split(":")[1]);
          return null;
        }
      }
      return null;
    }

    dotmonToInternal(t) {
      if (["Baby", "Rook"].includes(t)) return "int";
      if (t === "Pup") return "float";
      if (t === "Champ") return "int";
      if (t === "Moji") return "string";
      if (t === "Bit") return "bool";
      return t;
    }

    compatible(expected, actual, warnNarrow) {
      if (expected === actual) return true;
      if (expected === "int" && actual === "float") {
        if (warnNarrow) warnNarrow();
        return true;
      }
      if (expected === "float" && actual === "int") return true;
      if (expected === "char" && actual === "int") return true;
      if (expected === "int" && actual === "char") return true;
      return false;
    }
  }

  // ─── C Code Generator ───────────────────────────────────
  class CodeGenerator {
    constructor(symbolTable) {
      this.symbols = symbolTable || {};
      this.indent = 0;
      this.output = [];
      this.needsStdbool = false;
      this.needsString = false;
    }

    generate(ast) {
      if (!ast) return "// Compilation failed\n";
      this.scanIncludes(ast.body);

      this.output.push("/* Generated by dotmon compiler v0.1.0 */");
      this.output.push("");
      this.output.push("#include <stdio.h>");
      if (this.needsString) this.output.push("#include <string.h>");
      if (this.needsStdbool) this.output.push("#include <stdbool.h>");
      this.output.push("");

      // Emit function declarations before main
      const funcDecls = ast.body.filter((s) => s.type === "FuncDecl");
      const mainStmts = ast.body.filter((s) => s.type !== "FuncDecl");

      for (const func of funcDecls) this.genFuncDecl(func);

      this.output.push("int main(void) {");
      this.indent = 1;

      for (const stmt of mainStmts) this.genStmt(stmt);

      this.output.push("");
      this.emit("return 0;");
      this.indent = 0;
      this.output.push("}");
      this.output.push("");
      return this.output.join("\n");
    }

    scanIncludes(stmts) {
      for (const s of stmts) {
        if (s.type === "VarDecl") {
          if (s.varType === "Bit") this.needsStdbool = true;
          if (s.varType === "Moji") this.needsString = true;
        }
        if (s.type === "Assignment" && this.symbols[s.name] === "Moji")
          this.needsString = true;
        if (s.type === "IfChain") {
          for (const b of s.branches) this.scanIncludes(b.body);
          if (s.elseBranch) this.scanIncludes(s.elseBranch);
        }
        if (s.type === "WhileLoop") this.scanIncludes(s.body);
        if (s.type === "ForLoop") this.scanIncludes(s.body);
        if (s.type === "FuncDecl") this.scanIncludes(s.body);
      }
    }

    emit(line) {
      this.output.push("    ".repeat(this.indent) + line);
    }

    genStmt(stmt) {
      switch (stmt.type) {
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
          return this.emit("break;");
        case "SkipStmt":
          return this.emit("continue;");
        case "ExprStmt":
          return this.emit(this.genExpr(stmt.expression) + ";");
      }
    }

    genVarDecl(stmt) {
      const cType = this.mapType(stmt.varType);
      if (stmt.varType === "Moji") {
        this.emit(`char ${stmt.name}[256] = ${this.genExpr(stmt.init)};`);
      } else {
        this.emit(`${cType} ${stmt.name} = ${this.genExpr(stmt.init)};`);
      }
    }

    genAssignment(stmt) {
      if (this.symbols[stmt.name] === "Moji") {
        this.emit(`strcpy(${stmt.name}, ${this.genExpr(stmt.value)});`);
      } else {
        this.emit(`${stmt.name} = ${this.genExpr(stmt.value)};`);
      }
    }

    genIfChain(stmt) {
      stmt.branches.forEach((branch, i) => {
        const kw = i === 0 ? "if" : "else if";
        this.emit(`${kw} (${this.genExpr(branch.condition)}) {`);
        this.indent++;
        for (const s of branch.body) this.genStmt(s);
        this.indent--;
        this.emit("}");
      });
      if (stmt.elseBranch) {
        this.emit("else {");
        this.indent++;
        for (const s of stmt.elseBranch) this.genStmt(s);
        this.indent--;
        this.emit("}");
      }
    }

    genShow(stmt) {
      for (const arg of stmt.args) {
        if (arg.type === "StringLiteral") {
          this.emit(`printf("${this.escC(arg.value)}\\n");`);
        } else {
          const fmt = this.printfFmt(arg);
          this.emit(`printf("${fmt}\\n", ${this.genExpr(arg)});`);
        }
      }
    }

    genAsk(stmt) {
      const varType = this.symbols[stmt.name];
      if (varType === "Moji") {
        this.emit(`scanf("%255s", ${stmt.name});`);
      } else if (varType === "Pup") {
        this.emit(`scanf("%f", &${stmt.name});`);
      } else if (varType === "Rook") {
        this.emit(`scanf("%ld", &${stmt.name});`);
      } else if (varType === "Bit") {
        this.emit(`scanf("%d", &${stmt.name});`);
      } else {
        this.emit(`scanf("%d", &${stmt.name});`);
      }
    }

    genWhileLoop(stmt) {
      this.emit(`while (${this.genExpr(stmt.condition)}) {`);
      this.indent++;
      for (const s of stmt.body) this.genStmt(s);
      this.indent--;
      this.emit("}");
    }

    genForLoop(stmt) {
      const init = `${this.mapType(stmt.init.varType)} ${stmt.init.name} = ${this.genExpr(stmt.init.init)}`;
      const cond = this.genExpr(stmt.condition);
      const step = `${stmt.step.name} = ${this.genExpr(stmt.step.value)}`;
      this.emit(`for (${init}; ${cond}; ${step}) {`);
      this.indent++;
      for (const s of stmt.body) this.genStmt(s);
      this.indent--;
      this.emit("}");
    }

    genFuncDecl(stmt) {
      const retType = this.mapType(stmt.returnType);
      const params = stmt.params
        .map((p) => {
          if (p.varType === "Moji") return `char ${p.name}[]`;
          return `${this.mapType(p.varType)} ${p.name}`;
        })
        .join(", ");
      this.emit(`${retType} ${stmt.name}(${params || "void"}) {`);
      this.indent++;
      for (const s of stmt.body) this.genStmt(s);
      this.indent--;
      this.emit("}");
      this.output.push("");
    }

    genReturn(stmt) {
      this.emit(stmt.value ? `return ${this.genExpr(stmt.value)};` : "return;");
    }

    genExpr(expr) {
      switch (expr.type) {
        case "IntLiteral":
          return String(expr.value);
        case "FloatLiteral":
          return String(expr.value);
        case "StringLiteral":
          return `"${this.escC(expr.value)}"`;
        case "CharLiteral":
          return `'${expr.value}'`;
        case "BoolLiteral":
          return expr.value ? "true" : "false";
        case "Identifier":
          return expr.name;
        case "BinaryExpr":
          return `${this.genExpr(expr.left)} ${expr.op} ${this.genExpr(expr.right)}`;
        case "UnaryExpr":
          return `-${this.genExpr(expr.operand)}`;
        case "CallExpr":
          return `${expr.callee}(${expr.args.map((a) => this.genExpr(a)).join(", ")})`;
      }
      return "/* unknown */";
    }

    mapType(t) {
      return (
        {
          Baby: "int",
          Pup: "float",
          Rook: "long",
          Champ: "int",
          Moji: "char",
          Bit: "bool",
          void: "void",
        }[t] || "int"
      );
    }

    printfFmt(expr) {
      if (expr.type === "StringLiteral") return "%s";
      if (expr.type === "IntLiteral") return "%d";
      if (expr.type === "FloatLiteral") return "%f";
      if (expr.type === "BoolLiteral") return "%d";
      if (expr.type === "CharLiteral") return "%c";
      if (expr.type === "Identifier") {
        const t = this.symbols[expr.name];
        if (t === "Moji") return "%s";
        if (t === "Pup") return "%f";
        if (t === "Rook") return "%ld";
        if (t === "Champ") return "%d";
        if (t === "Bit") return "%d";
        return "%d";
      }
      return "%d";
    }

    escC(s) {
      let result = "";
      for (let i = 0; i < s.length; i++) {
        if (s[i] === "\\" && i + 1 < s.length) {
          const next = s[i + 1];
          if ("ntr0\\\"'".includes(next)) {
            result += "\\" + next;
            i++;
            continue;
          }
        }
        if (s[i] === '"') {
          result += '\\"';
        } else if (s[i] === "%") {
          result += "%%";
        } else {
          result += s[i];
        }
      }
      return result;
    }
  }

  // ─── AST to String ──────────────────────────────────────
  function exprStr(e) {
    if (!e) return "?";
    switch (e.type) {
      case "IntLiteral":
        return `Int(${e.value})`;
      case "FloatLiteral":
        return `Float(${e.value})`;
      case "StringLiteral":
        return `String("${e.value}")`;
      case "CharLiteral":
        return `Char('${e.value}')`;
      case "BoolLiteral":
        return `Bool(${e.value})`;
      case "Identifier":
        return `Ident(${e.name})`;
      case "BinaryExpr":
        return `BinExpr(${e.op}, ${exprStr(e.left)}, ${exprStr(e.right)})`;
      case "UnaryExpr":
        return `Unary(-, ${exprStr(e.operand)})`;
      case "CallExpr":
        return `Call(${e.callee}, [${e.args.map(exprStr).join(", ")}])`;
    }
    return "?";
  }

  function astToString(node, prefix, isLast) {
    if (!node) return "";
    prefix = prefix || "";
    if (isLast === undefined) isLast = true;
    const conn = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
    const childPfx = prefix + (isLast ? "    " : "\u2502   ");
    let r = "";

    if (node.type === "Program") {
      r += "Program\n";
      node.body.forEach((s, i) => {
        r += astToString(s, "", i === node.body.length - 1);
      });
      return r;
    }

    r += prefix + conn;
    switch (node.type) {
      case "VarDecl":
        r += `VarDecl [${node.varType}] ${node.name}\n`;
        r += childPfx + "\u2514\u2500\u2500 init: " + exprStr(node.init) + "\n";
        break;
      case "Assignment":
        r += `Assignment ${node.name}\n`;
        r +=
          childPfx + "\u2514\u2500\u2500 value: " + exprStr(node.value) + "\n";
        break;
      case "IfChain":
        r += "IfChain\n";
        node.branches.forEach((b, i) => {
          const last = !node.elseBranch && i === node.branches.length - 1;
          const c2 = last ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
          const p2 = childPfx + (last ? "    " : "\u2502   ");
          r += childPfx + c2 + (i === 0 ? "Evo" : "AltEvo") + "\n";
          r += p2 + "\u251C\u2500\u2500 cond: " + exprStr(b.condition) + "\n";
          b.body.forEach((s, j) => {
            r += astToString(s, p2, j === b.body.length - 1);
          });
        });
        if (node.elseBranch) {
          r += childPfx + "\u2514\u2500\u2500 FailEvo\n";
          const ep = childPfx + "    ";
          node.elseBranch.forEach((s, i) => {
            r += astToString(s, ep, i === node.elseBranch.length - 1);
          });
        }
        break;
      case "ShowStmt":
        r += "Show\n";
        node.args.forEach((a, i) => {
          const c2 =
            i === node.args.length - 1
              ? "\u2514\u2500\u2500 "
              : "\u251C\u2500\u2500 ";
          r += childPfx + c2 + exprStr(a) + "\n";
        });
        break;
      case "AskStmt":
        r += `Ask(${node.name})\n`;
        break;
      case "WhileLoop":
        r += "Spiral\n";
        r +=
          childPfx +
          "\u251C\u2500\u2500 cond: " +
          exprStr(node.condition) +
          "\n";
        node.body.forEach((s, i) => {
          r += astToString(s, childPfx, i === node.body.length - 1);
        });
        break;
      case "ForLoop":
        r += "Loop\n";
        r += astToString(node.init, childPfx, false);
        r +=
          childPfx +
          "\u251C\u2500\u2500 cond: " +
          exprStr(node.condition) +
          "\n";
        r += astToString(node.step, childPfx, false);
        node.body.forEach((s, i) => {
          r += astToString(s, childPfx, i === node.body.length - 1);
        });
        break;
      case "ReturnStmt":
        r += "Send" + (node.value ? " " + exprStr(node.value) : "") + "\n";
        break;
      case "BreakStmt":
        r += "Jam\n";
        break;
      case "SkipStmt":
        r += "Skip\n";
        break;
      case "ExprStmt":
        r += exprStr(node.expression) + "\n";
        break;
      default:
        r += node.type + "\n";
    }
    return r;
  }

  // ─── Main Compile Function ──────────────────────────────
  function compile(source, filename) {
    const result = {
      tokens: [],
      ast: null,
      cCode: "",
      diagnostics: [],
      astString: "",
      filename: filename || "unknown.mon",
    };

    const lexer = new Lexer(source);
    result.tokens = lexer.tokenize();

    for (const t of result.tokens) {
      if (t.type === TT.INVALID) {
        result.diagnostics.push({
          severity: "error",
          message: `Token invalido: '${t.lexeme}'`,
          line: t.line,
          column: t.column,
          endColumn: t.column + t.lexeme.length,
        });
      }
    }

    try {
      const parser = new Parser(result.tokens);
      result.ast = parser.parse();
    } catch (e) {
      result.diagnostics.push({
        severity: "error",
        message: e.message,
        line: e.line || 1,
        column: e.column || 1,
        endColumn: (e.column || 1) + 10,
      });
      result.astString = `Parse Error: ${e.message}`;
      return result;
    }

    const analyzer = new Analyzer();
    result.diagnostics.push(...analyzer.analyze(result.ast));

    const codegen = new CodeGenerator(analyzer.symbolTable);
    result.cCode = codegen.generate(result.ast);

    result.astString = astToString(result.ast);
    return result;
  }

  function tokenize(source) {
    return new Lexer(source).tokenize();
  }

  return {
    TT,
    KEYWORDS,
    TYPE_TOKENS,
    compile,
    tokenize,
    Lexer,
    Parser,
    Analyzer,
    CodeGenerator,
    astToString,
  };
})();
