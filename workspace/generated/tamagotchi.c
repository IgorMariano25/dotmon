// ============================================================
// DOTMON — Tamagotchi Virtual Pet (Arduino + OLED SSD1306)
// ============================================================
// Recursos:
//   * Selecao inicial do personagem (Agumon / Gabumon / Patamon)
//     com confirmacao no SEGUNDO clique do mesmo botao.
//   * Sistema de status: fome, felicidade e energia.
//   * Estados emocionais (FELIZ / COM_FOME / TRISTE / DORMINDO)
//     usando os bitmaps de estado.
//   * Display dividido: personagem (esquerda) + humor (direita).
// ============================================================

// Bibliotecas para comunicacao I2C e display OLED
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// Biblioteca com os bitmaps (fonte unica em bitmaps/bitmaps.h)
// Copie a pasta "bitmaps/" para junto do seu sketch .ino no Arduino IDE.
// Esse agregador ja inclui os estados (Feliz/ComFome/Dormindo/Triste)
// e os personagens (Agumon/Gabumon/Patamon).
#include "bitmaps.h"

// ─── Configuracao do display ────────────────────────────────
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ─── Pinos ──────────────────────────────────────────────────
#define BOTAO_ALIMENTAR 1
#define BOTAO_BRINCAR 2
#define BOTAO_DORMIR 3

// ─── Estados emocionais do bichinho ─────────────────────────
enum EstadoBichinho {
  FELIZ,
  COM_FOME,
  TRISTE,
  DORMINDO
};

EstadoBichinho estadoAtual = FELIZ;

// ─── Personagens selecionaveis ──────────────────────────────
enum DigimonSelecionado {
  DIGI_NENHUM = -1,
  DIGI_AGUMON = 0,
  DIGI_GABUMON = 1,
  DIGI_PATAMON = 2
};

DigimonSelecionado digimonAtual = DIGI_NENHUM;     // personagem confirmado
DigimonSelecionado candidatoSelecao = DIGI_NENHUM; // preview aguardando confirmacao
bool petSelecionado = false;                       // false ate confirmar a escolha

// ─── Status do bichinho (0 a 100) ───────────────────────────
int fome = 0;        // 0 = saciado, 100 = faminto
int felicidade = 80; // 0 = triste,  100 = muito feliz
int energia = 100;   // 0 = exausto, 100 = descansado
bool dormindo = false;

// ─── Controle de tempo ──────────────────────────────────────
unsigned long ultimoTick = 0;
const unsigned long intervaloTick = 3000; // a cada 3s atualiza os status

// ─── Deteccao de borda dos botoes ───────────────────────────
bool ultimoBotaoAlimentar = false;
bool ultimoBotaoBrincar = false;
bool ultimoBotaoDormir = false;

// ============================================================
// Funcoes auxiliares
// ============================================================

// Retorna o ponteiro do bitmap do personagem escolhido
const unsigned char *bitmapDoPersonagem(DigimonSelecionado digimon) {
  switch (digimon) {
    case DIGI_AGUMON:  return bitmapAgumon;
    case DIGI_GABUMON: return bitmapGabumon;
    case DIGI_PATAMON: return bitmapPatamon;
    default:           return bitmapAgumon;
  }
}

// Retorna o bitmap de humor correspondente ao estado
const unsigned char *bitmapDoEstado(EstadoBichinho estado) {
  switch (estado) {
    case FELIZ:    return bitmapFeliz;
    case COM_FOME: return bitmapComFome;
    case TRISTE:   return bitmapTriste;
    case DORMINDO: return bitmapDormindo;
    default:       return bitmapFeliz;
  }
}

// Nome textual do personagem
const char *nomeDigimon(DigimonSelecionado digimon) {
  switch (digimon) {
    case DIGI_AGUMON:  return "Agumon";
    case DIGI_GABUMON: return "Gabumon";
    case DIGI_PATAMON: return "Patamon";
    default:           return "Nenhum";
  }
}

// Nome textual do estado
const char *nomeEstado(EstadoBichinho estado) {
  switch (estado) {
    case FELIZ:    return "FELIZ";
    case COM_FOME: return "COM FOME";
    case TRISTE:   return "TRISTE";
    case DORMINDO: return "DORMINDO";
    default:       return "-";
  }
}

