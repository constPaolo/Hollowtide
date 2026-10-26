import Footer from '@/components/Footer';
import Pillars from '@/components/Pillars';
import Spiral from '@/components/Spiral';
import Team from '@/components/Team';
import WordLight from '@/components/WordLight';
import { galleryImages, manifesto } from '@/data/studio';

export const metadata = { title: 'Studio' };

export default function StudioPage() {
  return (
    <main>
      <Spiral images={galleryImages.slice(0, 19)} heading="We exist in the space where waking ends and the world quietly comes apart" />
      <WordLight paragraphs={manifesto} />
      <Pillars />
      <Team />
      <Footer />
    </main>
  );
}
