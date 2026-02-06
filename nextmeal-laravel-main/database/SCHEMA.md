# NextMeal — Database schema (from migrations)

Schematic view of the database derived from `database/migrations`. Tables, columns (PK/FK), types, and relationships.

---

## 1. `users`

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `user_id` | char(36) | **PK** | UUID |
| `name` | string | | |
| `email` | string | unique | |
| `role` | enum('system','admin','user') | | default: 'user' |
| `password` | string | | (renamed from password_hash) |
| `remember_token` | string | nullable | |
| `notifications_enabled` | boolean | | default: true |
| `created_at` | timestamp | | |
| `updated_at` | timestamp | | |

**Relationships (outgoing):**
- One-to-many → `recipes` (owner_user_id)
- One-to-many → `inventory`
- One-to-many → `notifications`
- One-to-many → `shopping_list`
- One-to-many → `user_suggestion_preferences`
- One-to-many → `user_ingredient_thresholds`
- One-to-many → `favorites`

---

## 2. `categories`

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `category_id` | char(36) | **PK** | UUID |
| `name` | string | unique | |
| `created_at` | timestamp | | useCurrent() |

**Relationships:**
- One-to-many → `ingredients` (category_id)

---

## 3. `units`

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `unit_code` | string(20) | **PK** | e.g. g, ml, tsp |
| `unit_kind` | string(30) | | mass/volume/count |
| `base_unit` | string(20) | | base for same kind |
| `to_base_factor` | decimal(12,6) | | factor to base_unit |

**Relationships:**
- Referenced by: `inventory` (input_unit, base_unit), `recipe_ingredients` (required_unit), `ingredient_base_unit` (base_unit), `ingredient_allowed_units`, `ingredient_unit_conversions` (from_unit, to_unit), `user_ingredient_thresholds` (threshold_unit), `shopping_list` (unit_code)

---

## 4. `cuisines`

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `cuisine_id` | char(36) | **PK** | UUID |
| `name` | string | unique | |

**Relationships:**
- One-to-many → `recipes` (cuisine_id)

---

## 5. `recipe_categories`

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `recipe_category_id` | char(36) | **PK** | UUID |
| `name` | string | unique | |

**Relationships:**
- One-to-many → `recipes` (recipe_category_id)

---

## 6. `cooking_methods`

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `method_id` | char(36) | **PK** | UUID |
| `name` | string | unique | |

**Relationships:**
- One-to-many → `recipes` (method_id)

---

## 7. `ingredients`

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `ingredient_id` | char(36) | **PK** | UUID |
| `name` | string | unique | |
| `category_id` | char(36) | **FK** → categories | nullable, nullOnDelete |
| `image_url` | string(500) | nullable | |
| `default_days_until_expiry` | unsigned integer | nullable | Default shelf life in days when user skips expiration (from ingredient-expire.csv) |
| `created_at` | timestamp | | |
| `updated_at` | timestamp | | |

**Relationships:**
- Many-to-one → `categories`
- One-to-one → `ingredient_base_unit`
- One-to-many → `recipe_ingredients`
- One-to-many → `inventory`
- One-to-many → `notifications` (nullable)
- One-to-many → `shopping_list` (nullable)
- One-to-many → `user_suggestion_preferences` (nullable)
- One-to-many → `user_ingredient_thresholds`
- Many-to-many with `units` via `ingredient_allowed_units`, `ingredient_unit_conversions`

---

## 8. `recipes`

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `recipe_id` | char(36) | **PK** | UUID |
| `owner_user_id` | char(36) | **FK** → users | nullable, nullOnDelete |
| `recipe_name` | string | | |
| `description` | text | nullable | |
| `instructions` | text | nullable | |
| `prep_time` | string(50) | nullable | |
| `servings` | integer | | default: 1 |
| `image_url` | string(500) | nullable | |
| `cuisine_id` | char(36) | **FK** → cuisines | nullable, nullOnDelete |
| `recipe_category_id` | char(36) | **FK** → recipe_categories | nullable, nullOnDelete |
| `method_id` | char(36) | **FK** → cooking_methods | nullable, nullOnDelete |
| `created_at` | timestamp | | |
| `updated_at` | timestamp | | |

