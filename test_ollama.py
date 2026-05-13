import os
from crewai import LLM

llm = LLM(
    model="ollama/gemma4:e2b",
    base_url="http://172.31.192.1:11434",
    extra_body={"options": {"num_ctx": 32768}}
)

messages = [{"role": "user", "content": "Répète le mot test"}]
try:
    response = llm.call(messages)
    print("SUCCESS:", response)
except Exception as e:
    print("ERROR:", e)
