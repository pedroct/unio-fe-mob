# UNIO — Especificação Visual das Telas (UI Spec para Figma)

> Documento de referência para recriação das telas do app UNIO no Figma.
> Todas as telas são mobile-first com largura máxima de **430px**.
> Idioma: Português Brasileiro (PT-BR).

---

## 1. Design System

### 1.1 Paleta de Cores

| Token              | Hex       | Uso                                      |
|---------------------|-----------|------------------------------------------|
| Verde Principal     | `#2F5641` | Textos primários, botões CTA, header bg  |
| Verde Secundário    | `#648D4A` | Módulo Nutrição, barras de proteína       |
| Dourado             | `#C7AE6A` | Destaques, botões secundários, subtítulo  |
| Laranja             | `#D97952` | Módulo Treino, barras de carboidrato      |
| Creme               | `#F5F3EE` | Inputs bg, chips bg, cartões inativos     |
| Fundo Principal     | `#FAFBF8` | Background global                        |
| Borda Sutil         | `#E8EBE5` | Borders, dividers, linhas                |
| Texto Secundário    | `#8B9286` | Labels, textos auxiliares                |
| Texto Corpo         | `#5F6B5A` | Parágrafos, descrições                   |
| Branco              | `#FFFFFF` | Cards bg, botões claros                  |
| Vermelho Erro       | `#BE4E35` | Mensagens de erro, ações destrutivas     |
| Azul Corpo/Água     | `#3D7A8C` | Módulo Biometria, card hidratação        |
| Roxo Core           | `#8B6A9F` | Exercícios Core (treino)                 |

**Cores de Status (BLE / Indicadores):**

| Estado        | Cor       | Uso                        |
|---------------|-----------|----------------------------|
| Buscando      | `#3B82F6` | Indicador pulsante azul    |
| Conectando    | `#F59E0B` | Indicador pulsante amarelo |
| Conectado     | `#10B981` | Indicador fixo verde       |
| Desconectado  | `#EF4444` | Indicador fixo vermelho    |

### 1.2 Tipografia

| Fonte             | Peso         | Uso                                    |
|--------------------|--------------|----------------------------------------|
| **Playfair Display** | 400, 600, 700 | Títulos, valores numéricos grandes, nome do app |
| **Inter**          | 400, 500, 600, 700 | Corpo, labels, botões, UI geral       |

**Escalas de texto recorrentes:**

| Tamanho | Uso                                              |
|---------|--------------------------------------------------|
| 42px    | Logo "UNIO" na splash                            |
| 34px    | Títulos de onboarding                            |
| 24–28px | Valores grandes (calorias, peso)                 |
| 20–22px | Títulos de seção (font-display)                  |
| 16–18px | Subtítulos, nomes de tela no header              |
| 14px    | Texto corpo, botões                              |
| 12px    | Labels de campo, texto auxiliar                  |
| 10–11px | Micro-labels, tracking-wider, badges, captions   |
| 9px     | Labels de macro (PROT, CARB, GORD)               |

### 1.3 Espaçamentos

| Token   | Valor  | Uso                                    |
|---------|--------|----------------------------------------|
| px      | 24px   | Padding horizontal padrão (px-6)       |
| py      | 16px   | Padding vertical entre seções          |
| gap-sm  | 8px    | Espaço entre elementos pequenos        |
| gap-md  | 12px   | Espaço entre cards/seções              |
| gap-lg  | 24px   | Espaço entre blocos                    |
| radius-sm | 12px | Inputs, chips                          |
| radius-md | 16px | Cards pequenos                         |
| radius-lg | 24px | Cards grandes, bottom sheets           |
| radius-full | 9999px | Botões pill, avatares, badges        |

### 1.4 Sombras

| Nome         | CSS                                       | Uso                      |
|--------------|-------------------------------------------|--------------------------|
| Card sutil   | `0 1px 3px rgba(0,0,0,0.05)`             | Cards brancos             |
| Card elevado | `0 4px 16px rgba(47,86,65,0.05)`         | Cards de destaque         |
| CTA shadow   | `0 8px 24px rgba(47,86,65,0.20)`         | Botões primários          |
| Float shadow | `0 -5px 20px rgba(0,0,0,0.05)`           | Bottom sheets             |

### 1.5 Ícones

Biblioteca: **Lucide React** (strokeWidth padrão: 2, ativo: 2.5).
Tamanhos comuns: 16px (micro), 20px (padrão), 24px (tab bar / header), 48px (ilustrativo), 88px (onboarding).

### 1.6 Componentes Base

#### Botão Primário (CTA)
- Background: `#2F5641`, texto: branco
- Border-radius: full (pill) ou 16px (rounded-2xl)
- Padding: 16px vertical, largura total
- Shadow: CTA shadow
- Estado desabilitado: bg `#E8EBE5`, texto `#8B9286`
- Estado loading: spinner circular branco 20px
- Pressão (active): scale(0.98)

#### Botão Secundário / Outline
- Border: 1px `#C7AE6A`, texto: `#C7AE6A`
- Background: transparente
- Border-radius: full
- Hover: bg `#C7AE6A/10`

