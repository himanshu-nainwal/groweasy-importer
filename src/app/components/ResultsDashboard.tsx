'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { LeadRecord, SkippedRecord } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

interface ResultsDashboardProps {
  imported: LeadRecord[];
  skipped: SkippedRecord[];
  onReset: () => void;
}

export default function ResultsDashboard({ imported, skipped, onReset }: ResultsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'imported' | 'skipped'>('imported');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [selectedSkipped, setSelectedSkipped] = useState<SkippedRecord | null>(null);

  // 1. Download CSV Helper
  const downloadStandardizedCSV = () => {
    const fields: (keyof LeadRecord)[] = [
      'created_at',
      'name',
      'email',
      'country_code',
      'mobile_without_country_code',
      'company',
      'city',
      'state',
      'country',
      'lead_owner',
      'crm_status',
      'crm_note',
      'data_source',
      'possession_time',
      'description',
    ];

    // Generate CSV Headers
    const csvHeaders = fields.join(',');

    // Generate CSV Rows
    const csvRows = imported.map((record) => {
      return fields
        .map((field) => {
          const val = record[field] || '';
          // Escape quotes and wrap in quotes to handle commas
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',');
    });

    const csvContent = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `groweasy_standardized_leads_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Filter / Search logic for imported leads
  const filteredImported = useMemo(() => {
    return imported.filter((lead) => {
      const nameMatch = lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const emailMatch = lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const statusMatch = statusFilter === '' || lead.crm_status === statusFilter;
      const sourceMatch = sourceFilter === '' || lead.data_source === sourceFilter;
      return (nameMatch || emailMatch) && statusMatch && sourceMatch;
    });
  }, [imported, searchQuery, statusFilter, sourceFilter]);

  // 3. Search logic for skipped leads
  const filteredSkipped = useMemo(() => {
    return skipped.filter((log) => {
      const rawRowStr = JSON.stringify(log.row).toLowerCase();
      const reasonMatch = log.reason.toLowerCase().includes(searchQuery.toLowerCase());
      const rowMatch = rawRowStr.includes(searchQuery.toLowerCase());
      return reasonMatch || rowMatch;
    });
  }, [skipped, searchQuery]);

  // 4. Virtualizer for imported table
  const importedParentRef = useRef<HTMLDivElement>(null);
  const importedVirtualizer = useVirtualizer({
    count: filteredImported.length,
    getScrollElement: () => importedParentRef.current,
    estimateSize: () => 64, // taller rows to show more info
    overscan: 10,
  });

  // 5. Virtualizer for skipped table
  const skippedParentRef = useRef<HTMLDivElement>(null);
  const skippedVirtualizer = useVirtualizer({
    count: filteredSkipped.length,
    getScrollElement: () => skippedParentRef.current,
    estimateSize: () => 72, // height for original row dump
    overscan: 10,
  });

  // 6. Statistics
  const totalLeads = imported.length + skipped.length;
  const accuracyRate = totalLeads > 0 ? ((imported.length / totalLeads) * 100).toFixed(1) : '0.0';

  return (
    <div className="w-full space-y-8">
      {/* 1. Header and Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary font-bold">Import Summary</h2>
          <p className="text-on-surface-variant font-body-sm mt-1">
            Data mapping finished. AI extracted, validated, and normalized your leads.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="px-5 py-2.5 rounded-xl border border-outline-variant/35 bg-surface-container/20 hover:bg-surface-variant/40 font-medium text-sm flex items-center gap-2 hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            Import Another
          </button>
          {imported.length > 0 && (
            <button
              onClick={downloadStandardizedCSV}
              className="primary-gradient-btn px-6 py-2.5 rounded-xl font-medium text-sm text-white flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">download</span>
              Export GrowEasy CSV
            </button>
          )}
        </div>
      </div>

      {/* 2. Statistical Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex flex-col relative overflow-hidden">
          <span className="text-xs font-code-label text-outline uppercase tracking-wider">Total Evaluated</span>
          <span className="text-4xl font-extrabold text-on-surface mt-2">{totalLeads}</span>
          <div className="absolute right-4 bottom-4 w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
            <span className="material-symbols-outlined text-primary">assessment</span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col border-secondary/20 bg-secondary-container/5 relative overflow-hidden">
          <span className="text-xs font-code-label text-secondary uppercase tracking-wider">Successfully Mapped</span>
          <span className="text-4xl font-extrabold text-secondary mt-2">{imported.length}</span>
          <div className="absolute right-4 bottom-4 w-12 h-12 rounded-xl bg-secondary/5 flex items-center justify-center border border-secondary/10">
            <span className="material-symbols-outlined text-secondary">check_circle</span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col border-error/20 bg-error-container/5 relative overflow-hidden">
          <span className="text-xs font-code-label text-error uppercase tracking-wider">Skipped Rows</span>
          <span className="text-4xl font-extrabold text-error mt-2">{skipped.length}</span>
          <div className="absolute right-4 bottom-4 w-12 h-12 rounded-xl bg-error/5 flex items-center justify-center border border-error/10">
            <span className="material-symbols-outlined text-error">cancel</span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col relative overflow-hidden">
          <span className="text-xs font-code-label text-tertiary uppercase tracking-wider">Extract Accuracy</span>
          <span className="text-4xl font-extrabold text-tertiary mt-2">{accuracyRate}%</span>
          <div className="absolute right-4 bottom-4 w-12 h-12 rounded-xl bg-tertiary/5 flex items-center justify-center border border-tertiary/10">
            <span className="material-symbols-outlined text-tertiary">auto_awesome</span>
          </div>
        </div>
      </div>

      {/* 3. Search and Tabs Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-outline-variant/10">
        {/* Tabs */}
        <div className="flex bg-surface-container-low/60 p-1.5 rounded-xl border border-outline-variant/10 w-full md:w-auto">
          <button
            onClick={() => {
              setActiveTab('imported');
              setSearchQuery('');
            }}
            className={`flex-1 md:flex-initial px-6 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'imported'
                ? 'bg-[#101931] text-secondary border border-outline-variant/20 shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">check_circle</span>
            Imported Leads ({imported.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('skipped');
              setSearchQuery('');
            }}
            className={`flex-1 md:flex-initial px-6 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'skipped'
                ? 'bg-[#101931] text-error border border-outline-variant/20 shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">cancel</span>
            Skipped Log ({skipped.length})
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:flex-initial min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-base">
              search
            </span>
            <input
              type="text"
              placeholder={activeTab === 'imported' ? 'Search by name/email...' : 'Search raw content/reason...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-low/60 border border-outline-variant/10 rounded-xl py-2 pl-10 pr-4 text-sm text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary/50"
            />
          </div>

          {activeTab === 'imported' && (
            <>
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface-container-low/60 border border-outline-variant/10 rounded-xl py-2 px-3 text-sm text-on-surface focus:outline-none focus:border-primary/50 cursor-pointer"
              >
                <option value="">All CRM Statuses</option>
                <option value="GOOD_LEAD_FOLLOW_UP">Good Lead</option>
                <option value="DID_NOT_CONNECT">Did Not Connect</option>
                <option value="BAD_LEAD">Bad Lead</option>
                <option value="SALE_DONE">Sale Completed</option>
                <option value="">Unmapped/None</option>
              </select>

              {/* Source Filter */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="bg-surface-container-low/60 border border-outline-variant/10 rounded-xl py-2 px-3 text-sm text-on-surface focus:outline-none focus:border-primary/50 cursor-pointer"
              >
                <option value="">All Sources</option>
                <option value="leads_on_demand">Leads On Demand</option>
                <option value="meridian_tower">Meridian Tower</option>
                <option value="eden_park">Eden Park</option>
                <option value="varah_swamy">Varah Swamy</option>
                <option value="sarjapur_plots">Sarjapur Plots</option>
                <option value="">Unmapped/None</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* 4. Display Table Container */}
      <div className="w-full">
        {activeTab === 'imported' ? (
          /* Imported leads virtualized table */
          filteredImported.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 border border-outline-variant/10 rounded-2xl bg-surface-container/20">
              <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">person_search</span>
              <p className="text-on-surface-variant font-medium">No matching imported leads found</p>
            </div>
          ) : (
            <div
              ref={importedParentRef}
              className="w-full max-h-[500px] overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-low/40 backdrop-blur-md"
            >
              <table className="w-full border-collapse text-left text-sm text-on-surface-variant table-auto">
                <thead className="sticky top-0 z-10 bg-[#0c1328] border-b border-outline-variant/30 text-primary font-semibold text-xs tracking-wider uppercase">
                  <tr>
                    <th className="px-6 py-3.5 whitespace-nowrap bg-[#0c1328]">Lead Profile</th>
                    <th className="px-6 py-3.5 whitespace-nowrap bg-[#0c1328]">Contact Phone</th>
                    <th className="px-6 py-3.5 whitespace-nowrap bg-[#0c1328]">Location</th>
                    <th className="px-6 py-3.5 whitespace-nowrap bg-[#0c1328]">CRM Assignment</th>
                    <th className="px-6 py-3.5 whitespace-nowrap bg-[#0c1328]">Import Source</th>
                    <th className="px-6 py-3.5 whitespace-nowrap bg-[#0c1328]">Mapping Notes</th>
                  </tr>
                </thead>
                <tbody
                  style={{
                    height: `${importedVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {importedVirtualizer.getVirtualItems().map((virtualRow) => {
                    const lead = filteredImported[virtualRow.index];
                    const isEven = virtualRow.index % 2 === 0;

                    let statusBadgeClass = 'bg-surface-variant/40 text-on-surface-variant border-outline-variant/30';
                    let statusLabel = lead.crm_status || 'NONE';
                    if (lead.crm_status === 'GOOD_LEAD_FOLLOW_UP') {
                      statusBadgeClass = 'bg-secondary/10 text-secondary border-secondary/35';
                      statusLabel = 'GOOD LEAD';
                    } else if (lead.crm_status === 'SALE_DONE') {
                      statusBadgeClass = 'bg-primary-container/10 text-primary border-primary-container/35';
                      statusLabel = 'SALE COMPLETE';
                    } else if (lead.crm_status === 'DID_NOT_CONNECT') {
                      statusBadgeClass = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/35';
                      statusLabel = 'NO CONNECTION';
                    } else if (lead.crm_status === 'BAD_LEAD') {
                      statusBadgeClass = 'bg-error/10 text-error border-error-container/35';
                      statusLabel = 'BAD LEAD';
                    }

                    return (
                      <tr
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={importedVirtualizer.measureElement}
                        onClick={() => setSelectedLead(lead)}
                        className={`group border-b border-outline-variant/10 transition-colors hover:bg-surface-variant/25 cursor-pointer ${
                          isEven ? 'bg-surface-container-lowest/10' : 'bg-surface-container/15'
                        }`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '64px',
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {/* Name and email */}
                        <td className="px-6 py-2.5">
                          <div className="flex flex-col">
                            <span className="font-semibold text-on-surface text-sm truncate max-w-xs">{lead.name || 'Anonymous Lead'}</span>
                            <span className="text-xs text-outline truncate max-w-xs">{lead.email || 'No email info'}</span>
                          </div>
                        </td>

                        {/* Phone details */}
                        <td className="px-6 py-2.5 font-mono text-xs">
                          {lead.mobile_without_country_code ? (
                            <div className="flex items-center gap-1 text-on-surface">
                              <span className="text-outline">{lead.country_code || ''}</span>
                              <span>{lead.mobile_without_country_code}</span>
                            </div>
                          ) : (
                            <span className="text-outline-variant/40 italic">None</span>
                          )}
                        </td>

                        {/* Location */}
                        <td className="px-6 py-2.5">
                          {lead.city || lead.state || lead.country ? (
                            <div className="flex flex-col text-xs">
                              <span className="text-on-surface truncate max-w-[150px]">
                                {lead.city}
                                {lead.city && lead.state && ', '}
                                {lead.state}
                              </span>
                              <span className="text-outline text-[10px] truncate max-w-[150px]">{lead.country}</span>
                            </div>
                          ) : (
                            <span className="text-outline-variant/40 italic text-xs">Unspecified</span>
                          )}
                        </td>

                        {/* CRM status and owner */}
                        <td className="px-6 py-2.5">
                          <div className="flex flex-col items-start gap-1">
                            <span className={`text-[10px] font-code-label font-bold border px-2 py-0.5 rounded-full ${statusBadgeClass}`}>
                              {statusLabel}
                            </span>
                            {lead.lead_owner && (
                              <span className="text-[10px] text-outline">Owner: {lead.lead_owner}</span>
                            )}
                          </div>
                        </td>

                        {/* Data Source */}
                        <td className="px-6 py-2.5">
                          {lead.data_source ? (
                            <span className="text-xs font-code-label bg-surface-variant/45 border border-outline-variant/15 px-2 py-1 rounded text-primary">
                              {lead.data_source}
                            </span>
                          ) : (
                            <span className="text-outline-variant/40 italic text-xs">Unknown</span>
                          )}
                        </td>

                        {/* Note/Description */}
                        <td className="px-6 py-2.5 text-xs max-w-xs truncate" title={lead.crm_note || lead.description}>
                          <span className="text-outline">{lead.crm_note || lead.description || ''}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Skipped logs virtualized table */
          filteredSkipped.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 border border-outline-variant/10 rounded-2xl bg-surface-container/20">
              <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">find_in_page</span>
              <p className="text-on-surface-variant font-medium">No skipped records found</p>
            </div>
          ) : (
            <div
              ref={skippedParentRef}
              className="w-full max-h-[500px] overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-low/40 backdrop-blur-md"
            >
              <table className="w-full border-collapse text-left text-sm text-on-surface-variant table-auto">
                <thead className="sticky top-0 z-10 bg-[#0c1328] border-b border-outline-variant/30 text-error font-semibold text-xs tracking-wider uppercase">
                  <tr>
                    <th className="px-6 py-3.5 w-16 text-center bg-[#0c1328]">Row</th>
                    <th className="px-6 py-3.5 bg-[#0c1328] w-72">Skip Reason</th>
                    <th className="px-6 py-3.5 bg-[#0c1328]">Raw Record Details</th>
                  </tr>
                </thead>
                <tbody
                  style={{
                    height: `${skippedVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {skippedVirtualizer.getVirtualItems().map((virtualRow) => {
                    const log = filteredSkipped[virtualRow.index];
                    const isEven = virtualRow.index % 2 === 0;

                    return (
                      <tr
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={skippedVirtualizer.measureElement}
                        onClick={() => setSelectedSkipped(log)}
                        className={`group border-b border-outline-variant/10 transition-colors hover:bg-surface-variant/25 cursor-pointer ${
                          isEven ? 'bg-surface-container-lowest/10' : 'bg-surface-container/15'
                        }`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '72px',
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {/* Row Index */}
                        <td className="px-6 py-3 text-center font-code-label text-outline">
                          {virtualRow.index + 1}
                        </td>

                        {/* Skip Reason Badge */}
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-1.5 text-error font-medium">
                            <span className="material-symbols-outlined text-lg">warning</span>
                            <span className="text-sm truncate max-w-xs">{log.reason}</span>
                          </div>
                        </td>

                        {/* Raw Record Dump */}
                        <td className="px-6 py-3">
                          <div className="bg-black/35 rounded-lg border border-outline-variant/5 p-2 font-mono text-[10px] text-outline-variant max-h-12 overflow-y-auto overflow-x-hidden select-all whitespace-pre-wrap">
                            {JSON.stringify(log.row)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Slide-out detail drawer */}
      <AnimatePresence>
        {(selectedLead || selectedSkipped) && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedLead(null);
                setSelectedSkipped(null);
              }}
              className="absolute inset-0 bg-[#060e20]/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-lg h-full bg-[#0b1326] border-l border-outline-variant/15 shadow-2xl p-6 flex flex-col z-10 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/10 mb-6">
                <h3 className="font-semibold text-lg text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">
                    {selectedLead ? 'person' : 'warning'}
                  </span>
                  {selectedLead ? 'Lead Profile Details' : 'Skipped Lead Details'}
                </h3>
                <button
                  onClick={() => {
                    setSelectedLead(null);
                    setSelectedSkipped(null);
                  }}
                  className="w-8 h-8 rounded-lg bg-surface-variant/20 hover:bg-surface-variant/50 flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {selectedLead ? (
                <div className="space-y-6">
                  <div className="glass-panel p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-code-label font-bold text-secondary uppercase">Mapped Target CRM Fields</h4>
                    <div className="grid grid-cols-3 gap-y-3.5 text-xs">
                      {Object.entries(selectedLead).map(([key, val]) => (
                        <React.Fragment key={key}>
                          <div className="col-span-1 text-outline font-code-label truncate capitalize">{key.replace(/_/g, ' ')}</div>
                          <div className="col-span-2 text-on-surface font-medium truncate select-all">{val ? String(val) : <span className="text-outline-variant/40 italic">empty</span>}</div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              ) : selectedSkipped ? (
                <div className="space-y-6">
                  <div className="bg-error-container/5 border border-error/25 p-4 rounded-xl space-y-2">
                    <h4 className="text-xs font-code-label font-bold text-error uppercase">Skip Reason</h4>
                    <p className="text-xs text-on-surface font-medium">{selectedSkipped.reason}</p>
                  </div>
                  <div className="glass-panel p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-code-label font-bold text-primary uppercase">Raw Record Key-Values</h4>
                    <div className="grid grid-cols-3 gap-y-3.5 text-xs">
                      {Object.entries(selectedSkipped.row).map(([key, val]) => (
                        <React.Fragment key={key}>
                          <div className="col-span-1 text-outline truncate font-semibold">{key}</div>
                          <div className="col-span-2 text-on-surface select-all truncate">{val ? String(val) : <span className="text-outline-variant/40 italic">empty</span>}</div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
