---
description: How to test and iterate on AI summarization prompts
---

# Test Summarization Prompts

1. Read the current prompts:
```bash
cat /home/onur/Code/yt-summarizer/src/lib/ai/prompts.ts
```

2. Read the summarizer pipeline:
```bash
cat /home/onur/Code/yt-summarizer/src/lib/ai/summarizer.ts
```

3. Test with diverse video types to ensure quality:
   - **Programming tutorial**: Use a JavaScript/Python tutorial video
   - **Tech talk**: Use a conference talk (e.g., Google I/O, WWDC)
   - **Science/education**: Use a Kurzgesagt or 3Blue1Brown video
   - **Product review**: Use a MKBHD-style review
   - **Interview/podcast**: Use a long-form interview

4. For each test:
   a. Get transcript: `curl http://localhost:8001/transcript/{video_id}`
   b. Run summarization manually through the API: `curl -X POST http://localhost:3000/api/videos/{id}/summary`
   c. Review the output quality — check for:
      - Structural clarity (proper headings, sections)
      - Key takeaway accuracy
      - Code examples (for coding videos)
      - Appropriate length (not too short, not bloated)
      - Category-appropriate formatting

5. Iterate on prompts in `src/lib/ai/prompts.ts` based on results.

6. Document what works well and what doesn't in commit messages.
