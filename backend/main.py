from langgraph.graph import StateGraph, START, END
from langchain.tools import tool
from langchain.messages import HumanMessage , SystemMessage , AIMessage 
from pydantic import BaseModel
from typing import TypedDict , Literal , List, Optional, Dict, Any
from langsmith import traceable
import os
import requests

class PitchAgentState(TypedDict):
    session_id: str
    startup_name: str
    sector: str
    stage: str
    funding_ask: int
    equity_offered: int
    pitch_text: str
    round_number: int
    max_rounds:int
    current_persona: str
    question_text: Optional[str]
    human_answer: Optional[str]
    claim_found: bool
    claim_text: Optional[str]
    search_query: Optional[str]
    fact_check_result: Optional[Dict[str, Any]]
    eval_scores: Optional[Dict[str, Any]]

@traceable(name="Tavily tool")
def search_web(query: str) -> str:
    """Executes live web search using Tavily API for claim verification."""
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return "Search API key not configured."
    
    response = requests.post(
        "https://api.tavily.com/search",
        json={"api_key": api_key, "query": query, "max_results": 4}
    )
    if response.status_code == 200:
        data = response.json()
        results = [f"{r['title']}: {r['content']} (URL: {r['url']})" for r in data.get("results", [])]
        return "\n".join(results)
    return "Failed to execute web search."

PERSONAS: List[str] = ["Skeptic", "Growth", "Product"]

PERSONA_STRATEGY: Dict[str, str] = {
    "Skeptic": (
        "Skeptical VC. Pokes at unit economics, revenue claims, and market-size "
        "numbers. Assumes the founder is overselling until proven otherwise."
    ),
    "Growth": (
        "Growth/hype investor. Focused on scale, distribution, and total "
        "addressable market. Wants to know how big this gets and how fast."
    ),
    "Product": (
        "Product/technical investor. Focused on defensibility, moat, and "
        "whether the product can actually be built and maintained."
    ),
}

@traceable(name="Turn Orchestrator")
def orchestrator_node(state: PitchAgentState) -> dict:
    """
    Decides which persona speaks next, or signals the session is over.
    Also resets the per-turn scratch fields so nothing leaks from the
    previous round into the next one.
    """
    session_over = state["round_number"] >= state["max_rounds"]

    if session_over:
        return {
            "current_persona": None,
            "question_text": None,
            "human_answer": None,
            "claim_found": False,
            "claim_text": None,
            "search_query": None,
            "fact_check_result": None,
            "eval_scores": None,
        }

    next_persona = PERSONAS[state["round_number"] % len(PERSONAS)]

    return {
        "current_persona": next_persona,
        "question_text": None,
        "human_answer": None,
        "claim_found": False,
        "claim_text": None,
        "search_query": None,
        "fact_check_result": None,
        "eval_scores": None,
    }


def route_from_orchestrator(state: PitchAgentState) -> Literal["persona_question_node", "session_report_node"]:
    """Conditional edge : reads what orchestrator_node just wrote to state."""
    if state["round_number"] >= state["max_rounds"]:
        return "session_report_node"
    return "persona_question_node"

def persona_question_node(state: PitchAgentState):
    


builder = StateGraph(PitchAgentState)

builder.add_node("orchestrator_node", orchestrator_node)
# builder.add_node("persona_question_node", persona_question_node)   
# builder.add_node("session_report_node", session_report_node)      

builder.add_edge(START, "orchestrator_node")
builder.add_conditional_edges(
    "orchestrator_node",
    route_from_orchestrator,
    {
        "persona_question_node": "persona_question_node",
        "session_report_node": "session_report_node",
    },
)
builder.add_edge("session_report_node", END)