// Limita um valor entre 0 e 100
int limita(int v) {
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

// ============================================================
// Tela de selecao inicial do personagem
// ============================================================

// Desenha um personagem 64x64 centralizado no display
void desenharPersonagemCentral(DigimonSelecionado digimon) {
  display.drawBitmap(32, 0, bitmapDoPersonagem(digimon), 64, 64, SSD1306_WHITE);
}

void mostrarTelaSelecao(const char *linha1, const char *linha2, DigimonSelecionado preview) {
  display.clearDisplay();
  if (preview != DIGI_NENHUM) {
    desenharPersonagemCentral(preview);
  }
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(linha1);
  display.setCursor(0, 56);
  display.println(linha2);
  display.display();
}

// Processa a selecao com confirmacao no segundo clique do mesmo botao
void processarSelecaoInicial(bool cliqueAlimentar, bool cliqueBrincar, bool cliqueDormir) {
  DigimonSelecionado escolhido = DIGI_NENHUM;

  if (cliqueAlimentar) escolhido = DIGI_AGUMON;
  else if (cliqueBrincar) escolhido = DIGI_GABUMON;
  else if (cliqueDormir) escolhido = DIGI_PATAMON;
  else return; // nenhum clique novo

  // Primeiro clique (ou troca de personagem): apenas mostra o preview
  if (candidatoSelecao != escolhido) {
    candidatoSelecao = escolhido;
    mostrarTelaSelecao(nomeDigimon(escolhido), "Clique de novo p/ confirmar", escolhido);
    Serial.print("Preview: ");
    Serial.println(nomeDigimon(escolhido));
    return;
  }

  // Segundo clique no MESMO botao: confirma a escolha
  digimonAtual = escolhido;
  petSelecionado = true;
  candidatoSelecao = DIGI_NENHUM;

  // Reinicia os status para um novo bichinho
  fome = 0;
  felicidade = 80;
  energia = 100;
  dormindo = false;
  estadoAtual = FELIZ;
  ultimoTick = millis();

  mostrarTelaSelecao(nomeDigimon(digimonAtual), "Escolha confirmada!", digimonAtual);
  Serial.print("Digimon confirmado: ");
  Serial.println(nomeDigimon(digimonAtual));
  delay(800);
}

// ============================================================
// Logica de status e estado durante o jogo
// ============================================================

// Atualiza os status com o passar do tempo
void atualizarStatusPorTempo() {
  if (dormindo) {
    // Dormindo: recupera energia, fome sobe devagar
    energia = limita(energia + 15);
    fome = limita(fome + 3);
    // Acorda sozinho quando totalmente descansado
    if (energia >= 100) {
      dormindo = false;
      Serial.println("Acordou descansado!");
    }
  } else {
    // Acordado: fica com fome, gasta energia e perde felicidade aos poucos
    fome = limita(fome + 8);
    energia = limita(energia - 5);
    felicidade = limita(felicidade - 4);

    // Fome alta e exaustao reduzem a felicidade mais rapido
    if (fome > 70) felicidade = limita(felicidade - 4);
    if (energia < 20) felicidade = limita(felicidade - 3);
  }
}

// Define o estado emocional a partir dos status
EstadoBichinho calcularEstado() {
  if (dormindo) return DORMINDO;
  if (fome >= 70) return COM_FOME;
  if (felicidade <= 30) return TRISTE;
  return FELIZ;
}

// Acoes dos botoes durante o jogo
void alimentar() {
  fome = limita(fome - 35);
  felicidade = limita(felicidade + 5);
  Serial.println("Acao: ALIMENTAR");
}

void brincar() {
  if (energia < 15) {
    Serial.println("Sem energia para brincar!");
    return;
  }
  felicidade = limita(felicidade + 30);
  energia = limita(energia - 15);
  fome = limita(fome + 10);
  Serial.println("Acao: BRINCAR");
}

void alternarDormir() {
  dormindo = !dormindo;
  Serial.println(dormindo ? "Acao: DORMIR" : "Acao: ACORDAR");
}

// ============================================================
// Renderizacao do jogo
// ============================================================

// Desenha uma barra de status horizontal
void desenharBarra(int x, int y, int largura, int altura, int valor) {
  display.drawRect(x, y, largura, altura, SSD1306_WHITE);
  int preenchido = (long)(largura - 2) * limita(valor) / 100;
  if (preenchido > 0) {
    display.fillRect(x + 1, y + 1, preenchido, altura - 2, SSD1306_WHITE);
  }
}

void renderizarJogo() {
  display.clearDisplay();

  // Personagem escolhido a esquerda (64x64)
  display.drawBitmap(0, 0, bitmapDoPersonagem(digimonAtual), 64, 64, SSD1306_WHITE);

  // Carinha de humor a direita (64x64)
  display.drawBitmap(64, 0, bitmapDoEstado(estadoAtual), 64, 64, SSD1306_WHITE);

  // Faixa de informacoes na base
  display.fillRect(0, 54, SCREEN_WIDTH, 10, SSD1306_BLACK);
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(2, 56);
  display.print(nomeDigimon(digimonAtual));
  display.print(" ");
  display.print(nomeEstado(estadoAtual));

  display.display();
}

// Tela alternativa com barras de status (mostrada brevemente apos uma acao)
void renderizarStatus() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 0);
  display.print("Pet: ");
  display.println(nomeDigimon(digimonAtual));

  display.setCursor(0, 16);
  display.print("Fome");
  desenharBarra(40, 14, 80, 8, fome);

  display.setCursor(0, 30);
  display.print("Feliz");
  desenharBarra(40, 28, 80, 8, felicidade);

  display.setCursor(0, 44);
  display.print("Energ");
  desenharBarra(40, 42, 80, 8, energia);

  display.setCursor(0, 56);
  display.print("Estado: ");
  display.print(nomeEstado(estadoAtual));

  display.display();
}

