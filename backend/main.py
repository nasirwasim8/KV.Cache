"""
DDN KV Cache Observatory — FastAPI Backend
Port: 8002 (isolated from VSS:8001 and RAG:8000)
"""
import warnings
import urllib3
warnings.filterwarnings("ignore")
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import (
    health_router, config_router, chat_router, prefix_router, cache_router
)

app = FastAPI(
    title="DDN KV Cache Observatory API",
    description="Live KV Cache demo: DDN Infinia Object Store as KV Cache backend",
    version="1.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(config_router, prefix="/api")
app.include_router(chat_router,   prefix="/api")
app.include_router(prefix_router, prefix="/api")
app.include_router(cache_router,  prefix="/api")


@app.get("/")
async def root():
    return {"name": "DDN KV Cache Observatory", "version": "1.0.0", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
