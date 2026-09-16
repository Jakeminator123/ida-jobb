"use client"

import { useEffect, useRef } from "react"

const TARGET_ID = "did-agent-container"

// D-ID's official v2 embed. The client key is a public key meant for the browser.
const DID_CLIENT_KEY = "ck_8gSCmPCeCONpW_1C3xLoP"
const DID_AGENT_ID = "v2_agt_jcdow0ej"

export function DidAgent({ className }: { className?: string }) {
  const injected = useRef(false)

  useEffect(() => {
    // The D-ID script must be injected only once; re-injecting restarts the agent.
    if (injected.current || document.getElementById("did-agent-script")) return
    injected.current = true

    const script = document.createElement("script")
    script.id = "did-agent-script"
    script.type = "module"
    script.src = "https://agent.d-id.com/v2/index.js"
    script.setAttribute("data-mode", "full")
    script.setAttribute("data-client-key", DID_CLIENT_KEY)
    script.setAttribute("data-agent-id", DID_AGENT_ID)
    script.setAttribute("data-name", "did-agent")
    script.setAttribute("data-monitor", "true")
    script.setAttribute("data-light-mode", "false")
    script.setAttribute("data-target-id", TARGET_ID)
    document.body.appendChild(script)
  }, [])

  return <div id={TARGET_ID} className={className} />
}
