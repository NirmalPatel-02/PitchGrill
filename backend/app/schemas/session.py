from pydantic import BaseModel , Field
from typing import Optional, List, Any , Literal 
from datetime import datetime

Sector = Literal["SaaS", "Marketplace", "D2C", "Fintech","B2B" ,"Healthtech", "Hardware", "Other"]
Stage = Literal["Idea", "MVP", "Early Revenue", "Growth"]

class SessionCreate(BaseModel):
    startup_name: str
    sector: Sector
    stage: Stage
    funding_ask: float = Field(..., gt=0)
    equity_offered: Optional[float] = Field(None, ge=0, le=100)
    pitch_text: str
    max_rounds: Optional[int] = Field(6, ge=2, le=10)

class AnswerSubmit(BaseModel):
    answer: str

class TurnResponse(BaseModel):
    turn_id: str
    round_number: int
    persona: str
    question_text: str
    human_answer: Optional[str] = None
    eval_scores: Optional[dict] = None
    fact_check: Optional[dict] = None

class ReportResponse(BaseModel):
    panel_verdict: str
    would_invest: str
    avg_specificity: float
    avg_evidence: float
    avg_clarity: float
    strengths: List[str]
    concerns: List[str]
    fact_check_log: Optional[List[Any]] = None

class SessionResponse(BaseModel):
    session_id: str
    user_id: str
    startup_name: str
    sector: str
    stage: str
    funding_ask: float
    equity_offered: Optional[float]
    pitch_text: str
    current_round: int
    max_rounds: int
    status: str
    created_at: datetime
    turns: List[TurnResponse] = []
    report: Optional[ReportResponse] = None

    class Config:
        from_attributes = True

class SessionListItem(BaseModel):
    session_id: str
    startup_name: str
    sector: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True