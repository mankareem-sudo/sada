# 🚀 دليل نشر Sada (صدى) — من الصفر للإنتاج

دليل كامل لرفع منصة "صدى" على السيرفرات وبناء APK نهائي للمستخدمين.

---

## 📋 المحتويات

1. [نظرة سريعة](#نظرة-سريعة)
2. [الخيار 1: نشر مجاني بالكامل (Vercel + Supabase)](#option-1)
3. [الخيار 2: نشر على VPS بـ Docker](#option-2)
4. [بناء APK للأندرويد](#build-apk)
5. [إعداد Cloudflare R2 للملفات الصوتية](#r2)
6. [ترقية مستخدم لأدمن](#admin)
7. [الصيانة والمراقبة](#maintenance)

---

<a id="overview"></a>
## 🎯 نظرة سريعة

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Android APK   │ ───→ │   Next.js API    │ ───→ │   PostgreSQL    │
│  (Capacitor)    │      │   (Vercel/VPS)   │      │  (Supabase/VPS) │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  Cloudflare R2   │
                         │  (Audio Storage) │
                         └──────────────────┘
```

**التكلفة المتوقعة:**
- **مجاني** حتى ~50K مستخدم نشط شهرياً
- **~5$/شهر** حتى 100K مستخدم (VPS)
- **~20$/شهر** فوق ذلك (VPS أكبر + R2 مدفوع)

---

<a id="option-1"></a>
## 🆓 الخيار 1: نشر مجاني بالكامل (Vercel + Supabase)

### الخطوة 1: قاعدة بيانات Supabase (مجاني)

1. اذهب لـ https://supabase.com وأنشئ حساب
2. أنشئ project جديد باسم `sada`
3. اختر region قريب (Frankfurt للأوروب، Bahrain للخليج)
4. انتظر دقيقة حتى يجهز، ثم:
   - اذهب لـ **Settings → Database**
   - انسخ **Connection string** (الـ URI)
   - استبدل `[YOUR-PASSWORD]` بكلمة المرور اللي وضعتها

### الخطوة 2: تعديل schema.prisma

افتح `prisma/schema.prisma` وغيّر:
```prisma
datasource db {
  provider = "postgresql"   // ← كان "sqlite"
  url      = env("DATABASE_URL")
}
```

### الخطوة 3: نشر التطبيق على Vercel

1. اذهب لـ https://vercel.com وسجّل بـ GitHub
2. ارفع مشروعك على GitHub:
   ```bash
   git init
   git add .
   git commit -m "Sada v1.0"
   git branch -M main
   git remote add origin https://github.com/USERNAME/sada.git
   git push -u origin main
   ```
3. على Vercel: **New Project → Import** من GitHub
4. في **Environment Variables** أضف:
   ```
   DATABASE_URL = postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
   NEXTAUTH_SECRET = (شغّل: openssl rand -base64 32)
   NEXTAUTH_URL = https://your-app.vercel.app
   NEXT_PUBLIC_APP_NAME = Sada
   NEXT_PUBLIC_DEVELOPER = Sada Team
   ```
5. اضغط **Deploy** وانتظر دقيقتين

### الخطوة 4: شغّل migrations

محلياً (بعد تعديل .env):
```bash
DATABASE_URL="postgresql://..." npx prisma db push
DATABASE_URL="postgresql://..." npx prisma generate
```

### الخطوة 5: اختبر

افتح: `https://your-app.vercel.app`

---

<a id="option-2"></a>
## 🖥️ الخيار 2: نشر على VPS بـ Docker

### متطلبات VPS:
- Ubuntu 22.04 أو أحدث
- 1GB RAM (مجاني لـ 1000 مستخدم)
- 20GB مساحة
- أي VPS رخيص: Hetzner (€4/شهر)، DigitalOcean ($6/شهر)، Linode ($5/شهر)

### الخطوة 1: تجهيز VPS

```bash
# SSH للسيرفر
ssh root@your-server-ip

# تثبيت Docker
apt update && apt install -y docker.io docker-compose git

# استنساخ المشروع
git clone https://github.com/USERNAME/sada.git /opt/sada
cd /opt/sada
```

### الخطوة 2: إعداد المتغيرات

```bash
cp .env.example .env
nano .env
```

عدّل القيم:
```env
# PostgreSQL
POSTGRES_DB=sada
POSTGRES_USER=sada
POSTGRES_PASSWORD=ضع_كلمة_مرور_قوية_هنا

# App
DATABASE_URL=postgresql://sada:كلمة_المرور@db:5432/sada?schema=public
NEXTAUTH_SECRET=ضع_الـ_secret_هنا
NEXTAUTH_URL=https://your-domain.com
DOMAIN=your-domain.com

# App info
NEXT_PUBLIC_APP_NAME=Sada
NEXT_PUBLIC_APP_NAME_AR=صدى
NEXT_PUBLIC_DEVELOPER=Sada Team
```

### الخطوة 3: شغّل

```bash
docker-compose up -d

# شغّل migrations
docker-compose exec app npx prisma db push
docker-compose exec app npx prisma generate
```

### الخطوة 4: أشر الدومين

في DNS provider بتاعك (Cloudflare recommended):
- A record: `@` → IP بتاع VPS
- A record: `www` → IP بتاع VPS

Caddy هيسحب شهادة SSL تلقائياً.

### الخطوة 5: اختبر

افتح: `https://your-domain.com`

---

<a id="build-apk"></a>
## 📱 بناء APK للأندرويد

### الطريقة الأولى: على جهازك (Windows/Mac/Linux)

#### متطلبات:
- [Node.js 18+](https://nodejs.org)
- [Android Studio](https://developer.android.com/studio) (للـ SDK)
- Java 17+ (يأتي مع Android Studio)

#### الخطوات:

```bash
# 1. تثبيت dependencies
npm install

# 2. بناء Next.js
npm run build

# 3. نسخ الأصول لـ Capacitor
npx cap sync android

# 4. بناء APK
cd android
./gradlew assembleDebug   # Linux/Mac
gradlew.bat assembleDebug # Windows
```

الـ APK هتلاقيه في:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### الطريقة الثانية: APK موقّع للنشر (Release)

```bash
# 1. توليد keystore (مرة واحدة)
keytool -genkey -v -keystore sada-release.keystore -alias sada -keyalg RSA -keysize 2048 -validity 10000

# 2. أضف لـ android/keystore.properties
storeFile=sada-release.keystore
storePassword=YOUR_PASSWORD
keyAlias=sada
keyPassword=YOUR_PASSWORD

# 3. عدّل build.gradle ليقرأ الـ keystore
# (راجع قسم signingConfigs في documentation)

# 4. بناء APK موقّع
./gradlew assembleRelease
```

### ربط الـ APK بسيرفر الإنتاج

افتح `capacitor.config.ts` وغيّر:
```typescript
server: {
  url: 'https://your-domain.com',  // ← هنا
  cleartext: false,
  androidScheme: 'https',
},
```

ثم:
```bash
npx cap sync android
cd android && ./gradlew assembleRelease
```

### النشر على Play Store

1. اذهب لـ https://play.google.com/console
2. ادفع رسوم التسجيل مرة واحدة ($25)
3. ارفع الـ AAB (Android App Bundle):
   ```bash
   ./gradlew bundleRelease
   # الملف: android/app/build/outputs/bundle/release/app-release.aab
   ```
4. املأ بيانات التطبيق والصور
5. اضغط **Send for review**

---

<a id="r2"></a>
## ☁️ إعداد Cloudflare R2 للملفات الصوتية

الملفات الصوتية كبيرة. بدل ما نخزنها في الـ DB (زي ما بنعمل دلوقتي)، نخزنها في R2:

### الخطوة 1: إنشاء bucket

1. اذهب لـ https://dash.cloudflare.com
2. **R2 Object Storage → Create bucket**
3. اسم: `sada-audio`
4. Region: Auto (Cloudflare بيختار الأقرب)

### الخطوة 2: إعداد API tokens

1. **R2 → Manage R2 API Tokens**
2. **Create API token** بصلاحيات: Object Read & Write
3. احفظ: Account ID, Access Key, Secret Key

### الخطوة 3: إعداد المتغيرات

في `.env`:
```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY=your_access_key
R2_SECRET_KEY=your_secret_key
R2_BUCKET=sada-audio
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

### الخطوة 4: تفعيل التخزين

(التطبيق الحالي يستخدم DB. للترقية لـ R2، راجع `docs/MIGRATE_TO_R2.md` - قريب)

---

<a id="admin"></a>
## 👑 ترقية مستخدم لأدمن

### محلياً:
```bash
bun run scripts/make-admin.ts user@example.com
```

### على VPS:
```bash
docker-compose exec app bun run scripts/make-admin.ts user@example.com
```

### على Vercel:
```bash
# من Prisma Studio
npx prisma studio
# افتح User table، غيّر isAdmin = true للمستخدم المطلوب
```

بعد كده، تبويب "إدارة" هيظهر للمستخدم ده في الـ BottomNav.

---

<a id="maintenance"></a>
## 🔧 الصيانة والمراقبة

### نسخ احتياطي يومي لـ DB

أضف لـ crontab على VPS:
```bash
0 3 * * * docker-compose -f /opt/sada/docker-compose.yml exec -T db pg_dump -U sada sada | gzip > /backups/sada-$(date +\%Y\%m\%d).sql.gz
```

### مراقبة الـ logs

```bash
# Logs مباشرة
docker-compose logs -f app

# Logs الـ Caddy
docker-compose logs -f caddy
```

### تحديث التطبيق

```bash
cd /opt/sada
git pull
docker-compose up -d --build app
docker-compose exec app npx prisma db push
```

### مراقبة المساحة

```bash
df -h
docker system prune -af  # تنظيف الـ images القديمة
```

---

## 🆘 مشاكل شائعة

### "Database connection failed"
- تأكد إن `DATABASE_URL` صح
- تأكد إن port 5432 مفتوح في firewall

### "APK لا يتصل بالخادم"
- تأكد إن `server.url` في capacitor.config.ts = عنوان السيرفر
- تأكد إن `cleartext: true` لو HTTP (للتطوير فقط)

### "الميكروفون لا يعمل في المتصفح"
- استخدم HTTPS (مطلوب لـ getUserMedia)
- أو localhost (مسموح بدون HTTPS)

### "الأصوات لا تُحفظ"
- راجع حجم الملفات (5MB max في الكود الحالي)
- للترقية لـ R2 راجع قسم [R2](#r2)

---

## 📞 الدعم

- وثائق Capacitor: https://capacitorjs.com/docs
- وثائق Next.js: https://nextjs.org/docs
- وثائق Prisma: https://www.prisma.io/docs
- وثائق Supabase: https://supabase.com/docs

**Sada Team** — منصة الحوار الصوتي العربي 🎙️
