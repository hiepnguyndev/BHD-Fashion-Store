import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { tenCuaHang } from '@/lib/api';

// Nội dung mẫu. Cửa hàng PHẢI rà soát, điền thông tin pháp nhân thật và điều chỉnh theo quy định hiện hành trước khi mở bán.
const NOI_DUNG: Record<string, { tieuDe: string; doan: [string, string][] }> = {
  'doi-tra': { tieuDe: 'Chính sách đổi trả', doan: [
    ['Thời hạn', 'Bạn có thể yêu cầu đổi hoặc trả hàng trong vòng 7 ngày kể từ khi đơn được giao thành công, tại mục "Đơn hàng của tôi".'],
    ['Điều kiện', 'Sản phẩm còn nguyên tem mác, chưa qua sử dụng hoặc giặt, còn đầy đủ phụ kiện. Sản phẩm lỗi do nhà sản xuất hoặc giao sai được đổi/trả theo quy định.'],
    ['Hoàn tiền', 'Sau khi nhận và kiểm tra hàng trả, cửa hàng hoàn tiền theo hình thức phù hợp. Thời gian hoàn tiền phụ thuộc ngân hàng.'],
  ] },
  'van-chuyen': { tieuDe: 'Chính sách vận chuyển', doan: [
    ['Phạm vi', 'Giao hàng toàn quốc qua các đơn vị vận chuyển đối tác.'],
    ['Phí vận chuyển', 'Phí được hiển thị khi đặt hàng. Đơn đạt giá trị tối thiểu theo chương trình hiện hành được miễn phí vận chuyển.'],
    ['Thời gian', 'Thời gian giao dự kiến phụ thuộc khu vực và đơn vị vận chuyển; bạn sẽ nhận email cập nhật khi trạng thái đơn thay đổi.'],
  ] },
  'thanh-toan': { tieuDe: 'Chính sách thanh toán', doan: [
    ['Hình thức', 'Thanh toán khi nhận hàng (COD), chuyển khoản qua mã VietQR, hoặc thanh toán thẻ/ví/QR qua cổng SePay.'],
    ['Thời gian giữ đơn', 'Với đơn thanh toán trước, hàng được giữ trong thời gian giới hạn; quá hạn mà chưa thanh toán đơn sẽ tự hủy. Nếu bạn đã chuyển tiền sau khi đơn hủy, cửa hàng sẽ kiểm tra và hoàn tiền.'],
    ['Bảo mật', 'Cửa hàng không lưu thông tin thẻ của bạn. Giao dịch thẻ do cổng thanh toán xử lý.'],
  ] },
  'dieu-khoan': { tieuDe: 'Điều khoản sử dụng', doan: [
    ['Chấp thuận', 'Khi tạo tài khoản hoặc đặt hàng, bạn đồng ý với các điều khoản này và các chính sách liên quan được đăng trên website.'],
    ['Thông tin sản phẩm và giá', 'Cửa hàng nỗ lực hiển thị chính xác thông tin sản phẩm. Giá và tồn kho có thể thay đổi; đơn hàng chỉ được xác nhận khi hệ thống ghi nhận thành công.'],
    ['Trách nhiệm tài khoản', 'Bạn chịu trách nhiệm bảo mật mật khẩu và các hoạt động trong tài khoản của mình.'],
  ] },
  'bao-mat': { tieuDe: 'Chính sách bảo vệ dữ liệu cá nhân', doan: [
    ['Dữ liệu thu thập', 'Họ tên, email, số điện thoại, địa chỉ giao hàng và lịch sử đơn hàng, chỉ để xử lý đơn, chăm sóc khách hàng và thực hiện nghĩa vụ pháp lý.'],
    ['Chia sẻ', 'Dữ liệu chỉ chia sẻ với đơn vị vận chuyển và cổng thanh toán ở mức cần thiết để hoàn tất đơn hàng, hoặc khi pháp luật yêu cầu.'],
    ['Quyền của bạn', 'Bạn có thể xem, chỉnh sửa, tải về dữ liệu và yêu cầu xóa tài khoản ngay trong mục "Tài khoản". Dữ liệu đơn hàng có thể được giữ theo quy định về kế toán, thuế.'],
  ] },
  'lien-he': { tieuDe: 'Thông tin cửa hàng', doan: [
    ['Đơn vị', `${tenCuaHang} — [điền tên pháp nhân / hộ kinh doanh, mã số thuế, địa chỉ trụ sở]`],
    ['Liên hệ', '[điền email, số điện thoại, giờ làm việc]'],
    ['Lưu ý', 'Đây là trang mẫu: chủ cửa hàng cần điền thông tin thật theo quy định về thông tin cửa hàng trên website thương mại điện tử.'],
  ] },
};

type Ngu = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Ngu): Promise<Metadata> { const { slug } = await params; return { title: NOI_DUNG[slug]?.tieuDe || 'Chính sách' }; }
export default async function ChinhSach({ params }: Ngu) {
  const { slug } = await params;
  const nd = NOI_DUNG[slug];
  if (!nd) notFound();
  return (
    <article className="bai-viet">
      <h1>{nd.tieuDe}</h1>
      {nd.doan.map(([t, n]) => <section key={t}><h2>{t}</h2><p>{n}</p></section>)}
    </article>
  );
}
