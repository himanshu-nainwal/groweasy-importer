'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import Navbar from './components/Navbar';
import ThreeFunnel from './components/ThreeFunnel';
import PreviewTable from './components/PreviewTable';
import ConveyorBelt from './components/ConveyorBelt';
import ResultsDashboard from './components/ResultsDashboard';
import CommandPalette from './components/CommandPalette';
import { LeadRecord, SkippedRecord, JobProgress } from '@/lib/types';
import { facebookLeadsDemo, messyManualLeadsDemo, realestateLeadsDemo } from '@/lib/mockData';
import Papa from 'papaparse';

type UploadState = 'idle' | 'parsed' | 'processing' | 'completed' | 'failed';

export default function ImporterPage() {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [fileName, setFileName] = useState('');
  const [jobId, setJobId] = useState('');
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [importedLeads, setImportedLeads] = useState<LeadRecord[]>([]);
  const [skippedLeads, setSkippedLeads] = useState<SkippedRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [isDragging, setIsDragging] = useState(false);
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [batchSize, setBatchSize] = useState(30);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (uploadState === 'processing') return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      await uploadAndParseFile(file);
    }
  };

  // 2. Select file handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      await uploadAndParseFile(file);
    }
  };

  // 3. Upload & Parse File call
  const uploadAndParseFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setErrorMessage('Please upload a valid CSV file (.csv format only).');
      setUploadState('failed');
      return;
    }

    setFileName(file.name);
    setUploadState('idle');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import/parse', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse CSV file');
      }

      const data = await response.json();
      setHeaders(data.headers);
      setPreviewRows(data.previewRows);
      
      // For processing, we will send all rows.
      // Next.js body limits apply, but for typical sheets (up to 5MB), it works perfectly.
      // We can also parse on client-side and send JSON to /api/import/process
      // To bypass Next.js file body limit, let's load rows parsed from server
      // Wait, let's run client-side parsing as a fallback, but here we read previewRows.
      // For processing, let's read the full file row list. We can parse the file client side
      // using Papaparse so that we have all rows to send in the post body, or fetch all rows.
      // Let's implement client-side parsing using Papaparse directly for processing,
      // to keep it fast and avoid storing large files on the server!
      
      // Let's read file text and parse on the client to get ALL rows
      const fileText = await file.text();
      const cleanText = fileText.replace(/^\uFEFF/, '');
      const clientParse = Papa.parse(cleanText, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header: string) => header.trim(),
      });
      
      const parsedRows = (clientParse.data as Record<string, string>[]).map(row => {
        const cleanRow: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          if (k) cleanRow[k] = (v || '').trim();
        }
        return cleanRow;
      }).filter(row => Object.values(row).some(v => v !== ''));

      setAllRows(parsedRows);
      setRowCount(parsedRows.length);
      setUploadState('parsed');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred during file upload.');
      setUploadState('failed');
    }
  };

  // 4. Confirm and Process import
  const startProcessing = async () => {
    if (allRows.length === 0) return;

    setUploadState('processing');
    setErrorMessage('');

    try {
      const response = await fetch('/api/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: allRows,
          batchSize: batchSize,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start import job');
      }

      const { jobId } = await response.json();
      setJobId(jobId);
      
      // Start polling
      startPolling(jobId);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to initiate lead mapping.');
      setUploadState('failed');
    }
  };

  // 5. Polling Job Status
  const startPolling = (targetJobId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/import/${targetJobId}/status`);
        if (!response.ok) {
          throw new Error('Failed to fetch job progress status');
        }

        const job = await response.json();
        setProgress(job.progress);
        setImportedLeads(job.imported);
        setSkippedLeads(job.skipped);

        if (job.status === 'completed') {
          clearInterval(pollIntervalRef.current!);
          setUploadState('completed');
          // Trigger confetti burst!
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#4edea3', '#c0c1ff', '#8083ff']
          });
        } else if (job.status === 'failed') {
          clearInterval(pollIntervalRef.current!);
          setErrorMessage(job.error || 'AI processing job failed.');
          setUploadState('failed');
        }
      } catch (err: any) {
        console.error('Polling error:', err);
      }
    }, 1000);
  };

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // 6. Command Palette / Demo Loader Action
  const handleLoadDemo = (type: 'facebook' | 'messy' | 'realestate') => {
    let mockRows: any[] = [];
    let name = '';

    if (type === 'facebook') {
      mockRows = facebookLeadsDemo;
      name = 'facebook_leads_export_demo.csv';
    } else if (type === 'messy') {
      mockRows = messyManualLeadsDemo;
      name = 'messy_manual_spreadsheets_demo.csv';
    } else if (type === 'realestate') {
      mockRows = realestateLeadsDemo;
      name = 'real_estate_leads_crm_demo.csv';
    }

    setFileName(name);
    setHeaders(Object.keys(mockRows[0]));
    setPreviewRows(mockRows.slice(0, 100));
    setAllRows(mockRows);
    setRowCount(mockRows.length);
    setUploadState('parsed');
    setErrorMessage('');
  };

  const handleClear = () => {
    setUploadState('idle');
    setHeaders([]);
    setPreviewRows([]);
    setAllRows([]);
    setRowCount(0);
    setFileName('');
    setJobId('');
    setProgress(null);
    setImportedLeads([]);
    setSkippedLeads([]);
    setErrorMessage('');
  };

  // Dummy import via URL support
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl) return;

    // Simulate downloading from URL by loading a default demo
    setShowUrlModal(false);
    handleLoadDemo('messy');
    setFileName(`url_imported_leads_${importUrl.split('/').pop() || 'sheet'}.csv`);
  };

  return (
    <div className="relative min-h-screen dotted-grid pb-24">
      {/* Background radial lights */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Nav bar */}
      <Navbar
        activePage="engine"
        onOpenCmd={() => setIsCmdOpen(true)}
        onTryDemo={() => handleLoadDemo('messy')}
      />

      {/* Main Page Layout */}
      <div className="max-w-7xl mx-auto px-6 pt-20 grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        
        {/* Sidebar Info (Desktop only) */}
        <aside className="hidden xl:col-span-3 xl:flex flex-col gap-6 sticky top-20 xl:-ml-12">
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-primary text-sm uppercase tracking-wider font-code-label">Importer AI</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Active Engine v2.4 (Gemini-Flash)</p>
            </div>
            
            <div className="border-t border-outline-variant/10 pt-4 space-y-3.5">
              <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary text-sm">task_alt</span>
                <span>Structured JSON Output</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary text-sm">bolt</span>
                <span>3 Concurrent Batches Cap</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary text-sm">schema</span>
                <span>Deterministic Zod Guard</span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 bg-primary-container/5 space-y-2">
            <h4 className="font-semibold text-xs text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-base">info</span>
              Quick Tip
            </h4>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              If your CSV columns have weird header titles or language typos, our AI automatically maps them to the right CRM lead fields. Press <span className="text-primary font-bold">⌘K</span> to load pre-made messy sheets!
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="col-span-1 xl:col-span-9 space-y-4">
          
          {/* Status Display Area */}
          {uploadState === 'idle' && (
            <div className="space-y-5">
              {/* Hero Banner */}
              <div className="text-center pt-1 pb-1">
                <div className="inline-flex items-center gap-2 bg-secondary/15 border border-secondary/20 px-4 py-1.5 rounded-full mb-3.5">
                  <span className="w-2 h-2 rounded-full bg-secondary status-pulse"></span>
                  <span className="text-secondary font-code-label text-[10px] uppercase tracking-wider">AI Mapping Engine Live</span>
                </div>
                <h1 className="font-bold text-2xl md:text-4xl text-on-surface tracking-tight leading-tight">
                  Turn any spreadsheet into <span className="gradient-text">clean CRM leads.</span>
                </h1>
                <p className="text-on-surface-variant text-xs md:text-sm max-w-xl mx-auto mt-2.5 leading-relaxed">
                  GrowEasy's AI intelligently maps, validates, and cleans your CSV/XLSX data in seconds. No more manual field matching or broken schemas.
                </p>
              </div>

              {/* Upload Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`glass-drag-zone rounded-3xl py-8 px-12 min-h-[280px] flex flex-col items-center justify-center relative overflow-hidden cursor-pointer ${
                  isDragging ? 'border-secondary bg-secondary/5' : ''
                }`}
              >
                {/* Embedded WebGL Canvas */}
                <ThreeFunnel isDragging={isDragging} isProcessing={false} />

                {/* Drop zone content */}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-16 h-16 glass-panel rounded-2xl flex items-center justify-center mb-5 border-white/10 group-hover:border-secondary/40 transition-colors">
                    <span className="material-symbols-outlined text-3xl text-secondary">cloud_upload</span>
                  </div>
                  <h3 className="font-semibold text-lg text-on-surface">Drop your leads CSV here</h3>
                  <p className="text-xs text-on-surface-variant mt-1.5">Supports .csv uploads up to 5MB</p>
                  
                  <div className="flex flex-wrap justify-center gap-3 mt-8">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="bg-surface-variant/40 hover:bg-surface-variant/70 border border-outline-variant/20 px-6 py-2.5 rounded-xl font-medium text-xs text-on-surface flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">description</span>
                      Choose File
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUrlModal(true);
                      }}
                      className="bg-white/5 hover:bg-white/10 border border-white/5 px-6 py-2.5 rounded-xl font-medium text-xs text-on-surface-variant flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">link</span>
                      Import via URL
                    </button>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
              </div>

              {/* Technical specs icons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div className="glass-panel p-5 rounded-2xl space-y-2">
                  <span className="material-symbols-outlined text-secondary text-2xl">bolt</span>
                  <h4 className="font-semibold text-sm text-on-surface">Instant Normalization</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    AI detects phone columns, email structures, and date formats instantly without fixed templates.
                  </p>
                </div>
                <div className="glass-panel p-5 rounded-2xl space-y-2">
                  <span className="material-symbols-outlined text-primary text-2xl">schema</span>
                  <h4 className="font-semibold text-sm text-on-surface">Deterministic Guard</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    A code-level validation layer checks enums and validates contacts, filtering bad data cleanly.
                  </p>
                </div>
                <div className="glass-panel p-5 rounded-2xl space-y-2">
                  <span className="material-symbols-outlined text-tertiary text-2xl">security</span>
                  <h4 className="font-semibold text-sm text-on-surface">Deduplication Logic</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Auto-merges duplicate rows using email+phone hashes to avoid duplicate leads in the CRM.
                  </p>
                </div>
              </div>
            </div>
          )}

          {uploadState === 'failed' && (
            <div className="glass-panel rounded-2xl p-8 border-error/25 bg-error-container/5 space-y-5 text-center">
              <span className="material-symbols-outlined text-5xl text-error">error</span>
              <div>
                <h3 className="font-semibold text-lg text-on-surface">An error occurred</h3>
                <p className="text-sm text-on-surface-variant mt-2 max-w-md mx-auto">{errorMessage}</p>
              </div>
              <button
                onClick={handleClear}
                className="px-6 py-2.5 bg-surface-variant/40 border border-outline-variant/20 hover:bg-surface-variant/70 rounded-xl text-xs font-semibold text-on-surface cursor-pointer"
              >
                Reset Importer
              </button>
            </div>
          )}

          {uploadState === 'parsed' && (
            <div className="space-y-6">
              <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-secondary/20">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl text-secondary">check_circle</span>
                  <div>
                    <h4 className="font-semibold text-sm text-on-surface">Parsed {fileName} Successfully</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">Found {rowCount} records in your CSV sheet.</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-on-surface-variant font-code-label">Batch Size:</label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={batchSize}
                      onChange={(e) => setBatchSize(Number(e.target.value))}
                      className="bg-surface-container border border-outline-variant/20 text-xs w-16 text-center py-1 rounded focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleClear}
                    className="px-4 py-2 bg-surface-variant/40 hover:bg-surface-variant/75 border border-outline-variant/25 rounded-xl text-xs font-medium text-on-surface transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={startProcessing}
                    className="primary-gradient-btn px-6 py-2 rounded-xl text-xs font-semibold text-white transition-transform cursor-pointer"
                  >
                    Confirm & Map Leads
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <PreviewTable headers={headers} rows={previewRows} totalCount={rowCount} />
            </div>
          )}

          {uploadState === 'processing' && (
            <div className="space-y-6">
              {/* Conveyor Belt animation */}
              <ConveyorBelt
                status="processing"
                currentBatch={progress?.currentBatch || 1}
                totalBatches={progress?.totalBatches || 1}
                importedCount={progress?.importedCount || 0}
                skippedCount={progress?.skippedCount || 0}
                totalRows={progress?.totalRows || rowCount}
                processedRows={progress?.processedRows || 0}
              />

              {/* Info loading state */}
              <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center gap-3.5 border-secondary/15 bg-secondary-container/5 min-h-[220px]">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <span className="absolute w-full h-full border-2 border-secondary/20 border-t-secondary rounded-full animate-spin" />
                  <span className="material-symbols-outlined text-lg text-secondary animate-pulse">auto_awesome</span>
                </div>
                <h4 className="font-semibold text-sm text-on-surface">AI Mapping & Deduplication Active...</h4>
                <p className="text-xs text-on-surface-variant max-w-sm text-center leading-relaxed">
                  Batches are processing in parallel. Zod is validating the structures and removing duplicate entries. Please do not close this window.
                </p>
              </div>
            </div>
          )}

          {uploadState === 'completed' && (
            <ResultsDashboard
              imported={importedLeads}
              skipped={skippedLeads}
              onReset={handleClear}
            />
          )}

        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCmdOpen}
        setIsOpen={setIsCmdOpen}
        onClear={handleClear}
        onLoadDemo={handleLoadDemo}
      />

      {/* URL Import Modal */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-[#060e20]/70 backdrop-blur-sm" onClick={() => setShowUrlModal(false)} />
          <div className="relative w-full max-w-md glass-panel rounded-2xl p-6 border border-outline-variant/20 shadow-2xl">
            <h3 className="font-semibold text-lg text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">link</span>
              Import via URL
            </h3>
            <p className="text-xs text-on-surface-variant mt-1.5">
              Enter a link to a CSV spreadsheet. For testing, you can input any link.
            </p>
            <form onSubmit={handleUrlSubmit} className="mt-4 space-y-4">
              <input
                type="url"
                required
                placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUrlModal(false)}
                  className="px-4 py-2 border border-outline-variant/15 rounded-xl text-xs text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-gradient-btn px-5 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
                >
                  Import Leads
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
