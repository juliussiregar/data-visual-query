import {
  Link2,
  BarChart3,
  Bot,
  Zap,
  Shield,
  Layers,
} from "lucide-react";

const FEATURES = [
  {
    icon: Link2,
    title: "Paste & Go",
    desc: "Paste link Google Sheet publik — dashboard langsung tersedia.",
    accent: "border-l-indigo-500",
    iconClass: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: BarChart3,
    title: "Grafik Otomatis",
    desc: "Pie, bar, line, area, dan lainnya dipilih dari tipe kolom.",
    accent: "border-l-violet-500",
    iconClass: "bg-violet-50 text-violet-600",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    desc: "Tanya data, minta visualisasi, dan atur tampilan via chat.",
    accent: "border-l-cyan-500",
    iconClass: "bg-cyan-50 text-cyan-600",
  },
  {
    icon: Zap,
    title: "Filter Real-time",
    desc: "Filter dimensi — semua grafik ikut terupdate.",
    accent: "border-l-amber-500",
    iconClass: "bg-amber-50 text-amber-600",
  },
  {
    icon: Layers,
    title: "Multi-View",
    desc: "Overview, grafik, insights, tabel, dan profil kolom.",
    accent: "border-l-emerald-500",
    iconClass: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Shield,
    title: "Gratis & Aman",
    desc: "Tanpa biaya hosting. API key hanya untuk fitur chat.",
    accent: "border-l-rose-500",
    iconClass: "bg-rose-50 text-rose-600",
  },
];

export function LandingFeatures() {
  return (
    <section className="border-t border-slate-200/80 bg-white px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Fitur utama</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Dari spreadsheet ke dashboard profesional — tanpa coding
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((item, i) => (
            <div
              key={item.title}
              className={`surface-card animate-fade-in-up border-l-[3px] p-5 transition-shadow hover:shadow-[var(--shadow-card-hover)] ${item.accent} stagger-${Math.min(i + 1, 6)}`}
            >
              <div className={`mb-3 inline-flex rounded-lg p-2.5 ${item.iconClass}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
