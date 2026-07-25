import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_register_success():
    response = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "securepassword123"
    })
    assert response.status_code == 201
    assert "user_id" in response.json()

def test_register_invalid_email():
    response = client.post("/api/auth/register", json={
        "email": "invalid-email",
        "password": "securepassword123"
    })
    assert response.status_code == 400

def test_register_short_password():
    response = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "short"
    })
    assert response.status_code == 400

def test_register_duplicate_email():
    client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "securepassword123"
    })
    response = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "anotherpassword"
    })
    assert response.status_code == 409

def test_login_success():
    client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "securepassword123"
    })
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "securepassword123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_invalid_credentials():
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_protected_endpoint_no_token():
    response = client.get("/api/auth/me")
    assert response.status_code == 401

def test_protected_endpoint_with_token():
    client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "securepassword123"
    })
    login_response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "securepassword123"
    })
    token = login_response.json()["access_token"]
    
    response = client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"
