# Storyboard Completo — Frontend da dotmon IDE

> Documento de referência visual e funcional do frontend da **dotmon IDE**, IDE web temática para a linguagem dotmon (compila para C, alvo Arduino/Tamagotchi). Formato: storyboard navegável, frame a frame, com wireframes ASCII e anotações de microinteração.

---

## 1. Sumário Executivo

A **dotmon IDE** é uma IDE web inspirada na estética de uma janela macOS premium em modo escuro (traffic lights, tipografia Inter para UI e JetBrains Mono para código, paleta derivada do tema dark do VS Code). Ela oferece o ciclo completo de desenvolvimento para a linguagem dotmon: edição com syntax highlighting customizado, autocomplete contextual, snippets temáticos, diagnóstico em tempo real com *Error Lens*, compilação para C diretamente no browser, transpilação reversa C → dotmon, terminal interativo via WebSocket e persistência híbrida (REST quando o backend FastAPI está online, `localStorage` como fallback offline).

Este storyboard cobre **toda a superfície interativa** do frontend ao longo de 36 frames distribuídos em 8 atos: do splash inicial e detecção de backend, passando por navegação de arquivos, edição assistida, ciclo de compilação direta e reversa, terminal conectado ao workspace real do servidor, painéis auxiliares (AST, Output, Build), configurações, atalhos, redimensionamento e modo offline. O leitor — designer, stakeholder ou engenheiro de QA — deve conseguir, após a leitura sequencial, reconstruir cada tela no Figma e derivar casos de teste para cada funcionalidade descrita.

A jornada principal segue um desenvolvedor que abre a IDE, edita `main.mon`, comete erros tipográficos e semânticos (corrigidos com diagnóstico em tempo real), compila com `Ctrl+B`, inspeciona o C gerado, exporta o artefato e fecha o ciclo executando `dotmon compile all` no terminal. Cenas paralelas demonstram fluxos de exceção (offline, importação, exclusão com confirmação) e a transpilação inversa, completando a cobertura funcional.

---

## 2. Mapa de Regiões

A IDE divide a viewport em **6 regiões macro**, todas redimensionáveis exceto a Title Bar e a Status Bar:

```
┌── Title Bar ────────────────────────────────────────────────────────────────┐
│ ●●●           main.mon — dotmon IDE        [🔍 Search] [▶] [📄] [⚠ 0] [⚙]   │
├──┬──────────────┬─────────────────────────────────┬────────────────────────┤
│A │ ▾ EXPLORER   │ ⓘ main.mon ×  │ utils.mon ×  ⊕  │ [C Gerado][Erros][AST] │
│c │ DOTMON-PROJ. │ dotmon-proj › src › main.mon    │                        │
│t │  ▾ src/      │ ─────────────────────────────── │  Editor read-only      │
│i │   ⓜ main.mon │                                 │  do .c gerado          │
│v │   ⓜ util.mon │      Monaco Editor (dotmon)     │  [Copiar][Exportar]    │
│i │  ▸ generated │   1 │ Start {                   │  [Regenerar]           │
│t │  ▸ config/   │   2 │   Baby idade = 5;         │                        │
│y │  □ README.md │   3 │   Show("Olá");            │                        │
│B │              │   4 │ } Finish                  │                        │
│a │              │                                 │                        │
│r │              │                                 │                        │
├──┴──────────────┴─────────────────────────────────┴────────────────────────┤
│ Bottom Panel   [Terminal] [Output] [Build] [Debug]            [⌃][🗑][⤢]   │
│ dotmon@project ~/dotmon-project $ █                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ ⎇ main │ ⨯ 0  ⚠ 0 │ C Generated │ Ln 3, Col 12 │ Spaces:4 │ UTF-8 │ LF │   │
│ dotmon │ ● API                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Legenda das regiões**

1. **Title Bar** (topo, ~40px): traffic lights decorativos macOS à esquerda; nome do arquivo ativo + "— dotmon IDE" centralizado; botões Search, Compilar (▶), Gerar C (📄), Erros (⚠ com badge numérico), Configurações (⚙) à direita.
2. **Activity Bar** (coluna esquerda, ~48px): 5 ícones superiores (Explorer, Buscar, Estrutura, Build/Compile, Debug) + 2 inferiores (Extensões, Configurações). Ícone ativo recebe barra lateral em `#0e7490`.
3. **Sidebar** (~260px, redimensionável): conteúdo do ícone ativo na Activity Bar. Por padrão exibe o Explorer com `EXPLORER` em header e o workspace `DOTMON-PROJECT` em árvore colapsável.
4. **Editor Central** (flex): barra de abas + breadcrumb + Monaco. Aceita N abas simultâneas; aba ativa em `#1e1e1e`, inativas em `#2d2d30`.
5. **Painel Direito** (~420px, redimensionável): três abas — **C Gerado**, **Erros**, **AST**. Sempre visível, mesmo sem código compilado (mostra estado vazio).
6. **Bottom Panel** (~220px, redimensionável): quatro abas — **Terminal**, **Output**, **Build**, **Debug**. Possui controles globais (limpar, recolher/expandir) à direita da barra de abas.
7. **Status Bar** (rodapé, ~24px, fixa): branch git, contadores `⨯`/`⚠` clicáveis, indicador "C Generated", posição do cursor, indentação, encoding, EOL, linguagem, e o **indicador de backend** (`● API` em `#10b981` quando online, `○ Local` em `#737373` quando offline).

> Itens 3, 4, 5 e 6 são separados por **handles de redimensionamento** de 4px que ficam destacados em `#0e7490` ao receber hover.

---

## 3. Storyboard Frame a Frame

### Ato I — Abertura e Onboarding

---

**Frame 1 — Splash de carregamento da IDE**
────────────────────────────────────────
- **Objetivo do usuário**: abrir a IDE no navegador e aguardar inicialização.
- **Pré-condição (estado anterior)**: usuário acabou de digitar `https://dotmon.dev` (ou `localhost:8000`) e pressionou Enter; nenhuma asset carregada ainda.
- **Ação do usuário**: aguarda passivamente.
- **Resposta do sistema (front)**: a página é servida com `<link rel="preconnect">` para `fonts.googleapis.com` e `fonts.gstatic.com`; um splash centralizado exibe o logo `dotmon` em `#c586c0`, o subtítulo "Loading editor…" em `#9ca3af` e uma barra de progresso indeterminada animada em `#0e7490`. O loader do **Monaco** é injetado via `require.config({ paths: { vs: '…' } })` e a fonte JetBrains Mono é baixada em paralelo.
- **Resposta do sistema (back)**: nenhuma chamada ainda; o splash não depende do backend.
- **Estado da UI após a ação**: viewport `#0f0f0f` com card centralizado de 360×220px; restante da IDE não renderizado.
- **Caminho feliz / erro / edge cases**: se o Monaco falhar (CDN indisponível) o splash troca para um aviso "Editor indisponível — recarregue a página"; se a fonte demorar, fallback para `monospace` do sistema sem bloquear a renderização.
- **Atalhos de teclado relevantes**: nenhum.
- **Esboço visual (ASCII wireframe)**:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                                                              │
│                       ▒░ dotmon ░▒                           │
│                                                              │
│                     Loading editor…                          │
│                                                              │
│                  [▓▓▓▓▓▓░░░░░░░░░░░░░]                       │
│                                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```
- **Anotações de microinteração**: barra de progresso pulsa com `keyframes shimmer` de 1.4s; logo recebe leve `scale(1.0→1.02)` em loop respiratório de 2s; o splash fade-out em 220ms quando o Monaco emite `onDidCreateEditor`.

---

**Frame 2 — Primeira renderização: IDE pronta com `main.mon` aberto**
────────────────────────────────────────
- **Objetivo do usuário**: ver a IDE preenchida e começar a trabalhar.
- **Pré-condição**: Monaco carregado; ainda não houve handshake com o backend.
- **Ação do usuário**: nenhuma — observa.
- **Resposta do sistema (front)**: o splash some; renderizam-se Title Bar, Activity Bar (Explorer ativo), Sidebar (árvore lida do `localStorage` se houver, ou seed default), Editor com `main.mon` carregado e syntax highlighting aplicado, Painel Direito na aba **C Gerado** com estado vazio, Bottom Panel na aba **Terminal** com prompt vazio, Status Bar com `○ Local` (cinza, ainda otimisticamente offline até confirmar API).
- **Resposta do sistema (back)**: dispara em background `GET /api/project` para descobrir se há backend; promessa pendente, indicador permanece `○ Local`.
- **Estado da UI após a ação**: layout completo visível; aba `main.mon` ativa; cursor posicionado em Ln 1 Col 1; contadores `⨯ 0 ⚠ 0`.
- **Caminho feliz / erro / edge cases**: se `localStorage` estiver corrompido, a IDE seeda um `main.mon` "Hello World" e exibe toast informativo no Terminal: `[info] Workspace inicializado com template padrão`.
- **Atalhos de teclado relevantes**: todos já ativos a partir daqui.
- **Esboço visual**:

```
┌── ●●●       main.mon — dotmon IDE          [🔍][▶][📄][⚠0][⚙] ──┐
│A │EXPLORER  │ ⓘ main.mon × ⊕            │ [C Gerado][Erros][AST]│
│ct│▾DOTMON…  │ dotmon-proj › src › main  │                       │
│ B│ ▾src/    │ 1 Start {                 │  ⌛ Nenhum C gerado    │
│ar│  ⓜmain   │ 2   Show("Olá Digimon");  │     ainda.            │
│  │ ▸gen/    │ 3 } Finish                │                       │
│  │ ▸config  │ █                         │  Use Ctrl+B para      │
│  │ □README  │                           │  compilar.            │
├──┴──────────┴───────────────────────────┴───────────────────────┤
│ [Terminal][Output][Build][Debug]                    [🗑][⤢]     │
│ dotmon@project ~/dotmon-project $ █                             │
├──────────────────────────────────────────────────────────────────┤
│ ⎇ main │ ⨯0 ⚠0 │ Ln1,Col1 │ UTF-8 │ dotmon │ ○ Local            │
└──────────────────────────────────────────────────────────────────┘
```
- **Anotações de microinteração**: cada painel faz fade-in escalonado de 60ms; a aba ativa do editor recebe transição suave da borda inferior em `#0e7490`.

---

**Frame 3 — Detecção de backend (transição `○ Local` → `● API`)**
────────────────────────────────────────
- **Objetivo do usuário**: saber se está conectado ao servidor FastAPI.
- **Pré-condição**: Frame 2 concluído; `GET /api/project` em vôo.
- **Ação do usuário**: nenhuma — passiva.
- **Resposta do sistema (front)**: ao receber `200 OK` com o JSON do workspace, o indicador da Status Bar troca de `○ Local` (cinza `#737373`) para `● API` (verde `#10b981`); a árvore de arquivos é reconciliada com o que o backend reporta (arquivos adicionais aparecem, arquivos só-locais ficam marcados com pequeno badge `local`).
- **Resposta do sistema (back)**: `GET /api/project` retorna `{ files: [...], folders: [...], updatedAt: ... }`.
- **Estado da UI após**: Status Bar `● API`; árvore eventualmente expandida com novos itens; tooltip ao hover no indicador: `Connected to FastAPI · workspace/`.
- **Caminho feliz / erro / edge cases**: timeout de 3s → permanece `○ Local`, sem toast intrusivo, apenas a Status Bar fica cinza. Erro 5xx → toast no Terminal `[warn] Backend respondeu 503 — usando modo Local`.
- **Atalhos de teclado**: nenhum.
- **Esboço visual** (recorte da Status Bar):

