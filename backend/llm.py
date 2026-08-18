"""Multi-model LLM router built on the Emergent Universal LLM key.

The router selects a model per task type. The Emergent key is currently provisioned
for Gemini models only, so both tiers map to Gemini (Claude/OpenAI can be swapped in
here later without touching callers):
  agentic / chat / research  -> Gemini 3.1 Pro    (reasoning, agentic pipeline answers)
  cheap  / classify / enrich -> Gemini 3 Flash    (high-volume field population)
  draft                      -> Gemini 3 Flash    (email / WhatsApp message drafts)
"""
import os
import json
import re

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

# NOTE: The Emergent Universal key is currently provisioned for Gemini models only
# (Claude/OpenAI access is not enabled on this key). The router still selects a model
# per task type — a higher-quality Pro tier for agentic reasoning, a cheap Flash tier
# for high-volume field population/classification.
MODEL_ROUTES = {
    "agentic": ("gemini", "gemini-3.1-pro-preview"),
    "cheap": ("gemini", "gemini-3-flash-preview"),
    "draft": ("gemini", "gemini-3-flash-preview"),
}


def route_for(task: str):
    if task in ("chat", "research", "agentic"):
        return MODEL_ROUTES["agentic"]
    if task in ("draft", "message"):
        return MODEL_ROUTES["draft"]
    return MODEL_ROUTES["cheap"]


def model_label(task: str) -> str:
    provider, model = route_for(task)
    return f"{provider}:{model}"


def _chat(task: str, system: str, session_id: str) -> LlmChat:
    provider, model = route_for(task)
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system,
    ).with_model(provider, model)


async def llm_stream(task: str, system: str, prompt: str, session_id: str = "task"):
    chat = _chat(task, system, session_id)
    async for ev in chat.stream_message(UserMessage(text=prompt)):
        if isinstance(ev, TextDelta):
            yield ev.content
        elif isinstance(ev, StreamDone):
            break


async def llm_complete(task: str, system: str, prompt: str, session_id: str = "task") -> str:
    out = ""
    async for chunk in llm_stream(task, system, prompt, session_id):
        out += chunk
    return out


def extract_json(text: str):
    """Best-effort extraction of a JSON object/array from an LLM response."""
    if not text:
        raise ValueError("empty response")
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if fence:
        text = fence.group(1)
    match = re.search(r"(\{.*\}|\[.*\])", text, re.S)
    if match:
        text = match.group(1)
    return json.loads(text)
