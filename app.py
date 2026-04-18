# =============================================
#  AI Career Guidance Chatbot – app.py
#  Flask Backend with Google Gemini Integration
#  + User Preference-Aware Conversations
# =============================================

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)


# ── Configure Gemini ───────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


# ── Build dynamic system prompt from user preferences ──
def build_system_prompt(preferences: dict) -> str:
    """
    Creates a personalised system prompt by injecting the user's
    preferences (name, education, interests, career domain).
    """
    base = (
        "You are an expert AI Career Guidance Assistant.\n\n"
        "When a user asks about interests or careers, respond in this structured format:\n"
        "1. Suggested Career Options (2-3)\n"
        "2. Required Skills\n"
        "3. Step-by-Step Roadmap\n"
        "4. Recommended Tools or Courses\n\n"
        "Keep answers clear, concise, and student-friendly. "
        "Limit your response to 6-8 lines total strictly.\n\n"
    )

    if preferences:
        name      = preferences.get("name", "").strip()
        education = preferences.get("education", "").strip()
        interests = preferences.get("interests", "").strip()
        domain    = preferences.get("domain", "").strip()

        personal = "--- User Profile ---\n"
        if name:
            personal += f"Name: {name}\n"
        if education:
            personal += f"Education Level: {education}\n"
        if interests:
            personal += f"Interests / Skills: {interests}\n"
        if domain:
            personal += f"Preferred Career Domain: {domain}\n"

        personal += (
            "\nTailor ALL your career advice specifically to this user's "
            "education level, interests, and preferred domain. "
            "Reference their background when giving suggestions.\n"
        )
        base += personal

    return base


# ── Serve Frontend Files ───────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.route('/')
def index():
    """Serve the chatbot frontend at http://127.0.0.1:5000"""
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    """Serve static files like style.css and script.js"""
    return send_from_directory(BASE_DIR, filename)


# ── /chat API Endpoint (preference-aware + history) ────
@app.route('/chat', methods=['POST'])
def chat():
    """
    Accepts: POST JSON {
      "message":     "user text here",
      "preferences": { "name": "...", "education": "...", "interests": "...", "domain": "..." },
      "history":     [ { "role": "user/assistant", "content": "..." }, ... ]
    }
    Returns: JSON { "reply": "AI-generated response" }
    """
    data = request.get_json()

    # Validate input
    if not data or 'message' not in data:
        return jsonify({"error": "Please provide a 'message' field in the JSON body."}), 400

    user_message = data['message'].strip()

    if not user_message:
        return jsonify({"error": "Message cannot be empty."}), 400

    # Extract optional preferences and history
    preferences = data.get('preferences', {})
    history     = data.get('history', [])

    # Basic greeting – ask follow-up for very short input
    lower_msg = user_message.lower()
    if lower_msg in ["help", "hi", "hello", "hey", "start", "career"]:
        name = preferences.get("name", "").strip() if preferences else ""
        greeting = f"Hello{', ' + name if name else ''}! "
        greeting += "Can you tell me a bit about your interests, favorite subjects, or skills?"
        return jsonify({"reply": greeting})

    # Check API key is set
    if not GEMINI_API_KEY:
        return jsonify({
            "reply": "Gemini API key is not configured. Please add it to your .env file."
        }), 500

    try:
        # ── Create Gemini model ──────────────────
        model = genai.GenerativeModel('gemini-2.5-flash')

        # ── Build personalised system prompt ──────
        system_prompt = build_system_prompt(preferences)

        # ── Assemble conversation history ─────────
        # Convert history to Gemini format
        gemini_history = []
        if history and isinstance(history, list):
            for msg in history[-20:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if content:
                    # Gemini uses "user" and "model" (not "assistant")
                    gemini_role = "model" if role == "assistant" else "user"
                    gemini_history.append({
                        "role": gemini_role,
                        "parts": [content]
                    })

        # ── Build the full prompt with system context ──
        full_prompt = f"{system_prompt}\n\nUser question: {user_message}"

        # ── Call Gemini API ──────────────────────
        if gemini_history:
            chat_session = model.start_chat(history=gemini_history)
            response = chat_session.send_message(full_prompt)
        else:
            response = model.generate_content(full_prompt)

        reply = response.text.strip()
        return jsonify({"reply": reply})

    except Exception as e:
        print(f"[ERROR] Gemini API call failed: {type(e).__name__}: {e}")
        return jsonify({
            "reply": "Sorry, I'm having trouble connecting to the AI service right now. "
                     "Please check your API key or try again in a moment."
        }), 500


# ── Run the Flask App ──────────────────────────
if __name__ == '__main__':
    print("[OK] Career Chatbot Backend running at http://127.0.0.1:5000")
    print("[OK] Endpoint: POST http://127.0.0.1:5000/chat")
    app.run(debug=True, port=5000)
