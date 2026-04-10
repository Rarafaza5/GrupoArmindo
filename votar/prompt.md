# Projeto: Sistema de Votação — GrupoArmindo

> Este ficheiro documenta tudo o que foi demonstrado e implementado neste projeto,
> para ser usado como referência ao retomar o trabalho na versão correta.

---

## 📁 Ficheiros do Projeto

| Ficheiro | Função |
|---|---|
| `index.html` | Página pública de votação (utilizador vota aqui) |
| `admin.html` | Painel de administração (controlo total) |
| `obs.html` | Display 1920×1080 para OBS — resultados ao vivo |
| `widget.html` | Widget 420×210 para OBS — contador de votos |

---

## 🔥 Firebase

- **Projeto:** `aawards`
- **Database URL:** `https://aawards-default-rtdb.firebaseio.com`
- **API Key:** `AIzaSyA8azNy6GEgD190y_fW91ahUbKa1w5veik`
- **SDK Version:** Firebase 10.12.0 (modular, via CDN)

### Estrutura da Base de Dados (Realtime Database)

```
config/
  title           → Título do evento
  subtitle        → Subtítulo
  description     → Descrição adicional
  votingOpen      → boolean — votação aberta ou fechada
  votingSessionId → string — ID único da sessão atual
  theme/
    bg, surface, accent, accent2, text, textMuted
    cardBg, cardBorder, fontDisplay, fontBody, radius, bgImage
  candidates/[]
    id, name, subtitle, description, photo (base64)

votes/
  {candidateId}   → número inteiro de votos

voted_fingerprints/
  {sessionId}/
    {deviceFingerprint} → { candidateId, candidateName, timestamp, ua }
```

---

## 🗳️ Sistema de Votação

### Anti-Fraude (Bullet-Proof Fingerprinting)
- **Canvas fingerprint** — renderização de texto e formas
- **WebGL fingerprint** — renderer e vendor da GPU
- **Audio fingerprint** — processamento de sinal (OfflineAudioContext)
- **Screen properties** — resolução, color depth, device pixel ratio
- **Platform** — OS, language, timezone
- **Hardware** — hardwareConcurrency, deviceMemory, touchPoints
- **Font probe** — deteta quais fontes do sistema estão instaladas
- Tudo combinado e hasheado em **SHA-256**
- Hash guardado em Firebase por sessão → **verificação server-side**

### Fluxo de Votação
1. Utilizador entra → fingerprint gerado automaticamente
2. Verifica em Firebase se já votou nesta sessão
3. Clica em "Votar" → modal de confirmação aparece
4. **Obrigatório aceitar os Termos e Condições** (checkbox) antes de confirmar
5. Voto registado → confetti + toast de agradecimento
6. Cartões dos outros candidatos ficam `dimmed` (opacity 0.38, saturate 0.6)
7. Cartão votado mostra badge "O teu voto" + check dourado

### Reset de Votação (Admin)
Quando o admin faz **Reset Total**:
1. Apaga todos os votos (`votes → null`)
2. Apaga todos os fingerprints (`voted_fingerprints → null`)
3. **Gera nova Session ID** (`session_` + timestamp)
→ A nova session ID invalida todos os votos anteriores, permitindo que **todos possam voltar a votar** sem necessidade de limpar cookies/localStorage

---

## 🎨 Design & Estética

### Paleta de Cores Base (tema padrão)
```css
--bg:           #07060a   /* fundo geral — quase preto */
--surface:      #100f14   /* superfícies */
--accent:       #c8a96e   /* dourado âmbar — cor principal */
--accent2:      #e8d5a3   /* dourado claro — secundário */
--text:         #f0ece4   /* texto principal — creme */
--text-muted:   #6b6560   /* texto secundário */
--card-bg:      #13121a   /* fundo dos cards */
--card-border:  #252330   /* bordas dos cards */
--radius:       18px
```

### Tipografia
- **Títulos / Display:** `Cormorant Garamond` — serif elegante, peso 300–700, itálico
- **Corpo / UI:** `Outfit` — sans-serif moderno, peso 300–700
- **Monospace / Números:** `DM Mono` — contadores, audit log, timestamps
- Fonte importada do Google Fonts

### Efeitos Visuais
- **Glows ambientes** — 3 radial-gradient blobs com animação flutuante lenta
- **Grain overlay** — textura de ruído via SVG (opacity ~0.02)
- **Glassmorphism** — `backdrop-filter: blur()` em topbar, pills, modais
- **Gradient text clip** — títulos com fade inferior (`-webkit-background-clip: text`)
- **Shimmer line** — linha dourada que atravessa o topo dos cards ao hover
- **Card `::after` glow** — radial gradient que aparece no hover dos cards
- **Confetti** — 80 peças ao votar, com física de queda e rotação
- **Skeleton loading** — placeholders animados enquanto carrega candidatos
- **Micro-animações** — `cardIn`, `fadeDown`, `fadeUp`, `closedIconIn`, `checkPop`

