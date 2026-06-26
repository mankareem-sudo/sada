import { NextRequest, NextResponse } from 'next/server'
import { db, generateId } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/profile/views
 * body: { profileOwnerId }
 *
 * Records a profile view (when someone visits another user's profile).
 * - Doesn't record if viewing own profile
 * - Doesn't record if same viewer viewed in last hour (avoid spam)
 *
 * GET /api/profile/views
 * Returns:
 * - Total profile views count (all time)
 * - Unique viewers count
 * - Recent viewers (if profile owner is requesting their own)
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    const body = await req.json()
    const { profileOwnerId } = body as { profileOwnerId?: string }

    if (!profileOwnerId) {
      return NextResponse.json({ error: 'missing profileOwnerId' }, { status: 400 })
    }

    // Don't record self-views
    if (currentUser?.id === profileOwnerId) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    // Check if same viewer viewed in last hour (avoid spam)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const existing = await db.profileView.findFirst({
      where: {
        profileOwnerId,
        viewerId: currentUser?.id || null,
        viewedAt: { gt: oneHourAgo },
      },
    })

    if (existing) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    // Record the view
    await db.profileView.create({
      data: {
        id: generateId(),
        profileOwnerId,
        viewerId: currentUser?.id || null,
        viewedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Profile view record error', e)
    return NextResponse.json({ error: 'فشل تسجيل المشاهدة' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 401 })
    }

    const url = new URL(req.url)
    const username = url.searchParams.get('username')

    let targetUserId = currentUser.id
    if (username) {
      const target = await db.user.findFirst({
        where: { username: username.toLowerCase() },
      })
      if (!target) {
        return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })
      }
      targetUserId = target.id
    }

    // Only the profile owner can see their detailed view stats
    const isOwner = targetUserId === currentUser.id

    // Total views
    const allViews = await db.profileView.findMany({
      where: { profileOwnerId: targetUserId },
      orderBy: { viewedAt: 'desc' },
    })

    const totalViews = (allViews as any[]).length
    const uniqueViewers = new Set(
      (allViews as any[])
        .map((v: any) => v.viewerId)
        .filter(Boolean)
    ).size

    // Last 7 days views
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const recentViews = (allViews as any[]).filter(
      (v: any) => new Date(v.viewedAt) > new Date(sevenDaysAgo)
    ).length

    // Recent viewers (only if owner)
    let recentViewers: any[] = []
    if (isOwner) {
      const recentViewerIds = (allViews as any[])
        .slice(0, 20)
        .map((v: any) => v.viewerId)
        .filter(Boolean)
      if (recentViewerIds.length > 0) {
        const viewers = await db.user.findMany({
          where: { id: { in: recentViewerIds } },
          select: {
            id: true,
            username: true,
            name: true,
            avatarColor: true,
            avatarUrl: true,
            isVerified: true,
          },
        })
        const viewerMap = new Map((viewers as any[]).map((v: any) => [v.id, v]))
        recentViewers = (allViews as any[])
          .slice(0, 20)
          .map((v: any) => ({
            viewedAt: v.viewedAt,
            user: v.viewerId ? viewerMap.get(v.viewerId) : null,
          }))
          .filter((rv: any) => rv.user)
      }
    }

    return NextResponse.json({
      totalViews,
      uniqueViewers,
      recentViews,
      recentViewers: isOwner ? recentViewers : [],
    })
  } catch (e) {
    console.error('Profile views fetch error', e)
    return NextResponse.json({ error: 'فشل تحميل المشاهدات' }, { status: 500 })
  }
}
