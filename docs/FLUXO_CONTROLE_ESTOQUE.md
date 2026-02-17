# UNIO — Fluxo de Controle de Estoque & Lista de Compras

## Visão Geral

O módulo de Despensa (Pantry) gerencia o inventário de alimentos e suplementos do usuário. O sistema calcula automaticamente o status de cada item com base na quantidade atual vs. quantidade mínima desejada, gera uma lista de compras inteligente, e atualiza o estoque quando o usuário confirma uma compra.

---

## 1. Modelo de Dados

### 1.1 Tabela `food_stock` (Despensa)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID (FK → users) | Dono do item |
| `food_id` | UUID (FK → foods, nullable) | Referência opcional ao alimento cadastrado |
| `name` | TEXT | Nome do item (ex: "Whey Protein") |
| `category` | TEXT | Categoria (ex: "Suplementos", "Proteínas", "Grãos", "Gorduras", "Frutas") |
| `unit` | TEXT | Unidade de medida: `g`, `kg`, `ml`, `un` |
| `quantity_g` | REAL | Quantidade atual em unidades base (gramas, ml ou unidades) |
| `min_quantity_g` | REAL | Quantidade mínima desejada (mesmo sistema de unidades) |
| `image` | TEXT | Emoji representativo do item |
| `expires_at` | TIMESTAMP | Data de validade (opcional) |
| `location` | TEXT | Local de armazenamento (opcional) |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Última atualização |
| `deleted_at` | TIMESTAMP | Soft delete |

### 1.2 Tabela `purchase_records` (Registros de Compras)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID (FK → users) | Comprador |
| `food_stock_id` | UUID (FK → food_stock) | Item do estoque sendo reposto |
| `planned_quantity` | REAL | Quantidade planejada para compra |
| `actual_quantity` | REAL | Quantidade realmente comprada |
| `unit` | TEXT | Unidade da compra (`g`, `kg`, `ml`, `un`) |
| `status` | TEXT | Estado: `pending` → `confirmed` |
| `purchased_at` | TIMESTAMP | Data/hora da confirmação da compra |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Última atualização |
| `deleted_at` | TIMESTAMP | Soft delete |

---

## 2. Cálculo Automático de Status

O status de cada item é calculado em tempo real pelo backend baseado na **razão** entre quantidade atual (`quantity_g`) e quantidade mínima (`min_quantity_g`):

```
ratio = quantity_g / min_quantity_g

Se min_quantity_g <= 0 → "good" (sem controle de mínimo)
Se ratio <= 0.10      → "critical" (Crítico)
Se ratio <= 0.40      → "low"      (Baixo)
Se ratio <= 0.70      → "medium"   (Médio)
Se ratio >  0.70      → "good"     (Estoque Cheio)
```

### Mapeamento Visual

