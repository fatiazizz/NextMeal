# راه‌اندازی Docker برای پروژه Laravel

## پیش‌نیازها
- Docker و Docker Compose نصب شده باشد

## راه‌اندازی

### 1. اجرای Docker Compose
```bash
docker-compose up -d
```

این دستور دو سرویس را راه‌اندازی می‌کند:
- **MariaDB 10** روی پورت `3306`
- **phpMyAdmin** روی پورت `8081`

### 2. تنظیمات دیتابیس در فایل `.env`

فایل `.env` خود را با مقادیر زیر تنظیم کنید:

```env
DB_CONNECTION=mariadb
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nextmeal
DB_USERNAME=nextmeal_user
DB_PASSWORD=nextmeal_password
```

یا اگر می‌خواهید از root استفاده کنید:

```env
DB_CONNECTION=mariadb
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nextmeal
DB_USERNAME=root
DB_PASSWORD=root
```

### 3. اجرای Migration ها

```bash
php artisan migrate
```

یا اگر می‌خواهید با seeder ها هم اجرا شود:

```bash
php artisan migrate --seed
```

## دسترسی به phpMyAdmin

بعد از راه‌اندازی، می‌توانید از طریق مرورگر به آدرس زیر دسترسی داشته باشید:

```
http://localhost:8081
```

**اطلاعات ورود:**
- Server: `mariadb` (یا `127.0.0.1`)
- Username: `root`
- Password: `root`

یا:

- Server: `mariadb` (یا `127.0.0.1`)
- Username: `nextmeal_user`
- Password: `nextmeal_password`

## دستورات مفید

### مشاهده لاگ‌ها
```bash
docker-compose logs -f
```

### توقف سرویس‌ها
```bash
docker-compose down
```

### توقف و حذف volume ها (حذف دیتابیس)
```bash
docker-compose down -v
```

### راه‌اندازی مجدد
```bash
docker-compose restart
```

### بررسی وضعیت سرویس‌ها
```bash
docker-compose ps
```

## اطلاعات اتصال

- **MariaDB Host:** `127.0.0.1` یا `localhost`
- **MariaDB Port:** `3306`
- **Database Name:** `nextmeal`
- **Root Password:** `root`
- **User:** `nextmeal_user`
- **User Password:** `nextmeal_password`

## نکات مهم

1. دیتابیس به صورت persistent در volume ذخیره می‌شود، بنابراین با توقف و راه‌اندازی مجدد، داده‌ها حفظ می‌شوند.
2. برای حذف کامل دیتابیس و شروع مجدد، از دستور `docker-compose down -v` استفاده کنید.
3. اگر پورت 3306 یا 8081 در سیستم شما استفاده می‌شود، می‌توانید در فایل `docker-compose.yml` پورت‌ها را تغییر دهید.
