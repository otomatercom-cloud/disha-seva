/**
 * Single source of truth for every editable piece of website content.
 * - The site renders these as fallbacks when Odoo is unreachable.
 * - `npm run content:export` turns them into the Odoo seed data (addon disha_site_content),
 *   where staff edit them. Keep this file plain data (no imports) so Node can run it directly.
 * Text kinds: line (one line), text (paragraph), long (multi-paragraph, see RichText), image.
 */
export type TextKind = "line" | "text" | "long" | "image";
export type TextDef = [page: string, label: string, value: string, kind?: TextKind];
export type ItemDef = { title: string; text?: string; icon?: string };

const LEGAL_PRIVACY = `This policy explains what personal information DISHA collects when you apply for membership or raise a support request, why we collect it and how it is protected.

## Information we collect
Through the membership application form we collect the details on DISHA's paper application: your name, gender, date of birth, nationality, contact numbers and email, blood group (optional), education and occupation, your city and region in Saudi Arabia, your Iqama and passport numbers, your permanent address in India, two emergency contacts, an optional passport-size photograph, and your declaration of consent. We ask only for what membership administration needs.

## How we use it
- To review your application, create your membership record and issue your digital ID card.
- To contact you about DISHA activities, programmes and official communication.
- To contact your emergency contacts if needed during activities.

## Sensitive identity details
Iqama and passport numbers are visible only to DISHA managers authorised to approve memberships. They are never shown on your ID card or in the card's QR code, which confirms membership status only.

## Storage and access
Applications are stored in DISHA's secure membership system and are accessible only to authorised DISHA office bearers and staff. Data is sent over encrypted connections. We do not sell your information.

## Sharing
We do not share your personal information with third parties except where required by law.

## Your choices
You may ask to see, correct or delete your information, or withdraw your consent to be contacted, by emailing {email} and quoting your application number.

## Contact
Questions about this policy: {email}.`;

const LEGAL_TERMS = `## Use of this website
This website is provided by DISHA (Dedicated team for Indo Saudi Holistic Alignment) to share information about our activities and to receive membership applications and support requests. Please use it lawfully and do not attempt to disrupt or misuse it.

## Membership application
By applying you confirm that the information you provide is true and correct, and that you agree to abide by the constitution, rules, code of conduct and decisions of the organisation. Submitting an application does not guarantee membership; DISHA may review, approve or decline applications.

## Accuracy of information
General guidance on this site (for example on passports or Iqama services) is not official advice. Always confirm requirements with the relevant embassy or authority.

## Changes
We may update these terms from time to time. Continued use of the site means you accept the updated terms.

## Contact
Questions: {email}.`;

