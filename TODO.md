# GPT-4o/Ollama Integration TODO

## Current Status
- [x] Analyzed files (index.html, app.js, package.json)
- [x] Confirmed Ollama running (llama3.2:latest)
- [x] Plan approved (Ollama primary, OpenAI fallback)

## Implementation Steps
- [x] 1. Add Ollama API config (localhost:11434/llama3.2)
- [x] 2. Create async callLLM(prompt, context) → Ollama chat completion
- [x] 3. Add getAppContext() → serialize S.state (checkins/passive/tx)
- [ ] 4. Replace generate*Response() → await callLLM()
- [x] 5. Update chat handlers (homeChat → async + typing + LLM)
- [ ] 6. Add LLM config modal (model select: ollama/openai, API key input)
- [x] 7. Add typing indicators + error handling + fallback (homeChat)
- [ ] 8. Test all 3 chat UIs (Home, Brain, Assistant)
- [ ] 9. Update TODO progress

## Progress
✅ LLM infrastructure + homeChat() integrated with llama3.2
✅ Ollama detected & prioritized (free/local)
✅ Tx parsing preserved (pre-LLM)
✅ Typing indicator + fallback + rate limit

**Next**: BrainChat + Assistant + config modal

## Testing
```
1. npm run dev (or open index.html)
2. Chat in Home → expect llama3.2 response
3. Brain chat (Insights) → context-aware
4. Assistant → file uploads still work
5. Offline → static fallback
```

**Next**: Edit app.js with callLLM() + replacements