#### Input de Texto
- Background: `#F5F3EE`
- Border: 1px `#E8EBE5`
- Border-radius: 12px
- Padding: 14px horizontal, 14px vertical
- Placeholder: `#8B9286`
- Focus: border `#C7AE6A`, ring 1px `#C7AE6A`
- Label: 12px uppercase, tracking-wide, `#2F5641`, weight 500

#### Card
- Background: `#FFFFFF`
- Border: 1px `#E8EBE5`
- Border-radius: 16px ou 24px
- Shadow: Card sutil
- Padding: 16–24px

#### Badge / Chip
- Background: `{cor}12` (7% opacity)
- Border: 1px `{cor}1F` (12% opacity)
- Texto: cor do módulo
- Font: 12px, weight 500
- Padding: 6px 14px
- Border-radius: 20px (pill)

#### Bottom Tab Bar
- Height: 84px (com safe area de 24px)
- Background: `#FAFBF8`
- Border-top: 1px `#E8EBE5`
- 5 itens: Início, Nutrição, Treino, Biometria, Suplementos
- Ícone: 24px, label 10px
- Ativo: `#2F5641` (strokeWidth 2.5), inativo: `#8B9286`
- Fixo no bottom, z-50

#### Header Padrão (Telas internas)
- Sticky top, height ~56px, bg `#FAFBF8/80`, backdrop-blur
- Esquerda: botão voltar (ChevronLeft 24px)
- Centro: título font-display 18px semibold `#2F5641`
- Direita: ação contextual ou espaço vazio
- Padding-top: 56px (safe area)

---

## 2. Mapa de Navegação

```
/ (redirect) ─────────────────────────────────────┐
                                                   │
┌─ /auth ────── Login / Cadastro                   │
│               ↓ sucesso                          │
├─ /onboarding ── 3 slides (Nutrição, Treino,      │
│                  Biometria) → swipe/tap           │
│               ↓                                  │
├─ /welcome ─── Tela simples "Bem-vindo"           │
│               ↓                                  │
├─ /home ─────── Dashboard principal ◄─────────────┘
│    ├── card Nutrição → /nutrition
│    ├── card Treino → /training
│    ├── card Biometria → /biometrics
│    ├── card Hidratação → /hydration
│    └── avatar → /profile
│
├─ /nutrition ──── Diário Alimentar
│    ├── /nutrition/add ── Adicionar alimento
│    ├── /nutrition/scale ── Balança Inteligente
│    └── → /pantry ── Despensa
│         └── /pantry/shopping-list ── Lista de Compras
│
├─ /training ──── Planos de Treino
│    ├── /training/plans/:id ── Detalhe do Plano
│    ├── /training/player/:id ── Executar Treino
│    ├── /training/exercises ── Catálogo Exercícios
│    └── /training/sessions ── Histórico Sessões
│
├─ /biometrics ── Composição Corporal
│    ├── /biometrics/devices ── Dispositivos
│    ├── /biometrics/link ── Vincular Balança
│    └── /biometrics/scan ── Pesagem ao Vivo
│
├─ /hydration ── Hidratação
│
├─ /supplements ── Suplementação
│
└─ /profile ──── Perfil do Usuário
```

---

## 3. Telas — Especificação Detalhada

---

### 3.1 Splash Screen (`/`)

**Propósito:** Animação de carregamento inicial da marca.

**Layout:**
- Tela cheia, fundo gradiente radial: `#4A7246` → `#2F5641`
- Centralizado verticalmente:
  - Logo UNIO (ícone 120x120px) com drop-shadow
  - Título "UNIO" — Playfair Display, 42px, light, tracking 14px, cor `#F5F3EE`
  - Subtítulo "Dados que cuidam de você" — Inter, 11px, weight 500, tracking 3px, uppercase, cor `#C7AE6A`
  - Barra de progresso minimalista: 32px largura, 2px altura, `#C7AE6A`

**Animação (3 fases, ~3.8s total):**
1. **Loading** (0–0.8s): Logo e texto sobem com fadeIn (translateY 20px→0, scale 0.8→1)
2. **Ready** (0.8–3.2s): Logo com pulse sutil (scale 1→1.02→1), barra preenche de 0%→100%, 6 folhas decorativas aparecem (formas losangulares alternando `#C7AE6A` e `#648D4A`, opacity 0.25–0.39)
3. **Exit** (3.2–3.8s): Tudo faz fadeOut, tela branca `#FAFBF8` faz fadeIn por cima

**Decorações:** 6 folhas losangulares (rounded-tl-50% rounded-br-50%) posicionadas absolutas, dispersas pela tela, rotações variadas.

---

### 3.2 Autenticação (`/auth`)

**Propósito:** Login e cadastro de usuário.

**Layout — Topo:**
- Fundo: `#FAFBF8`
- Logo UNIO centralizada: ícone 64x64px + título "UNIO" Playfair Display 24px, tracking 4px, `#2F5641`
- Padding-top: 48px

