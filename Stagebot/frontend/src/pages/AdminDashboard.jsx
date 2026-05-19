// src/pages/AdminDashboard.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LangSwitcher from '../components/LangSwitcher';
import {
  adminGetQA, adminAddQA, adminUpdateQA, adminDeleteQA,
  adminToggleFeatured, clearAdminToken, getAdminToken
} from '../utils/api';
import './AdminDashboard.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const EMPTY_FORM = {
  question_fr: '', answer_fr: '',
  question_en: '', answer_en: '',
  question_ar: '', answer_ar: '',
  category: 'general', featured: false,
};

// ── Q/R Modal ─────────────────────────────────────────────────────────────────
function QAModal({ initial, onSave, onClose, t }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const isEdit = !!initial?._id;
  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? t('modal_edit_title') : t('modal_add_title')}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-grid">
            <div className="modal-field modal-field--full">
              <label className="modal-label">{t('modal_q_fr')}</label>
              <input className="modal-input" value={form.question_fr} onChange={e => set('question_fr', e.target.value)} />
            </div>
            <div className="modal-field modal-field--full">
              <label className="modal-label">{t('modal_r_fr')}</label>
              <textarea className="modal-textarea" value={form.answer_fr} onChange={e => set('answer_fr', e.target.value)} />
            </div>
            <div className="modal-field">
              <label className="modal-label">{t('modal_q_en')}</label>
              <input className="modal-input" value={form.question_en} onChange={e => set('question_en', e.target.value)} />
            </div>
            <div className="modal-field">
              <label className="modal-label">{t('modal_r_en')}</label>
              <textarea className="modal-textarea" value={form.answer_en} onChange={e => set('answer_en', e.target.value)} />
            </div>
            <div className="modal-field">
              <label className="modal-label">{t('modal_q_ar')}</label>
              <input className="modal-input" dir="rtl" value={form.question_ar} onChange={e => set('question_ar', e.target.value)} />
            </div>
            <div className="modal-field">
              <label className="modal-label">{t('modal_r_ar')}</label>
              <textarea className="modal-textarea" dir="rtl" value={form.answer_ar} onChange={e => set('answer_ar', e.target.value)} />
            </div>
            <div className="modal-field">
              <label className="modal-label">{t('modal_category')}</label>
              <input className="modal-input" value={form.category} onChange={e => set('category', e.target.value)} />
            </div>
          </div>
          <div className="modal-featured-row">
            <label className="modal-toggle">
              <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} />
              <span className="modal-toggle-slider" />
            </label>
            <span className="modal-featured-label">{t('modal_featured')}</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-cancel-btn" onClick={onClose}>{t('modal_cancel')}</button>
          <button className="modal-save-btn" onClick={() => onSave(form)}>{t('modal_save')}</button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteModal({ qa, onConfirm, onClose, t }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box delete-modal">
        <div className="modal-header">
          <h2 className="modal-title">{t('delete_title')}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="delete-modal-body">
          <p className="delete-modal-q">{qa.question_fr}</p>
        </div>
        <div className="delete-modal-footer">
          <button className="modal-cancel-btn" onClick={onClose}>{t('delete_cancel')}</button>
          <button className="delete-confirm-btn" onClick={onConfirm}>{t('delete_confirm')}</button>
        </div>
      </div>
    </div>
  );
}

