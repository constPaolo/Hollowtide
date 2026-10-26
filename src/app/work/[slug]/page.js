import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Flicker from '@/components/Flicker';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import { findProject, nextProject, projects } from '@/data/projects';
import styles from './project.module.css';

export function generateStaticParams() {
  return projects.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const project = findProject((await params).slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.teaser,
    openGraph: { images: [project.cover] },
  };
}

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const project = findProject(slug);
  if (!project) notFound();
  const next = nextProject(slug);
  const [banner, ...stills] = project.stills;

  return (
    <main>
      <section className={styles.hero}>
        <Reveal immediate delay={0.65} className={styles.heroText}>
          <h1 className={`serif ${styles.title}`}>{project.title}</h1>
        </Reveal>
      </section>

      <section className={styles.banner}>
        <Image src={banner} alt={`${project.title}, still 1`} fill priority sizes="100vw" />
      </section>

      <section className={styles.overview}>
        <div className={`wrap ${styles.overviewHead}`}>
          <Reveal className={styles.headline}>
            <h2 className="serif">{project.headline}</h2>
          </Reveal>
          <Flicker>
            <p className="mono">{project.years.replace('–', ' - ')}</p>
          </Flicker>
        </div>

        <div className={`wrap ${styles.overviewBody}`}>
          <Flicker className={styles.label}>
            <p className="mono">Project brief</p>
          </Flicker>
          <div className={styles.story}>
            <Reveal>
              <p className="serif">{project.story}</p>
            </Reveal>
            <Flicker>
              <p className="mono">{project.kind} · {project.theme}</p>
            </Flicker>
          </div>
        </div>
      </section>

      <section className={styles.stills} aria-label={`${project.title} stills`}>
        {stills.map((src, i) => (
          <figure key={src} className={styles.still}>
            <Image src={src} alt={`${project.title}, still ${i + 2}`} fill sizes="(max-width: 1000px) 100vw, 75vw" />
          </figure>
        ))}
      </section>

      <section className={styles.next}>
        <Link href={`/work/${next.slug}`} className={styles.nextLink}>
          <Flicker>
            <p className="mono">Next project</p>
          </Flicker>
          <Reveal>
            <h2 className={`serif ${styles.nextTitle}`}>{next.title}</h2>
          </Reveal>
        </Link>
      </section>

      <Footer />
    </main>
  );
}