```
│ ⎇ main │ ⨯0 ⚠0 │ Ln1,Col1 │ UTF-8 │ dotmon │ ○ Local │  →
│ ⎇ main │ ⨯0 ⚠0 │ Ln1,Col1 │ UTF-8 │ dotmon │ ● API   │
```
- **Anotações de microinteração**: transição de cor do indicador é interpolada em 320ms; um pulso radial de `#10b981` com `opacity 0.3 → 0` se expande do ponto em 600ms para sinalizar a conexão.

---

**Frame 4 — Tour rápido das 6 regiões**
────────────────────────────────────────
- **Objetivo do usuário**: entender as áreas da IDE em sua primeira visita.
- **Pré-condição**: Frame 3 concluído; cookie `dotmon.tour.done` ausente.
- **Ação do usuário**: clica em "Próximo" 6 vezes no popover do tour ou em "Pular".
- **Resposta do sistema (front)**: um overlay semi-transparente `rgba(0,0,0,0.55)` cobre a IDE; uma "máscara" recorta a região destacada (Title Bar → Activity Bar → Sidebar → Editor → Painel Direito → Bottom Panel) e um popover ancorado em cada região explica em uma frase curta (`Aqui ficam as ações globais`, `Esta é a barra de navegação principal`, etc.).
- **Resposta do sistema (back)**: ao concluir, `POST /api/preferences` salva `tour_done=true`; em modo Local, grava no `localStorage`.
- **Estado da UI após**: overlay removido; nenhuma mudança permanente além da flag persistida.
- **Caminho feliz / erro / edge cases**: se o usuário fechar a aba no meio do tour, a flag não é gravada e o tour reaparece na próxima visita.
- **Atalhos de teclado**: `Esc` pula o tour; `→` avança; `←` volta.
- **Esboço visual** (passo 3/6 — Sidebar destacada):

```
┌── ●●●       main.mon — dotmon IDE   [🔍][▶][📄][⚠0][⚙] ──┐
│░░│EXPLORER   │░░░░░░░░░░░░░░│░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░│▾DOTMON…   │░░ ┌──────────────────┐ ░░░░░░░░░░░░░░░░░│
│░░│ ▾src/     │░░ │ 3/6 — Sidebar    │ ░░░░░░░░░░░░░░░░░│
│░░│  ⓜmain    │░░ │ Aqui você navega │ ░░░░░░░░░░░░░░░░░│
│░░│ ▸gen/     │░░ │ os arquivos do   │ ░░░░░░░░░░░░░░░░░│
│░░│ ▸config   │░░ │ projeto.         │ ░░░░░░░░░░░░░░░░░│
│░░│ □README   │░░ │  [Pular][← →][✓] │ ░░░░░░░░░░░░░░░░░│
│░░│           │░░ └──────────────────┘ ░░░░░░░░░░░░░░░░░│
└─────────────────────────────────────────────────────────┘
```
- **Anotações de microinteração**: o recorte da máscara anima entre regiões com `clip-path` e `transition: 280ms ease`; o popover faz `translateY(8px) → 0` ao aparecer.

---

### Ato II — Exploração e navegação de arquivos

---

**Frame 5 — Abrir arquivo pelo clique na sidebar**
────────────────────────────────────────
- **Objetivo do usuário**: abrir `src/utils.mon` para inspecionar.
- **Pré-condição**: apenas `main.mon` está aberto; árvore expandida.
- **Ação do usuário**: clique único em `utils.mon` na sidebar.
- **Resposta do sistema (front)**: uma nova aba `utils.mon` aparece à direita de `main.mon`; o Monaco troca o modelo ativo para o conteúdo de `utils.mon`; breadcrumb atualiza para `dotmon-proj › src › utils.mon`; ícone da aba é o "M" laranja (`#f59e0b`).
- **Resposta do sistema (back)**: se modo API e o arquivo ainda não estiver em cache local, dispara `GET /api/files/src/utils.mon` para garantir a versão mais recente.
- **Estado da UI após**: 2 abas abertas, `utils.mon` ativa, `main.mon` inativa.
- **Caminho feliz / erro / edge cases**: clique duplo em arquivo já aberto só re-foca a aba existente; se o backend devolver 404 (arquivo removido externamente), exibe toast `[error] Arquivo não encontrado no servidor` e marca o item como tachado na árvore.
- **Atalhos de teclado**: `Ctrl+Click` abre em segunda coluna (futuro); `Ctrl+Tab` cicla abas.
- **Esboço visual**:

```
│A│EXPLORER  │ ⓘ main.mon × │ ⓘ utils.mon × ⊕ │  [C Gerado]...
│ │▾src/     │ dotmon-proj › src › utils.mon  │
│ │ ⓜmain    │ 1 Xros saudar(Moji nome) {     │
│ │ ⓜutils ◀ │ 2   Show("Olá, %s", nome);     │
│ │ ▸gen/    │ 3 } Send;                      │
```
- **Anotações de microinteração**: aba nova faz `slide-in` da direita em 180ms; ícone "M" laranja recebe leve glow ao virar aba ativa.

---

**Frame 6 — Fechar aba, alternar entre abas, marcador de modificação**
────────────────────────────────────────
- **Objetivo do usuário**: editar `utils.mon` (gerando estado modificado), depois fechar.
- **Pré-condição**: 2 abas abertas; `utils.mon` ativa, salva.
- **Ação do usuário**: digita um caractere em `utils.mon`; clica em `main.mon` para alternar; volta a `utils.mon`; clica no `×` da aba.
- **Resposta do sistema (front)**: ao primeiro keystroke, o título da aba ganha um ponto • antes do nome (`• utils.mon`) e o `×` vira `●`. Ao clicar em `main.mon`, o Monaco troca o modelo, breadcrumb muda, cursor restaura para a posição anterior em `main.mon`. Ao clicar no `●` de `utils.mon` enquanto modificada, abre **modal de confirmação**: `Salvar alterações em utils.mon? [Salvar] [Descartar] [Cancelar]`.
- **Resposta do sistema (back)**: se "Salvar", `PUT /api/files/src/utils.mon` com o body; se "Descartar", apenas remove a aba.
- **Estado da UI após**: dependendo da escolha, aba some ou permanece. Contador de erros recomputa se houver re-análise.
- **Caminho feliz / erro / edge cases**: salvar com backend offline cai no `localStorage`; em "Cancelar", nada muda; clique no meio do botão `●` quando a aba não está modificada fecha direto sem prompt.
- **Atalhos de teclado**: `Ctrl+W` fecha a aba ativa; `Ctrl+Tab` / `Ctrl+Shift+Tab` ciclam.
- **Esboço visual** (modal de confirmação):

```
                ┌────────────────────────────────────┐
                │  Salvar alterações em utils.mon?   │
                │                                    │
                │  Suas mudanças serão perdidas se   │
                │  você descartar.                   │
                │                                    │
                │   [ Descartar ]  [ Cancelar ]  [Salvar]  │
                └────────────────────────────────────┘
```
- **Anotações de microinteração**: marcador de modificação substitui o `×` com fade cruzado de 120ms; ao hover sobre `●`, troca temporariamente para `×` indicando que o clique fechará.

---

**Frame 7 — Context menu: Renomear arquivo inline**
────────────────────────────────────────
- **Objetivo do usuário**: renomear `utils.mon` para `helpers.mon`.
- **Pré-condição**: árvore expandida; `utils.mon` visível e não selecionado.
- **Ação do usuário**: clique direito em `utils.mon` → escolhe **Renomear**.
- **Resposta do sistema (front)**: aparece um popover ancorado no item com lista: `Novo arquivo .mon`, `Nova pasta`, `Renomear`, `Duplicar`, `Excluir`, `Compilar`, `Gerar C`, `Revelar no sistema`. Ao clicar em "Renomear", o nome do arquivo na árvore vira um `<input>` inline pré-selecionado (texto destacado, extensão `.mon` preservada). Usuário digita `helpers` e pressiona Enter.
- **Resposta do sistema (back)**: `PATCH /api/files/src/utils.mon` com `{ rename_to: "src/helpers.mon" }`; em modo Local, atualiza a chave no `localStorage`.
- **Estado da UI após**: árvore mostra `helpers.mon` no lugar; se o arquivo estava aberto, a aba atualiza o título; breadcrumb também.
- **Caminho feliz / erro / edge cases**: nome inválido (contém `/` ou já existe) → input recebe borda vermelha `#ef4444` + mensagem tooltip `Nome inválido` e o foco permanece; `Esc` cancela; backend 409 (conflito) → toast `[error] Já existe um arquivo helpers.mon`.
- **Atalhos de teclado**: `F2` com item selecionado também aciona renomear; `Enter` confirma; `Esc` cancela.
- **Esboço visual** (context menu aberto):

```
│ ▾src/      │
│  ⓜmain     │
│  ⓜutils   ┌──────────────────────────┐
│ ▸gen/     │  Novo arquivo .mon       │
│ ▸config   │  Nova pasta              │
│ □README   │ ─────────────────────────│
│           │  Renomear            F2  │ ◀ hover
│           │  Duplicar                │
│           │  Excluir            Del  │
│           │ ─────────────────────────│
│           │  Compilar          ^B    │
│           │  Gerar C                 │
│           │  Revelar no sistema      │
│           └──────────────────────────┘
```
- **Anotações de microinteração**: menu aparece com `scale(0.96)→1` em 90ms; hover em cada item ativa background `#2d2d30`; durante o renomear inline, a extensão `.mon` fica em cinza não selecionável.

---

**Frame 8 — Context menu: Duplicar arquivo**
────────────────────────────────────────
- **Objetivo do usuário**: criar uma cópia de `main.mon` chamada `main.copy.mon`.
- **Pré-condição**: árvore visível; `main.mon` existente.
- **Ação do usuário**: clique direito em `main.mon` → **Duplicar**.
- **Resposta do sistema (front)**: a IDE gera um novo nome incrementando sufixo (`main.copy.mon`; se já existir, `main.copy.2.mon`); a árvore insere o novo item imediatamente abaixo do original com leve highlight verde por 1.2s; o arquivo **não** é aberto automaticamente.
- **Resposta do sistema (back)**: `POST /api/files` com `{ path: "src/main.copy.mon", content: <conteúdo de main.mon> }`.
- **Estado da UI após**: árvore com 1 arquivo a mais; nenhuma aba nova; contadores intocados.
- **Caminho feliz / erro / edge cases**: backend 500 → reverte a inserção otimista, toast `[error] Falha ao duplicar`; em modo Local sempre sucesso.
- **Atalhos de teclado**: nenhum direto (apenas via menu).
- **Esboço visual**:

