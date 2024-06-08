from flask import Flask, render_template, request, session, redirect, url_for, flash, jsonify
from flask_cors import CORS
import google.generativeai as genai
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from urllib.parse import quote_plus
from flask_bcrypt import Bcrypt
from PIL import Image
from io import BytesIO
from datetime import timedelta
import uuid
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize Flask app and extensions
app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)

# Configuration
app.config['SECRET_KEY'] = 'buddhadev_das'  # Secret key for session security
app.config['SESSION_PERMANENT'] = True  # Make session permanent
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)  # Set session lifetime

# MongoDB setup
username = os.environ.get('MONGODB_USERNAME')  # Get MongoDB username from environment
password = os.environ.get('MONGODB_PASSWORD')  # Get MongoDB password from environment
encoded_username = quote_plus(username)
encoded_password = quote_plus(password)
# MongoDB URI with username and password
uri = f"mongodb+srv://{encoded_username}:{encoded_password}@cluster0.hsalqtk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(uri, server_api=ServerApi('1'))  # Connect to MongoDB cluster

try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)

db = client["information"]  # Get database
users_collection = db["users"]  # Get users collection

# Google GenAI setup
api_key = os.environ.get('API_KEY')  # Get Google API key from environment
genai.configure(api_key=api_key)  # Configure GenAI with API key
model = genai.GenerativeModel("gemini-pro")  # Initialize GenerativeModel instance
vision_model = genai.GenerativeModel("gemini-pro-vision")  # Initialize GenerativeModel instance for vision

# Store chat sessions in memory
chat_sessions = {}

# Helper functions
def initialize_chat_session():
    return {"chat_history": [], "chat": model.start_chat(history=[])}

def modified(text):
    return text.replace("Gemini", "Chathub").replace("Google", "Buddhadev")

def change_name(text):
    return text.replace("chathub", "gemini")

def save_message_to_collection(collection_name, user_message, assistant_message):
    username = session['user']['username']
    user_db_name = username.replace('.', '_').lower()
    user_db = client[user_db_name]
    message_collection = user_db[collection_name]
    document_to_add = {"user": user_message, "assistant": assistant_message}
    message_collection.insert_one(document_to_add)

# Routes
@app.route("/")
@app.route('/sign_up', methods=['GET', 'POST'])
def sign_up():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        if password != confirm_password:
            flash("Passwords do not match. Please try again.")
            return redirect(url_for('sign_up'))

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        if users_collection.find_one({"email": email}):
            flash("Email already signed up. Please use a different email.")
            return redirect(url_for('sign_up'))

        try:
            user_data = {"username": username, "email": email, "password": hashed_password}
            users_collection.insert_one(user_data)
            flash("Registration successful! Please log in.")
            return redirect(url_for('sign_in'))
        except Exception as e:
            flash("Error during registration. Please try again later.")
            print("Error:", e)

    return render_template('index.html')

@app.route('/sign_in', methods=['GET', 'POST'])
def sign_in():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        user = users_collection.find_one({"email": email})
        if user and bcrypt.check_password_hash(user['password'], password):
            session.permanent = True
            session['user'] = {'username': user['username'], 'email': user['email']}
            flash("Sign in successful!")
            return redirect(url_for('conversation'))
        else:
            flash("Sign in failed. Check your email and password.")
    return render_template('index.html')

@app.route('/sign-out')
def sign_out():
    session.pop('user', None)
    session.pop('default_collection_name', None)
    session.permanent = False
    flash("Sign out successful")
    return redirect(url_for('sign_up'))

