// Đa ngôn ngữ: khóa là câu tiếng Việt gốc, bản dịch tiếng Anh tra theo khóa đó.
// Thiếu bản dịch thì hiện lại câu tiếng Việt. Tham số dạng {ten} được thay bằng giá trị truyền vào.
export type NgonNgu = 'vi' | 'en';
export const COOKIE_NGON_NGU = 'ngon-ngu';
export const KHOA_GIAO_DIEN = 'giao-dien';
export const chuanHoaNgonNgu = (v?: string | null): NgonNgu => (v === 'en' ? 'en' : 'vi');

const EN: Record<string, string> = {
  // đầu trang & chân trang
  'Trang chủ': 'Home', 'Danh mục': 'Categories', 'Ưu đãi': 'Offers', 'Liên hệ': 'Contact',
  'Tất cả sản phẩm': 'All products', 'Mở menu': 'Open menu', 'Tìm sản phẩm…': 'Search products…', 'Tìm sản phẩm': 'Search products',
  'Thông báo': 'Notifications', 'Đánh dấu đã đọc': 'Mark as read', 'Chưa có thông báo.': 'No notifications yet.',
  'Giỏ hàng': 'Cart', 'Tài khoản': 'Account', 'Tài khoản của tôi': 'My account', 'Đơn hàng của tôi': 'My orders',
  'Sản phẩm yêu thích': 'Wishlist', 'Trang quản trị': 'Admin panel', 'Đăng xuất': 'Log out', 'Đăng nhập': 'Log in',
  'Tạo tài khoản': 'Create account', 'Tra cứu đơn hàng': 'Track an order',
  'Đổi giao diện sáng / tối': 'Toggle light / dark mode',
  'Đổi ngôn ngữ': 'Change language', 'Tiếng Việt': 'Vietnamese', 'Tiếng Anh': 'English',
  'Thời trang tối giản, chất liệu dễ chịu, giao hàng toàn quốc.': 'Minimal fashion, comfortable fabrics, nationwide delivery.',
  'Mua sắm': 'Shop', 'Chính sách': 'Policies', 'Pháp lý': 'Legal', 'Đổi trả': 'Returns', 'Vận chuyển': 'Shipping',
  'Thanh toán': 'Payment', 'Điều khoản sử dụng': 'Terms of use', 'Bảo vệ dữ liệu cá nhân': 'Personal data protection',
  'Thông tin cửa hàng': 'Store information', 'Bảo lưu mọi quyền.': 'All rights reserved.',
  // trang chủ
  'mặc đẹp mỗi ngày, không cầu kỳ.': 'dress well every day, effortlessly.',
  'Chất liệu dễ chịu, đường may chỉn chu, giao hàng toàn quốc.': 'Comfortable fabrics, careful stitching, nationwide delivery.',
  'Mua sắm ngay': 'Shop now', 'Sản phẩm nổi bật': 'Featured products', 'Xem tất cả': 'View all', 'Bộ sưu tập': 'Collections',
  '{n} sản phẩm': '{n} products', 'Hàng mới về': 'New arrivals',
  'Chưa tải được danh sách sản phẩm. Vui lòng thử lại sau ít phút.': 'Could not load the product list. Please try again in a few minutes.',
  'Giao hàng toàn quốc': 'Nationwide delivery', 'Miễn phí vận chuyển cho đơn đủ điều kiện.': 'Free shipping on eligible orders.',
  'Đổi trả trong 7 ngày': '7-day returns', 'Kể từ khi nhận hàng, theo chính sách đổi trả.': 'From the day you receive the goods, per our returns policy.',
  'Thanh toán linh hoạt': 'Flexible payment', 'COD hoặc chuyển khoản ngân hàng.': 'Cash on delivery or bank transfer.',
  // danh sách sản phẩm
  'Sản phẩm': 'Products', 'Mới nhất': 'Newest', 'Bán chạy': 'Best sellers', 'Đánh giá cao': 'Top rated', 'Giá tăng dần': 'Price: low to high', 'Giá giảm dần': 'Price: high to low',
  'Tất cả mức giá': 'All prices', 'Dưới 300.000₫': 'Under 300,000₫', 'Trên 1.000.000₫': 'Over 1,000,000₫',
  'Kết quả cho': 'Results for', 'xóa': 'clear', 'Đang lọc: sản phẩm giảm giá': 'Filtering: discounted products',
  'Tất cả': 'All', 'Khoảng giá': 'Price range', 'Kích cỡ': 'Size',
  'Chưa tải được danh sách sản phẩm. Vui lòng thử lại sau.': 'Could not load the product list. Please try again later.',
  'Không tìm thấy sản phẩm phù hợp': 'No matching products found', 'Xem tất cả sản phẩm': 'View all products',
  // chung
  'Hết hàng': 'Sold out', 'Đang tải': 'Loading', 'Đang tải…': 'Loading…', 'Phân trang': 'Pagination', 'Đóng': 'Close', 'Có lỗi xảy ra.': 'Something went wrong.',
  // chi tiết sản phẩm
  'Có thể bạn thích': 'You may also like', 'Vui lòng chọn kích cỡ.': 'Please choose a size.', 'Đã thêm vào giỏ hàng.': 'Added to cart.',
  'Không thêm được vào giỏ.': 'Could not add to cart.', 'Ảnh {n}': 'Photo {n}', 'Đã bán {n}': '{n} sold', 'Màu sắc': 'Color', 'Xóa tất cả bộ lọc': 'Clear all filters', 'Tất cả kích cỡ': 'All sizes', 'Tất cả màu sắc': 'All colors', 'Không có sản phẩm phù hợp.': 'No matching products.', 'Xem tất cả kết quả': 'See all results', 'Tìm áo thun, quần jeans, váy…': 'Search T-shirts, jeans, skirts…',
  'Chỉ còn {n} sản phẩm.': 'Only {n} left.', 'Giảm': 'Decrease', 'Tăng': 'Increase', 'Đang thêm…': 'Adding…', 'Thêm vào giỏ': 'Add to cart',
  'Bỏ yêu thích': 'Remove from wishlist', 'Yêu thích': 'Add to wishlist', 'Mua ngay': 'Buy now', 'Chất liệu:': 'Material:', 'Mã hàng:': 'SKU:', 'Mô tả': 'Description',
  'Đánh giá từ khách hàng': 'Customer reviews', '{n} đánh giá': '{n} reviews', 'Chưa có đánh giá nào.': 'No reviews yet.', 'Đã mua hàng': 'Verified purchase',
  'Viết đánh giá': 'Write a review', 'để đánh giá. Chỉ khách đã nhận hàng mới có thể đánh giá.': 'to leave a review. Only customers who received the item can review.',
  'Số sao': 'Rating', '{n} sao': '{n} stars', 'Nội dung': 'Comment', 'Chia sẻ trải nghiệm của bạn…': 'Share your experience…',
  'Đang gửi…': 'Sending…', 'Gửi đánh giá': 'Submit review', 'Không gửi được đánh giá.': 'Could not submit the review.',
  // giỏ hàng
  'Giỏ hàng của bạn đang trống': 'Your cart is empty', 'Tiếp tục mua sắm': 'Continue shopping', 'Xóa': 'Remove',
  'Tóm tắt đơn hàng': 'Order summary', 'Tạm tính ({n} sản phẩm)': 'Subtotal ({n} items)', 'Phí vận chuyển và giảm giá': 'Shipping and discounts',
  'tính ở bước sau': 'calculated at checkout', 'Tổng': 'Total', 'Có sản phẩm không mua được sẽ không được tính vào đơn.': 'Items that cannot be purchased are excluded from the order.',
  'Tiến hành đặt hàng': 'Proceed to checkout', '← Tiếp tục mua sắm': '← Continue shopping',
  // đăng nhập / đăng ký
  'Không đăng nhập được.': 'Could not log in.', 'Mật khẩu': 'Password', 'Gửi lại email xác thực': 'Resend verification email',
  'Nếu email tồn tại và chưa xác thực, chúng tôi đã gửi lại liên kết.': 'If the email exists and is not verified, we have sent the link again.',
  'Đang đăng nhập…': 'Logging in…', 'Quên mật khẩu?': 'Forgot password?', 'Chưa có tài khoản?': 'No account yet?', 'Đăng ký': 'Sign up',
  'Không đăng ký được.': 'Could not sign up.', 'Kiểm tra email của bạn': 'Check your email', 'Chúng tôi đã gửi liên kết xác thực tới': 'We have sent a verification link to',
  'Bấm vào liên kết để kích hoạt tài khoản.': 'Click the link to activate your account.', 'Về trang đăng nhập': 'Back to log in',
  'Họ và tên': 'Full name', 'Số điện thoại (không bắt buộc)': 'Phone number (optional)', '10 chữ số, bắt đầu bằng 0': '10 digits, starting with 0',
  'Tối thiểu 8 ký tự.': 'At least 8 characters.', 'Tôi đồng ý với': 'I agree to the', 'điều khoản sử dụng': 'terms of use',
  'và cho phép xử lý dữ liệu cá nhân theo': 'and allow my personal data to be processed under the', 'chính sách bảo vệ dữ liệu': 'data protection policy',
  'Đang tạo…': 'Creating…', 'Đã có tài khoản?': 'Already have an account?',
  // ưu đãi
  'Mã giảm giá đang chạy và những sản phẩm đang được giảm giá.': 'Active discount codes and products on sale.',
  'Xem tất cả sản phẩm giảm giá': 'View all discounted products', 'Mã giảm giá': 'Discount codes', 'Giảm {n}': '{n} off', 'Đơn từ {n}': 'Orders from {n}',
  'Mọi đơn hàng': 'Any order', 'tối đa {n}': 'up to {n}', 'Hết hạn {n}': 'Expires {n}',
  'Chưa tải được danh sách mã giảm giá. Vui lòng thử lại sau.': 'Could not load discount codes. Please try again later.',
  'Hiện chưa có mã giảm giá nào. Hãy quay lại sau nhé!': 'No discount codes right now. Please check back later!',
  'Nhập mã ở bước đặt hàng để được giảm. Mỗi mã có điều kiện và số lượt dùng riêng.': 'Enter the code at checkout to get the discount. Each code has its own conditions and usage limit.',
  'Đang giảm giá': 'On sale', 'Chưa tải được danh sách sản phẩm.': 'Could not load the product list.', 'Hiện chưa có sản phẩm nào đang giảm giá.': 'No products on sale right now.',
  'Bấm để sao chép mã': 'Click to copy the code', 'Đã chép': 'Copied',
  // liên hệ
  'Địa chỉ': 'Address', 'Điện thoại': 'Phone', 'Giờ làm việc': 'Opening hours', 'Đang cập nhật': 'Coming soon',
  'luôn sẵn lòng hỗ trợ bạn về đơn hàng, đổi trả và tư vấn size.': 'is happy to help with orders, returns and size advice.',
  'Gửi tin nhắn': 'Send a message', 'Cửa hàng chưa cấu hình email nhận tin. Bạn vui lòng liên hệ qua các thông tin bên cạnh.': 'The store has not set up an email inbox yet. Please use the contact details beside.',
  'Họ tên': 'Name', 'Email của bạn': 'Your email', 'Chủ đề': 'Subject', 'Soạn email gửi cửa hàng': 'Compose email to the store',
  'Nút trên sẽ mở ứng dụng email trên thiết bị của bạn với nội dung đã điền sẵn.': 'The button above opens your email app with the message pre-filled.',
  // đặt hàng
  'Không kiểm tra được mã.': 'Could not check the code.', 'Vui lòng đồng ý với điều khoản mua hàng.': 'Please agree to the purchase terms.',
  'Không đặt được hàng. Vui lòng thử lại.': 'Could not place the order. Please try again.', 'Chưa có sản phẩm để đặt hàng': 'No items to order',
  'Đặt hàng': 'Checkout', 'Bạn có thể đặt hàng không cần tài khoản.': 'You can order without an account.', 'để lưu địa chỉ và theo dõi đơn dễ hơn.': 'to save addresses and track orders more easily.',
  'Thông tin giao hàng': 'Shipping details', 'Địa chỉ đã lưu': 'Saved addresses', 'Họ tên người nhận': 'Recipient name', 'Số điện thoại': 'Phone number',
  'Số điện thoại 10 chữ số, bắt đầu bằng 0': '10-digit phone number starting with 0', 'Email (nhận xác nhận đơn hàng)': 'Email (for order confirmation)',
  'Số nhà, tên đường': 'House number, street', 'Phường / xã': 'Ward / commune', 'Tỉnh / thành phố': 'Province / city',
  'Ghi chú cho cửa hàng (không bắt buộc)': 'Note to the store (optional)', 'Phương thức thanh toán': 'Payment method',
  'Thanh toán khi nhận hàng (COD)': 'Cash on delivery (COD)', 'Chuyển khoản': 'Bank transfer', 'Thẻ / ví / QR qua cổng SePay': 'Card / wallet / QR via SePay',
  'Trả tiền mặt cho nhân viên giao hàng.': 'Pay cash to the courier.', 'Quét mã QR bằng app ngân hàng, hệ thống tự xác nhận khi tiền về.': 'Scan the QR code with your banking app; the system confirms automatically when the money arrives.',
  'Thanh toán bằng thẻ, ví hoặc QR trên cổng của SePay.': 'Pay by card, wallet or QR on the SePay gateway.',
  'Đơn hàng ({n} sản phẩm)': 'Order ({n} items)', 'Nhập mã': 'Enter code', 'Áp dụng': 'Apply', 'Đã áp dụng mã {ma}: giảm {n}': 'Code {ma} applied: {n} off',
  'Tạm tính': 'Subtotal', 'Phí vận chuyển (tạm tính)': 'Shipping (estimated)', 'Miễn phí': 'Free', 'Giảm giá': 'Discount',
  'Số tiền chính thức được tính lại khi đặt hàng.': 'The final amount is recalculated when you place the order.',
  'Tôi đã đọc và đồng ý với': 'I have read and agree to the', 'điều khoản': 'terms', 'và': 'and', 'chính sách đổi trả': 'returns policy', 'Đang xử lý…': 'Processing…',
  'Hiện mật khẩu': 'Show password', 'Ẩn mật khẩu': 'Hide password',
  // bổ sung: menu, trang chủ
  'Tin tức': 'News', 'Sản phẩm đang giảm giá': 'Products on sale', 'Sản phẩm đang sale': 'On sale now', 'Khám phá ngay': 'Explore now',
  'Thông tin & địa chỉ': 'Profile & addresses',
  // trợ lý chat
  'Trợ lý tư vấn': 'Shopping assistant', 'Mở trợ lý tư vấn': 'Open shopping assistant', 'Đóng trợ lý': 'Close assistant',
  'Trả lời tự động bằng AI, có thể chưa chính xác': 'Automated AI replies, may be inaccurate', 'Nhập câu hỏi…': 'Type your question…', 'Câu hỏi': 'Question', 'Gửi': 'Send',
  'Chào bạn! Mình là trợ lý của cửa hàng. Mình gợi ý sản phẩm, tư vấn size và giải đáp về đổi trả, vận chuyển. Bạn cần gì ạ?': "Hi! I'm the store assistant. I can suggest products, advise on sizes and answer questions about returns and shipping. How can I help?",
  'Áo thun nam dưới 300k': "Men's T-shirts under 300k", 'Váy nữ đang giảm giá': "Women's dresses on sale", 'Mình cao 1m70 nặng 65kg mặc size nào?': "I'm 170 cm and 65 kg, which size should I wear?", 'Chính sách đổi trả': 'Returns policy',
  'Xin lỗi, trợ lý đang bận. Bạn thử lại sau ít phút hoặc dùng trang Liên hệ nhé.': 'Sorry, the assistant is busy. Please try again in a few minutes or use the Contact page.',
  // thử đồ bằng AI
  '✨ Thử đồ bằng AI': '✨ AI virtual try-on', 'Thử đồ': 'Try on', 'Thử đồ: {ten}': 'Try on: {ten}', 'Tải ảnh lên': 'Upload photo', 'Dùng camera': 'Use camera', 'Chụp ảnh': 'Take photo',
  'Chọn ảnh khác': 'Choose another photo', 'Thử ảnh khác': 'Try another photo', 'Thử lại': 'Try again', 'Xong, xóa ảnh': 'Done, delete photos', 'Ảnh của bạn': 'Your photo', 'Kết quả AI': 'AI result',
  'Chọn ảnh toàn thân hoặc nửa người, đứng thẳng, rõ nét': 'Choose a full-body or half-body photo, standing straight and sharp',
  'Hiện hỗ trợ áo. Mặc áo ôm sát hoặc áo ngắn tay cho kết quả tốt hơn.': 'Tops only for now. Fitted or short-sleeved tops give better results.',
  'Chỉ một người trong ảnh, nền đơn giản, đủ sáng, nhìn thẳng.': 'One person only, plain background, good light, facing the camera.',
  'Kết quả mang tính minh họa, không thay thế bảng size.': 'Results are illustrative and do not replace the size chart.',
  'Tôi đồng ý gửi ảnh này tới dịch vụ AI công khai (Hugging Face) để thử đồ. Cửa hàng không lưu ảnh gốc; ảnh kết quả tự xóa sau 30 phút.': 'I agree to send this photo to a public AI service (Hugging Face) for the try-on. The store does not keep the original photo; results are deleted after 30 minutes.',
  'Bạn cần đăng nhập để thử đồ.': 'Please sign in to try on.', 'Vui lòng giữ cửa sổ này mở.': 'Please keep this window open.', 'Đang gửi ảnh…': 'Sending photo…',
  'Đang xếp hàng (vị trí {n})…': 'Waiting in queue (position {n})…', 'AI đang mặc thử cho bạn, thường mất 30–90 giây…': 'The AI is trying it on for you, usually 30–90 seconds…',
  'Không mở được camera. Hãy cho phép trình duyệt dùng camera hoặc chọn tải ảnh lên.': 'Could not open the camera. Allow camera access or upload a photo instead.',
  'Có lỗi xảy ra. Vui lòng thử lại.': 'Something went wrong. Please try again.', 'Không thử được. Vui lòng thử lại.': 'Try-on failed. Please try again.',
  'Quá lâu chưa có kết quả. Dịch vụ miễn phí có thể đang quá tải, bạn thử lại sau nhé.': 'No result yet. The free service may be overloaded, please try again later.',
  'Kết quả mang tính minh họa.': 'Results are illustrative.', 'Bạn còn {n} lượt hôm nay.': 'You have {n} tries left today.',
  // trang tài khoản
  'Thông tin cá nhân': 'Personal information', 'Email của bạn chưa được xác thực.': 'Your email has not been verified.',
  'Lưu thay đổi': 'Save changes', 'Sổ địa chỉ': 'Address book', '+ Thêm địa chỉ': '+ Add address', 'Bạn chưa lưu địa chỉ nào.': 'You have no saved addresses.', 'Mặc định': 'Default',
  'Sửa': 'Edit', 'Đổi mật khẩu': 'Change password', 'Mật khẩu hiện tại': 'Current password', 'Mật khẩu mới': 'New password', 'Dữ liệu cá nhân của bạn': 'Your personal data',
  'Bạn có quyền tải về bản sao dữ liệu của mình và yêu cầu xóa tài khoản. Thông tin đơn hàng có thể được giữ lại theo quy định về kế toán, thuế.': 'You can download a copy of your data and ask for your account to be deleted. Order records may be retained under accounting and tax rules.',
  'Tải dữ liệu của tôi': 'Download my data', 'Xóa tài khoản': 'Delete account', 'Người nhận': 'Recipient', 'Đặt làm địa chỉ mặc định': 'Set as default address', 'Lưu địa chỉ': 'Save address', 'Sửa địa chỉ': 'Edit address', 'Thêm địa chỉ': 'Add address', 'Xóa vĩnh viễn tài khoản': 'Permanently delete account', 'Xóa địa chỉ này?': 'Delete this address?',
  'Hành động này không thể hoàn tác. Thông tin cá nhân của bạn sẽ được ẩn danh hóa. Nhập mật khẩu để xác nhận.': 'This cannot be undone. Your personal information will be anonymised. Enter your password to confirm.',
  'Đã lưu thông tin.': 'Information saved.', 'Đã đổi mật khẩu.': 'Password changed.', 'Đã lưu địa chỉ.': 'Address saved.', 'Tài khoản đã được xóa.': 'Your account has been deleted.', 'Không xuất được dữ liệu.': 'Could not export your data.',
  // gợi ý size
  'Số đo & gợi ý size': 'Measurements & size guide', 'Bạn mua đồ cho': 'Shopping for', 'Nam': 'Men', 'Nữ': 'Women', 'Lưu và xem gợi ý': 'Save and see suggestions',
  'Điền số đo của bạn một lần: cửa hàng gợi ý cỡ Áo, Quần và sản phẩm còn hàng phù hợp, đồng thời trợ lý chat dùng thông tin này để tư vấn. Đây là gợi ý gần đúng, không thay thế bảng size riêng của từng sản phẩm.':
    "Enter your measurements once: the store suggests Top and Bottom sizes and matching in-stock products, and the chat assistant uses them to advise you. This is an approximate guide, not a substitute for each product's size chart.",
  'Đã lưu số đo. Trợ lý chat cũng sẽ dùng thông tin này để tư vấn.': 'Measurements saved. The chat assistant will also use them to advise you.',
  'Chọn "Bạn mua đồ cho" để xem sản phẩm phù hợp.': 'Choose "Shopping for" to see matching products.',
  'Áo nam': "Men's tops", 'Quần nam': "Men's bottoms", 'Áo nữ': "Women's tops", 'Quần nữ': "Women's bottoms", 'Váy nữ': "Women's dresses", 'size': 'size',
  'Chiều cao (cm)': 'Height (cm)', 'Cân nặng (kg)': 'Weight (kg)', 'Vòng ngực (cm)': 'Chest (cm)', 'Vòng eo (cm)': 'Waist (cm)', 'Cỡ giày (EU)': 'Shoe size (EU)',
  'Size gợi ý của bạn': 'Your suggested size', 'Áo': 'Top', 'Quần': 'Bottom', 'Giày': 'Shoes',
  'Hiện chưa có sản phẩm còn hàng ở cỡ này.': 'No items in stock at this size yet.',
  'Vui lòng nhập ít nhất vòng ngực, vòng eo hoặc cỡ giày (hoặc cả chiều cao và cân nặng).': 'Please enter at least chest, waist or shoe size (or both height and weight).',
};

export function dich(lang: NgonNgu, khoa: string, thamSo?: Record<string, string | number>): string {
  let s = lang === 'en' ? EN[khoa] ?? khoa : khoa;
  if (thamSo) for (const [k, v] of Object.entries(thamSo)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
export type HamDich = (khoa: string, thamSo?: Record<string, string | number>) => string;

// Chạy trước khi tô giao diện để không bị nháy sáng/tối.
export const MA_GIAO_DIEN = `try{var t=localStorage.getItem('${KHOA_GIAO_DIEN}');if(t!=='dark'&&t!=='light')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){}`;
