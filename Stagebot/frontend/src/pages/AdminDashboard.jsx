// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LangSwitcher from '../components/LangSwitcher';
import EnsemLogo from '../components/EnsemLogo';
import {
  adminGetQA, adminAddQA, adminUpdateQA, adminDeleteQA,
  adminToggleFeatured, clearAdminToken, getAdminToken
} from '../utils/api';
import './AdminDashboard.css';

const EMPTY_FORM = {
  question_fr: '', answer_fr: '',
  question_en: '', answer_en: '',
  question_ar: '', answer_ar: '',
  category: 'general', featured: false,
};

// ── Q/R Modal ───────────────────────────────────────────────────────────────
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
            {/* FR */}
            <div className="modal-field modal-field--full">
              <label className="modal-label">{t('modal_q_fr')}</label>
              <input className="modal-input" value={form.question_fr} onChange={e => set('question_fr', e.target.value)} />
            </div>
            <div className="modal-field modal-field--full">
              <label className="modal-label">{t('modal_r_fr')}</label>
              <textarea className="modal-textarea" value={form.answer_fr} onChange={e => set('answer_fr', e.target.value)} />
            </div>

            {/* EN */}
            <div className="modal-field">
              <label className="modal-label">{t('modal_q_en')}</label>
              <input className="modal-input" value={form.question_en} onChange={e => set('question_en', e.target.value)} />
            </div>
            <div className="modal-field">
              <label className="modal-label">{t('modal_r_en')}</label>
              <textarea className="modal-textarea" value={form.answer_en} onChange={e => set('answer_en', e.target.value)} />
            </div>

            {/* AR */}
            <div className="modal-field">
              <label className="modal-label">{t('modal_q_ar')}</label>
              <input className="modal-input" dir="rtl" value={form.question_ar} onChange={e => set('question_ar', e.target.value)} />
            </div>
            <div className="modal-field">
              <label className="modal-label">{t('modal_r_ar')}</label>
              <textarea className="modal-textarea" dir="rtl" value={form.answer_ar} onChange={e => set('answer_ar', e.target.value)} />
            </div>

            {/* Category */}
            <div className="modal-field">
              <label className="modal-label">{t('modal_category')}</label>
              <input className="modal-input" value={form.category} onChange={e => set('category', e.target.value)} />
            </div>
          </div>

          {/* Featured toggle */}
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

// ── Delete Modal ────────────────────────────────────────────────────────────
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

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [qaList, setQaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!getAdminToken()) { navigate('/admin/login'); return; }
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
      if (selected?._id) {
        await adminUpdateQA(selected._id, form);
      } else {
        await adminAddQA(form);
      }
      setModal(null);
      setSelected(null);
      loadQA();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete() {
    try {
      await adminDeleteQA(selected._id);
      setModal(null);
      setSelected(null);
      loadQA();
    } catch (err) {
      alert(err.message);
    }
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

      {/* Main */}
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

        {/* Q/A Table */}
        <div className="admin-qa-section">
          <div className="admin-qa-header">
            <h2 className="admin-qa-title">Questions</h2>
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
                    <td>
                      <span className="admin-cat-badge">{qa.category}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="admin-star-btn" onClick={() => toggleFeatured(qa)}>
                        {qa.featured ? '⭐' : '☆'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="admin-action-btn"
                        onClick={() => { setSelected(qa); setModal('edit'); }}
                        title="Modifier"
                      >✏️</button>
                      <button
                        className="admin-action-btn admin-action-btn--delete"
                        onClick={() => { setSelected(qa); setModal('delete'); }}
                        title="Supprimer"
                      >🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Modals */}
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
