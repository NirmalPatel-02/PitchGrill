import os
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI

GROQ_FAST_MODEL = "llama-3.1-8b-instant"      
GROQ_REASONING_MODEL = "llama-3.3-70b-versatile"
GEMINI_PRIMARY_MODEL = "gemini-2.0-flash"   

groq_fast_llm = ChatGroq(
    model=GROQ_FAST_MODEL,
    temperature=0.0,
    groq_api_key=os.getenv("GROQ_API_KEY", "")
)

gemini_llm = ChatGoogleGenerativeAI(
    model=GEMINI_PRIMARY_MODEL,
    temperature=0.2,
    google_api_key=os.getenv("GEMINI_API_KEY", "")
)

groq_reasoning_llm = ChatGroq(
    model=GROQ_REASONING_MODEL,
    temperature=0.1,
    groq_api_key=os.getenv("GROQ_API_KEY", "")
)