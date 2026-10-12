import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { env } from '../config/env';

function createPrismaClient(): PrismaClient {
  const url = new URL(env.DATABASE_URL);
  const host = url.hostname === 'localhost' ? '127.0.0.1' : url.hostname;
  const port = url.port ? parseInt(url.port, 10) : 3306;
  const user = decodeURIComponent(url.username || 'root');
  const password = decodeURIComponent(url.password || '');
  const database = url.pathname.replace(/^\//, '');
  const socketPath = url.searchParams.get('socket') || undefined;

  const adapter = new PrismaMariaDb({
    ...(socketPath ? { socketPath } : { host, port }),
    user,
    password,
    database,
    // MySQL 8+ / 9.x commonly uses caching_sha2_password. Allow the local
    // connector to retrieve the server RSA key when TLS is not configured.
    allowPublicKeyRetrieval: true,
  });

  return new PrismaClient({
    adapter,
    log: ['warn'],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Invalidate stale dev instance if newly generated models or relations are not present
if (globalForPrisma.prisma) {
  const p = globalForPrisma.prisma as unknown as {
    tableSection?: unknown;
    diningTable?: unknown;
    deliveryDriver?: unknown;
    driverSettlement?: unknown;
    _runtimeDataModel?: {
      models?: {
        Order?: {
          fields?: Array<{ name: string }>;
        };
        RestaurantSetting?: {
          fields?: Array<{ name: string }>;
        };
      };
    };
  };

  const hasModels = Boolean(
    p.tableSection &&
    p.diningTable &&
    p.deliveryDriver &&
    p.driverSettlement
  );

  const orderFields = p._runtimeDataModel?.models?.Order?.fields?.map((f) => f.name) ?? [];
  const hasOrderDriver = orderFields.length === 0 || orderFields.includes('driver');
  const restaurantSettingFields =
    p._runtimeDataModel?.models?.RestaurantSetting?.fields?.map((f) => f.name) ?? [];
  const hasRestaurantLogo =
    restaurantSettingFields.length === 0 || restaurantSettingFields.includes('logoUrl');

  if (!hasModels || !hasOrderDriver || !hasRestaurantLogo) {
    globalForPrisma.prisma = undefined;
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
