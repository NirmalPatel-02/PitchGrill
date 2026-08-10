from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import MemorySaver
from pydantic import BaseModel, Field
from typing import TypedDict, Literal, List, Optional, Dict, Any
from langsmith import traceable
import os
import random
import requests
from app.agents.llm import question_check_llm, claim_eval_llm
from langchain_core.prompts import PromptTemplate
import sqlite3
from langgraph.checkpoint.sqlite import SqliteSaver

class PitchAgentState(TypedDict):
    session_id: str
    startup_name: str
    sector: str
    stage: str
    funding_ask: int
    equity_offered: int
    pitch_text: str
    round_number: int
    max_rounds: int
    current_persona: Optional[str]
    question_text: Optional[str]
    human_answer: Optional[str]
    claim_found: bool
    claim_text: Optional[str]
    search_query: Optional[str]
    fact_check_result: Optional[Dict[str, Any]]
    eval_scores: Optional[Dict[str, Any]]
    transcript: List[Dict[str, Any]]
    final_report: Optional[Dict[str, Any]]

class ClaimCheck(BaseModel):
    claim_found: bool = Field(..., description="True only if the answer contains a specific, checkable factual claim "
                                          "(a number, statistic, or named comparison) - not an opinion or a vision statement.")
    claim_text: Optional[str] = Field(None, description="The exact checkable claim, paraphrased short. Null if claim_found is false.")
    search_query: Optional[str] = Field(None, description="A concise web search query that would verify this specific claim. Null if claim_found is false.")

class FactCheckVerdict(BaseModel):
    verdict: Literal["confirmed", "refuted", "unverifiable"]
    explanation: str = Field(..., description="One or two sentences, referencing what the search actually found.")

class EvalScore(BaseModel):
    specificity: int = Field(..., ge=1, le=5, description="1 = vague/generic, 5 = precise with real numbers.")
    evidence: int = Field(..., ge=1, le=5, description="1 = unsupported assertion, 5 = backed by data or a clear mechanism.")
    clarity: int = Field(..., ge=1, le=5, description="How clearly they communicated an actual answer. 1 = rambling, confusing, or a non-answer/dodge. 5 = direct and actually addresses the question. A grammatically smooth non-answer like 'I don't know' must score 1-2 - clean sentence structure is not the same as clarity of content.")
    red_flags: List[str] = Field(default_factory=list, description="Short phrases naming specific concerns. Empty list if none.")

class SessionReport(BaseModel):
    panel_verdict: str = Field(..., description="3-5 sentences. The panel's overall closing take, referencing specific moments from the conversation.")
    strengths: List[str] = Field(..., description="2-4 short, specific strengths the panel actually observed.")
    concerns: List[str] = Field(..., description="2-4 short, specific concerns the panel actually observed.")
    would_invest: Literal["yes", "no", "maybe"] = Field(..., description="The panel's overall verdict, forced choice.")

def invoke_structured_with_retry(structured_llm, prompt: str, fallback: BaseModel):
    try:
        return structured_llm.invoke(prompt)
    except Exception as e:
        print(f"[structured output retry] first attempt failed: {e}")
        try:
            return structured_llm.invoke(prompt)
        except Exception as e2:
            print(f"[structured output retry] second attempt failed, using fallback: {e2}")
            return fallback

@traceable(name="Tavily tool")
def search_web(query: str) -> str:
    """Executes live web search using Tavily API for claim verification."""
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return "Search API key not configured."

    response = requests.post(
        "https://api.tavily.com/search",
        json={"api_key": api_key, "query": query, "max_results": 4},
        timeout=15,
    )
    if response.status_code == 200:
        data = response.json()
        results = [f"{r['title']}: {r['content']} (URL: {r['url']})" for r in data.get("results", [])]
        return "\n".join(results) if results else "No results found."
    return "Failed to execute web search."

PERSONAS: List[str] = ["Skeptic", "Growth", "Product"]

