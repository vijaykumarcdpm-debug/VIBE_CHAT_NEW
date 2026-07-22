import os, zipfile
p = r'C:\Users\HP\Downloads\vibe_chat_new (3).zip'
print('exists', os.path.exists(p), 'size', os.path.getsize(p))
if os.path.exists(p):
    with zipfile.ZipFile(p) as z:
        for name in z.namelist()[:200]:
            print(name)