**Index:** (owner_user_id)

**Relationships:**
- Many-to-one → `users`, `cuisines`, `recipe_categories`, `cooking_methods`
- One-to-many → `recipe_ingredients`
- One-to-many → `recipe_steps`
- One-to-many → `user_suggestion_preferences` (source_ref_recipe_id, nullable)
- One-to-many → `favorites`

---

## 9. `recipe_ingredients` (pivot: recipes ↔ ingredients)

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `recipe_ingredient_id` | char(36) | **PK** | UUID |
| `recipe_id` | char(36) | **FK** → recipes | cascadeOnDelete |
| `ingredient_id` | char(36) | **FK** → ingredients | cascadeOnDelete |
| `required_quantity` | decimal(12,3) | | |
| `required_unit` | string(20) | **FK** → units | restrictOnDelete |
| `created_at` | timestamp | | |
| `updated_at` | timestamp | | |

**Unique:** (recipe_id, ingredient_id)

---

## 10. `recipe_steps`

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `recipe_step_id` | char(36) | **PK** | UUID |
| `recipe_id` | char(36) | **FK** → recipes | cascadeOnDelete |
| `step_number` | unsigned integer | | Order within recipe |
| `description` | text | | Step text |
| `created_at` | timestamp | | |
| `updated_at` | timestamp | | |

**Index:** (recipe_id)

**Relationships:**
- Many-to-one → `recipes`

---

## 11. `inventory`

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `inventory_id` | char(36) | **PK** | UUID |
| `user_id` | char(36) | **FK** → users | cascadeOnDelete |
| `ingredient_id` | char(36) | **FK** → ingredients | cascadeOnDelete |
| `input_quantity` | decimal(12,3) | | |
| `input_unit` | string(20) | **FK** → units | restrictOnDelete |
| `base_quantity` | decimal(12,3) | | |
| `base_unit` | string(20) | **FK** → units | restrictOnDelete |
| `image_url` | string(500) | nullable | |
| `minimum_threshold` | decimal(12,3) | nullable | |
| `expiration_date` | date | nullable | |
| `last_updated` | timestamp | nullable | |
| `created_at` | timestamp | | |
| `updated_at` | timestamp | | |

**Indexes:** (user_id, ingredient_id), (expiration_date)

**Relationships:**
- Many-to-one → `users`, `ingredients`, `units` (input_unit, base_unit)
- One-to-many → `notifications` (related_inventory_id, nullable)

---

## 12. `notifications`

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `notification_id` | char(36) | **PK** | UUID |
| `user_id` | char(36) | **FK** → users | cascadeOnDelete |
| `ingredient_id` | char(36) | **FK** → ingredients | nullable, nullOnDelete |
| `related_inventory_id` | char(36) | **FK** → inventory | nullable, nullOnDelete |
| `notification_type` | string(30) | | e.g. expiration, low_stock, info |
| `severity` | string(20) | | e.g. normal, safety |
| `state` | string(20) | | e.g. active, resolved |
| `is_read` | boolean | | default: false |
| `delivery_status` | string(20) | nullable | sent/failed/skipped |
| `payload` | json | nullable | |
| `is_active` | boolean | | default: true |
| `sent_at` | timestamp | nullable | |
| `created_at` | timestamp | | useCurrent() |
| `read_at` | timestamp | nullable | |
| `resolved_at` | timestamp | nullable | |

**Unique:** (user_id, related_inventory_id, notification_type, is_active) as uniq_active_notifications  
**Index:** (user_id, is_read)

**Relationships:**
- Many-to-one → `users`, `ingredients`, `inventory`

---

## 13. `shopping_list`

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `shopping_list_id` | char(36) | **PK** | UUID |
| `user_id` | char(36) | **FK** → users | cascadeOnDelete |
| `ingredient_id` | char(36) | **FK** → ingredients | nullable, nullOnDelete |
| `quantity` | decimal(12,3) | | |
| `unit_code` | string(20) | **FK** → units | restrictOnDelete |
| `is_checked` | boolean | | default: false |
| `created_at` | timestamp | | |
| `updated_at` | timestamp | | |

