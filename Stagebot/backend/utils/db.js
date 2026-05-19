// utils/db.js — MongoDB Atlas connection

const { MongoClient, ObjectId } = require('mongodb');

let client = null;
let db = null;

async function connect() {
  if (db) return db;
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db('pfe_ensem');
  console.log('✅ MongoDB connected');

  // Create indexes
  await db.collection('qa_pairs').createIndex({ question_fr: 'text', question_en: 'text', question_ar: 'text', answer_fr: 'text' });

  // Seed initial data if empty
  const count = await db.collection('qa_pairs').countDocuments();
  if (count === 0) await seedData(db);

  return db;
}

async function seedData(db) {
  const initial = [
    {
      question_fr: "Quelle est la durée d'un stage PFE ?",
      answer_fr: "La durée d'un stage de fin d'études (PFE) est généralement de 4 à 6 mois, selon le règlement de votre établissement. Il débute souvent en février ou mars et se termine en juillet ou août.",
      question_en: "What is the duration of a PFE internship?",
      answer_en: "A PFE internship typically lasts 4 to 6 months, depending on your institution's regulations. It usually starts in February or March and ends in July or August.",
      question_ar: "ما هي مدة تدريب نهاية الدراسة PFE؟",
      answer_ar: "تستغرق فترة تدريب نهاية الدراسة (PFE) عادةً من 4 إلى 6 أشهر، وفقاً للوائح مؤسستك. وتبدأ عادةً في فبراير أو مارس وتنتهي في يوليو أو أغسطس.",
      category: "general", featured: true,
    },
    {
      question_fr: "Comment trouver un stage PFE ?",
      answer_fr: "Pour trouver un stage PFE : 1) Consultez le bureau des stages de l'ENSEM, 2) Utilisez LinkedIn, Indeed, Welcome to the Jungle, 3) Contactez directement les entreprises, 4) Participez aux forums entreprises organisés par l'école.",
      question_en: "How to find a PFE internship?",
      answer_en: "To find a PFE internship: 1) Contact ENSEM's internship office, 2) Use LinkedIn, Indeed, Welcome to the Jungle, 3) Contact companies directly, 4) Attend career fairs organized by the school.",
      question_ar: "كيف أجد تدريب نهاية الدراسة؟",
      answer_ar: "للعثور على تدريب PFE: 1) تواصل مع مكتب التدريبات في ENSEM، 2) استخدم LinkedIn وIndeed، 3) تواصل مع الشركات مباشرة، 4) شارك في معارض التوظيف.",
      category: "recherche", featured: true,
    },
    {
      question_fr: "Quels documents dois-je préparer pour mon stage PFE ?",
      answer_fr: "Les documents nécessaires sont : la convention de stage (tripartite : école, étudiant, entreprise), le CV à jour, la lettre de motivation, l'attestation d'assurance responsabilité civile, et parfois un extrait de scolarité.",
      question_en: "What documents do I need for my PFE internship?",
      answer_en: "Required documents: internship agreement (tripartite: school, student, company), updated CV, cover letter, civil liability insurance certificate, and sometimes an enrollment certificate.",
      question_ar: "ما هي المستندات المطلوبة لتدريب PFE؟",
      answer_ar: "المستندات المطلوبة: اتفاقية التدريب (ثلاثية: المدرسة، الطالب، الشركة)، السيرة الذاتية المحدثة، خطاب التحفيز، شهادة التأمين.",
      category: "documents", featured: true,
    },
    {
      question_fr: "Comment rédiger le rapport de stage PFE ?",
      answer_fr: "Un rapport PFE contient : page de garde, remerciements, résumé, sommaire, introduction, présentation de l'entreprise, travail réalisé, conclusion et perspectives, bibliographie, annexes. Il doit être clair, structuré et professionnel.",
      question_en: "How to write a PFE internship report?",
      answer_en: "A PFE report includes: cover page, acknowledgments, abstract, table of contents, introduction, company presentation, work done, conclusion, bibliography, annexes.",
      question_ar: "كيف أكتب تقرير تدريب PFE؟",
      answer_ar: "يتضمن تقرير PFE: صفحة الغلاف، الشكر والتقدير، الملخص، الفهرس، المقدمة، تقديم الشركة، العمل المنجز، الخاتمة، المراجع.",
      category: "rapport", featured: true,
    },
    {
      question_fr: "Combien de pages doit faire le rapport de stage ?",
      answer_fr: "Le rapport de stage PFE fait généralement entre 60 et 100 pages, hors annexes. Certaines écoles imposent un nombre précis. Vérifiez les consignes de l'ENSEM auprès de votre encadrant.",
      question_en: "How many pages should the internship report have?",
      answer_en: "A PFE internship report is generally between 60 and 100 pages, excluding annexes. Check ENSEM's specific guidelines with your supervisor.",
      question_ar: "كم عدد صفحات تقرير التدريب؟",
      answer_ar: "يتراوح تقرير التدريب عادةً بين 60 و100 صفحة، دون الملاحق. تحقق من توجيهات ENSEM مع مشرفك.",
      category: "rapport", featured: false,
    },
    {
      question_fr: "Quand commencer à chercher un stage PFE ?",
      answer_fr: "Il est recommandé de commencer la recherche 6 mois avant le début du stage, soit en septembre-octobre pour un stage débutant en février-mars. Plus vous commencez tôt, plus vous avez de chances de trouver un bon stage.",
      question_en: "When should I start looking for a PFE internship?",
      answer_en: "It is recommended to start searching 6 months before the internship begins, i.e., in September-October for an internship starting in February-March.",
      question_ar: "متى أبدأ البحث عن تدريب PFE؟",
      answer_ar: "يُنصح ببدء البحث قبل 6 أشهر من بداية التدريب، أي في سبتمبر-أكتوبر لتدريب يبدأ في فبراير-مارس.",
      category: "recherche", featured: true,
    },
    {
      question_fr: "Le stage PFE est-il rémunéré ?",
      answer_fr: "En France, tout stage de plus de 2 mois est obligatoirement rémunéré avec une gratification minimale légale d'environ 600€/mois. Beaucoup d'entreprises offrent plus, surtout dans les secteurs techniques.",
      question_en: "Is the PFE internship paid?",
      answer_en: "In France, any internship longer than 2 months must be compensated with a minimum legal allowance of approximately €600/month. Many companies offer more, especially in technical sectors.",
      question_ar: "هل تدريب PFE مدفوع الأجر؟",
      answer_ar: "في فرنسا، يجب تعويض أي تدريب يتجاوز شهرين بحد أدنى قانوني يبلغ حوالي 600 يورو/شهر.",
      category: "general", featured: true,
    },
    {
      question_fr: "Comment se déroule la soutenance PFE ?",
      answer_fr: "La soutenance PFE dure généralement 45 minutes à 1h : 20-30 min de présentation, puis questions du jury (encadrant école + tuteur entreprise + autres membres). Elle se déroule à l'ENSEM ou en visioconférence.",
      question_en: "How does the PFE defense work?",
      answer_en: "The PFE defense lasts 45 minutes to 1 hour: 20-30 min presentation, then jury questions (school supervisor + company tutor + other members). It takes place at ENSEM or via videoconference.",
      question_ar: "كيف تجري مناقشة التدريب PFE؟",
      answer_ar: "تستغرق المناقشة 45 دقيقة إلى ساعة: عرض 20-30 دقيقة، ثم أسئلة من اللجنة. تُعقد في ENSEM أو عبر مؤتمر الفيديو.",
      category: "soutenance", featured: true,
    },
  ];

  await db.collection('qa_pairs').insertMany(initial);
  console.log('✅ Initial Q/A data seeded');
}

function getDb() { return db; }
function getObjectId(id) { return new ObjectId(id); }

module.exports = { connect, getDb, getObjectId };
