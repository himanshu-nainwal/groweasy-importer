'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandPaletteProps {
  onLoadDemo: (type: 'facebook' | 'messy' | 'realestate') => void;
  onClear: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function CommandPalette({ onLoadDemo, onClear, isOpen, setIsOpen }: CommandPaletteProps) {
  const [search, setSearch] = useState('');

  // Handle keys listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Command items definition
  const commands = [
    {
      category: 'Demo Imports',
      items: [
        {
          name: 'Load Facebook Lead Ads Demo',
          description: 'Simulates a lead export from Meta campaigns',
          icon: 'campaign',
          action: () => {
            onLoadDemo('facebook');
            setIsOpen(false);
          },
        },
        {
          name: 'Load Messy Manual Lead Sheet Demo',
          description: 'Simulates columns with typos, missing dates, and remarks',
          icon: 'border_color',
          action: () => {
            onLoadDemo('messy');
            setIsOpen(false);
          },
        },
        {
          name: 'Load Real Estate CRM Export Demo',
          description: 'Simulates large project-based lead entries',
          icon: 'location_city',
          action: () => {
            onLoadDemo('realestate');
            setIsOpen(false);
          },
        },
      ],
    },
    {
      category: 'System Commands',
      items: [
        {
          name: 'Clear All App States',
          description: 'Resets the importer and wipes local cache',
          icon: 'restart_alt',
          action: () => {
            onClear();
            setIsOpen(false);
          },
        },
        {
          name: 'Download Empty Schema Template',
          description: 'Get a clean CSV containing the target CRM headers',
          icon: 'download_for_offline',
          action: () => {
            const headers = [
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
            ].join(',');
            const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'groweasy_crm_template.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setIsOpen(false);
          },
        },
      ],
    },
  ];

  // Filter commands by search term
  const filteredCommands = commands
    .map((group) => {
      const items = group.items.filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.description.toLowerCase().includes(search.toLowerCase())
      );
      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 overflow-hidden">
          {/* Backdrop mask */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-[#060e20]/80 backdrop-blur-md"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-lg glass-panel rounded-2xl overflow-hidden shadow-2xl border border-outline-variant/20 flex flex-col max-h-[500px]"
          >
            {/* Search Input field */}
            <div className="flex items-center border-b border-outline-variant/15 p-4 bg-surface-container/30">
              <span className="material-symbols-outlined text-outline text-xl mr-3 select-none">search</span>
              <input
                type="text"
                placeholder="Type a command or search demo data..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="w-full bg-transparent text-on-surface placeholder:text-outline-variant text-sm focus:outline-none"
              />
              <span className="text-[10px] bg-surface-variant border border-outline-variant/35 px-2 py-0.5 rounded text-outline font-code-label select-none shadow-sm">
                ESC
              </span>
            </div>

            {/* Scrollable commands list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {filteredCommands.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-on-surface-variant">
                  <span className="material-symbols-outlined text-3xl opacity-50 mb-1">sentiment_dissatisfied</span>
                  <span className="text-xs">No command matched your query</span>
                </div>
              ) : (
                filteredCommands.map((group) => (
                  <div key={group.category} className="space-y-1">
                    <h5 className="text-[10px] font-code-label font-bold text-outline uppercase tracking-wider px-3 mb-1.5">
                      {group.category}
                    </h5>
                    {group.items.map((item) => (
                      <button
                        key={item.name}
                        onClick={item.action}
                        className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl hover:bg-surface-variant/40 text-left transition-colors cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-surface-container/60 border border-outline-variant/10 flex items-center justify-center text-outline-variant group-hover:text-primary group-hover:border-primary/20 transition-colors">
                          <span className="material-symbols-outlined text-lg">{item.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h6 className="text-xs font-semibold text-on-surface truncate">{item.name}</h6>
                          <p className="text-[10px] text-outline truncate mt-0.5">{item.description}</p>
                        </div>
                        <span className="material-symbols-outlined text-outline-variant text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          chevron_right
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Command Palette Footer */}
            <div className="flex items-center justify-between border-t border-outline-variant/15 px-4 py-3 bg-surface-container/20 text-[10px] text-outline font-code-label select-none">
              <span>Use arrow keys to navigate</span>
              <div className="flex items-center gap-1.5">
                <span>Open:</span>
                <span className="bg-surface-variant border border-outline-variant/30 px-1.5 py-0.5 rounded text-outline-variant">
                  ⌘ K
                </span>
                <span>or</span>
                <span className="bg-surface-variant border border-outline-variant/30 px-1.5 py-0.5 rounded text-outline-variant">
                  Ctrl K
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
