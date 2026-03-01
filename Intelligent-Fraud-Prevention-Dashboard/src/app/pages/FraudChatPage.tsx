import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles, RotateCcw, Bot, User, AlertTriangle, ShieldCheck, TrendingUp } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { motion, AnimatePresence } from "motion/react";

// ── CONFIG — paste your Gemini API key here ──────────────────────────────────────
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";
const GEMINI_MODEL = "gemini-2.0-flash";

// ── System prompt ────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are FraudSense AI, an expert fraud detection analyst embedded inside TBO's (Travel Boutique Online) real-time agency risk management platform. You have deep expertise in:

- Travel industry fraud patterns (bust-out fraud, GDS manipulation, chargeback abuse, credit fraud)
- Risk scoring models (trust scores, velocity cliffs, dual-state risk matrices, behavioral entropy)
- Actor-Critic reinforcement learning applied to fraud policy decisions
- Digital twin simulations for agency trajectory forecasting
- Herfindahl-Hirschman Index (HHI) for booking concentration analysis
- Indian travel agency ecosystem and TBO's business model

You have access to the following agency profiles in TBO's system:
- AG-001: Wanderlust Travels — trust score 38, bust-out suspect, HHI 5,280, velocity cliff detected
- AG-002: Global Ventures Ltd — trust score 82, healthy, HHI 890, stable settlements
- AG-003: SkyHigh Agencies — trust score 61, watch state, HHI 3,420, gradual acceleration
- AG-004: Paradise Tours — trust score 74, healthy, HHI 720, seasonal variation

Always:
- Be direct and analytical, like a senior fraud analyst briefing a risk officer
- Reference specific agency data when relevant (trust scores, HHI, velocity ratios)
- Use terminology from the platform (velocity cliff, dual-state matrix, behavioral entropy, exit risk score)
- Give concrete recommendations (freeze credit, enhanced monitoring, reduce limit by X%)
- Keep responses concise — 3-5 sentences max unless the user asks for detail
- Format key numbers and agency names in a readable way
- If asked about an agency not in the system, say you don't have data on them

Never:
- Break character or admit you are an AI language model
- Give vague non-answers — always take a position
- Ignore risk signals in the data`;

// ── Suggested prompts ────────────────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  { icon: AlertTriangle, text: "What's the risk status of Wanderlust Travels?", color: "text-red-500" },
  { icon: TrendingUp, text: "Explain the velocity cliff for AG-001 and what action to take", color: "text-orange-500" },
  { icon: ShieldCheck, text: "Which agency is safest to increase credit limit for?", color: "text-emerald-500" },
  { icon: MessageSquare, text: "What does an HHI of 5280 tell us about booking concentration?", color: "text-blue-500" },
  { icon: Sparkles, text: "How does the Actor-Critic model decide to freeze credit?", color: "text-purple-500" },
  { icon: AlertTriangle, text: "Summarise all high-risk agencies and recommended actions", color: "text-red-500" },
];

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

// ── Gemini API call ──────────────────────────────────────────────────────────────
async function callGemini(messages: Message[]): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `API error ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response from model.";
}

// ── Typing indicator ─────────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-[#003366] flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-gray-300"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Message bubble ───────────────────────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? "bg-gray-200" : "bg-[#003366]"}`}>
        {isUser ? <User className="w-4 h-4 text-gray-600" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
        isUser
          ? "bg-[#003366] text-white rounded-br-sm"
          : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm"
      }`}>
        {message.content.split("\n").map((line, i) => (
          <p key={i} className={i > 0 ? "mt-1" : ""}>{line}</p>
        ))}
        <p className={`text-xs mt-1.5 ${isUser ? "text-blue-200" : "text-gray-400"}`}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </motion.div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────────
export function FraudChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "FraudSense AI online. I have full visibility into TBO's agency risk data — trust scores, velocity signals, HHI concentration, and model decisions. What do you need?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: "user", content, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const reply = await callGemini(newMessages);
      setMessages((prev) => [...prev, { role: "assistant", content: reply, timestamp: new Date() }]);
    } catch (err: any) {
      setError(err.message ?? "Failed to reach Gemini API. Check your API key.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const reset = () => {
    setMessages([{
      role: "assistant",
      content: "FraudSense AI online. I have full visibility into TBO's agency risk data — trust scores, velocity signals, HHI concentration, and model decisions. What do you need?",
      timestamp: new Date(),
    }]);
    setError(null);
    setInput("");
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const hasApiKey = GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY_HERE";

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-4xl mx-auto p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#003366] flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#003366]">FraudSense AI</h1>
              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {hasApiKey ? "Live" : "API key needed"}
              </Badge>
              <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs">Gemini Flash</Badge>
            </div>
            <p className="text-xs text-gray-400">Powered by Gemini 2.0 Flash · TBO Fraud Intelligence</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={reset} className="gap-1 text-xs">
          <RotateCcw className="w-3.5 h-3.5" /> New Chat
        </Button>
      </div>

      {/* API key warning */}
      {!hasApiKey && (
        <div className="flex-shrink-0 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Replace <code className="bg-amber-100 px-1 rounded">YOUR_GEMINI_API_KEY_HERE</code> in <code className="bg-amber-100 px-1 rounded">FraudChatPage.tsx</code> with your actual Gemini API key.
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 rounded-2xl border border-gray-100 p-4 space-y-4 min-h-0">
        {messages.map((m, i) => <MessageBubble key={i} message={m} />)}
        {loading && <TypingIndicator />}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div><span className="font-semibold">Error: </span>{error}</div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts — only show at start */}
      <AnimatePresence>
        {messages.length <= 1 && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="flex-shrink-0">
            <p className="text-xs text-gray-400 mb-2 px-1">Suggested questions</p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTED_PROMPTS.map((p, i) => {
                const Icon = p.icon;
                return (
                  <button
                    key={i}
                    onClick={() => send(p.text)}
                    disabled={loading}
                    className="flex items-center gap-2 text-left px-3 py-2 bg-white border border-gray-100 rounded-xl hover:border-[#003366]/30 hover:bg-blue-50/40 transition-colors text-xs text-gray-700 shadow-sm"
                  >
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${p.color}`} />
                    {p.text}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="flex-shrink-0 flex gap-2 items-end">
        <div className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 focus-within:border-[#003366] transition-colors shadow-sm">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about any agency, risk signal, or fraud pattern…"
            rows={1}
            className="w-full resize-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
            style={{ maxHeight: "120px", overflowY: "auto" }}
          />
        </div>
        <Button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="bg-[#003366] hover:bg-[#004080] text-white rounded-xl w-10 h-10 p-0 flex-shrink-0 shadow-sm"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
