import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import heroPod from "@/assets/hero-pod.jpg";
import tributeSatyamev from "@/assets/tribute-satyamev.jpg";
import tributeGrandfather from "@/assets/tribute-grandfather.jpg";
import tributeKalam from "@/assets/tribute-kalam.jpg";
import tributeSavitribai from "@/assets/tribute-savitribai.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vidya Pods — Free Home Tuitions for Every Child" },
      { name: "description", content: "A pod-based education system bringing free home tuitions to school-going kids. Teachers paid, Proctors empowered, Sponsors changing lives." },
      { property: "og:title", content: "Vidya Pods — Sponsor a Learning Pod" },
      { property: "og:description", content: "Kids learn free. Teachers get paid. Sponsors fuel hope. Join the movement." },
    ],
  }),
  component: Index,
});

// Replace with your real payment links
const SPONSOR_MONTHLY_LINK = "#sponsor-monthly";
const SPONSOR_YEARLY_LINK = "#sponsor-yearly";

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.7s ease-out ${delay}ms, transform 0.7s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function Counter({ to, suffix = "", duration = 1600 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        setN(Math.floor(p * to));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      io.disconnect();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{n.toLocaleString()}{suffix}</span>;
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/70 border-b border-border/60">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2 font-display font-bold text-xl">
          <span className="inline-block w-8 h-8 rounded-xl bg-gradient-hero shadow-glow" />
          Vidya Pods
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#how" className="hover:text-foreground transition">How it Works</a>
          <a href="#impact" className="hover:text-foreground transition">Impact</a>
          <a href="#showcase" className="hover:text-foreground transition">People</a>
          <a href="#tributes" className="hover:text-foreground transition">Inspired By</a>
          <a href="#faq" className="hover:text-foreground transition">FAQ</a>
        </nav>
        <a
          href="#sponsor"
          className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-2 text-sm font-semibold hover:bg-primary hover:text-primary-foreground transition-all hover:scale-105"
        >
          Sponsor →
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-warm" />
      <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="absolute -bottom-32 -left-32 w-[480px] h-[480px] rounded-full bg-accent/25 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
            A Grassroots Education Movement
          </div>
          <h1 className="mt-6 text-5xl md:text-7xl font-black leading-[1.02]">
            Every child deserves <br />
            <span className="text-gradient">a teacher at home.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl">
            Vidya Pods brings <strong className="text-foreground">free home tuitions</strong> to school-going kids through tiny learning pods — run by real teachers, managed by proctors, fuelled by sponsors like you.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#sponsor"
              className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-hero text-primary-foreground px-7 py-4 font-semibold shadow-glow hover:shadow-lift transition-all hover:-translate-y-0.5"
            >
              Become a Sponsor
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border-2 border-foreground/15 bg-card px-7 py-4 font-semibold hover:border-foreground/40 transition-all"
            >
              See How Pods Work
            </a>
          </div>
          <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {["🧒","👧","🧑‍🏫","👨"].map((e) => (
                <div key={e} className="w-9 h-9 rounded-full bg-card border-2 border-background shadow-soft flex items-center justify-center text-base">{e}</div>
              ))}
            </div>
            <span>Join <strong className="text-foreground">120+ sponsors</strong> already powering pods.</span>
          </div>
        </div>

        <div className="relative animate-fade-up" style={{ animationDelay: "200ms" }}>
          <div className="absolute -inset-6 bg-gradient-hero rounded-[2.5rem] blur-2xl opacity-40" />
          <img
            src={heroPod}
            alt="A warm home learning pod with children and a teacher"
            width={1536}
            height={1024}
            className="relative rounded-[2rem] shadow-lift w-full h-auto"
          />
          <div className="absolute -bottom-6 -left-6 bg-card rounded-2xl shadow-lift p-4 flex items-center gap-3 animate-float">
            <div className="w-12 h-12 rounded-xl bg-accent/30 flex items-center justify-center text-2xl">🎓</div>
            <div>
              <div className="text-xs text-muted-foreground">Active Pods</div>
              <div className="font-bold text-lg"><Counter to={47} /></div>
            </div>
          </div>
          <div className="absolute -top-6 -right-6 bg-card rounded-2xl shadow-lift p-4 flex items-center gap-3 animate-float" style={{ animationDelay: "1.5s" }}>
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-2xl">❤️</div>
            <div>
              <div className="text-xs text-muted-foreground">Kids Learning</div>
              <div className="font-bold text-lg"><Counter to={312} /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { n: 312, s: "+", label: "Kids Learning Free" },
    { n: 47, s: "", label: "Active Pods" },
    { n: 38, s: "", label: "Teachers Paid" },
    { n: 9, s: "", label: "Cities Reached" },
  ];
  return (
    <section id="impact" className="relative py-20 bg-gradient-dusk text-primary-foreground overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((st, i) => (
          <Reveal key={st.label} delay={i * 100}>
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-black font-display">
                <Counter to={st.n} suffix={st.s} />
              </div>
              <div className="mt-2 text-sm uppercase tracking-widest opacity-80">{st.label}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const roles = [
    { icon: "🧒", title: "The Kid", color: "oklch(0.72 0.15 165)", desc: "Gets free, consistent home tuition in a small pod of 4–6 friends. Learns together, grows together." },
    { icon: "🧑‍🏫", title: "The Teacher", color: "oklch(0.68 0.19 45)", desc: "A local educator who teaches the pod 3–5 times a week. Gets paid fairly and on time — every month." },
    { icon: "🛡️", title: "The Proctor", color: "oklch(0.35 0.12 275)", desc: "The glue. Manages scheduling, communication with parents, and keeps the pod running smoothly." },
    { icon: "💛", title: "The Sponsor", color: "oklch(0.65 0.2 150)", desc: "You. Fund one pod monthly or for a whole year. Every rupee goes to teachers, books, and kids." },
  ];
  const steps = [
    { n: "01", t: "Sponsor a Pod", d: "Pick monthly or yearly. We match you with a pod in need." },
    { n: "02", t: "We Assemble", d: "A proctor finds a teacher + 4–6 local kids and sets up a home venue." },
    { n: "03", t: "Classes Begin", d: "Kids learn 3–5 days a week, with books, stationery, and love included." },
    { n: "04", t: "You See Impact", d: "Monthly reports with photos, attendance, and a thank-you note from the pod." },
  ];
  return (
    <section id="how" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary">How it Works</div>
            <h2 className="mt-3 text-4xl md:text-5xl font-black">A simple system. <span className="text-gradient">Four heroes.</span></h2>
            <p className="mt-4 text-lg text-muted-foreground">No bureaucracy. No waste. Just four roles working together to change one child's life at a time.</p>
          </div>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map((r, i) => (
            <Reveal key={r.title} delay={i * 120}>
              <div className="group relative h-full p-7 rounded-3xl bg-card border border-border hover:border-primary/40 shadow-soft hover:shadow-lift transition-all hover:-translate-y-2 overflow-hidden">
                <div
                  className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 group-hover:opacity-40 transition-opacity blur-2xl"
                  style={{ backgroundColor: r.color }}
                />
                <div className="relative">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-soft"
                    style={{ backgroundColor: `color-mix(in oklab, ${r.color} 20%, transparent)` }}
                  >
                    {r.icon}
                  </div>
                  <h3 className="mt-5 text-2xl font-bold">{r.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{r.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Gamified journey */}
        <div className="mt-24">
          <Reveal>
            <h3 className="text-3xl md:text-4xl font-black text-center">Your journey as a Sponsor</h3>
          </Reveal>
          <div className="relative mt-12">
            <div className="hidden md:block absolute top-10 left-[12%] right-[12%] h-1 bg-gradient-hero rounded-full opacity-30" />
            <div className="grid md:grid-cols-4 gap-8">
              {steps.map((s, i) => (
                <Reveal key={s.n} delay={i * 150}>
                  <div className="relative text-center">
                    <div className="relative mx-auto w-20 h-20 rounded-full bg-gradient-hero text-primary-foreground flex items-center justify-center font-black text-xl shadow-glow animate-pulse-glow">
                      {s.n}
                    </div>
                    <h4 className="mt-5 font-bold text-lg">{s.t}</h4>
                    <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type Person = { name: string; role: string; detail: string; emoji: string };
const PEOPLE: Record<string, Person[]> = {
  Students: [
    { name: "Aarav, 9", role: "Grade 4 · Jaipur", detail: "Loves math puzzles and cricket.", emoji: "🧒" },
    { name: "Ishita, 11", role: "Grade 6 · Lucknow", detail: "Dreams of becoming a doctor.", emoji: "👧" },
    { name: "Rehan, 8", role: "Grade 3 · Bhopal", detail: "Draws rockets in every notebook.", emoji: "🚀" },
    { name: "Priya, 12", role: "Grade 7 · Patna", detail: "Topped her last science test.", emoji: "🌟" },
  ],
  Teachers: [
    { name: "Neha Sharma", role: "Science · Jaipur", detail: "7 years of teaching kids she loves.", emoji: "🧑‍🏫" },
    { name: "Ravi Kumar", role: "Mathematics · Lucknow", detail: "Former IIT coach, now a pod teacher.", emoji: "👨‍🏫" },
    { name: "Anita Das", role: "English · Bhopal", detail: "Turns grammar into storytelling.", emoji: "📚" },
  ],
  Proctors: [
    { name: "Meera Joshi", role: "Rajasthan Lead", detail: "Runs 12 pods across 3 cities.", emoji: "🛡️" },
    { name: "Suresh Iyer", role: "UP Lead", detail: "Ex-teacher. Now powers operations.", emoji: "⚙️" },
  ],
  Sponsors: [
    { name: "Anonymous", role: "Yearly Sponsor", detail: "Funds an entire pod in Patna.", emoji: "💛" },
    { name: "The Khanna Family", role: "Monthly Sponsors", detail: "3 years strong. 2 pods supported.", emoji: "🏡" },
    { name: "Rohit M.", role: "Yearly Sponsor", detail: "In memory of his school teacher.", emoji: "🌸" },
  ],
};

function Showcase() {
  const tabs = Object.keys(PEOPLE);
  const [active, setActive] = useState(tabs[0]);
  return (
    <section id="showcase" className="py-24 bg-muted/50">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary">The Pod Family</div>
            <h2 className="mt-3 text-4xl md:text-5xl font-black">Meet the <span className="text-gradient">humans</span> behind the pods.</h2>
          </div>
        </Reveal>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                active === t
                  ? "bg-foreground text-background shadow-soft"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PEOPLE[active].map((p, i) => (
            <div
              key={p.name}
              className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 shadow-soft hover:shadow-lift transition-all hover:-translate-y-1"
              style={{ animation: `fade-up 0.6s ease-out ${i * 80}ms both` }}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-warm flex items-center justify-center text-4xl shadow-soft">
                {p.emoji}
              </div>
              <h4 className="mt-4 font-bold text-lg">{p.name}</h4>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mt-1">{p.role}</div>
              <p className="mt-3 text-sm text-muted-foreground">{p.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Tributes() {
  const tributes = [
    {
      img: tributeSatyamev,
      name: "Satyamev Jayate",
      by: "& Aamir Khan",
      text: "For showing a nation that television could still speak truth, and that one honest conversation could shake the conscience of a country. This movement borrows its heart.",
    },
    {
      img: tributeGrandfather,
      name: "Srikant Shukla",
      by: "My Grandfather. My first Teacher.",
      text: "He taught me that teaching is not a job — it is a gift you pass on. Every pod we run is because of him.",
    },
    {
      img: tributeKalam,
      name: "Dr. A.P.J. Abdul Kalam",
      by: "The People's President",
      text: "From a newspaper boy in Rameswaram to India's missile man and President. He believed dreams are not what you see in sleep — they are what keep you from sleeping. For every child he inspired to dream big.",
    },
    {
      img: tributeSavitribai,
      name: "Savitribai Phule",
      by: "India's First Female Teacher",
      text: "In 1848, she opened India's first school for girls in Pune, walking through stones and insults to reach her classroom. Every girl in every pod stands on her shoulders.",
    },
  ];
  return (
    <section id="tributes" className="py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-warm opacity-40" />
      <div className="relative max-w-7xl mx-auto px-6">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-tribute">Inspired By</div>
            <h2 className="mt-3 text-4xl md:text-5xl font-black">We stand on the <span className="text-gradient">shoulders of giants.</span></h2>
            <p className="mt-4 text-lg text-muted-foreground">Not our idea. Just our humble attempt to carry forward what they started.</p>
          </div>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-2 gap-8">
          {tributes.map((t, i) => (
            <Reveal key={t.name} delay={i * 100}>
              <article className="group h-full flex flex-col md:flex-row gap-6 p-6 rounded-3xl bg-card border border-border hover:border-tribute/40 shadow-soft hover:shadow-lift transition-all">
                <div className="md:w-48 flex-shrink-0">
                  <div className="relative aspect-square rounded-2xl overflow-hidden shadow-soft">
                    <img src={t.img} alt={t.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black">{t.name}</h3>
                  <div className="text-sm font-semibold text-tribute mt-1">{t.by}</div>
                  <p className="mt-3 text-muted-foreground leading-relaxed">{t.text}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function SponsorCTA() {
  return (
    <section id="sponsor" className="py-24 bg-gradient-dusk text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
      <div className="absolute top-20 -left-20 w-96 h-96 rounded-full bg-primary/30 blur-3xl animate-float" />
      <div className="absolute bottom-10 -right-20 w-96 h-96 rounded-full bg-accent/30 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="relative max-w-5xl mx-auto px-6 text-center">
        <Reveal>
          <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] opacity-70">Sponsor a Pod</div>
          <h2 className="mt-4 text-4xl md:text-6xl font-black">Fund a pod. <br /><span className="text-gradient">Fuel a generation.</span></h2>
          <p className="mt-6 text-lg md:text-xl opacity-80 max-w-2xl mx-auto">
            A single pod costs ₹4,000/month — covering a teacher, books, and 4–6 kids. Choose how you'd like to give.
          </p>
        </Reveal>

        <div className="mt-14 grid md:grid-cols-2 gap-6 text-left">
          <Reveal delay={100}>
            <div className="h-full p-8 rounded-3xl bg-card/10 backdrop-blur-xl border border-white/20 hover:border-white/40 transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-widest opacity-70">Monthly</div>
                <div className="text-2xl">📅</div>
              </div>
              <div className="mt-4 text-5xl font-black font-display">₹4,000<span className="text-lg font-normal opacity-70">/mo</span></div>
              <p className="mt-3 opacity-80">Flexible. Cancel anytime. Perfect for starting small.</p>
              <ul className="mt-5 space-y-2 text-sm opacity-90">
                <li>✓ Fund one pod, every month</li>
                <li>✓ Monthly impact reports</li>
                <li>✓ Direct thank-you notes from pod</li>
              </ul>
              <a href={SPONSOR_MONTHLY_LINK} className="mt-7 inline-flex w-full items-center justify-center rounded-full bg-white text-foreground px-6 py-4 font-bold hover:scale-[1.02] transition-transform">
                Sponsor Monthly →
              </a>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <div className="relative h-full p-8 rounded-3xl bg-gradient-hero border border-white/30 shadow-glow hover:-translate-y-1 transition-all">
              <div className="absolute -top-3 right-6 bg-foreground text-background text-xs font-bold px-3 py-1 rounded-full">MOST IMPACT</div>
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-widest">Yearly</div>
                <div className="text-2xl">🎓</div>
              </div>
              <div className="mt-4 text-5xl font-black font-display">₹42,000<span className="text-lg font-normal opacity-80">/yr</span></div>
              <p className="mt-3 opacity-95">Save ₹6,000. Gift a full academic year.</p>
              <ul className="mt-5 space-y-2 text-sm">
                <li>✓ Full year of learning for one pod</li>
                <li>✓ Named sponsorship (optional)</li>
                <li>✓ Year-end documentary + visit invite</li>
              </ul>
              <a href={SPONSOR_YEARLY_LINK} className="mt-7 inline-flex w-full items-center justify-center rounded-full bg-foreground text-background px-6 py-4 font-bold hover:scale-[1.02] transition-transform">
                Sponsor Yearly →
              </a>
            </div>
          </Reveal>
        </div>
        <p className="mt-8 text-sm opacity-70">100% of funds flow to pods. We audit quarterly. Transparency is non-negotiable.</p>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    { q: "Where does my money actually go?", a: "Teacher salaries, books, stationery, and a small share for the proctor. Zero goes to fancy offices — we don't have one." },
    { q: "Can I choose which pod I sponsor?", a: "Yes. Once onboarded, we share 2–3 pods in need and you pick the one that speaks to you." },
    { q: "Will I get updates?", a: "Monthly reports with attendance, photos (with consent), and a thank-you note from the kids." },
    { q: "Is this a registered non-profit?", a: "We're in the process of formalising. For now, we operate transparently under The Boring Education." },
    { q: "Can I visit a pod?", a: "Absolutely. Yearly sponsors get a standing invite to visit the pod they fund." },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-24 bg-background">
      <div className="max-w-3xl mx-auto px-6">
        <Reveal>
          <div className="text-center">
            <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary">FAQ</div>
            <h2 className="mt-3 text-4xl md:text-5xl font-black">Questions, <span className="text-gradient">answered.</span></h2>
          </div>
        </Reveal>
        <div className="mt-12 space-y-3">
          {items.map((it, i) => (
            <div key={it.q} className="rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-primary/40">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
              >
                <span className="font-semibold text-lg">{it.q}</span>
                <span className={`text-2xl text-primary transition-transform ${open === i ? "rotate-45" : ""}`}>+</span>
              </button>
              <div
                className="px-6 overflow-hidden transition-all"
                style={{ maxHeight: open === i ? 200 : 0, paddingBottom: open === i ? 20 : 0 }}
              >
                <p className="text-muted-foreground">{it.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-foreground text-background py-14">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2 font-display font-bold text-2xl">
              <span className="inline-block w-8 h-8 rounded-xl bg-gradient-hero" />
              Vidya Pods
            </div>
            <p className="mt-4 text-sm opacity-70 max-w-xs">A pod-based education system bringing free home tuitions to every child who needs one.</p>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest opacity-60">Explore</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li><a href="#how" className="hover:opacity-100 opacity-80">How it Works</a></li>
              <li><a href="#showcase" className="hover:opacity-100 opacity-80">The People</a></li>
              <li><a href="#tributes" className="hover:opacity-100 opacity-80">Inspired By</a></li>
              <li><a href="#sponsor" className="hover:opacity-100 opacity-80">Sponsor</a></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest opacity-60">Get in Touch</div>
            <p className="mt-4 text-sm opacity-80">Want to teach? Volunteer? Partner? Write to us.</p>
            <a href="mailto:hello@vidyapods.org" className="mt-2 inline-block text-primary-foreground font-semibold underline underline-offset-4">hello@vidyapods.org</a>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm opacity-70">
          <p>© {new Date().getFullYear()} Vidya Pods. Built with love.</p>
          <a href="https://theboringeducation.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:opacity-100 transition">
            Powered by <strong className="text-primary-foreground">The Boring Education</strong> ↗
          </a>
        </div>
      </div>
    </footer>
  );
}

function Index() {
  return (
    <main>
      <Nav />
      <Hero />
      <Stats />
      <HowItWorks />
      <Showcase />
      <Tributes />
      <SponsorCTA />
      <FAQ />
      <Footer />
    </main>
  );
}
