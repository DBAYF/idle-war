# Otto

Agent-only folder. Contains trigger watcher RPA.

## Run

```bash
python3 otto/gun/trigger_watcher.py
```

Keep it running. When a `.md` file is added to `otto/trigger/`, it will:
1. Copy contents to clipboard
2. Click once (at cursor)
3. Paste (⌘V)
4. Press Enter
5. Delete the trigger file
6. Wait for the next one
