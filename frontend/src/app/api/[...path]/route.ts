import { NextRequest } from 'next/server';
import { chuyenTiep } from '@/lib/bff';

export const dynamic = 'force-dynamic';

type Ngu = { params: Promise<{ path: string[] }> };
async function xuLy(req: NextRequest, ngu: Ngu) {
  const { path } = await ngu.params;
  return chuyenTiep(req, '/api/' + path.map(encodeURIComponent).join('/'));
}
export const GET = xuLy;
export const POST = xuLy;
export const PUT = xuLy;
export const PATCH = xuLy;
export const DELETE = xuLy;