PERSONA_STRATEGY: Dict[str, str] = {
    "Skeptic": (
        "Skeptical VC. Pokes at unit economics, revenue claims, and market-size "
        "numbers. Assumes the founder is overselling until proven otherwise. "
        "Talks like a blunt, slightly impatient investor who has heard a "
        "thousand pitches - short sentences, no corporate hedging."
    ),
    "Growth": (
        "Growth/hype investor. Focused on scale, distribution, and total "
        "addressable market. Wants to know how big this gets and how fast. "
        "Talks with energy, asks 'what happens at 10x' type questions."
    ),
    "Product": (
        "Product/technical investor. Focused on defensibility, moat, and "
        "whether the product can actually be built and maintained. Talks "
        "calmly, asks precise, specific questions rather than big-picture ones."
    ),
}

@traceable(name="Turn Orchestrator")
def orchestrator_node(state: PitchAgentState) -> dict:
    """
    Pure bookkeeping/routing node - no LLM call, no tool call.
    Picks the next persona (round-robin) and clears per-round scratch fields.
    """
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
    if state["round_number"] >= state["max_rounds"]:
        return "session_report_node"
    return "persona_question_node"

STYLE_OPENING = (
    "This is your first question. In ONE short sentence, casually reflect what "
    "their startup does back to them based on their pitch then ask your question. "
    "Total response: 2 sentences max, under 35 words."
)

STYLE_DIRECT = (
    "Skip any reaction or acknowledgment. Just ask your question directly, like an "
    "investor who's already moved on to the next thing. 1 sentence, under 25 words."
)

STYLE_CALLBACK_ANSWER = (
    "In a short phrase or half-sentence, casually acknowledge one specific technical or business "
    "detail from the founder's LAST answer then ask your question. "
    "Total response: 2 sentences max, under 35 words. Do not make up facts or terms not mentioned by the founder."
)

STYLE_CALLBACK_FACTCHECK = (
    "Briefly reference the flagged claim from the context below in a half-sentence to sound mildly "
    "unconvinced but not hostile. Use the ACTUAL claim text provided, do not invent numbers. "
    "- then ask your question. Total response: 2 sentences max, under 35 words. "
    "Bring the claim back up if it is relevant to your question."
)

def _pick_style(round_number: int, has_flagged_claims: bool) -> str:
    if round_number == 0:
        return STYLE_OPENING
    choices = [STYLE_DIRECT, STYLE_CALLBACK_ANSWER]
    weights = [0.4, 0.6]
    if has_flagged_claims:
        choices.append(STYLE_CALLBACK_FACTCHECK)
        weights = [0.3, 0.35, 0.35]
    return random.choices(choices, weights=weights, k=1)[0]


QUESTION_PROMPT = PromptTemplate(
    template="""You are an investor on a panel grilling a founder. Stay fully in character.

    Your persona: {persona}
    Your style: {persona_strategy}

    Startup: {startup_name} ({sector}, {stage} stage)
    Funding ask: {funding_ask} for {equity_offered}% equity
    Pitch: {pitch_text}

    Conversation so far (most recent last):
    {transcript_text}

    {fact_check_context}

    HOW TO RESPOND THIS TURN:
    {style_instruction}

    Hard rules:
    - Talk like a real investor in a live meeting, not a written questionnaire —
      casual, a little impatient, contractions are fine ("you're", "that's").
    - Never repeat a question already asked in the conversation above.
    - Respond with ONLY what you'd say out loud. No preamble, no quotation marks, no labels.""",
    input_variables=[
        "persona", "persona_strategy", "startup_name", "sector", "stage",
        "funding_ask", "equity_offered", "pitch_text", "transcript_text",
        "fact_check_context", "style_instruction",
    ],
)

def _format_transcript(transcript: List[Dict[str, Any]]) -> str:
    if not transcript:
        return "(no questions asked yet this is the opening question)"
    lines = []
    for turn in transcript[-4:]:
        lines.append(f"{turn['persona']}: {turn['question']}")
        if turn.get("answer"):
            lines.append(f"Founder: {turn['answer']}")
    return "\n".join(lines)

