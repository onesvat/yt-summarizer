---
description: How to start working on a new task from TASKS.md
---

# Starting a Task

// turbo-all

1. Read `TASKS.md` to find the current state of all tasks:
```bash
cat /home/onur/Code/yt-summarizer/TASKS.md
```

2. Read `PROJECT.md` for architecture context:
```bash
cat /home/onur/Code/yt-summarizer/PROJECT.md
```

3. Identify the next incomplete task (first `[ ]` item whose dependencies are `[x]`).

4. Mark the task as `[/]` (in progress) in `TASKS.md`.

5. Implement the task following the architecture in `PROJECT.md`:
   - Follow the folder structure in §8
   - Follow the database schema in §6
   - Follow the UI layout in §7
   - Follow the AI pipeline design in §3

6. Test the implementation.

7. Mark the task as `[x]` (done) in `TASKS.md`.

8. Commit with message format: `feat(T{id}): {description}`
