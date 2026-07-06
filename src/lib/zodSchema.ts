import { z } from 'zod';

export const CRMStatusEnum = z.enum([
  'GOOD_LEAD_FOLLOW_UP',
  'DID_NOT_CONNECT',
  'BAD_LEAD',
  'SALE_DONE',
  ''
]);

export const DataSourceEnum = z.enum([
  'leads_on_demand',
  'meridian_tower',
  'eden_park',
  'varah_swamy',
  'sarjapur_plots',
  ''
]);

export const leadRecordSchema = z.object({
  created_at: z.string().optional().transform((val) => {
    if (!val) return new Date().toISOString();
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }),
  name: z.string().optional().default(''),
  email: z.string().optional().transform((val) => val?.trim() || ''),
  country_code: z.string().optional().default(''),
  mobile_without_country_code: z.string().optional().transform((val) => {
    if (!val) return '';
    // Strip non-digits to get just the clean local phone number digits
    return val.replace(/\D/g, '');
  }),
  company: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  country: z.string().optional().default(''),
  lead_owner: z.string().optional().default(''),
  crm_status: CRMStatusEnum.catch(''),
  crm_note: z.string().optional().default(''),
  data_source: DataSourceEnum.catch(''),
  possession_time: z.string().optional().default(''),
  description: z.string().optional().default('')
}).refine(data => {
  const hasEmail = typeof data.email === 'string' && data.email.trim() !== '';
  const hasPhone = typeof data.mobile_without_country_code === 'string' && data.mobile_without_country_code.trim() !== '';
  return hasEmail || hasPhone;
}, {
  message: "Lead must have at least an email or mobile number",
  path: ['email', 'mobile_without_country_code']
});

export type ValidatedLead = z.infer<typeof leadRecordSchema>;
