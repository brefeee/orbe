"""Répartition des tâches : une IA reformule la demande, une autre l'exécute, une autre crée les images.

Orbe passe par les API officielles avec les clés de l'utilisateur, gardées dans sa base chiffrée.
"""
from __future__ import annotations

import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from orbe_store import StoreError

TIMEOUT = 120
MAX_TOKENS = 4000
ROLES = {"reformuler": "Reformuler la demande en vrai prompt", "executer": "Faire le travail", "image": "Créer les images"}
PROVIDERS = {
    "anthropic": {"name": "Claude", "url": "https://api.anthropic.com/v1/messages", "kind": "anthropic"},
    "openai": {"name": "ChatGPT", "url": "https://api.openai.com/v1/chat/completions", "kind": "openai", "images": "https://api.openai.com/v1/images/generations"},
    "gemini": {"name": "Gemini", "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", "kind": "openai"},
    "deepseek": {"name": "DeepSeek", "url": "https://api.deepseek.com/chat/completions", "kind": "openai"},
    "xai": {"name": "Grok", "url": "https://api.x.ai/v1/chat/completions", "kind": "openai"},
    "mistral": {"name": "Le Chat", "url": "https://api.mistral.ai/v1/chat/completions", "kind": "openai"},
    "perplexity": {"name": "Perplexity", "url": "https://api.perplexity.ai/chat/completions", "kind": "openai"},
}
SUGGESTED = {
    "reformuler": ["openai", "gemini", "mistral", "anthropic", "deepseek", "xai", "perplexity"],
    "executer": ["anthropic", "openai", "gemini", "deepseek", "mistral", "xai", "perplexity"],
    "image": ["openai"],
}
REFORMULATE = ("Réécris la demande ci-dessous en un prompt clair et précis pour une autre IA : objectif, contexte, contraintes et format attendu. "
               "Ne fais pas le travail demandé. Réponds uniquement par le prompt.\n\nDemande :\n")
EXECUTE = ("\n\nSi une image est vraiment nécessaire, ajoute à la fin une ligne par image, au format exact « IMAGE: description ».")
MAX_IMAGES = 3


def _endpoint(url: str) -> str:
    """En test seulement, ORBE_RELAY_BASE redirige vers un faux service local."""
    base = os.environ.get("ORBE_RELAY_BASE")
    if not base:
        return url
    if urlsplit(base).hostname not in ("127.0.0.1", "localhost"):
        raise StoreError("ORBE_RELAY_BASE doit rester local.")
    return base.rstrip("/") + urlsplit(url).path


def _post(url: str, headers: dict, payload: dict, name: str) -> dict:
    request = Request(_endpoint(url), data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json", **headers})
    try:
        with urlopen(request, timeout=TIMEOUT) as res:
            return json.loads(res.read(20 * 1024 * 1024))
    except HTTPError as err:
        raise StoreError(f"{name} a refusé la demande (erreur {err.code}). Vérifie la clé, le modèle et le crédit de ce compte.") from err
    except (URLError, OSError, ValueError) as err:
        raise StoreError(f"{name} ne répond pas.") from err


def _account(config: dict, provider: str) -> tuple[dict, dict]:
    info = PROVIDERS.get(provider)
    account = config.get("accounts", {}).get(provider)
    if not info or not account or not account.get("key") or not account.get("model"):
        name = info["name"] if info else provider
        raise StoreError(f"Il manque la clé ou le modèle de {name}.")
    return info, account


def ask(config: dict, provider: str, prompt: str) -> str:
    info, account = _account(config, provider)
    if info["kind"] == "anthropic":
        data = _post(info["url"], {"x-api-key": account["key"], "anthropic-version": "2023-06-01"},
                     {"model": account["model"], "max_tokens": MAX_TOKENS, "messages": [{"role": "user", "content": prompt}]}, info["name"])
        try:
            return "".join(b.get("text", "") for b in data["content"]).strip()
        except (KeyError, TypeError) as err:
            raise StoreError(f"Réponse illisible de {info['name']}.") from err
    data = _post(info["url"], {"Authorization": f"Bearer {account['key']}"},
                 {"model": account["model"], "messages": [{"role": "user", "content": prompt}]}, info["name"])
    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError, AttributeError) as err:
        raise StoreError(f"Réponse illisible de {info['name']}.") from err


