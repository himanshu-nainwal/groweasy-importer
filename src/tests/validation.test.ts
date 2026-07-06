import { describe, it, expect } from 'vitest';
import { leadRecordSchema } from '../lib/zodSchema';

describe('Zod Schema Validation', () => {
  it('should validate a correct lead record', () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      country_code: '+1',
      mobile_without_country_code: '5551234567',
      crm_status: 'GOOD_LEAD_FOLLOW_UP',
      data_source: 'meridian_tower',
    };

    const result = leadRecordSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('John Doe');
      expect(result.data.crm_status).toBe('GOOD_LEAD_FOLLOW_UP');
      expect(result.data.data_source).toBe('meridian_tower');
    }
  });

  it('should fall back to empty string for invalid enum values', () => {
    const invalidEnums = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      crm_status: 'INVALID_STATUS_VALUE', // should fallback to ''
      data_source: 'SUPER_PROJECT_2026', // should fallback to ''
    };

    const result = leadRecordSchema.safeParse(invalidEnums);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.crm_status).toBe('');
      expect(result.data.data_source).toBe('');
    }
  });

  it('should strip non-digits from mobile numbers', () => {
    const dirtyPhone = {
      name: 'Bob',
      email: 'bob@example.com',
      mobile_without_country_code: ' (555) 123-4567 ',
    };

    const result = leadRecordSchema.safeParse(dirtyPhone);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mobile_without_country_code).toBe('5551234567');
    }
  });

  it('should fail validation if both email and phone are missing', () => {
    const missingContacts = {
      name: 'Ghost Lead',
      company: 'Acme Corp',
    };

    const result = leadRecordSchema.safeParse(missingContacts);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Lead must have at least an email or mobile number');
    }
  });

  it('should validate and format created_at date', () => {
    const badDate = {
      email: 'test@example.com',
      created_at: 'not-a-date',
    };

    const result = leadRecordSchema.safeParse(badDate);
    expect(result.success).toBe(true);
    if (result.success) {
      // should fallback to current ISO string
      expect(new Date(result.data.created_at || '').getTime()).not.toBeNaN();
    }
  });
});
