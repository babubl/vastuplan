import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Container } from "../components/ui";
import FeedbackButton from "../components/Feedback";

const UPDATED = "10 October 2026";

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line py-8 lg:grid lg:grid-cols-[0.75fr_1.25fr] lg:gap-10">
      <h2 className="text-[22px] leading-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-[16px] leading-relaxed text-body lg:mt-0">{children}</div>
    </section>
  );
}

export default function Legal() {
  const { hash } = useLocation();
  useEffect(() => { document.title = "Terms of use and privacy · VastuPlan"; if (hash) document.getElementById(hash.slice(1))?.scrollIntoView(); }, [hash]);
  return (
    <Container className="max-w-5xl py-14 lg:py-20">
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Public beta</p>
      <h1 className="mt-3 text-[40px] sm:text-[56px]">Terms of use and privacy</h1>
      <p className="mt-5 max-w-2xl text-[18px] leading-relaxed text-body">The short version: VastuPlan gives you free concept plans to think with. They are not construction or approval drawings. Your plot details stay in your browser unless you choose to ask the AI architect or send us feedback.</p>
      <p className="num mt-4 text-[13px] text-muted">Last updated {UPDATED}</p>

      <div className="mt-12">
        <Section title="1. What VastuPlan is">
          <p>VastuPlan generates concept floor plans, 3D views, Vastu and livability reports, interior suggestions and rough quantity and cost estimates from the plot details you enter. It is in public beta: features change, and some plots or room combinations may give poor or no results.</p>
        </Section>
        <Section title="2. Concept plans, not construction drawings">
          <p>Everything VastuPlan produces is indicative. Before you build or apply for approval:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>a registered architect must prepare the drawings and check them against your local building bye-laws, setbacks, FSI or FAR limits, and the approved layout of your plot;</li>
            <li>a qualified structural engineer must design the foundation, columns, beams and slabs after a soil test. The column positions shown are a guide to spacing only;</li>
            <li>plumbing, drainage, septic and electrical work must follow local rules and be done by licensed professionals.</li>
          </ul>
          <p>Quantities and costs use common thumb rules and placeholder rates. Real costs depend on your city, materials, contractor and the market, and can differ widely.</p>
        </Section>
        <Section title="3. Vastu guidance">
          <p>Vastu Shastra is a traditional body of knowledge, and texts, regions and practitioners differ. VastuPlan follows widely used conventions, explains the reason behind each rule and notes where sources disagree. It does not promise any outcome to health, wealth or wellbeing. Consult a Vastu practitioner you trust if you want a personal reading.</p>
        </Section>
        <Section title="4. Using the service">
          <p>You may use VastuPlan, and the plans it makes for you, for your own home and to discuss with your architect, engineer, family or builder. Please don't scrape the service, overload it, try to break its security or misuse the AI assistant. We may limit or stop access that does.</p>
          <p>The VastuPlan software, design and written content belong to us. The plans generated from your inputs are yours to use.</p>
        </Section>
        <Section title="5. The AI architect">
          <p>The Ask tab sends your question and a short text summary of your plan to Google's Gemini model through our server to write a reply. AI answers can be wrong or incomplete. Treat them as a second opinion to discuss with a professional, not as advice to rely on.</p>
        </Section>
        <Section title="6. No warranty and limits of liability">
          <p>VastuPlan is provided free and "as is", without warranties of any kind, express or implied, including fitness for a particular purpose. To the extent the law allows, we are not liable for any loss or damage arising from the use of the plans, reports, estimates or AI answers, including any building, approval, cost or legal decision you make based on them.</p>
        </Section>
        <Section title="7. Changes and governing law">
          <p>We may update these terms as the service develops; the date at the top shows the latest version. These terms are governed by the laws of India.</p>
        </Section>

        <Section id="privacy" title="Privacy">
          <p><strong className="text-ink">No account, no tracking.</strong> VastuPlan has no sign-up, no advertising and no analytics or tracking cookies.</p>
          <p><strong className="text-ink">Your plot details stay on your device.</strong> Plans are generated inside your browser. Your settings live in the page address, so a link you share carries them; nothing is stored on our side. Your choice of feet or metres is saved in your browser's local storage.</p>
          <p><strong className="text-ink">When data leaves your device.</strong></p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><em>Ask the architect:</em> your messages and a text summary of the plan (plot size, facing, rooms and their zones) go to our server and on to Google's Gemini API to produce a reply. We don't store these conversations. Google processes them under its <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer" className="text-cobalt">Gemini API terms</a>.</li>
            <li><em>Feedback:</em> what you write, your rating, the page and plot settings you were on, and any contact detail you choose to give are stored for up to 12 months so we can act on it. We keep a one-way hash of your network address to stop spam, never the address itself.</li>
            <li><em>Hosting:</em> the site is served by GitHub Pages and the server by Cloudflare. Like any web host they process your IP address to deliver pages and protect against abuse.</li>
          </ul>
          <p>We don't sell or share your data with anyone else. To have your feedback deleted, or for any privacy question, write to us through the feedback form with the text of your note. This notice is written with India's Digital Personal Data Protection Act, 2023 in mind.</p>
        </Section>

        <Section title="Contact">
          <p>Questions, corrections or a plan that came out wrong: <FeedbackButton label="send us a note" className="inline font-semibold text-cobalt underline" />. You can also read <Link to="/method" className="text-cobalt">how the plans are made</Link>.</p>
        </Section>
      </div>
    </Container>
  );
}
