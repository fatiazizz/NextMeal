# NextMeal Android App

این پروژه یک wrapper اندروید برای PWA NextMeal است که می‌توانید از آن برای ساخت APK استفاده کنید.

## نیازمندی‌ها

1. **Android Studio** - [دانلود](https://developer.android.com/studio)
2. **JDK 11+** - معمولاً با Android Studio نصب می‌شود

## مراحل ساخت APK

### مرحله 1: باز کردن پروژه در Android Studio

1. Android Studio را باز کنید
2. `File` → `Open` را انتخاب کنید
3. پوشه `android-project` را انتخاب کنید
4. صبر کنید تا Gradle sync شود (ممکن است چند دقیقه طول بکشد)

### مرحله 2: تنظیم URL

فایل `MainActivity.kt` را باز کنید و URL را تنظیم کنید:

```kotlin
// برای تست با emulator:
private val PWA_URL = "http://10.0.2.2:3000"

// برای production (بعد از deploy به Vercel):
private val PWA_URL = "https://your-app.vercel.app"
```

### مرحله 3: ساخت APK

#### روش 1: Debug APK (سریع)
1. `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
2. APK در مسیر زیر ایجاد می‌شود:
   ```
   app/build/outputs/apk/debug/app-debug.apk
   ```

#### روش 2: Release APK (برای انتشار)
1. `Build` → `Generate Signed Bundle / APK`
2. `APK` را انتخاب کنید
3. یک keystore جدید بسازید یا موجود را انتخاب کنید
4. `release` را انتخاب کنید
5. APK در مسیر زیر ایجاد می‌شود:
   ```
   app/build/outputs/apk/release/app-release.apk
   ```

## تست با Emulator

1. در Android Studio یک emulator بسازید
2. Next.js app را با `npm run dev` اجرا کنید
3. APK را روی emulator نصب کنید
4. `http://10.0.2.2:3000` برابر با `localhost:3000` روی host است

## تست روی گوشی واقعی

1. **USB Debugging** را روی گوشی فعال کنید:
   - `Settings` → `About phone` → 7 بار روی `Build number` بزنید
   - `Settings` → `Developer options` → `USB debugging` را فعال کنید

2. گوشی را به کامپیوتر وصل کنید

3. در Android Studio روی دکمه `Run` کلیک کنید

4. گوشی خود را از لیست انتخاب کنید

## نکات مهم

### برای تست محلی:
- حتماً `android:usesCleartextTraffic="true"` در AndroidManifest.xml باشد
- از `http://10.0.2.2:3000` برای دسترسی به localhost استفاده کنید

### برای Production:
- URL را به آدرس deploy شده تغییر دهید
- می‌توانید `usesCleartextTraffic` را حذف کنید (چون از HTTPS استفاده می‌کنید)

## ساختار پروژه

```
android-project/
├── app/
│   ├── src/main/
│   │   ├── java/com/nextmeal/app/
│   │   │   └── MainActivity.kt      # Activity اصلی
│   │   ├── res/
│   │   │   ├── layout/
│   │   │   │   └── activity_main.xml
│   │   │   ├── values/
│   │   │   │   ├── colors.xml
│   │   │   │   ├── strings.xml
│   │   │   │   └── themes.xml
│   │   │   └── mipmap-xxxhdpi/
│   │   │       ├── ic_launcher.png
│   │   │       └── ic_launcher_round.png
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties
```

## قابلیت‌ها

- ✅ WebView با پشتیبانی کامل از PWA
- ✅ JavaScript و DOM Storage فعال
- ✅ Swipe to Refresh
- ✅ Progress Bar
- ✅ مدیریت Back Button
- ✅ باز کردن لینک‌های خارجی در مرورگر
- ✅ تم تیره با رنگ‌های NextMeal
- ✅ آیکون اختصاصی

## رفع مشکلات رایج

### Gradle Sync Failed
- اطمینان حاصل کنید که به اینترنت متصل هستید
- `File` → `Invalidate Caches / Restart` را امتحان کنید

### APK نصب نمی‌شود
- `Unknown sources` را در تنظیمات گوشی فعال کنید
- APK قبلی را uninstall کنید

### صفحه سفید نمایش داده می‌شود
- مطمئن شوید Next.js app در حال اجرا است
- URL صحیح تنظیم شده باشد
- `usesCleartextTraffic` برای HTTP فعال باشد
