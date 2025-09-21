import requests
import json

# Test the simulate endpoint
url = "http://localhost:8001/simulate"
data = {
    "user_id": "test",
    "persona_id": "margaret",
    "user_input": "Hello, how are you today?",
    "conversation_history": []
}

response = requests.post(url, json=data)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.json()}")