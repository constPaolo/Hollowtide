import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      className="wrap"
      style={{ minHeight: '100svh', display: 'grid', placeContent: 'center', justifyItems: 'center', gap: '1.5rem', textAlign: 'center' }}
    >
      <p className="mono dim">Error 404</p>
      <h1 className="serif" style={{ fontSize: 'var(--display)', maxWidth: '12ch' }}>
        This room isn’t here anymore
      </h1>
      <Link href="/" className="mono" style={{ textDecoration: 'underline', textUnderlineOffset: 4 }}>
        Back to the index
      </Link>
    </main>
  );
}
