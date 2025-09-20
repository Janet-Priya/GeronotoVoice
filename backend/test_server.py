#!/usr/bin/env python3
"""
Simple test server to verify the setup works
"""

from fastapi import FastAPI
import uvicorn

app = FastAPI(title="Test Server")

@app.get("/")
async def root():
    return {"message": "Test server is running!"}

@app.get("/health")
async def health():
    return {"status": "healthy", "message": "Test server is working"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
