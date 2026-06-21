# 🚨 خطوات أخيرة مطلوبة منك (5 دقايق)

## ✅ اللي اتعمل:
- ✅ الكود كله على GitHub: https://github.com/mankareem-sudo/sada
- ✅ التطبيق منشور على Vercel: https://my-project-one-lake-82.vercel.app
- ✅ APK جاهز للتثبيت: `download/Sada-v1.0.0-android.apk`
- ✅ كل env vars مضبوطة على Vercel

## ⚠️ المشكلة الوحيدة المتبقية:

مشروع Supabase بتاعك مفعّل بـ **IPv6 فقط** (ده الإعداد الافتراضي للمشاريع الجديدة).
Vercel و Vercel build environment بيشتغلوا بـ **IPv4 فقط**.
علشان كده ما يقدروش يوصلوا لقاعدة البيانات.

**الحل:** لازم تفعل **Connection Pooler** في Supabase.

---

## 🔧 خطوات الحل (5 دقايق):

### 1️⃣ فعّل Connection Pooler في Supabase

1. افتح https://supabase.com/dashboard/project/ljvpddwxkzlqnvevylic/settings/database
2. انزل لقسم **Connection Pooler**
3. لو مش مفعّل، اضغط **Enable**
4. انسخ الـ **Connection string** (سيكون في الصيغة دي):
   ```
   postgresql://postgres.ljvpddwxkzlqnvevylic:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```
5. استبدل `[YOUR-PASSWORD]` بـ `PkuUQPW3RRGSRAHk`

### 2️⃣ حدّث DATABASE_URL على Vercel

1. افتح https://vercel.com/mankareem-sudos-projects/my-project/settings/environment-variables
2. لقِي `DATABASE_URL` وعدّلها
3. ضع القيمة الجديدة (بعد استبدال الباسوورد):
   ```
   postgresql://postgres.ljvpddwxkzlqnvevylic:PkuUQPW3RRGSRAHk@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
   ```
4. Save

### 3️⃣ شغّل migrations

افتح في المتصفح (أو استخدم curl):
```
https://my-project-one-lake-82.vercel.app/api/migrate?token=sada-initial-setup-2026
```

أو:
```bash
curl -X POST "https://my-project-one-lake-82.vercel.app/api/migrate?token=sada-initial-setup-2026"
```

هتلاقي response زي:
```json
{
  "statements": {
    "total": 51,
    "success": 51,
    "failed": 0
  }
}
```

### 4️⃣ تأكد إن الـ setup تم

```
https://my-project-one-lake-82.vercel.app/api/setup
```

أو:
```bash
curl "https://my-project-one-lake-82.vercel.app/api/setup?token=sada-initial-setup-2026"
```

### 5️⃣ اختبر التطبيق

افتح: https://my-project-one-lake-82.vercel.app

---

## 📱 تحديث الـ APK بعد النشر الناجح

بعد ما تعمل الخطوات فوق وتتأكد إن التطبيق شغال على الرابط:

```bash
# 1. عدّل capacitor.config.ts
# غير server.url لـ: https://my-project-one-lake-82.vercel.app

# 2. اعمل build جديد
./scripts/build-apk.sh debug

# 3. الـ APK الجديد هتلاقيه في download/
```

---

## 🔄 لو لسه عندها مشاكل

### لو Pooler URL مختلف:
 Supabase ممكن يديك URL بصيغة مختلفة. جرّب:
- `aws-0-{region}.pooler.supabase.com:5432` (session mode)
- `aws-0-{region}.pooler.supabase.com:6543` (transaction mode - **هو ده المطلوب**)

### لو الـ region مختلف:
لو مشروعك في region غير `eu-central-1`، استبدله في الـ URL. ممكن تلاقيه في Supabase Dashboard → Settings → General.

### بديل: تشغيل migrations من جهازك
لو عندك IPv6 في البيت (أغلب البيوت عندها)، شغّل:
```bash
DATABASE_URL="postgresql://postgres:PkuUQPW3RRGSRAHk@db.ljvpddwxkzlqnvevylic.supabase.co:5432/postgres" npx prisma db push
```

---

## 📋 الروابط المهمة

| الحاجة | الرابط |
|--------|--------|
| GitHub repo | https://github.com/mankareem-sudo/sada |
| Vercel app | https://my-project-one-lake-82.vercel.app |
| Vercel settings | https://vercel.com/mankareem-sudos-projects/my-project/settings/environment-variables |
| Supabase Dashboard | https://supabase.com/dashboard/project/ljvpddwxkzlqnvevylic |
| Supabase DB Settings | https://supabase.com/dashboard/project/ljvpddwxkzlqnvevylic/settings/database |
| Migrate endpoint | https://my-project-one-lake-82.vercel.app/api/migrate?token=sada-initial-setup-2026 |
| Setup endpoint | https://my-project-one-lake-82.vercel.app/api/setup?token=sada-initial-setup-2026 |

---

## ⚠️ مهم جداً بعد ما تخلص

**اعمل rotate (تغيير) لكل الـ tokens دي:**

1. **GitHub PAT**: https://github.com/settings/tokens
   - اعمل delete للـ token القديم واعمل جديد

2. **Vercel token**: https://vercel.com/account/tokens
   - Delete القديم واعمل جديد

3. **Supabase password**: 
   - Dashboard → Project Settings → Database → Database password → Reset

4. **Supabase API keys** (anon + service_role):
   - Dashboard → Project Settings → API → Reset

5. **Setup token** في Vercel:
   - بدّل قيمة `SETUP_TOKEN` env var (لو هتسيب الـ endpoint شغال)

الـ tokens اللي شاربتها في المحادثة دي لازم تتعامل معاها على إنها compromised بعد ما نخلص.
