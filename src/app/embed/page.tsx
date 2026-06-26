export const metadata = {
  title: 'صدى — Embed Widget',
  description: 'تضمين صدى في موقعك',
}

export default function EmbedPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
      <h1 className="text-2xl font-bold mb-6 font-cairo">تضمين صدى في موقعك</h1>
      <p className="text-sm text-muted-foreground mb-6">
        تقدر تضمّن سؤال اليوم من صدى في موقعك أو مدونتك باستخدام الكود التالي:
      </p>
      
      <div className="bg-card/50 border border-border rounded-2xl p-4 mb-6">
        <code className="text-xs text-primary block overflow-x-auto" dir="ltr">
          {`<iframe 
  src="https://my-project-one-lake-82.vercel.app/embed/widget"
  width="100%"
  height="400"
  frameborder="0"
  style="border:none;border-radius:16px;"
  title="صدى — سؤال اليوم">
</iframe>`}
        </code>
      </div>

      <div className="bg-card/50 border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-2">معاينة</h3>
        <iframe
          src="/embed/widget"
          width="100%"
          height="400"
          frameBorder="0"
          style={{ border: 'none', borderRadius: '16px' }}
          title="صدى — سؤال اليوم"
        />
      </div>

      <div className="mt-6 space-y-2 text-sm text-muted-foreground">
        <p>• المعاينة بتعرض سؤال اليوم الحالي تلقائياً</p>
        <p>• تقدر تغير الارتفاع من height</p>
        <p>• الـ widget بيتم تحديثه تلقائياً كل يوم</p>
      </div>
    </div>
  )
}