export const TEXTS: Record<string, TextDef> = {
  // ---- Site-wide
  "site.name": ["Site-wide", "Organisation name", "DISHA"],
  "site.tagline": ["Site-wide", "Header tagline", "Dedicated team for Indo Saudi Holistic Alignment"],
  "site.logo": ["Site-wide", "Logo (square PNG, transparent)", "", "image"],
  "site.email": ["Site-wide", "Contact email", "dishaindians@gmail.com"],
  "site.address": ["Site-wide", "Address", "Kingdom of Saudi Arabia (National Committee)"],
  "site.hours": ["Site-wide", "Office hours", "Sun – Thu, 9am – 6pm"],
  "site.join": ["Site-wide", "Membership button label", "Become a Member"],
  "seo.title": ["Site-wide", "Browser title (home)", "DISHA | Dedicated team for Indo Saudi Holistic Alignment"],
  "seo.description": ["Site-wide", "Search-engine description", "DISHA is a socio-cultural organisation in the Kingdom of Saudi Arabia enhancing holistic alignment between India and Saudi Arabia through culture, yoga, community welfare and service.", "text"],
  // ---- Menu & footer
  "nav.home": ["Menu & footer", "Menu: Home", "Home"],
  "nav.about": ["Menu & footer", "Menu: About", "About Us"],
  "nav.indians": ["Menu & footer", "Menu: Indians in KSA", "Indians in KSA"],
  "nav.seva": ["Menu & footer", "Menu: Activities", "Our Activities"],
  "nav.gallery": ["Menu & footer", "Menu: Gallery", "Gallery"],
  "nav.collab": ["Menu & footer", "Menu: Collaborations", "Partners"],
  "nav.reports": ["Menu & footer", "Menu: Reports", "Reports"],
  "nav.contact": ["Menu & footer", "Menu: Contact", "Contact"],
  "nav.support": ["Menu & footer", "Menu: Support", "Support"],
  "footer.support": ["Menu & footer", "Footer link: Track a request", "Track a Support Request"],
  "footer.about": ["Menu & footer", "Footer description", "A leading socio-cultural organisation in the Kingdom of Saudi Arabia, working for cultural enrichment and social service.", "text"],
  "footer.explore": ["Menu & footer", "Footer heading: Explore", "Explore"],
  "footer.join": ["Menu & footer", "Footer link: Membership", "Membership Application"],
  "footer.contact": ["Menu & footer", "Footer heading: Contact", "Contact"],
  "footer.rights": ["Menu & footer", "Copyright line (after year and name)", "All rights reserved."],
  "footer.privacy": ["Menu & footer", "Footer link: Privacy", "Privacy Policy"],
  "footer.terms": ["Menu & footer", "Footer link: Terms", "Terms & Conditions"],
  // ---- Home
  "home.hero.badge": ["Home", "Hero badge", "DISHA · Kingdom of Saudi Arabia"],
  "home.hero.title_main": ["Home", "Hero headline (white part)", "Aligning India and Saudi Arabia,"],
  "home.hero.title_accent": ["Home", "Hero headline (orange word)", "Holistically.", ],
  "home.hero.intro": ["Home", "Hero paragraph", "Cultural enrichment combined with social service to create a loving community, through yoga, culture, welfare and volunteering across the Kingdom.", "text"],
  "home.hero.cta1": ["Home", "Hero button 1", "Become a Member"],
  "home.hero.cta2": ["Home", "Hero button 2", "Our Activities"],
  "home.intro.image": ["Home", "About section photo", "", "image"],
  "home.intro.image_alt": ["Home", "About section photo description", "Mass yoga performance at a DISHA Yoga Meet"],
  "home.intro.badge": ["Home", "About section orange badge", "Serving since 2021"],
  "home.intro.eyebrow": ["Home", "About eyebrow", "About DISHA"],
  "home.intro.title": ["Home", "About heading", "A socio-cultural family across the Kingdom"],
  "home.intro.body": ["Home", "About paragraph", "DISHA was officially inaugurated on 23 June 2021 and works with the Embassy of India Riyadh, the Saudi Yoga Committee, the Arab Yoga Foundation and Saudi cultural organisations, besides many community welfare activities for both Indian and Saudi people.", "text"],
  "home.intro.link": ["Home", "About link text", "Learn more about us"],
  "home.pillars.eyebrow": ["Home", "Pillars eyebrow", "What we do"],
  "home.pillars.title": ["Home", "Pillars heading", "Culture, service and community"],
  "home.impact.eyebrow": ["Home", "Impact eyebrow", "Our reach"],
  "home.impact.number": ["Home", "Impact big number", "3250"],
  "home.impact.suffix": ["Home", "Impact number suffix", "+"],
  "home.impact.text": ["Home", "Impact sentence", "active volunteers from different parts of India, working through 232 centres across the Kingdom of Saudi Arabia.", "text"],
  "home.moments.eyebrow": ["Home", "Moments eyebrow", "Our Moments"],
  "home.moments.title": ["Home", "Moments heading", "Snapshots of community spirit"],
  "home.moments.intro": ["Home", "Moments sentence", "Yoga meets, cultural programmes and community service across Saudi Arabia."],
  "home.moments.link": ["Home", "Moments link text", "View full gallery"],
  "home.join.eyebrow": ["Home", "Membership eyebrow", "Membership"],
  "home.join.title": ["Home", "Membership heading", "Be part of the DISHA family."],
  "home.join.body": ["Home", "Membership paragraph", "Indian nationals residing in the Kingdom of Saudi Arabia can apply as a General or Associate member. Apply online in a few minutes and receive your digital membership ID card once approved.", "text"],
  "home.join.note": ["Home", "Membership small note", "General & Associate membership · Digital ID card"],
  "home.collab.eyebrow": ["Home", "Partners eyebrow", "Partners"],
  "home.collab.title": ["Home", "Partners heading", "Working together with embassies and institutions"],
  "home.collab.body": ["Home", "Partners paragraph", "DISHA collaborates with the Embassy of India Riyadh, the Saudi Yoga Committee, the Arab Yoga Foundation and community partners to deliver cultural and welfare programmes.", "text"],
  "home.collab.cta": ["Home", "Partners button", "Partnership enquiries"],
  "home.reports.eyebrow": ["Home", "Reports eyebrow", "Programmes and highlights"],
  "home.contact.title": ["Home", "Contact strip heading", "Get in touch"],
  // ---- About
  "about.title": ["About", "Page heading", "About DISHA"],
  "about.intro": ["About", "Page intro", "Dedicated team for Indo Saudi Holistic Alignment: a leading socio-cultural organisation in the Kingdom of Saudi Arabia.", "text"],
  "about.formation.title": ["About", "Formation heading", "Our formation"],
  "about.formation.text": ["About", "Formation text", "DISHA was formed to enhance holistic alignment between India and Saudi Arabia. It was officially inaugurated on 23 June 2021, with Padma Shri Awardee Smt. Nouf Al Marwaai, founder of the Arab Yoga Foundation and President of the Saudi Yoga Committee, launching the organisation. Shri Y. Sabir, Deputy Consul General of India, Jeddah, attended as Chief Guest. DISHA's Regional Committees were announced on 27 October 2021 at its first National Conference.", "text"],
  "about.vision.title": ["About", "Vision heading", "Our vision"],
  "about.vision.text": ["About", "Vision text", "Be part of cultural enrichment combined with social service to create a loving community.", "text"],
  "about.mission.title": ["About", "Mission heading", "Our mission"],
  "about.mission.text": ["About", "Mission text", "To work for cultural enrichment along with social services for citizens and residents of Saudi Arabia by facilitating social, cultural, art, language, academic exchanges and trade between Saudi Arabia and India.", "text"],
  "about.goals.title": ["About", "Goals heading", "What we focus on"],
  "about.forums.title": ["About", "Structure heading", "Our structure"],
  "about.forums.intro": ["About", "Structure sentence", "A National Committee for KSA, three Provincial Committees and unit councils in twelve cities."],
  "about.team.title": ["About", "Office bearers heading", "Key office bearers"],
  "about.team.intro": ["About", "Office bearers sentence", "The National Committee and advisors guiding DISHA."],
  "about.support.title": ["About", "Community support heading", "What our members do"],
  // ---- Indians in KSA
  "indians.title": ["Indians in KSA", "Page heading", "Indians in KSA"],
  "indians.intro": ["Indians in KSA", "Page intro", "Information and support for Indian residents across Saudi Arabia."],
  "indians.helps.title": ["Indians in KSA", "How DISHA helps heading", "How DISHA helps"],
  "indians.faq.title": ["Indians in KSA", "FAQ heading", "Frequently asked questions"],
  "indians.faq.note": ["Indians in KSA", "FAQ disclaimer", "This is general guidance. Always confirm requirements on the official Indian Embassy or Saudi government websites.", "text"],
  // ---- Activities & gallery
  "seva.title": ["Activities", "Page heading", "Our Activities"],
  "seva.intro": ["Activities", "Page intro", "Cultural enrichment and community service: what DISHA and its unit councils do across Saudi Arabia."],
  "seva.gallery.title": ["Activities", "Gallery section heading", "Gallery"],
  "seva.gallery.intro": ["Activities", "Gallery section sentence", "Snapshots of DISHA programmes across the Kingdom."],
  "seva.gallery.link": ["Activities", "Gallery link text", "View full gallery"],
  "gallery.title": ["Gallery", "Page heading", "Photo Gallery"],
  "gallery.intro": ["Gallery", "Page intro", "Snapshots of yoga meets, cultural programmes and community service across Saudi Arabia."],
  "gallery.cta": ["Gallery", "Call-to-action sentence", "Be part of the next moment."],
  // ---- Partners, reports, contact
  "collab.title": ["Partners", "Page heading", "Partners & Collaborations"],
  "collab.intro": ["Partners", "Page intro", "DISHA works with embassies, cultural bodies and community organisations."],
  "collab.enquiry.title": ["Partners", "Enquiry heading", "Partnership enquiries"],
  "collab.enquiry.text": ["Partners", "Enquiry sentence", "Tell us about your organisation and how you would like to collaborate."],
  "collab.enquiry.button": ["Partners", "Enquiry button (before email)", "Email"],
  "reports.title": ["Reports", "Page heading", "Programmes & Reports"],
  "reports.intro": ["Reports", "Page intro", "A look at what DISHA volunteers and supporters have achieved together."],
  "reports.download": ["Reports", "Download link label", "Download report"],
  "contact.title": ["Contact", "Page heading", "Contact Us"],
  "contact.intro": ["Contact", "Page intro", "We'd love to hear from you."],
  "contact.email_label": ["Contact", "Card title: Email", "Email"],
  "contact.address_label": ["Contact", "Card title: Address", "Address"],
  "contact.hours_label": ["Contact", "Card title: Office hours", "Office hours"],
  "contact.cta": ["Contact", "Call-to-action sentence", "Want to help? Join DISHA and support the Indo-Saudi community."],
  // ---- Membership page
  "join.eyebrow": ["Membership page", "Eyebrow", "Membership Application"],
  "join.title": ["Membership page", "Heading", "Apply for DISHA membership"],
  "join.intro": ["Membership page", "Intro", "For Indian nationals residing in the Kingdom of Saudi Arabia. Fill in the same details as the DISHA paper form; your digital ID card is emailed once approved.", "text"],
  "join.time": ["Membership page", "Progress label left", "About 5 minutes"],
  "join.sections": ["Membership page", "Progress label right", "4 short sections"],
  "join.next.title": ["Membership page", "Side card heading", "What happens next"],
  "join.help.title": ["Membership page", "Questions card heading", "Questions?"],
  "join.help.text": ["Membership page", "Questions card text", "Write to us and we will help you choose between General and Associate membership.", "text"],
  // ---- Support tickets
  "support.eyebrow": ["Support", "Request page: eyebrow", "DISHA Support"],
  "support.title": ["Support", "Request page: heading", "Get help with visa, iqama and other issues"],
  "support.intro": ["Support", "Request page: intro", "Tell us what you need. You will get a private tracking token to follow your request and talk to our team.", "text"],
  "support.next.title": ["Support", "Side card heading", "How it works"],
  "support.track.title": ["Support", "Track card heading", "Already have a token?"],
  "support.track.text": ["Support", "Track card text", "Check the status of your request and read replies from our team.", "text"],
  "support.track.button": ["Support", "Track card button", "Track my request"],
  "track.title": ["Support", "Track page: heading", "Track your support request"],
  "track.intro": ["Support", "Track page: intro", "Enter the token you received when you submitted your request.", "text"],
  "track.new": ["Support", "Track page: new request link", "Need to raise a new request?"],
  // ---- Legal
  "privacy.title": ["Legal", "Privacy: heading", "Privacy Policy"],
  "privacy.intro": ["Legal", "Privacy: intro", "How DISHA handles membership and support information."],
  "privacy.body": ["Legal", "Privacy: body (## = heading, - = bullet, {email} = contact email)", LEGAL_PRIVACY, "long"],
  "terms.title": ["Legal", "Terms: heading", "Terms & Conditions"],
  "terms.intro": ["Legal", "Terms: intro", "Terms for using this website and applying for membership."],
  "terms.body": ["Legal", "Terms: body (## = heading, - = bullet, {email} = contact email)", LEGAL_TERMS, "long"],
};

