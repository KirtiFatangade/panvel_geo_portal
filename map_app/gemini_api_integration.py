import google.generativeai as genai
import os
import textwrap
from IPython.display import Markdown
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if api_key:
    genai.configure(api_key=api_key)
MODEL = genai.GenerativeModel("gemini-pro")
CHAT = MODEL.start_chat(history=[])





def to_markdown(text):
    text = text.replace("•", " *")
    return Markdown(textwrap.indent(text, "> ", predicate=lambda _: True))


def chatbot(prompt):
    response = CHAT.send_message(prompt, stream=True)
    final_output = ""
    for chunk in response:
        final_output += chunk.text
    to_markdown(final_output)
    return final_output


if __name__ == "__main__":
    prompt = "why vector data is important?"
    response = chatbot(prompt)
    print(response)
