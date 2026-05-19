// routes/index.js — PFE ENSEM
// Le chatbot répond UNIQUEMENT depuis la base de données
// Si pas de réponse trouvée → message de contact personnalisé

const express  = require('express');
const https    = require('https');
const jwt      = require('jsonwebtoken');
const multer   = require('multer');
const mammoth  = require('mammoth');
const auth     = require('../middleware/auth');
const { getDb, getObjectId } = require('../utils/db');

const router = express.Router();

// ── Multer — upload Word en mémoire ──────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.originalname.endsWith('.docx')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers .docx sont acceptés'));
    }
  },
});

// ── Message si pas de réponse ─────────────────────────────────────────────────
const NOT_FOUND = `Je n'ai pas pu trouver une réponse à votre question dans ma base de données.

Merci de contacter le responsable de stage selon votre domaine de recherche :

📧 Département Sciences de l'Information → SAMIAMAZA@hotmail.fr
📧 Département Mécanique → mattiasbordron@hotmail.fr
📧 Département Génie Électrique → jean-philippeMARTIN@hotmail.fr`;

// ── Health ────────────────────────────────────────────────────────────────────
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Public: Get Q/A ───────────────────────────────────────────────────────────
router.get('/qa', async (req, res) => {
  try {
    const db = getDb();
    const qa = await db.collection('qa_pairs').find({}).toArray();
    res.json(qa);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Public: Get document knowledge base info ──────────────────────────────────
router.get('/knowledge', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('knowledge_base').findOne({ type: 'document' });
    res.json({
      hasDocument: !!doc,
      filename: doc?.filename || null,
      uploadedAt: doc?.uploadedAt || null,
      wordCount: doc?.text?.split(' ').length || 0,
    });
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

// ── Admin: Upload fichier Word ─────────────────────────────────────────────────
router.post('/admin/upload', auth, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }

    // Extraire le texte du fichier Word
    const result = await mammoth.extractRawText({ buffer: req.file.buffer });
    const text = result.value.trim();

    if (!text || text.length < 10) {
      return res.status(400).json({ error: 'Le document est vide ou illisible' });
    }

    const db = getDb();

    // Sauvegarder dans MongoDB (remplace l'ancien document)
    await db.collection('knowledge_base').replaceOne(
      { type: 'document' },
      {
        type: 'document',
        filename: req.file.originalname,
        text: text,
        uploadedAt: new Date(),
        wordCount: text.split(' ').length,
      },
      { upsert: true }
    );

    res.json({
      success: true,
      filename: req.file.originalname,
      wordCount: text.split(' ').length,
      preview: text.slice(0, 200) + '...',
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Supprimer le document ──────────────────────────────────────────────
router.delete('/admin/document', auth, async (req, res) => {
  try {
    const db = getDb();
    await db.collection('knowledge_base').deleteOne({ type: 'document' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Chat ──────────────────────────────────────────────────────────────────────
const conversations = new Map();

router.post('/chat', async (req, res) => {
  const { question, sessionId, lang = 'fr' } = req.body;

  if (!question?.trim()) {
    return res.status(400).json({ error: 'Question requise' });
  }

  const { GROQ_API_KEY, GROQ_MODEL } = process.env;

  if (!GROQ_API_KEY) {
    return res.json({ success: true, answer: NOT_FOUND, sessionId });
  }

  // ── Charger la base de connaissances ────────────────────────────────────────
  let knowledgeBase = '';

  try {
    const db = getDb();

    // 1. Q/R manuelles
    const qaList = await db.collection('qa_pairs').find({}).toArray();
    if (qaList.length > 0) {
      knowledgeBase += '=== QUESTIONS ET RÉPONSES ===\n\n';
      qaList.forEach((qa, i) => {
        knowledgeBase += `Q: ${qa.question_fr}\nR: ${qa.answer_fr}\n`;
        if (qa.question_en) knowledgeBase += `Q(EN): ${qa.question_en}\nR(EN): ${qa.answer_en}\n`;
        if (qa.question_ar) knowledgeBase += `Q(AR): ${qa.question_ar}\nR(AR): ${qa.answer_ar}\n`;
        knowledgeBase += '\n';
      });
    }

    // 2. Document Word uploadé
    const doc = await db.collection('knowledge_base').findOne({ type: 'document' });
    if (doc?.text) {
      knowledgeBase += '\n=== DOCUMENT DE RÉFÉRENCE ===\n\n';
      knowledgeBase += doc.text;
    }

  } catch (err) {
    console.error('Erreur chargement base:', err.message);
  }

  // Si aucune base de données disponible
  if (!knowledgeBase.trim()) {
    return res.json({ success: true, answer: NOT_FOUND, sessionId: sessionId || 'new' });
  }

  // ── Gestion session ──────────────────────────────────────────────────────────
  const sid = sessionId || `s_${Date.now()}`;
  if (!conversations.has(sid)) conversations.set(sid, []);
  const history = conversations.get(sid);

  history.push({ role: 'user', content: question.trim() });
  if (history.length > 10) history.splice(0, history.length - 10);

  // ── Prompt système STRICT ────────────────────────────────────────────────────
  const langLabel = lang === 'ar' ? 'arabe' : lang === 'en' ? 'anglais' : 'français';

  const systemPrompt = `Tu es l'assistant PFE de l'ENSEM Nancy (École Nationale Supérieure d'Électricité et de Mécanique).

RÈGLE ABSOLUE : Tu dois répondre UNIQUEMENT à partir des informations contenues dans la BASE DE CONNAISSANCES ci-dessous.
Tu n'as PAS le droit d'inventer, supposer ou utiliser des connaissances externes.
Tu n'es PAS un chatbot général — tu es spécialisé UNIQUEMENT sur le stage PFE ENSEM.

Si la question n'a PAS de réponse dans la base de connaissances, réponds EXACTEMENT avec ce message mot pour mot :
"${NOT_FOUND}"

RÈGLES SUPPLÉMENTAIRES :
- Sois tolérant avec les fautes d'orthographe et les reformulations
- Comprends l'intention de l'étudiant même si la question est mal formulée
- Réponds dans la langue de l'étudiant (actuellement : ${langLabel})
- Si la question est hors sujet (pas lié au PFE/stage), réponds avec le message NOT_FOUND
- Sois concis et précis

BASE DE CONNAISSANCES :
${knowledgeBase}`;

  // ── Appel Groq ───────────────────────────────────────────────────────────────
  const payload = JSON.stringify({
    model: GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
    ],
    temperature: 0.0, // 0 = réponses strictement basées sur le contexte
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

        if (parsed.error) {
          console.error('Erreur Groq:', parsed.error);
          return res.json({ success: true, answer: NOT_FOUND, sessionId: sid });
        }

        let answer = parsed.choices?.[0]?.message?.content || NOT_FOUND;

        // Vérification supplémentaire — si Groq répond quand même de sa tête
        // on détecte les réponses qui ne citent pas la base
        const reponseInvalide = [
          'je pense que',
          'généralement',
          'en général',
          'il est possible que',
          'cela dépend',
          'je suppose',
        ];

        // Si la réponse est très courte et ne vient clairement pas de la base
        if (answer.length < 20) {
          answer = NOT_FOUND;
        }

        history.push({ role: 'assistant', content: answer });

        res.json({ success: true, answer, sessionId: sid });

      } catch (e) {
        res.json({ success: true, answer: NOT_FOUND, sessionId: sid });
      }
    });
  });

  groqReq.on('error', () => {
    res.json({ success: true, answer: NOT_FOUND, sessionId: sid });
  });

  groqReq.setTimeout(30000, () => {
    groqReq.destroy();
    res.json({ success: true, answer: NOT_FOUND, sessionId: sid });
  });

  groqReq.write(payload);
  groqReq.end();
});

module.exports = router;

