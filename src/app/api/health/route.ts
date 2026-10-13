import { NextResponse } from 'next/server';

/**
 * GET /api/health
 *
 * Lightweight liveness endpoint used by the GitLab CI health-check curl and
 * any external monitoring tool. Intentionally does NOT query the database so
 * it responds immediately and cannot hang due to DB connectivity issues.
 *
 * A separate /api/health/ready endpoint (not implemented yet) can be added
 * later to perform a DB ping for readiness checks.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        // Prevent caching so monitors always get a fresh response
        'Cache-Control': 'no-store',
      },
    }
  );
}
