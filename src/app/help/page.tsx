import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'المساعدة — صدى',
  description: 'أسئلة شائعة ومساعدة لمنصة صدى',
}

export default function HelpPage() {
  const faqs = [
    { q: 'إزاي أسجل في صدى؟', a: 'ادخل البريد الإلكتروني + كلمة مرور (8 أحرف + حرف + رقم) + اسم + اسم مستخدم. هتلاقي كود تفعيل في البريد — ادخله عشان تفعّل حسابك.' },
    { q: 'ليه مش بيوصلني كود التفعيل؟', a: 'بص في spam/junk folder. لو مش لاقيه، اضغط "إعادة إرسال الكود". الكود صالح 15 دقيقة.' },
    { q: 'نسيت كلمة المرور؟', a: 'في صفحة الدخول، اضغط "نسيت كلمة المرور؟". هتبعتلك كود على البريد، تدخله وتكتب كلمة مرور جديدة.' },
    { q: 'إزاي أسجل صدى صوتي؟', a: 'اضغط زر + في الأسفل. اسمح للميكروفون، اضغط على الميكروفون واتكلم (90 ثانية كحد أقصى). بعدها راجع تسجيلك واضغط نشر.' },
    { q: 'إزاي أنشر بوست؟', a: 'في صفحة "اليوم"، انزل تحت لـ "منشورات المجتمع" واضغط على "شارك فكرة، صورة، أو سؤال...". تقدر تكتب نص أو ترفع صورة.' },
    { q: 'إيه خصوصية البوست؟', a: 'كل بوست تقدر تختار: عام (الكل يشوفه)، أصدقاء (أصدقاؤك بس)، خاص (أنت بس).' },
    { q: 'إزاي أبعت طلب صداقة؟', a: 'افتح بروفايل الشخص واضغط "أضف صديق". لما يقبل، تقدروا تراسلوا بعض.' },
    { q: 'إزاي أغير الثيم أو اللغة؟', a: 'اضغط على صورتك في الأعلى → الإعدادات → المظهر / اللغة. تقدر تختار Dark/Light + عربي/English.' },
    { q: 'إزاي أحذف حسابي؟', a: 'الإعدادات → حذف الحساب نهائياً → اكتب DELETE للتأكيد. كل بياناتك هتتمسح.' },
    { q: 'إزاي أبلّغ عن محتوى مسيء؟', a: 'اضغط على ⋮ جنب البوست → إبلاغ → اختار السبب. فريق المراجعة هيشوفه فوراً.' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
      <h1 className="text-2xl font-bold mb-6 font-cairo">المساعدة والأسئلة الشائعة</h1>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <details key={i} className="bg-card/50 border border-border/50 rounded-2xl p-4 group">
            <summary className="font-medium text-sm cursor-pointer flex items-center justify-between">
              {faq.q}
              <span className="text-muted-foreground group-open:rotate-180 transition">▼</span>
            </summary>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{faq.a}</p>
          </details>
        ))}
      </div>
      <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-2xl text-center">
        <p className="text-sm text-muted-foreground">
          محتاج مساعدة أكتر؟ تواصل معنا: support@sada.app
        </p>
      </div>
    </div>
  )
}
