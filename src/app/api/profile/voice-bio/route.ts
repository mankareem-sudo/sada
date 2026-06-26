import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, validateAudioData } from '@/lib/auth'

/**
 * POST /api/profile/voice-bio
 * body: { audioData, mimeType, durationSec }
 *
 * Sets the current user's voice bio (30-second audio introduction).
 * Replaces any existing voice bio.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const body = await req.json()
    const { audioData, mimeType, durationSec } = body as {
      audioData?: string
      mimeType?: string
      durationSec?: number
    }

    if (!audioData) {
      return NextResponse.json({ error: 'مفيش تسجيل' }, { status: 400 })
    }

    const audioCheck = validateAudioData(audioData)
    if (!audioCheck.valid) {
      return NextResponse.json({ error: audioCheck.reason }, { status: 400 })
    }

    const dur = Math.floor(Number(durationSec) || 0)
    if (dur < 1 || dur > 30) {
      return NextResponse.json(
        { error: 'التعريف الصوتي لازم يكون بين 1 و 30 ثانية' },
        { status: 400 }
      )
    }

    // Update user with voice bio (store as base64 data URL — small enough for 30s)
    await db.user.update({
      where: { id: user.id },
      data: {
        voiceBioUrl: audioData,
        voiceBioDuration: dur,
      },
    })

    return NextResponse.json({
      ok: true,
      voiceBioDuration: dur,
    })
  } catch (e) {
    console.error('Voice bio upload error', e)
    return NextResponse.json({ error: 'فشل حفظ التعريف الصوتي' }, { status: 500 })
  }
}

/**
 * DELETE /api/profile/voice-bio
 * Removes the current user's voice bio.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        voiceBioUrl: null,
        voiceBioDuration: 0,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Voice bio delete error', e)
    return NextResponse.json({ error: 'فشل حذف التعريف الصوتي' }, { status: 500 })
  }
}
