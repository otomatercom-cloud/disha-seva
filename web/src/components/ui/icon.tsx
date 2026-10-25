import {
  Briefcase, Check, Droplet, Flower2, Globe, Handshake, Palette, Scale, GraduationCap, HandHeart, HeartPulse, LifeBuoy, PartyPopper, School, Siren,
  Stethoscope, Users, Utensils, type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  droplet: Droplet, "heart-pulse": HeartPulse, "graduation-cap": GraduationCap, "hand-heart": HandHeart,
  "party-popper": PartyPopper, "life-buoy": LifeBuoy, utensils: Utensils, stethoscope: Stethoscope,
  school: School, briefcase: Briefcase, siren: Siren, users: Users, check: Check,
  flower: Flower2, globe: Globe, handshake: Handshake, palette: Palette, scale: Scale,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = MAP[name] ?? HandHeart;
  return <Cmp className={className} aria-hidden />;
}
