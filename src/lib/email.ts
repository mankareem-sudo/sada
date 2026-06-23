/**
 * Email Service — Sends emails via Gmail SMTP
 * 
 * Uses a dedicated Gmail account (sada.app.voice@gmail.com) with App Password.
 * This allows sending up to ~500 emails/day (Gmail's free limit).
 * 
 * For higher volume, switch to Resend, SendGrid, or AWS SES.
 */

import nodemailer from 'nodemailer'

// Lazy-load transporter (only when needed)
let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter
  
  const gmailUser = process.env.GMAIL_USER || 'sada.app.voice@gmail.com'
  const gmailPass = process.env.GMAIL_APP_PASSWORD || ''
  
  if (!gmailPass) {
    console.warn('[email] GMAIL_APP_PASSWORD not set - emails will be simulated')
  }
  
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
    // Gmail sometimes needs these
    pool: true,
    maxConnections: 1,
    rateLimit: true,
    maxMessages: 50,
  } as any)
  
  return transporter
}

interface EmailParams {
  to: string
  subject: string
  html: string
  text: string
}

/**
 * Send an email via Gmail SMTP
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  const gmailPass = process.env.GMAIL_APP_PASSWORD
  const gmailUser = process.env.GMAIL_USER || 'sada.app.voice@gmail.com'
  
  // If no password configured, simulate
  if (!gmailPass) {
    console.log('========== EMAIL (SIMULATED) ==========')
    console.log('From:', gmailUser)
    console.log('To:', params.to)
    console.log('Subject:', params.subject)
    console.log('Text:', params.text)
    console.log('=======================================')
    return true
  }
  
  try {
    const transport = getTransporter()
    
    const info = await transport.sendMail({
      from: `صدى <${gmailUser}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    })
    
    console.log('[email] Sent:', info.messageId)
    return true
  } catch (e: any) {
    console.error('[email] Send error:', e?.message || e)
    return false
  }
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

/**
 * Send email verification code
 */
export async function sendVerificationEmail(
  to: string,
  code: string,
  name: string
): Promise<boolean> {
  const subject = 'صدى — تأكيد البريد الإلكتروني'
  const text = `مرحباً ${name}،

كود تأكيد البريد الإلكتروني بتاعك في صدى هو: ${code}

الكود ده صالح لمدة 15 دقيقة فقط.

مع تحيات،
فريق صدى`

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Tahoma,sans-serif;color:#e5e7eb;">
  <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;width:64px;height:64px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);border-radius:16px;line-height:64px;font-size:32px;">🎤</div>
      <h1 style="color:#fff;font-size:24px;margin:16px 0 8px;">صدى</h1>
    </div>
    <div style="background:#15121f;border:1px solid #2a2440;border-radius:16px;padding:32px;">
      <h2 style="color:#fff;font-size:18px;margin:0 0 16px;">تأكيد البريد الإلكتروني</h2>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 24px;">مرحباً ${name}، استخدم الكود ده لتأكيد بريدك:</p>
      <div style="background:#1c1830;border:2px dashed #8b5cf6;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#8b5cf6;font-family:'Courier New',monospace;">${code}</div>
      </div>
      <p style="color:#9ca3af;font-size:13px;">الكود صالح لمدة 15 دقيقة.</p>
    </div>
  </div>
</body>
</html>`

  return sendEmail({ to, subject, text, html })
}

/**
 * Send welcome email (after signup)
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  const subject = 'مرحباً بيك في صدى 🎙️'
  
  const text = `مرحباً ${name}،

أهلاً بيك في صدى — منصة الحوار الصوتي العربي.

كل يوم سؤال واحد، وإجابات صوتية مدتها 90 ثانية. حوار هادئ بلا سخرية ولا إساءة.

ابدأ بأول تسجيل من: https://my-project-one-lake-82.vercel.app

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
      <h2 style="color:#fff;font-size:18px;margin:0 0 16px;">أهلاً ${name}! 🎉</h2>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 24px;">
        مرحباً بيك في صدى — منصة الحوار الصوتي العربي.
        <br><br>
        كل يوم سؤال واحد، وإجابات صوتية مدتها 90 ثانية. حوار هادئ بلا سخرية ولا إساءة.
      </p>
      
      <a href="https://my-project-one-lake-82.vercel.app" style="display:inline-block;background:#8b5cf6;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
        ابدأ بأول تسجيل
      </a>
    </div>
    
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#6b7280;font-size:12px;">صدى · منصة الحوار الصوتي العربي</p>
    </div>
  </div>
</body>
</html>`

  return sendEmail({ to, subject, text, html })
}