**Tabs de Modo:**
- 2 botões texto lado a lado: "Entrar" | "Criar Conta"
- Tab ativo: texto `#2F5641`, underline 2px `#C7AE6A` (animado com layoutId)
- Tab inativo: texto `#8B9286`
- Margin-bottom: 32px

**Formulário Login:**
- Campo "E-mail": label uppercase 12px, input com placeholder "seuemail@exemplo.com"
- Campo "Senha": input com toggle olho abrir/fechar (Eye/EyeOff 18px)
- Link "Esqueci minha senha" — 12px `#8B9286`, alinhado à direita
- Botão submit: pill full-width, "Acessar conta" + ícone ArrowRight
  - Válido: bg `#2F5641`, shadow, hover scale 1.02
  - Inválido: bg `#E8EBE5`, texto `#8B9286`, cursor not-allowed
  - Loading: spinner circular

**Formulário Cadastro:**
- Mesmo layout + campo "Confirmar Senha" adicional
- Botão: "Criar minha conta"

**Mensagem de Erro:**
- Card: bg `#BE4E35/10`, border `#BE4E35/20`, rounded-xl, texto 14px `#BE4E35`

**Rodapé:**
- "Precisa de ajuda? Falar com suporte" — 11px `#8B9286`, link `#C7AE6A`

**Transição:** AnimatePresence entre modos (slide horizontal 20px, 0.3s)

---

### 3.3 Onboarding (`/onboarding`)

**Propósito:** Apresentação dos 3 módulos principais em slides swipeable.

**Layout — 3 Slides:**

| Slide | Módulo     | Título               | Cor       | Ícone    |
|-------|------------|----------------------|-----------|----------|
| 1     | NUTRIÇÃO   | "Nutrição\nUnificada"| `#648D4A` | Leaf     |
| 2     | TREINO     | "Treino\nInteligente"| `#D97952` | Dumbbell |
| 3     | BIOMETRIA  | "Corpo\nConectado"   | `#3D7A8C` | User     |

**Área do Ícone (centro, 300px altura):**
- Círculo principal: 200x200px, bg `{cor}12` (7%), ícone 88px strokeWidth 1.5
- Anel decorativo externo: 224x224px, border 1px `{cor}` opacity 8%
- 3 dots flutuantes: 6px, posicionados a 120° (0°, 120°, 240°) num raio de 120px

**Conteúdo Texto:**
- Badge módulo: quadrado 8px `{cor}` + label 11px uppercase tracking 2px
- Título: Playfair Display 34px, semibold, `#2F5641`, whitespace pre-line
- Descrição: Inter 15px, line-height 1.6, `#5F6B5A`, max-width 320px
- Feature chips (3 por slide): pill bg `{cor}12`, border `{cor}1F`, texto `{cor}`, 12px

**Controles (bottom):**
- Dot indicators: 3 dots, ativo = 24px largura com cor do slide, inativo = 8px `#8B9286` opacity 19%
- Botão: pill bg `{cor}`, texto branco, shadow
  - Slides 1–2: "Próximo" + ChevronRight
  - Slide 3: "Começar" (maior, bg gradient `#2F5641`→`#4A7246`)
- Botão "Pular" — canto superior direito, 14px `#8B9286`

**Interações:** Swipe horizontal (drag), tap em dots, transição spring slide

---

### 3.4 Welcome (`/welcome`)

**Layout:** Tela simples centralizada.
- Título: Playfair Display 36px, `#2F5641`, "Bem-vindo"
- Subtítulo: Inter, `#8B9286`, "Sua jornada começa aqui."

---

### 3.5 Home — Dashboard (`/home`)

**Propósito:** Dashboard principal com resumo diário de todos os módulos.

**Header (gradiente):**
- Bg: gradiente vertical `#FAFBF8` → `#F5F3EE`
- Padding-top: 56px (safe area)
- Esquerda: Avatar circular 40px (DiceBear) + saudação ("Bom dia," 12px `#8B9286` + nome Playfair 20px `#2F5641`)
  - Avatar e nome são clicáveis → /profile
- Direita: Ícone Bell 24px com badge vermelho 8px (notificação)

**Gauge Semicircular de Calorias:**
- SVG semicírculo: 240x132px, raio 108px, stroke 12px
  - Trilha: `#E8EBE5`
  - Progresso: `#648D4A`, animado, strokeLinecap round
- Centro (bottom do arco):
  - Valor: Playfair 36px semibold `#2F5641` (ex: "1.240")
  - Label: "kcal consumidas hoje" 10px `#8B9286` tracking-widest
- Esquerda do arco: "XXX kcal restantes" (14px bold + 9px)
- Direita do arco: "X refeições registradas" (14px bold + 9px)

**Macro Circles (abaixo do gauge):**
- 3 círculos alinhados horizontalmente, gap 32px:
  - Proteína: 40x40px, border 2px `#648D4A`, texto "XXg" 12px bold, label "PROT" 9px
  - Carb: border `#D97952`, label "CARB"
  - Gordura: border `#C7AE6A`, label "GORD"

