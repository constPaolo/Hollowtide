// The four worlds in the studio's catalogue. Images live in
// public/images/projects/<slug>/: cover.jpg plus four stills.

const stills = slug => [1, 2, 3, 4].map(n => `/images/projects/${slug}/${n}.jpg`);

export const projects = [
  {
    slug: 'the-long-hallway',
    title: 'The Long Hallway',
    kind: 'Environment',
    theme: 'Liminal drift',
    years: '2023–2025',
    cover: '/images/projects/the-long-hallway/cover.jpg',
    stills: stills('the-long-hallway'),
    teaser:
      'A corridor that keeps offering the same door. Every time you reach the end, you are standing where you began, a little less certain you ever moved.',
    headline: 'A corridor that never quite lets you leave',
    story:
      'The Long Hallway is a walking exploration piece built around a single corridor that folds back on itself. The player pushes forward through identical stretches of carpet and flickering sconces, convinced each door ahead is new, only to find the same handle waiting under their palm. Distance stops meaning anything. The only proof you are moving at all is how much less sure of it you become.',
  },
  {
    slug: 'tideglass',
    title: 'Tideglass',
    kind: 'Sequence',
    theme: 'Dream logic',
    years: '2022–2024',
    cover: '/images/projects/tideglass/cover.jpg',
    stills: stills('tideglass'),
    teaser:
      'A flooded house seen through water that never settles. Beneath the surface, rooms you remember living in arrange themselves out of order.',
    headline: 'A house submerged in a memory that keeps refilling',
    story:
      'Tideglass is a slow-swimming sequence set inside a house that never finished flooding. The player drifts from room to room through water that refuses to sit still, watching furniture and doorways rearrange the moment they look away. Nothing under the surface stays where it was left. Every return trip finds the house a little further from the one you remember.',
  },
  {
    slug: 'afterimage',
    title: 'Afterimage',
    kind: 'Narrative',
    theme: 'Memory erosion',
    years: '2022–2025',
    cover: '/images/projects/afterimage/cover.jpg',
    stills: stills('afterimage'),
    teaser:
      'A town rebuilt entirely from one person’s fading memory. The closer you look, the more the details dissolve and quietly replace themselves.',
    headline: 'A town rebuilt from a memory that won’t hold still',
    story:
      'Afterimage is a first-person dream-walker built around a single town reconstructed entirely from one person’s fading memory. The player wanders streets that blur at the edges, revisiting rooms that quietly rearrange and faces that lose their features the longer you look. Nothing stays fixed. Every place you return to has already begun to forget itself.',
  },
  {
    slug: 'soft-static',
    title: 'Soft Static',
    kind: 'Environment',
    theme: 'Atmospheric reverie',
    years: '2023–2024',
    cover: '/images/projects/soft-static/cover.jpg',
    stills: stills('soft-static'),
    teaser:
      'An empty resort at the edge of sleep, lit by a sky that hums. Something out past the treeline keeps waving, and it knows your name.',
    headline: 'An empty resort lit by a sky that hums',
    story:
      'Soft Static is an atmospheric wander through an off-season resort caught at the edge of sleep. The player follows lit paths between empty cabins under a sky that never stops humming, while something past the treeline keeps waving like it’s been expecting you. Nobody else is here. Whatever is out there already knows your name.',
  },
];

export function findProject(slug) {
  return projects.find(p => p.slug === slug);
}

export function nextProject(slug) {
  const i = projects.findIndex(p => p.slug === slug);
  return projects[(i + 1) % projects.length];
}
