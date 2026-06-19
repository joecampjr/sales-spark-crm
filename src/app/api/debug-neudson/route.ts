import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    // Allow Admins and Superadmins to run the check
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Search for Neudson specifically
    const neudsonSellers = await prisma.seller.findMany({
      where: {
        name: { contains: 'Neudson', mode: 'insensitive' }
      },
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, role: true, branchId: true } }
      }
    });

    const neudsonUsers = await prisma.user.findMany({
      where: {
        name: { contains: 'Neudson', mode: 'insensitive' }
      },
      include: {
        branch: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true, branchId: true } }
      }
    });

    // 2. Scan for inconsistencies across all sellers and users
    const allSellers = await prisma.seller.findMany({
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, role: true, branchId: true } }
      }
    });

    const allUsers = await prisma.user.findMany({
      include: {
        branch: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true, branchId: true } }
      }
    });

    const inconsistencies: any[] = [];

    // Sellers check
    for (const seller of allSellers) {
      if (!seller.userId) {
        inconsistencies.push({
          type: 'SELLER_MISSING_USER_ID',
          message: `Seller "${seller.name}" (${seller.id}) has no userId assigned.`,
          seller
        });
        continue;
      }

      if (!seller.user) {
        inconsistencies.push({
          type: 'SELLER_USER_NOT_FOUND',
          message: `Seller "${seller.name}" (${seller.id}) references userId "${seller.userId}" but no such user exists.`,
          seller
        });
        continue;
      }

      if (seller.branchId !== seller.user.branchId) {
        inconsistencies.push({
          type: 'BRANCH_ID_MISMATCH',
          message: `Seller "${seller.name}" has branchId "${seller.branchId}" (${seller.branch?.name || 'Sede'}), but their User profile has branchId "${seller.user.branchId}".`,
          seller
        });
      }
    }

    // Users check (role VENDEDOR)
    const sellersUserIds = new Set(allSellers.map(s => s.userId).filter(Boolean));
    for (const user of allUsers) {
      if (user.role === 'VENDEDOR' && !sellersUserIds.has(user.id)) {
        inconsistencies.push({
          type: 'USER_VENDEDOR_MISSING_SELLER',
          message: `User "${user.name}" (${user.id}) has role VENDEDOR but has no corresponding Seller record.`,
          user
        });
      }
    }

    // 3. List all branches for reference
    const branches = await prisma.branch.findMany({
      select: { id: true, name: true }
    });

    return NextResponse.json({
      neudsonSellers,
      neudsonUsers,
      inconsistenciesCount: inconsistencies.length,
      inconsistencies,
      totalSellers: allSellers.length,
      totalUsers: allUsers.length,
      branches
    });
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
