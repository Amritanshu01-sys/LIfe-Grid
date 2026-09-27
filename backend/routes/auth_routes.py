from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import get_db
from models.all_models import User
from schemas.all_schemas import UserCreate, UserLogin, UserResponse, TokenResponse
from auth.jwt_handler import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered"
        )
    
    hashed = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed,
        role=user_data.role,
        full_name=user_data.full_name,
        phone=user_data.phone
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.username, "role": user.role, "uid": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.email == login_data.username_or_email) | (User.username == login_data.username_or_email)
    ).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    token = create_access_token({"sub": user.username, "role": user.role, "uid": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/token", response_model=TokenResponse)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == form_data.username) | (User.email == form_data.username)
    ).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    token = create_access_token({"sub": user.username, "role": user.role, "uid": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/demo-persona", response_model=TokenResponse)
def quick_demo_persona(role: str, db: Session = Depends(get_db)):
    """
    Convenient SIH Demo Switcher:
    Immediately returns an authentic JWT token and persona for any chosen role:
    patient, family, admin, ambulance, doctor, hospital, traffic, bloodbank.
    """
    user = db.query(User).filter(User.role == role.lower()).first()
    if not user:
        # Fallback to any user or create one
        user = db.query(User).first()
        if not user:
            raise HTTPException(status_code=404, detail="No demo users available. Please seed database.")
    
    token = create_access_token({"sub": user.username, "role": user.role, "uid": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user
