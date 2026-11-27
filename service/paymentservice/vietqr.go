package main

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"strconv"
)

// Bảng ký tự mã thanh toán: bỏ các ký tự dễ nhầm (0 O 1 I L) để khách gõ tay vẫn đúng.
const bangKyTu = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

func ngauNhien(doDai int) string {
	b := make([]byte, doDai)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(bangKyTu))))
		if err != nil {
			panic(err) // không có nguồn ngẫu nhiên an toàn thì không thể chạy tiếp
		}
		b[i] = bangKyTu[n.Int64()]
	}
	return string(b)
}

// crc16 là CRC-16/CCITT-FALSE (đa thức 0x1021, khởi tạo 0xFFFF) theo chuẩn VietQR/EMVCo.
func crc16(s string) uint16 {
	crc := uint16(0xFFFF)
	for i := 0; i < len(s); i++ {
		crc ^= uint16(s[i]) << 8
		for j := 0; j < 8; j++ {
			if crc&0x8000 != 0 {
				crc = crc<<1 ^ 0x1021
			} else {
				crc <<= 1
			}
		}
	}
	return crc
}

func tlv(id, giaTri string) string {
	return fmt.Sprintf("%s%02d%s", id, len(giaTri), giaTri)
}

// taoVietQR dựng chuỗi VietQR động (chuyển nhanh Napas 247 tới tài khoản) kèm số tiền và nội dung.
func taoVietQR(bin, soTaiKhoan string, soTien int64, noiDung string) string {
	toChuc := tlv("00", bin) + tlv("01", soTaiKhoan)
	taiKhoan := tlv("00", "A000000727") + tlv("01", toChuc) + tlv("02", "QRIBFTTA")
	s := tlv("00", "01") + tlv("01", "12") + tlv("38", taiKhoan) + tlv("53", "704")
	if soTien > 0 {
		s += tlv("54", strconv.FormatInt(soTien, 10))
	}
	s += tlv("58", "VN") + tlv("62", tlv("08", noiDung))
	s += "6304"
	return fmt.Sprintf("%s%04X", s, crc16(s))
}
