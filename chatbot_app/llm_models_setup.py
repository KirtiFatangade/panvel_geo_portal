from llama_index.core import Settings
from langchain_google_genai import GoogleGenerativeAI
import google.generativeai as genai
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
import os
import psycopg2

api_key = os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

gemini_llm = GoogleGenerativeAI(
    model="gemini-1.5-flash",
    temperature=0.2,
    max_retries=3,
    timeout=None,
)
Settings.llm = gemini_llm

hf_embed_model = HuggingFaceEmbedding(
    model_name="BAAI/bge-large-en",
    trust_remote_code=True,
    cache_folder="./hf_cache",
)
Settings.embed_model = hf_embed_model

memory = ChatMemoryBuffer.from_defaults()

username = os.getenv("PROD_DB_USER")
password = os.getenv("PROD_DB_PASS")
host = os.getenv("PROD_DB_HOST")
port = os.getenv("PROD_DB_PORT")
database = os.getenv("PROD_DB_DB")

connection_uri = f"postgresql://{username}:{password}@{host}:{port}/{database}"
conn = psycopg2.connect(connection_uri)
conn.autocommit = True
