import FeaturedSlider from '@/components/FeaturedSlider';
import Flicker from '@/components/Flicker';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';
import LightMark from '@/components/LightMark';
import Preloader from '@/components/Preloader';
import Reveal from '@/components/Reveal';
import Team from '@/components/Team';
import styles from './home.module.css';

export default function Home() {
  return (
    <main>
      <Preloader />
      <Hero />
      <LightMark />

      <section className={`wrap ${styles.reverie}`}>
        <Flicker>
          <p className="mono">The reverie</p>
        </Flicker>
        <Reveal className={styles.reverieText}>
          <p>
            Hollowtide was founded on a single conviction: a game should feel like a dream you can’t quite reconstruct in the
            morning. Not the kind you forget after credits roll, but the kind that leaves you unsure which parts were ever
            really there.
          </p>
          <p>
            Our work draws from liminal spaces, fading memory, and the soft dread of places that rearrange themselves when you
            look away. We don’t chase trends or comfort zones. We build worlds that drift, erode, and forget, where the player
            is never sure what they remember and the ground is never quite where it was.
          </p>
        </Reveal>
      </section>

      <FeaturedSlider />
      <Team />
      <Footer />
    </main>
  );
}
