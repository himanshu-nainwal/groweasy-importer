'use client';

import React from 'react';
import Link from 'next/link';

interface NavbarProps {
  activePage: 'engine' | 'docs' | 'schemas';
  onOpenCmd?: () => void;
  onTryDemo?: () => void;
}

export default function Navbar({ activePage, onOpenCmd, onTryDemo }: NavbarProps) {
  return (
    <nav className="fixed top-0 w-full z-40 bg-background/50 backdrop-blur-xl border-b border-outline-variant/15 shadow-sm h-16">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-3 items-center h-full">
        {/* Brand Logo (Left Column) */}
        <div className="flex justify-start xl:-ml-12">
          <Link href="/" className="flex items-center gap-3 cursor-pointer flex-shrink-0">
            <span className="material-symbols-outlined text-3xl text-secondary animate-pulse">auto_awesome</span>
            <span className="font-bold text-lg tracking-tight text-primary">GrowEasy Importer</span>
          </Link>
        </div>

        {/* Menu Items (Centered Column, constant font-weight to prevent text-width shifting) */}
        <div className="hidden md:flex justify-center items-center gap-12 text-sm">
          <Link
            className={`${
              activePage === 'engine'
                ? 'text-primary border-b-2 border-primary pb-1'
                : 'text-on-surface-variant hover:text-on-surface border-b-2 border-transparent pb-1'
            } transition-all font-medium`}
            href="/"
          >
            Importer Engine
          </Link>
          <Link
            className={`${
              activePage === 'docs'
                ? 'text-primary border-b-2 border-primary pb-1'
                : 'text-on-surface-variant hover:text-on-surface border-b-2 border-transparent pb-1'
            } transition-all font-medium`}
            href="/docs"
          >
            Docs
          </Link>
          <Link
            className={`${
              activePage === 'schemas'
                ? 'text-primary border-b-2 border-primary pb-1'
                : 'text-on-surface-variant hover:text-on-surface border-b-2 border-transparent pb-1'
            } transition-all font-medium`}
            href="/api-schemas"
          >
            API Schemas
          </Link>
        </div>

        {/* Right buttons area (Right Column, justify-end) */}
        <div className="flex items-center gap-3 justify-end">
          {onOpenCmd && (
            <button
              onClick={onOpenCmd}
              className="hidden sm:flex items-center gap-2 bg-surface-container/60 hover:bg-surface-variant/50 border border-outline-variant/10 px-3.5 py-1.5 rounded-xl text-xs font-code-label text-outline transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">keyboard</span>
              <span>Press ⌘K</span>
            </button>
          )}

          {onTryDemo ? (
            <button
              onClick={onTryDemo}
              className="primary-gradient-btn px-5 py-2 rounded-full text-xs font-semibold text-white cursor-pointer"
            >
              Try Demo Import
            </button>
          ) : (
            <Link
              href="/"
              className="primary-gradient-btn px-5 py-2 rounded-full text-xs font-semibold text-white text-center cursor-pointer"
            >
              Launch Importer
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
