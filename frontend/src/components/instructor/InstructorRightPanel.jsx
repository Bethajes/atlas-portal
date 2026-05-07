import { ArrowUpRight, Bell, CalendarDays, Megaphone, Upload, Zap } from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export default function InstructorRightPanel({ quickActions = [], insights = [], activity = [], notifications = [] }) {
  const unread = notifications.filter((n) => !n?.isRead).length;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">Quick Actions</div>
          <Zap className="h-4 w-4 text-teal-500" />
        </div>
        <div className="mt-3 space-y-2">
          {quickActions.length ? (
            quickActions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-800 shadow-sm shadow-slate-200/40 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
              >
                <span className={['grid h-9 w-9 place-items-center rounded-2xl', a.iconBg || 'bg-slate-100'].join(' ')}>
                  {a.icon === 'upload' ? <Upload className="h-4 w-4 text-slate-700" /> : null}
                  {a.icon === 'announce' ? <Megaphone className="h-4 w-4 text-slate-700" /> : null}
                  {a.icon === 'calendar' ? <CalendarDays className="h-4 w-4 text-slate-700" /> : null}
                </span>
                <span className="flex-1 truncate">{a.label}</span>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </button>
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 px-3 py-3 text-xs font-medium text-slate-500">No quick actions yet.</div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">Smart Insights</div>
          <Badge variant={unread ? 'warning' : 'default'}>{unread ? `${unread} unread` : 'Up to date'}</Badge>
        </div>
        <div className="mt-3 space-y-2">
          {insights.length ? (
            insights.slice(0, 6).map((x) => (
              <div key={x.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <span className={['mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-2xl', x.iconBg || 'bg-slate-100'].join(' ')}>
                  {x.icon === 'bell' ? <Bell className="h-4 w-4 text-slate-700" /> : null}
                  {x.icon === 'calendar' ? <CalendarDays className="h-4 w-4 text-slate-700" /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900">{x.title}</div>
                  <div className="mt-0.5 text-xs font-medium text-slate-500">{x.body}</div>
                </div>
                {x.badge ? <Badge variant={x.badge.variant || 'default'}>{x.badge.label}</Badge> : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 px-3 py-3 text-xs font-medium text-slate-500">No insights available.</div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">Recent Activity</div>
          <Badge variant="info">{activity.length}</Badge>
        </div>
        <div className="mt-3 space-y-2">
          {activity.length ? (
            activity.slice(0, 8).map((x) => (
              <div key={x.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 truncate text-xs font-semibold text-slate-800">{x.title}</div>
                  <div className="shrink-0 text-[11px] font-medium text-slate-400">{fmtDate(x.date)}</div>
                </div>
                {x.body ? <div className="mt-1 text-xs font-medium text-slate-500">{x.body}</div> : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 px-3 py-3 text-xs font-medium text-slate-500">No activity yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

