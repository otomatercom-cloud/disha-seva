export type GalleryPhoto = { src: string; alt: string; year?: number; category?: string };

/**
 * Fallback gallery photos (year/category are sample values until real ones are set in Odoo), used only until staff upload photos in Odoo (DISHA Website > Photo Gallery).
 * To add files here: drop them in /public/gallery and list them below. Write a real description in `alt`;
 * it is the caption and the screen-reader text.
 */
export const GALLERY: GalleryPhoto[] = [
  { src: "/gallery/mass-yoga.jpg", alt: "Volunteers and families performing mass yoga at a DISHA Yoga Meet", year: 2023, category: "Yoga" },
  { src: "/gallery/yoga-meet-stage.jpg", alt: "DISHA office bearers and guests on stage at the Yoga Meet", year: 2023, category: "Yoga" },
  { src: "/gallery/blood-donation-camps.jpg", alt: "DISHA blood donation camps organised by unit councils", year: 2023, category: "Blood Donation" },
  { src: "/gallery/cultural-dance.jpg", alt: "Classical dance performance at a DISHA cultural programme", year: 2022, category: "Cultural" },
  { src: "/gallery/community-gathering.jpg", alt: "Community members and dignitaries at a DISHA event", year: 2022, category: "Community" },
  { src: "/gallery/inauguration-lamp-lighting.jpg", alt: "Traditional lamp lighting at a DISHA inauguration", year: 2021, category: "Inauguration" },
  { src: "/gallery/yoga-meet-stage-night.jpg", alt: "Evening Yoga Meet programme on stage", year: 2023, category: "Yoga" },
  { src: "/gallery/volunteers-yoga-meet.jpg", alt: "DISHA volunteers together at the Yoga Meet", year: 2023, category: "Yoga" },
];