**Grid 2 colunas — Cards de meta:**
1. **"Bater Macros"** — card branco, shadow, rounded-2xl, título Playfair 14px, descrição 11px
2. **"Meta Água"** — mesmo estilo, mostra "X,X de Y,Y L", mensagem motivacional em `#3D7A8C`
   - Clicável → /hydration

**Seção "Últimas Refeições":**
- Header: "ÚLTIMAS REFEIÇÕES" 14px bold uppercase + "Ver tudo" link `#C7AE6A` → /nutrition
- Se tem refeições: card com grid 3 colunas (Prot/Carb/Gord com cores)
- Se vazio: "Nenhuma refeição registrada" + link "Registrar primeira refeição"

**Card Treino (destaque escuro):**
- Bg: `#2F5641`, rounded-2xl, padding 20px, texto branco
- Dumbbell 80px opacity 10% no canto superior direito
- Se tem plano ativo: nome + objetivo + badge "Ativo" (`#648D4A` pill) + botão "Iniciar Treino"
- Se não tem: "Você ainda não tem um plano" + botão "Criar meu plano"
- Botão: bg `#C7AE6A`, rounded-xl, texto branco, shadow, com ChevronRight

**Card Composição Corporal:**
- Card branco, rounded-2xl, shadow-sm
- Header: ícone TrendingUp + "Composição" + peso atual "XX,X kg"
- Gráfico de área (60px altura): stroke `#3D7A8C`, fill gradiente
  - Se sem dados: mensagem placeholder
- Footer (border-top): 3 métricas (Gordura %, Músculo kg, Água %)
- Botão FAB: círculo 32px bg `#2F5641`, ícone Plus branco, posição absolute top-right

**Card Hidratação:**
- Bg: `#3D7A8C`, rounded-2xl, shadow, texto branco
- Ícone Droplets + "HIDRATAÇÃO" 12px uppercase
- Valor: Playfair 24px "X,X / Y,Y L"
- 5 dots de progresso: circles 12px border branco, filled branco quando atingido
- Botão circular: bg branco, ícone Plus `#3D7A8C`, 48x48px

---

### 3.6 Nutrição — Diário Alimentar (`/nutrition`)

**Header:** Padrão com "Diário Alimentar", botão voltar → /home, ícone Calendar direita.

**Card Resumo Calórico (destaque escuro):**
- Bg: `#2F5641`, rounded-3xl, padding 24px, texto branco
- Esquerda: "Calorias Disponíveis" label + valor Playfair 36px
- Direita: "Consumido" + "XXX / YYYY"
- 3 barras de progresso horizontais:
  - Proteína: label `#EFECB6`, barra `#EFECB6` sobre bg `white/20`
  - Carboidratos: label+barra `#D97952`
  - Gorduras: label+barra `#C7AE6A`
  - Cada barra: 8px height, rounded-full, com "XXg / YYYg"

**Grid 2 colunas — Atalhos:**
1. **Despensa** — card escuro `#2F5641`, ícone Package, "Gerenciar estoque" → /pantry
2. **Balança** — card branco, ícone Scale, badge "Online" verde → /nutrition/scale

**Lista de Refeições:**
- Cada refeição é um card branco rounded-2xl:
  - Header: nome da refeição (bold `#2F5641`) + kcal totais + botão "+" circular `#C7AE6A`
  - Se vazio: link "Adicionar Alimentos"
  - Se tem registros: lista com:
    - Nome do alimento (14px `#5F6B5A`)
    - "XXXg · XXX kcal" (12px `#8B9286`)
    - Microbadges: P/C/G com cores
    - Botão lixeira: Trash2 12px `#BE4E35`
- Seção "Avulso" se há registros sem refeição

---

### 3.7 Adicionar Alimento (`/nutrition/add`)

**Header:** "Adicionar Alimento" + botão voltar

**Barra de Busca:**
- Input com ícone Search à esquerda
- Ícone Scanner de código de barras à direita

**Lista de Resultados:**
- Cada item: nome (14px `#2F5641`), marca (12px `#8B9286`), "XXX kcal/100g"
- Botão "+" à direita para selecionar

**Painel de Seleção (quando alimento escolhido):**
- Nome + marca do alimento
- Controle de quantidade: botões -/+ com input numérico central
  - Incrementos: -50g / +50g, com input editável
- Grid 4 colunas com macros calculados (Kcal, Prot, Carb, Gord)
- Botão "Adicionar" (primário full-width)

---

### 3.8 Balança Inteligente (`/nutrition/scale`)

**Header:** "Balança Inteligente" + botão voltar + indicador BLE (círculo 40px)

**Indicador BLE (4 estados):**

| Estado       | Cor bg         | Ícone            | Label                    | Animação      |
|--------------|----------------|------------------|--------------------------|---------------|
| Buscando     | `#3B82F6/10`   | RefreshCw spin   | "Buscando balança…"      | Pulse ícone   |
| Conectando   | `#F59E0B/10`   | Loader2 spin     | "Conectando…"            | Pulse ícone   |
| Conectado    | `#10B981/10`   | Check            | "Conectado"              | Nenhuma       |
| Desconectado | `#EF4444/10`   | X                | "Desconectado"           | Nenhuma       |

