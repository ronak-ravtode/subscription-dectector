from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./subscription_detector.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # SQLite migrations: add columns that may be missing from existing tables
    from sqlalchemy import text, inspect
    with engine.connect() as conn:
        inspector = inspect(conn)
        tables = inspector.get_table_names()
        
        if "users" in tables:
            columns = [col["name"] for col in inspector.get_columns("users")]
            if "forwarding_address" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN forwarding_address VARCHAR"))
                conn.commit()
        
        if "analyses" in tables:
            columns = [col["name"] for col in inspector.get_columns("analyses")]
            if "ai_summary" not in columns:
                conn.execute(text("ALTER TABLE analyses ADD COLUMN ai_summary TEXT"))
                conn.commit()

        # SMS support migrations
        if "users" in tables:
            columns = [col["name"] for col in inspector.get_columns("users")]
            if "phone_number" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN phone_number VARCHAR"))
                conn.commit()
            if "sms_forwarding_enabled" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN sms_forwarding_enabled BOOLEAN DEFAULT FALSE"))
                conn.commit()
