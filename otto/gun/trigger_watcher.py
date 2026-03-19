#!/usr/bin/env python3
"""
Otto RPA: Watches otto/trigger for .md files.
When one appears: copy to clipboard → click → paste → enter → delete file.
Uses only macOS built-ins (pbcopy, osascript). No extra installs.
"""

import subprocess
import time
from pathlib import Path

# Paths relative to this script
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
TRIGGER_DIR = REPO_ROOT / "otto" / "trigger"


def copy_to_clipboard(text: str) -> None:
    subprocess.run(["pbcopy"], input=text.encode("utf-8"), check=True)


def do_click_paste_enter() -> None:
    """Click center of front window, paste, enter. Pure AppleScript."""
    script = '''
    tell application "System Events"
        tell (first process whose frontmost is true)
            set w to front window
            set {wx, wy} to position of w
            set {ww, wh} to size of w
            set cx to wx + ww / 2
            set cy to wy + wh / 2
        end tell
        click at {cx, cy}
        keystroke "v" using command down
        keystroke return
    end tell
    '''
    subprocess.run(["osascript", "-e", script], check=True)


def process_file(path: Path) -> None:
    content = path.read_text(encoding="utf-8")
    copy_to_clipboard(content)
    time.sleep(0.15)
    do_click_paste_enter()
    path.unlink()


def main() -> None:
    TRIGGER_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Otto watching: {TRIGGER_DIR}")
    print("Drop a .md file into trigger to run RPA. Ctrl+C to stop.\n")

    while True:
        try:
            for f in TRIGGER_DIR.iterdir():
                if f.suffix.lower() == ".md" and f.is_file():
                    print(f"Triggered: {f.name}")
                    time.sleep(0.2)
                    process_file(f)
                    print("Done. Waiting for next file.\n")
                    break
        except Exception as e:
            print(f"Error: {e}\n")
        time.sleep(0.5)


if __name__ == "__main__":
    main()
