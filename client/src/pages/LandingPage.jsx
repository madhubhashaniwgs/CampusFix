import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Bell,
  BarChart3,
  ShieldCheck,
  Users,
  GraduationCap,
  Briefcase,
  ArrowRight,
  CheckCircle2,
  Menu,
  X,
  Camera,
  Ticket,
  ClipboardList,
  Sparkles,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Zap,
    title: 'Real-time Updates',
    text: 'Live Socket.IO pushes keep dashboards, lists, and details in sync — zero refreshes.',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    text: 'Persistent in-app alerts plus branded emails for every key event.',
  },
  {
    icon: BarChart3,
    title: 'Admin Analytics',
    text: 'Five live charts covering status, priority, trends, and staff workload.',
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise Security',
    text: 'httpOnly JWT cookies, CSRF protection, RBAC, rate limits, full audit trail.',
  },
];

const STEPS = [
  {
    n: '01',
    icon: Camera,
    title: 'Report',
    text: 'Snap a photo, drop a pin, submit — ticket ID issued instantly.',
  },
  {
    n: '02',
    icon: Users,
    title: 'Assign',
    text: 'Admins route the ticket to the right technician in one click.',
  },
  {
    n: '03',
    icon: ClipboardList,
    title: 'Resolve',
    text: 'Staff move it through a tracked status lifecycle.',
  },
  {
    n: '04',
    icon: Ticket,
    title: 'Track',
    text: 'Students watch live progress with notifications at every step.',
  },
];

const ROLES = [
  {
    icon: GraduationCap,
    role: 'Student',
    text: 'Report issues with photos, track tickets, get notified on every update.',
  },
  {
    icon: Briefcase,
    role: 'Staff',
    text: 'Work your assigned queue, update statuses, resolve campus problems fast.',
  },
  {
    icon: ShieldCheck,
    role: 'Admin',
    text: 'Approve staff, assign issues, audit everything, and watch live analytics.',
  },
];

const STATS = [
  { value: 3, suffix: '', label: 'Role-based portals' },
  { value: 5, suffix: '', label: 'Live analytics charts' },
  { value: 100, suffix: '%', label: 'Real-time synced' },
];

function useCountUp(target, started) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!started) return;
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / 1200, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target]);
  return val;
}

