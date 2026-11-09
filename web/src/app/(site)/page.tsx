import {
  CollabAndReports, ContactStrip, Hero, Impact, Intro, Marquee, OurMoments, Pillars, JoinCta,
} from "@/components/sections/home";
import { Events } from "@/components/sections/events";
import { getContent } from "@/lib/content";

export default async function HomePage() {
  const c = await getContent();
  const on = (n: string) => c.show(`home.show.${n}`);
  return (
    <>
      {on("hero") && <Hero />}
      {on("marquee") && <Marquee />}
      {on("intro") && <Intro />}
      {on("pillars") && <Pillars />}
      {on("impact") && <Impact />}
      {on("events") && <Events />}
      {on("moments") && <OurMoments />}
      {on("join") && <JoinCta />}
      {on("collab") && <CollabAndReports />}
      {on("contact") && <ContactStrip />}
    </>
  );
}
