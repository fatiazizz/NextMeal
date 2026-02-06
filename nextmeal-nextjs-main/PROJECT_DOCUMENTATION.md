# 📚 NextMeal - مستندات فنی پروژه

> یک اپلیکیشن مدیریت غذا و دستور پخت هوشمند

---

## 📋 فهرست مطالب

1. [معرفی پروژه](#-معرفی-پروژه)
2. [معماری سیستم](#-معماری-سیستم)
3. [بخش Backend (Laravel)](#-backend-laravel)
4. [بخش Frontend (Next.js)](#-frontend-nextjs)
5. [مدل‌های داده (Models)](#-مدلهای-داده-models)
6. [API Endpoints](#-api-endpoints)
7. [احراز هویت و مجوزها](#-احراز-هویت-و-مجوزها)
8. [قابلیت‌های اصلی](#-قابلیتهای-اصلی)

---

## 🎯 معرفی پروژه

**NextMeal** یک اپلیکیشن وب برای مدیریت موجودی آشپزخانه، پیشنهاد غذا بر اساس مواد موجود، و مدیریت لیست خرید است.

### ویژگی‌های کلیدی:
- 📦 مدیریت موجودی آشپزخانه (Inventory Management)
- 🍳 پیشنهاد غذا هوشمند بر اساس مواد موجود (Meal Recommendations)
- 📝 مدیریت دستور پخت‌ها (Recipe Management)
- 🛒 لیست خرید هوشمند (Shopping List)
- ⭐ علاقه‌مندی‌ها (Favorites)
- 🔔 نوتیفیکیشن‌ها (Expiry & Low Stock Alerts)
- 👤 پنل مدیریت (Admin Panel)

---

## 🏗 معماری سیستم

```
NextMeal/
├── backend-laravel/     # سرور API با Laravel 11
│   ├── app/
│   │   ├── Models/      # مدل‌های Eloquent
│   │   ├── Http/
│   │   │   ├── Controllers/Api/  # کنترلرهای REST API
│   │   │   ├── Middleware/       # میان‌افزارها
│   │   │   └── Requests/         # Form Requests
│   │   └── Providers/
│   ├── routes/
│   │   ├── api.php      # مسیرهای API
│   │   └── auth.php     # مسیرهای احراز هویت
│   └── database/
│       ├── migrations/  # تغییرات دیتابیس
│       └── seeders/     # داده‌های اولیه
│
└── nextmeal-ui/         # فرانت‌اند با Next.js 15
    ├── app/             # صفحات (App Router)
    ├── components/      # کامپوننت‌های React
    ├── context/         # Context Providers
    ├── types/           # TypeScript Types
    └── utils/           # توابع کمکی و API calls
```

### تکنولوژی‌ها:

| بخش | تکنولوژی |
|-----|----------|
| Backend | Laravel 11, PHP 8.2+ |
| Frontend | Next.js 15, React 18, TypeScript |
| Database | PostgreSQL / MySQL |
| Authentication | Laravel Sanctum (Token-based) |
| Styling | Tailwind CSS |
| State Management | React Context API |

---

## 🔧 Backend (Laravel)

### ساختار پوشه‌ها:

```
app/
├── Console/Commands/      # دستورات Artisan سفارشی
├── Http/
│   ├── Controllers/
│   │   └── Api/
│   │       ├── AuthController.php         # احراز هویت
│   │       ├── InventoryController.php    # مدیریت موجودی
│   │       ├── RecipeController.php       # مدیریت دستور پخت
│   │       ├── ShoppingListController.php # لیست خرید
│   │       ├── FavoriteController.php     # علاقه‌مندی‌ها
│   │       ├── NotificationController.php # نوتیفیکیشن‌ها
│   │       ├── RecommendationController.php # پیشنهاد غذا
│   │       ├── IngredientController.php   # جستجوی مواد اولیه
│   │       └── AdminController.php        # پنل ادمین
│   ├── Middleware/
│   │   └── EnsureAdmin.php               # بررسی دسترسی ادمین
│   └── Requests/                         # اعتبارسنجی درخواست‌ها
│
├── Models/                # مدل‌های Eloquent
│   ├── User.php
│   ├── Recipe.php
│   ├── Ingredient.php
│   ├── Inventory.php
│   ├── ShoppingList.php
│   ├── Favorite.php
│   ├── Notification.php
│   ├── Category.php
│   ├── Unit.php
│   ├── Cuisine.php
│   ├── RecipeCategory.php
│   ├── CookingMethod.php
│   └── ...
│
└── Providers/
    └── AppServiceProvider.php
```

---

## 🖥 Frontend (Next.js)

### ساختار صفحات (App Router):

```
app/
├── page.tsx              # صفحه اصلی (Dashboard)
├── layout.tsx            # Layout اصلی
├── providers.tsx         # Context Providers
├── login/page.tsx        # صفحه ورود
├── inventory/page.tsx    # مدیریت موجودی
├── meals/page.tsx        # پیشنهاد غذا
├── recipe/[id]/page.tsx  # جزئیات دستور پخت
├── shopping/page.tsx     # لیست خرید
├── favorites/page.tsx    # علاقه‌مندی‌ها
├── profile/page.tsx      # پروفایل کاربر
└── admin/                # پنل ادمین
    ├── page.tsx          # داشبورد ادمین
    ├── users/page.tsx    # مدیریت کاربران
    ├── recipes/page.tsx  # مدیریت دستور پخت‌ها
    ├── ingredients/page.tsx # مدیریت مواد اولیه
    └── settings/page.tsx # تنظیمات سیستم
```

### کامپوننت‌های اصلی:

```
components/
├── auth/
│   ├── LoginPage.tsx        # فرم ورود/ثبت‌نام
│   └── ProtectedRoute.tsx   # محافظت از مسیرها
│
├── layout/
│   ├── AppHeader.tsx        # هدر اپلیکیشن
│   ├── LayoutWrapper.tsx    # wrapper اصلی
│   └── NotificationBell.tsx # زنگوله نوتیفیکیشن
│
├── Inventory/
│   └── InventoryPage.tsx    # صفحه موجودی
│
├── meals/
│   └── MealSuggestionPage.tsx # صفحه پیشنهاد غذا
│
├── recipes/
│   ├── RecipePage.tsx       # نمایش دستور پخت
│   └── RecipeEditModal.tsx  # مودال ویرایش
│
├── shopping/
│   └── ShoppingListPage.tsx # صفحه لیست خرید
│
├── favorites/
│   └── FavoritesPage.tsx    # صفحه علاقه‌مندی‌ها
│
├── profile/
│   └── ProfilePage.tsx      # صفحه پروفایل
│
└── admin/
    ├── AdminDashboard.tsx   # داشبورد ادمین
    ├── AdminUsersPage.tsx   # مدیریت کاربران
    ├── AdminRecipesPage.tsx # مدیریت دستور پخت
    ├── AdminIngredientsPage.tsx # مدیریت مواد اولیه
    └── AdminSettingsPage.tsx # تنظیمات
```

### Context ها:

| Context | توضیحات |
|---------|---------|
| `UserContext` | مدیریت احراز هویت، کاربر فعلی و نقش‌ها |
| `InventoryContext` | مدیریت موجودی، دستور پخت‌ها، لیست خرید و علاقه‌مندی‌ها |
| `NotificationContext` | مدیریت نوتیفیکیشن‌ها |
| `ThemeContext` | مدیریت تم (روشن/تاریک) |

---

## 📊 مدل‌های داده (Models)

### 1. User (کاربر)

```php
// app/Models/User.php
```

| فیلد | نوع | توضیحات |
|------|-----|---------|
| `user_id` | UUID | شناسه یکتای کاربر (Primary Key) |
| `name` | string | نام کاربر |
| `email` | string | ایمیل (یکتا) |
| `password` | string | رمز عبور (هش شده) |
| `role` | enum | نقش: `system`, `admin`, `user` |
| `notifications_enabled` | boolean | فعال بودن نوتیفیکیشن |

**نقش‌ها:**
- `system`: کاربر سیستمی (مالک دستور پخت‌های پیش‌فرض)
- `admin`: مدیر سیستم
- `user`: کاربر عادی

**روابط:**
- `inventory()` → HasMany → Inventory
- `recipes()` → HasMany → Recipe
- `favorites()` → HasMany → Favorite
- `shoppingList()` → HasMany → ShoppingList
- `notifications()` → HasMany → Notification

---

### 2. Ingredient (ماده اولیه)

```php
// app/Models/Ingredient.php
```

**توضیح:** لیست اصلی مواد اولیه در سیستم. این یک لیست مرکزی است که همه کاربران از آن استفاده می‌کنند.

| فیلد | نوع | توضیحات |
|------|-----|---------|
| `ingredient_id` | UUID | شناسه یکتا |
| `name` | string | نام ماده اولیه (مثلاً: "Tomato", "Milk") |
| `category_id` | UUID | دسته‌بندی (FK → categories) |

**روابط:**
- `category()` → BelongsTo → Category
- `inventoryItems()` → HasMany → Inventory
- `recipeIngredients()` → HasMany → RecipeIngredient
- `baseUnit()` → HasOne → IngredientBaseUnit

**کاربرد:**
- هنگام اضافه کردن آیتم به موجودی، کاربر از این لیست انتخاب می‌کند
- هنگام ایجاد دستور پخت، از این لیست برای مواد لازم استفاده می‌شود

---

### 3. Inventory (موجودی)

```php
// app/Models/Inventory.php
```

**توضیح:** موجودی آشپزخانه هر کاربر. هر رکورد نشان‌دهنده یک ماده اولیه در آشپزخانه کاربر است.

| فیلد | نوع | توضیحات |
|------|-----|---------|
| `inventory_id` | UUID | شناسه یکتا |
| `user_id` | UUID | مالک (FK → users) |
| `ingredient_id` | UUID | ماده اولیه (FK → ingredients) |
| `input_quantity` | decimal | مقدار وارد شده |
| `input_unit` | string | واحد وارد شده (مثلاً: "kg", "l") |
| `base_quantity` | decimal | مقدار تبدیل شده به واحد پایه |
| `base_unit` | string | واحد پایه |
| `minimum_threshold` | decimal | حداقل موجودی (برای هشدار) |
| `expiration_date` | date | تاریخ انقضا |
| `last_updated` | datetime | آخرین بروزرسانی |

**متدهای مفید:**
- `isLowStock()` → آیا موجودی کم است؟
- `isExpiringSoon()` → آیا به زودی منقضی می‌شود؟ (۳ روز)
- `isExpired()` → آیا منقضی شده؟

**روابط:**
- `user()` → BelongsTo → User
- `ingredient()` → BelongsTo → Ingredient

---

### 4. Recipe (دستور پخت)

```php
// app/Models/Recipe.php
```

**توضیح:** دستور پخت غذاها. شامل دستور پخت‌های سیستمی (پیش‌فرض) و دستور پخت‌های کاربران.

| فیلد | نوع | توضیحات |
|------|-----|---------|
| `recipe_id` | UUID | شناسه یکتا |
| `owner_user_id` | UUID | مالک (سیستم یا کاربر) |
| `recipe_name` | string | نام غذا |
| `description` | text | توضیحات |
| `instructions` | JSON | مراحل پخت (آرایه‌ای از رشته‌ها) |
| `prep_time` | string | زمان آماده‌سازی (مثلاً: "30 min") |
| `servings` | integer | تعداد پرس |
| `image_url` | string | آدرس تصویر |
| `cuisine_id` | UUID | نوع آشپزی (FK → cuisines) |
| `recipe_category_id` | UUID | دسته‌بندی غذا (FK → recipe_categories) |
| `method_id` | UUID | روش پخت (FK → cooking_methods) |

**روابط:**
- `owner()` → BelongsTo → User
- `recipeIngredients()` → HasMany → RecipeIngredient
- `favorites()` → HasMany → Favorite

**متدهای مفید:**
- `isSystemRecipe()` → آیا دستور پخت سیستمی است؟
- `getRequiredIngredientsAttribute()` → لیست نام مواد لازم
- `getIngredientDetailsAttribute()` → جزئیات مواد با مقدار و واحد

---

### 5. RecipeIngredient (مواد لازم دستور پخت)

**توضیح:** جدول واسط بین Recipe و Ingredient. مشخص می‌کند هر دستور پخت به چه موادی و چه مقداری نیاز دارد.

| فیلد | نوع | توضیحات |
|------|-----|---------|
| `recipe_ingredient_id` | UUID | شناسه یکتا |
| `recipe_id` | UUID | دستور پخت (FK) |
| `ingredient_id` | UUID | ماده اولیه (FK) |
| `required_quantity` | decimal | مقدار مورد نیاز |
| `required_unit` | string | واحد مورد نیاز |

---

### 6. ShoppingList (لیست خرید)

```php
// app/Models/ShoppingList.php
```

**توضیح:** لیست خرید هر کاربر. موادی که کاربر باید بخرد.

| فیلد | نوع | توضیحات |
|------|-----|---------|
| `shopping_list_id` | UUID | شناسه یکتا |
| `user_id` | UUID | مالک (FK) |
| `ingredient_id` | UUID | ماده اولیه (FK) |
| `quantity` | decimal | مقدار |
| `unit_code` | string | واحد |
| `is_checked` | boolean | آیا خریداری شده؟ |

**روابط:**
- `user()` → BelongsTo → User
- `ingredient()` → BelongsTo → Ingredient

---

### 7. Favorite (علاقه‌مندی)

```php
// app/Models/Favorite.php
```

**توضیح:** دستور پخت‌های مورد علاقه هر کاربر.

| فیلد | نوع | توضیحات |
|------|-----|---------|
| `favorite_id` | UUID | شناسه یکتا |
| `user_id` | UUID | کاربر (FK) |
| `recipe_id` | UUID | دستور پخت (FK) |

---

### 8. Notification (نوتیفیکیشن)

```php
// app/Models/Notification.php
```

**توضیح:** هشدارها و اعلان‌ها برای کاربر (مثلاً: انقضای مواد، موجودی کم).

| فیلد | نوع | توضیحات |
|------|-----|---------|
| `notification_id` | UUID | شناسه یکتا |
| `user_id` | UUID | کاربر (FK) |
| `ingredient_id` | UUID | ماده مرتبط (FK) - اختیاری |
| `related_inventory_id` | UUID | موجودی مرتبط (FK) - اختیاری |
| `notification_type` | enum | نوع: `expiration`, `low_stock`, `info` |
| `severity` | enum | شدت: `normal`, `safety` |
| `state` | enum | وضعیت: `active`, `resolved` |
| `is_read` | boolean | خوانده شده؟ |
| `payload` | JSON | داده‌های اضافی (پیام، روز تا انقضا، ...) |
| `sent_at` | datetime | زمان ارسال |
| `read_at` | datetime | زمان خواندن |
| `is_active` | boolean | فعال است؟ |

**انواع نوتیفیکیشن:**
- `expiration`: هشدار انقضای ماده اولیه
- `low_stock`: هشدار موجودی کم
- `info`: اطلاعات عمومی

---

### 9. Category (دسته‌بندی مواد اولیه)

```php
// app/Models/Category.php
```

**توضیح:** دسته‌بندی مواد اولیه (مثلاً: لبنیات، سبزیجات، گوشت).

| فیلد | نوع | توضیحات |
|------|-----|---------|
| `category_id` | UUID | شناسه یکتا |
| `name` | string | نام دسته‌بندی |

**روابط:**
- `ingredients()` → HasMany → Ingredient

---

### 10. Unit (واحد اندازه‌گیری)

```php
// app/Models/Unit.php
```

**توضیح:** واحدهای اندازه‌گیری (مثلاً: kg, g, l, ml, pcs).

| فیلد | نوع | توضیحات |
|------|-----|---------|
| `unit_code` | string | کد واحد (Primary Key) |
| `unit_kind` | string | نوع واحد (وزن، حجم، تعداد) |
| `base_unit` | string | واحد پایه |
| `to_base_factor` | decimal | ضریب تبدیل به واحد پایه |

**مثال:**
- `g` → base_unit: `g`, factor: `1`
- `kg` → base_unit: `g`, factor: `1000`
- `ml` → base_unit: `ml`, factor: `1`
- `l` → base_unit: `ml`, factor: `1000`

---

### 11. Cuisine (نوع آشپزی)

```php
// app/Models/Cuisine.php
```

**توضیح:** نوع آشپزی/ملیت غذا (مثلاً: ایرانی، ایتالیایی، چینی).

| فیلد | نوع | توضیحات |
|------|-----|---------|
| `cuisine_id` | UUID | شناسه یکتا |
| `name` | string | نام |

---

### 12. RecipeCategory (دسته‌بندی غذا)

```php
// app/Models/RecipeCategory.php
```

**توضیح:** دسته‌بندی غذاها (مثلاً: صبحانه، ناهار، شام، دسر).

| فیلد | نوع | توضیحات |
|------|-----|---------|
| `recipe_category_id` | UUID | شناسه یکتا |
| `name` | string | نام |

---

### 13. CookingMethod (روش پخت)

```php
// app/Models/CookingMethod.php
```

**توضیح:** روش‌های پخت غذا (مثلاً: سرخ کردن، پختن، بخارپز).

| فیلد | نوع | توضیحات |
|------|-----|---------|
| `method_id` | UUID | شناسه یکتا |
| `name` | string | نام |

---

## 🔌 API Endpoints

### Authentication (احراز هویت)

| Method | Endpoint | توضیحات |
|--------|----------|---------|
| POST | `/api/register` | ثبت‌نام کاربر جدید |
| POST | `/api/login` | ورود و دریافت توکن |
| POST | `/api/logout` | خروج (نیاز به توکن) |
| GET | `/api/me` | دریافت اطلاعات کاربر فعلی |
| PUT | `/api/profile` | بروزرسانی پروفایل |
| POST | `/api/change-password` | تغییر رمز عبور |
| POST | `/api/forgot-password` | درخواست بازیابی رمز |
| POST | `/api/reset-password` | تنظیم رمز جدید |

---

### Ingredients (مواد اولیه - جستجو)

| Method | Endpoint | توضیحات |
|--------|----------|---------|
| GET | `/api/ingredients` | لیست همه مواد اولیه |
| GET | `/api/ingredients/search?q=...` | جستجوی مواد اولیه |
| GET | `/api/ingredients/{id}` | جزئیات یک ماده اولیه |

---

### Inventory (موجودی)

| Method | Endpoint | توضیحات |
|--------|----------|---------|
| GET | `/api/inventory` | لیست موجودی کاربر |
| GET | `/api/inventory/low-stock` | آیتم‌های کم‌موجودی |
| POST | `/api/inventory` | اضافه کردن به موجودی |
| GET | `/api/inventory/{id}` | جزئیات یک آیتم |
| PUT | `/api/inventory/{id}` | بروزرسانی آیتم |
| DELETE | `/api/inventory/{id}` | حذف آیتم |

**نمونه درخواست POST:**
```json
{
  "name": "Milk",
  "quantity": 2,
  "unit": "l",
  "expiry_date": "2026-02-15",
  "minimum_threshold": 1
}
```

---

### Recipes (دستور پخت)

| Method | Endpoint | توضیحات |
|--------|----------|---------|
| GET | `/api/recipes` | لیست دستور پخت‌ها |
| POST | `/api/recipes` | ایجاد دستور پخت جدید |
| GET | `/api/recipes/{id}` | جزئیات یک دستور پخت |
| GET | `/api/recipes/{id}/permissions` | بررسی دسترسی‌ها |
| PUT | `/api/recipes/{id}` | بروزرسانی دستور پخت |
| DELETE | `/api/recipes/{id}` | حذف دستور پخت |

**نمونه درخواست POST:**
```json
{
  "name": "Scrambled Eggs",
  "description": "Simple and quick breakfast",
  "prep_time": "10 min",
  "servings": 2,
  "required_ingredients": ["egg", "butter", "salt"],
  "ingredient_details": [
    {"ingredient": "egg", "quantity": 3, "unit": "pcs"},
    {"ingredient": "butter", "quantity": 20, "unit": "g"},
    {"ingredient": "salt"}
  ],
  "instructions": [
    "Beat eggs in a bowl",
    "Melt butter in pan",
    "Add eggs and scramble",
    "Season with salt"
  ]
}
```

---

### Shopping List (لیست خرید)

| Method | Endpoint | توضیحات |
|--------|----------|---------|
| GET | `/api/shopping-list` | لیست خرید کاربر |
| POST | `/api/shopping-list` | اضافه کردن آیتم |
| PUT | `/api/shopping-list/{id}` | بروزرسانی آیتم |
| PATCH | `/api/shopping-list/{id}/toggle` | تغییر وضعیت خریداری شده |
| DELETE | `/api/shopping-list/{id}` | حذف آیتم |
| DELETE | `/api/shopping-list/clear-checked` | حذف آیتم‌های خریداری شده |

---

### Favorites (علاقه‌مندی‌ها)

| Method | Endpoint | توضیحات |
|--------|----------|---------|
| GET | `/api/favorites` | لیست علاقه‌مندی‌ها |
| POST | `/api/favorites` | اضافه به علاقه‌مندی‌ها |
| GET | `/api/favorites/{recipeId}/check` | بررسی علاقه‌مند بودن |
| DELETE | `/api/favorites/{recipeId}` | حذف از علاقه‌مندی‌ها |

---

### Notifications (نوتیفیکیشن‌ها)

| Method | Endpoint | توضیحات |
|--------|----------|---------|
| GET | `/api/notifications` | لیست نوتیفیکیشن‌ها |
| POST | `/api/notifications` | ایجاد نوتیفیکیشن |
| PATCH | `/api/notifications/{id}/read` | علامت‌گذاری به عنوان خوانده شده |
| PATCH | `/api/notifications/mark-all-read` | همه را خوانده شده کن |
| DELETE | `/api/notifications/{id}` | حذف نوتیفیکیشن |

---

### Recommendations (پیشنهاد غذا)

| Method | Endpoint | توضیحات |
|--------|----------|---------|
| GET | `/api/recommendations` | دریافت پیشنهادات غذا |

**نمونه پاسخ:**
```json
{
  "data": [
    {
      "id": "uuid...",
      "name": "Tomato Omelette",
      "requiredIngredients": ["Egg", "Tomato", "Salt"],
      "matchedIngredients": ["Egg", "Tomato"],
      "missingIngredients": ["Salt"],
      "matchPercentage": 75.5,
      "usesExpiringIngredients": true,
      "prepTime": "15 min",
      "servings": 2
    }
  ],
  "meta": {
    "total_recipes": 5,
    "inventory_items": 10,
    "expiring_items": 2
  }
}
```

**الگوریتم پیشنهاد:**
1. دریافت موجودی کاربر
2. تطبیق مواد با دستور پخت‌ها
3. **اولویت** به غذاهایی که از مواد در حال انقضا استفاده می‌کنند
4. محاسبه درصد تطابق
5. مرتب‌سازی بر اساس اولویت و درصد تطابق

---

### Admin Endpoints (پنل مدیریت)

> نیاز به نقش `admin` دارد

#### Dashboard

| Method | Endpoint | توضیحات |
|--------|----------|---------|
| GET | `/api/admin/statistics` | آمار کلی سیستم |

#### Users Management

| Method | Endpoint | توضیحات |
|--------|----------|---------|
| GET | `/api/admin/users` | لیست کاربران |
| GET | `/api/admin/users/{id}` | جزئیات کاربر |
| PUT | `/api/admin/users/{id}` | بروزرسانی کاربر |
| PUT | `/api/admin/users/{id}/role` | تغییر نقش کاربر |
| DELETE | `/api/admin/users/{id}` | حذف کاربر |

#### Recipes Management

| Method | Endpoint | توضیحات |
|--------|----------|---------|
| GET | `/api/admin/recipes` | لیست همه دستور پخت‌ها |
| PUT | `/api/admin/recipes/{id}` | بروزرسانی دستور پخت |
| DELETE | `/api/admin/recipes/{id}` | حذف دستور پخت |

#### Ingredients, Categories, Units, Cuisines, etc.

مشابه الگوی CRUD برای:
- `/api/admin/ingredients`
- `/api/admin/categories`
- `/api/admin/units`
- `/api/admin/cuisines`
- `/api/admin/recipe-categories`
- `/api/admin/cooking-methods`

---

## 🔐 احراز هویت و مجوزها

### سیستم توکن (Laravel Sanctum)

1. **ثبت‌نام/ورود:** کلاینت توکن دریافت می‌کند
2. **درخواست‌های بعدی:** توکن در هدر `Authorization: Bearer {token}` ارسال می‌شود
3. **خروج:** توکن باطل می‌شود

### نقش‌ها و دسترسی‌ها

| عملیات | System | Admin | User |
|--------|--------|-------|------|
| مشاهده دستور پخت‌های سیستمی | - | ✅ | ✅ |
| ویرایش دستور پخت سیستمی | - | ✅ | ❌ |
| ویرایش دستور پخت خود | - | ✅ | ✅ |
| حذف دستور پخت خود | - | ✅ | ✅ |
| حذف دستور پخت سیستمی | - | ✅ | ❌ |
| پنل ادمین | - | ✅ | ❌ |
| مدیریت کاربران | - | ✅ | ❌ |

### Permission Checks (بررسی دسترسی)

```typescript
// Frontend
const { canEditRecipe, canDeleteRecipe } = useUser();

if (canEditRecipe(recipe.ownerUserId)) {
  // نمایش دکمه ویرایش
}
```

```php
// Backend
if ($user->canEditRecipe($recipe)) {
    // اجازه ویرایش
}
```

---

## ⭐ قابلیت‌های اصلی

### 1. مدیریت موجودی (Inventory Management)

**هدف:** ثبت و پیگیری مواد اولیه موجود در آشپزخانه کاربر

**ویژگی‌ها:**
- اضافه/ویرایش/حذف مواد
- ثبت تاریخ انقضا
- تنظیم حداقل موجودی (threshold)
- هشدار موجودی کم
- هشدار نزدیک شدن به تاریخ انقضا


**فرآیند:**
1. کاربر ماده اولیه را از لیست سیستمی انتخاب می‌کند
2. مقدار، واحد و تاریخ انقضا را وارد می‌کند
3. سیستم در صورت لزوم، واحد را به واحد پایه تبدیل می‌کند
4. در صورت موجودی کم یا نزدیک شدن به انقضا، نوتیفیکیشن ارسال می‌شود

---

### 2. پیشنهاد غذا (Meal Recommendations)

**هدف:** پیشنهاد غذاهایی که کاربر می‌تواند با مواد موجود بپزد

**الگوریتم:**
```
1. دریافت موجودی کاربر
2. برای هر دستور پخت:
   a. محاسبه مواد تطابق‌یافته
   b. محاسبه مواد کمبود
   c. بررسی استفاده از مواد در حال انقضا
   d. محاسبه درصد تطابق
3. اولویت‌بندی:
   a. غذاهایی که از مواد در حال انقضا استفاده می‌کنند
   b. بر اساس درصد تطابق (نزولی)
4. بازگرداندن لیست مرتب‌شده
```

**ویژگی‌های خاص:**
- تطبیق انعطاف‌پذیر نام‌ها (exact match + partial match)
- در نظر گرفتن مقدار مورد نیاز
- اولویت به مواد در حال انقضا برای جلوگیری از هدر رفتن غذا

---

### 3. لیست خرید (Shopping List)

**هدف:** کمک به کاربر برای خرید مواد مورد نیاز

**ویژگی‌ها:**
- اضافه کردن دستی مواد
- اضافه کردن مواد کمبود از پیشنهاد غذا
- علامت‌گذاری مواد خریداری شده
- پاک کردن موارد خریداری شده

---

### 4. علاقه‌مندی‌ها (Favorites)

**هدف:** ذخیره دستور پخت‌های مورد علاقه برای دسترسی سریع

---

### 5. نوتیفیکیشن‌ها (Notifications)

**انواع:**
- `expiration`: هشدار انقضای ماده (۳ روز قبل)
- `low_stock`: هشدار موجودی کم
- `info`: اطلاعات عمومی

**سطوح شدت:**
- `normal`: عادی
- `safety`: امنیت غذایی (مثلاً مواد منقضی شده)

---

### 6. پنل مدیریت (Admin Panel)

**ویژگی‌ها:**
- داشبورد با آمار کلی
- مدیریت کاربران (مشاهده، ویرایش نقش، حذف)
- مدیریت دستور پخت‌ها
- مدیریت مواد اولیه سیستمی
- مدیریت دسته‌بندی‌ها، واحدها، انواع آشپزی و...

---

## 🚀 راه‌اندازی

### Backend

```bash
cd backend-laravel

# نصب وابستگی‌ها
composer install

# تنظیم محیط
cp .env.example .env
php artisan key:generate

# اجرای migration ها
php artisan migrate

# اجرای seeders (داده‌های اولیه)
php artisan db:seed

# اجرای سرور
php artisan serve
```

### Frontend

```bash
cd nextmeal-ui

# نصب وابستگی‌ها
npm install

# تنظیم متغیرهای محیطی
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local

# اجرای سرور توسعه
npm run dev
```

---

## 📁 فایل‌های مهم

### Backend
| فایل | توضیحات |
|------|---------|
| `routes/api.php` | تعریف همه route های API |
| `app/Models/*.php` | مدل‌های Eloquent |
| `app/Http/Controllers/Api/*.php` | کنترلرهای API |
| `database/migrations/*.php` | ساختار دیتابیس |
| `database/seeders/*.php` | داده‌های اولیه |

### Frontend
| فایل | توضیحات |
|------|---------|
| `app/layout.tsx` | Layout اصلی |
| `app/providers.tsx` | Context Providers |
| `context/*.tsx` | State Management |
| `utils/api.ts` | توابع فراخوانی API |
| `types/index.ts` | تعریف تایپ‌های TypeScript |

---

## 📝 نکات فنی

### UUID ها
- همه primary key ها از نوع UUID هستند
- از `BaseUuidModel` به ارث می‌برند
- به صورت خودکار در زمان create تولید می‌شوند

### System User
- ID ثابت: `00000000-0000-0000-0000-000000000000`
- مالک دستور پخت‌های پیش‌فرض سیستم
- غیرقابل ویرایش و حذف

### تبدیل واحدها
- واحدهای پایه تعریف شده (مثلاً: g, ml, pcs)
- ضرایب تبدیل در جدول `units`
- `ingredient_base_unit` مشخص می‌کند هر ماده چه واحد پایه‌ای دارد

---

> 📧 برای سوالات بیشتر یا گزارش مشکلات، لطفاً issue ایجاد کنید.
