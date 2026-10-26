import Flicker from '@/components/Flicker';
import ImageTrail from '@/components/ImageTrail';
import Reveal from '@/components/Reveal';
import { contact, trailImages } from '@/data/studio';
import styles from './contact.module.css';

export const metadata = { title: 'Connect' };

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <ImageTrail images={trailImages} />

      <div className={styles.copy}>
        <Reveal className={styles.main} immediate delay={0.65}>
          <div className={styles.col}>
            {contact.location.map((line, i) => (
              <p key={line} className={i === 0 ? styles.lead : undefined}>
                {line}
              </p>
            ))}
          </div>
          <div className={styles.col}>
            <p>Open a channel</p>
            <p>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </p>
            <p>{contact.socials.join(' / ')}</p>
            <p>{contact.phone}</p>
          </div>
        </Reveal>

        <Flicker className={`wrap mono ${styles.foot}`} immediate delay={1}>
          <p>© 2026 Hollowtide</p>
          <p>
            Developed by{' '}
            <a href="https://www.paolomeccariello.dev/" target="_blank" rel="noopener noreferrer">
              Paolo Meccariello
            </a>
          </p>
        </Flicker>
      </div>
    </main>
  );
}
