from decimal import Decimal
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, ConfigDict

Sector = Literal["SaaS", "Marketplace", "D2C", "Fintech", "Healthtech", "Hardware", "Other"]
Stage = Literal["Idea", "MVP", "Early Revenue", "Growth"]

class SessionCreate(BaseModel):
    startup_name: str = Field(..., min_length=1, max_length=150)
    sector: Sector
    stage: Stage
    funding_ask: Decimal = Field(..., gt=0)
    equity_offered: Optional[Decimal] = Field(None, ge=0, le=100)
    pitch_text: str = Field(..., min_length=20, max_length=5000)

class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    startup_name: str
    sector: str
    stage: str
    funding_ask: Decimal
    equity_offered: Optional[Decimal]
    pitch_text: str
    current_round: int
    status: str
    created_at: datetime

class SessionListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    startup_name: str
    sector: str
    status: str
    current_round: int
    created_at: datetime