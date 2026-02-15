import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Smartphone,
  Shield,
  Sparkles,
  ArrowRight,
  Users,
  ClipboardCheck,
  Zap,
  Clock,
  CheckCircle2,
} from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={20} className="text-accent" />
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">
              Campus Operations
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">
            Clean<span className="text-accent">Flow</span>
          </h1>
          <p className="text-lg md:text-xl opacity-80 max-w-2xl mb-8">
            Intelligent cleaning logistics for large campus environments. Real-time tracking, smart scheduling, and quality auditing in one platform.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/staff"
              className="btn-action-success inline-flex items-center gap-2 !text-base !py-3 !px-6"
            >
              <Smartphone size={18} />
              Staff View
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/manager"
              className="btn-action-accent inline-flex items-center gap-2 !text-base !py-3 !px-6"
            >
              <LayoutDashboard size={18} />
              Manager Dashboard
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/supervisor"
              className="inline-flex items-center gap-2 text-base py-3 px-6 rounded-xl border-2 border-primary-foreground/30 text-primary-foreground font-bold hover:bg-primary-foreground/10 transition-colors"
            >
              <Shield size={18} />
              Supervisor
              <ArrowRight size={16} />
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
            <h3 className="font-bold text-lg mb-2">Real-Time Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Monitor every task in real-time. Automatic SLA alerts when tasks exceed estimated duration by 15%.
            </p>
          </div>

          <div className="kpi-card">
            <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center mb-4">
              <CheckCircle2 size={24} className="text-success" />
            </div>
            <h3 className="font-bold text-lg mb-2">Auto-Sequencing</h3>
            <p className="text-sm text-muted-foreground">
              Tasks auto-advance when completed. Staff see their next assignment instantly — no delays.
            </p>
          </div>

          <div className="kpi-card">
            <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mb-4">
              <Zap size={24} className="text-accent" />
            </div>
            <h3 className="font-bold text-lg mb-2">Break-Fix Response</h3>
            <p className="text-sm text-muted-foreground">
              Supervisors dispatch emergency tasks instantly. High-priority alerts reach available staff in seconds.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <p>CleanFlow © 2026</p>
          <p>Campus Cleaning Logistics</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