**Indexes:** (user_id), (user_id, is_checked)

**Relationships:**
- Many-to-one → `users`, `ingredients`, `units`

---

## 14. `ingredient_base_unit`

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `ingredient_id` | char(36) | **PK**, **FK** → ingredients | cascadeOnDelete |
| `base_unit` | string(20) | **FK** → units | restrictOnDelete |

**Relationships:**
- One-to-one with `ingredients`

---

## 15. `ingredient_allowed_units` (pivot: ingredients ↔ units)

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `ingredient_id` | char(36) | **PK**, **FK** → ingredients | cascadeOnDelete |
| `unit_code` | string(20) | **PK**, **FK** → units | restrictOnDelete |

**Composite PK:** (ingredient_id, unit_code)

---

## 16. `ingredient_unit_conversions`

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `ingredient_id` | char(36) | **PK**, **FK** → ingredients | cascadeOnDelete |
| `from_unit` | string(20) | **PK**, **FK** → units | restrictOnDelete |
| `to_unit` | string(20) | **PK**, **FK** → units | restrictOnDelete |
| `factor` | decimal(12,6) | | |
| `is_approx` | boolean | | default: false |

**Composite PK:** (ingredient_id, from_unit, to_unit)

---

## 17. `user_ingredient_thresholds`

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `user_id` | char(36) | **PK**, **FK** → users | cascadeOnDelete |
| `ingredient_id` | char(36) | **PK**, **FK** → ingredients | cascadeOnDelete |
| `threshold_quantity` | decimal(12,3) | | |
| `threshold_unit` | string(20) | **FK** → units | restrictOnDelete |
| `created_at` | timestamp | | |
| `updated_at` | timestamp | | |

**Composite PK:** (user_id, ingredient_id)

**Relationships:**
- Many-to-one → `users`, `ingredients`, `units`

---

## 18. `user_suggestion_preferences`

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `preference_id` | char(36) | **PK** | UUID |
| `user_id` | char(36) | **FK** → users | cascadeOnDelete |
| `ingredient_id` | char(36) | **FK** → ingredients | nullable, nullOnDelete |
| `source_type` | string(30) | | recipe/ingredient/system |
| `source_ref_recipe_id` | char(36) | **FK** → recipes | nullable, nullOnDelete |
| `status` | string(20) | | active/snoozed/disabled |
| `snooze_until` | timestamp | nullable | |
| `created_at` | timestamp | | |
| `updated_at` | timestamp | | |

**Index:** (user_id)

**Relationships:**
- Many-to-one → `users`, `ingredients`, `recipes`

---

## 19. `favorites`

| Column | Type | Key | Notes |
|--------|------|-----|--------|
| `favorite_id` | char(36) | **PK** | UUID |
| `user_id` | char(36) | **FK** → users | cascadeOnDelete |
| `recipe_id` | char(36) | **FK** → recipes | cascadeOnDelete |
| `created_at` | timestamp | | |
| `updated_at` | timestamp | | |

**Unique:** (user_id, recipe_id)

**Relationships:**
- Many-to-one → `users`, `recipes`

---

## Other system tables (Laravel)

- **`migrations`** — id, migration, batch  
- **`cache`** — key, value, expiration  
- **`cache_locks`** — key, owner, expiration  
- **`jobs`** — queue jobs  
- **`job_batches`** — batch tracking  
- **`failed_jobs`** — failed job log  
- **`sessions`** — session data  
- **`personal_access_tokens`** — API tokens (e.g. Sanctum)

---

## Entity–relationship diagram (Mermaid)

