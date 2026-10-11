import React from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wallet,
  Bookmark,
  Bell,
  BookOpen,
  Settings,
  HelpCircle,
  LogOut,
  Zap,
  PencilLine,
  Calculator,
  Search,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useSubscription } from '@/hooks/useSubscription';

function MenuRow({ to, icon: Icon, label, sublabel, onClick, danger = false }) {
  const Inner = (
    <div
      className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/60 cursor-pointer transition-colors ${
        danger ? 'text-destructive' : ''
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          danger ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{label}</div>
        {sublabel && (
          <div className="text-xs text-muted-foreground truncate">{sublabel}</div>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  );
  if (onClick) return <button type="button" onClick={onClick} className="block w-full text-left">{Inner}</button>;
  return <Link to={to}>{Inner}</Link>;
}

function MenuPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  // Admin comes from `user_profiles.role`, surfaced by useSubscription.
  // It used to read `user.user_metadata.role` — the bag
  // `supabase.auth.updateUser({ data })` writes, so any user could set
  // `role: 'admin'` on themselves. See migration 0007.
  const { isAdmin } = useSubscription();

  const displayName =
    user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <Helmet>
        <title>Menu — SnapGain</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 space-y-6 max-w-2xl">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold tracking-tight">Hi, {displayName}</h1>
          <p className="text-muted-foreground mt-1 truncate">{user?.email}</p>
        </motion.section>

        <Card>
          <CardContent className="p-0 divide-y">
            <MenuRow to="/search"            icon={Search}     label="Search stores" />
            <MenuRow to="/compare"           icon={Calculator} label="Compare rewards" />
            <MenuRow to="/saved-strategies"  icon={Bookmark}   label="Saved strategies" />
            <MenuRow to="/wallet"            icon={Wallet}     label="My wallet"      sublabel="Cards, miles programs, cashback platforms" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 divide-y">
            <MenuRow to="/alerts"            icon={Bell}        label="Alerts" />
            <MenuRow to="/library"           icon={BookOpen}    label="Library"        sublabel="SnapGain e-book + guides" />
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardContent className="p-0 divide-y">
              <MenuRow to="/admin/hot-deals" icon={Zap}         label="Manage hot deals" sublabel="Admin · live updates" />
              <MenuRow to="/admin/rates"     icon={PencilLine} label="Rate entry"       sublabel="Admin · the four sources with no feed" />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0 divide-y">
            <MenuRow to="/settings"          icon={Settings}    label="Settings" />
            <MenuRow to="/about"             icon={HelpCircle}  label="About" />
            <MenuRow onClick={handleLogout}  icon={LogOut}      label="Log out" danger />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default MenuPage;
