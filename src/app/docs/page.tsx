'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';

export default function DocsPage() {
  return (
    <div className="relative min-h-screen dotted-grid pb-24">
      {/* Background glowing meshes */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Nav bar */}
      <Navbar activePage="docs" />

      <div className="max-w-7xl mx-auto px-6 pt-20">
        <div className="space-y-8">
          {/* Header */}
          <div className="xl:-ml-12">
            <h1 className="font-bold text-4xl text-primary tracking-tight">Documentation</h1>
            <p className="text-on-surface-variant text-sm mt-2">
              Learn how our AI-powered lead ingestion engine works, the validation layer rules, and format schemas.
            </p>
          </div>

          {/* Docs Sections */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Sidebar TOC */}
            <aside className="md:col-span-3 space-y-4 sticky top-20 border-r border-outline-variant/10 pr-4 xl:-ml-12">
              <a href="#intro" className="block text-xs font-semibold text-secondary uppercase tracking-wider font-code-label hover:text-primary transition-colors">Getting Started</a>
              <a href="#how-it-works" className="block text-xs text-on-surface-variant hover:text-on-surface transition-colors">How it works</a>
              <a href="#heuristics" className="block text-xs text-on-surface-variant hover:text-on-surface transition-colors">AI Heuristics</a>
              <a href="#validation" className="block text-xs text-on-surface-variant hover:text-on-surface transition-colors">Validation Guard</a>
              <a href="#faq" className="block text-xs text-on-surface-variant hover:text-on-surface transition-colors">Frequently Asked Questions</a>
            </aside>

            {/* Docs Contents */}
            <div className="md:col-span-9 space-y-16">
              
              <section id="intro" className="glass-panel p-8 rounded-2xl space-y-4">
                <h2 className="font-bold text-lg text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">explore</span>
                  Getting Started
                </h2>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  GrowEasy Smart Importer helps sales teams upload spreadsheets of leads without being locked into a strict CSV column template. Whether the CSV is exported from Facebook Leads, Google Forms, or a custom CRM, our system automatically maps headers and cleans formats.
                </p>
              </section>

              <section id="how-it-works" className="glass-panel p-8 rounded-2xl space-y-4">
                <h2 className="font-bold text-lg text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">settings</span>
                  The Import Pipeline
                </h2>
                <div className="text-xs text-on-surface-variant space-y-4 leading-relaxed">
                  <p>Our ingestion pipeline executes in three stages:</p>
                  <ol className="list-decimal list-inside space-y-4 ml-2">
                    <li>
                      <strong className="text-primary">File Parsing</strong>: The CSV is read, stripping Byte Order Marks (BOM) and detecting column delimiters (commas, semicolons, tabs) automatically.
                    </li>
                    <li>
                      <strong className="text-primary">Simulated / AI Mapping</strong>: Batches of rows are analyzed. We map messy headers (like <code className="bg-surface-variant/40 px-1 py-0.5 rounded text-secondary font-code-label">mail_id</code>) to target fields (like <code className="bg-surface-variant/40 px-1 py-0.5 rounded text-secondary font-code-label">email</code>).
                    </li>
                    <li>
                      <strong className="text-primary">Zod Validation</strong>: Deterministic validation is performed on the backend to enforce schema compliance.
                    </li>
                  </ol>
                </div>
              </section>

              <section id="heuristics" className="glass-panel p-8 rounded-2xl space-y-4">
                <h2 className="font-bold text-lg text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">auto_awesome</span>
                  AI Mapping Heuristics
                </h2>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  The AI identifies column contents based on structural patterns. For example, columns with numerical sequences of 8-15 digits are marked as phone numbers, while text strings with an "@" symbol are extracted as email addresses. Additional unmapped context columns are concatenated into the notes field so you never lose data.
                </p>
              </section>

              <section id="validation" className="glass-panel p-8 rounded-2xl space-y-4">
                <h2 className="font-bold text-lg text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">shield</span>
                  The Validation Guard
                </h2>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  To keep CRM database records clean, Zod enforces required fields. At least one contact field (email or mobile) must contain data. If both are missing, the row is marked as skipped. Statuses and sources are verified against allowable enum sets; invalid enums default to blank.
                </p>
              </section>

              <section id="faq" className="glass-panel p-8 rounded-2xl space-y-4">
                <h2 className="font-bold text-lg text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">help</span>
                  Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-primary">Why was my lead skipped?</h4>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
                      A lead is skipped if it lacks both an email address and a phone number, or if there is a severe formatting issue. You can inspect the exact reason for any skipped row in the Skipped Logs tab on the Results page.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-primary">How do I test the importer if I do not have a CSV?</h4>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
                      Simply press <code className="bg-surface-variant/40 px-1.5 py-0.5 rounded text-secondary font-code-label">Ctrl+K</code> or click "Try Demo Import" in the navbar to load standard Facebook, manual, or real-estate CRM simulation spreadsheets instantly.
                    </p>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
