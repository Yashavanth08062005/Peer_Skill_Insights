import socket
def check(port):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            return s.connect_ex(('localhost', port)) == 0
    except:
        return False
print(f"5173:{check(5173)}")
print(f"3000:{check(3000)}") # Older frontend?
print(f"3001:{check(3001)}") # user history mentioned 3001
print(f"5000:{check(5000)}") # Backend?
