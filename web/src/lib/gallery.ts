export type GalleryPhoto = { src: string; alt: string };

/**
 * Fallback gallery photos, used only until staff upload photos in Odoo (DISHA Website > Photo Gallery).
 * To add files here: drop them in /public/gallery and list them below. Write a real description in `alt`;
 * it is the caption and the screen-reader text.
 */
export const GALLERY: GalleryPhoto[] = [
  { src: "/gallery/mass-yoga.jpg", alt: "Volunteers and families performing mass yoga at a DISHA Yoga Meet" },
  { src: "/gallery/yoga-meet-stage.jpg", alt: "DISHA office bearers and guests on stage at the Yoga Meet" },
  { src: "/gallery/blood-donation-camps.jpg", alt: "DISHA blood donation camps organised by unit councils" },
  { src: "/gallery/cultural-dance.jpg", alt: "Classical dance performance at a DISHA cultural programme" },
  { src: "/gallery/community-gathering.jpg", alt: "Community members and dignitaries at a DISHA event" },
  { src: "/gallery/inauguration-lamp-lighting.jpg", alt: "Traditional lamp lighting at a DISHA inauguration" },
  { src: "/gallery/yoga-meet-stage-night.jpg", alt: "Evening Yoga Meet programme on stage" },
  { src: "/gallery/volunteers-yoga-meet.jpg", alt: "DISHA volunteers together at the Yoga Meet" },
];
