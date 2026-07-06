'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';

export default function ApiSchemasPage() {
  const [copied, setCopied] = useState(false);

  const typescriptSchema = `export interface LeadRecord {
  created_at?: string; // ISO date-time format
  name?: string;       // Full name
  email?: string;      // Valid email address
  country_code?: string; // e.g. "+1" or "+91"
  mobile_without_country_code?: string; // clean digits only
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  lead_owner?: string; // Assigned sales representative
  crm_status?: 'GOOD_LEAD_FOLLOW_UP' | 'DID_NOT_CONNECT' | 'BAD_LEAD' | 'SALE_DONE' | '';
  crm_note?: string;   // Concatenated notes & unmapped columns
  data_source?: 'leads_on_demand' | 'meridian_tower' | 'eden_park' | 'varah_swamy' | 'sarjapur_plots' | '';
  possession_time?: string;
  description?: string;
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(typescriptSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fields = [
    { name: 'created_at', type: 'String (ISO)', req: 'No', enum: 'No', desc: 'Date of lead registration. Fallback to current time.' },
    { name: 'name', type: 'String', req: 'No', enum: 'No', desc: 'Full name of the lead.' },
    { name: 'email', type: 'String', req: 'Conditional', enum: 'No', desc: 'Primary contact email. Required if mobile number is missing.' },
    { name: 'country_code', type: 'String', req: 'No', enum: 'No', desc: 'Numeric country code (e.g. +91, +1).' },
    { name: 'mobile_without_country_code', type: 'String', req: 'Conditional', enum: 'No', desc: 'Clean local phone number. Required if email is missing.' },
    { name: 'company', type: 'String', req: 'No', enum: 'No', desc: 'Lead company or workplace.' },
    { name: 'city', type: 'String', req: 'No', enum: 'No', desc: 'City location.' },
    { name: 'state', type: 'String', req: 'No', enum: 'No', desc: 'State or region.' },
    { name: 'country', type: 'String', req: 'No', enum: 'No', desc: 'Country location.' },
    { name: 'lead_owner', type: 'String', req: 'No', enum: 'No', desc: 'CRM agent assigned to the lead.' },
    { name: 'crm_status', type: 'String (Enum)', req: 'No', enum: 'Yes', desc: 'Status code: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE.' },
    { name: 'crm_note', type: 'String', req: 'No', enum: 'No', desc: 'Aggregated unmapped fields and manual notes.' },
    { name: 'data_source', type: 'String (Enum)', req: 'No', enum: 'Yes', desc: 'Project label: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots.' },
    { name: 'possession_time', type: 'String', req: 'No', enum: 'No', desc: 'Timeframe for possession.' },
    { name: 'description', type: 'String', req: 'No', enum: 'No', desc: 'Detailed lead inquiry description.' },
  ];

  return (
    <div className="relative min-h-screen dotted-grid pb-24">
      {/* Background glowing meshes */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Nav bar */}
      <Navbar activePage="schemas" />

      <div className="max-w-7xl mx-auto px-6 pt-20">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="font-bold text-4xl text-primary tracking-tight">API Lead Schema</h1>
            <p className="text-on-surface-variant text-sm mt-2">
              Explore the exact fields, data types, and enum constraints enforced by our validation layer.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Fields table */}
            <div className="lg:col-span-7 space-y-4 xl:-ml-12">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">list_alt</span>
                <h3 className="font-semibold text-base text-primary">Field Specifications</h3>
              </div>
              <div className="overflow-auto border border-outline-variant/20 rounded-2xl bg-surface-container-low/40 backdrop-blur-md max-h-[500px]">
                <table className="w-full border-collapse text-left text-xs text-on-surface-variant table-auto">
                  <thead className="sticky top-0 bg-[#0c1328] border-b border-outline-variant/35 text-primary font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Field</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Required</th>
                      <th className="px-4 py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, idx) => (
                      <tr key={field.name} className={`border-b border-outline-variant/10 ${idx % 2 === 0 ? 'bg-surface-container-lowest/10' : 'bg-surface-container/15'}`}>
                        <td className="px-4 py-3 font-code-label font-bold text-secondary">{field.name}</td>
                        <td className="px-4 py-3 font-mono text-[10px]">{field.type}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border inline-block whitespace-nowrap ${
                              field.req === 'Conditional'
                                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                : field.req === 'Required'
                                ? 'bg-error/10 text-error border-error-container/20'
                                : 'bg-surface-variant/40 text-on-surface-variant border-transparent'
                            }`}
                          >
                            {field.req}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-outline max-w-[200px]">{field.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TypeScript Code Block */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">code</span>
                  <h3 className="font-semibold text-base text-primary">TypeScript Definition</h3>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="bg-surface-variant/30 hover:bg-surface-variant/70 border border-outline-variant/20 px-3 py-1 rounded-lg text-[10px] font-code-label flex items-center gap-1.5 text-on-surface-variant transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">
                    {copied ? 'done' : 'content_copy'}
                  </span>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="bg-black/45 border border-outline-variant/20 rounded-2xl p-4 font-mono text-[11px] text-outline-variant overflow-x-auto shadow-xl select-all whitespace-pre">
                {typescriptSchema}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
