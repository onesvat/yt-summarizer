---
description: How to run the full development environment
---

# Run Development Environment

// turbo-all

1. Start the transcript microservice (if not already running):
```bash
cd /home/onur/Code/yt-summarizer/transcript-service && pip install -r requirements.txt && uvicorn main:app --port 8001 --reload &
```

2. Start the Next.js dev server:
```bash
cd /home/onur/Code/yt-summarizer && npm run dev
```

3. Verify both services are running:
```bash
curl -s http://localhost:3000 > /dev/null && echo "Next.js: OK" || echo "Next.js: FAILED"
curl -s http://localhost:8001 > /dev/null && echo "Transcript: OK" || echo "Transcript: FAILED"
```
