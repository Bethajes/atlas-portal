import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Megaphone, Send, Paperclip, Mail, Bell } from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Modal from './ui/Modal';

function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export default function MessagingCenter({
  announcements = [],
  notifications = [],
  students = [],
  onCreateAnnouncement,
  onSendDirectMessage,
  onMarkNotificationRead,
}) {
  const [tab, setTab] = useState('announcements');
  const [composeOpen, setComposeOpen] = useState(false);
  const [directOpen, setDirectOpen] = useState(false);

  const [announceForm, setAnnounceForm] = useState({ title: '', content: '', isGlobal: false, courseId: '' });
  const [directForm, setDirectForm] = useState({ userId: '', title: 'Message from your instructor', message: '', type: 'INFO' });

  const unread = useMemo(() => notifications.filter((n) => !n?.isRead).length, [notifications]);

  const studentOptions = useMemo(() => {
    const uniq = new Map();
    for (const s of students || []) {
      const id = s?.student?.userId;
      if (!id || uniq.has(id)) continue;
      uniq.set(id, { userId: id, name: s.student?.name, studentId: s.student?.studentId });
    }
    return Array.from(uniq.values()).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [students]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">Messages</div>
          <div className="mt-0.5 text-sm font-medium text-slate-500">Announcements + direct messages to students.</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-slate-300/40 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
          >
            <Megaphone className="h-4 w-4" />
            New Announcement
          </button>
          <button
            type="button"
            onClick={() => setDirectOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-200/40 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
          >
            <Mail className="h-4 w-4" />
            Message Student
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('announcements')}
          className={[
            'rounded-xl px-3 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60',
            tab === 'announcements' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200',
          ].join(' ')}
        >
          Announcements
        </button>
        <button
          type="button"
          onClick={() => setTab('notifications')}
          className={[
            'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60',
            tab === 'notifications' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200',
          ].join(' ')}
        >
          Notifications
          <Badge variant={unread ? 'warning' : 'default'}>{unread}</Badge>
        </button>
      </div>

      {tab === 'announcements' ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {announcements.length ? (
            announcements.slice(0, 20).map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{a.title}</div>
                    <div className="mt-1 text-xs font-medium text-slate-500">
                      {a.Course?.code ? `${a.Course.code} · ` : ''}
                      {fmtDateTime(a.createdAt)}
                    </div>
                  </div>
                  <Badge variant={a.isGlobal ? 'info' : 'default'}>{a.isGlobal ? 'Global' : 'Course'}</Badge>
                </div>
                <div className="mt-3 text-sm font-medium text-slate-700 whitespace-pre-wrap">{a.content}</div>
              </Card>
            ))
          ) : (
            <Card className="p-10 text-center lg:col-span-2">
              <div className="text-sm font-semibold text-slate-800">No announcements yet</div>
              <div className="mt-1 text-xs font-medium text-slate-500">Create one to message an entire class.</div>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.length ? (
            notifications.slice(0, 30).map((n) => (
              <Card key={n.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-slate-400" />
                      <div className="truncate text-sm font-semibold text-slate-900">{n.title}</div>
                      {!n.isRead ? <Badge variant="warning">Unread</Badge> : <Badge variant="default">Read</Badge>}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-500">{fmtDateTime(n.createdAt)}</div>
                    <div className="mt-3 text-sm font-medium text-slate-700 whitespace-pre-wrap">{n.message}</div>
                  </div>
                  {!n.isRead ? (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await onMarkNotificationRead?.(n.id);
                        } catch {}
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-200/40 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-10 text-center">
              <div className="text-sm font-semibold text-slate-800">No notifications</div>
              <div className="mt-1 text-xs font-medium text-slate-500">You’re all caught up.</div>
            </Card>
          )}
        </div>
      )}

      <Modal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="New announcement"
        description="Send an announcement to a course or globally."
        widthClass="max-w-xl"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await onCreateAnnouncement?.({
                title: announceForm.title,
                content: announceForm.content,
                isGlobal: Boolean(announceForm.isGlobal),
                courseId: announceForm.isGlobal ? null : announceForm.courseId || null,
              });
              toast.success('Announcement sent');
              setAnnounceForm({ title: '', content: '', isGlobal: false, courseId: '' });
              setComposeOpen(false);
            } catch (err) {
              toast.error(err?.response?.data?.message || 'Failed to send announcement');
            }
          }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs font-semibold text-slate-600">Title</label>
            <input
              value={announceForm.title}
              onChange={(e) => setAnnounceForm((s) => ({ ...s, title: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm shadow-slate-200/40 outline-none focus:ring-2 focus:ring-sky-500/60"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Message</label>
            <textarea
              value={announceForm.content}
              onChange={(e) => setAnnounceForm((s) => ({ ...s, content: e.target.value }))}
              className="mt-1 h-28 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm shadow-slate-200/40 outline-none focus:ring-2 focus:ring-sky-500/60"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="global"
              type="checkbox"
              checked={announceForm.isGlobal}
              onChange={(e) => setAnnounceForm((s) => ({ ...s, isGlobal: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-sky-500/60"
            />
            <label htmlFor="global" className="text-sm font-semibold text-slate-700">
              Global announcement
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setComposeOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200/40 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
            >
              Cancel
            </button>
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-slate-300/40 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60">
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={directOpen}
        onClose={() => setDirectOpen(false)}
        title="Message a student"
        description="Delivers as a notification in the student portal."
        widthClass="max-w-xl"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await onSendDirectMessage?.(directForm);
              toast.success('Message sent');
              setDirectForm({ userId: '', title: 'Message from your instructor', message: '', type: 'INFO' });
              setDirectOpen(false);
            } catch (err) {
              toast.error(err?.response?.data?.message || 'Failed to send message');
            }
          }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs font-semibold text-slate-600">Student</label>
            <select
              value={directForm.userId}
              onChange={(e) => setDirectForm((s) => ({ ...s, userId: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm shadow-slate-200/40 outline-none focus:ring-2 focus:ring-sky-500/60"
              required
            >
              <option value="">Select a student…</option>
              {studentOptions.map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.name} ({s.studentId})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Title</label>
            <input
              value={directForm.title}
              onChange={(e) => setDirectForm((s) => ({ ...s, title: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm shadow-slate-200/40 outline-none focus:ring-2 focus:ring-sky-500/60"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Message</label>
            <textarea
              value={directForm.message}
              onChange={(e) => setDirectForm((s) => ({ ...s, message: e.target.value }))}
              className="mt-1 h-28 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm shadow-slate-200/40 outline-none focus:ring-2 focus:ring-sky-500/60"
              required
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => toast('Attachments are coming next. This UI is ready.')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-200/40 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
            >
              <Paperclip className="h-4 w-4" />
              Attach file
            </button>
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-slate-300/40 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60">
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
