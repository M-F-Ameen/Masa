import { cookies } from 'next/headers';
import { PermissionCode } from '../../domain/staff/enums/permission.enum';
import { RbacGuard } from './rbac-guard';
import { UserSessionContext } from './branch-context.service';
import { JwtService } from './jwt.service';
import { prisma } from '../db/prisma';
import { SystemRole } from '../../domain/staff/enums/role.enum';
import { SESSION_TTL_SECONDS } from './auth.constants';
import { shouldUseSecureCookies } from './cookie-security';

export class SessionService {
  private static readonly COOKIE_NAME = 'resto_session';

  public static async getCurrent(): Promise<UserSessionContext | null> {
    try {
      const token = (await cookies()).get(this.COOKIE_NAME)?.value;
      if (!token) return null;
      const claims = await JwtService.verify(token);
      if (typeof claims.userId !== 'string') return null;

      const user = await prisma.user.findUnique({
        where: { id: claims.userId, isActive: true },
        select: {
          id: true,
          role: { select: { name: true, permissions: { select: { permission: { select: { code: true } } } } } },
          userBranches: { where: { branch: { isActive: true } }, select: { branchId: true } },
        },
      });
      if (!user) return null;

      return {
        userId: user.id,
        role: user.role.name,
        permissions: user.role.permissions.map(({ permission }) => permission.code),
        assignedBranchIds: user.userBranches.map(({ branchId }) => branchId),
        isSuperAdmin: user.role.name === SystemRole.SUPER_ADMIN,
      };
    } catch {
      return null;
    }
  }

  public static async requirePermission(permission: PermissionCode): Promise<UserSessionContext> {
    const session = await this.getCurrent();
    RbacGuard.assertPermission(session, permission);
    return session!;
  }

  public static async requireAnyPermission(
    permissions: PermissionCode[],
    deniedMessage?: string
  ): Promise<UserSessionContext> {
    const session = await this.getCurrent();
    RbacGuard.assertAnyPermission(session, permissions, deniedMessage);
    return session!;
  }

  public static async write(token: string): Promise<void> {
    (await cookies()).set(this.COOKIE_NAME, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: await shouldUseSecureCookies(),
      maxAge: SESSION_TTL_SECONDS,
    });
  }

  public static async clear(): Promise<void> {
    (await cookies()).delete(this.COOKIE_NAME);
  }
}