```
│ ▾src/      │
│  ⓜmain     │
│  ⓜmain.copy │ ◀ highlight verde fade
│  ⓜhelpers  │
```
- **Anotações de microinteração**: fade do highlight de `#10b981` (opacity 0.25 → 0) em 1.2s; árvore re-ordena com `transition: top 180ms`.

---

**Frame 9 — Context menu: Excluir arquivo (com confirmação)**
────────────────────────────────────────
- **Objetivo do usuário**: remover `main.copy.mon`.
- **Pré-condição**: `main.copy.mon` existe na árvore.
- **Ação do usuário**: clique direito → **Excluir**.
- **Resposta do sistema (front)**: modal de confirmação destrutiva: `Excluir main.copy.mon? Esta ação não pode ser desfeita. [Cancelar] [Excluir]`, com botão "Excluir" em vermelho `#ef4444`.
- **Resposta do sistema (back)**: ao confirmar, `DELETE /api/files/src/main.copy.mon`; se modo Local, remove a chave.
- **Estado da UI após**: arquivo some da árvore com leve animação de colapso vertical; se estiver aberto em aba, a aba é fechada sem novo prompt (já foi confirmado).
- **Caminho feliz / erro / edge cases**: backend 404 (já excluído externamente) → remove da UI silenciosamente; sem rede → trata como Local e marca a operação para sync futuro.
- **Atalhos de teclado**: `Delete` com item selecionado abre o mesmo modal.
- **Esboço visual**:

```
       ┌──────────────────────────────────────────┐
       │  Excluir main.copy.mon?                  │
       │                                          │
       │  Esta ação não pode ser desfeita.        │
       │                                          │
       │              [ Cancelar ]  [ Excluir ]   │
       └──────────────────────────────────────────┘
```
- **Anotações de microinteração**: botão "Excluir" tem leve "wiggle" se o usuário pressionar `Enter` muito rápido (anti-clique acidental) na primeira 600ms.

---

**Frame 10 — Importar arquivo `.mon` (drag & drop ou botão)**
────────────────────────────────────────
- **Objetivo do usuário**: trazer um `legacy.mon` da máquina para o workspace.
- **Pré-condição**: workspace aberto; o usuário tem o arquivo no Finder/Explorer.
- **Ação do usuário**: arrasta `legacy.mon` para a Sidebar; ou clica no botão **Importar .mon** no header `EXPLORER`.
- **Resposta do sistema (front)**: ao entrar na zona de drop, a Sidebar inteira recebe borda tracejada em `#0e7490` e overlay `Solte para importar`; ao soltar, o arquivo é lido via `FileReader`, validado (extensão `.mon`, tamanho < 1MB) e inserido em `src/`; nova aba abre automaticamente.
- **Resposta do sistema (back)**: `POST /api/files` com `{ path: "src/legacy.mon", content: <texto> }`.
- **Estado da UI após**: novo item na árvore; aba `legacy.mon` ativa; análise estática roda no Monaco gerando contadores atualizados.
- **Caminho feliz / erro / edge cases**: arquivo `.txt` ou outra extensão → overlay vira vermelho com `Tipo de arquivo não suportado` e o drop é rejeitado; arquivo > 1MB → toast `[error] Arquivo muito grande (limite 1MB)`; nome em conflito → modal `Substituir legacy.mon existente? [Não] [Sim]`.
- **Atalhos de teclado**: nenhum.
- **Esboço visual** (estado de drop ativo):

```
│A│┌══════════════════════════════════┐│
│ │║         📂 Solte para            ║│
│ │║         importar .mon            ║│
│ │║                                  ║│
│ │║   (apenas arquivos .mon)         ║│
│ │└══════════════════════════════════┘│
```
- **Anotações de microinteração**: borda tracejada pulsa entre `#0e7490` (opacity 0.6 ↔ 1.0) em 1.2s; ao aceitar o drop, ícone do arquivo na árvore tem flash de entrada verde.

---

**Frame 11 — Criar novo arquivo `.mon` via botão `+`**
────────────────────────────────────────
- **Objetivo do usuário**: criar `src/battle.mon` do zero.
- **Pré-condição**: árvore visível, foco na pasta `src/` (opcional).
- **Ação do usuário**: clica no botão **Novo arquivo .mon** no header `EXPLORER`.
- **Resposta do sistema (front)**: abaixo da pasta selecionada (ou raiz, se nenhuma), surge um `<input>` inline com placeholder `nome-do-arquivo` e sufixo cinza `.mon` não editável; usuário digita `battle` e pressiona Enter.
- **Resposta do sistema (back)**: `POST /api/files` com conteúdo seed `Start {\n  \n} Finish\n`.
- **Estado da UI após**: novo arquivo na árvore, aba aberta com cursor posicionado dentro do bloco `Start { ... } Finish`.
- **Caminho feliz / erro / edge cases**: nome vazio + Enter → cancela criação; nome inválido → mesma validação do Frame 7.
- **Atalhos de teclado**: `Ctrl+N` (configurável) aciona o mesmo fluxo.
- **Esboço visual**:

```
│ ▾src/                  │
│  ⓜmain                 │
│  ⓜhelpers              │
│  ⓜlegacy               │
│  ⓜ▎battle░░░░░.mon     │ ◀ input inline, caret piscando
│ ▸gen/                  │
```
- **Anotações de microinteração**: caret pisca a 530ms; após Enter, o input vira label estático com `transition: background 200ms`.

---

**Frame 12 — Criar nova pasta e arrastar arquivo para dentro**
────────────────────────────────────────
- **Objetivo do usuário**: organizar `battle.mon` dentro de uma nova pasta `src/combat/`.
- **Pré-condição**: `battle.mon` existe em `src/`.
- **Ação do usuário**: clica em **Nova pasta** no header → digita `combat` → Enter; depois arrasta `battle.mon` para dentro de `combat/`.
- **Resposta do sistema (front)**: pasta `combat/` aparece na árvore expandida vazia; ao arrastar, o item alvo (`combat/`) recebe destaque azul-petróleo; ao soltar, o arquivo é movido visualmente para dentro com animação de slide.
- **Resposta do sistema (back)**: `PATCH /api/files/src/battle.mon` com `{ move_to: "src/combat/battle.mon" }`; pasta é criada por `POST /api/folders`.
- **Estado da UI após**: árvore reorganizada; breadcrumb da aba aberta atualiza para `dotmon-proj › src › combat › battle.mon`.
- **Caminho feliz / erro / edge cases**: arrastar para o próprio arquivo é no-op; arrastar para fora do workspace (na área do editor) cancela e mostra cursor "not-allowed"; backend recusa move → reverte UI e toast `[error] Não foi possível mover`.
- **Atalhos de teclado**: nenhum específico para mover.
- **Esboço visual**:

```
│ ▾src/        │
│  ⓜmain       │
│  ⓜhelpers    │
│  ⓜlegacy     │
│  ▾combat/    │
│   ⓜbattle ◀  │
│ ▸gen/        │
```
- **Anotações de microinteração**: durante o drag, um "ghost" semitransparente do nome do arquivo segue o cursor; pasta-alvo aceita o drop quando o cursor permanece >200ms sobre ela (auto-expand).

---

### Ato III — Edição de código

---

**Frame 13 — Syntax highlighting em ação**
────────────────────────────────────────
- **Objetivo do usuário**: ler código colorizado e identificar visualmente cada elemento.
- **Pré-condição**: aba `main.mon` ativa, conteúdo razoavelmente preenchido.
- **Ação do usuário**: apenas lê o código no Monaco.
- **Resposta do sistema (front)**: o tokenizer Monarch registrado para `dotmon` aplica cores: keywords (`Start`, `Finish`, `Evo`, `Loop`, `Send`, `Xros`) em `#c586c0`; tipos (`Baby`, `Pup`, `Rook`, `Champ`, `Moji`, `Bit`) em `#4ec9b0`; built-ins (`Show`, `Ask`, `Call`) em `#dcdcaa`; strings em `#ce9178`; números em `#b5cea8`; comentários `// ...` em `#6a9955` itálico; identificadores em `#9cdcfe`. Bracket pairs `{ }` e `( )` recebem cores diferentes por nível.
- **Resposta do sistema (back)**: nenhuma.
- **Estado da UI após**: editor renderizado com tipografia JetBrains Mono 14px, line-height 1.5; minimap à direita do editor reproduz as cores.
- **Caminho feliz / erro / edge cases**: tokens não reconhecidos caem em cor padrão `#d4d4d4`; strings não terminadas recebem cor `#ce9178` mas a linha ganha sublinhado ondulado vermelho via diagnóstico.
- **Atalhos de teclado**: `Ctrl+/` toggla comentário de linha.
- **Esboço visual** (recorte editor com cores anotadas):

```
1  Start {                          ← #c586c0 / #c586c0
2    Baby idade = 5;                ← #4ec9b0 #9cdcfe #b5cea8
3    Moji nome = "Agumon";          ← #4ec9b0 #9cdcfe #ce9178
4    // saudação inicial            ← #6a9955 itálico
5    Show("Olá, %s", nome);         ← #dcdcaa #ce9178 #9cdcfe
6    Evo (idade > 3) {              ← #c586c0 #9cdcfe #b5cea8
7      Show("Cresceu!");            ← #dcdcaa #ce9178
8    }                              ← bracket pair color
9  } Finish                         ← #c586c0
```
- **Anotações de microinteração**: minimap atualiza em tempo real; bracket matching ilumina o par correspondente quando o cursor toca uma chave (background `rgba(14,116,144,0.25)`).

---

**Frame 14 — Autocomplete: digitar `Sh` sugere `Show()`**
────────────────────────────────────────
- **Objetivo do usuário**: inserir uma chamada `Show()` rapidamente.
- **Pré-condição**: cursor em uma linha vazia dentro de `Start { ... } Finish`.
- **Ação do usuário**: digita `Sh`.
- **Resposta do sistema (front)**: após 80ms o Monaco abre o popover de **completion** com itens ordenados: `Show()` (built-in, ícone amarelo), `Spiral` (keyword, ícone roxo). O item selecionado mostra um painel lateral com descrição: `Show(format, ...args) → printf — Exibe valor formatado no console serial.` e um exemplo: `Show("Idade: %d", idade);`.
- **Resposta do sistema (back)**: nenhuma — autocomplete é 100% client-side.
- **Estado da UI após**: ao pressionar `Tab` ou `Enter`, o texto se torna `Show()` com cursor entre parênteses e a UI fecha o popover.
- **Caminho feliz / erro / edge cases**: se nenhum item bate, o popover fecha sozinho; `Esc` cancela; `↓ ↑` navega a lista.
- **Atalhos de teclado**: `Ctrl+Space` força a abertura mesmo sem digitação.
- **Esboço visual**:

```
1  Start {
2    Sh█
       ┌──────────────────────────┬─────────────────────────┐
       │ ƒ Show()                 │ Show(format, …args)     │
       │ ⓚ Spiral                 │ Wraps printf.           │
       │                          │                         │
       │                          │ Exemplo:                │
       │                          │   Show("Idade: %d",     │
       │                          │         idade);         │
       └──────────────────────────┴─────────────────────────┘
3  } Finish
```
- **Anotações de microinteração**: popover faz `translateY(4px)→0` em 120ms; item selecionado tem barra lateral esquerda em `#0e7490`.