@traceable(name="Persona Question")
def persona_question_node(state: PitchAgentState) -> dict:
    """Generates the next question from the current persona, grounded in
    the pitch and the recent conversation (including the last fact-check,
    if there was one, so the persona can call it out)."""
    persona = state["current_persona"]

    flagged_claims = [
        t["fact_check"] for t in state["transcript"]
        if t.get("fact_check") and t["fact_check"]["verdict"] in ("refuted", "unverifiable")
    ]

    style_instruction = _pick_style(state["round_number"], bool(flagged_claims))
    fact_check_context = ""

    if style_instruction == STYLE_CALLBACK_FACTCHECK:
        lines = [
            f'- "{fc["claim_text"]}" was {fc["verdict"]}: {fc["explanation"]}'
            for fc in flagged_claims
        ]
        fact_check_context = "Flagged claim to bring up:\n" + "\n".join(lines)

    prompt = QUESTION_PROMPT.format(
        persona=persona,
        persona_strategy=PERSONA_STRATEGY[persona],
        startup_name=state["startup_name"],
        sector=state["sector"],
        stage=state["stage"],
        funding_ask=state["funding_ask"],
        equity_offered=state["equity_offered"],
        pitch_text=state["pitch_text"],
        transcript_text=_format_transcript(state["transcript"]),
        fact_check_context=fact_check_context,
        style_instruction=style_instruction,
    )

    response = question_check_llm.invoke(prompt)
    return {"question_text": response.content.strip()}

@traceable(name="Human Answer")
def human_answer_node(state: PitchAgentState) -> dict:
    """Graph execution pauses here until resumed with Command(resume=<answer text>)."""
    answer = interrupt({
        "type": "answer_required",
        "persona": state["current_persona"],
        "question": state["question_text"],
        "instruction": "Answer this question as the founder.",
    })
    return {"human_answer": answer}


claim_llm = claim_eval_llm.with_structured_output(ClaimCheck)

CLAIM_PROMPT = PromptTemplate(
    template="""Read this founder's answer to an investor's question.
    Question: {question}
    Answer: {answer}
    Startup name if you need : {startup_name}
    Decide whether the answer contains a SPECIFIC, CHECKABLE factual claim -
    a concrete number, statistic, growth rate, market size, or a named
    comparison to a competitor. Opinions, vision statements, and vague
    descriptions ("we're growing fast") do NOT count.

    If it does contain a checkable claim, extract it and propose a short web
    search query that would help verify it.
    
    Only extract a claim the founder is ASSERTING about their own company —
    not a number they're referencing from the question itself in order to
    explain or push back on it.""",
    input_variables=["question", "answer", "startup_name"],
)

@traceable(name="Claim Detector")
def claim_detector_node(state: PitchAgentState) -> dict:
    prompt = CLAIM_PROMPT.format(question=state["question_text"], answer=state["human_answer"], startup_name=state["startup_name"])
    result: ClaimCheck = invoke_structured_with_retry(
        claim_llm, prompt, ClaimCheck(claim_found=False, claim_text=None, search_query=None)
    )
    return {
        "claim_found": result.claim_found,
        "claim_text": result.claim_text,
        "search_query": result.search_query,
    }

def route_from_claim_detector(state: PitchAgentState) -> Literal["fact_check_node", "answer_evaluator_node"]:
    return "fact_check_node" if state["claim_found"] else "answer_evaluator_node"

verdict_llm = claim_eval_llm.with_structured_output(FactCheckVerdict)

