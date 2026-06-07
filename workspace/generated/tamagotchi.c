// Bibliotecas para comunicação I2C e display OLED
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// Biblioteca com os bitmaps (fonte unica em bitmaps/bitmaps.h)
// Copie a pasta "bitmaps/" para junto do seu sketch .ino no Arduino IDE.
// Esse agregador ja inclui os estados (Feliz/ComFome/Dormindo/Triste)
// e os personagens (Agumon/Gabumon/Patamon).
#include "bitmaps.h"

// Define as dimensões do display OLED
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

// Cria objeto display com as dimensões e endereço padrão (0x3C)
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// Define os pinos dos botões
#define BOTAO_ALIMENTAR 1
#define BOTAO_BRINCAR 2
#define BOTAO_DORMIR 3

// Define o pino do buzzer ativo
#define BUZZER_PIN 6

// Enum para representar os estados possíveis do bichinho
enum EstadoBichinho
{
    FELIZ,
    COM_FOME,
    DORMINDO,
    TRISTE
};

// Variáveis para guardar o estado atual e anterior
EstadoBichinho estadoAtual = FELIZ;
EstadoBichinho estadoAnterior = FELIZ;

// Variáveis de tempo para controlar mudança de estado
unsigned long ultimoTempoEstado = 0;
const unsigned long intervaloFome = 10000;   // 10s para mudar para COM_FOME
const unsigned long intervaloTriste = 10000; // 10s para mudar para TRISTE

// Seleção inicial do pet (2 cliques: preview + confirmação)
enum DigimonSelecionado
{
    DIGI_NENHUM = -1,
    DIGI_AGUMON = 0,
    DIGI_GABUMON = 1,
    DIGI_PATAMON = 2
};

DigimonSelecionado digimonAtual = DIGI_NENHUM;
DigimonSelecionado candidatoSelecao = DIGI_NENHUM;
bool petSelecionado = false;

bool ultimoBotaoAlimentar = false;
bool ultimoBotaoBrincar = false;
bool ultimoBotaoDormir = false;

void desenharDigimonSelecionado(DigimonSelecionado digimon)
{
    switch (digimon)
    {
    case DIGI_AGUMON:
        display.drawBitmap(32, 0, bitmapAgumon, AGUMON_WIDTH, AGUMON_HEIGHT, SSD1306_WHITE);
        break;
    case DIGI_GABUMON:
        display.drawBitmap(32, 0, bitmapGabumon, GABUMON_WIDTH, GABUMON_HEIGHT, SSD1306_WHITE);
        break;
    case DIGI_PATAMON:
        display.drawBitmap(32, 0, bitmapPatamon, PATAMON_WIDTH, PATAMON_HEIGHT, SSD1306_WHITE);
        break;
    default:
        break;
    }
}

const char *nomeDigimon(DigimonSelecionado digimon)
{
    switch (digimon)
    {
    case DIGI_AGUMON:
        return "Agumon";
    case DIGI_GABUMON:
        return "Gabumon";
    case DIGI_PATAMON:
        return "Patamon";
    default:
        return "Nenhum";
    }
}

void mostrarTelaSelecao(const char *linha1, const char *linha2, DigimonSelecionado preview)
{
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println(linha1);
    display.setCursor(0, 10);
    display.println(linha2);
    if (preview != DIGI_NENHUM)
    {
        desenharDigimonSelecionado(preview);
    }
    display.display();
}

void processarSelecaoInicial(bool cliqueAlimentar, bool cliqueBrincar, bool cliqueDormir)
{
    DigimonSelecionado escolhido = DIGI_NENHUM;

    if (cliqueAlimentar)
        escolhido = DIGI_AGUMON;
    else if (cliqueBrincar)
        escolhido = DIGI_GABUMON;
    else if (cliqueDormir)
        escolhido = DIGI_PATAMON;
    else
        return;

    if (candidatoSelecao != escolhido)
    {
        candidatoSelecao = escolhido;
        mostrarTelaSelecao("1o clique: preview", nomeDigimon(escolhido), escolhido);
        Serial.print("Preview: ");
        Serial.println(nomeDigimon(escolhido));
        return;
    }

    // Segundo clique no mesmo botao confirma a escolha.
    digimonAtual = escolhido;
    petSelecionado = true;
    candidatoSelecao = DIGI_NENHUM;

    mostrarTelaSelecao("Escolha confirmada", nomeDigimon(digimonAtual), digimonAtual);
    Serial.print("Digimon confirmado: ");
    Serial.println(nomeDigimon(digimonAtual));
    delay(600);
}

// Função para tocar som diferente para cada estado
// Como usa buzzer ativo, diferencia pelo número de bips e duração
void tocarSom(EstadoBichinho estado)
{
    switch (estado)
    {
    case FELIZ:
        // 1 bip curto
        digitalWrite(BUZZER_PIN, HIGH);
        delay(200);
        digitalWrite(BUZZER_PIN, LOW);
        break;

    case COM_FOME:
        // 2 bips curtos
        for (int i = 0; i < 2; i++)
        {
            digitalWrite(BUZZER_PIN, HIGH);
            delay(150);
            digitalWrite(BUZZER_PIN, LOW);
            delay(100);
        }
        break;

    case TRISTE:
        // 3 bips curtos
        for (int i = 0; i < 3; i++)
        {
            digitalWrite(BUZZER_PIN, HIGH);
            delay(150);
            digitalWrite(BUZZER_PIN, LOW);
            delay(100);
        }
        break;

    case DORMINDO:
        // 1 bip longo
        digitalWrite(BUZZER_PIN, HIGH);
        delay(600);
        digitalWrite(BUZZER_PIN, LOW);
        break;
    }
}

