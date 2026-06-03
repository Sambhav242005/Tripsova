with open("D:/Travel/backend/scripts/seed.py", "rb") as f:
    data = f.read()

count_before = len(data)
data = data.replace(b"\xc3\xa9", b"e")
data = data.replace(b"\xc3\x89", b"E")
count_after = len(data)

print(f"Replaced {count_before - count_after} bytes")
print(f"Remaining accented chars: {data.count(b'\xc3')}")

with open("D:/Travel/backend/scripts/seed.py", "wb") as f:
    f.write(data)
