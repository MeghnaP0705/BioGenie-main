"""Quick test: check which Gemini models are NOT rate-limited right now."""
import os
from dotenv import load_dotenv
load_dotenv(override=True)

import google.generativeai as genai
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Test embedding first
print("=== Testing Embedding Model ===")
try:
    result = genai.embed_content(
        model="models/gemini-embedding-001",
        content="Hello test",
    )
    print(f"Embedding OK! Vector length: {len(result['embedding'])}")
except Exception as e:
    print(f"Embedding FAILED: {e}")

# Test LLM models
models_to_test = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest",
]

for model_name in models_to_test:
    print(f"\n=== Testing {model_name} ===")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Say hi in one word")
        print(f"OK: {response.text.strip()}")
    except Exception as e:
        err = str(e)
        if "429" in err or "RESOURCE_EXHAUSTED" in err:
            print("RATE LIMITED")
        elif "404" in err or "NOT_FOUND" in err:
            print("MODEL NOT FOUND")
        else:
            print(f"ERROR: {err[:100]}")