---

**Frame 15 — Inserção do snippet `Start...Finish`**
────────────────────────────────────────
- **Objetivo do usuário**: gerar o esqueleto de um programa novo rapidamente.
- **Pré-condição**: arquivo vazio recém-criado.
- **Ação do usuário**: digita `start`, seleciona o snippet `Start { } Finish` no popover (ícone "▱"), pressiona `Tab`.
- **Resposta do sistema (front)**: o snippet expande para múltiplas linhas com placeholders tabuláveis:

```
Start {
    ${1:// código aqui}
} Finish
```

O cursor é posicionado no placeholder `// código aqui`, que fica destacado em azul `#0e7490`.
- **Resposta do sistema (back)**: nenhuma.
- **Estado da UI após**: 3 linhas escritas; aba `• novo.mon` marca arquivo modificado; análise estática roda em 500ms.
- **Caminho feliz / erro / edge cases**: outros snippets disponíveis: `evo` (Evo/AltEvo/FailEvo), `show`, `ask`, `loop` (for), `loopw` (while), `spiral`, `xros` (função). Cada um descrito no popover.
- **Atalhos de teclado**: `Tab` confirma; `Esc` cancela.
- **Esboço visual** (snippet recém-expandido):

```
1  Start {
2      ▎// código aqui▏    ◀ placeholder selecionado
3  } Finish
```
- **Anotações de microinteração**: placeholder pulsa suavemente (`background-opacity 0.4 ↔ 0.7` em 1s) para guiar o foco.

---

**Frame 16 — Hover sobre `Evo` mostra tooltip explicativo**
────────────────────────────────────────
- **Objetivo do usuário**: lembrar o que `Evo` faz sem sair do editor.
- **Pré-condição**: arquivo com `Evo (cond) { ... }`.
- **Ação do usuário**: passa o mouse sobre a palavra `Evo`.
- **Resposta do sistema (front)**: após 350ms o hover provider abre um tooltip:

```
Evo — keyword (condicional)
Equivale a `if` em C.
Avalia uma expressão booleana e executa o bloco se verdadeira.

Exemplo:
  Evo (idade > 18) {
    Show("Adulto");
  } AltEvo (idade > 12) {
    Show("Adolescente");
  } FailEvo {
    Show("Criança");
  }
```
- **Resposta do sistema (back)**: nenhuma.
- **Estado da UI após**: tooltip permanece enquanto o cursor estiver sobre o token ou sobre o próprio tooltip; some em 200ms ao sair.
- **Caminho feliz / erro / edge cases**: tooltips registrados para todos os keywords/tipos/built-ins; identificadores do usuário recebem tooltip dinâmico com tipo inferido (`Baby idade — int`).
- **Atalhos de teclado**: `Ctrl+K Ctrl+I` força mostrar hover na posição do cursor.
- **Esboço visual**:

```
4  Evo (idade > 3) {
   ▲
   ┌──────────────────────────────────────────┐
   │ Evo — keyword (condicional)              │
   │ Equivale a `if` em C.                    │
   │ … exemplo …                              │
   └──────────────────────────────────────────┘
```
- **Anotações de microinteração**: tooltip aparece com fade + `translateY(-4px)→0`; o token sob o cursor recebe leve sublinhado pontilhado.

---

**Frame 17 — Diagnóstico em tempo real: variável não declarada (Error Lens)**
────────────────────────────────────────
- **Objetivo do usuário**: descobrir imediatamente que `velocidade` não foi declarada.
- **Pré-condição**: editor com `Show("v=%d", velocidade);` sem declaração prévia.
- **Ação do usuário**: para de digitar (debounce 500ms).
- **Resposta do sistema (front)**: o **Analisador semântico** roda no browser, detecta o uso de `velocidade` fora da tabela de símbolos e emite um marker do tipo `error`. Visualmente:
  - Linha recebe highlight de fundo vermelho translúcido `rgba(239,68,68,0.10)`.
  - Gutter ganha um círculo vermelho `●`.
  - O token `velocidade` recebe sublinhado ondulado vermelho `#ef4444`.
  - **Error Lens** desenha, ao fim da linha, a mensagem inline em vermelho: `Variável 'velocidade' não declarada`.
- **Resposta do sistema (back)**: nenhuma — análise é client-side.
- **Estado da UI após**: contador `⨯` da Status Bar e da Title Bar incrementa para `⨯ 1`; aba **Erros** do painel direito ganha badge vermelho `1`; aba do editor que originou o erro recebe um ponto vermelho à direita do nome.
- **Caminho feliz / erro / edge cases**: ao declarar `Baby velocidade = 0;` acima, o diagnóstico some em até 500ms; múltiplos usos da mesma variável geram múltiplos markers; alteração rápida em sequência cancela diagnósticos pendentes via debounce.
- **Atalhos de teclado**: `F8` salta para o próximo erro; `Shift+F8` para o anterior.
- **Esboço visual**:

```
5  Show("v=%d", velocidade);   ⚠ Variável 'velocidade' não declarada
   ●                ~~~~~~~~~
```
- **Anotações de microinteração**: highlight de linha aparece com fade 180ms; mensagem inline tem `opacity 0→1` em 200ms; contadores da Status Bar fazem leve "bump" (scale 1→1.15→1) ao incrementar.

---

**Frame 18 — Warning: variável declarada e não usada**
────────────────────────────────────────
- **Objetivo do usuário**: receber feedback de qualidade sem bloqueio.
- **Pré-condição**: editor contém `Baby contador = 0;` mas `contador` nunca é referenciado.
- **Ação do usuário**: nenhuma — diagnóstico passivo após debounce.
- **Resposta do sistema (front)**: marker do tipo `warning`:
  - Gutter exibe triângulo amarelo `⚠`.
  - Sublinhado ondulado amarelo `#dcdcaa` no nome `contador`.
  - Error Lens mostra ao fim da linha: `Variável 'contador' declarada mas nunca usada` em amarelo.
  - Não bloqueia compilação.
- **Resposta do sistema (back)**: nenhuma.
- **Estado da UI após**: contador `⚠` incrementa para `⚠ 1`; aba **Erros** mostra `0 Errors / 1 Warning`.
- **Caminho feliz / erro / edge cases**: ao usar a variável depois, warning some; warnings não impedem `Ctrl+B` (compilação prossegue).
- **Atalhos de teclado**: mesmos do Frame 17.
- **Esboço visual**:

```
3  Baby contador = 0;   ⚠ 'contador' declarada mas nunca usada
   ⚠         ~~~~~~~~
```
- **Anotações de microinteração**: triângulo amarelo na gutter pisca uma vez ao surgir; mensagem inline em `#dcdcaa`.

---

**Frame 19 — Erro de tipo incompatível (`Baby x = "texto";`)**
────────────────────────────────────────
- **Objetivo do usuário**: ver que `Baby` (int) não aceita string.
- **Pré-condição**: usuário acabou de escrever `Baby x = "texto";`.
- **Ação do usuário**: para de digitar.
- **Resposta do sistema (front)**: marker `error`:
  - Sublinhado ondulado vermelho na expressão `"texto"`.
  - Error Lens: `Tipo incompatível: esperado Baby (int), recebido Moji (string)`.
  - Gutter: círculo vermelho.
- **Resposta do sistema (back)**: nenhuma.
- **Estado da UI após**: `⨯ 1`, aba Erros com badge; status bar conta o erro.
- **Caminho feliz / erro / edge cases**: trocar para `Moji x = "texto";` limpa o erro; deixar `Baby x = 5;` também limpa; valores ambíguos como `Baby x = 3.14;` geram warning de truncamento.
- **Atalhos de teclado**: nenhum específico.
- **Esboço visual**:

```
2  Baby x = "texto";   ⚠ Tipo incompatível: esperado Baby (int), recebido Moji (string)
   ●         ~~~~~~~
```
- **Anotações de microinteração**: idênticas ao Frame 17.

---

### Ato IV — Compilação dotmon → C

---

**Frame 20 — `Ctrl+B` compila e popula o painel "C Gerado"**
────────────────────────────────────────
- **Objetivo do usuário**: ver o C gerado para `main.mon`.
- **Pré-condição**: `main.mon` válido, sem erros (warnings permitidos), painel direito visível.
- **Ação do usuário**: pressiona `Ctrl+B`.
- **Resposta do sistema (front)**: o pipeline roda no browser na ordem Lexer → Parser → Analyzer → CodeGen. O painel direito muda automaticamente para a aba **C Gerado**, exibindo o conteúdo gerado em um Monaco read-only com linguagem `c`. No topo do painel aparece:
  - Badge **`AUTO-GENERATED`** em `#dcdcaa` background `rgba(220,220,170,0.12)`.
  - Nome do arquivo correspondente: `generated/main.c`.
  - Botões `[Copiar] [Exportar .c] [Regenerar]`.
- **Resposta do sistema (back)**: em modo API, `POST /api/compile` com `{ path: "src/main.mon" }` também é disparado para gravar o resultado em `workspace/generated/main.c`; resposta inclui `ast`, `c_code`, `diagnostics`.
- **Estado da UI após**: aba C Gerado preenchida; aba AST populada; Status Bar exibe `C Generated` em verde discreto; Terminal recebe linha de info (Frame 21).
- **Caminho feliz / erro / edge cases**: se houver erro semântico, ver Frame 23; se backend offline, gera localmente e salva em `localStorage` sob a chave `generated/main.c`.
- **Atalhos de teclado**: `Ctrl+B` (principal); clique no ▶ da Title Bar equivalente.
- **Esboço visual**:

```
│ [C Gerado ●] [Erros][AST]                                           │
│ ─────────────────────────────────────────────────────────────────── │
│ generated/main.c           AUTO-GENERATED   [Copiar][Exportar][⟳]  │
│ 1 #include <stdio.h>                                                │
│ 2 #include <string.h>                                               │
│ 3 #include <stdbool.h>                                              │
│ 4                                                                   │
│ 5 int main(void) {                                                  │
│ 6     int idade = 5;                                                │
│ 7     char nome[256];                                               │
│ 8     strcpy(nome, "Agumon");                                       │
│ 9     printf("Olá, %s", nome);                                      │
│10     if (idade > 3) {                                              │
│11         printf("Cresceu!");                                       │
│12     }                                                             │
│13     return 0;                                                     │
│14 }                                                                 │
```
- **Anotações de microinteração**: a aba "C Gerado" recebe leve pulso `#0e7490` (200ms) ao auto-focar; o badge `AUTO-GENERATED` faz fade-in 220ms.

---

**Frame 21 — Terminal exibe `[info] Compilation finished in X ms — 0 errors`**
────────────────────────────────────────
- **Objetivo do usuário**: confirmar que a compilação foi rápida e bem-sucedida.
- **Pré-condição**: compilação do Frame 20 concluída.
- **Ação do usuário**: nenhuma — observação.
- **Resposta do sistema (front)**: o Bottom Panel, se na aba Terminal, mostra três linhas tipadas:

```
[info]    Compiling src/main.mon…
[success] Compilation finished in 2.3 ms — 0 errors, 0 warnings.
[muted]   Output: generated/main.c (412 bytes)
```

  - `terminal-info` em `#9cdcfe`, `terminal-success` em `#10b981`, `terminal-muted` em `#737373`.
- **Resposta do sistema (back)**: linha `[muted] Output…` só aparece se o backend confirmou a gravação.
- **Estado da UI após**: terminal scroll automático para baixo; prompt `dotmon@project ~/dotmon-project $` reaparece pronto.
- **Caminho feliz / erro / edge cases**: se a aba Output estiver ativa em vez do Terminal, a info também é replicada lá; nunca há duplicação se o usuário trocar de aba durante a execução.
- **Atalhos de teclado**: `Ctrl+\`` foca o terminal.
- **Esboço visual**:

```
│ [Terminal][Output][Build][Debug]                       [🗑][⤢]   │
│ [info]    Compiling src/main.mon…                                 │
│ [success] Compilation finished in 2.3 ms — 0 errors, 0 warnings. │
│ [muted]   Output: generated/main.c (412 bytes)                   │
│ dotmon@project ~/dotmon-project $ █                              │
```
- **Anotações de microinteração**: cada nova linha aparece com leve `slide-up 60ms`; o prefixo `[success]` recebe ícone `✓` antes do texto.

---

**Frame 22 — Aba "Erros" mostra contagem zero; Status Bar atualiza**
────────────────────────────────────────
- **Objetivo do usuário**: ver de forma resumida que está tudo limpo.
- **Pré-condição**: compilação sem erros nem warnings.
- **Ação do usuário**: clica na aba **Erros** do painel direito.
- **Resposta do sistema (front)**: painel mostra cabeçalho `0 Errors / 0 Warnings`, abaixo um estado vazio: ilustração discreta + texto `Nenhum problema detectado.` Em cinza `#737373`. Botões `[Filtrar ▾]` e `[Limpar]` visíveis mas desabilitados (`opacity 0.5`).
- **Resposta do sistema (back)**: nenhuma.
- **Estado da UI após**: contador da Title Bar `⚠ 0` (sem badge); Status Bar `⨯ 0  ⚠ 0`.
- **Caminho feliz / erro / edge cases**: se posteriormente surgir um warning, a aba se atualiza automaticamente sem precisar de clique.
- **Atalhos de teclado**: nenhum.
- **Esboço visual**:

```
│ [C Gerado][Erros ●][AST]                                       │
│ ────────────────────────────────────────────────────────────── │
│ 0 Errors / 0 Warnings                  [Filtrar ▾] [Limpar]    │
│                                                                │
│                       ✓                                        │
│              Nenhum problema detectado.                        │
│                                                                │
```
- **Anotações de microinteração**: estado vazio entra com fade 160ms.

---

**Frame 23 — Compilar arquivo com erro: auto-switch, badge vermelho, navegação**
────────────────────────────────────────
- **Objetivo do usuário**: identificar e clicar no erro para navegar até a linha.
- **Pré-condição**: `battle.mon` contém `Baby x = "abc"; Show(z);` (dois erros).
- **Ação do usuário**: `Ctrl+B`.
- **Resposta do sistema (front)**:
  - Pipeline detecta 2 erros. O painel direito **auto-switch** para a aba **Erros** (não para C Gerado).
  - Cabeçalho: `2 Errors / 0 Warnings`.
  - Lista de itens:
    ```
    ● Tipo incompatível: esperado Baby (int), recebido Moji (string)
      battle.mon:2:11
    ● Variável 'z' não declarada
      battle.mon:3:8
    ```
  - Cada item é clicável; hover destaca em `#2d2d30`.
  - Title Bar mostra badge vermelho com `2` sobre o ícone `⚠`.
  - Status Bar `⨯ 2 ⚠ 0`.
  - Editor já tem markers e Error Lens nas linhas correspondentes.
- **Resposta do sistema (back)**: backend opcionalmente persiste `last_diagnostics`.
- **Estado da UI após**: ao clicar em um item, o Monaco rola até a linha exata, posiciona o cursor e dá `selection flash`.
- **Caminho feliz / erro / edge cases**: erro em arquivo fechado abre a aba correspondente antes de navegar; clique duplo no item faz `peek` (mini-editor inline).
- **Atalhos de teclado**: `F8` percorre a lista de erros mesmo sem clicar.
- **Esboço visual**:

```
│ [C Gerado][Erros ●²][AST]                                         │
│ ────────────────────────────────────────────────────────────────  │
│ 2 Errors / 0 Warnings                    [Filtrar ▾] [Limpar]     │
│ ─────────────────────────────────────────────────────────────────│
│ ● Tipo incompatível: esperado Baby (int), recebido Moji (string) │
│   battle.mon:2:11                                                 │
│ ─────────────────────────────────────────────────────────────────│
│ ● Variável 'z' não declarada                                      │
│   battle.mon:3:8                                                  │
```
- **Anotações de microinteração**: badge vermelho na Title Bar tem leve pulso `scale 1↔1.1` em 800ms enquanto houver erros; ao clicar no item, a linha de destino recebe highlight amarelo translúcido por 600ms.

---

**Frame 24 — Botão "Exportar .c" baixa o arquivo gerado**
────────────────────────────────────────
- **Objetivo do usuário**: salvar `generated/main.c` no disco.
- **Pré-condição**: aba C Gerado preenchida com código válido.
- **Ação do usuário**: clica em **Exportar .c**.
- **Resposta do sistema (front)**: cria um `Blob([c_code], { type: "text/x-c" })`, gera URL e dispara `<a download="main.c">` programático; o navegador exibe diálogo nativo de salvar.
- **Resposta do sistema (back)**: nenhuma — operação puramente client-side.
- **Estado da UI após**: nenhuma mudança; toast no Terminal: `[info] main.c exportado.`
- **Caminho feliz / erro / edge cases**: usuário cancela diálogo → nada acontece, sem toast de erro; tamanho > 10MB (improvável) → fallback para `window.open`.
- **Atalhos de teclado**: nenhum.
- **Esboço visual**:

```
│ generated/main.c     AUTO-GENERATED   [Copiar][Exportar .c ◀][⟳] │
                                          ▲
                                    cursor "pointer"
```
- **Anotações de microinteração**: botão recebe `scale(0.96)` no `mousedown` por 80ms, depois retorna; ícone de download substitui o texto por 250ms como confirmação visual.

---

**Frame 25 — Botão "Regenerar" força nova compilação**
────────────────────────────────────────
- **Objetivo do usuário**: forçar recompilação após mudança externa ou para conferência.
- **Pré-condição**: aba C Gerado mostrando um `.c`; arquivo `.mon` correspondente ativo no editor.
- **Ação do usuário**: clica em **Regenerar** (⟳).
- **Resposta do sistema (front)**: equivalente a `Ctrl+B` — re-executa Lexer/Parser/Analyzer/CodeGen; durante a execução o botão fica desabilitado e mostra spinner de 14px; ao concluir, o conteúdo do Monaco read-only é re-escrito.
- **Resposta do sistema (back)**: `POST /api/compile` re-emitido em modo API.
- **Estado da UI após**: idêntico ao Frame 20 mas sem mudar a aba ativa (se já estava em C Gerado, permanece).
- **Caminho feliz / erro / edge cases**: se nada mudou desde a última compilação, ainda assim refaz (não há cache de invalidação manual).
- **Atalhos de teclado**: nenhum dedicado (`Ctrl+B` faz o mesmo).
- **Esboço visual**:

```
│ generated/main.c     AUTO-GENERATED   [Copiar][Exportar .c][⟳ ◀]│
                                                                  ▲
                                                            spinner ativo
```
- **Anotações de microinteração**: spinner gira em 800ms/volta; ao terminar, o ícone ⟳ "explode" (scale 1→1.2→1) por 200ms.

---

### Ato V — Compilação reversa C → dotmon

---

**Frame 26 — Abrir `generated/main.c`, compilar e ver `.mon` reconstruído**
────────────────────────────────────────
- **Objetivo do usuário**: recuperar uma versão em dotmon a partir de um `.c` gerado.
- **Pré-condição**: `generated/main.c` existe (criado em frames anteriores); usuário expandiu a pasta `generated/`.
- **Ação do usuário**: clica em `main.c` na sidebar (ícone "C" azul `#3b82f6`) → editor abre o arquivo → pressiona `Ctrl+B`.
- **Resposta do sistema (front)**:
  - A IDE detecta que o arquivo ativo é `.c` e inverte o pipeline (Reverse Transpiler: C-parser → dotmon emitter).
  - O painel direito agora rotula a aba como **`main.mon (transpiled)`** ao invés de `generated/main.c`, com badge `REVERSE` em azul `#3b82f6`.
  - O Monaco read-only do painel direito mostra o código `.mon` reconstruído.
- **Resposta do sistema (back)**: `POST /api/transpile/reverse` em modo API; offline gera no browser.
- **Estado da UI após**: editor central com `main.c` em modo `c` (cores diferentes do dotmon); painel direito com `.mon` em modo `dotmon`; terminal exibe `[info] Reverse transpile finished in 1.8 ms`.
- **Caminho feliz / erro / edge cases**: construções C não suportadas (ponteiros complexos, structs aninhados) → comentário inline `// [unsupported] …` no `.mon` gerado e warning na aba Erros; abrir `.c` que não foi gerado pela IDE pode produzir resultado parcial.
- **Atalhos de teclado**: `Ctrl+B` é o gatilho; `Ctrl+Shift+R` (alternativo) força reverse mesmo em `.mon`.
- **Esboço visual**:

```
│ [main.mon (transpiled) ●][Erros][AST]              REVERSE        │
│ ───────────────────────────────────────────────────────────────── │
│ 1 Start {                                                         │
│ 2   Baby idade = 5;                                               │
│ 3   Moji nome = "Agumon";                                         │
│ 4   Show("Olá, %s", nome);                                        │
│ 5   Evo (idade > 3) {                                             │
│ 6     Show("Cresceu!");                                           │
│ 7   }                                                             │
│ 8 } Finish                                                        │
```
- **Anotações de microinteração**: a label da aba do painel direito tem transição cross-fade de 200ms entre `generated/main.c` ↔ `main.mon (transpiled)`; badge `REVERSE` substitui `AUTO-GENERATED` com fade.

---

### Ato VI — Terminal e backend

---

**Frame 27 — Comando `help` lista todos os comandos**
────────────────────────────────────────
- **Objetivo do usuário**: descobrir os comandos disponíveis no terminal embutido.
- **Pré-condição**: Bottom Panel na aba Terminal; prompt vazio.
- **Ação do usuário**: digita `help` e pressiona `Enter`.
- **Resposta do sistema (front)**: o terminal processa o comando localmente (não requer backend) e imprime uma tabela formatada:

```
[info] Comandos disponíveis:

  dotmon compile <arquivo>   Compila um arquivo .mon em .c
  dotmon compile all         Compila todos os .mon do projeto
  ls                          Lista arquivos do workspace
  cat <arquivo>               Mostra o conteúdo de um arquivo
  clear                       Limpa o terminal
  help                        Mostra esta mensagem
```

