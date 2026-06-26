import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * DELETE /api/voice-drafts/delete?id=xxx
 *
 * Deletes a voice draft.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const url = new URL(req.url)
    const draftId = url.searchParams.get('id')

    if (!draftId) {
      return NextResponse.json({ error: 'missing id' }, { status: 400 })
    }

    // Verify ownership
    const draft = await db.voiceDraft.findUnique({ where: { id: draftId } })
    if (!draft) {
      return NextResponse.json({ error: 'المسودة مش موجودة' }, { status: 404 })
    }

    if (draft.userId !== user.id) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 })
    }

    await db.voiceDraft.delete({ where: { id: draftId } })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Voice draft delete error', e)
    return NextResponse.json({ error: 'فشل حذف المسودة' }, { status: 500 })
  }
}
