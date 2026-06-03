import urllib.request, json

# Login
data = json.dumps({"email": "traveller@tripova.com", "password": "password123"}).encode()
req = urllib.request.Request(
    "http://localhost:8000/api/auth/login",
    data=data,
    headers={"Content-Type": "application/json"},
)
resp = urllib.request.urlopen(req)
token = json.loads(resp.read())["access_token"]
print("Login OK, token received")

# Get me
req2 = urllib.request.Request(
    "http://localhost:8000/api/auth/me",
    headers={"Authorization": f"Bearer {token}"},
)
try:
    resp2 = urllib.request.urlopen(req2)
    print("Auth/me response:", json.loads(resp2.read()))
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode()}")
