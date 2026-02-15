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

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={20} className="text-accent" />
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">
              ניהול תפעול קמפוס
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">
            Clean<span className="text-accent">Flow</span>
          </h1>
          <p className="text-lg md:text-xl opacity-80 max-w-2xl mb-8">
            לוגיסטיקת ניקיון חכמה לקמפוסים גדולים. מעקב בזמן אמת, תזמון חכם וביקורת איכות בפלטפורמה אחת.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/staff"
              className="btn-action-success inline-flex items-center gap-2 !text-base !py-3 !px-6"
            >
              <Smartphone size={18} />
              תצוגת עובד
              <ArrowLeft size={16} />
            </Link>
            <Link
              to="/manager"
              className="btn-action-accent inline-flex items-center gap-2 !text-base !py-3 !px-6"
            >
              <LayoutDashboard size={18} />
              לוח בקרה למנהל
              <ArrowLeft size={16} />
            </Link>
            <Link
              to="/supervisor"
              className="inline-flex items-center gap-2 text-base py-3 px-6 rounded-xl border-2 border-primary-foreground/30 text-primary-foreground font-bold hover:bg-primary-foreground/10 transition-colors"
            >
              <Shield size={18} />
              מפקח
              <ArrowLeft size={16} />
            </Link>
            <Link
              to="/property-manager"
              className="inline-flex items-center gap-2 text-base py-3 px-6 rounded-xl border-2 border-primary-foreground/30 text-primary-foreground font-bold hover:bg-primary-foreground/10 transition-colors"
            >
              <LayoutDashboard size={18} />
              מנהל נכס
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
            <h3 className="font-bold text-lg mb-2">מעקב בזמן אמת</h3>
            <p className="text-sm text-muted-foreground">
              מעקב אחר כל משימה בזמן אמת. התראות SLA אוטומטיות כאשר משימה חורגת מ-15% מהזמן המוערך.
            </p>
          </div>

          <div className="kpi-card">
            <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center mb-4">
              <CheckCircle2 size={24} className="text-success" />
            </div>
            <h3 className="font-bold text-lg mb-2">רצף אוטומטי</h3>
            <p className="text-sm text-muted-foreground">
              משימות מתקדמות אוטומטית לאחר השלמה. העובד רואה את המשימה הבאה מיד — ללא עיכובים.
            </p>
          </div>

          <div className="kpi-card">
            <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mb-4">
              <Zap size={24} className="text-accent" />
            </div>
            <h3 className="font-bold text-lg mb-2">תקלה מיידית</h3>
            <p className="text-sm text-muted-foreground">
              מפקחים שולחים דיווחי תקלה מיידית עם תמונה. התראות בעדיפות גבוהה מגיעות לעובדים הזמינים תוך שניות.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <p>CleanFlow © 2026</p>
          <p>לוגיסטיקת ניקיון קמפוס</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
