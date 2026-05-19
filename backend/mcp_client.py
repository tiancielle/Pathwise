"""
PathWise — MCP Client (Filesystem)
Permet à l'agent IA de lire les fichiers dans data/resources_raw/
"""
import asyncio
import json
import subprocess
from pathlib import Path

RESOURCES_DIR = str(Path(__file__).parent.parent / "data" / "resources_raw")

async def mcp_list_files() -> list[str]:
    """Liste les fichiers disponibles via MCP Filesystem."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "npx", "@modelcontextprotocol/server-filesystem", RESOURCES_DIR,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL
        )
        # Envoyer requête MCP list tools
        request = json.dumps({
            "jsonrpc": "2.0", "id": 1,
            "method": "tools/list", "params": {}
        }) + "\n"
        stdout, _ = await asyncio.wait_for(
            proc.communicate(input=request.encode()),
            timeout=5.0
        )
        proc.terminate()
        files = list(Path(RESOURCES_DIR).glob("*.pdf"))
        return [f.name for f in files]
    except Exception:
        return []

async def mcp_read_file(filename: str) -> str:
    """Lit un fichier via MCP Filesystem."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "npx", "@modelcontextprotocol/server-filesystem", RESOURCES_DIR,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL
        )
        file_path = str(Path(RESOURCES_DIR) / filename)
        request = json.dumps({
            "jsonrpc": "2.0", "id": 1,
            "method": "tools/call",
            "params": {
                "name": "read_file",
                "arguments": {"path": file_path}
            }
        }) + "\n"
        stdout, _ = await asyncio.wait_for(
            proc.communicate(input=request.encode()),
            timeout=10.0
        )
        proc.terminate()
        response = json.loads(stdout.decode().strip().split("\n")[-1])
        content = response.get("result", {}).get("content", [])
        if content:
            return content[0].get("text", "")[:500]
        return ""
    except Exception:
        return ""

async def mcp_get_context(query: str) -> str:
    """Récupère le contexte MCP pour une requête."""
    files = await mcp_list_files()
    if not files:
        return ""
    context_parts = [f" Fichiers disponibles via MCP : {', '.join(files)}"]
    return "\n".join(context_parts)