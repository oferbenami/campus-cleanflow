import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Smartphone,
  Shield,
  Sparkles,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";

const Index = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={20} className="text-accent" />
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">
              {t("app.tagline")}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">
            Clean<span className="text-accent">Flow</span>
          </h1>
          <p className="text-lg md:text-xl opacity-80 max-w-2xl mb-8">
            {t("landing.heroDescription")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/staff" className="btn-action-success inline-flex items-center gap-2 !text-base !py-3 !px-6">
              <Smartphone size={18} />
              {t("landing.staffView")}
              <ArrowLeft size={16} />
            </Link>
            <Link to="/manager" className="btn-action-accent inline-flex items-center gap-2 !text-base !py-3 !px-6">
              <LayoutDashboard size={18} />
              {t("landing.managerDashboard")}
              <ArrowLeft size={16} />
            </Link>
            <Link to="/supervisor" className="inline-flex items-center gap-2 text-base py-3 px-6 rounded-xl border-2 border-primary-foreground/30 text-primary-foreground font-bold hover:bg-primary-foreground/10 transition-colors">
              <Shield size={18} />
              {t("landing.supervisorView")}
              <ArrowLeft size={16} />
            </Link>
            <Link to="/property-manager" className="inline-flex items-center gap-2 text-base py-3 px-6 rounded-xl border-2 border-primary-foreground/30 text-primary-foreground font-bold hover:bg-primary-foreground/10 transition-colors">
              <LayoutDashboard size={18} />
              {t("landing.propertyManagerView")}
              <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="kpi-card">
            <div className="w-12 h-12 rounded-xl bg-info/15 flex items-center justify-center mb-4">
              <Clock size={24} className="text-info" />
            </div>
            <h3 className="font-bold text-lg mb-2">{t("landing.realTimeTracking")}</h3>
            <p className="text-sm text-muted-foreground">{t("landing.realTimeDesc")}</p>
          </div>
          <div className="kpi-card">
            <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center mb-4">
              <CheckCircle2 size={24} className="text-success" />
            </div>
            <h3 className="font-bold text-lg mb-2">{t("landing.autoSequence")}</h3>
            <p className="text-sm text-muted-foreground">{t("landing.autoSequenceDesc")}</p>
          </div>
          <div className="kpi-card">
            <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mb-4">
              <Zap size={24} className="text-accent" />
            </div>
            <h3 className="font-bold text-lg mb-2">{t("landing.breakFixTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("landing.breakFixDesc")}</p>
          </div>
        </div>
      </div>

      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <p>CleanFlow © 2026</p>
          <p>{t("landing.campusOps")}</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