export const ICONS = [
  "droplet", "heart-pulse", "graduation-cap", "hand-heart", "party-popper", "life-buoy", "utensils",
  "stethoscope", "school", "briefcase", "siren", "users", "check", "flower", "globe", "handshake", "palette", "scale",
] as const;

export const COLLECTIONS: Record<string, { label: string; items: ItemDef[] }> = {
  hero_checks: { label: "Home: hero tick list", items: [
    { title: "Yoga Meets and cultural exchange" }, { title: "Blood donation and welfare camps" }, { title: "Legal awareness for expats" }] },
  hero_cards: { label: "Home: hero floating cards", items: [
    { title: "Yoga Meet 2023", text: "2,780 joined in Riyadh alone", icon: "flower" },
    { title: "Blood Donation", text: "150+ donors in 2024 camps", icon: "droplet" },
    { title: "Legal Awareness", text: "115+ expats attended online", icon: "scale" }] },
  services: { label: "Home: scrolling services strip", items: [
    { title: "Yoga Meets" }, { title: "Cultural Exchange" }, { title: "Blood Donation" },
    { title: "Chithranjali (children's art)" }, { title: "Legal Awareness" }, { title: "Onam Vasanthotsavam" }] },
  goals: { label: "Goals (Home and About)", items: [
    { title: "Cultural enrichment combined with social service." },
    { title: "Social, cultural, art, language and academic exchanges between Saudi Arabia and India." },
    { title: "Trade and community welfare for citizens and residents of Saudi Arabia." }] },
  pillars: { label: "Home: four pillars", items: [
    { title: "Yoga & Wellbeing", text: "International Day of Yoga celebrations in partnership with the Saudi Yoga Committee, with thousands taking part.", icon: "flower" },
    { title: "Cultural Exchange", text: "Indo-Saudi cultural events, festival celebrations and Universal Oneness Day that share the idea of one family.", icon: "party-popper" },
    { title: "Community Welfare", text: "Blood donation camps with leading hospitals and support for the community in need.", icon: "heart-pulse" },
    { title: "Awareness & Education", text: "Legal awareness sessions for expats and Chithranjali art programmes that encourage children.", icon: "graduation-cap" }] },
  impact: { label: "Home: impact list", items: [
    { title: "Yoga Meets", text: "2,780 people in Riyadh and 1,910 in Dammam joined the 2023 Yoga Meet.", icon: "flower" },
    { title: "Blood donation camps", text: "Camps with King Khalid Hospital, Prince Sultan Center for Health and King Saud University Medical City.", icon: "droplet" },
    { title: "Chithranjali", text: "More than 100 children took part in each centre across the three regions.", icon: "palette" }] },
  member_tags: { label: "Home: activity tags", items: [
    "Yoga", "Culture & Art", "Blood Donation", "Children's Programmes", "Legal Awareness",
    "Community Welfare", "Language & Academics", "Indo-Saudi Exchange", "Festival Celebrations", "Youth"].map((title) => ({ title })) },
  forums: { label: "About: committees", items: [
    { title: "Central Province Committee", text: "Unit councils: Al-Kharj, South Riyadh, North Riyadh, Qassim.", icon: "users" },
    { title: "Western Province Committee", text: "Unit councils: Jeddah, Najran, Jizan, Yanbu, Taif.", icon: "users" },
    { title: "Eastern Province Committee", text: "Unit councils: Dammam, Jubail, Al-Khobar.", icon: "users" }] },
  team: { label: "About: key office bearers", items: [
    { title: "Kanakalal KM", text: "National President", icon: "users" },
    { title: "Rajendran Cheriyal", text: "General Secretary", icon: "users" },
    { title: "Arun S Balan", text: "Secretary", icon: "users" },
    { title: "V Rajesh Moolaveettil", text: "Treasurer", icon: "users" },
    { title: "Suresh K", text: "National Co-ordinator", icon: "users" },
    { title: "R Ganesh Babu", text: "National Advisor, Arab Region", icon: "users" },
    { title: "Sajeev Surya B", text: "Advisor, Arab Region", icon: "users" },
    { title: "Byju Parol", text: "Regional Advisor, Dammam", icon: "users" },
    { title: "Sivaprasad", text: "Regional Advisor, Dammam", icon: "users" },
    { title: "Chandra Babu", text: "Regional Advisor, Jeddah", icon: "users" },
    { title: "Unni Ponnaramthottam", text: "Regional Co-Advisor, Jeddah", icon: "users" },
    { title: "Libin Vadavathi", text: "Regional Co-Advisor, Riyadh", icon: "users" }] },
  stats: { label: "About: key figures", items: [
    { title: "232", text: "Working centres in KSA" }, { title: "3,250+", text: "Active volunteers" },
    { title: "3", text: "Provincial committees" }, { title: "12", text: "Unit councils" }] },
  support: { label: "About: what members do", items: [
    { title: "Cultural Events", text: "Festival celebrations, Onam Vasanthotsavam and Indo-Saudi cultural exchange.", icon: "party-popper" },
    { title: "Yoga Meets", text: "International Day of Yoga with the Saudi Yoga Committee.", icon: "flower" },
    { title: "Blood Donation", text: "Camps with hospitals around Saudi Founding Day.", icon: "droplet" },
    { title: "Legal Awareness", text: "Sessions with legal experts so expats know the rules and regulations.", icon: "scale" }] },
  activities: { label: "Activities: cards", items: [
    { title: "DISHA Yoga Meet", text: "Celebrating the International Day of Yoga with the Saudi Yoga Committee and the support of the Embassy of India, with mass yoga and cultural performances in Riyadh, Dammam and Jeddah.", icon: "flower" },
    { title: "Universal Oneness Day", text: "The first Raksha Bandhan celebration of its kind in Saudi Arabia, held with the Saudi Brotherhood and the Arab Yoga Foundation to share 'Vasudhaiva Kutumbakam'.", icon: "globe" },
    { title: "Indo-Saudi Cultural Exchange", text: "Cultural exchange events as part of Saudi National Day celebrations with dignitaries from India and Saudi Arabia.", icon: "handshake" },
    { title: "Blood Donation Camps", text: "Camps by unit councils around Saudi Founding Day with King Khalid Hospital, Prince Sultan Center for Health and King Saud University Medical City.", icon: "droplet" },
    { title: "Chithranjali", text: "Children's art programmes in all three regions to encourage, motivate and enhance children from different communities.", icon: "palette" },
    { title: "Legal Awareness", text: "Online legal awareness programme for expats with First Advice Lawfirm, covering the rules and regulations of KSA.", icon: "scale" },
    { title: "Onam Vasanthotsavam", text: "Festival celebrations led by unit councils with people from many states of India, Nepal and Bangladesh.", icon: "party-popper" }] },
  helps: { label: "Indians in KSA: how DISHA helps", items: [
    { title: "Legal awareness", text: "Sessions with legal experts so residents understand the rules and regulations of the Kingdom." },
    { title: "Health and blood donation", text: "Blood donation camps and community welfare activities run by unit councils." },
    { title: "Children and culture", text: "Chithranjali art programmes, festival celebrations and yoga events for families." },
    { title: "Support requests", text: "Raise a visa, iqama or other request on this site and track it with a private token." }] },
  faq: { label: "Indians in KSA: FAQ", items: [
    { title: "Passport renewal", text: "Check the embassy website for current guidelines and required documents." },
    { title: "Iqama services", text: "Visit the Jawazat office or use the Absher online portal." },
    { title: "Madad registration", text: "Register on the Madad platform through the embassy website." },
    { title: "Travel advisories", text: "Look in the news section of the embassy website." },
    { title: "DISHA membership", text: "Fill out the membership application form on this website." }] },
  collab_cards: { label: "Partners: cards", items: [
    { title: "Embassy of India, Riyadh", text: "DISHA programmes are aligned with and supported by the Embassy." },
    { title: "Saudi Yoga Committee & Arab Yoga Foundation", text: "Partners for Yoga Meets and the Olympic virtual yoga competition for children." },
    { title: "SALAM and community partners", text: "Saudi cultural organisation SALAM and hospitals, schools and law firms." }] },
  reports: { label: "Reports (optional PDF)", items: [
    { title: "Yoga Meet 2023", text: "Held on 16 June 2023 in Riyadh (2,780 participants), Dammam (1,910) and Jeddah (300) with the Saudi Yoga Committee." },
    { title: "Blood donation 2023-2024", text: "101 donors in 2023 and 150+ in 2024 across camps in Al-Kharj and Riyadh." },
    { title: "Legal awareness 2024", text: "Online programme on 17 January 2024 with First Advice Lawfirm, attended by more than 115 people." }] },
  steps: { label: "Membership page: what happens next", items: [
    { title: "We receive your application", text: "You get an application number straight away, generated by our membership system." },
    { title: "Our committee reviews it", text: "A DISHA office bearer reviews your details and category (General or Associate)." },
    { title: "Your ID card is emailed", text: "Once approved, your digital membership ID card (PDF with QR) arrives by email." }] },
  support_steps: { label: "Support page: how it works", items: [
    { title: "Submit your request", text: "Choose a category and urgency. Emergencies and medical cases are prioritised automatically." },
    { title: "Save your token", text: "You receive a private token once. Keep it safe: it is the only way to open your request." },
    { title: "Track and reply", text: "Use the token on the Track page to see status, read our replies and add messages." }] },
  gallery: { label: "Photo gallery (upload photos in Odoo)", items: [] },
};
