import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'سياسة الخصوصية — صدى',
  description: 'سياسة الخصوصية وشروط الاستخدام لمنصة صدى',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
      <h1 className="text-2xl font-bold mb-6 font-cairo">سياسة الخصوصية وشروط الاستخدام</h1>
      
      <div className="prose prose-invert max-w-none text-sm space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. مقدمة</h2>
          <p>
            منصة "صدى" هي منصة حوار صوتي عربي. نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.
            هذه السياسة توضح كيف نجمع ونستخدم ونحمي معلوماتك.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. البيانات التي نجمعها</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>البريد الإلكتروني واسم المستخدم وكلمة المرور (مشفّرة)</li>
            <li>التسجيلات الصوتية والبوستات والتعليقات التي تنشرها</li>
            <li>صور البروفايل والبوستات (مخزّنة على Cloudinary CDN)</li>
            <li>بيانات الجهاز والـ IP لأغراض الأمان ومنع الإساءة</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. كيف نستخدم بياناتك</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>تقديم خدمة المنصة الاجتماعية</li>
            <li>إشعاراتك بالتفاعلات (إعجابات، تعليقات، متابعين)</li>
            <li>حماية المجتمع من المحتوى المسيء</li>
            <li>تحسين تجربة الاستخدام</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. حماية البيانات</h2>
          <p>نستخدم تقنيات حماية متعددة:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>كلمات المرور مشفّرة بـ scrypt (لا يمكن فك تشفيرها)</li>
            <li>اتصالات HTTPS مشفّرة بالكامل</li>
            <li>Rate limiting لمنع الهجمات</li>
            <li>Content Security Policy (CSP) لحماية من XSS</li>
            <li>Session tokens آمنة مع rotation تلقائي</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. خصوصية المحتوى</h2>
          <p>يمكنك التحكم في خصوصية محتواك:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>عام</strong>: يراه أي مستخدم</li>
            <li><strong>الأصدقاء</strong>: يراه أصدقاؤك فقط</li>
            <li><strong>خاص</strong>: يراه صاحبه فقط</li>
          </ul>
          <p className="mt-2">
            يمكنك أيضاً تحديد خصوصية ملفك الشخصي (عام أو للأصدقاء فقط).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. قواعد المجتمع</h2>
          <p>صدى مكان للحوار الهادئ. يُمنع:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>السخرية أو الإساءة للأديان</li>
            <li>المحتوى السياسي المسيء أو التحريض</li>
            <li>الإهانات الشخصية أو الألفاظ النابية</li>
            <li>السبام أو المحتوى المتكرر</li>
          </ul>
          <p className="mt-2">
            المخالفات تؤدي إلى حذف المحتوى وقد تؤدي إلى حظر الحساب.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. حذف الحساب</h2>
          <p>
            يمكنك حذف حسابك في أي وقت من الإعدادات. سيتم حذف جميع بياناتك بشكل دائم:
            التسجيلات الصوتية، البوستات، التعليقات، الإعجابات، والمتابعات.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">8. التواصل</h2>
          <p>لأي استفسار حول الخصوصية، تواصل معنا: support@sada.app</p>
        </section>

        <p className="text-xs text-muted-foreground/60 pt-4 border-t border-border/30">
          آخر تحديث: يونيو 2026 · صدى — منصة الحوار الصوتي العربي
        </p>
      </div>
    </div>
  )
}