- **Resposta do sistema (back)**: nenhuma.
- **Estado da UI após**: prompt reaparece pronto para próximo comando; histórico do terminal mantém as linhas.
- **Caminho feliz / erro / edge cases**: comando desconhecido → `terminal-error`: `Comando 'xyz' não encontrado. Use 'help'.`; setas ↑ ↓ navegam histórico de comandos.
- **Atalhos de teclado**: `Ctrl+L` limpa o terminal (equivalente a `clear`); `Ctrl+C` cancela input atual.
- **Esboço visual**:

```
│ [Terminal ●][Output][Build][Debug]                   [🗑][⤢]    │
│ dotmon@project ~/dotmon-project $ help                          │
│ [info] Comandos disponíveis:                                    │
│                                                                 │
│   dotmon compile <arquivo>   Compila um arquivo .mon em .c     │
│   dotmon compile all         Compila todos os .mon do projeto  │
│   ls                          Lista arquivos do workspace      │
│   cat <arquivo>               Mostra o conteúdo de um arquivo  │
│   clear                       Limpa o terminal                 │
│   help                        Mostra esta mensagem             │
│                                                                 │
│ dotmon@project ~/dotmon-project $ █                            │
```
- **Anotações de microinteração**: tabela alinhada via tab-stop CSS; nomes de comando em `#dcdcaa`; descrições em `#9ca3af`.

---

**Frame 28 — Comando `ls` retorna árvore real do workspace via WebSocket**
────────────────────────────────────────
- **Objetivo do usuário**: ver o que está realmente no servidor (não no cache da árvore).
- **Pré-condição**: Status Bar `● API`; conexão WebSocket aberta em `ws://localhost:8000/ws/terminal`.
- **Ação do usuário**: digita `ls` + Enter.
- **Resposta do sistema (front)**: envia mensagem `{ "cmd": "ls" }` pelo WebSocket; recebe `{ "stdout": "src/\n  main.mon\n  helpers.mon\n  combat/\n    battle.mon\ngenerated/\n  main.c\nconfig/\nREADME.md\n" }` e renderiza linha a linha como `terminal-muted`.
- **Resposta do sistema (back)**: servidor FastAPI executa `os.walk('workspace/')` e responde via WS.
- **Estado da UI após**: novas linhas no terminal; prompt reaparece.
- **Caminho feliz / erro / edge cases**: se modo Local (sem WS), comando responde `[error] ls requer backend (● API)`; se WS desconectar no meio, linha `[error] WebSocket closed (1006)`.
- **Atalhos de teclado**: nenhum.
- **Esboço visual**:

```
│ dotmon@project ~/dotmon-project $ ls                           │
│ src/                                                            │
│   main.mon                                                      │
│   helpers.mon                                                   │
│   combat/                                                       │
│     battle.mon                                                  │
│ generated/                                                      │
│   main.c                                                        │
│ config/                                                         │
│ README.md                                                       │
│ dotmon@project ~/dotmon-project $ █                            │
```
- **Anotações de microinteração**: linhas chegam em stream — cada chunk aparece progressivamente, simulando latência real do WS.

---

**Frame 29 — Comando `cat src/main.mon` exibe conteúdo via backend**
────────────────────────────────────────
- **Objetivo do usuário**: ver o conteúdo bruto sem abrir o arquivo no editor.
- **Pré-condição**: backend conectado; arquivo existe.
- **Ação do usuário**: digita `cat src/main.mon` + Enter.
- **Resposta do sistema (front)**: envia `{ "cmd": "cat", "path": "src/main.mon" }` via WS; recebe `stdout` com o conteúdo; renderiza com tipografia monoespaçada e cores neutras `#d4d4d4`.
- **Resposta do sistema (back)**: backend lê o arquivo e devolve; aplica limite de 64KB para evitar travar o terminal.
- **Estado da UI após**: conteúdo impresso no terminal; prompt retorna.
- **Caminho feliz / erro / edge cases**: arquivo > 64KB → `terminal-muted: [truncado em 64KB]` ao final; arquivo inexistente → `terminal-error: cat: src/foo.mon: arquivo não encontrado`; sem permissão → `Permission denied`.
- **Atalhos de teclado**: nenhum.
- **Esboço visual**:

```
│ dotmon@project ~/dotmon-project $ cat src/main.mon             │
│ Start {                                                         │
│   Baby idade = 5;                                               │
│   Moji nome = "Agumon";                                         │
│   Show("Olá, %s", nome);                                        │
│   Evo (idade > 3) {                                             │
│     Show("Cresceu!");                                           │
│   }                                                             │
│ } Finish                                                        │
│ dotmon@project ~/dotmon-project $ █                            │
```
- **Anotações de microinteração**: cada linha do conteúdo aparece com latência mínima (não animada) para se distinguir das mensagens `[info]/[success]`.

---

**Frame 30 — `dotmon compile all` compila em lote**
────────────────────────────────────────
- **Objetivo do usuário**: compilar todos os `.mon` do projeto de uma vez.
- **Pré-condição**: vários `.mon` no workspace (`main.mon`, `helpers.mon`, `combat/battle.mon`).
- **Ação do usuário**: digita `dotmon compile all` + Enter.
- **Resposta do sistema (front)**: o front itera sobre todos os `.mon` da árvore, executa o pipeline para cada um e imprime no terminal:

```
[info] Compiling src/main.mon…
[success] → generated/main.c (412 bytes, 0 errors)
[info] Compiling src/helpers.mon…
[success] → generated/helpers.c (218 bytes, 0 errors)
[info] Compiling src/combat/battle.mon…
[error]  battle.mon:2:11 Tipo incompatível…
[error]  ✗ Compilation failed (1 error)
─────────────────────────────────────────────
[info] Build summary: 2 succeeded, 1 failed.
```

- **Resposta do sistema (back)**: cada `.c` gerado é gravado em `workspace/generated/` via `POST /api/compile`; sumário consolidado é só client-side.
- **Estado da UI após**: aba C Gerado mostra o último compilado com sucesso (`generated/helpers.c`); aba Erros lista o erro de `battle.mon`; Status Bar `⨯ 1`.
- **Caminho feliz / erro / edge cases**: workspace sem `.mon` → `[info] Nenhum arquivo .mon encontrado`; falha em todos → `Build summary: 0 succeeded, N failed`.
- **Atalhos de teclado**: nenhum dedicado.
- **Esboço visual**: vide bloco acima.
- **Anotações de microinteração**: cada `[success]` recebe ícone `✓` verde; `[error]` recebe `✗` vermelho; linha final do sumário tem background `#2d2d30` para se destacar.

---

### Ato VII — Painéis auxiliares (AST, Output, Build)

---

**Frame 31 — Aba AST renderizada após compilação**
────────────────────────────────────────
- **Objetivo do usuário**: inspecionar a estrutura sintática do programa.
- **Pré-condição**: compilação realizada com sucesso (Frame 20).
- **Ação do usuário**: clica na aba **AST** no painel direito.
- **Resposta do sistema (front)**: o painel mostra a árvore sintática como texto indentado, com nós em cores semânticas:

```
Program
├── MainBlock (Start..Finish)
│   ├── VarDecl  Baby idade = NumberLiteral(5)
│   ├── VarDecl  Moji nome = StringLiteral("Agumon")
│   ├── FunctionCall Show
│   │    ├── arg: StringLiteral("Olá, %s")
│   │    └── arg: Identifier(nome)
│   └── IfStmt
│        ├── cond: BinaryExpr(Identifier(idade) > NumberLiteral(3))
│        └── then:
│             └── FunctionCall Show("Cresceu!")
```

Os nomes de nó (`Program`, `MainBlock`, `VarDecl`, etc.) em `#c586c0`; identificadores em `#9cdcfe`; literais em `#b5cea8` (números) ou `#ce9178` (strings).
- **Resposta do sistema (back)**: nenhuma — AST gerada no browser.
- **Estado da UI após**: árvore expansível (cliques nas `├──` colapsam/expandem ramos); botão `[Copiar JSON]` no topo permite exportar a AST como JSON estruturado.
- **Caminho feliz / erro / edge cases**: erro de parsing → AST mostra o que conseguiu até o ponto do erro + nó `<parse-error>` em vermelho; AST muito grande (>500 nós) usa virtualização.
- **Atalhos de teclado**: nenhum específico.
- **Esboço visual**: vide bloco acima.
- **Anotações de microinteração**: hover sobre um nó destaca a região correspondente no editor (highlight amarelo translúcido por 600ms).

---

**Frame 32 — Abas Output e Build simulando build para Arduino**
────────────────────────────────────────
- **Objetivo do usuário**: ver mensagens de pipeline de build físico (futuro Arduino).
- **Pré-condição**: compilação concluída; usuário curioso sobre o destino final.
- **Ação do usuário**: clica em **Output**, depois em **Build**.
- **Resposta do sistema (front)**:
  - **Output**: mensagens informativas estilo IDE:
    ```
    Build target: Arduino Uno (ATmega328P)
    Output dir:   workspace/generated/
    Toolchain:    avr-gcc (simulado)
    ```
  - **Build**: saída simulada de comandos shell:
    ```
    $ gcc -o main generated/main.c -Wall -Wextra
    generated/main.c: 0 warnings
    ✓ Build succeeded (simulated). Binary: main (8.2 KB)
    ─────────────────────────────────────────────
    Note: integração real com avr-gcc planejada para roadmap v0.5
    ```
- **Resposta do sistema (back)**: nenhuma — saída atual é mock; futuramente `POST /api/build`.
- **Estado da UI após**: aba escolhida ativa; conteúdo persiste até nova compilação.
- **Caminho feliz / erro / edge cases**: nenhuma compilação anterior → ambas as abas mostram estado vazio: `Compile a .mon file to see build output.`.
- **Atalhos de teclado**: nenhum específico.
- **Esboço visual** (Build ativa):

```
│ [Terminal][Output][Build ●][Debug]                  [🗑][⤢]    │
│ $ gcc -o main generated/main.c -Wall -Wextra                   │
│ generated/main.c: 0 warnings                                    │
│ ✓ Build succeeded (simulated). Binary: main (8.2 KB)            │
│ ─────────────────────────────────────────────                   │
│ Note: integração real com avr-gcc planejada para roadmap v0.5   │
```
- **Anotações de microinteração**: aba **Debug** permanece mostrando `No active debug session.` em cinza `#737373` centralizado — placeholder honesto.

---

### Ato VIII — Configurações, atalhos e estados especiais

---

**Frame 33 — Overlay de Configurações: altera font size e ativa auto-compile**
────────────────────────────────────────
- **Objetivo do usuário**: personalizar a IDE.
- **Pré-condição**: IDE em uso normal.
- **Ação do usuário**: clica no ícone **⚙** da Title Bar (ou na Activity Bar).
- **Resposta do sistema (front)**: abre um modal centralizado (largura 560px) com fundo `rgba(0,0,0,0.55)`. Campos:

