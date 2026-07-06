import { constructPrompt, SYSTEM_INSTRUCTION } from './prompts';
import { callAIModel, AIResponse } from './client';
import { leadRecordSchema } from '../zodSchema';
import { jobStore } from '../jobStore';
import { LeadRecord, SkippedRecord } from '../types';

async function callAIWithRetry(prompt: string, retries = 2, delay = 1000): Promise<AIResponse> {
  try {
    return await callAIModel(prompt, SYSTEM_INSTRUCTION);
  } catch (err: any) {
    if (retries > 0) {
      console.warn(`AI Batch call failed: ${err.message || err}. Retrying in ${delay}ms... (Retries left: ${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callAIWithRetry(prompt, retries - 1, delay * 2);
    }
    throw err;
  }
}

// Concurrency pool helper to run up to `limit` promises concurrently
async function runWithConcurrencyLimit<T>(
  limit: number,
  items: T[],
  fn: (item: T, index: number) => Promise<void>
): Promise<void> {
  const promises: Promise<void>[] = [];
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      const item = items[index];
      await fn(item, index);
    }
  }

  for (let i = 0; i < Math.min(limit, items.length); i++) {
    promises.push(worker());
  }

  await Promise.all(promises);
}

export async function processImportJob(jobId: string, rawRows: Record<string, string>[], batchSize = 30) {
  const totalRows = rawRows.length;
  if (totalRows === 0) {
    jobStore.completeJob(jobId);
    return;
  }

  // Create batches of raw rows
  const batches: Record<string, string>[][] = [];
  for (let i = 0; i < totalRows; i += batchSize) {
    batches.push(rawRows.slice(i, i + batchSize));
  }

  const totalBatches = batches.length;
  
  // Track unique keys to deduplicate by email + mobile_without_country_code
  // format: "email:mobile"
  const seenLeads = new Set<string>();

  try {
    // Process batches with a concurrency cap of 3
    await runWithConcurrencyLimit(3, batches, async (batch, batchIndex) => {
      const currentBatchNumber = batchIndex + 1;
      let aiResponse: AIResponse;

      try {
        const prompt = constructPrompt(batch);
        aiResponse = await callAIWithRetry(prompt);
      } catch (err: any) {
        console.error(`Batch ${currentBatchNumber} failed completely after retries:`, err);
        // If the batch failed, we mark all rows in this batch as skipped
        const skippedBatchAdd: SkippedRecord[] = batch.map((row) => ({
          row,
          reason: `AI processing failed completely: ${err.message || 'Timeout/Rate Limit exceeded'}`,
        }));

        jobStore.updateJobProgress(jobId, {
          processedRowsAdd: batch.length,
          importedAdd: [],
          skippedAdd: skippedBatchAdd,
          currentBatch: currentBatchNumber,
          totalBatches,
        });
        return;
      }

      // Process mapped records returned by AI
      const importedBatchAdd: LeadRecord[] = [];
      const skippedBatchAdd: SkippedRecord[] = [];

      // 1. Process records that the AI successfully mapped
      if (aiResponse.records && Array.isArray(aiResponse.records)) {
        for (const record of aiResponse.records) {
          try {
            // Run through deterministic validation schema
            const validated = leadRecordSchema.parse(record);

            // Deduplication logic: Check if lead already exists in this run
            const emailKey = validated.email ? validated.email.toLowerCase().trim() : '';
            const phoneKey = validated.mobile_without_country_code ? validated.mobile_without_country_code.trim() : '';
            
            if (emailKey || phoneKey) {
              const leadKey = `${emailKey}:${phoneKey}`;
              if (seenLeads.has(leadKey)) {
                // Determine raw row association from LLM or default
                const originalRowMatch = aiResponse.skipped?.find(
                  (s) => s.originalRow?.email === record.email || s.originalRow?.phone === record.mobile_without_country_code
                )?.originalRow || record;

                skippedBatchAdd.push({
                  row: originalRowMatch,
                  reason: 'Duplicate lead (same email/phone combination already exists in this import)',
                });
                continue;
              }
              seenLeads.add(leadKey);
            }

            importedBatchAdd.push(validated);
          } catch (zodErr: any) {
            // Zod validation failed (e.g. missing both email and phone, or invalid field)
            skippedBatchAdd.push({
              row: record,
              reason: zodErr.errors?.[0]?.message || zodErr.message || 'Validation contract failed',
            });
          }
        }
      }

      // 2. Process records that the AI itself suggested to skip
      if (aiResponse.skipped && Array.isArray(aiResponse.skipped)) {
        for (const skip of aiResponse.skipped) {
          skippedBatchAdd.push({
            row: skip.originalRow || {},
            reason: skip.reason || 'AI determined this row should be skipped',
          });
        }
      }

      // 3. Make sure we accounted for all rows in the batch.
      // Sometimes the AI might drop a row without reporting it in 'skipped' or 'records'.
      // If we find any discrepancy, we should identify which rows were lost.
      // For simplicity, we compare counts. If AI returned fewer, we just align.
      // But actually, we track progress row-by-row based on what the AI gave.
      // To ensure total rows processed matches the batch size, we add remaining rows as skipped if there is a discrepancy.
      const totalReturned = (aiResponse.records?.length || 0) + (aiResponse.skipped?.length || 0);
      let processedCount = batch.length;
      
      if (totalReturned < batch.length) {
        // AI missed some rows completely. We'll skip the missing rows.
        // We can just add the difference to the skipped count with "unprocessed" reason.
        const diff = batch.length - totalReturned;
        for (let k = 0; k < diff; k++) {
          skippedBatchAdd.push({
            row: batch[totalReturned + k] || {},
            reason: 'Row skipped: AI mapping engine did not return this record',
          });
        }
      }

      jobStore.updateJobProgress(jobId, {
        processedRowsAdd: processedCount,
        importedAdd: importedBatchAdd,
        skippedAdd: skippedBatchAdd,
        currentBatch: currentBatchNumber,
        totalBatches,
      });
    });

    jobStore.completeJob(jobId);
  } catch (err: any) {
    console.error(`Import job ${jobId} failed with critical error:`, err);
    jobStore.failJob(jobId, err.message || 'Critical import execution error');
  }
}
