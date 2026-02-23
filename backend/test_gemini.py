import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

load_dotenv(override=True)
api_key = os.getenv("GOOGLE_API_KEY")

print("Testing Gemini 2.0 Flash API...")
try:
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=api_key,
    )
    res = llm.invoke([HumanMessage(content="Hello, are you working?")])
    print("SUCCESS: API is working!")
    print(res.content)
except Exception as e:
    print(f"ERROR: {e}")
