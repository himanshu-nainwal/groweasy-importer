'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConveyorBeltProps {
  status: 'processing' | 'completed' | 'failed';
  currentBatch: number;
  totalBatches: number;
  importedCount: number;
  skippedCount: number;
  totalRows: number;
  processedRows: number;
}

export default function ConveyorBelt({
  status,
  currentBatch,
  totalBatches,
  importedCount,
  skippedCount,
  totalRows,
  processedRows,
}: ConveyorBeltProps) {
  const percentComplete = totalRows > 0 ? Math.round((processedRows / totalRows) * 100) : 0;

  // Let's create an array of "batch tokens" that represent the pipeline.
  // We want to show a few batches ahead, the current batch, and past batches.
  const visibleBatches = [];
  const start = Math.max(1, currentBatch - 1);
  const end = Math.min(totalBatches, currentBatch + 2);

  for (let i = start; i <= end; i++) {
    visibleBatches.push({
      id: i,
      state: i < currentBatch ? 'completed' : i === currentBatch ? 'active' : 'pending',
    });
  }

  return (
    <div className="w-full glass-panel rounded-2xl p-6 border border-outline-variant/10 relative overflow-hidden">
      {/* Conveyor Belt Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-24 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="font-title-md text-title-md text-primary font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary animate-spin" style={{ animationDuration: '3s' }}>
              sync
            </span>
            AI Mapping Conveyor Belt
          </h4>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Processing batch {currentBatch} of {totalBatches} ({percentComplete}% complete)
          </p>
        </div>
        <div className="text-right">
          <span className="font-code-label text-code-label bg-secondary/15 border border-secondary/30 px-3 py-1 rounded-full text-secondary font-bold uppercase tracking-wider">
            {status === 'completed' ? 'Done' : 'Active'}
          </span>
        </div>
      </div>

      {/* Belt Pipeline Graphics */}
      <div className="relative h-32 flex items-center justify-between bg-surface-container-lowest/30 rounded-xl border border-outline-variant/5 px-6 overflow-hidden">
        {/* Conveyor Tracks (Dotted lines scrolling) */}
        <div className="absolute inset-x-0 h-1 border-t-2 border-dashed border-outline-variant/25 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />

        {/* 1. Raw Leads Bin (Left) */}
        <div className="z-10 flex flex-col items-center justify-center bg-[#0d1326] border border-outline-variant/20 px-3 py-2.5 rounded-lg shadow-lg w-24">
          <span className="material-symbols-outlined text-primary text-xl">description</span>
          <span className="text-[10px] font-code-label mt-1 text-on-surface-variant">Messy CSV</span>
          <span className="text-xs font-bold text-primary mt-0.5">{totalRows - processedRows} left</span>
        </div>

        {/* 2. Pipeline Container for animated batch cards */}
        <div className="flex-1 flex justify-around items-center px-4 relative max-w-sm">
          <AnimatePresence mode="popLayout">
            {visibleBatches.map((batch) => (
              <motion.div
                key={batch.id}
                layout
                initial={{ opacity: 0, x: 50, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: batch.state === 'active' ? 1.15 : 0.9,
                  transition: { type: 'spring', stiffness: 300, damping: 25 },
                }}
                exit={{ opacity: 0, x: -50, scale: 0.8 }}
                className={`relative px-4 py-3 rounded-lg border flex flex-col items-center justify-center w-24 shadow-md ${
                  batch.state === 'active'
                    ? 'bg-secondary/10 border-secondary shadow-[0_0_20px_rgba(78,222,163,0.15)] z-20'
                    : batch.state === 'completed'
                    ? 'bg-primary-container/10 border-primary/20 opacity-55'
                    : 'bg-surface-container-high/50 border-outline-variant/10 opacity-40'
                }`}
              >
                {batch.state === 'active' && (
                  <>
                    <motion.div
                      className="absolute -inset-0.5 rounded-lg bg-secondary/20 blur-sm -z-10"
                      animate={{ opacity: [0.5, 0.9, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
                      <motion.div
                        className="w-full h-[2px] bg-secondary/80 shadow-[0_0_8px_#4edea3]"
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ position: 'absolute', left: 0 }}
                      />
                    </div>
                  </>
                )}
                <span className="text-[10px] font-code-label uppercase text-on-surface-variant">Batch</span>
                <span className={`text-sm font-bold ${batch.state === 'active' ? 'text-secondary' : 'text-primary'}`}>
                  #{batch.id}
                </span>

                {batch.state === 'active' && (
                  <span className="text-[8px] font-bold text-secondary uppercase tracking-widest mt-1 animate-pulse">
                    Scanning
                  </span>
                )}

                {batch.state === 'active' && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-secondary flex items-center justify-center">
                      <span className="text-[8px] text-on-secondary-container font-bold">AI</span>
                    </span>
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* 3. Output bins (Right) */}
        <div className="flex gap-2 z-10">
          {/* Success Bin */}
          <div className="flex flex-col items-center justify-center bg-[#072419] border border-secondary/30 px-3 py-2.5 rounded-lg shadow-lg w-20 shadow-[0_0_15px_rgba(78,222,163,0.05)]">
            <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
            <span className="text-[9px] font-code-label mt-1 text-secondary/80">Imported</span>
            <span className="text-xs font-bold text-secondary mt-0.5">{importedCount}</span>
          </div>

          {/* Skipped Bin */}
          <div className="flex flex-col items-center justify-center bg-[#290a0d] border border-error-container/30 px-3 py-2.5 rounded-lg shadow-lg w-20 shadow-[0_0_15px_rgba(255,180,171,0.05)]">
            <span className="material-symbols-outlined text-error text-lg">cancel</span>
            <span className="text-[9px] font-code-label mt-1 text-error/80">Skipped</span>
            <span className="text-xs font-bold text-error mt-0.5">{skippedCount}</span>
          </div>
        </div>
      </div>

      {/* Processing Stats Progress Bar */}
      <div className="mt-5 space-y-2">
        <div className="flex justify-between text-xs font-code-label">
          <span className="text-on-surface-variant">Processed {processedRows} of {totalRows} Leads</span>
          <span className="text-primary font-bold">{percentComplete}%</span>
        </div>
        <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden border border-outline-variant/10">
          <motion.div
            className="h-full bg-secondary shimmer rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentComplete}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}
