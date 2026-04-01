import React, { useState, useCallback } from 'react';
import api from '../api';

export default function UploadLeads({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;

    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a CSV or Excel file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setError(null);
    setResults(null);

    try {
      const response = await api.post('/upload-leads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResults(response.data);
      if (onUploadSuccess) {
        onUploadSuccess(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [onUploadSuccess]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const downloadTemplate = useCallback(async () => {
    try {
      const response = await api.get('/upload-template', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lead-upload-template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download template');
    }
  }, []);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h3 style={s.title}>
          <span className="material-symbols-outlined" style={s.titleIcon}>upload_file</span>
          Upload Leads
        </h3>
        <p style={s.subtitle}>
          Import leads from CSV or Excel files. Supports Sales Navigator, HubSpot, and other formats.
        </p>
      </div>

      {/* Template Download */}
      <div style={s.templateSection}>
        <button 
          onClick={downloadTemplate}
          disabled={uploading}
          style={s.templateBtn}
        >
          <span className="material-symbols-outlined" style={s.btnIcon}>download</span>
          Download Template
        </button>
        <span style={s.templateHint}>
          Use our template to ensure proper field mapping
        </span>
      </div>

      {/* Upload Area */}
      <div
        style={{
          ...s.uploadArea,
          borderColor: dragActive ? 'var(--brand-gold)' : 'var(--border)',
          backgroundColor: dragActive ? 'var(--brand-gold-glow)' : 'transparent'
        }}
        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileSelect}
          style={s.fileInput}
          disabled={uploading}
        />
        
        <div style={s.uploadContent}>
          <span 
            className="material-symbols-outlined" 
            style={{ 
              ...s.uploadIcon, 
              color: uploading ? 'var(--brand-gold)' : 'var(--text3)',
              animation: uploading ? 'spin 1s linear infinite' : 'none',
            }}
          >
            {uploading ? 'sync' : 'cloud_upload'}
          </span>
          <p style={s.uploadText}>
            {uploading ? 'Processing...' : 'Drag & drop your file here or click to browse'}
          </p>
          <p style={s.uploadHint}>
            Supports CSV, XLS, XLSX files (max 10MB)
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={s.error}>
          <span className="material-symbols-outlined" style={s.errorIcon}>error</span>
          {error}
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div style={s.results}>
          <h4 style={s.resultsTitle}>Upload Results</h4>
          
          <div style={s.resultStats}>
            <div style={s.statItem}>
              <span className="material-symbols-outlined" style={s.statIcon}>check_circle</span>
              <div>
                <div style={s.statNumber}>{results.uploaded}</div>
                <div style={s.statLabel}>Leads Uploaded</div>
              </div>
            </div>
            
            {results.duplicates > 0 && (
              <div style={s.statItem}>
                <span className="material-symbols-outlined" style={{...s.statIcon, color: 'var(--orange)'}}>warning</span>
                <div>
                  <div style={s.statNumber}>{results.duplicates}</div>
                  <div style={s.statLabel}>Duplicates Skipped</div>
                </div>
              </div>
            )}
          </div>

          {results.duplicateEmails?.length > 0 && (
            <div style={s.duplicateList}>
              <h5 style={s.duplicateTitle}>Duplicate Emails:</h5>
              <div style={s.duplicateItems}>
                {results.duplicateEmails.map((email, i) => (
                  <span key={i} style={s.duplicateItem}>{email}</span>
                ))}
              </div>
            </div>
          )}

          {results.leads?.length > 0 && (
            <div style={s.newLeads}>
              <h5 style={s.newLeadsTitle}>New Leads Added:</h5>
              <div style={s.newLeadsList}>
                {results.leads.slice(0, 5).map((lead, i) => (
                  <div key={lead.id} style={s.newLeadItem}>
                    <span style={s.leadName}>{lead.name}</span>
                    <span style={s.leadEmail}>{lead.email}</span>
                    <span style={s.leadCompany}>{lead.company}</span>
                  </div>
                ))}
                {results.leads.length > 5 && (
                  <p style={s.moreText}>...and {results.leads.length - 5} more</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Supported Sources */}
      <div style={s.sourcesSection}>
        <h4 style={s.sourcesTitle}>Supported Sources</h4>
        <div style={s.sourcesGrid}>
          {[
            { name: 'Sales Navigator', icon: 'business', fields: 'name, email, company, title, location' },
            { name: 'HubSpot', icon: 'hub', fields: 'firstname, lastname, email, company, jobtitle' },
            { name: 'LinkedIn Sales', icon: 'group', fields: 'fullName, email, organization, position' },
            { name: 'Custom CSV', icon: 'upload_file', fields: 'Any field names (auto-mapped)' }
          ].map((source, i) => (
            <div key={i} style={s.sourceCard}>
              <span className="material-symbols-outlined" style={s.sourceIcon}>{source.icon}</span>
              <div style={s.sourceInfo}>
                <div style={s.sourceName}>{source.name}</div>
                <div style={s.sourceFields}>{source.fields}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  container: {
    background: 'linear-gradient(145deg, var(--bg2) 0%, var(--bg3) 100%)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '24px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text)',
    fontFamily: "'Outfit', sans-serif",
    marginBottom: '8px',
  },
  titleIcon: {
    fontSize: '20px',
    color: 'var(--brand-gold)',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text2)',
    lineHeight: '1.4',
    margin: 0,
  },
  templateSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    padding: '12px',
    background: 'var(--brand-gold-glow)',
    borderRadius: '8px',
    border: '1px solid rgba(201, 168, 76, 0.1)',
  },
  templateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: 'var(--brand-gold)',
    color: 'var(--bg-deepest)',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s var(--ease)',
  },
  btnIcon: {
    fontSize: '16px',
  },
  templateHint: {
    fontSize: '11px',
    color: 'var(--text3)',
    fontStyle: 'italic',
  },
  uploadArea: {
    border: '2px dashed var(--border)',
    borderRadius: '12px',
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s var(--ease)',
    position: 'relative',
    marginBottom: '20px',
  },
  fileInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
  },
  uploadContent: {
    pointerEvents: 'none',
  },
  uploadIcon: {
    fontSize: '48px',
    marginBottom: '12px',
    display: 'block',
  },
  uploadText: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text)',
    margin: '0 0 8px 0',
  },
  uploadHint: {
    fontSize: '12px',
    color: 'var(--text3)',
    margin: 0,
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    background: 'var(--red-bg)',
    border: '1px solid var(--red)',
    borderRadius: '8px',
    color: 'var(--red)',
    fontSize: '13px',
    marginBottom: '16px',
  },
  errorIcon: {
    fontSize: '18px',
  },
  results: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
  },
  resultsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text)',
    marginBottom: '16px',
  },
  resultStats: {
    display: 'flex',
    gap: '20px',
    marginBottom: '16px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statIcon: {
    fontSize: '24px',
    color: 'var(--green)',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: '800',
    color: 'var(--text)',
    fontFamily: "'Outfit', sans-serif",
  },
  statLabel: {
    fontSize: '11px',
    color: 'var(--text2)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  duplicateList: {
    background: 'var(--orange-bg)',
    border: '1px solid var(--orange)',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '16px',
  },
  duplicateTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--orange)',
    marginBottom: '8px',
  },
  duplicateItems: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  duplicateItem: {
    background: 'var(--bg2)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    color: 'var(--text3)',
    fontFamily: 'monospace',
  },
  newLeads: {
    background: 'var(--green-bg)',
    border: '1px solid var(--green)',
    borderRadius: '6px',
    padding: '12px',
  },
  newLeadsTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--green)',
    marginBottom: '8px',
  },
  newLeadsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  newLeadItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    background: 'var(--bg)',
    borderRadius: '4px',
    fontSize: '11px',
  },
  leadName: {
    fontWeight: '600',
    color: 'var(--text)',
    flex: 1,
  },
  leadEmail: {
    color: 'var(--text3)',
    flex: 1,
    textAlign: 'center',
  },
  leadCompany: {
    color: 'var(--brand-gold)',
    flex: 1,
    textAlign: 'right',
  },
  moreText: {
    fontSize: '11px',
    color: 'var(--text3)',
    fontStyle: 'italic',
    margin: '4px 0 0 0',
    textAlign: 'center',
  },
  sourcesSection: {
    marginTop: '24px',
  },
  sourcesTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text)',
    marginBottom: '12px',
  },
  sourcesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '12px',
  },
  sourceCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
  },
  sourceIcon: {
    fontSize: '20px',
    color: 'var(--brand-gold)',
  },
  sourceInfo: {},
  sourceName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text)',
  },
  sourceFields: {
    fontSize: '11px',
    color: 'var(--text3)',
    marginTop: '2px',
  },
};
