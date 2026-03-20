# Next steps

## Completed
- Answered how to schedule ~1 email/hour for a 10-hour daily window, track send state, and send via Gmail (App Password SMTP or Gmail API OAuth); noted Workspace vs gmail.com and rough sending limits.

## What still needs improvement
- No in-repo sender script yet unless you ask for `send_one_ayf_email.py` + env-based secrets.

## Most important next actions
1. Enable 2FA on the Google account and create an **App password** (or plan OAuth for Gmail API).
2. Choose **hosting** for the scheduler: Mac `cron`/`launchd` vs always-on VPS vs cloud scheduler.
3. Add `send_state.json` (or DB) so sends are idempotent after restarts.

## Blockers / risks
- Laptops sleeping = missed hours; **CAN-SPAM/GDPR** depending on list and content—get legal comfort for cold outreach.

## Dependencies
- `smtplib` (stdlib) or `google-api-python-client` for Gmail API; `python-dotenv` optional for local env loading.
