import { NextRequest, NextResponse } from 'next/server';
import { jobStore } from '@/lib/jobStore';
import { processImportJob } from '@/lib/ai/batchProcessor';
import { waitUntil } from '@vercel/functions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rows, batchSize = 30 } = body;

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'Missing or invalid "rows" array in request body' }, { status: 400 });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'The rows array cannot be empty' }, { status: 400 });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Create the job record in the global store
    jobStore.createJob(jobId, rows.length);

    // Run the processor in the background with Next.js waitUntil() to keep the container alive in serverless environment
    waitUntil(
      processImportJob(jobId, rows, batchSize).catch((err) => {
        console.error(`Background job processor crashed for jobId ${jobId}:`, err);
        jobStore.failJob(jobId, err.message || 'Background execution failed');
      })
    );

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (err: any) {
    console.error('Error starting import process:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred while initiating the lead mapping job' },
      { status: 500 }
    );
  }
}