// ── Document Upload Section ───────────────────────────────────────────────────
function DocumentSection({ token }) {
  const [docInfo, setDocInfo]     = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const fileRef = useRef();

  useEffect(() => { loadDocInfo(); }, []);

  async function loadDocInfo() {
    try {
      const res = await fetch(`${BASE_URL}/knowledge`);
      const data = await res.json();
      setDocInfo(data);
    } catch {}
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('document', file);

    try {
      const res = await fetch(`${BASE_URL}/admin/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setSuccess(`✅ Document "${data.filename}" importé avec succès ! (${data.wordCount} mots)`);
      loadDocInfo();
    } catch (err) {
      setError(`❌ Erreur : ${err.message}`);
    } finally {
      setUploading(false);
      fileRef.current.value = '';
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer le document importé ?')) return;
    try {
      await fetch(`${BASE_URL}/admin/document`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocInfo({ hasDocument: false });
      setSuccess('Document supprimé.');
    } catch {}
  }

  return (
    <div className="doc-section">
      <div className="doc-header">
        <div>
          <h2 className="doc-title">📄 Document de référence</h2>
          <p className="doc-desc">
            Importez un fichier Word (.docx) — le chatbot répondra <strong>uniquement</strong> à partir de ce document et des Q/R ci-dessous.
          </p>
        </div>
        <div className="doc-actions">
          <input
            ref={fileRef}
            type="file"
            accept=".docx"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
          <button
            className="doc-upload-btn"
            onClick={() => fileRef.current.click()}
            disabled={uploading}
          >
            {uploading ? '⏳ Importation...' : '⬆ Importer un fichier Word'}
          </button>
        </div>
      </div>

      {/* Status du document */}
      {docInfo?.hasDocument ? (
        <div className="doc-status doc-status--active">
          <span>✅ Document actif : <strong>{docInfo.filename}</strong> ({docInfo.wordCount} mots)</span>
          <button className="doc-delete-btn" onClick={handleDelete}>🗑 Supprimer</button>
        </div>
      ) : (
        <div className="doc-status doc-status--empty">
          ⚠️ Aucun document importé — le chatbot utilise uniquement les Q/R manuelles
        </div>
      )}

      {error   && <div className="doc-msg doc-msg--error">{error}</div>}
      {success && <div className="doc-msg doc-msg--success">{success}</div>}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [qaList, setQaList]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [selected, setSelected] = useState(null);
  const token = getAdminToken();

  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
    loadQA();
  }, []);

  async function loadQA() {
    try {
      const data = await adminGetQA();
      setQaList(data);
    } catch {
      navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearAdminToken();
    navigate('/admin/login');
  }

  async function handleSave(form) {
    try {
      if (selected?._id) await adminUpdateQA(selected._id, form);
      else await adminAddQA(form);
      setModal(null);
      setSelected(null);
      loadQA();
    } catch (err) { alert(err.message); }
  }

  async function handleDelete() {
    try {
      await adminDeleteQA(selected._id);
      setModal(null);
      setSelected(null);
      loadQA();
    } catch (err) { alert(err.message); }
  }

  async function toggleFeatured(qa) {
    try {
      await adminToggleFeatured(qa._id, !qa.featured);
      loadQA();
    } catch {}
  }

  const stats = {
    total: qaList.length,
    featured: qaList.filter(q => q.featured).length,
    categories: new Set(qaList.map(q => q.category)).size,
  };

  return (
    <div className="admin-root">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <a href="/chat" className="admin-back-btn">← {t('admin_back_chat')}</a>
          <div className="admin-header-title-wrap">
            <p className="admin-header-section">ADMINISTRATION</p>
            <h1 className="admin-header-title">{t('admin_dashboard_title')}</h1>
          </div>
        </div>
        <div className="admin-header-right">
          <LangSwitcher />
          <button className="admin-logout-btn" onClick={logout}>→ {t('admin_logout')}</button>
        </div>
      </header>

      <main className="admin-main">
        {/* Stats */}
        <div className="admin-stats">
          <div className="admin-stat">
            <p className="admin-stat-label">{t('admin_total')}</p>
            <p className="admin-stat-value">{stats.total}</p>
          </div>
          <div className="admin-stat">
            <p className="admin-stat-label">{t('admin_featured')}</p>
            <p className="admin-stat-value">{stats.featured}</p>
          </div>
          <div className="admin-stat">
            <p className="admin-stat-label">{t('admin_categories')}</p>
            <p className="admin-stat-value">{stats.categories}</p>
          </div>
        </div>

        {/* Document Upload */}
        <DocumentSection token={token} />

        {/* Q/A Table */}
        <div className="admin-qa-section">
          <div className="admin-qa-header">
            <h2 className="admin-qa-title">Questions / Réponses</h2>
            <button className="admin-add-btn" onClick={() => { setSelected(null); setModal('add'); }}>
              {t('admin_add')}
            </button>
          </div>

          {loading ? (
            <p style={{ padding: '2rem', color: '#8aa0b8', textAlign: 'center' }}>Chargement...</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin_table_q')}</th>
                  <th>{t('admin_table_cat')}</th>
                  <th style={{ textAlign: 'center' }}>{t('admin_table_featured')}</th>
                  <th style={{ textAlign: 'right' }}>{t('admin_table_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {qaList.map(qa => (
                  <tr key={qa._id}>
                    <td>
                      <p className="admin-table-q">{qa.question_fr}</p>
                      <p className="admin-table-r">{qa.answer_fr?.slice(0, 90)}…</p>
                    </td>
                    <td><span className="admin-cat-badge">{qa.category}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="admin-star-btn" onClick={() => toggleFeatured(qa)}>
                        {qa.featured ? '⭐' : '☆'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="admin-action-btn" onClick={() => { setSelected(qa); setModal('edit'); }}>✏️</button>
                      <button className="admin-action-btn admin-action-btn--delete" onClick={() => { setSelected(qa); setModal('delete'); }}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {(modal === 'add' || modal === 'edit') && (
        <QAModal
          initial={modal === 'edit' ? selected : null}
          onSave={handleSave}
          onClose={() => { setModal(null); setSelected(null); }}
          t={t}
        />
      )}

      {modal === 'delete' && selected && (
        <DeleteModal
          qa={selected}
          onConfirm={handleDelete}
          onClose={() => { setModal(null); setSelected(null); }}
          t={t}
        />
      )}
    </div>
  );
}