void setup()
{
    // Inicializa comunicação serial para debug
    Serial.begin(115200);

    // Inicializa comunicação I2C
    Wire.begin();

    // Inicializa display OLED
    display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);

    // Configura pinos dos botões como entrada com pull-up interno
    pinMode(BOTAO_ALIMENTAR, INPUT_PULLUP);
    pinMode(BOTAO_BRINCAR, INPUT_PULLUP);
    pinMode(BOTAO_DORMIR, INPUT_PULLUP);

    // Configura pino do buzzer como saída e inicia desligado
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);

    // Inicializa estados
    estadoAtual = FELIZ;
    estadoAnterior = FELIZ;
    ultimoTempoEstado = millis();

    Serial.println("Estado inicial: FELIZ");
    Serial.println("Selecione seu pet:");
    Serial.println("BOTAO_ALIMENTAR = Agumon");
    Serial.println("BOTAO_BRINCAR = Gabumon");
    Serial.println("BOTAO_DORMIR = Patamon");
    Serial.println("Clique duas vezes no mesmo botao para confirmar.");

    mostrarTelaSelecao("Escolha seu Digimon", "2 cliques para confirmar", DIGI_NENHUM);

    // Toca som inicial
    tocarSom(estadoAtual);
}

void loop()
{
    unsigned long tempoAtual = millis();

    // Leitura dos botões (invertida pois usa INPUT_PULLUP)
    bool botaoAlimentar = (digitalRead(BOTAO_ALIMENTAR) == LOW);
    bool botaoBrincar = (digitalRead(BOTAO_BRINCAR) == LOW);
    bool botaoDormir = (digitalRead(BOTAO_DORMIR) == LOW);

    // Usa detecção de borda para não contar botão segurado como dois cliques.
    bool cliqueAlimentar = botaoAlimentar && !ultimoBotaoAlimentar;
    bool cliqueBrincar = botaoBrincar && !ultimoBotaoBrincar;
    bool cliqueDormir = botaoDormir && !ultimoBotaoDormir;

    ultimoBotaoAlimentar = botaoAlimentar;
    ultimoBotaoBrincar = botaoBrincar;
    ultimoBotaoDormir = botaoDormir;

    if (!petSelecionado)
    {
        processarSelecaoInicial(cliqueAlimentar, cliqueBrincar, cliqueDormir);
        delay(60);
        return;
    }

    // Se apertar botão dormir, entra em DORMINDO
    if (botaoDormir)
    {
        if (estadoAtual != DORMINDO)
        {
            estadoAtual = DORMINDO;
            Serial.println("Entrou no estado: DORMINDO");
            ultimoTempoEstado = tempoAtual;
        }
    }
    // Se está dormindo e apertar ALIMENTAR ou BRINCAR, acorda e volta para FELIZ
    else if (estadoAtual == DORMINDO)
    {
        if (botaoAlimentar || botaoBrincar)
        {
            estadoAtual = FELIZ;
            ultimoTempoEstado = tempoAtual;
            Serial.println("Acordou! Estado: FELIZ");
        }
    }
    // Caso contrário, executa lógica normal dos estados
    else
    {
        static bool jaFoiComFome = false; // controla alternância entre COM_FOME e TRISTE

        switch (estadoAtual)
        {
        case FELIZ:
            // Se apertar alimentar ou brincar, reinicia o tempo em FELIZ
            if (botaoAlimentar)
            {
                ultimoTempoEstado = tempoAtual;
                Serial.println("Botão ALIMENTAR pressionado em FELIZ - tempo reiniciado");
            }
            else if (botaoBrincar)
            {
                ultimoTempoEstado = tempoAtual;
                Serial.println("Botão BRINCAR pressionado em FELIZ - tempo reiniciado");
            }
            else
            {
                // Verifica se é hora de mudar para COM_FOME ou TRISTE
                unsigned long tempoPassado = tempoAtual - ultimoTempoEstado;

                if (!jaFoiComFome && tempoPassado >= intervaloFome)
                {
                    estadoAtual = COM_FOME;
                    ultimoTempoEstado = tempoAtual;
                    jaFoiComFome = true;
                    Serial.println("Mudou para COM_FOME");
                }
                else if (jaFoiComFome && tempoPassado >= intervaloTriste)
                {
                    estadoAtual = TRISTE;
                    ultimoTempoEstado = tempoAtual;
                    jaFoiComFome = false;
                    Serial.println("Mudou para TRISTE");
                }
            }
            break;

        case COM_FOME:
            // Se apertar ALIMENTAR, volta para FELIZ
            if (botaoAlimentar)
            {
                estadoAtual = FELIZ;
                ultimoTempoEstado = tempoAtual;
                Serial.println("Alimentado! Voltou para FELIZ");
            }
            break;

        case TRISTE:
            // Se apertar BRINCAR, volta para FELIZ
            if (botaoBrincar)
            {
                estadoAtual = FELIZ;
                ultimoTempoEstado = tempoAtual;
                Serial.println("Brincado! Voltou para FELIZ");
            }
            break;
        }
    }

    // Se mudou de estado, toca o som correspondente
    if (estadoAtual != estadoAnterior)
    {
        tocarSom(estadoAtual);
        estadoAnterior = estadoAtual;
    }

    // Atualiza display com o Digimon escolhido e o estado atual em texto
    display.clearDisplay();

    desenharDigimonSelecionado(digimonAtual);
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println(nomeDigimon(digimonAtual));
    display.setCursor(0, 54);
    switch (estadoAtual)
    {
    case FELIZ:
        display.println("FELIZ");
        break;
    case COM_FOME:
        display.println("COM FOME");
        break;
    case DORMINDO:
        display.println("DORMINDO");
        break;
    case TRISTE:
        display.println("TRISTE");
        break;
    }

    display.display();

    delay(200); // pequeno atraso para estabilidade
}