Badge pill: bg cor/10, texto 10px uppercase bold tracking-wide.

**Círculo de Peso (centro):**
- Círculo: 224x224px (56x56 viewBox), border 4px `#E8EBE5`
- Arco de progresso SVG: stroke `#648D4A`, 4px, progresso proporcional a peso/500g
- Centro: peso em Playfair 60px bold `#2F5641` + "gramas" 16px `#8B9286`
- Shadow: xl shadow `#2F5641/5`
- Animação: scale pulse 1→1.02→1 quando peso muda

**Controles abaixo do círculo:**
- Botão "Tarar": outline pill `#C7AE6A`, 10px uppercase
- Badge "Peso registrado": pill bg `#648D4A/10`, texto `#648D4A` (quando há pesagem pendente)

**Painel Inferior (bottom sheet):**
- Bg branco, rounded-t-3xl, shadow top, border-top

**Estado 1 — Sem alimento selecionado:**
- Input "Buscar alimento…" (Search + texto `#8B9286`) → abre overlay busca
- Texto placeholder centralizado: "Selecione um alimento para registrar"

**Estado 2 — Alimento selecionado:**
- Label "Alimento selecionado" 10px
- Nome do alimento 13px `#2F5641` + subtítulo (marca/grupo)
- Botão X para limpar
- Grid 4 colunas macros: Kcal (`#2F5641`), Prot (`#648D4A`), Carb (`#D97952`), Gord (`#C7AE6A`)
  - Cada: card `#FAFBF8`, border, 18px bold valor + 9px uppercase label
- Input "Quantidade (g)": centralizado, bg `#FAFBF8`, tabular-nums
- Botão confirmar: full-width, bg `#2F5641`, rounded-2xl, "Registrar [nome]" com Check

**Estado 3 — Sucesso:**
- Checkmark 32px em circle `#648D4A/10`
- "Registrado com sucesso!" 18px semibold
- "Dados salvos no seu diário" 14px `#8B9286`
- Auto-redirect para /nutrition em 1.5s

**Overlay de Busca (fullscreen):**
- Slide-up animation (spring)
- Header: botão voltar + input de busca + botão X
- Loading: Loader2 spin + "Buscando alimentos…"
- Resultados divididos:
  - "Seus alimentos" (base app) — nome, marca, "XXX kcal/100g", botão Plus
  - Separador
  - "Base de alimentos" (TBCA) — descrição, grupo alimentar, badge "TBCA" pill
- Sem resultados: mensagem "Nenhum alimento encontrado"

---

### 3.9 Hidratação (`/hydration`)

**Header:** "Hidratação" + botão voltar + botão Settings (engrenagem)

**Card Principal (wave visual):**
- Card grande com visual de "nível de água"
- SVG wave animation no fundo (3 waves sobrepostas, amplitudes diferentes)
- Centro: valor em Playfair 48px (ex: "1,5")
- Label: "litros de X,X L" 16px
- Percentual: "XX%" pill badge
- Se meta atingida: badge dourado "Meta atingida!"
- Fundo: gradiente `#3D7A8C` para as waves

**Botões de Adição Rápida:**
- Grid 2x2 de atalhos por tipo de bebida:
  - Água (GlassWater `#3D7A8C`), Café (Coffee `#8C6A3D`), Suco (Wine `#D97952`), Chá (Coffee `#648D4A`)
  - Cada botão: ícone + label + "200ml" padrão
- Botão "Outro" e "Isotônico" adicionais

**Botão FAB "Adicionar":**
- Circular 56px, bg `#3D7A8C`, ícone Plus branco, shadow
- Abre modal/bottom sheet com:
  - Seletor de tipo de bebida (ícones coloridos)
  - Numpad/input para quantidade em ml
  - Botão "Registrar"

**Histórico do Dia:**
- Lista cronológica dos registros:
  - Ícone do tipo + "XXX ml" + horário
  - Swipe para deletar ou botão Trash2

**Modal Editar Meta:**
- Input numérico para nova meta em ml
- Botão confirmar

---

### 3.10 Treino — Lista de Planos (`/training`)

**Header:** "Treino" + botão voltar

**Tabs Superiores:**
- "Planos" | "Exercícios" | "Sessões" — navegam para sub-rotas

**Lista de Planos:**
- Cada plano: card branco rounded-2xl
  - Nome (Playfair 16px `#2F5641`)
  - Objetivo (12px `#8B9286`)
  - Badge "Ativo" (pill `#648D4A`) se ativo
  - Data criação (10px `#8B9286`)
  - Ações: botão Play (iniciar) + Trash2 (deletar)
  - Clicável → /training/plans/:id

**Estado Vazio:**
- Ícone Dumbbell 48px `#E8EBE5`
- "Nenhum plano criado" + botão "Criar Plano"

