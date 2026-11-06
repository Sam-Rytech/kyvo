import { ImageResponse } from 'next/og';
import { monthLabel, usd } from '@/lib/format';
import { loadSharedReport } from '@/lib/wrapped-share';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Kyvo Dollar Wrapped';

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const report = await loadSharedReport((await params).code);

  return new ImageResponse(
    report ? (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#ffc21a', color: '#24103a', padding: 60 }}>
        <div style={{ fontSize: 32, color: '#24103a' }}>{`Kyvo Dollar Wrapped, ${monthLabel(report.month)} ${report.month.slice(0, 4)}`}</div>
        <div style={{ fontSize: 170, fontWeight: 700, color: '#24103a', marginTop: 20 }}>{report.accuracy === null ? 'No bills' : `${report.accuracy}%`}</div>
        <div style={{ fontSize: 36, color: '#24103a' }}>Forecast accuracy</div>
        <div style={{ fontSize: 30, color: '#24103a', marginTop: 34 }}>{`Off by ${usd(report.memoryError)} with memory, ${usd(report.blankError)} without`}</div>
        <div style={{ fontSize: 24, color: '#24103a', marginTop: 34 }}>Hindcast, replayed from real history</div>
      </div>
    ) : (
      <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#ffc21a', fontSize: 60, color: '#24103a' }}>Kyvo</div>
    ),
    size,
  );
}
