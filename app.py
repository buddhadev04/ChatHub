from flask import Flask, render_template, request, session, redirect, url_for, flash, jsonify
import google.generativeai as genai
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from urllib.parse import quote_plus
from flask_bcrypt import Bcrypt
from PIL import Image
from io import BytesIO
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
bcrypt = Bcrypt(app)

username = os.environ.get('MONGODB_USERNAME')
password = os.environ.get('MONGODB_PASSWORD')

encoded_username = quote_plus(username)
encoded_password = quote_plus(password)

# MongoDB setup
uri = f"mongodb+srv://{encoded_username}:{encoded_password}@cluster0.hsalqtk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
# Create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))
# Send a ping to confirm a successful connection
try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)

db = client["information"]  # Database
users_collection = db["users"]  # Collection for storing user information

# Secret key for session security
app.config['SECRET_KEY'] = 'buddhadev_das'

# Store chat sessions in memory using a dictionary
chat_sessions = {}
# get the api key
api_key = os.environ.get('API_KEY')

genai.configure(api_key=api_key)
# for text
model = genai.GenerativeModel("gemini-pro")
# for image
vision_model = genai.GenerativeModel("gemini-pro-vision")

# sign up route
@app.route("/")
@app.route('/sign_up', methods=['GET', 'POST'])
def sign_up():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        # Check if password and confirm password match
        if password != confirm_password:
            flash("Passwords do not match. Please try again.")
            return redirect(url_for('sign_up'))

        # Hash the password
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        # Check if the email already exists
        if users_collection.find_one({"email": email}):
            flash("Email already signed up. Please use a different email.")
            return redirect(url_for('sign_up'))

        try:
            # Insert user data into the main 'users' collection
            user_data = {"username": username, "email": email, "password": hashed_password}
            users_collection.insert_one(user_data)
            flash("Registration successful! Please log in.")
            return redirect(url_for('sign_in'))
        except Exception as e:
            flash("Error during registration. Please try again later.")
            print("Error:", e)  # Print the error for debugging purposes

    return render_template('index.html')

# sign in route
@app.route('/sign_in', methods=['GET', 'POST'])
def sign_in():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        # Check if the user exists and the password is correct
        user = users_collection.find_one({"email": email})
        if user and bcrypt.check_password_hash(user['password'], password):
            session['user'] = {'username': user['username'], 'email': user['email']}
            
            # Create a new database for the user based on their username if not exists
            user_db_name = user['username'].replace('.', '_').lower()
            if user_db_name not in client.list_database_names():
                user_db = client[user_db_name]
                # Create a new collection with a name based on the current timestamp
                new_collection_name = f"File_{datetime.now().strftime('%d-%m-%y_%H-%M')}"
                user_db.create_collection(new_collection_name)
                # Set the default collection name to the newly created collection
                session["default_collection_name"] = new_collection_name
                
                print("User database created:", user_db_name)
                print("Default collection set:", new_collection_name)
            else:
                print("User database already exists.")
                
            # Check if the default collection name exists in the session
            if 'default_collection_name' not in session:
                # Set the default collection name to a new collection if not exists
                user_db = client[user_db_name]
                new_collection_name = f"File_{datetime.now().strftime('%d-%m-%y_%H-%M')}"
                user_db.create_collection(new_collection_name)
                session["default_collection_name"] = new_collection_name
                print("Default collection set:", new_collection_name)
                
            flash("sign_in successful!")
            return redirect(url_for('home'))
        else:
            flash("sign_in failed. Check your email and password.")
    return render_template('index.html')


# Logout route
@app.route('/sign-out')
def sign_out():
    session.pop('user', None)
    session.pop('default_collection_name', None)
    flash("Sign Out successfull")
    return redirect(url_for('sign_up'))

# home route
@app.route('/home')
def home():
    if 'user' in session:
        username = session['user']['username']
         # Get the name of the user's database
        user_db_name = username.replace('.', '_').lower()  # Replace '.' with '_' in the email for MongoDB compatibility
        # Connect to the user's database
        user_db = client[user_db_name]
        # Fetch the list of collections from the user's database
        user_collection_names = user_db.list_collection_names()
        return render_template('home.html', username=username, collection_names=user_collection_names)
    else:
        return redirect(url_for('sign_in'))

# chat session
def initialize_chat_session():
    return {
        "chat_history": [],
        "chat": model.start_chat(history=[])
    }

# route to handle conversation
@app.route('/conversation')
def conversation():
    if 'user' in session:
        chat_session_id = session.get("chat_session_id")
        if not chat_session_id or chat_session_id not in chat_sessions:
            chat_session_id = str(len(chat_sessions) + 1)
            chat_sessions[chat_session_id] = initialize_chat_session()  # Initialize regular chat session
            session["chat_session_id"] = chat_session_id
        
        username = session['user']['username']
        # Create a new collection for the user's chat messages (using a timestamp as collection name)
        user_db_name = username.replace('.', '_').lower()  # Replace '.' with '_' in the email for MongoDB compatibility
        
        # Connect to the user's database
        user_db = client[user_db_name]

        user_collection_names = user_db.list_collection_names()
        chat_session = chat_sessions.get(chat_session_id, {})
        current_collection_name = session.get("default_collection_name")
        return render_template("conversation.html", chat_history=chat_session.get("chat_history", []), username=username, collection_names=user_collection_names, current_collection_name=current_collection_name)

    else:
        return redirect(url_for('sign_in'))

