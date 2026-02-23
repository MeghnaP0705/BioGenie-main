import os
import time
import requests
import json
from dotenv import load_dotenv

load_dotenv(override=True)
BASE = "http://localhost:8000"

print("Waiting for Gemini API Rate Limit to clear...")
print("Polling every 65 seconds to avoid triggering the penalty lock...")

attempts = 0
while True:
    attempts += 1
    print(f"\n[Attempt {attempts}] Sleeping for 65 seconds...")
    time.sleep(65)
    
    print("Testing the /ask endpoint...")
    try:
        r = requests.post(f"{BASE}/ask", json={
            "question": "What is a tissue?",
            "class_level": "9"
        })
        
        if r.status_code == 200:
            data = r.json()
            answer = data.get("answer", "")
            
            if "BioGenie AI is currently taking a quick break" in answer:
                print("-> Still rate-limited. Waiting another cycle...")
            else:
                print("\n🎉 SUCCESS! The rate limit has cleared!")
                print(json.dumps(data, indent=2))
                break
        else:
            print(f"-> Unexpected status code: {r.status_code}")
            
    except Exception as e:
        print(f"-> Request failed: {e}")