def make_image(config: dict, provider: str, description: str) -> str:
    info, account = _account(config, provider)
    if "images" not in info:
        raise StoreError(f"{info['name']} ne peut pas créer d'images ici.")
    model = account.get("image_model") or account["model"]
    data = _post(info["images"], {"Authorization": f"Bearer {account['key']}"}, {"model": model, "prompt": description, "n": 1}, info["name"])
    try:
        item = data["data"][0]
    except (KeyError, IndexError, TypeError) as err:
        raise StoreError(f"Réponse illisible de {info['name']}.") from err
    if item.get("b64_json"):
        return "data:image/png;base64," + item["b64_json"]
    url = item.get("url", "")
    if not url.startswith("https://"):
        raise StoreError(f"Réponse illisible de {info['name']}.")
    return url


def public_view(config: dict) -> dict:
    """Ce que voit la page : jamais les clés elles-mêmes."""
    accounts = config.get("accounts", {})
    return {"enabled": bool(config.get("enabled")), "roles": config.get("roles", {}), "labels": ROLES,
            "providers": [{"id": pid, "name": info["name"], "hasKey": bool(accounts.get(pid, {}).get("key")), "model": accounts.get(pid, {}).get("model", ""),
                           "imageModel": accounts.get(pid, {}).get("image_model", ""), "canImage": "images" in info} for pid, info in PROVIDERS.items()]}


def merge(config: dict, body: dict) -> dict:
    out = {"enabled": bool(body.get("enabled", config.get("enabled"))), "roles": dict(config.get("roles", {})), "accounts": {k: dict(v) for k, v in config.get("accounts", {}).items()}}
    for role, provider in (body.get("roles") or {}).items():
        if role in ROLES:
            if provider and provider not in PROVIDERS:
                raise StoreError("IA inconnue.")
            if provider and role == "image" and "images" not in PROVIDERS[provider]:
                raise StoreError(f"{PROVIDERS[provider]['name']} ne peut pas créer d'images ici.")
            out["roles"][role] = provider or ""
    for pid, values in (body.get("accounts") or {}).items():
        if pid not in PROVIDERS or not isinstance(values, dict):
            raise StoreError("IA inconnue.")
        account = out["accounts"].setdefault(pid, {})
        if values.get("remove"):
            out["accounts"].pop(pid)
            out["roles"] = {r: ("" if p == pid else p) for r, p in out["roles"].items()}
            continue
        if values.get("key"):
            account["key"] = str(values["key"]).strip()
        for field, name in (("model", "model"), ("imageModel", "image_model")):
            if field in values:
                account[name] = str(values[field]).strip()
    return out


def suggest(config: dict) -> dict:
    """Répartition suggérée, parmi les IA dont la clé et le modèle sont renseignés."""
    ready = {p for p, a in config.get("accounts", {}).items() if a.get("key") and a.get("model")}
    roles = {}
    for role, order in SUGGESTED.items():
        roles[role] = next((p for p in order if p in ready), "")
    return roles


def run(config: dict, task: str) -> list:
    """Enchaîne les IA et renvoie chaque étape, pour que l'utilisateur voie qui a fait quoi."""
    task = (task or "").strip()
    if not config.get("enabled"):
        raise StoreError("La répartition des tâches est désactivée.")
    if not task:
        raise StoreError("Écris d'abord ta demande.")
    roles = config.get("roles", {})
    worker = roles.get("executer")
    if not worker:
        raise StoreError("Choisis quelle IA fait le travail.")
    steps = []
    prompt = task
    if roles.get("reformuler"):
        prompt = ask(config, roles["reformuler"], REFORMULATE + task)
        steps.append({"role": "reformuler", "ai": PROVIDERS[roles["reformuler"]]["name"], "text": prompt})
    answer = ask(config, worker, prompt + (EXECUTE if roles.get("image") else ""))
    lines = answer.splitlines()
    wanted = [l.split(":", 1)[1].strip() for l in lines if l.startswith("IMAGE:") and l.split(":", 1)[1].strip()]
    text = "\n".join(l for l in lines if not l.startswith("IMAGE:")).strip()
    steps.append({"role": "executer", "ai": PROVIDERS[worker]["name"], "text": text})
    if roles.get("image"):
        for description in wanted[:MAX_IMAGES]:
            steps.append({"role": "image", "ai": PROVIDERS[roles["image"]]["name"], "text": description, "image": make_image(config, roles["image"], description)})
    return steps