// ============================================================
// setup() e loop()
// ============================================================

void setup() {
  Serial.begin(115200);
  Wire.begin();

  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  pinMode(BOTAO_ALIMENTAR, INPUT_PULLUP);
  pinMode(BOTAO_BRINCAR, INPUT_PULLUP);
  pinMode(BOTAO_DORMIR, INPUT_PULLUP);

  Serial.println("=== DOTMON Tamagotchi ===");
  Serial.println("Selecione seu pet:");
  Serial.println("BOTAO_ALIMENTAR = Agumon");
  Serial.println("BOTAO_BRINCAR   = Gabumon");
  Serial.println("BOTAO_DORMIR    = Patamon");
  Serial.println("Clique uma vez para ver, duas vezes (mesmo botao) para confirmar.");

  mostrarTelaSelecao("Escolha seu Digimon", "1x ver / 2x confirmar", DIGI_NENHUM);
}

void loop() {
  unsigned long tempoAtual = millis();

  // Leitura dos botoes (INPUT_PULLUP -> pressionado = LOW)
  bool botaoAlimentar = (digitalRead(BOTAO_ALIMENTAR) == LOW);
  bool botaoBrincar = (digitalRead(BOTAO_BRINCAR) == LOW);
  bool botaoDormir = (digitalRead(BOTAO_DORMIR) == LOW);

  // Deteccao de borda de subida (clique = transicao solto -> pressionado)
  bool cliqueAlimentar = botaoAlimentar && !ultimoBotaoAlimentar;
  bool cliqueBrincar = botaoBrincar && !ultimoBotaoBrincar;
  bool cliqueDormir = botaoDormir && !ultimoBotaoDormir;

  ultimoBotaoAlimentar = botaoAlimentar;
  ultimoBotaoBrincar = botaoBrincar;
  ultimoBotaoDormir = botaoDormir;

  // ─── Fase 1: selecao inicial do personagem ───────────────
  if (!petSelecionado) {
    processarSelecaoInicial(cliqueAlimentar, cliqueBrincar, cliqueDormir);
    delay(60);
    return;
  }

  // ─── Fase 2: jogo principal ──────────────────────────────
  bool houveAcao = false;

  if (cliqueAlimentar) {
    alimentar();
    houveAcao = true;
  }
  if (cliqueBrincar) {
    brincar();
    houveAcao = true;
  }
  if (cliqueDormir) {
    alternarDormir();
    houveAcao = true;
  }

  // Atualiza status periodicamente
  if (tempoAtual - ultimoTick >= intervaloTick) {
    ultimoTick = tempoAtual;
    atualizarStatusPorTempo();
  }

  // Recalcula o estado emocional
  estadoAtual = calcularEstado();

  // Apos uma acao, mostra rapidamente a tela de status com barras
  if (houveAcao) {
    renderizarStatus();
    delay(900);
  }

  // Tela principal do jogo (personagem + humor)
  renderizarJogo();

  delay(150);
}