| Status | Label PT-BR | Cor | Significado |
|--------|-------------|-----|-------------|
| `good` | Estoque Cheio | Verde (#648D4A) | >= 70% do mínimo |
| `medium` | Médio | Dourado (#C7AE6A) | 40-70% do mínimo |
| `low` | Baixo | Laranja (#D97952) | 10-40% do mínimo |
| `critical` | Crítico | Vermelho (#BE4E35) | <= 10% do mínimo |

---

## 3. Fluxo de Compra (3 Etapas)

### Etapa 1: Planejamento (Lista de Compras)

A lista de compras é gerada automaticamente a partir dos itens com status `low` ou `critical`.

**Quantidade sugerida:** O sistema calcula a quantidade ideal para compra:
```
deficit = min_quantity_g - quantity_g
Se unit == "un" → Math.ceil(deficit)
Se unit == "kg" → Math.ceil(deficit / 1000) em kg
Senão          → Math.ceil(deficit / 100) * 100 em g
```

O usuário pode ajustar a quantidade com botões +/-.

### Etapa 2: Confirmação de Compra ("Comprei")

Quando o usuário toca em "Comprei", o sistema pergunta: **"Quanto comprou de fato?"**

Isso permite registrar a quantidade real, que pode ser diferente da planejada (ex: comprou mais por promoção, ou menos por falta no mercado).

### Etapa 3: Atualização Automática do Estoque

Ao confirmar a quantidade real:
1. O `quantity_g` do item no `food_stock` é **incrementado** pela quantidade comprada (convertida para unidades base)
2. O status é recalculado automaticamente
3. O item desaparece da lista de compras se o novo status for `good` ou `medium`
4. Um registro é criado em `purchase_records` para histórico

**Conversão de unidades na confirmação:**
```
Se unit == "kg" → actual_quantity * 1000 (converte para g)
Se unit == "un" → actual_quantity (mantém)
Se unit == "g"  → actual_quantity (mantém)
Se unit == "ml" → actual_quantity (mantém)
```

---

## 4. Endpoints da API

### 4.1 Estoque

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/users/:userId/food-stock/status` | Lista todos os itens com status calculado |
| `GET` | `/api/users/:userId/food-stock` | Lista itens sem status calculado |
| `POST` | `/api/food-stock` | Cria novo item no estoque |
| `PATCH` | `/api/food-stock/:id` | Atualiza item (incluindo quantity_g) |
| `DELETE` | `/api/food-stock/:id` | Soft delete de item |

### 4.2 Compras

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/purchases` | Cria registro de compra planejada |
| `POST` | `/api/purchases/:id/confirm` | Confirma compra com quantidade real |
| `POST` | `/api/users/:userId/purchases/confirm-all` | Confirma múltiplas compras de uma vez |
| `GET` | `/api/users/:userId/purchases/pending` | Lista compras pendentes |
| `GET` | `/api/users/:userId/purchases/history` | Histórico de compras confirmadas |

### 4.3 Corpo das Requisições

**POST /api/purchases**
```json
{
  "userId": "uuid",
  "foodStockId": "uuid",
  "plannedQuantity": 2,
  "actualQuantity": 0,
  "unit": "kg",
  "status": "pending"
}
```

**POST /api/purchases/:id/confirm**
```json
{
  "actualQuantity": 3
}
```

**POST /api/users/:userId/purchases/confirm-all**
```json
{
  "items": [
    { "purchaseId": "uuid", "actualQuantity": 2 },
    { "purchaseId": "uuid", "actualQuantity": 1 }
  ]
}
```

---

## 5. Fluxo de Telas (Frontend)

### 5.1 Tela: Despensa & Estoque (`/pantry`)

- Lista todos os itens do estoque com status visual (badge colorido)
- Filtros por categoria (scroll horizontal com drag)
- Banner "Lista de Compras" com contador de itens pendentes
- Dados vindos do endpoint `GET /api/users/:userId/food-stock/status`

### 5.2 Tela: Lista de Compras (`/pantry/shopping-list`)

- Mostra apenas itens com status `low` ou `critical`
- Cada item tem:
  - Nome, emoji, categoria, quantidade restante
  - Badge de status (Baixo/Crítico)
  - Controles +/- para ajustar quantidade a comprar
  - Botão "Comprei" para iniciar confirmação
- Ao clicar "Comprei":
  - Abre painel de confirmação dentro do card
  - Pergunta "Quanto comprou de fato?" com +/-
  - Botão "Confirmar" faz PATCH no estoque e atualiza
- Após confirmação:
  - Item mostra check verde + "Estoque atualizado automaticamente"
  - Barra de progresso atualiza
  - Dados são invalidados para refletir novo status

---

## 6. Regras de Negócio

1. **Itens sem `min_quantity_g`** (= 0) são sempre considerados `good` e nunca aparecem na lista de compras
2. **Quantidade nunca fica negativa** — o mínimo é 0
3. **Confirmação de compra é irreversível** — uma vez confirmada, o estoque é atualizado
4. **Status é calculado no backend** — o frontend nunca define o status manualmente
5. **Soft delete** — itens removidos mantêm histórico via `deleted_at`
6. **Unidades são preservadas** — cada item mantém sua unidade original (g, kg, ml, un) para exibição, mas o `quantity_g` armazena sempre na unidade base

---

## 7. Categorias Disponíveis

- Proteínas
- Grãos
- Suplementos
- Gorduras
- Frutas
- Outros (padrão)

---

## 8. Dados de Seed (Exemplo)

| Item | Categoria | Unidade | Qtd Atual | Qtd Mínima | Status |
|------|-----------|---------|-----------|------------|--------|
| Whey Protein | Suplementos | g | 200 | 900 | low |
| Arroz Basmati | Grãos | kg | 2000 | 2000 | good |
| Peito de Frango | Proteínas | kg | 3000 | 2000 | good |
| Azeite de Oliva | Gorduras | ml | 50 | 500 | critical |
| Aveia em Flocos | Grãos | g | 500 | 1000 | medium |
| Creatina | Suplementos | g | 300 | 300 | good |
| Banana Prata | Frutas | un | 6 | 12 | medium |
| Ovos | Proteínas | un | 30 | 30 | good |

---

## 9. Melhorias Futuras

- Histórico visual de compras por item
- Alertas de validade próxima
- Sugestão de quantidade baseada no consumo histórico
- Integração com barcode scanner para adicionar novos itens
- Compartilhamento de lista de compras via link/WhatsApp
- Preço estimado por item e total da lista
