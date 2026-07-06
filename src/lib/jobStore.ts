import { ImportJob } from './types';

// Ensure the job store survives Next.js hot-reloads during local development
const globalForJobs = globalThis as unknown as {
  importJobs: Map<string, ImportJob>;
};

if (!globalForJobs.importJobs) {
  globalForJobs.importJobs = new Map<string, ImportJob>();
}

export const jobStore = {
  createJob(jobId: string, totalRows: number): ImportJob {
    const job: ImportJob = {
      jobId,
      status: 'processing',
      progress: {
        totalRows,
        processedRows: 0,
        importedCount: 0,
        skippedCount: 0,
        currentBatch: 0,
        totalBatches: 0,
      },
      imported: [],
      skipped: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalForJobs.importJobs.set(jobId, job);
    return job;
  },

  getJob(jobId: string): ImportJob | undefined {
    return globalForJobs.importJobs.get(jobId);
  },

  updateJobProgress(
    jobId: string,
    updates: {
      processedRowsAdd: number;
      importedAdd: any[];
      skippedAdd: any[];
      currentBatch: number;
      totalBatches: number;
    }
  ) {
    const job = globalForJobs.importJobs.get(jobId);
    if (!job) return;

    job.progress.processedRows += updates.processedRowsAdd;
    job.progress.importedCount += updates.importedAdd.length;
    job.progress.skippedCount += updates.skippedAdd.length;
    job.progress.currentBatch = updates.currentBatch;
    job.progress.totalBatches = updates.totalBatches;

    job.imported.push(...updates.importedAdd);
    job.skipped.push(...updates.skippedAdd);
    job.updatedAt = new Date().toISOString();

    globalForJobs.importJobs.set(jobId, job);
  },

  completeJob(jobId: string) {
    const job = globalForJobs.importJobs.get(jobId);
    if (!job) return;

    job.status = 'completed';
    job.updatedAt = new Date().toISOString();
    globalForJobs.importJobs.set(jobId, job);
  },

  failJob(jobId: string, error: string) {
    const job = globalForJobs.importJobs.get(jobId);
    if (!job) return;

    job.status = 'failed';
    job.error = error;
    job.updatedAt = new Date().toISOString();
    globalForJobs.importJobs.set(jobId, job);
  },

  listJobs(): ImportJob[] {
    return Array.from(globalForJobs.importJobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  clearAll() {
    globalForJobs.importJobs.clear();
  }
};