```
┌──────────────────────────────────────────────────────────┐
│  Configurações                                     [×]   │
│  ───────────────────────────────────────────────────────  │
│                                                          │
│  Editor                                                  │
│    Tamanho da fonte         [ 14 ] px        [▾]         │
│    Tamanho do tab           [  4 ] espaços   [▾]         │
│    Word wrap                [ ⬤ off  ○ on ]              │
│    Minimap                  [ ○ off  ⬤ on  ]              │
│                                                          │
│  Compilação                                              │
│    Compilar ao salvar       [ ○ off  ⬤ on  ]              │
│                                                          │
│                                  [ Cancelar ]  [ Salvar ] │
└──────────────────────────────────────────────────────────┘
```

Usuário troca `14` para `16`, ativa "Compilar ao salvar", clica em **Salvar**.
- **Resposta do sistema (back)**: `POST /api/preferences` em modo API; `localStorage.setItem('dotmon.prefs', …)` sempre.
- **Estado da UI após**: editor re-renderiza com fonte 16px; toast `[info] Configurações salvas.`; daqui pra frente, cada `Ctrl+S` em um `.mon` dispara automaticamente o pipeline de compilação.
- **Caminho feliz / erro / edge cases**: clicar fora do modal ou pressionar `Esc` aciona "Cancelar"; valores inválidos (font size <8 ou >32) recebem borda vermelha e impedem o "Salvar".
- **Atalhos de teclado**: `Ctrl+,` abre o modal; `Esc` cancela; `Enter` salva.
- **Esboço visual**: vide bloco acima.
- **Anotações de microinteração**: o modal entra com `scale(0.96)→1` + `opacity 0→1` em 180ms; toggles têm transição suave de "knob" 160ms.

---

**Frame 34 — Redimensionar sidebar, painel direito e painel inferior**
────────────────────────────────────────
- **Objetivo do usuário**: ajustar layout para ter mais espaço no editor.
- **Pré-condição**: layout default.
- **Ação do usuário**: arrasta o handle entre Sidebar e Editor (4px); depois o handle entre Editor e Painel Direito; depois o handle horizontal sobre o Bottom Panel.
- **Resposta do sistema (front)**: ao hover, cada handle ganha cor `#0e7490` e cursor `col-resize` (vertical) ou `row-resize` (horizontal); durante o drag, as larguras/alturas se ajustam em tempo real, respeitando mínimos (Sidebar 180px, Painel Direito 280px, Bottom Panel 80px) e máximos (50% da viewport).
- **Resposta do sistema (back)**: `POST /api/preferences` com `{ layout: { sidebar_w, right_w, bottom_h } }` ao final do drag (debounce 400ms); offline persiste local.
- **Estado da UI após**: layout permanece após reload; valores guardados.
- **Caminho feliz / erro / edge cases**: duplo-clique no handle reseta a região ao tamanho padrão; arrastar abaixo do mínimo "trava" no mínimo (não fecha o painel).
- **Atalhos de teclado**: `Ctrl+B` toggla a Sidebar (oculta/mostra); `Ctrl+J` toggla Bottom Panel; `Ctrl+Alt+B` toggla Painel Direito.

  > **Atenção**: como `Ctrl+B` é usado para **compilar**, o toggle da sidebar é mapeado para `Ctrl+Shift+B` na dotmon IDE para evitar conflito.

- **Esboço visual** (handle em drag):

```
│Sidebar│║│         Editor          │║│ Right │
│       │║│                         │║│       │
│       │║│                         │║│       │
        ▲                          ▲
   handle (col-resize)        handle (col-resize)
```
- **Anotações de microinteração**: handle pisca leve em `#0e7490` no início do drag; cursor muda para o ícone apropriado; cada região mantém aspecto durante o resize sem reflows quebrados.

---

**Frame 35 — Modo offline: backend cai, status muda para `○ Local`**
────────────────────────────────────────
- **Objetivo do usuário**: continuar trabalhando sem perder dados quando o servidor falha.
- **Pré-condição**: IDE em modo API (`● API`); backend FastAPI é encerrado externamente.
- **Ação do usuário**: digita no editor, pressiona `Ctrl+S`, segue trabalhando.
- **Resposta do sistema (front)**:
  - Um `PUT /api/files/...` falha (timeout ou ECONNREFUSED); o handler entra em modo degradado: indicador da Status Bar troca para `○ Local` (cinza), com tooltip ao hover: `Backend indisponível — salvando em localStorage. Última conexão: HH:MM:SS`.
  - Toast no Terminal: `[warn] Conexão com o backend perdida. Modo Local ativado.`
  - Cada save subsequente persiste em `localStorage` (chave por path); a árvore continua editável.
  - Comandos `ls` e `cat` no terminal passam a responder `[error] Requer ● API`.
- **Resposta do sistema (back)**: nenhuma.
- **Estado da UI após**: trabalho continua sem perda; uma fila interna `pending_sync[]` registra cada operação para sincronização futura.
- **Caminho feliz / erro / edge cases**:
  - **Reconexão**: a IDE faz polling silencioso a `GET /api/health` a cada 8s. Quando responde `200`:
    - Status volta para `● API`.
    - Toast `[success] Backend reconectado. Sincronizando…`.
    - Fila `pending_sync` é drenada em ordem (PUT/POST/DELETE/PATCH); cada item processado emite `[muted]  ✓ src/main.mon sincronizado`.
    - Em caso de conflito (arquivo mudou no servidor), modal pergunta: `Manter versão local? [Local] [Servidor] [Diff]`.
- **Atalhos de teclado**: nenhum específico.
- **Esboço visual** (Status Bar durante transição):

```
│ ⎇ main │ ⨯0 ⚠0 │ Ln3,Col12 │ UTF-8 │ dotmon │ ● API   │   →   queda
│ ⎇ main │ ⨯0 ⚠0 │ Ln3,Col12 │ UTF-8 │ dotmon │ ○ Local │   →   reconectou
│ ⎇ main │ ⨯0 ⚠0 │ Ln3,Col12 │ UTF-8 │ dotmon │ ● API   │
```
- **Anotações de microinteração**: ao cair, o indicador pisca em amarelo `#f59e0b` por 600ms antes de assentar em cinza; ao reconectar, o pulso verde radial do Frame 3 se repete; toasts empilham sem cobrir o terminal.

---

**Frame 36 — Overview final: IDE preenchida com todos os painéis ativos**
────────────────────────────────────────
- **Objetivo do usuário**: visualizar a IDE em pleno uso, todas as funcionalidades ativas.
- **Pré-condição**: usuário trabalhou ao longo dos frames anteriores; 3 abas abertas, compilação feita, terminal usado, configurações ajustadas.
- **Ação do usuário**: nenhuma — frame contemplativo.
- **Resposta do sistema (front)**: estado consolidado:
  - Title Bar: `main.mon — dotmon IDE`, badge `⚠ 1` visível (1 warning residual).
  - Activity Bar: Explorer ativo.
  - Sidebar: árvore expandida com `src/`, `combat/`, `generated/`, `config/`, `README.md`; arquivo ativo destacado.
  - Editor: 3 abas (`main.mon` ativa, `helpers.mon`, `battle.mon`), breadcrumb, código colorizado, gutter com 1 ícone de warning.
  - Painel Direito: aba **C Gerado** mostrando `generated/main.c` com badge `AUTO-GENERATED`.
  - Bottom Panel: Terminal com histórico de comandos (`help`, `ls`, `dotmon compile all`).
  - Status Bar: `⎇ main │ ⨯ 0  ⚠ 1 │ C Generated │ Ln 5, Col 18 │ Spaces:4 │ UTF-8 │ LF │ dotmon │ ● API`.
- **Resposta do sistema (back)**: nenhuma — apenas estado vigente.
- **Estado da UI após**: idêntico ao acima; é o "estado canônico" para fins de documentação visual e referência de Figma.
- **Caminho feliz / erro / edge cases**: n/a.
- **Atalhos de teclado**: todos previamente descritos disponíveis.
- **Esboço visual** (overview detalhada):

```
┌── ●●●           main.mon — dotmon IDE       [🔍][▶][📄][⚠¹][⚙]──┐
│A│ ▾ EXPLORER          │ ⓘmain × │ⓘhelpers ×│ⓘbattle ×⊕│ [C Gerado●][Erros¹][AST]   │
│c│ DOTMON-PROJECT      │ dotmon-proj › src › main.mon  │ generated/main.c  AUTO-GEN │
│t│  ▾ src/             │ 1 Start {                     │ [Copiar][Exportar][⟳]      │
│i│   ⓜ main ◀          │ 2   Baby idade = 5;           │ 1 #include <stdio.h>       │
│v│   ⓜ helpers         │ 3   Moji nome = "Agumon";     │ 2 #include <string.h>      │
│ │   ▾ combat/         │ 4   ⚠ Baby unused = 0;        │ 3 #include <stdbool.h>     │
│B│    ⓜ battle         │ 5   Show("Olá, %s", nome);    │ 4                          │
│a│  ▾ generated/       │ 6   Evo (idade > 3) {         │ 5 int main(void) {         │
│r│   ⓒ main.c          │ 7     Show("Cresceu!");       │ 6   int idade = 5;         │
│ │  ▸ config/          │ 8   }                         │ 7   char nome[256];        │
│ │  □ README.md        │ 9 } Finish                    │ 8   strcpy(nome,"Agumon"); │
│ │                     │                               │ 9   printf("Olá, %s",nome);│
├──┴─────────────────────┴───────────────────────────────┴────────────────────────────┤
│ [Terminal●][Output][Build][Debug]                                       [🗑][⤢]    │
│ dotmon@project ~/dotmon-project $ dotmon compile all                                │
│ [info] Build summary: 3 succeeded, 0 failed.                                        │
│ dotmon@project ~/dotmon-project $ █                                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ ⎇ main │ ⨯0 ⚠1 │ C Generated │ Ln5,Col18 │ Spaces:4 │ UTF-8 │ LF │ dotmon │ ● API   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```
- **Anotações de microinteração**: este é o estado de descanso; nenhuma animação ativa exceto o caret piscando no terminal e o leve pulse do indicador `● API`.

---

## 4. Tabela de Rastreabilidade

Mapeamento entre cada funcionalidade do checklist (seção 4 do prompt original) e os frames que a cobrem, mais o componente UI envolvido.

