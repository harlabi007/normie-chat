import { useState, useRef, useEffect } from "react"

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY

function App() {
  const [normieId, setNormieId] = useState("")
  const [normie, setNormie] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState("")
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, thinking])

  function handleRandom() {
    const random = Math.floor(Math.random() * 10000)
    setNormieId(String(random))
  }

  async function handleConnect() {
    const id = parseInt(normieId)
    if (isNaN(id) || id < 0 || id > 9999) {
      setError("Please enter a valid ID between 0 and 9999")
      return
    }
    setError("")
    setLoading(true)
    try {
      const agentRes = await fetch(`https://api.normies.art/agents/info/${id}`)
      const agentData = agentRes.ok ? await agentRes.json() : null
      const traitRes = await fetch(`https://api.normies.art/normie/${id}/traits`)
      const traitData = await traitRes.json()
      const n = {
        id,
        name: agentData?.name || `Normie #${id}`,
        greeting: agentData?.greeting || `Hey. I'm Normie #${id}. What do you want?`,
        systemPrompt: agentData?.systemPrompt || `You are Normie #${id}, a unique pixel character permanently stored on Ethereum. Be witty and fun. Keep replies short.`,
        traits: traitData?.attributes || [],
        imgUrl: `https://api.normies.art/normie/${id}/image.png`,
      }
      setNormie(n)
      setMessages([{ role: "assistant", content: n.greeting }])
    } catch {
      setError("Failed to load. Try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    if (!draft.trim() || thinking) return
    const userMsg = draft.trim()
    const updated = [...messages, { role: "user", content: userMsg }]
    setMessages(updated)
    setDraft("")
    setThinking(true)
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          system: normie.systemPrompt,
          messages: updated.map(({ role, content }) => ({ role, content })),
        }),
      })
      const data = await res.json()
      const reply = data.content?.map(b => b.text || "").join("") || "..."
      setMessages([...updated, { role: "assistant", content: reply }])
    } catch {
      setMessages([...updated, { role: "assistant", content: "Signal lost. Try again." }])
    } finally {
      setThinking(false)
    }
  }

  if (loading) return (
    <div style={{ backgroundColor: "#07070e", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#a3ff47", fontFamily: "monospace", fontSize: "18px", textAlign: "center", padding: "0 1rem" }}>Loading Normie #{normieId}...</p>
    </div>
  )

  if (normie) return (
    <div style={{ backgroundColor: "#07070e", height: "100dvh", display: "flex", flexDirection: "column", fontFamily: "monospace" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderBottom: "1px solid #181830", background: "#0d0d1a", flexShrink: 0 }}>
        <img src={normie.imgUrl} alt={normie.name} style={{ width: "40px", height: "40px", imageRendering: "pixelated", borderRadius: "6px", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ color: "#a3ff47", margin: 0, fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{normie.name}</h2>
          <p style={{ color: "#5a5a7a", margin: 0, fontSize: "11px" }}>on-chain AI agent</p>
        </div>
        <button onClick={() => { setNormie(null); setMessages([]) }} style={{ background: "transparent", color: "#5a5a7a", border: "1px solid #252548", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontFamily: "monospace", fontSize: "11px", flexShrink: 0 }}>← Back</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "80%", padding: "10px 14px", borderRadius: "12px",
              background: m.role === "user" ? "#1a3a0a" : "#0d0d1a",
              border: `1px solid ${m.role === "user" ? "#2d5a10" : "#181830"}`,
              color: m.role === "user" ? "#a3ff47" : "#c0c0d4",
              fontSize: "14px", lineHeight: "1.6", wordBreak: "break-word"
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {thinking && (
          <div style={{ display: "flex" }}>
            <div style={{ padding: "10px 14px", background: "#0d0d1a", border: "1px solid #181830", borderRadius: "12px", color: "#5a5a7a", fontSize: "14px" }}>
              typing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: "8px", padding: "12px 16px", borderTop: "1px solid #181830", background: "#0d0d1a", flexShrink: 0 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder={`Message ${normie.name}...`}
          style={{ flex: 1, padding: "10px 12px", background: "#07070e", border: "1px solid #252548", borderRadius: "6px", color: "white", fontSize: "14px", minWidth: 0 }}
        />
        <button onClick={handleSend} disabled={thinking || !draft.trim()} style={{
          padding: "10px 16px", background: thinking ? "#2d5a10" : "#a3ff47",
          color: "#000", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", flexShrink: 0, fontSize: "13px"
        }}>
          SEND
        </button>
      </div>
    </div>
  )

  // HOME
  return (
    <div style={{ backgroundColor: "#07070e", minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "monospace", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
        <h1 style={{ color: "#a3ff47", fontSize: "clamp(28px, 8vw, 48px)", marginBottom: "8px" }}>NORMIE CHAT</h1>
        <p style={{ color: "#5a5a7a", marginBottom: "32px", fontSize: "13px", lineHeight: 1.6 }}>Talk to any of the 10,000 on-chain Normies</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
          <input
            type="number"
            placeholder="Enter Normie ID (0 - 9999)"
            value={normieId}
            onChange={e => setNormieId(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleConnect()}
            style={{ padding: "12px 16px", fontSize: "15px", borderRadius: "6px", border: "1px solid #252548", background: "#0d0d1a", color: "white", width: "100%", maxWidth: "300px" }}
          />
          {error && <p style={{ color: "#ff6b4a", fontSize: "12px", margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: "10px", width: "100%", maxWidth: "300px" }}>
            <button onClick={handleConnect} style={{ flex: 1, padding: "12px", background: "#a3ff47", color: "#000", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontFamily: "monospace", fontSize: "13px" }}>CONNECT</button>
            <button onClick={handleRandom} style={{ flex: 1, padding: "12px", background: "transparent", color: "white", border: "1px solid #252548", borderRadius: "6px", cursor: "pointer", fontFamily: "monospace", fontSize: "13px" }}>RANDOM</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App