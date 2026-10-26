export const manifesto = [
  'Hollowtide is a design-led game studio that works in the half-light between sleeping and waking. We make experiences for people who want to be unmoored, moved, and gently lost inside worlds that feel like memories they never had.',
  'We work at the intersection of systems design and dream logic. Every project ships only when a world feels familiar in a way the player can’t explain, and stays with them long after they’ve put it down.',
];

export const principles = [
  {
    title: 'Drift over direction',
    image: '/images/studio/principle-1.jpg',
    text: 'We don’t herd players down corridors toward a clean objective. We design worlds you wander into, where intention dissolves and you follow a feeling instead of a marker. Getting lost is not a failure state. It is the whole point.',
  },
  {
    title: 'Atmosphere first',
    image: '/images/studio/principle-2.jpg',
    text: 'Every project begins with a feeling, not a feature list. We define the emotional signature of a world before we write a single line of code. If we cannot describe how the game makes you feel in one sentence, it is not ready to be built.',
  },
  {
    title: 'Worlds that remember',
    image: '/images/studio/principle-3.jpg',
    text: 'Our spaces don’t stay still. Rooms rearrange when you look away, paths you’ve walked grow unfamiliar, and the world keeps a quiet record of where you’ve been. The player is never quite sure whether the place has changed, or they have.',
  },
  {
    title: 'Restraint as language',
    image: '/images/studio/principle-4.jpg',
    text: 'We say more by showing less. An empty room carries more weight than a crowded one. A single light failing at the end of a hall says more than any cutscene. Every element earns its place through subtraction, and what remains is only what the dream needs to exist.',
  },
];

export const team = [
  { name: 'Kai Tanaka', role: 'Creative director', photo: '/images/team/1.jpg' },
  { name: 'Lena Voss', role: 'Lead sound designer', photo: '/images/team/2.jpg' },
  { name: 'Erik Holm', role: 'Systems architect', photo: '/images/team/3.jpg' },
  { name: 'Mara Chen', role: 'Art director', photo: '/images/team/4.jpg' },
  { name: 'Sol Rieve', role: 'Narrative designer', photo: '/images/team/5.jpg' },
];

export const galleryImages = Array.from({ length: 20 }, (_, i) => `/images/studio/gallery-${String(i + 1).padStart(2, '0')}.jpg`);

export const trailImages = Array.from({ length: 19 }, (_, i) => `/images/contact/trail-${String(i + 1).padStart(2, '0')}.jpg`);

export const contact = {
  email: 'signal@hollowtide.studio',
  phone: '+01 (555) 1998-RE',
  location: ['Raccoon City', 'Arklay Mountains', 'Spencer Mansion', '34.0522 / -118.2437', 'UMB-1998'],
  socials: ['Instagram', 'YouTube', 'X'],
};
