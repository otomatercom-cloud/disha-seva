import {
  CollabAndReports, ContactStrip, Hero, Impact, Intro, Marquee, OurMoments, Pillars, JoinCta,
} from "@/components/sections/home";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Marquee />
      <Intro />
      <Pillars />
      <Impact />
      <OurMoments />
      <JoinCta />
      <CollabAndReports />
      <ContactStrip />
    </>
  );
}
