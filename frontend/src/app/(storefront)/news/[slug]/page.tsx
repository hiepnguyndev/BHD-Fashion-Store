import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Anh } from '@/components/Common';
import { layDuLieu } from '@/lib/server';
import { layT } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = await layDuLieu<any>('sanPham', '/api/tin-tuc/' + encodeURIComponent(slug));
  return { title: b?.tieuDe ?? 'Tin tức', description: b?.tomTat ?? undefined };
}

export default async function BaiTinTuc({ params }: Props) {
  const { t } = await layT();
  const { slug } = await params;
  const b = await layDuLieu<any>('sanPham', '/api/tin-tuc/' + encodeURIComponent(slug));
  if (!b) notFound();
  // Nội dung là văn bản thường (React tự thoát ký tự, không chèn HTML): đoạn cách nhau dòng trống, "## " là tiêu đề phụ.
  const khoi = String(b.noiDung).split(/\r?\n\s*\r?\n/).map((x) => x.trim()).filter(Boolean);
  return (
    <article className="bai-tin">
      <Link className="nut-chu" href="/news">← {t('Tất cả tin tức')}</Link>
      <h1>{b.tieuDe}</h1>
      <p className="nho mo">{new Date(b.ngayDang).toLocaleDateString('vi-VN')}</p>
      {b.anhBia && <div className="anh-bai"><Anh src={b.anhBia} alt={b.tieuDe} /></div>}
      {khoi.map((x, i) => x.startsWith('## ') ? <h2 key={i}>{x.slice(3)}</h2> : <p key={i} style={{ whiteSpace: 'pre-line' }}>{x}</p>)}
    </article>
  );
}
