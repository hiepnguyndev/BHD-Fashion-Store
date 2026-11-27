package main

import (
	"strings"
	"testing"
)

func TestCRC16(t *testing.T) {
	if got := crc16("123456789"); got != 0x29B1 {
		t.Fatalf("crc16 = %04X, cần 29B1", got)
	}
}

func TestVietQR(t *testing.T) {
	q := taoVietQR("970436", "0123456789", 150000, "TTABCDE23456")
	if !strings.HasPrefix(q, "000201010212") {
		t.Fatalf("tiền tố sai: %s", q)
	}
	for _, p := range []string{"0006970436", "01100123456789", "QRIBFTTA", "5303704", "5406150000", "5802VN", "0812TTABCDE23456"} {
		if !strings.Contains(q, p) {
			t.Errorf("thiếu %s trong %s", p, q)
		}
	}
	// CRC ở cuối phải khớp với phần còn lại
	thanDuoi := q[:len(q)-4]
	if want := crc16(thanDuoi); q[len(q)-4:] != strings.ToUpper(strings.TrimSpace(sprintCRC(want))) {
		t.Errorf("CRC không khớp")
	}
}

func sprintCRC(v uint16) string {
	const hex = "0123456789ABCDEF"
	return string([]byte{hex[v>>12&15], hex[v>>8&15], hex[v>>4&15], hex[v&15]})
}

func TestNgauNhien(t *testing.T) {
	a, b := ngauNhien(10), ngauNhien(10)
	if len(a) != 10 || a == b {
		t.Fatalf("mã ngẫu nhiên lạ: %s %s", a, b)
	}
	if strings.ContainsAny(a, "01OIL") {
		t.Fatalf("có ký tự dễ nhầm: %s", a)
	}
}
