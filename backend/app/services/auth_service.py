from datetime import datetime, timedelta, timezone
from hashlib import pbkdf2_hmac
from secrets import token_hex, token_urlsafe
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.db_models import (
    AuditLogModel,
    AuthAccountModel,
    OrganizationMemberModel,
    OrganizationModel,
    SessionTokenModel,
    SubscriptionModel,
    UserModel
)
from app.schemas.account import AuthLoginRequest, AuthRegisterRequest, DemoLoginRecord
from app.services.repository import repository


DEMO_PASSWORD = "Demo12345!"


def bootstrap_auth_data(db: Session) -> None:
    demo_users = [user for user in repository.list_users(db) if user.id.startswith("demo-")]
    accounts: list[AuthAccountModel] = []

    for user in demo_users:
        password_hash, salt = create_password_hash(DEMO_PASSWORD)
        accounts.append(
            AuthAccountModel(
                user_id=user.id,
                email=user.email,
                password_hash=password_hash,
                password_salt=salt,
                auth_mode="demo",
                status="active"
            )
        )

    repository.upsert_auth_accounts(db, accounts)


def create_password_hash(password: str) -> tuple[str, str]:
    salt = token_hex(16)
    digest = pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        240000
    ).hex()
    return digest, salt


def verify_password(password: str, password_hash: str, password_salt: str) -> bool:
    digest = pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        password_salt.encode("utf-8"),
        240000
    ).hex()
    return digest == password_hash


def list_demo_logins(db: Session) -> list[DemoLoginRecord]:
    if not settings.enable_demo_auth:
        return []

    records: list[DemoLoginRecord] = []
    for user in repository.list_users(db):
        if user.id != "demo-admin":
            continue
        plan = repository.get_plan(db, user.plan_id)
        plan_name = plan.name if plan is not None else "未知套餐"
        records.append(
            DemoLoginRecord(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role,
                company=user.company,
                password_hint=DEMO_PASSWORD,
                plan_name=plan_name
            )
        )
    return records


def register_user(db: Session, payload: AuthRegisterRequest) -> tuple[UserModel, SessionTokenModel]:
    email = payload.email.lower()
    if repository.get_user_by_email(db, email) is not None:
        raise ValueError("该邮箱已注册")
    if repository.get_auth_account_by_email(db, email) is not None:
        raise ValueError("该邮箱已注册")

    user = repository.create_user(
        db,
        UserModel(
            id=f"user-{uuid4().hex[:10]}",
            name=payload.name,
            email=email,
            company=payload.company,
            role="user",
            plan_id="plan-free",
            monthly_analysis_usage=0,
            last_usage_reset_at=datetime.now(timezone.utc),
            last_active_at=datetime.now(timezone.utc)
        )
    )

    password_hash, salt = create_password_hash(payload.password)
    repository.create_auth_account(
        db,
        AuthAccountModel(
            user_id=user.id,
            email=email,
            password_hash=password_hash,
            password_salt=salt,
            auth_mode="password",
            status="active"
        )
    )

    organization_name = payload.organization_name.strip() or f"Super OS 空间 · {payload.name}"
    organization = repository.create_organization(
        db,
        OrganizationModel(
            id=f"org-{uuid4().hex[:10]}",
            name=organization_name,
            slug=slugify(f"{organization_name}-{user.id[-4:]}"),
            owner_user_id=user.id
        )
    )
    repository.create_organization_member(
        db,
        OrganizationMemberModel(
            id=f"member-{uuid4().hex[:10]}",
            organization_id=organization.id,
            user_id=user.id,
            role="owner"
        )
    )
    repository.create_or_replace_subscription(
        db,
        SubscriptionModel(
            id=f"subscription-{uuid4().hex[:10]}",
            organization_id=organization.id,
            plan_id="plan-free",
            billing_cycle="monthly",
            status="active",
            amount=0,
            currency="CNY",
            provider="manual",
            cancel_at_period_end=False,
            current_period_start=datetime.now(timezone.utc),
            current_period_end=datetime.now(timezone.utc) + timedelta(days=30)
        )
    )
    repository.create_audit_log(
        db,
        AuditLogModel(
            id=f"audit-{uuid4().hex[:10]}",
            actor_user_id=user.id,
            organization_id=organization.id,
            action="auth.register",
            entity_type="user",
            entity_id=user.id,
            summary=f"{user.name} 注册并创建组织 {organization.name}",
            metadata_payload={"email": user.email}
        )
    )
    session_token = _issue_session_token(db, user.id)
    return user, session_token


def login_user(db: Session, payload: AuthLoginRequest) -> tuple[UserModel, SessionTokenModel]:
    account = repository.get_auth_account_by_email(db, payload.email)
    if account is None or account.status != "active":
        raise ValueError("账号不存在或已停用")
    if not verify_password(payload.password, account.password_hash, account.password_salt):
        raise ValueError("邮箱或密码错误")

    user = repository.get_user(db, account.user_id)
    if user is None:
        raise ValueError("账号数据不完整")

    user.last_active_at = datetime.now(timezone.utc)
    db.commit()
    session_token = _issue_session_token(db, user.id)
    return user, session_token


def logout_user(db: Session, token: str) -> None:
    session_token = repository.get_session_token(db, token)
    if session_token is None:
        return
    if session_token.revoked_at is not None:
        return
    repository.revoke_session_token(db, session_token)


def get_user_by_session_token(db: Session, token: str) -> UserModel | None:
    if not token:
        return None

    session_token = repository.get_session_token(db, token)
    if session_token is None:
        return None
    if session_token.revoked_at is not None:
        return None
    if _to_utc(session_token.expires_at) <= datetime.now(timezone.utc):
        return None

    return repository.get_user(db, session_token.user_id)


def _issue_session_token(db: Session, user_id: str) -> SessionTokenModel:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.session_expiration_hours)
    return repository.create_session_token(
        db,
        SessionTokenModel(
            id=token_urlsafe(32),
            user_id=user_id,
            expires_at=expires_at
        )
    )


def slugify(value: str) -> str:
    clean = "".join(char.lower() if char.isalnum() else "-" for char in value)
    while "--" in clean:
        clean = clean.replace("--", "-")
    return clean.strip("-") or f"org-{token_hex(4)}"


def _to_utc(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)
