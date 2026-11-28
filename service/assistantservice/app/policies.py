# Chính sách cửa hàng. Nội dung phải khớp trang /policies/* ở giao diện (frontend/src/app/(storefront)/policies/[slug]/page.tsx).
CHINH_SACH: dict[str, str] = {
    "doi-tra": "Đổi/trả trong 7 ngày kể từ khi đơn giao thành công, tại mục 'Đơn hàng của tôi'. Sản phẩm còn nguyên tem mác, chưa qua sử dụng hoặc giặt, đủ phụ kiện. Hàng lỗi hoặc giao sai được đổi/trả theo quy định. Sau khi nhận và kiểm tra hàng trả, cửa hàng hoàn tiền; thời gian về tài khoản phụ thuộc ngân hàng.",
    "van-chuyen": "Giao toàn quốc qua đơn vị vận chuyển đối tác. Phí hiển thị khi đặt hàng; đơn đạt giá trị tối thiểu theo chương trình hiện hành được miễn phí vận chuyển. Khách nhận email mỗi khi trạng thái đơn thay đổi.",
    "thanh-toan": "Có 3 hình thức: thanh toán khi nhận hàng (COD), chuyển khoản mã VietQR, hoặc thẻ/ví/QR qua cổng SePay. Với đơn thanh toán trước, hàng chỉ được giữ trong thời gian giới hạn; quá hạn chưa thanh toán thì đơn tự hủy. Nếu đã chuyển tiền sau khi đơn hủy, cửa hàng sẽ kiểm tra và hoàn tiền. Cửa hàng không lưu thông tin thẻ.",
    "bao-mat": "Cửa hàng chỉ thu thập họ tên, email, số điện thoại, địa chỉ giao hàng và lịch sử đơn để xử lý đơn và chăm sóc khách. Khách có thể xem, sửa, tải về dữ liệu hoặc yêu cầu xóa tài khoản trong mục 'Tài khoản'.",
}
LIEN_KET = {
    "doi-tra": "/policies/doi-tra", "van-chuyen": "/policies/van-chuyen",
    "thanh-toan": "/policies/thanh-toan", "bao-mat": "/policies/bao-mat",
}
