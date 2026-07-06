'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface PreviewTableProps {
  headers: string[];
  rows: Record<string, string>[];
  totalCount: number;
}

export default function PreviewTable({ headers, rows, totalCount }: PreviewTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // 1. Calculate column widths dynamically based on largest text length in each column
  const indexColWidth = Math.max(60, String(rows.length).length * 8.5 + 32);
  const columnWidths = headers.map((header) => {
    let maxLen = header.length;
    rows.forEach((row) => {
      const val = row[header];
      if (val) {
        maxLen = Math.max(maxLen, String(val).length);
      }
    });
    // Scale length to pixels (e.g. 8px per character) plus padding
    const pxWidth = maxLen * 8 + 48;
    return Math.max(100, Math.min(380, pxWidth)); // Keep width between 100px and 380px
  });

  const totalWidth = indexColWidth + columnWidths.reduce((sum, w) => sum + w, 0);

  // Virtualizer for smooth rendering of rows
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // estimated row height in px
    overscan: 10,
  });

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-outline-variant/10 rounded-2xl bg-surface-container/20">
        <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">table_rows</span>
        <p className="text-on-surface-variant font-medium">No preview data available</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">preview</span>
          <h3 className="font-title-md text-title-md text-primary font-semibold">Raw Data Preview</h3>
        </div>
        <div className="text-xs font-code-label bg-surface-variant/45 border border-outline-variant/20 px-3 py-1 rounded-full text-on-surface-variant">
          Showing first {rows.length} of {totalCount} rows
        </div>
      </div>

      {/* Outer container with fixed height & horizontal scroll */}
      <div
        ref={parentRef}
        className="w-full max-h-[420px] overflow-auto rounded-xl border border-outline-variant/20 bg-surface-container-low/40 backdrop-blur-md"
      >
        <table
          className="border-collapse text-left text-sm text-on-surface-variant table-fixed"
          style={{ width: `${totalWidth}px` }}
        >
          {/* Sticky headers */}
          <thead className="sticky top-0 z-10 bg-[#0c1328] border-b border-outline-variant/30 text-primary font-semibold text-xs tracking-wider uppercase">
            <tr>
              <th
                className="px-4 py-3.5 text-center border-r border-outline-variant/10 bg-[#0c1328]"
                style={{ width: `${indexColWidth}px` }}
              >
                #
              </th>
              {headers.map((header, i) => (
                <th
                  key={header}
                  className="px-6 py-3.5 font-semibold text-on-surface border-r border-outline-variant/10 whitespace-nowrap bg-[#0c1328]"
                  style={{ width: `${columnWidths[i]}px` }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              const isEven = virtualRow.index % 2 === 0;

              return (
                <tr
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className={`group transition-colors hover:bg-surface-variant/35 hover:text-on-surface ${
                    isEven ? 'bg-surface-container-lowest/15' : 'bg-surface-container/20'
                  }`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {/* Row index number */}
                  <td
                    className="px-4 py-3 text-center font-code-label border-r border-outline-variant/10 text-outline border-b border-outline-variant/10 bg-[#060e20]/20"
                    style={{ width: `${indexColWidth}px` }}
                  >
                    {virtualRow.index + 1}
                  </td>
                  {/* Row cells */}
                  {headers.map((header, i) => (
                    <td
                      key={header}
                      className="px-6 py-3 border-r border-outline-variant/10 border-b border-outline-variant/10 truncate whitespace-nowrap"
                      style={{ width: `${columnWidths[i]}px` }}
                      title={row[header] || ''}
                    >
                      {row[header] || <span className="text-outline-variant/40 italic">empty</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
