"""Пересобирает assets/data.js из data/groups.json, data/barriers.json и data/comments.json.

Запуск из корня репозитория:
    python tools/build_data.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
data = {name: json.loads((ROOT / "data" / f"{name}.json").read_text(encoding="utf-8"))
        for name in ("groups", "barriers", "comments")}
out = ROOT / "assets" / "data.js"
out.write_text(
    "// Сгенерировано из data/*.json скриптом tools/build_data.py. Демо-данные.\n"
    "window.OS_DATA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n",
    encoding="utf-8", newline="\n")
print(f"OK: {out.relative_to(ROOT)} — групп: {len(data['groups'])}, строк барьеров: {len(data['barriers'])}, комментариев: {len(data['comments'])}")