VERDICT_PROMPT = PromptTemplate(
    template="""A founder claimed: "{claim_text}"

    Web search results:
    {search_results}

    Decide the verdict carefully. these are two very different situations:

    1. The results contain DIRECT evidence about this specific claim or company
       (e.g. a report specifically about this company, or a documented fact
       that directly contradicts this exact number) -> confirmed or refuted.

    2. The results only contain GENERAL industry benchmarks, typical ranges,
       or averages for this type of metric, with nothing specific to this
       company -> unverifiable. A company's number falling outside a general
       average is NOT evidence it's false. only direct evidence about this
       specific claim can refute it. Default to unverifiable whenever your
       search only returned generic/industry-wide information.

    3. UNIT & NUMBER CONVERSIONS (CRITICAL):
        - 1 Crore = 10 Million. (e.g., 22.9 Crore = 229 Million).
        - 1 Lakh = 100,000.
        - 1 Billion = 1,000 Million = 100 Crore.
        Always convert numbers to the same unit before comparing!

    4. ESTIMATION VS REFUTATION:
        - Founder pitches often use slightly outdated or rounded estimates. 
        - If a search result shows a close figure (e.g., search says 210M vs founder's 22.9 Crore / 229M), mark it as "confirmed" or "unverifiable" with a minor note, NOT "refuted".
        - Only mark as "refuted" if there is a DIRECT, SIGNIFICANT contradiction (e.g., claim i

    Explain briefly, citing what the results actually said.""",
    input_variables=["claim_text", "search_results"],
)

@traceable(name="Fact Check")
def fact_check_node(state: PitchAgentState) -> dict:
    search_results = search_web(state["search_query"])
    prompt = VERDICT_PROMPT.format(claim_text=state["claim_text"], search_results=search_results)
    result: FactCheckVerdict = invoke_structured_with_retry(
        verdict_llm, prompt, FactCheckVerdict(verdict="unverifiable", explanation="Could not complete verification due to a model error.")
    )

    return {
        "fact_check_result": {
            "claim_text": state["claim_text"],
            "search_query": state["search_query"],
            "verdict": result.verdict,
            "explanation": result.explanation,
        }
    }

eval_llm = claim_eval_llm.with_structured_output(EvalScore)

EVAL_PROMPT = PromptTemplate(
    template="""Grade this founder's answer as an investor would, using this rubric:

    Question: {question}
    Answer: {answer}
    Fact-check on this answer (if any): {fact_check_summary}

    specificity (1-5): does it give real numbers/specifics, or is it vague?
    evidence (1-5): is it backed by data or a clear mechanism, or just asserted?
    clarity (1-5): does it directly and clearly address the question? A short,
    grammatically clean dodge or "I don't know" is NOT clear  score it 1-2,
    since it communicates no actual answer. Only score high if the founder
    actually explains something.
    red_flags: list anything concerning (e.g. dodged the question, contradicts
    an earlier answer, a claim that was just refuted). Empty list if none.""",
    
    input_variables=["question", "answer", "fact_check_summary"],
)

@traceable(name="Answer Evaluator")
def answer_evaluator_node(state: PitchAgentState) -> dict:
    fact_check_summary = "none"
    if state.get("fact_check_result"):
        fc = state["fact_check_result"]
        fact_check_summary = f"{fc['verdict']} - {fc['explanation']}"

    prompt = EVAL_PROMPT.format(
        question=state["question_text"],
        answer=state["human_answer"],
        fact_check_summary=fact_check_summary,
    )

    result: EvalScore = invoke_structured_with_retry(
        eval_llm, prompt, EvalScore(specificity=3, evidence=3, clarity=3, red_flags=["Scoring failed — default score applied."])
    )

    eval_scores = {
        "specificity": result.specificity,
        "evidence": result.evidence,
        "clarity": result.clarity,
        "red_flags": result.red_flags,
    }

    new_transcript_entry = {
        "round": state["round_number"],
        "persona": state["current_persona"],
        "question": state["question_text"],
        "answer": state["human_answer"],
        "fact_check": state.get("fact_check_result"),
        "eval_scores": eval_scores,
    }

    return {
        "eval_scores": eval_scores,
        "transcript": state["transcript"] + [new_transcript_entry],
        "round_number": state["round_number"] + 1,
    }

report_llm = claim_eval_llm.with_structured_output(SessionReport)