# modifing the response
def modified(text):
    return text.replace("Gemini", "Chathub").replace("Google", "Buddhadev")

# modifing the message
def changeName(text):
    return text.replace("chathub", "gemini")

# route to handle responses
@app.route('/send_message', methods=["POST"])
def send_message():
    chat_session_id = session.get("chat_session_id")
    if not chat_session_id or chat_session_id not in chat_sessions:
        return "Chat session not found", 404

    chat_session = chat_sessions[chat_session_id]
    user_input = request.form["prompt"]
    assistant = ""
    collection_name = session.get("default_collection_name")
    print(collection_name)
    prompt = changeName(user_input)
    if prompt.lower() != "start":
        # Check if an image file is uploaded
        image_file = request.files.get("file")
        if image_file:
            img_bytes = image_file.read()
            img = Image.open(BytesIO(img_bytes))

            if prompt != "":
                response = vision_model.generate_content([changeName(prompt), img])
            else:
                response = vision_model.generate_content(img)
            
            assistant = response.text
            # Save the response into the chat session
            chat_session["chat_history"].append(("assistant", response.text))
            # Save the message to the appropriate collection
            save_message_to_collection(collection_name, prompt, assistant)
            # Return the response text for updating the UI
            return jsonify({"response": response.text})

        else:
            chat_session["chat_history"].append(("user", prompt))
            response = chat_session["chat"].send_message(prompt)
            assistant_response = modified(response.text)
            print(assistant_response)
            chat_session["chat_history"].append(("assistant", assistant_response))
            # Save the message to the appropriate collection
            save_message_to_collection(collection_name, prompt, assistant_response)
        
        # Return the response text for updating the UI
        return jsonify({"response": assistant_response})
    else:
        return jsonify({"response": ""})

# Function to save message to a collection
def save_message_to_collection(collection_name, user_message, assistant_message):
    username = session['user']['username']
    user_db_name = username.replace('.', '_').lower()
    user_db = client[user_db_name]
    message_collection = user_db[collection_name]
    document_to_add = {"user": user_message, "assistant": assistant_message}
    message_collection.insert_one(document_to_add)

# rotue to get data from collection
@app.route('/collection/<collection_name>')
def get_collection_data(collection_name):
    if 'user' in session:
        # collection_name = collection_name.replace('/', '_')  # Replace underscores with slashes
        print(collection_name)
        session["default_collection_name"] = collection_name
        username = session['user']['username']
        user_db_name = username.replace('.', '_').lower()
        user_db = client[user_db_name]
        # Retrieve documents from the specified collection in the user's database
        collection = user_db[collection_name]
        documents = collection.find({}, {"_id": 0, "user": 1, "assistant": 1})  # Only fetch user and assistant fields
        
        # Convert documents to list of dictionaries
        documents_list = [doc for doc in documents]
        for doc in documents_list:
            print(doc)
        
        return jsonify(documents_list)
    else:
        return "User not logged in", 401
    
# route to create new collection
@app.route('/create_collection', methods=['POST'])
def create_collection():
    if 'user' in session:
        username = session['user']['username']
        user_db_name = username.replace('.', '_').lower()
        user_db = client[user_db_name]
        user_collection_names = user_db.list_collection_names()
        new_collection_name = f"File_{datetime.now().strftime('%d-%m-%y_%H-%M')}"
        print(new_collection_name)
        # Check if the collection already exists
        if new_collection_name in user_db.list_collection_names():
        # Collection already exists, return an error message
            return jsonify({"error": "A collection with the same name already exists. Please wait for one minute before creating a new collection."}), 400
        user_db.create_collection(new_collection_name)  # Create an empty collection
        # Set the default collection name to the newly created collection
        session["default_collection_name"] = new_collection_name
        return jsonify({"collection_name": new_collection_name}), 200
    else:
        return "User not logged in", 401
    
# route to delete a collection
@app.route('/delete_collection', methods=['POST'])
def delete_collection():
    if 'user' in session:
        username = session['user']['username']
         # Get the name of the user's database
        user_db_name = username.replace('.', '_').lower()  # Replace '.' with '_' in the email for MongoDB compatibility
        user_db = client[user_db_name]
        
        # Fetch the collection name from the input
        collection_name = request.form['collection_name']
        print(collection_name)
    try:
        # Delete the collection
        user_db[collection_name].drop()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# route for forgot password
@app.route("/reset_password", methods=["GET", "POST"])
def reset_password():
    if request.method == "POST":
        email = request.form.get("email")
        new_password = request.form.get("new_password")
        confirm_password = request.form.get("confirm_password")
        
        # Check if the new password and confirm password match
        if new_password != confirm_password:
            flash("Passwords do not match. Please try again.")
            return redirect(url_for("reset_password"))

        # Retrieve the user from the database
        user = users_collection.find_one({"email": email})
        if user:
            # Update the user's password with the new password
            hashed_password = bcrypt.generate_password_hash(new_password).decode("utf-8")
            print(user["email"])
            users_collection.update_one({"email": email}, {"$set": {"password": hashed_password}})
            flash("Password reset successful. You can now sign in with your new password.")
            return redirect(url_for("sign_in"))  # Redirect to sign in page
        else:
            flash("Email not found. Please try again.")
            return redirect(url_for("reset_password"))

    return render_template("reset_password.html")


if __name__ == '__main__':
    app.run(debug = True)