| Funcionalidade | Frame(s) que a cobrem | Componente UI envolvido |
|---|---|---|
| Traffic lights macOS (decorativos) | 1, 2, 36 | Title Bar |
| Título central `<arquivo>.mon — dotmon IDE` | 2, 36 | Title Bar |
| Botão Search da Title Bar | 2, 36 | Title Bar > Search |
| Botão Compilar (▶) | 20, 25, 36 | Title Bar > Compile |
| Botão Gerar C (📄) | 24, 36 | Title Bar > Gerar C |
| Botão Erros (⚠) com badge | 17, 22, 23, 36 | Title Bar > Erros |
| Botão Configurações (⚙) | 33 | Title Bar > Settings |
| Activity Bar (5 ícones superiores) | 2, 4, 36 | Activity Bar |
| Activity Bar (2 ícones inferiores) | 4, 33 | Activity Bar |
| Header EXPLORER + ações (novo arquivo, nova pasta, importar, atualizar) | 10, 11, 12 | Sidebar > Header |
| Workspace `DOTMON-PROJECT` colapsável | 2, 36 | Sidebar > Tree root |
| File tree com `src/`, `generated/`, `config/`, `README.md` | 2, 4, 36 | Sidebar > Tree |
| Ícones diferenciados `M` laranja / `C` azul | 2, 5, 26, 36 | Sidebar > Tree item |
| Pasta aberta vs fechada + chevron | 2, 12 | Sidebar > Tree |
| Arquivo ativo destacado | 5, 36 | Sidebar > Tree active item |
| Context menu de arquivo (8 itens) | 7, 8, 9 | Sidebar > Context menu |
| Context menu de pasta (4 itens) | 12 | Sidebar > Folder context menu |
| Drag & drop de `.mon` externo | 10 | Sidebar > Drop zone |
| Múltiplas abas simultâneas | 5, 6, 36 | Editor > Tabs |
| Ícone do tipo de arquivo + botão `×` | 5, 6 | Editor > Tab |
| Aba ativa vs inativa | 5, 6, 36 | Editor > Tab styles |
| Aba modificada (ponto/asterisco) | 6 | Editor > Tab modified state |
| Breadcrumb sob as abas | 5, 6, 12, 36 | Editor > Breadcrumb |
| Linguagem `dotmon` registrada (Monarch) | 13 | Monaco tokenizer |
| Tema dark próprio (cores hex) | 13 | Monaco theme |
| Syntax highlighting (keywords/tipos/built-ins/strings/números/comentários/identificadores) | 13 | Monaco |
| Autocompletion contextual | 14 | Monaco completion provider |
| Snippets (`Start...Finish`, `Evo...`, `Show()`, `Ask()`, `Loop`, `Spiral`, `Xros`) | 15 | Monaco snippets |
| Hover provider com tooltips | 16 | Monaco hover provider |
| Diagnóstico em tempo real (debounce 500ms) | 17, 18, 19 | Monaco markers + analyzer |
| Error Lens (inline + gutter + highlight) | 17, 18, 19, 23 | Monaco decorations |
| Minimap | 13 | Monaco minimap |
| Bracket pair colorization | 13 | Monaco |
| Smooth scrolling | 13 | Monaco |
| Aba **C Gerado** read-only com badge AUTO-GENERATED | 20, 24, 25, 36 | Painel Direito > C Gerado |
| Botões Copiar / Exportar .c / Regenerar | 24, 25 | Painel Direito > C Gerado actions |
| Aba **Erros** com contagem e lista clicável | 22, 23, 36 | Painel Direito > Erros |
| Filtrar / Limpar na aba Erros | 22, 23 | Painel Direito > Erros toolbar |
| Aba **AST** com árvore textual | 31, 36 | Painel Direito > AST |
| **Terminal** com prompt e tipos de linha | 21, 27, 28, 29, 30 | Bottom Panel > Terminal |
| Comando `dotmon compile <arquivo>` | 21 (implícito), 30 | Terminal |
| Comando `dotmon compile all` | 30 | Terminal |
| Comando `ls` via WebSocket | 28 | Terminal + WS |
| Comando `cat <arquivo>` via WS | 29 | Terminal + WS |
| Comando `clear` / `help` | 27 | Terminal |
| Aba **Output** (pipeline) | 32 | Bottom Panel > Output |
| Aba **Build** (gcc simulado) | 32 | Bottom Panel > Build |
| Aba **Debug** (placeholder) | 32 | Bottom Panel > Debug |
| Limpar terminal / recolher painel | 27, 32 | Bottom Panel toolbar |
| Branch git + contadores na Status Bar | 22, 23, 36 | Status Bar |
| Indicador "C Generated" | 20, 36 | Status Bar |
| Posição Ln/Col, Spaces, UTF-8, LF, dotmon | 2, 36 | Status Bar |
| Indicador de backend `● API` / `○ Local` | 3, 35, 36 | Status Bar > Backend indicator |
| Overlay de Configurações (modal) | 33 | Settings Modal |
| Persistência de preferências | 33 | localStorage + API |
| Auto-compile ao salvar | 33 | Settings + save handler |
| Lexer → tokens (49 tipos) | 17, 18, 19, 20, 23 | Pipeline / Analyzer |
| Parser recursivo → AST | 20, 31 | Pipeline |
| Analisador semântico (escopo, redeclaração, tipos, não usada) | 17, 18, 19, 23 | Pipeline |
| Code generator → C com `#include` e formatos corretos | 20, 24 | Pipeline > CodeGen |
| Transpilação reversa C → dotmon | 26 | Pipeline reverso + Painel Direito |
| Persistência modo API (`PUT /api/files/{path}` etc.) | 6, 7, 8, 9, 10, 11, 12, 20, 33, 34 | REST handler |
| Persistência modo Local (`localStorage`) | 2, 35 | Storage layer |
| Reconexão automática | 35 | Health poller |
| Atalho `Ctrl+B` (Compilar) | 20, 23, 26 | Keymap |
| Atalho `Ctrl+S` (Salvar) | 6, 33, 35 | Keymap |
| Atalho `Ctrl+F` (Buscar Monaco) | 13 (mencionado) | Monaco |
| `Ctrl+Z` / `Ctrl+Y` | 13 (implícito) | Monaco |
| Handles de redimensionamento (sidebar/editor/painel direito/bottom) | 34 | Layout splitters |
| Hover em botões da Title Bar | 24, 25, 33 | Title Bar buttons |
| Toast `[info] Compilation finished in X ms` | 21, 30 | Terminal toast |
| Badge vermelho no `Erros` da Title Bar e da aba | 17, 23, 36 | Title Bar + Painel Direito |
| Auto-switch para aba Erros ao surgir problema | 23 | Right Panel router |
| Re-foco em aba **C Gerado** após compilação bem-sucedida | 20 | Right Panel router |

> Cobertura: todos os 15 grupos do checklist da seção 4 do prompt aparecem ao menos uma vez nesta tabela.

---

## 5. Apêndice A — Atalhos de Teclado Consolidados

| Atalho | Ação | Frame de referência |
|---|---|---|
| `Ctrl+B` | Compilar arquivo atual (`.mon` → C; ou `.c` → dotmon reverso) | 20, 23, 26 |
| `Ctrl+S` | Salvar arquivo atual (dispara auto-compile se habilitado) | 6, 33, 35 |
| `Ctrl+W` | Fechar aba ativa | 6 |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Cicla próxima/anterior aba | 5, 6 |
| `Ctrl+N` | Novo arquivo `.mon` | 11 |
| `Ctrl+F` | Buscar no editor (Monaco nativo) | 13 |
| `Ctrl+H` | Buscar e substituir (Monaco nativo) | — |
| `Ctrl+Z` / `Ctrl+Y` | Desfazer / Refazer | 13 (implícito) |
| `Ctrl+/` | Comentar/descomentar linha | 13 |
| `Ctrl+Space` | Forçar autocomplete | 14 |
| `Ctrl+K Ctrl+I` | Mostrar hover na posição do cursor | 16 |
| `F2` | Renomear item selecionado na sidebar | 7 |
| `Delete` | Excluir item selecionado na sidebar (com confirmação) | 9 |
| `F8` / `Shift+F8` | Ir para próximo/anterior erro/warning | 17, 23 |
| `Esc` | Cancelar modal/popover/input inline | 6, 7, 9, 33 |
| `Enter` | Confirmar input inline / modal padrão | 7, 11, 33 |
| `Ctrl+,` | Abrir Configurações | 33 |
| `Ctrl+Shift+B` | Toggle Sidebar | 34 |
| `Ctrl+J` | Toggle Bottom Panel | 34 |
| `Ctrl+Alt+B` | Toggle Painel Direito | 34 |
| `` Ctrl+` `` | Focar Terminal | 21 |
| `Ctrl+L` | Limpar Terminal (equivalente a `clear`) | 27 |
| `Ctrl+C` (no terminal) | Cancelar input atual do terminal | 27 |
| `↑` / `↓` (no terminal) | Navegar histórico de comandos | 27 |
| `Ctrl+Shift+R` | Forçar transpile reverso mesmo em `.mon` | 26 |

---

## 6. Apêndice B — Glossário dotmon → C

### Tipos

| dotmon | C (gerado) | Observação |
|---|---|---|
| `Baby` | `int` | Inteiro 32-bit |
| `Pup` | `float` | Ponto flutuante |
| `Rook` | `long` | Inteiro longo |
| `Champ` | `int` | Inteiro (alias semântico) |
| `Moji` | `char[256]` | String com buffer fixo de 256 chars |
| `Bit` | `bool` | Requer `#include <stdbool.h>` |

### Estruturas de bloco

| dotmon | C (gerado) |
|---|---|
| `Start { ... } Finish` | `int main(void) { ... return 0; }` |
| `Evo (cond) { ... }` | `if (cond) { ... }` |
| `AltEvo (cond) { ... }` | `else if (cond) { ... }` |
| `FailEvo { ... }` | `else { ... }` |

### Loops e controle

| dotmon | C (gerado) |
|---|---|
| `Loop (init; cond; step) { ... }` | `for (init; cond; step) { ... }` |
| `Loop (cond) { ... }` (forma 1-arg) | `while (cond) { ... }` |
| `Spiral (cond) { ... }` | `while (cond) { ... }` (idiomático para "loop até") |
| `Jam;` | `break;` |
| `Skip;` | `continue;` |

### Funções

| dotmon | C (gerado) |
|---|---|
| `Xros tipo nome(args) { ... } Send valor;` | `tipo nome(args) { ... return valor; }` |
| `Send;` (em `void`) | `return;` |
| `Call nome(args);` | `nome(args);` |

### I/O

| dotmon | C (gerado) | Especificadores aplicados automaticamente |
|---|---|---|
| `Show("texto", arg);` | `printf("texto", arg);` | `%d` para `Baby`/`Champ`, `%ld` para `Rook`, `%f` para `Pup`, `%s` para `Moji`, `%d` para `Bit` |
| `Ask(&var);` | `scanf("%spec", &var);` | `&` aplicado a numéricos; `Moji` lê sem `&` |
| `Moji nome = "txt";` | `char nome[256]; strcpy(nome, "txt");` | inclui `<string.h>` automaticamente |

### Escopo

| dotmon | C (gerado) |
|---|---|
| `World` | escopo global (fora de qualquer função) |
| `Core` | escopo local (dentro de `Start..Finish` ou `Xros..`) |

### Diretivas implícitas

Toda compilação de um `.mon` gera, no topo do `.c`, as diretivas necessárias conforme o uso:

- `#include <stdio.h>` — sempre que houver `Show` ou `Ask`.
- `#include <string.h>` — sempre que houver `Moji`.
- `#include <stdbool.h>` — sempre que houver `Bit`.

### Operadores

Operadores aritméticos (`+ - * / %`), relacionais (`< > <= >= == !=`) e lógicos (`&& || !`) seguem **a mesma sintaxe** em dotmon e C — o code generator os repassa diretamente, sem mapeamento.

---

> **Fim do storyboard.** Documento concebido para servir como espelho fiel do frontend da dotmon IDE: cada frame é replicável no Figma e cada funcionalidade é testável pelo time de QA a partir dos campos "Resposta do sistema" e "Caminho feliz / erro / edge cases".

