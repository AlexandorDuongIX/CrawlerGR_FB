import re
text = 'CK chốt slot nha mng , cảm ơn ad duyệt bài Ẩn bớt'
new_text = re.sub(r'(?i)([\n\s]*(ẩn bớt|see less|xem thêm|see more))+[\n\s]*$', '', text).strip()
print("Original:", repr(text))
print("Replaced:", repr(new_text))
