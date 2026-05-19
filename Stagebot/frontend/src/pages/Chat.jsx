// src/pages/Chat.jsx
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import EnsemLogo from '../components/EnsemLogo';
import LangSwitcher from '../components/LangSwitcher';
import { sendMessage, getQA } from '../utils/api';
import './Chat.css';

const SESSION_KEY = 'pfe_session_id';
const HISTORY_KEY = 'pfe_chat_history';

function TypingIndicator() {
  return (
    <div className="msg-row msg-row--bot">
      <div className="typing-bubble">
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
    </div>
  );
}

export default function Chat() {
  const { t, i18n } = useTranslation();
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [qaList, setQaList]     = useState([]);
  const endRef = useRef(null);
  const sessionRef = useRef(localStorage.getItem(SESSION_KEY) || null);

  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch { return []; }
  });

  // Save history
  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
  }, [messages]);

  // Load popular Q/A for sidebar
  useEffect(() => {
    getQA().then(data => setQaList(data.filter(q => q.featured))).catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text) {
    const trimmed = text?.trim();
    if (!trimmed || loading) return;
    setInput('');
    setLoading(true);

    const userMsg = { role: 'user', content: trimmed, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const data = await sendMessage(trimmed, sessionRef.current, i18n.language);
      if (data.sessionId) {
        sessionRef.current = data.sessionId;
        localStorage.setItem(SESSION_KEY, data.sessionId);
      }
      setMessages(prev => [...prev, {
        role: 'bot',
        content: data.answer,
        id: Date.now() + 1,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: t('not_found_msg'),
        id: Date.now() + 1,
      }]);
    } finally {
      setLoading(false);
    }
  }
  // Fonction spéciale pour les clics sur la sidebar
// Envoie directement la réponse depuis la BDD sans passer par Groq
async function sendFromQA(qa) {
  const question = getQLabel(qa);
  const answer = lang === 'en' && qa.answer_en ? qa.answer_en 
               : lang === 'ar' && qa.answer_ar ? qa.answer_ar 
               : qa.answer_fr;

  // Ajouter question + réponse directement dans le chat
  setMessages(prev => [
    ...prev,
    { role: 'user', content: question, id: Date.now() },
    { role: 'bot', content: answer, id: Date.now() + 1 },
  ]);
}

  function reset() {
    setMessages([]);
    sessionRef.current = null;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(HISTORY_KEY);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  // Get questions in current language
  function getQLabel(qa) {
    const lang = i18n.language;
    if (lang === 'en' && qa.question_en) return qa.question_en;
    if (lang === 'ar' && qa.question_ar) return qa.question_ar;
    return qa.question_fr;
  }

  // Featured questions for empty state grid
  const featured = qaList.slice(0, 4);

  return (
    <div className="chat-root">
      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-left">
          <a href="/" className="chat-back-btn">← {t('nav_back')}</a>
          <div className="chat-divider" />
          <div className="chat-header-logo">
            <EnsemLogo size={28} />
            <span className="chat-header-title">{t('chat_title')}</span>
          </div>
        </div>
        <div className="chat-header-right">
          <LangSwitcher />
          <button className="chat-new-btn" onClick={reset}>+ {t('nav_new_conv')}</button>
        </div>
      </header>

      {/* Body */}
      <div className="chat-body">
        {/* Sidebar */}
        <aside className="chat-sidebar">
          <p className="chat-sidebar-label">{t('chat_popular')}</p>
          {qaList.map(qa => (
            <button
              key={qa._id}
              className="chat-sidebar-item"
              onClick={() => sendFromQA(qa)}
            >
              {getQLabel(qa)}
            </button>
          ))}
        </aside>

        {/* Main */}
        <main className="chat-main">
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">
                <div className="chat-empty-icon">✦</div>
                <h2 className="chat-empty-title">{t('chat_welcome')}</h2>
                <p className="chat-empty-sub">{t('chat_welcome_sub')}</p>
                {featured.length > 0 && (
                  <div className="chat-suggestions-grid">
                    {featured.map(qa => (
                      <button
                        key={qa._id}
                        className="chat-suggestion-card"
                        onClick={() => sendFromQA(qa)}
                      >
                        {getQLabel(qa)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`msg-row msg-row--${msg.role === 'user' ? 'user' : 'bot'}`}>
                <div className={`msg-bubble msg-bubble--${msg.role === 'user' ? 'user' : msg.role === 'error' ? 'error' : 'bot'}`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && <TypingIndicator />}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <form className="chat-input-area" onSubmit={e => { e.preventDefault(); send(input); }}>
            <textarea
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={t('chat_placeholder')}
              rows={1}
              disabled={loading}
            />
            <button className="chat-send-btn" type="submit" disabled={!input.trim() || loading}>
              📤 {t('chat_send')}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
