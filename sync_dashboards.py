"""
sync_dashboards.py
Sincronizador automático entre registro-aulas.md e dashboard.html
Compatível com todos os alunos (Deivid, Rafael, template-aluno)
"""

import sys
import os
import re
import json
import time
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent

def find_student_folders():
    folders = []
    for item in WORKSPACE_ROOT.iterdir():
        if item.is_dir() and not item.name.startswith(('.', '_')):
            reg_file = item / "registro-aulas.md"
            dash_file = item / "dashboard.html"
            if reg_file.exists() and dash_file.exists():
                folders.append(item)
    return folders

def sync_student_dashboard(student_dir: Path):
    reg_path = student_dir / "registro-aulas.md"
    dash_path = student_dir / "dashboard.html"
    
    if not reg_path.exists() or not dash_path.exists():
        print(f"[PULADO] {student_dir.name}: Arquivos necessários não encontrados.")
        return False

    with open(reg_path, "r", encoding="utf-8") as f:
        markdown_content = f.read()

    with open(dash_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    # Injetar o markdown dentro de uma tag especial <script id="registro-aulas-data" type="text/markdown">
    tag_start = '<script id="registro-aulas-data" type="text/markdown">'
    tag_end = '</script>'

    # Escapar fechamento de script se houver (improvável em markdown normal)
    safe_markdown = markdown_content.replace('</script>', '<\\/script>')

    new_block = f'{tag_start}\n{safe_markdown}\n{tag_end}'

    if tag_start in html_content:
        # Substituir bloco existente
        pattern = re.compile(rf'{re.escape(tag_start)}[\s\S]*?{re.escape(tag_end)}')
        updated_html = pattern.sub(new_block, html_content)
    else:
        # Inserir antes do fechamento do </body>
        if "</body>" in html_content:
            updated_html = html_content.replace("</body>", f"{new_block}\n</body>")
        else:
            updated_html = html_content + f"\n{new_block}"

    if updated_html != html_content:
        with open(dash_path, "w", encoding="utf-8") as f:
            f.write(updated_html)
        print(f"[OK] {student_dir.name}/dashboard.html sincronizado com sucesso!")
        return True
    else:
        print(f"[SEM ALTERAÇÕES] {student_dir.name}/dashboard.html já está atualizado.")
        return False

def sync_all(target_name=None):
    students = find_student_folders()
    if target_name:
        students = [s for s in students if s.name.lower() == target_name.lower()]
        if not students:
            print(f"Aluno '{target_name}' não encontrado.")
            return

    for s in students:
        sync_student_dashboard(s)

def watch_mode():
    print("Iniciando monitoramento automático (Watch Mode)... Pressione Ctrl+C para sair.")
    last_mtimes = {}
    while True:
        try:
            for s in find_student_folders():
                reg = s / "registro-aulas.md"
                if reg.exists():
                    mtime = reg.stat().st_mtime
                    if s.name not in last_mtimes or mtime > last_mtimes[s.name]:
                        last_mtimes[s.name] = mtime
                        print(f"\n[ALTERAÇÃO DETECTADA] {s.name}/registro-aulas.md modificado.")
                        sync_student_dashboard(s)
        except KeyboardInterrupt:
            print("\nMonitoramento encerrado.")
            break

def hook_mode():
    try:
        # Lê stdin se houver, mas não trava se vazio
        if not sys.stdin.isatty():
            sys.stdin.read()
    except Exception:
        pass
    sync_all()
    # PostToolUse espera um JSON vazio no stdout
    sys.stdout.write("{}\n")
    sys.stdout.flush()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--watch":
        watch_mode()
    elif len(sys.argv) > 1 and sys.argv[1] == "--hook":
        hook_mode()
    elif len(sys.argv) > 1:
        sync_all(sys.argv[1])
    else:
        sync_all()
