---
description: How to check project status and what's been done
---

# Check Project Status

// turbo-all

1. Read the current task state:
```bash
cat /home/onur/Code/yt-summarizer/TASKS.md
```

2. Summarize:
   - How many tasks are `[x]` (done)
   - How many tasks are `[/]` (in progress)
   - How many tasks are `[ ]` (remaining)
   - What phase are we currently in
   - What's the next logical task to pick up

3. Check if the dev server is running:
```bash
lsof -i :3000 2>/dev/null || echo "Next.js not running"
lsof -i :8001 2>/dev/null || echo "Transcript service not running"
```

4. Check for any build errors:
```bash
cd /home/onur/Code/yt-summarizer && npm run build 2>&1 | tail -20
```
