# 🎙️ Sada (صدى)

> منصة الحوار الصوتي العربي — كل يوم سؤال واحد، وإجابات صوتية مدتها 90 ثانية. منصة للحوار الهادئ بعيداً عن السخرية والإساءة.

**Developer:** Sada Team  
**Version:** 1.0.0  
**License:** MIT

---

## ✨ المميزات

- 🎙️ **تسجيل صوتي 90 ثانية** مع مؤشر صوتي حيّ
- 📅 **سؤال يومي** جديد كل يوم
- 💬 **تعليقات وردود** على كل تسجيل
- 🔖 **حفظ التسجيلات** للرجوع لها لاحقاً
- 🔥 **تبويب رائج** لأكثر التسجيلات تفاعلاً
- 👥 **متابعة مستخدمين** وإشعارات
- 🔔 **إشعارات** عند الإعجاب/المتابعة/التعليق
- 📤 **مشاركة** عبر Web Share API
- 🤖 **ترجمة صوتية تلقائية** (AI transcription)
- 🛡️ **لوحة إدارة** كاملة (إحصائيات، أسئلة، بلاغات)
- 📱 **PWA + APK** (Android)
- 🌙 **ثيم داكن** أنيق بألوان بنفسجية
- 🇸🇦 **عربي بالكامل** مع RTL

---

## 🚀 التشغيل السريع (تطوير)

```bash
# تثبيت dependencies
npm install

# إعداد قاعدة البيانات
npm run db:push

# تشغيل خادم التطوير
npm run dev
```

افتح http://localhost:3000

---

## 📦 بناء APK للأندرويد

```bash
# الطريقة السريعة
./scripts/build-apk.sh debug

# أو يدوياً
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

الـ APK هتلاقيه في:
- `download/Sada-v1.0-debug-*.apk`
- أو `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🌐 النشر للإنتاج

راجع [DEPLOYMENT.md](./DEPLOYMENT.md) للتفاصيل الكاملة:

- **الخيار 1 (مجاني):** Vercel + Supabase + Cloudflare R2
- **الخيار 2 (VPS):** Docker Compose على Hetzner/DigitalOcean

---

## 🛠️ التقنيات

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend | Next.js API Routes (App Router) |
| Database | PostgreSQL (Supabase) / SQLite (dev) |
| ORM | Prisma 6 |
| Mobile | Capacitor 6 (Android) |
| Auth | Custom (scrypt password hashing + session tokens) |
| Audio | MediaRecorder API (Opus/WebM) |
| AI | z-ai-web-dev-sdk (ASR transcription) |
| State | Zustand |
| Notifications | In-app (notifications table) |

---

## 📁 هيكل المشروع

```
sada/
├── android/              # مشروع Android (Capacitor)
├── download/             # APKs النهائية
├── prisma/
│   └── schema.prisma     # Database schema
├── public/               # PWA icons, manifest, sw
├── scripts/
│   ├── build-apk.sh      # سكريبت بناء APK
│   ├── generate_icons.py # توليد أيقونات PWA
│   ├── generate_android_icons.py  # أيقونات Android
│   └── make-admin.ts     # ترقية مستخدم لأدمن
├── src/
│   ├── app/
│   │   ├── api/          # API routes (20+ endpoints)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── sada/         # مكونات Sada
│   │   └── ui/           # shadcn/ui components
│   └── lib/
│       ├── auth.ts       # المصادقة
│       ├── db.ts         # Prisma client
│       ├── prompts.ts    # الأسئلة اليومية
│       ├── password.ts   # scrypt hashing
│       ├── store.ts      # Zustand store
│       └── types.ts
├── capacitor.config.ts
├── docker-compose.yml
├── Dockerfile
├── DEPLOYMENT.md         # دليل النشر الكامل
└── README.md
```

---

## 🔐 الأمان

- ✅ كلمات المرور مشفّرة بـ scrypt (N=16384, r=8, p=1)
- ✅ Session tokens عشوائية (32 bytes)
- ✅ HTTP-only cookies
- ✅ CSRF protection via same-site cookies
- ✅ Rate limiting (TODO)
- ✅ XSS protection headers
- ✅ Frame options
- ✅ Content type sniffing protection

---

## 📋 APIs

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/auth` | تسجيل/دخول |
| POST | `/api/auth/logout` | خروج |
| GET | `/api/auth/me` | بيانات المستخدم الحالي |
| GET | `/api/prompts/today` | سؤال اليوم |
| GET | `/api/prompts/list` | قائمة الأسئلة |
| POST | `/api/voice-notes/create` | تسجيل جديد |
| GET | `/api/voice-notes/feed` | Feed المتابعات |
| GET | `/api/voice-notes/discover` | اكتشف |
| GET | `/api/voice-notes/trending` | رائج |
| POST | `/api/voice-notes/like` | إعجاب |
| POST | `/api/voice-notes/bookmark` | حفظ |
| POST | `/api/voice-notes/play` | عدّاد تشغيل |
| POST | `/api/voice-notes/report` | إبلاغ |
| POST | `/api/voice-notes/share` | مشاركة |
| POST | `/api/voice-notes/transcribe` | ترجمة AI |
| GET/POST/DELETE | `/api/voice-notes/comments` | تعليقات + ردود |
| POST | `/api/follow` | متابعة |
| GET | `/api/users/profile` | ملف مستخدم |
| GET/PATCH | `/api/users/me` | ملفي |
| GET | `/api/users/followers` | متابعين |
| GET | `/api/users/following` | متابَعين |
| GET | `/api/notifications` | إشعاراتي |
| POST | `/api/notifications/read` | تحديد مقروء |
| GET | `/api/search` | بحث |
| POST | `/api/donations` | تبرع |
| GET | `/api/onboarding` | onboard |
| POST | `/api/account/delete` | حذف حساب |
| GET/POST/PATCH/DELETE | `/api/admin/prompts` | إدارة الأسئلة |
| GET/PATCH | `/api/admin/reports` | إدارة البلاغات |
| GET | `/api/admin/stats` | إحصائيات |

---

## 📜 License

MIT © Sada Team

---

**صنع بـ ❤️ للوطن العربي**