@app.route('/conversation')
def conversation():
    if 'user' in session:
        chat_session_id = session.get("chat_session_id")
        if not chat_session_id or chat_session_id not in chat_sessions:
            chat_session_id = str(len(chat_sessions) + 1)
            chat_sessions[chat_session_id] = initialize_chat_session()
            session["chat_session_id"] = chat_session_id

        username = session['user']['username']
        user_db_name = username.replace('.', '_').lower()
        user_db = client[user_db_name]
        user_collection_names = user_db.list_collection_names()
        chat_session = chat_sessions.get(chat_session_id, {})
        current_collection_name = session.get("default_collection_name")
        return render_template("conversation.html", chat_history=chat_session.get("chat_history", []), username=username, collection_names=user_collection_names, current_collection_name=current_collection_name)
    else:
        return redirect(url_for('sign_in'))

@app.route('/send_message', methods=["POST"])
def send_message():
    chat_session_id = session.get("chat_session_id")
    if not chat_session_id or chat_session_id not in chat_sessions:
        return "Chat session not found", 404

    chat_session = chat_sessions[chat_session_id]
    user_input = request.form.get("prompt", "")
    prompt = change_name(user_input)
    collection_name = session.get("default_collection_name")

    if not collection_name:
        username = session['user']['username']
        user_db_name = username.replace('.', '_').lower()
        user_db = client[user_db_name]
        unique_id = str(uuid.uuid4())[:4]
        new_collection_name = f"{prompt.replace(' ', '_')}_{unique_id}"
        user_db.create_collection(new_collection_name)
        session["default_collection_name"] = new_collection_name
        collection_name = new_collection_name

    image_file = request.files.get("file")
    if image_file:
        img_bytes = image_file.read()
        img = Image.open(BytesIO(img_bytes))

        response = vision_model.generate_content([prompt, img]) if prompt else vision_model.generate_content(img)
        assistant_response = modified(response.text)
        chat_session["chat_history"].append(("assistant", assistant_response))
        save_message_to_collection(collection_name, prompt, assistant_response)
        return jsonify({"response": assistant_response})
    else:
        chat_session["chat_history"].append(("user", prompt))
        response = chat_session["chat"].send_message(prompt)
        assistant_response = modified(response.text)
        chat_session["chat_history"].append(("assistant", assistant_response))
        save_message_to_collection(collection_name, prompt, assistant_response)
        return jsonify({"response": assistant_response})

@app.route('/create_new_collection', methods=['POST'])
def create_new_collection():
    if 'default_collection_name' in session:
        session.pop('default_collection_name')
        return jsonify({"success": True})
    else:
        return jsonify({"error": "No default collection to remove"}), 400

@app.route('/collection/<collection_name>')
def get_collection_data(collection_name):
    if 'user' in session:
        session["default_collection_name"] = collection_name
        username = session['user']['username']
        user_db_name = username.replace('.', '_').lower()
        user_db = client[user_db_name]
        collection = user_db[collection_name]
        documents = collection.find({}, {"_id": 0, "user": 1, "assistant": 1})
        documents_list = list(documents)
        return jsonify(documents_list)
    else:
        return "User not logged in", 401

@app.route('/delete_collection', methods=['POST'])
def delete_collection():
    if 'user' in session:
        username = session['user']['username']
        user_db_name = username.replace('.', '_').lower()
        user_db = client[user_db_name]
        collection_name = request.form['collection_name']

        try:
            session.pop('default_collection_name', None)
            user_db[collection_name].drop()
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})
    else:
        return "User not logged in", 401

@app.route("/reset_password", methods=["GET", "POST"])
def reset_password():
    if request.method == "POST":
        email = request.form.get("email")
        new_password = request.form.get("new_password")
        confirm_password = request.form.get("confirm_password")

        if new_password != confirm_password:
            flash("Passwords do not match. Please try again.")
            return redirect(url_for("reset_password"))

        user = users_collection.find_one({"email": email})
        if user:
            hashed_password = bcrypt.generate_password_hash(new_password).decode("utf-8")
            users_collection.update_one({"email": email}, {"$set": {"password": hashed_password}})
            flash("Password reset successful. You can now sign in with your new password.")
            return redirect(url_for("sign_in"))
        else:
            flash("Email not found. Please try again.")
            return redirect(url_for("reset_password"))

    return render_template("reset_password.html")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)