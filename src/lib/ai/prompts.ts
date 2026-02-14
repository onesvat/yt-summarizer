
/**
 * AI prompt templates for the multi-pass summarization pipeline.
 * 
 * IMPORTANT: All prompts explicitly instruct the model to output ONLY the final
 * result without reasoning steps, thinking tokens, or analysis preambles.
 */

const NO_THINKING = `CRITICAL: Output ONLY the final result. Do NOT include your reasoning process, analysis steps, thinking, self-corrections, or any preamble. Start directly with the content.`

/**
 * Pass 1: Structural Analysis
 * Analyzes the transcript to determine structure, topics, and timeline.
 */
export function structuralAnalysisPrompt(transcript: string): string {
    return `You are an expert content analyst. Analyze this video transcript and provide a structural breakdown.

${NO_THINKING}

TRANSCRIPT:
${transcript}

Provide your analysis as valid JSON with this structure:
{
  "title_suggestion": "A concise title for this video's content",
  "category": "one of: programming_tutorial, tech_talk, science_education, ai_ml, history, psychology, philosophy, health_medicine, business_finance, news_opinion, product_review, interview_podcast, education, math_engineering, music_arts, diy_howto, travel_culture, gaming, general",
  "difficulty": "beginner | intermediate | advanced",
  "duration_estimate": "estimated video duration",
  "sections": [
    {
      "title": "Section title",
      "start_time": "approximate timestamp",
      "start_seconds": 0,
      "topics": ["topic1", "topic2"],
      "summary": "Brief 1-2 sentence summary of this section"
    }
  ],
  "key_topics": ["Main topic 1", "Main topic 2"],
  "speakers": ["Speaker names if identifiable"]
}

Respond ONLY with valid JSON, no markdown code fences, no explanation.`
}

/**
 * Pass 2: Deep Summary
 * Creates a comprehensive, category-adaptive summary document.
 */
export function deepSummaryPrompt(transcript: string, structuralAnalysis: string, category: string): string {
    const categoryInstructions = getCategoryInstructions(category)

    return `You are an expert educational content writer. Create a deep, comprehensive learning document from this video transcript.

${NO_THINKING}

TRANSCRIPT:
${transcript}

STRUCTURAL ANALYSIS:
${structuralAnalysis}

VIDEO CATEGORY: ${category}

Write a rich, highly readable markdown document that serves as a **complete, self-contained lesson**. The reader should fully understand the topic without watching the video. Use bullet points with full, comprehensive sentences — not fragments. Use emojis as visual markers for sections.

FORMAT:
# 🎬 [Video Title]

> [Brief summary in one sentence]

## 🔑 Key Takeaways
- ✅ [Full sentence summarizing a key point with enough context to stand alone.]
- ✅ [Another complete, informative takeaway.]
...

## 📝 Detailed Summary
### 📌 [Section Title] [timestamp](yt:SECONDS)
- **[Key concept]** — Full sentence explaining the concept with specifics, numbers, or examples from the video.
- 💬 Notable quote or paraphrase from the speaker, with context for why it matters.
- 📊 Specific data point, statistic, research finding, or concrete example mentioned.
- 💡 Additional background context or broader implication that helps the reader understand the topic more deeply (weave this naturally where relevant — do not save it for a separate section).

${categoryInstructions}

TIMESTAMP RULES:
1. Use this exact format for EVERY time reference: [M:SS](yt:SECONDS)
   - Example: [2:15](yt:135)
   - Ensure the seconds calculation is correct.

WRITING RULES:
- 📋 **Bullet points with full sentences** — every bullet should be a complete, informative sentence, not a fragment.
- 🎯 **Be specific** — include actual numbers, names, studies, and examples from the video.
- 🏷️ Use **bold** for key terms on first mention.
- 💻 Use \`code\` formatting for technical terms, tools, or specific values.
- 🎨 Use emojis as section/bullet markers to improve scannability (📌 🔑 💡 ⚡ 🎯 📊 🔗 ⚠️ etc.).
- 📖 This should be a **full lesson** — comprehensive enough that the reader learns the topic without watching the video.
- 🌍 Where it helps understanding, enrich the content with relevant background knowledge, historical context, or connections to related concepts. Weave this directly into the relevant sections — do not create a separate section for it.`
}

/**
3. **Glossary** — ONLY if the video introduces 3+ specialized terms that a viewer might not know. Format as:
## Glossary
| Term | Definition |
|------|-----------|
| Term | Clear, concise definition based on how it's used in the video |

4. **Further Reading** — ONLY if there are clear related topics worth exploring. Format as:
## Further Reading
- **[Topic]**: Brief description of why it's relevant

RULES:
- Return the COMPLETE summary with your additions integrated naturally
- Keep the existing content intact — only ADD to it
- Maintain all existing timestamps in their [M:SS](yt:SECONDS) format
- Do NOT add a difficulty badge or any meta-commentary
- Do NOT wrap the output in markdown code fences`
}

/**
 * Get category-specific instructions for the deep summary pass.
 */
