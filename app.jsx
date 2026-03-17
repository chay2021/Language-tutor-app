import { useState, useEffect, useRef } from "react";
import { Send, BookOpen, Target, TrendingUp, MessageSquare, CheckCircle, BarChart3, Languages, Trash2, Clock } from "lucide-react";

const LanguageTutor = () => {
  const [selectedLanguage, setSelectedLanguage] = useState("spanish");
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userProfile, setUserProfile] = useState({
    proficiencyLevel: "Beginner", totalMessages: 0,
    vocabularyCount: [], grammarAccuracy: 0
  });
  const [learningGoals, setLearningGoals] = useState([
    { id: 1, text: "Master basic greetings", completed: false, progress: 20 },
    { id: 2, text: "Learn present tense verbs", completed: false, progress: 10 },
    { id: 3, text: "Expand food vocabulary", completed: false, progress: 0 }
  ]);
  const [feedback, setFeedback] = useState(null);
  const [showLessonMode, setShowLessonMode] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showSessions, setShowSessions] = useState(false);
  const [storageStatus, setStorageStatus] = useState("");
  const messagesEndRef = useRef(null);

  const languages = {
    spanish: { name: "Spanish (Español)", flag: "🇪🇸" },
    french: { name: "French (Français)", flag: "🇫🇷" },
    german: { name: "German (Deutsch)", flag: "🇩🇪" },
    japanese: { name: "Japanese (日本語)", flag: "🇯🇵" },
    italian: { name: "Italian (Italiano)", flag: "🇮🇹" },
    portuguese: { name: "Portuguese (Português)", flag: "🇵🇹" },
    chinese: { name: "Chinese (中文)", flag: "🇨🇳" },
    korean: { name: "Korean (한국어)", flag: "🇰🇷" }
  };

  // Load sessions list on mount
  useEffect(() => {
    loadSessionsList();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Auto-save whenever messages change (debounced)
  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => saveCurrentSession(), 1500);
    return () => clearTimeout(timer);
  }, [messages, learningGoals, userProfile]);

  const loadSessionsList = async () => {
    try {
      const result = await window.storage.list("session:");
      if (!result) return;
      const loaded = [];
      for (const key of result.keys) {
        try {
          const s = await window.storage.get(key);
          if (s) loaded.push(JSON.parse(s.value));
        } catch {}
      }
      loaded.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setSessions(loaded);
    } catch {}
  };

  const saveCurrentSession = async () => {
    if (messages.length === 0) return;
    setIsSaving(true);
    const sid = currentSessionId || `session:${Date.now()}`;
    if (!currentSessionId) setCurrentSessionId(sid);
    const session = {
      id: sid, language: selectedLanguage,
      messages, userProfile: { ...userProfile, vocabularyCount: [...userProfile.vocabularyCount] },
      learningGoals, updatedAt: new Date().toISOString(),
      title: `${languages[selectedLanguage].flag} ${languages[selectedLanguage].name} — ${new Date().toLocaleDateString()}`
    };
    try {
      await window.storage.set(sid, JSON.stringify(session));
      await loadSessionsList();
      setStorageStatus("Saved ✓");
      setTimeout(() => setStorageStatus(""), 2000);
    } catch {}
    setIsSaving(false);
  };

  const loadSession = async (session) => {
    setSelectedLanguage(session.language);
    setMessages(session.messages);
    setUserProfile({ ...session.userProfile, vocabularyCount: new Set(session.userProfile.vocabularyCount) });
    setLearningGoals(session.learningGoals);
    setCurrentSessionId(session.id);
    setFeedback(null);
    setShowSessions(false);
  };

  const deleteSession = async (e, sid) => {
    e.stopPropagation();
    try {
      await window.storage.delete(sid);
      if (sid === currentSessionId) startNewSession();
      await loadSessionsList();
    } catch {}
  };

  const startNewSession = () => {
    setMessages([]); setFeedback(null);
    setCurrentSessionId(null);
    setUserProfile({ proficiencyLevel: "Beginner", totalMessages: 0, vocabularyCount: new Set(), grammarAccuracy: 0 });
    setLearningGoals([
      { id: 1, text: "Master basic greetings", completed: false, progress: 20 },
      { id: 2, text: "Learn present tense verbs", completed: false, progress: 10 },
      { id: 3, text: "Expand food vocabulary", completed: false, progress: 0 }
    ]);
    setShowSessions(false);
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;
    const userMsg = { id: Date.now(), text: currentMessage, sender: "user", timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setCurrentMessage("");
    setIsLoading(true);
    try {
      const history = [...messages, userMsg];
      const level = history.length < 10 ? "Beginner" : history.length < 20 ? "Intermediate" : "Advanced";
      const prompt = `You are a friendly language tutor helping someone learn ${languages[selectedLanguage].name}.
The user typed in English. Translate it and provide romanization + pronunciation.
Conversation history: ${JSON.stringify(history.slice(-5).map(m => ({ sender: m.sender, text: m.text })))}
Current user message (English): "${currentMessage}"
User level: ${level}
Respond with ONLY valid JSON:
{
  "tutorResponse": "Romanized transliteration in English letters only (no native script)",
  "englishTranslation": "The English meaning",
  "pronunciation": "Syllable-by-syllable guide e.g. KOH-nee-chee-WAH",
  "nativeScript": "Native script version for reference",
  "feedback": {
    "positive": ["One encouraging note"],
    "corrections": [],
    "suggestions": ["One useful tip"]
  },
  "grammarAnalysis": { "accuracy": 85, "detectedLevel": "${level}", "strengths": ["something"], "improvements": ["something"] },
  "vocabularyUsed": ["key","words"],
  "progressNotes": "Brief encouragement"
}`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      const raw = data.content.map(b => b.text || "").join("");
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      const tutorMsg = {
        id: Date.now() + 1, sender: "tutor", timestamp: new Date().toISOString(),
        text: parsed.tutorResponse, englishTranslation: parsed.englishTranslation,
        pronunciation: parsed.pronunciation, nativeScript: parsed.nativeScript
      };
      setMessages(prev => [...prev, tutorMsg]);
      setFeedback(parsed.feedback);
      setUserProfile(prev => ({
        ...prev, totalMessages: prev.totalMessages + 1,
        proficiencyLevel: parsed.grammarAnalysis.detectedLevel,
        grammarAccuracy: parsed.grammarAnalysis.accuracy,
        vocabularyCount: new Set([...prev.vocabularyCount, ...parsed.vocabularyUsed])
      }));
    } catch {
      setMessages(prev => [...prev, { id: Date.now() + 1, text: "Sorry, I had trouble responding. Please try again!", sender: "tutor", timestamp: new Date().toISOString() }]);
    }
    setIsLoading(false);
  };

  const handleLanguageChange = (lang) => {
    setSelectedLanguage(lang);
    startNewSession();
  };

  const toggleGoal = (id) => {
    setLearningGoals(prev => prev.map(g => g.id === id ? { ...g, completed: !g.completed, progress: g.completed ? g.progress : 100 } : g));
  };

  const addGoal = () => {
    const text = prompt("Enter your learning goal:");
    if (text?.trim()) setLearningGoals(prev => [...prev, { id: Date.now(), text: text.trim(), completed: false, progress: 0 }]);
  };

  const getProficiencyColor = (level) => ({
    Beginner: "text-green-600 bg-green-100", Intermediate: "text-yellow-600 bg-yellow-100",
    Advanced: "text-red-600 bg-red-100"
  }[level] || "text-green-600 bg-green-100");

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sessions Panel */}
      {showSessions && (
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Clock className="h-4 w-4"/>Saved Sessions</h2>
            <button onClick={() => setShowSessions(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>
          <button onClick={startNewSession} className="m-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">+ New Session</button>
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center p-4">No saved sessions yet</p>
            ) : sessions.map(s => (
              <div key={s.id} onClick={() => loadSession(s)}
                className={`p-3 mx-2 mb-2 rounded-lg cursor-pointer border transition-colors hover:bg-blue-50 ${s.id === currentSessionId ? "border-blue-400 bg-blue-50" : "border-gray-100"}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.messages.length} messages · {s.userProfile.proficiencyLevel}</p>
                    <p className="text-xs text-gray-400">{new Date(s.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <button onClick={(e) => deleteSession(e, s.id)} className="ml-2 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-3">
              <button onClick={() => setShowSessions(!showSessions)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm text-gray-700 transition-colors">
                <Clock className="h-4 w-4"/> Sessions {sessions.length > 0 && <span className="bg-blue-600 text-white text-xs rounded-full px-1.5">{sessions.length}</span>}
              </button>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600"/>
                <h1 className="text-lg font-bold text-gray-800">Language Tutor</h1>
              </div>
              <select value={selectedLanguage} onChange={e => handleLanguageChange(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500">
                {Object.entries(languages).map(([code, l]) => <option key={code} value={code}>{l.flag} {l.name}</option>)}
              </select>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getProficiencyColor(userProfile.proficiencyLevel)}`}>
                {userProfile.proficiencyLevel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {storageStatus && <span className="text-xs text-green-600 font-medium">{storageStatus}</span>}
              {isSaving && <span className="text-xs text-gray-400">Saving…</span>}
              <button onClick={() => setShowLessonMode(!showLessonMode)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${showLessonMode ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
                {showLessonMode ? "Lesson Mode" : "Chat Mode"}
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">{languages[selectedLanguage].flag}</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Ready to practice {languages[selectedLanguage].name}?</h2>
              <p className="text-gray-500 text-sm">Type anything in English and I'll translate it with pronunciation!</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${msg.sender === "user" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-800"}`}>
                {msg.sender === "tutor" ? (
                  <div>
                    <p className="font-semibold text-blue-700 text-base">{msg.text}</p>
                    {msg.pronunciation && <p className="text-xs mt-1.5 text-purple-600 italic">🔊 {msg.pronunciation}</p>}
                    {msg.nativeScript && <p className="text-xs mt-1 text-gray-400">{msg.nativeScript}</p>}
                    <p className="text-xs mt-1.5 text-gray-500 border-t border-gray-100 pt-1.5">🇬🇧 {msg.englishTranslation}</p>
                  </div>
                ) : (
                  <p>{msg.text}</p>
                )}
                <p className={`text-xs mt-1 ${msg.sender === "user" ? "text-blue-200" : "text-gray-400"}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 0.1, 0.2].map((d, i) => <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }}/>)}
                </div>
                <span className="text-sm text-gray-500">Translating…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef}/>
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input type="text" value={currentMessage} onChange={e => setCurrentMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder={`Type in English → get ${languages[selectedLanguage].name} translation…`}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}/>
            <button onClick={sendMessage} disabled={isLoading || !currentMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <Send className="h-5 w-5"/>
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-72 bg-white border-l border-gray-200 flex flex-col">
        {/* Stats */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4"/>Progress</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Messages</span><span className="font-medium">{userProfile.totalMessages}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Vocabulary</span><span className="font-medium">{userProfile.vocabularyCount?.size || 0} words</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Accuracy</span><span className="font-medium">{userProfile.grammarAccuracy}%</span></div>
          </div>
        </div>

        {/* Goals */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Target className="h-4 w-4"/>Goals</h3>
            <button onClick={addGoal} className="text-blue-600 text-sm font-medium hover:text-blue-700">+ Add</button>
          </div>
          <div className="space-y-2">
            {learningGoals.map(g => (
              <div key={g.id} className="p-2 bg-gray-50 rounded-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${g.completed ? "line-through text-gray-400" : "text-gray-700"}`}>{g.text}</p>
                    <div className="mt-1">
                      <div className="flex justify-between text-xs text-gray-400 mb-0.5"><span>Progress</span><span>{g.progress}%</span></div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${g.progress}%` }}/>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => toggleGoal(g.id)} className="mt-0.5 shrink-0">
                    {g.completed ? <CheckCircle className="h-4 w-4 text-green-600"/> : <div className="h-4 w-4 border-2 border-gray-300 rounded-full"/>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4"/>Feedback</h3>
            {feedback.positive?.length > 0 && feedback.positive.map((item, i) => (
              <p key={i} className="text-sm text-green-700 bg-green-50 p-2 rounded mb-1">{item}</p>
            ))}
            {feedback.corrections?.length > 0 && feedback.corrections.map((item, i) => (
              <p key={i} className="text-sm text-orange-700 bg-orange-50 p-2 rounded mb-1">{item}</p>
            ))}
            {feedback.suggestions?.length > 0 && feedback.suggestions.map((item, i) => (
              <p key={i} className="text-sm text-blue-700 bg-blue-50 p-2 rounded mb-1">{item}</p>
            ))}
          </div>
        )}

        {/* Session info */}
        <div className="p-4 mt-auto">
          <div className="text-xs text-gray-400 text-center">
            {currentSessionId ? "Session auto-saves after each message" : "Start chatting to create a session"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageTutor;