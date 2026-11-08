import {
  CollabAndReports, ContactStrip, Hero, Impact, Intro, Marquee, OurMoments, Pillars, JoinCta,
} from "@/components/sections/home";
import { Events } from "@/components/sections/events";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Marquee />
      <Intro />
      <Pillars />
      <Impact />
      <Events />
      <OurMoments />
      <JoinCta />
      <CollabAndReports />
      <ContactStrip />
    </>
  );
}