Render this in any Mermaid-compatible viewer (e.g. GitHub, VS Code Mermaid extension, [mermaid.live](https://mermaid.live)).

```mermaid
erDiagram
    users ||--o{ recipes : "owns"
    users ||--o{ inventory : "has"
    users ||--o{ notifications : "receives"
    users ||--o{ shopping_list : "has"
    users ||--o{ user_suggestion_preferences : "has"
    users ||--o{ user_ingredient_thresholds : "sets"
    users ||--o{ favorites : "has"

    categories ||--o{ ingredients : "categorizes"
    ingredients ||--o{ recipe_ingredients : "in"
    ingredients ||--o{ inventory : "in"
    ingredients ||--o| notifications : "about"
    ingredients ||--o| shopping_list : "in"
    ingredients ||--o| user_suggestion_preferences : "about"
    ingredients ||--o{ user_ingredient_thresholds : "threshold"
    ingredients ||--|| ingredient_base_unit : "has base unit"
    ingredients }o--o{ units : "allowed_units"
    ingredients }o--o{ units : "unit_conversions"

    recipes ||--o{ recipe_ingredients : "contains"
    recipes ||--o{ recipe_steps : "has steps"
    recipes ||--o| user_suggestion_preferences : "source_ref"
    recipes ||--o{ favorites : "favorited"

    cuisines ||--o{ recipes : "cuisine"
    recipe_categories ||--o{ recipes : "category"
    cooking_methods ||--o{ recipes : "method"

    units ||--o{ inventory : "input_unit, base_unit"
    units ||--o{ recipe_ingredients : "required_unit"
    units ||--o{ ingredient_base_unit : "base_unit"
    units ||--o{ ingredient_allowed_units : "unit_code"
    units ||--o{ ingredient_unit_conversions : "from_unit, to_unit"
    units ||--o{ user_ingredient_thresholds : "threshold_unit"
    units ||--o{ shopping_list : "unit_code"

    inventory ||--o| notifications : "related_inventory"

    users {
        char user_id PK
        string name
        string email
        enum role
        string password
        boolean notifications_enabled
        timestamps
    }

    categories {
        char category_id PK
        string name
        timestamp created_at
    }

    units {
        string unit_code PK
        string unit_kind
        string base_unit
        decimal to_base_factor
    }

    ingredients {
        char ingredient_id PK
        string name
        char category_id FK
        string image_url
        timestamps
    }

    recipes {
        char recipe_id PK
        char owner_user_id FK
        string recipe_name
        text description
        text instructions
        string prep_time
        int servings
        string image_url
        char cuisine_id FK
        char recipe_category_id FK
        char method_id FK
        timestamps
    }

    recipe_steps {
        char recipe_step_id PK
        char recipe_id FK
        int step_number
        text description
        timestamps
    }

    recipe_ingredients {
        char recipe_ingredient_id PK
        char recipe_id FK
        char ingredient_id FK
        decimal required_quantity
        string required_unit FK
        timestamps
    }

    inventory {
        char inventory_id PK
        char user_id FK
        char ingredient_id FK
        decimal input_quantity
        string input_unit FK
        decimal base_quantity
        string base_unit FK
        string image_url
        decimal minimum_threshold
        date expiration_date
        timestamps
    }

    notifications {
        char notification_id PK
        char user_id FK
        char ingredient_id FK
        char related_inventory_id FK
        string notification_type
        string severity
        string state
        boolean is_read
        json payload
        timestamps
    }

    shopping_list {
        char shopping_list_id PK
        char user_id FK
        char ingredient_id FK
        decimal quantity
        string unit_code FK
        boolean is_checked
        timestamps
    }

    ingredient_base_unit {
        char ingredient_id PK_FK
        string base_unit FK
    }

    ingredient_allowed_units {
        char ingredient_id PK_FK
        string unit_code PK_FK
    }

    ingredient_unit_conversions {
        char ingredient_id PK_FK
        string from_unit PK_FK
        string to_unit PK_FK
        decimal factor
        boolean is_approx
    }

    user_ingredient_thresholds {
        char user_id PK_FK
        char ingredient_id PK_FK
        decimal threshold_quantity
        string threshold_unit FK
        timestamps
    }

    user_suggestion_preferences {
        char preference_id PK
        char user_id FK
        char ingredient_id FK
        string source_type
        char source_ref_recipe_id FK
        string status
        timestamp snooze_until
        timestamps
    }

    favorites {
        char favorite_id PK
        char user_id FK
        char recipe_id FK
        timestamps
    }

    cuisines {
        char cuisine_id PK
        string name
    }

    recipe_categories {
        char recipe_category_id PK
        string name
    }

    cooking_methods {
        char method_id PK
        string name
    }
```

---

*Generated from `database/migrations` in nextmeal-laravel-main.*