### Admin Panel (cores próprias)
```css
--accent: #8b7fff   /* púrpura/violeta */
--accent-dim: rgba(139,127,255,0.12)
--surface:  #13131a
--surface2: #1b1b24
--surface3: #22222e
```

---

## ⚙️ Funcionalidades do Admin

### Secções do Painel
| Secção | Função |
|---|---|
| Votação | Toggle abrir/fechar votação + badge de estado |
| Resultados | Rankings em tempo real com barra de progresso |
| Evento | Editar título, subtítulo, descrição |
| Candidatos | Adicionar, editar, remover candidatos |
| Tema | Personalizar cores, fontes, raio dos cantos |
| Templates | Aplicar temas prontos (Eurovisão, Óscares, etc.) |
| Audit Log | Registo de todas as ações da sessão |

### Auth
- Password: `admin1234`
- Guardada em `sessionStorage` (dura a sessão do browser)
- Input com `shake` animation se errada

### Candidatos
- Foto em **base64** (PNG/JPG/WEBP, máx. 500KB)
- Campos: `name` (obrigatório), `subtitle`, `description`, `photo`
- ID auto-gerado: `c_` + timestamp

### Templates Disponíveis
- 🎤 **ESC01** Eurovision Grand Prix — azul noite + dourado
- 🎤 **ESC02** Neon Stage — cyberpunk rosa
- 🎤 **ESC03** Dourado de Berlim — preto + ouro
- 🎤 **ESC04** Bandeiras & Confetti — azul europeu + ciano
- 🎤 **ESC05** Holographic Stage — roxo holográfico
- 🏆 **OSC01** Hollywood Gold — preto fosco + dourado
- 🏆 **OSC02** Red Carpet — vermelho + ouro
- ⬜ **MIN01** Pure White — minimalista branco

### Exportação
- CSV com posição, nome, subtítulo, votos, percentagem
- BOM UTF-8 para compatibilidade com Excel
- Nome do ficheiro: `resultados_YYYY-MM-DD.csv`

---

## 📺 OBS Display (`obs.html`)

- Dimensão fixa: **1920×1080px** (Full HD, sem scroll)
- Grid de resultados auto-adaptativo: 3, 4 ou 5 colunas conforme nº de candidatos
- **Rank change arrows** — ▲ verde se subiu, ▼ vermelho se desceu
- **Crown emoji** 👑 sobre a foto do líder (animação float)
- Contador de votos total animado (ease-out cubic)
- **Legal ticker** na base (scroll automático, 50s)
- Barra de progresso por candidato com transição suave (0.9s)
- Badge "AO VIVO" vermelho com pulsação

---

## 🔢 Widget OBS (`widget.html`)

- Dimensão fixa: **420×188px** (sem scroll, fundo transparente)
- **Duplo anel pulsante** ao receber novo voto (ring1 + ring2 com delay 0.15s)
- **Sparkles** — 14 partículas em todas as direções, dourado/creme
- **Float +1** — número sobe e desaparece em 1.2s
- **Glow flash** — radial gradient que aparece e desaparece ao votar
- Número em `DM Mono` com text-shadow dourado
- Separador vertical entre círculo e info

---

## 🧩 Termos e Condições

Incluídos em modal acessível a partir da página de votação:
1. Âmbito e Aceitação
2. Elegibilidade (1 voto por dispositivo por sessão)
3. Regras da Votação (voto definitivo e irrevogável)
4. Proteção de Dados — RGPD compliant (Regulamento UE 2016/679)
5. Limitação de Responsabilidade
6. Propriedade Intelectual
7. Integridade e Anti-Fraude
8. Lei aplicável — lei portuguesa

**Obrigatório aceitar** antes de confirmar o voto (checkbox desbloqueia botão).

---

## ✅ Requisitos Confirmados

- [x] Design premium e "invejável" — dark mode com glassmorphism e animações
- [x] Todos os 4 HTMLs com identidade visual coerente
- [x] Quando os votos são apagados, todos podem voltar a votar (nova session ID)
- [x] Sistema anti-fraude por fingerprint server-side (sem localStorage)
- [x] Tema configurável via admin (cores, fontes, raio)
- [x] Exportação CSV com BOM UTF-8
- [x] Integração OBS com display Full HD e widget de contagem

---

*Última atualização: abril de 2026*
