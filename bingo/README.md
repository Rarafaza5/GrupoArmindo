# 🎱 Bingo Armindo — Party Edition

Jogo de Bingo multiplayer online para jogar com amigos em tempo real!

---

## 🚀 Como Jogar com Amigos

### Opção 1 — Servidor Local (mesma rede WiFi)

1. **Abre o ficheiro `servidor.bat`** (duplo clique)
2. Vai abrir uma janela CMD com o servidor a correr na porta 8080
3. Abre o browser em **http://localhost:8080**
4. Para convidar amigos na **mesma rede WiFi**:
   - Vai a Início → Pesquisa "cmd" → corre `ipconfig`
   - Copia o teu **IPv4 Address** (ex: `192.168.1.50`)
   - Partilha o link `http://192.168.1.50:8080` com os amigos

> ⚠️ Esta opção só funciona para amigos na mesma rede WiFi.

---

### Opção 2 — Hosting Online Gratuito (recomendado para grupos à distância)

#### Via GitHub Pages (gratuito e permanente):

1. Cria uma conta em [github.com](https://github.com)
2. Cria um novo repositório público chamado `bingo`
3. Faz upload de todos os ficheiros desta pasta (`index.html`, `app.js`, `style.css`, `musica.mp3`)
4. Vai a **Settings → Pages → Branch: main → Save**
5. O jogo fica online em `https://[teu_username].github.io/bingo/`

---

### Opção 3 — Netlify Drop (mais rápido, sem conta)

1. Vai a [netlify.com/drop](https://app.netlify.com/drop)
2. Arrasta a pasta **bingo** inteira para a página
3. Em segundos tens um link tipo `https://abc123.netlify.app`
4. Partilha esse link com os teus amigos!

---

## 🎮 Como Funciona o Jogo

### Como Anfitrião (Host)
1. Escreve o teu nome e escolhe o teu avatar
2. Define quantos cartões queres (1-15) e quantas rondas
3. Clica em **Criar Sala 🎉**
4. Partilha o código de 4 letras ou o link com os amigos
5. Quando todos entrarem, clica em **▶ Iniciar Sorteio**

### Como Jogador (Convidado)
1. Pede o código de sala ao anfitrião (ou abre o link diretamente)
2. Escreve o teu nome e escolhe o teu avatar
3. Define quantos cartões queres
4. Clica em **Entrar na Party 🚀**
5. Clica nos números dos teus cartões quando forem sorteados
6. Ativa **🤖 Marcação Automática** para que o jogo marque por ti

### Prémios por Ronda
| Prémio | Condição | Pontos |
|--------|----------|--------|
| 🔥 1 Linha | Completar 1 linha | 50 pts |
| ⚡ 2 Linhas | Completar 2 linhas | 100 pts |
| 💎 Bingo Absoluto | Completar as 3 linhas | 250 pts |

Quando completares, clica no botão **BINGO!** (fica a tremer quando estás pronto!)

---

## ⚙️ Requisitos para o Servidor Local

- **Python** (recomendado): [python.org](https://www.python.org/downloads/)
- **OU Node.js**: [nodejs.org](https://nodejs.org/)

---

## 💡 Dicas

- O jogo funciona em **telemóvel** e **tablet** também!
- Usa o **chat** para falar com os outros jogadores durante o jogo
- O anfitrião pode **expulsar** jogadores se necessário
- Podes jogar **múltiplas rondas** — define o nº de rondas antes de criar a sala
- No final há um **pódio** com a classificação final!
