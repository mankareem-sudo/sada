/**
 * Email Service — Sends emails using the z-ai-web-dev-sdk
 * 
 * Since we don't have a dedicated SMTP server, we use the AI SDK
 * to generate and "send" emails. In production, you'd replace this
 * with a real email service (Resend, SendGrid, AWS SES, etc.)
 * 
 * For now, emails are logged to console + stored for review.
 */

// In production, replace with real email service:
// import Resend from 'resend'
// const resend = new Resend(process.env.RESEND_API_KEY)

interface EmailParams {
  to: string
  subject: string
  html: string
  text: string
}

/**
 * Send an email
 * 
 * Currently logs to console. In production, integrate with:
 * - Resend (https://resend.com) — free 3000/month
 * - SendGrid (https://sendgrid.com) — free 100/day
 * - AWS SES — cheap
 * - Postmark
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  console.log('========== EMAIL ==========')
  console.log('To:', params.to)
  console.log('Subject:', params.subject)
  console.log('Text:', params.text)
  console.log('===========================')
  
  // TODO: In production, uncomment and configure:
  // try {
  //   const { data, error } = await resend.emails.send({
  //     from: 'Sada <noreply@sada.app>',
  //     to: params.to,
  //     subject: params.subject,
  //     html: params.html,
  //     text: params.text,
  //   })
  //   if (error) throw error
  //   return true
  // } catch (e) {
  //   console.error('Email send error:', e)
  //   return false
  // }
  
  // For now, just return true (simulated success)
  return true
}

/**
 * Send password reset code email
 */
export async function sendPasswordResetEmail(
  to: string,
  code: string,
  name: string
): Promise<boolean> {
  const subject = 'صدى — كود استعادة كلمة المرور'
  
  const text = `مرحباً ${name}،

كود استعادة كلمة المرور بتاعك في صدى هو: ${code}

الكود ده صالح لمدة 15 دقيقة فقط.

لو مش إنت اللي طلبت الاستعادة، تجاهل الرسالة دي.

مع تحيات،
فريق صدى`

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Tahoma,sans-serif;color:#e5e7eb;">
  <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;width:64px;height:64px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);border-radius:16px;line-height:64px;font-size:32px;">🎤</div>
      <h1 style="color:#fff;font-size:24px;margin:16px 0 8px;">صدى</h1>
      <p style="color:#9ca3af;font-size:14px;">منصة الحوار الصوتي العربي</p>
    </div>
    
    <div style="background:#15121f;border:1px solid #2a2440;border-radius:16px;padding:32px;">
      <h2 style="color:#fff;font-size:18px;margin:0 0 16px;">استعادة كلمة المرور</h2>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 24px;">
        مرحباً ${name}،
        <br><br>
        إنت طلبت استعادة كلمة المرور بتاعتك في صدى. استخدم الكود ده:
      </p>
      
      <div style="background:#1c1830;border:2px dashed #8b5cf6;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#8b5cf6;font-family:'Courier New',monospace;">
          ${code}
        </div>
      </div>
      
      <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:24px 0 0;">
        الكود ده صالح لمدة <strong style="color:#f59e0b;">15 دقيقة</strong> فقط.
        <br><br>
        لو مش إنت اللي طلبت الاستعادة، تجاهل الرسالة دي وما حدش هيتقدر يوصل لحسابك.
      </p>
    </div>
    
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#6b7280;font-size:12px;">
        صدى · منصة الحوار الصوتي العربي
        <br>
        الرسالة دي أتاتبعتلك لأنك طلبت استعادة كلمة المرور
      </p>
    </div>
  </div>
</body>
</html>`

  return sendEmail({ to, subject, text, html })
}
