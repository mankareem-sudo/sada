import { db } from '@/lib/db'
import { getTodayPrompt } from '@/lib/prompts'
import { getAppUrl } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export default async function EmbedWidget() {
  const prompt = await getTodayPrompt()
  
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, system-ui, sans-serif;
            background: #0a0a0f;
            color: #e5e7eb;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .card {
            background: linear-gradient(135deg, #15121f, #1c1830);
            border: 1px solid #2a2440;
            border-radius: 20px;
            padding: 32px;
            max-width: 400px;
            width: 100%;
            text-align: center;
          }
          .logo { font-size: 32px; margin-bottom: 12px; }
          .title { font-size: 14px; color: #9ca3af; margin-bottom: 20px; }
          .question {
            font-size: 20px; font-weight: 700; line-height: 1.5;
            margin-bottom: 24px; color: #fff;
          }
          .btn {
            display: inline-block; background: #1763CC; color: #fff;
            padding: 12px 32px; border-radius: 10px; text-decoration: none;
            font-weight: 600; font-size: 15px; transition: background 0.2s;
          }
          .btn:hover { background: #0F4C9C; }
          .footer { margin-top: 16px; font-size: 11px; color: #6b7280; }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="logo">🎤</div>
          <div className="title">سؤال اليوم من صدى</div>
          <div className="question">{prompt?.text || 'مفيش سؤال اليوم'}</div>
          <a href={getAppUrl()} className="btn" target="_blank" rel="noopener">
            سجّل إجابتك الصوتية
          </a>
          <div className="footer">صدى — منصة الحوار الصوتي العربي</div>
        </div>
      </body>
    </html>
  )
}