function getCategoryInstructions(category: string): string {
    switch (category) {
        case 'programming_tutorial':
            return `
### Code Examples
(Include the actual code discussed or demonstrated in the video. Use proper syntax highlighting with language tags. Add brief comments explaining key lines.)

### Technologies & Tools
(List all frameworks, libraries, languages, and tools mentioned with brief context on how they're used)`

        case 'tech_talk':
            return `
### Architecture & Design
(If the video discusses system architecture, describe the components and their relationships. A mermaid diagram may be added in the enrichment pass if appropriate.)

### Technical Decisions
(Document key technical decisions, trade-offs, and their rationale)`

        case 'science_education':
            return `
### Key Concepts
(Explain the main scientific or educational concepts in clear language, as the video presents them)

### Data & Evidence
(Summarize any studies, statistics, experiments, or evidence cited in the video)`

        case 'ai_ml':
            return `
### Models & Techniques
(Describe the AI/ML models, algorithms, or techniques discussed. Explain how they work at a conceptual level.)

### Benchmarks & Results
(Summarize any performance metrics, benchmarks, or comparisons mentioned)

### Practical Applications
(Note real-world use cases or applications discussed)`

        case 'history':
            return `
### Historical Context
(Set the scene — time period, geography, and key figures involved)

### Timeline of Events
(Chronological breakdown of the key events discussed)

### Significance & Legacy
(Explain the lasting impact or relevance of the historical events)`

        case 'psychology':
            return `
### Key Theories & Concepts
(Explain the psychological theories, models, or frameworks discussed)

### Research & Studies
(Summarize any studies, experiments, or data cited)

### Practical Takeaways
(Actionable insights for understanding behavior or improving well-being)`

        case 'philosophy':
            return `
### Core Arguments
(Outline the main philosophical arguments and their logical structure)

### Thinkers & Schools
(Reference the philosophers, traditions, or schools of thought discussed)

### Questions Raised
(Key open questions or thought experiments posed)`

        case 'health_medicine':
            return `
### Medical/Health Concepts
(Explain the health topics, conditions, or treatments discussed)

### Evidence & Research
(Summarize clinical studies, data, or expert opinions cited)

### Practical Advice
(Actionable health recommendations mentioned — note that this is informational, not medical advice)`

        case 'business_finance':
            return `
### Key Business Concepts
(Explain the business strategies, financial concepts, or market dynamics discussed)

### Data & Metrics
(Summarize any financial data, market stats, or performance indicators mentioned)

### Actionable Insights
(Strategic takeaways or investment considerations discussed)`

        case 'news_opinion':
            return `
### Arguments & Analysis
(Outline the main arguments presented. Clearly distinguish between stated facts and opinions.)

### Perspectives
(Note different viewpoints discussed, including counterarguments if any)`

        case 'product_review':
            return `
### Pros & Cons
| ✅ Pros | ❌ Cons |
|---------|--------|
| ... | ... |

### Verdict
(Summarize the reviewer's overall assessment and recommendation)`

        case 'interview_podcast':
            return `
### Key Discussion Points
(Summarize the main topics discussed, attributing positions to specific speakers)

### Speaker Insights
(Notable perspectives or revelations from each speaker)`

        case 'education':
            return `
### Learning Objectives
(What the viewer should understand after watching this video)

### Core Concepts Explained
(Clear explanations of the educational material covered)

### Examples & Exercises
(Any worked examples, practice problems, or demonstrations shown)`

        case 'math_engineering':
            return `
### Formulas & Equations
(Key mathematical formulas or engineering equations discussed, formatted in code blocks)

### Problem-Solving Approach
(Step-by-step methodology or approach demonstrated)

### Applications
(Real-world engineering or mathematical applications discussed)`

        case 'music_arts':
            return `
### Artistic Analysis
(Discuss the creative techniques, styles, or compositions covered)

### Artists & Works
(Reference specific artists, pieces, or performances discussed)

### Creative Insights
(Unique perspectives on the creative process or artistic interpretation)`

        case 'diy_howto':
            return `
### Materials & Tools Needed
(List all required materials, tools, and resources mentioned)

### Step-by-Step Instructions
(Numbered steps following the process demonstrated in the video)

### Tips & Common Mistakes
(Helpful advice and pitfalls to avoid mentioned by the creator)`

        case 'travel_culture':
            return `
### Destinations & Highlights
(Key locations, landmarks, or cultural sites covered)

### Cultural Context
(Important cultural context, customs, or local knowledge shared)

### Practical Tips
(Travel advice, recommendations, or logistics mentioned)`

        case 'gaming':
            return `
### Gameplay & Mechanics
(Describe the game mechanics, strategies, or gameplay elements discussed)

### Analysis & Opinion
(Summarize the creator's analysis, ratings, or opinions on the game)

### Tips & Strategies
(Any tips, tricks, or strategies shared for players)`

        default:
            return `
### Additional Insights
(Any additional context, connections, or implications worth noting)`
    }
}

/**
 * Video category detection prompt (lightweight, used as fallback).
 */
export function categoryDetectionPrompt(transcriptSample: string): string {
    return `Classify this video transcript into exactly one category. Respond with ONLY the category name, nothing else.

Categories: programming_tutorial, tech_talk, science_education, ai_ml, history, psychology, philosophy, health_medicine, business_finance, news_opinion, product_review, interview_podcast, education, math_engineering, music_arts, diy_howto, travel_culture, gaming, general

TRANSCRIPT SAMPLE:
${transcriptSample}

Respond with ONLY the category name, nothing else.`
}

/**
 * Pass 4: Translation (Optional)
 * Translates the final summary to the target language.
 */
export function translationPrompt(summary: string, targetLanguage: string): string {
    return `You are an expert translator. Translate the following video summary into ${targetLanguage === 'tr' ? 'Turkish (Türkçe)' : targetLanguage}.

${NO_THINKING}

ORIGINAL SUMMARY:
${summary}

RULES:
1. Translate the prose, headings, and bullet points naturally and accurately.
2. PRESERVE all markdown formatting exactly (headings, bold, lists, code blocks).
3. PRESERVE all timestamps exactly: [M:SS](yt:SECONDS). Do NOT translate or modify the link part.
4. PRESERVE any mermaid code blocks exactly.
5. PRESERVE any code snippets exactly.
6. PRESERVE the token usage footer if present.
7. Use professional, clear language suitable for an educational summary.

Respond with ONLY the translated markdown, no preamble.`
}
