import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIResponse {
  records: any[];
  skipped: { originalRow: any; reason: string }[];
}

export function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  // Strip starting ```json or ```
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  // Strip ending ```
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

function runSimulatedMapping(prompt: string): AIResponse {
  // Extract rows from prompt
  const startIndex = prompt.lastIndexOf('### New Data Batch to Map:\n');
  let batch: any[] = [];
  if (startIndex !== -1) {
    const jsonStr = prompt.substring(startIndex + '### New Data Batch to Map:\n'.length);
    try {
      batch = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.error('Failed to parse prompt batch JSON:', e);
    }
  }

  const records: any[] = [];
  const skipped: any[] = [];

  for (const row of batch) {
    let email = '';
    let phone = '';
    let name = '';
    let city = '';
    let state = '';
    let country = '';
    let company = '';
    let leadOwner = 'Auto Rep';
    let crmStatus = '';
    let dataSource = '';
    let remarks = '';

    for (const [key, val] of Object.entries(row)) {
      const kLower = key.toLowerCase();
      const vStr = String(val).trim();

      if (vStr.includes('@') && !email) {
        email = vStr.split(/[;,]/)[0].trim();
      } else if (vStr.replace(/\D/g, '').length >= 8 && vStr.replace(/\D/g, '').length <= 15 && !phone) {
        phone = vStr;
      } else if ((kLower.includes('name') || kLower.includes('client') || kLower.includes('lead')) && !name) {
        name = vStr;
      } else if (kLower.includes('city') && !city) {
        city = vStr;
      } else if (kLower.includes('state') && !state) {
        state = vStr;
      } else if (kLower.includes('country') && !country) {
        country = vStr;
      } else if ((kLower.includes('company') || kLower.includes('org')) && !company) {
        company = vStr;
      } else if (kLower.includes('owner') || kLower.includes('rep') || kLower.includes('agent')) {
        leadOwner = vStr;
      } else if (kLower.includes('status')) {
        const statuses = ['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE'];
        crmStatus = statuses[Math.floor(Math.random() * statuses.length)];
      } else if (kLower.includes('source') || kLower.includes('project') || kLower.includes('site')) {
        const sources = ['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots'];
        dataSource = sources[Math.floor(Math.random() * sources.length)];
      } else if (kLower.includes('remarks') || kLower.includes('comment') || kLower.includes('note') || kLower.includes('description')) {
        remarks = vStr;
      }
    }

    if (!name && email) {
      name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    if (!email && !phone) {
      skipped.push({
        originalRow: row,
        reason: 'No email or phone number found in row keys'
      });
    } else {
      records.push({
        created_at: new Date().toISOString(),
        name: name || 'Mock User',
        email,
        country_code: phone.startsWith('+') ? phone.slice(0, 3) : '+91',
        mobile_without_country_code: phone,
        company,
        city,
        state,
        country,
        lead_owner: leadOwner,
        crm_status: crmStatus || 'GOOD_LEAD_FOLLOW_UP',
        crm_note: remarks ? `Simulated: ${remarks}` : 'Simulated import mode fallback',
        data_source: dataSource || 'leads_on_demand',
        possession_time: 'Immediate',
        description: `Imported via local heuristic mapper (Fallback mode active)`
      });
    }
  }

  return { records, skipped };
}

export async function callAIModel(prompt: string, systemInstruction: string): Promise<AIResponse> {
  const provider = process.env.AI_PROVIDER || 'gemini';
  const openAIApiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

  // Fallback to Simulated AI Mapping Mode if API keys are missing
  if ((provider === 'openai' && !openAIApiKey) || (provider === 'gemini' && !geminiApiKey)) {
    console.warn(`[WARNING] AI API key is missing. Running in Simulated AI Mapping Mode.`);
    return runSimulatedMapping(prompt);
  }

  try {
    if (provider === 'openai') {
      if (!openAIApiKey) {
        throw new Error('OPENAI_API_KEY is not defined in environment variables');
      }
      const openai = new OpenAI({ apiKey: openAIApiKey });
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      });

      const text = response.choices[0]?.message?.content || '';
      const cleaned = cleanJsonResponse(text);
      return JSON.parse(cleaned) as AIResponse;
    } else {
      // Default to Gemini API
      if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY is not defined in environment variables');
      }
      
      const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = cleanJsonResponse(text);
      return JSON.parse(cleaned) as AIResponse;
    }
  } catch (apiErr: any) {
    console.warn(`[WARNING] AI Model call failed: ${apiErr.message || apiErr}. Falling back to Simulated Heuristic Mode.`);
    return runSimulatedMapping(prompt);
  }
}