REPORT_PROMPT = PromptTemplate(
    template="""The grilling is over. Write the panel's closing report for {startup_name}
    ({sector}, {stage} stage, asking {funding_ask} for {equity_offered} % equity).

    Full transcript:
    {full_transcript}

    Fact-checks performed:
    {fact_check_log}

    Write a panel_verdict (3-5 sentences, specific - reference actual moments
    from the conversation, not generic advice). List concrete strengths and
    concerns the panel actually observed. Give a forced would_invest verdict.""",
    input_variables=["startup_name", "sector", "stage", "funding_ask", "equity_offered", "full_transcript", "fact_check_log"],
)

def _format_full_transcript(transcript: List[Dict[str, Any]]) -> str:
    lines = []
    for t in transcript:
        lines.append(f"[{t['persona']}] Q: {t['question']}")
        lines.append(f"Founder: {t['answer']}")
        s = t["eval_scores"]
        lines.append(f"(scored specificity={s['specificity']} evidence={s['evidence']} clarity={s['clarity']})")
    return "\n".join(lines)

def _format_fact_check_log(transcript: List[Dict[str, Any]]) -> str:
    checks = [t["fact_check"] for t in transcript if t.get("fact_check")]
    if not checks:
        return "No claims were checked this session."
    return "\n".join(f"- \"{c['claim_text']}\" -> {c['verdict']}: {c['explanation']}" for c in checks)

@traceable(name="Session Report")
def session_report_node(state: PitchAgentState) -> dict:
    prompt = REPORT_PROMPT.format(
        startup_name=state["startup_name"],
        sector=state["sector"],
        stage=state["stage"],
        funding_ask=state["funding_ask"],
        equity_offered=state["equity_offered"],
        full_transcript=_format_full_transcript(state["transcript"]),
        fact_check_log=_format_fact_check_log(state["transcript"]),
    )
    result: SessionReport = invoke_structured_with_retry(
        report_llm, prompt,
        SessionReport(panel_verdict="The panel's evaluation could not be generated due to a technical issue.",
                    strengths=[], concerns=["Report generation failed."], would_invest="maybe")
    )
    scores = [t["eval_scores"] for t in state["transcript"]]
    n = len(scores) or 1
    avg_specificity = round(sum(s["specificity"] for s in scores) / n, 2)
    avg_evidence = round(sum(s["evidence"] for s in scores) / n, 2)
    avg_clarity = round(sum(s["clarity"] for s in scores) / n, 2)

    final_report = {
        "panel_verdict": result.panel_verdict,
        "strengths": result.strengths,
        "concerns": result.concerns,
        "would_invest": result.would_invest,
        "avg_specificity": avg_specificity,
        "avg_evidence": avg_evidence,
        "avg_clarity": avg_clarity,
        "fact_check_log": [t["fact_check"] for t in state["transcript"] if t.get("fact_check")],
        "transcript": state["transcript"],
    }
    return {"final_report": final_report}


builder = StateGraph(PitchAgentState)

builder.add_node("orchestrator_node", orchestrator_node)
builder.add_node("persona_question_node", persona_question_node)
builder.add_node("human_answer_node", human_answer_node)
builder.add_node("claim_detector_node", claim_detector_node)
builder.add_node("fact_check_node", fact_check_node)
builder.add_node("answer_evaluator_node", answer_evaluator_node)
builder.add_node("session_report_node", session_report_node)

builder.add_edge(START, "orchestrator_node")

builder.add_conditional_edges(
    "orchestrator_node",
    route_from_orchestrator,
    {
        "persona_question_node": "persona_question_node",
        "session_report_node": "session_report_node",
    },
)

builder.add_edge("persona_question_node", "human_answer_node")
builder.add_edge("human_answer_node", "claim_detector_node")

builder.add_conditional_edges(
    "claim_detector_node",
    route_from_claim_detector,
    {
        "fact_check_node": "fact_check_node",
        "answer_evaluator_node": "answer_evaluator_node",
    },
)

builder.add_edge("fact_check_node", "answer_evaluator_node")
builder.add_edge("answer_evaluator_node", "orchestrator_node")
builder.add_edge("session_report_node", END)

_conn = sqlite3.connect("langgraph_checkpoints.db", check_same_thread=False)
checkpointer = SqliteSaver(_conn)
graph = builder.compile(checkpointer=checkpointer)