**Modal Criar Plano:**
- Input "Nome do plano"
- Input "Objetivo" (opcional)
- Botão "Criar"
- Validação inline (fieldErrors)

**Modal Confirmar Exclusão:**
- "Tem certeza?" com botões Cancelar/Excluir

---

### 3.11 Detalhe do Plano (`/training/plans/:id`)

**Header:** Nome do plano + botão voltar + botão Pencil (editar)

**Resumo:**
- Objetivo do plano
- Badge "Ativo" ou "Inativo"
- Botão "Iniciar Treino" (CTA primário) → /training/player/:id

**Lista de Exercícios do Plano:**
- Cada item: card com:
  - Nome do exercício (bold)
  - Detalhes: séries × repetições, carga (kg), descanso (s)
  - Ícones: Repeat (séries), Weight (carga), Timer (descanso)
  - Observações se houver
- Ordem drag-and-drop ou numérica

**Adicionar Exercício:**
- Botão "+" abre modal de busca de exercícios
- Busca com Search input
- Formulário: séries, repetições, carga, descanso, observações

---

### 3.12 Player de Treino (`/training/player/:id`)

**Propósito:** Tela fullscreen para execução guiada do treino.

**Layout (sem tab bar, fullscreen):**

**Header Mínimo:**
- Botão voltar (com confirmação "Sair do treino?")
- Timer total do treino (mm:ss) com botão Pause/Play
- Botão FastForward (pular exercício)

**Exercício Atual (centro):**
- Nome do exercício: Playfair 24px bold
- Badge grupo muscular
- Indicador: "Série X de Y"
- Info: "XX reps · XX kg"
- Observações

**Timer de Descanso (entre séries):**
- Countdown circular grande
- Valor em segundos (Playfair 48px)
- Animação de progresso circular
- Botão "Pular Descanso"

**Barra de Progresso:**
- Progresso linear: exercícios concluídos / total
- Dots para cada exercício

**Tela de Conclusão:**
- Ícone Trophy 64px `#C7AE6A`
- "Treino Concluído!" Playfair 28px
- Resumo: duração, exercícios, séries totais
- Botão "Voltar" → /training

---

### 3.13 Exercícios (`/training/exercises`)

**Header:** "Exercícios" + botão voltar + botão "+"

**Filtros:**
- Barra de busca Search
- Chips horizontais por grupo muscular:
  - Peito (`#D97952`), Costas (`#2F5641`), Pernas (`#3D7A8C`), Ombros (`#C7AE6A`), Braços (`#648D4A`), Core (`#8B6A9F`)

**Lista:**
- Cada exercício: card com nome, grupo (badge colorido), star se personalizado
- Observações expandíveis

**Bottom Sheet Criar Exercício:**
- Input nome, select grupo muscular, textarea observações
- Botão "Criar"

---

### 3.14 Sessões (`/training/sessions`)

**Header:** "Sessões" + botão voltar

**Filtro de Data:**
- Tabs: "7 dias" | "30 dias"

**Lista de Sessões:**
- Cada sessão: card expandível
  - Plano nome + data/hora
  - Badge "Concluída" (CheckCircle verde) ou "Em andamento" (Clock amarelo)
  - Duração (se finalizada)
  - Expandir mostra detalhes
  - Botão Trash2 para deletar (com confirmação)

---

### 3.15 Biometria (`/biometrics`)

**Header:** "Biometria" + botão voltar + ícone Calendar

**Card Principal (peso + gráfico):**
- Card branco rounded-3xl, padding 24px
- Peso atual: Playfair 36px `#2F5641` + "kg" 18px `#8B9286`
- Variação 7d: badge pill ("+X.X kg" ou "-X.X kg")
- Meta de peso (se definida): card `#F5F3EE` com meta e "faltam X kg"
- Gráfico de Área (200px height): Recharts AreaChart
  - Stroke `#3D7A8C` 3px, fill gradiente `#3D7A8C` (20%→0%)
  - Grid horizontal `#E8EBE5`, XAxis com datas dd/mm
- Seletor de período: 4 tabs segmentados ("7D", "30D", "3M", "1Y")
  - Ativo: bg branco, shadow, texto `#2F5641`
  - Inativo: texto `#8B9286`
- Footer: Min / Média / Máx (10px `#8B9286`)

**Grid 2 colunas — Métricas:**
6 cards (2x3):
- Gordura (Activity `#D97952`)
- Músculo (TrendingUp `#2F5641`)
- Água (Droplets `#3D7A8C`)
- Osso (Bone `#8B9286`)
- Visceral (Activity `#C7AE6A`)
- TMB (Activity `#648D4A`)

Cada card: ícone circle 24px com bg cor/10, label 10px uppercase, valor Playfair 20px.

**Total leituras:** texto centralizado 10px `#8B9286`

**Botões de Ação (2 colunas):**
- "Iniciar Pesagem": bg `#2F5641`, ícone Scale, shadow → /biometrics/devices
- "Meus Dispositivos": outline `#2F5641`, ícone Activity → /biometrics/devices

