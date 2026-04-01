"""
dotmon IDE — FastAPI Backend
Real file system, compilation endpoint, and WebSocket terminal.
"""

import asyncio
import os
import re
import shutil
from pathlib import Path

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ─── Configuration ──────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR / "workspace"
IDE_DIR = BASE_DIR / "ide"

# Allowed file extensions to prevent arbitrary file access
ALLOWED_EXTENSIONS = {".mon", ".c", ".h", ".txt", ".md"}

# Maximum file size (1 MB)
MAX_FILE_SIZE = 1_048_576

app = FastAPI(title="dotmon IDE Backend", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Helpers ────────────────────────────────────────────────

# Regex: only allow a-z, A-Z, 0-9, dashes, underscores, dots, slashes
_SAFE_PATH_RE = re.compile(r"^[a-zA-Z0-9_\-./]+$")


def _validate_path(rel_path: str) -> Path:
    """Validate and resolve a relative path inside PROJECT_DIR."""
    if not rel_path or not _SAFE_PATH_RE.match(rel_path):
        raise HTTPException(status_code=400, detail="Nome de arquivo invalido")
    resolved = (PROJECT_DIR / rel_path).resolve()
    # Prevent directory traversal
    if not str(resolved).startswith(str(PROJECT_DIR.resolve())):
        raise HTTPException(status_code=403, detail="Acesso negado")
    return resolved


def _validate_extension(path: Path) -> None:
    if path.suffix.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Extensao nao permitida: {path.suffix}")


# ─── Default project scaffold ──────────────────────────────
DEFAULT_FILES = {
    "src/main.mon": """\
// Digimon Evolution System
// Main game logic for dotmon

Start
{
    // Define base stats
    Baby nivel = 10;
    Pup experiencia = 250;
    Moji nome = "Agumon";
    Moji evolucao = "Greymon";
    Bit pronto = true;

    // Check evolution conditions
    Evo (nivel > 15) {
        Show("Mega evolucao disponivel!");
        Show(evolucao);
    }
    AltEvo (nivel == 10) {
        Show("Evolucao padrao");
        Show(nome);
    }
    FailEvo {
        Show("Nivel insuficiente");
    }

    // Battle calculation
    Champ dano = experiencia * nivel;
    Show(dano);

    // Display results
    Show("Batalha concluida!");
}
Finish
""",
    "src/batalha.mon": """\
// Battle System Module
// Handles combat logic between Digimons

Start
{
    // Attacker stats
    Moji atacante = "WarGreymon";
    Champ ataque = 850;
    Champ velocidade = 120;

    // Defender stats
    Moji defensor = "MetalGarurumon";
    Champ defesa = 780;
    Champ hp = 1200;

    // Calculate damage
    Champ dano = ataque - defesa;

    Evo (dano > 0) {
        hp = hp - dano;
        Show("Dano causado!");
        Show(dano);
    }
    FailEvo {
        Show("Ataque bloqueado!");
    }

    Show(hp);
}
Finish
""",
    "src/evolucao.mon": """\
// Evolution System Module
// Manages Digimon evolution paths

Start
{
    Moji digimon = "Koromon";
    Baby stage = 1;
    Pup xp = 500;

    // Evolution check
    Evo (xp > 1000) {
        stage = 4;
        digimon = "WarGreymon";
        Show("Mega Evolution!");
    }
    AltEvo (xp > 500) {
        stage = 3;
        digimon = "Greymon";
        Show("Champion Evolution!");
    }
    AltEvo (xp > 100) {
        stage = 2;
        digimon = "Agumon";
        Show("Rookie Evolution!");
    }
    FailEvo {
        Show("Not enough XP");
    }

    Show(digimon);
    Show(stage);
}
Finish
""",
    "src/digimon.mon": """\
// Digimon Data Module
// Base definitions for Digimon creatures

Start
{
    // Agumon stats
    Moji nome = "Agumon";
    Baby ataque = 45;
    Baby defesa = 30;
    Pup hp = 120;
    Bit ativo = true;

    // Show Digimon info
    Show("=== Digimon Info ===");
    Show(nome);
    Show(ataque);
    Show(defesa);
    Show(hp);
}
Finish
""",
    "src/utils.mon": """\
// Utility Module
// Helper functions and common calculations

Start
{
    // Power calculation
    Baby base = 10;
    Baby multiplicador = 3;
    Champ poder = base * multiplicador;

    Show("Poder calculado:");
    Show(poder);

    // Status check
    Bit is_forte = true;
    Evo (poder > 25) {
        Show("Digimon forte!");
    }
    FailEvo {
        Show("Digimon fraco...");
    }
}
Finish
""",
}


def _ensure_workspace():
    """Create workspace with default files if it doesn't exist."""
    if PROJECT_DIR.exists() and any(PROJECT_DIR.rglob("*.mon")):
        return
    for rel_path, content in DEFAULT_FILES.items():
        full = PROJECT_DIR / rel_path
        full.parent.mkdir(parents=True, exist_ok=True)
        if not full.exists():
            full.write_text(content, encoding="utf-8")


# ─── Models ─────────────────────────────────────────────────

class FileContent(BaseModel):
    content: str


class RenameRequest(BaseModel):
    new_path: str


class CreateFileRequest(BaseModel):
    path: str
    content: str = ""


# ─── REST API: File System ──────────────────────────────────

@app.get("/api/files")
def list_files():
    """List all project files as a flat dict {path: size}."""
    _ensure_workspace()
    result = {}
    for ext in ALLOWED_EXTENSIONS:
        for f in PROJECT_DIR.rglob(f"*{ext}"):
            rel = f.relative_to(PROJECT_DIR).as_posix()
            result[rel] = f.stat().st_size
    return {"files": result}


@app.get("/api/files/{file_path:path}")
def read_file(file_path: str):
    """Read a single file's content."""
    full = _validate_path(file_path)
    _validate_extension(full)
    if not full.is_file():
        raise HTTPException(status_code=404, detail="Arquivo nao encontrado")
    try:
        content = full.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Arquivo nao e texto valido")
    return {"path": file_path, "content": content}


@app.put("/api/files/{file_path:path}")
def write_file(file_path: str, body: FileContent):
    """Create or update a file."""
    full = _validate_path(file_path)
    _validate_extension(full)
    if len(body.content.encode("utf-8")) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Arquivo muito grande (max 1MB)")
    full.parent.mkdir(parents=True, exist_ok=True)
    full.write_text(body.content, encoding="utf-8")
    return {"path": file_path, "size": full.stat().st_size}


@app.post("/api/files")
def create_file_endpoint(body: CreateFileRequest):
    """Create a new file."""
    full = _validate_path(body.path)
    _validate_extension(full)
    if full.exists():
        raise HTTPException(status_code=409, detail="Arquivo ja existe")
    if len(body.content.encode("utf-8")) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Arquivo muito grande (max 1MB)")
    full.parent.mkdir(parents=True, exist_ok=True)
    full.write_text(body.content, encoding="utf-8")
    return {"path": body.path, "size": full.stat().st_size}


@app.delete("/api/files/{file_path:path}")
def delete_file(file_path: str):
    """Delete a file."""
    full = _validate_path(file_path)
    if not full.is_file():
        raise HTTPException(status_code=404, detail="Arquivo nao encontrado")
    full.unlink()
    # Remove empty parent directories
    parent = full.parent
    while parent != PROJECT_DIR and not any(parent.iterdir()):
        parent.rmdir()
        parent = parent.parent
    return {"deleted": file_path}


@app.patch("/api/files/{file_path:path}")
def rename_file(file_path: str, body: RenameRequest):
    """Rename / move a file."""
    old = _validate_path(file_path)
    new = _validate_path(body.new_path)
    _validate_extension(new)
    if not old.is_file():
        raise HTTPException(status_code=404, detail="Arquivo original nao encontrado")
    if new.exists():
        raise HTTPException(status_code=409, detail="Destino ja existe")
    new.parent.mkdir(parents=True, exist_ok=True)
    old.rename(new)
    # Cleanup empty dirs
    parent = old.parent
    while parent != PROJECT_DIR and not any(parent.iterdir()):
        parent.rmdir()
        parent = parent.parent
    return {"old_path": file_path, "new_path": body.new_path}


# ─── REST API: Bulk load (initial load) ────────────────────

@app.get("/api/project")
def load_project():
    """Load ALL files content at once (for initial IDE load)."""
    _ensure_workspace()
    result = {}
    for ext in ALLOWED_EXTENSIONS:
        for f in PROJECT_DIR.rglob(f"*{ext}"):
            rel = f.relative_to(PROJECT_DIR).as_posix()
            try:
                result[rel] = f.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
    return {"files": result}


# ─── REST API: Export generated C ───────────────────────────

@app.put("/api/generated/{file_path:path}")
def save_generated(file_path: str, body: FileContent):
    """Save a generated C file to workspace/generated/."""
    gen_dir = PROJECT_DIR / "generated"
    safe_name = Path(file_path).name
    if not safe_name.endswith(".c") and not safe_name.endswith(".h"):
        raise HTTPException(status_code=400, detail="Apenas arquivos .c/.h permitidos")
    if not _SAFE_PATH_RE.match(safe_name):
        raise HTTPException(status_code=400, detail="Nome invalido")
    gen_dir.mkdir(parents=True, exist_ok=True)
    target = (gen_dir / safe_name).resolve()
    if not str(target).startswith(str(gen_dir.resolve())):
        raise HTTPException(status_code=403, detail="Acesso negado")
    target.write_text(body.content, encoding="utf-8")
    return {"path": f"generated/{safe_name}", "size": target.stat().st_size}


# ─── WebSocket: Terminal ────────────────────────────────────

@app.websocket("/ws/terminal")
async def terminal_ws(ws: WebSocket):
    """Interactive terminal via WebSocket.

    Protocol (JSON):
      Client → Server: { "cmd": "..." }
      Server → Client: { "lines": [{"cls": "...", "text": "..."}] }
    """
    await ws.accept()
    cwd = str(PROJECT_DIR)

    try:
        while True:
            data = await ws.receive_json()
            cmd = data.get("cmd", "").strip()
            if not cmd:
                continue

            lines = await _handle_terminal_cmd(cmd, cwd)
            await ws.send_json({"lines": lines})
    except WebSocketDisconnect:
        pass


async def _handle_terminal_cmd(cmd: str, cwd: str):
    """Process a terminal command and return output lines."""
    lines = []

    if cmd == "clear":
        return [{"cls": "terminal-info", "text": "__CLEAR__"}]

    if cmd == "help":
        lines.append({"cls": "terminal-info", "text": "Commands:"})
        lines.append({"cls": "terminal-info", "text": "  dotmon compile [file]  — Compile a .mon file"})
        lines.append({"cls": "terminal-info", "text": "  dotmon compile all     — Compile all .mon files"})
        lines.append({"cls": "terminal-info", "text": "  ls                     — List files"})
        lines.append({"cls": "terminal-info", "text": "  cat <file>             — Show file content"})
        lines.append({"cls": "terminal-info", "text": "  clear                  — Clear terminal"})
        lines.append({"cls": "terminal-info", "text": "  help                   — Show this help"})
        return lines

    if cmd == "ls":
        src = PROJECT_DIR / "src"
        gen = PROJECT_DIR / "generated"
        if src.exists():
            for f in sorted(src.rglob("*")):
                if f.is_file():
                    lines.append({"cls": "terminal-info", "text": f"  {f.relative_to(PROJECT_DIR).as_posix()}"})
        if gen.exists():
            for f in sorted(gen.rglob("*")):
                if f.is_file():
                    lines.append({"cls": "terminal-info", "text": f"  {f.relative_to(PROJECT_DIR).as_posix()}"})
        if not lines:
            lines.append({"cls": "terminal-muted", "text": "  (empty workspace)"})
        return lines

    if cmd.startswith("cat "):
        rel = cmd[4:].strip()
        try:
            full = (PROJECT_DIR / rel).resolve()
            if not str(full).startswith(str(PROJECT_DIR.resolve())):
                return [{"cls": "terminal-error", "text": "[error] Acesso negado"}]
            if not full.is_file():
                return [{"cls": "terminal-error", "text": f"[error] Arquivo nao encontrado: {rel}"}]
            content = full.read_text(encoding="utf-8")
            for line in content.splitlines():
                lines.append({"cls": "terminal-info", "text": line})
        except Exception as e:
            lines.append({"cls": "terminal-error", "text": f"[error] {e}"})
        return lines

    # dotmon compile is handled client-side (compiler is in JS)
    # but we acknowledge the command
    if cmd.startswith("dotmon compile"):
        return [{"cls": "terminal-info", "text": "__COMPILE__:" + cmd}]

    return [{"cls": "terminal-error", "text": f"Command not found: {cmd}. Type 'help' for available commands."}]


# ─── Serve static IDE files ────────────────────────────────
# Mount at root so relative paths in index.html (css/styles.css, js/app.js) resolve correctly.
# This must come AFTER all API routes since StaticFiles is a catch-all.

app.mount("/", StaticFiles(directory=str(IDE_DIR), html=True), name="ide")


# ─── Startup ───────────────────────────────────────────────

@app.on_event("startup")
def on_startup():
    _ensure_workspace()
    print(f"\n  dotmon IDE Backend running!")
    print(f"  Project workspace: {PROJECT_DIR}")
    print(f"  Open IDE at: http://localhost:8000\n")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
