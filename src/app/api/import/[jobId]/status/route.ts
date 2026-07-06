import { NextRequest, NextResponse } from 'next/server';
import { jobStore } from '@/lib/jobStore';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params;
    const job = jobStore.getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (err: any) {
    console.error('Error fetching job status:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred while fetching the import job status' },
      { status: 500 }
    );
  }
}
