from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.analysis_service import list_templates

router = APIRouter(prefix="/templates", tags=["模板"])


@router.get("", summary="获取模板列表")
def get_templates(db: Session = Depends(get_db)):
    return list_templates(db)