function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${
        vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Stat({ value, suffix, label }) {
  const ref = useRef(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const v = useCountUp(value, started);
  return (
    <div ref={ref} className="text-center">
      <p className="text-4xl font-black text-white">
        {v}
        {suffix}
      </p>
      <p className="text-xs font-bold text-purple-200 mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f3ff] text-[#201638] overflow-x-hidden">
      {/* Nav */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/85 backdrop-blur-xl shadow-sm shadow-purple-900/5 border-b border-purple-100'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="leading-none">
              <span className="text-lg font-black tracking-tight block">CampusFix</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-purple-500">
                Report · Track · Resolve
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-bold text-purple-900/80">
            <a href="#features" className="hover:text-purple-700 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-purple-700 transition-colors">
              How it works
            </a>
            <a href="#roles" className="hover:text-purple-700 transition-colors">
              Roles
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-extrabold text-purple-800 hover:text-purple-950 transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-extrabold rounded-xl shadow-md shadow-purple-600/25 transition-all"
            >
              Get started
            </Link>
          </div>

          <button
            className="md:hidden p-2 text-purple-900"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-purple-100 px-6 py-4 flex flex-col gap-3 text-sm font-bold text-purple-900">
            <a href="#features" onClick={() => setMenuOpen(false)}>
              Features
            </a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
              How it works
            </a>
            <a href="#roles" onClick={() => setMenuOpen(false)}>
              Roles
            </a>
            <div className="flex gap-3 pt-2">
              <Link
                to="/login"
                className="flex-1 text-center py-2.5 border border-purple-300 rounded-xl"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="flex-1 text-center py-2.5 bg-purple-700 text-white rounded-xl"
              >
                Get started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-purple-300/30 blur-3xl" />
          <div className="absolute top-20 -right-40 w-[30rem] h-[30rem] rounded-full bg-indigo-300/25 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-[26rem] h-[26rem] rounded-full bg-fuchsia-200/20 blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <Reveal delay={80}>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] mb-6">
              Every campus issue,
              <br />
              <span className="bg-gradient-to-r from-purple-700 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
                tracked to resolution.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="text-base sm:text-lg text-purple-900/70 font-medium max-w-2xl mx-auto mb-9 leading-relaxed">
              One live platform connecting students, technicians, and administrators — snap a photo,
              get a ticket, and watch it resolve in real time.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Start reporting
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/80 border border-purple-200 text-purple-900 font-extrabold text-sm rounded-2xl hover:bg-white hover:shadow-md transition-all"
              >
                See how it works
              </a>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-bold text-purple-800/70">
              {['Real-time sync', 'Photo uploads', 'Audit trail', 'Role-based access'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Stats band */}
      <section className="px-4 sm:px-6 pb-8">
        <Reveal>
          <div className="max-w-5xl mx-auto rounded-[2rem] bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-700 px-8 py-10 grid grid-cols-3 gap-6 shadow-xl shadow-purple-700/20">
            {STATS.map((s) => (
              <Stat key={s.label} {...s} />
            ))}
          </div>
        </Reveal>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-purple-600 mb-2">
              Features
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Everything campus operations need
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="group h-full bg-white/80 border border-purple-100 rounded-3xl p-6 hover:shadow-xl hover:shadow-purple-600/10 hover:-translate-y-1 transition-all duration-300">
                  <div className="w-11 h-11 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 mb-4 group-hover:bg-purple-700 group-hover:text-white transition-colors">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-purple-950 mb-1.5">{f.title}</h3>
                  <p className="text-xs text-purple-900/60 font-medium leading-relaxed">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 bg-white/60">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-purple-600 mb-2">
              Workflow
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Report to resolved in four steps
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="relative h-full bg-[#f5f3ff] border border-purple-100 rounded-3xl p-6 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-600/5 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <s.icon className="w-7 h-7 text-purple-600" />
                    <span className="text-3xl font-black text-purple-200">{s.n}</span>
                  </div>
                  <h3 className="font-extrabold text-purple-950 mb-1">{s.title}</h3>
                  <p className="text-xs text-purple-900/60 font-medium leading-relaxed">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-purple-600 mb-2">
              Roles
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Built for every campus role
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ROLES.map((r, i) => (
              <Reveal key={r.role} delay={i * 100}>
                <div className="h-full bg-gradient-to-b from-white to-purple-50/60 border border-purple-100 rounded-3xl p-7 text-center hover:shadow-lg hover:shadow-purple-600/10 hover:-translate-y-1 transition-all">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-700 to-indigo-600 flex items-center justify-center text-white mx-auto mb-4 shadow-md shadow-purple-600/25">
                    <r.icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-extrabold text-lg text-purple-950 mb-2">{r.role}</h3>
                  <p className="text-xs text-purple-900/60 font-medium leading-relaxed">{r.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <Reveal>
          <div className="max-w-4xl mx-auto relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-purple-800 via-purple-700 to-indigo-700 px-8 py-16 sm:px-16 text-center text-white">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-fuchsia-400/20 blur-2xl" />
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-[11px] font-extrabold uppercase tracking-widest mb-5 relative">
              <Sparkles className="w-3.5 h-3.5" /> Get started in under a minute
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 relative">
              Ready to keep campus running smoothly?
            </h2>
            <p className="text-purple-100/80 font-medium mb-8 max-w-xl mx-auto relative">
              Join CampusFix — report your first issue with a photo and watch it move.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-purple-800 font-extrabold text-sm rounded-2xl shadow-lg hover:scale-[1.02] transition-all"
              >
                Create free account <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/30 text-white font-extrabold text-sm rounded-2xl hover:bg-white/10 transition-all"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-purple-100 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-purple-800/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-700 to-indigo-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="font-black text-purple-950">CampusFix</span> — Report · Track · Resolve
          </div>
          <p>Built with React, Express & MongoDB</p>
        </div>
      </footer>
    </div>
  );
}
