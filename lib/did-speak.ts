/**
 * Hook för samma Grok-svar till D-ID när video är på.
 * Stock-embed kan inte köras som ren TTS — nästa steg är D-ID Custom LLM
 * mot en Grok-endpoint eller Agents SDK/API som talar upp `reply`.
 */
export function speakGrokReply(reply: string) {
  if (typeof window === "undefined" || !reply.trim()) return
  window.dispatchEvent(new CustomEvent("ida-grok-reply", { detail: { reply } }))
}