**Botão "Registrar Manualmente":**
- Full-width, outline `#E8EBE5`, ícone Plus, hover border `#2F5641` → /biometrics/scan

---

### 3.16 Dispositivos (`/biometrics/devices`)

**Header:** "Dispositivos" + botão voltar

**Descrição:** "Gerencie as balanças vinculadas à sua conta." (14px `#8B9286`)

**Lista de Dispositivos:**
- Cada dispositivo: card branco rounded-2xl
  - Ícone Scale + nome/MAC
  - Tipo do dispositivo
  - Data de criação
  - Status "Em espera" se aguardando pesagem
  - Botão ação: "Pesar" (primário) ou "Trash2" (delete)

**Estado Vazio:**
- Ícone Scale 48px `#E8EBE5`
- "Nenhuma balança vinculada ainda."

**Botão "Vincular Nova Balança":**
- FAB ou botão full-width → /biometrics/link

---

### 3.17 Vincular Balança (`/biometrics/link`)

**Header:** "Vincular Balança" + botão voltar

**Ilustração:** Círculo 80px bg `#C7AE6A/10`, ícone Scale 40px `#C7AE6A`

**Instruções:** "Preencha os dados para conectar sua Xiaomi Mi Scale 2." (14px `#8B9286`, center)

**Formulário:**
- Input "Endereço MAC" com máscara (XX:XX:XX:XX:XX:XX)
  - Validação: formato MAC obrigatório
- Botão "Vincular Balança" (CTA primário)

---

### 3.18 Pesagem ao Vivo (`/biometrics/scan`)

**Propósito:** Tela de leitura em tempo real da balança corporal.

**Estados da Pesagem (ScanState):**

1. **Preparing:** Spinner + "Preparando pesagem..."
2. **Waiting:** Timer countdown (5 minutos), instrução "Suba na balança"
   - Animação de pulso no ícone
   - Progress ring circular
   - Polling a cada 3s para nova leitura
3. **Success:** Dados completos da leitura
   - Grid de métricas: peso, IMC, gordura%, músculo, osso, água%, visceral, TMB
   - Botão "Nova Pesagem" ou "Voltar"
4. **Timeout:** "Tempo esgotado" + botão "Tentar Novamente"
5. **Error:** Mensagem de erro + botão "Tentar Novamente"

---

### 3.19 Perfil (`/profile`)

**Header:** "Meu Perfil" + botão voltar + ícone Settings

**Avatar + Info Básica:**
- Avatar circular 80px (DiceBear ou foto) com botão câmera overlay
- Nome completo (Playfair 20px)
- E-mail (14px `#8B9286`)

**Formulário (seções com cards):**

**Dados Pessoais:**
- Nome + Sobrenome (2 inputs lado a lado)
- E-mail (readonly)
- Data de nascimento (máscara DD/MM/AAAA)
- Sexo (select: Masculino/Feminino)
- Altura (input numérico cm)

**Objetivos:**
- Objetivo (select: Emagrecimento/Hipertrofia/etc.)
- Fator de atividade (select: Sedentário→Extremamente ativo)
- Meta calórica (input ou "Auto" toggle)

**Botão Salvar:** CTA primário full-width
- Feedback de sucesso: badge verde "Dados salvos!"

**Botão Sair:**
- Botão outline vermelho "Sair da conta" com ícone LogOut
- Modal de confirmação

---

### 3.20 Suplementação (`/supplements`)

**Header:** "Suplementação" + botão voltar

**Agenda do Dia (topo):**
- Lista cronológica de suplementos agendados:
  - Horário (14px bold)
  - Nome do suplemento + dosagem
  - Status: "Pendente" (pill amarelo), "Tomado" (pill verde Check), "Atrasado" (pill vermelho)
  - Botão marcar como tomado
- Card por protocolo ativo

**Protocolos:**
- Card expansível por protocolo:
  - Nome + objetivo + datas (início/fim)
  - Badge "Ativo" (verde)
  - Lista de itens do protocolo com suplemento, dosagem, horários
  - Ações: Editar, Excluir

**Criar Protocolo:**
- Bottom sheet/modal com:
  - Nome, objetivo, data início/fim
  - Adicionar itens (suplemento + dosagem + horários)

---

### 3.21 Despensa (`/pantry`)

**Header:** "Despensa" + botão voltar + botão ShoppingCart → /pantry/shopping-list

**Filtros Horizontais (scroll):**
- Chips: "Todos", categorias de alimentos
- Draggable horizontalmente

**Grid de Itens:**
- Cards por item de estoque:
  - Nome do alimento
  - Quantidade atual (ex: "1,2kg", "500g", "3 un")
  - Indicador de status:
    - Verde (`#648D4A`): "Estoque Cheio"
    - Amarelo (`#C7AE6A`): "Médio"
    - Laranja (`#D97952`): "Baixo"
    - Vermelho (`#BE4E35`): "Crítico"
  - Barra de progresso colorida

**Estado Vazio:** Mensagem + botão "Adicionar item"

