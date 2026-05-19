// routes/index.js — All routes

const express = require('express');
const https   = require('https');
const jwt     = require('jsonwebtoken');
const auth    = require('../middleware/auth');
const { getDb, getObjectId } = require('../utils/db');

const router = express.Router();

// ── Health ───────────────────────────────────────────────────────────────────
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Public: Get featured Q/A (for sidebar + suggestions) ─────────────────────
router.get('/qa', async (req, res) => {
  try {
    const db = getDb();
    const qa = await db.collection('qa_pairs').find({}).toArray();
    res.json(qa);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Login ───────────────────────────────────────────────────────────────
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (
    email    === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign(
      { email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({ token });
  }
  res.status(401).json({ error: 'Email ou mot de passe incorrect' });
});

// ── Admin: Get all Q/A ────────────────────────────────────────────────────────
router.get('/admin/qa', auth, async (req, res) => {
  try {
    const db = getDb();
    const qa = await db.collection('qa_pairs').find({}).sort({ _id: -1 }).toArray();
    res.json(qa);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Add Q/A ────────────────────────────────────────────────────────────
router.post('/admin/qa', auth, async (req, res) => {
  try {
    const db = getDb();
    const doc = {
      question_fr: req.body.question_fr || '',
      answer_fr:   req.body.answer_fr   || '',
      question_en: req.body.question_en || '',
      answer_en:   req.body.answer_en   || '',
      question_ar: req.body.question_ar || '',
      answer_ar:   req.body.answer_ar   || '',
      category:    req.body.category    || 'general',
      featured:    req.body.featured    || false,
      createdAt:   new Date(),
    };
    if (!doc.question_fr || !doc.answer_fr) {
      return res.status(400).json({ error: 'Question et réponse en français obligatoires' });
    }
    const result = await db.collection('qa_pairs').insertOne(doc);
    res.json({ _id: result.insertedId, ...doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Update Q/A ─────────────────────────────────────────────────────────
router.put('/admin/qa/:id', auth, async (req, res) => {
  try {
    const db = getDb();
    const { _id, ...update } = req.body;
    update.updatedAt = new Date();
    await db.collection('qa_pairs').updateOne(
      { _id: getObjectId(req.params.id) },
      { $set: update }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Delete Q/A ─────────────────────────────────────────────────────────
router.delete('/admin/qa/:id', auth, async (req, res) => {
  try {
    const db = getDb();
    await db.collection('qa_pairs').deleteOne({ _id: getObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Chat — Groq avec base de données ─────────────────────────────────────────
const conversations = new Map();

const NOT_FOUND = `Je n'ai pas pu trouver une réponse à votre question.

Merci de contacter le responsable de stage selon votre domaine :

📧 Sciences de l'Information → SAMIAMAZA@hotmail.fr
📧 Mécanique → mattiasbordron@hotmail.fr
📧 Génie Électrique → jean-philippeMARTIN@hotmail.fr`;

router.post('/chat', async (req, res) => {
  const { question, sessionId, lang = 'fr' } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'Question requise' });

  const { GROQ_API_KEY, GROQ_MODEL } = process.env;
  if (!GROQ_API_KEY) return res.json({ success: true, answer: NOT_FOUND, sessionId });

  // Load all Q/A from DB to inject in system prompt
  let knowledgeBase = '';
  try {
    const db = getDb();
    const qa = await db.collection('qa_pairs').find({}).toArray();
    knowledgeBase = qa.map((q, i) =>
      `Q${i+1}: ${q.question_fr}\nR${i+1}: ${q.answer_fr}`
    ).join('\n\n');
  } catch {}

  const sid = sessionId || `s_${Date.now()}`;
  if (!conversations.has(sid)) conversations.set(sid, []);
  const history = conversations.get(sid);

  history.push({ role: 'user', content: question.trim() });
  if (history.length > 20) history.splice(0, history.length - 20);

  const systemPrompt = `Tu es l'assistant PFE ENSEM de l'École Nationale Supérieure d'Électricité et de Mécanique de Nancy.
Tu aides les étudiants de 3ème année concernant leur stage de fin d'études (PFE).
Réponds UNIQUEMENT à partir de la base de connaissances ci-dessous.
Si la question n'est pas dans la base, réponds EXACTEMENT : "${NOT_FOUND}"
Sois tolérant avec les fautes d'orthographe. Réponds dans la langue de l'utilisateur (${lang === 'ar' ? 'arabe' : lang === 'en' ? 'anglais' : 'français'}).

BASE DE CONNAISSANCES:
${knowledgeBase}`;

  const payload = JSON.stringify({
    model: GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [{ role: 'system', content: systemPrompt }, ...history],
    temperature: 0.1,
    max_tokens: 1024,
  });

  const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  const groqReq = https.request(options, groqRes => {
    let data = '';
    groqRes.on('data', c => data += c);
    groqRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) return res.json({ success: true, answer: NOT_FOUND, sessionId: sid });
        const answer = parsed.choices?.[0]?.message?.content || NOT_FOUND;
        history.push({ role: 'assistant', content: answer });
        res.json({ success: true, answer, sessionId: sid });
      } catch {
        res.json({ success: true, answer: NOT_FOUND, sessionId: sid });
      }
    });
  });

  groqReq.on('error', () => res.json({ success: true, answer: NOT_FOUND, sessionId: sid }));
  groqReq.setTimeout(30000, () => { groqReq.destroy(); res.json({ success: true, answer: NOT_FOUND, sessionId: sid }); });
  groqReq.write(payload);
  groqReq.end();
});

module.exports = router;
