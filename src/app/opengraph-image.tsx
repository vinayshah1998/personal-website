import { ImageResponse } from 'next/og';

export const alt = 'Vinay Shah - product-minded software engineer';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          color: '#15201e',
          background: '#f7f8f5',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            width: 88,
            display: 'flex',
            background: '#087f78',
          }}
        />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '68px 76px 56px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22 }}>
            <span>VINAY SHAH</span>
            <span style={{ color: '#087f78' }}>FIELD NOTES / SOFTWARE</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ fontSize: 78, lineHeight: 1, maxWidth: 900 }}>
              Useful systems, built from the real constraint.
            </div>
            <div style={{ fontSize: 28, color: '#40504c' }}>
              AI products / mobile tools / reliable infrastructure
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              color: '#40504c',
              fontSize: 21,
            }}
          >
            <span>OBSERVE</span>
            <span style={{ width: 110, height: 2, background: '#cbd4cf' }} />
            <span>DECIDE</span>
            <span style={{ width: 110, height: 2, background: '#cbd4cf' }} />
            <span>SHIP</span>
            <span style={{ width: 110, height: 2, background: '#cbd4cf' }} />
            <span>MEASURE</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