---

### 3.22 Lista de Compras (`/pantry/shopping-list`)

**Header:** "Lista de Compras" + botão voltar + ícone ShoppingBag

**Resumo:**
- Total de itens / itens comprados
- Barra de progresso de conclusão

**Lista de Itens:**
- Agrupados por status (precisam comprar / opcionais)
- Cada item:
  - Checkbox (toggle comprado/pendente)
  - Nome do alimento
  - Quantidade sugerida com controles +/- (stepper)
  - Unidade
- Item comprado: risca o texto (line-through), opacity reduzida

**Botão "Confirmar Compras":**
- Atualiza estoque automaticamente
- CTA primário full-width

---

### 3.23 Tela 404 — Não Encontrado (`/not-found`)

**Layout:** Tela centralizada, bg `gray-50`.
- Card branco max-w md, com:
  - Ícone AlertCircle 32px vermelho
  - Título "404 Page Not Found" (24px bold)
  - Subtítulo (14px `gray-600`)

---

## 4. Estados Comuns por Tela

Todas as telas que fazem requisições implementam no mínimo os seguintes estados:

| Estado    | Visual                                                                 |
|-----------|------------------------------------------------------------------------|
| Loading   | Loader2 spin centralizado (24–32px) + label "Carregando..." `#8B9286`  |
| Vazio     | Ícone ilustrativo grande (48px) `#E8EBE5` + texto orientador           |
| Erro      | Banner bg `#BE4E35/10`, texto `#BE4E35`, botão "Tentar novamente"      |
| Sucesso   | Toast/badge verde ou tela de confirmação com Check                     |

**Diálogos de Confirmação (padrão em telas com delete):**
- Overlay escuro semitransparente
- Card branco centralizado, rounded-2xl
- Título "Tem certeza?" ou contextual
- 2 botões: "Cancelar" (ghost) + "Excluir" (bg `#BE4E35`, texto branco)

**Telas que implementam confirmação de exclusão:** Training (planos, sessões), Biometrics (dispositivos), Hydration (registros), Supplements (protocolos).

---

## 5. Paleta de Cores por Módulo de Bebida (Hidratação)

| Bebida      | ID          | Cor       | Ícone        |
|-------------|-------------|-----------|--------------|
| Água        | `AGUA`      | `#3D7A8C` | GlassWater   |
| Café        | `CAFE`      | `#8C6A3D` | Coffee       |
| Suco        | `SUCO`      | `#D97952` | Wine         |
| Leite       | `LEITE`     | `#C7AE6A` | Coffee       |
| Chá         | `CHA`       | `#648D4A` | Coffee       |
| Isotônico   | `ISOTONICO` | `#4A90E2` | GlassWater   |
| Outro       | `OUTRO`     | `#8B9286` | Droplets     |

---

## 6. Cores por Grupo Muscular (Treino)

| Grupo     | Cor       |
|-----------|-----------|
| Peito     | `#D97952` |
| Costas    | `#2F5641` |
| Pernas    | `#3D7A8C` |
| Ombros    | `#C7AE6A` |
| Braços    | `#648D4A` |
| Core      | `#8B6A9F` |

---

## 7. Animações e Transições

| Contexto               | Tipo              | Duração  | Easing                              |
|------------------------|-------------------|----------|-------------------------------------|
| Troca de tela          | Slide horizontal  | 300ms    | ease-out                            |
| Modal/bottom sheet     | Slide-up spring   | ~400ms   | spring(damping:30, stiffness:300)   |
| Fade de elementos      | Opacity           | 300ms    | ease-out                            |
| Hover/press em botão   | Scale             | 150ms    | ease-out (scale 0.98)               |
| Splash → Tela          | Fade branco       | 600ms    | ease-out                            |
| Onboarding slides      | Slide + fade      | 400ms    | ease-out                            |
| Indicador BLE          | AnimatePresence   | 200ms    | fade in/out                         |
| Barra de progresso     | Width             | 1000ms   | ease-out                            |
| Peso no círculo        | Scale pulse       | 300ms    | scale [1, 1.02, 1]                  |
| Spinner/loading        | Rotate            | contínuo | linear                              |

---

## 8. Responsividade

- **Max-width:** 430px centralizado (`mx-auto`)
- **Mobile-first:** todo o design é otimizado para telas de 375–430px
- **Safe areas:** padding-top 56px para status bar
- **Tab bar:** 84px fixed bottom com padding-bottom para home indicator
- **Scroll:** conteúdo principal rola atrás de headers sticky e acima da tab bar

---

## 9. Fontes e Assets

**Google Fonts:**
- `Playfair Display` (weights: 300, 400, 600, 700)
- `Inter` (weights: 400, 500, 600, 700)

**Assets necessários:**
- Logo UNIO (ícone PNG, ~120x120px, fundo transparente)
- Avatares: DiceBear API (`https://api.dicebear.com/7.x/avataaars/svg?seed=...`)

**Biblioteca de ícones:** Lucide (todas as telas usam ícones desta biblioteca)
