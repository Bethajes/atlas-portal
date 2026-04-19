import { useEffect, useState } from 'react';
import api from '../api/axios';
import { User, Mail, Building2, GraduationCap, CheckCircle2, PencilLine } from 'lucide-react';

export default function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState({ firstName: '', fatherName: '', photo: null });
  const [imageFailed, setImageFailed] = useState(false);
  const apiHost = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000';

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get('/student/me');
        const data = res.data?.data || null;
        setProfile(data);
        setForm({
          firstName: data?.firstName || '',
          fatherName: data?.fatherName || '',
          photo: null,
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load student profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const profilePercent = (() => {
    let done = 0;
    if (profile?.photoUrl || profile?.profileImage) done += 1;
    if (profile?.program?.name) done += 1;
    if (profile?.department?.name) done += 1;
    return Math.round((done / 3) * 100);
  })();

  const initials = ((profile?.fullName || 'Student')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')) || 'ST';

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const data = new FormData();
      data.append('firstName', form.firstName);
      data.append('fatherName', form.fatherName);
      if (form.photo) data.append('photo', form.photo);
      const res = await api.put('/student/me', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(res.data?.data || profile);
      setShowEditor(false);
      setForm((prev) => ({ ...prev, photo: null }));
      setSuccess(res.data?.message || 'Profile updated successfully');
    } catch (err) {
      const backendError = err.response?.data?.error;
      setError(
        backendError
          ? `${err.response?.data?.message || 'Failed to update profile'}: ${backendError}`
          : (err.response?.data?.message || 'Failed to update profile')
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading profile...</div>;
  if (!profile && error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
              {(profile?.photoUrl || profile?.profileImage) && !imageFailed ? (
                <img
                  src={`${apiHost}${profile.photoUrl || profile.profileImage}`}
                  alt={profile.fullName}
                  className="w-full h-full object-cover"
                  onError={() => setImageFailed(true)}
                />
              ) : null}
              {(!(profile?.photoUrl || profile?.profileImage) || imageFailed) ? (
                <span className="text-blue-700 font-black text-xl">{initials}</span>
              ) : null}
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">{profile?.fullName || 'Student'}</h2>
              <p className="text-sm text-gray-500 font-medium">Active Student</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowEditor((s) => !s)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-100 bg-blue-50 text-blue-700 font-bold text-sm hover:bg-blue-100 transition"
          >
            <PencilLine className="w-4 h-4" /> {showEditor ? 'Close Editor' : 'Edit Profile'}
          </button>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Profile Completion</p>
            <p className="text-sm font-bold text-gray-700">{profilePercent}%</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${profilePercent}%` }} />
          </div>
        </div>

        {showEditor && (
          <form onSubmit={onSave} className="mb-8 p-5 rounded-2xl border border-gray-100 bg-gray-50 space-y-4">
            <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">Update Profile</h3>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                placeholder="First Name"
                className="px-3 py-2.5 rounded-xl border border-gray-100 bg-white text-sm font-medium outline-none"
              />
              <input
                type="text"
                value={form.fatherName}
                onChange={(e) => setForm((prev) => ({ ...prev, fatherName: e.target.value }))}
                placeholder="Father Name"
                className="px-3 py-2.5 rounded-xl border border-gray-100 bg-white text-sm font-medium outline-none"
              />
            </div>
            <div>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                onChange={(e) => setForm((prev) => ({ ...prev, photo: e.target.files?.[0] || null }))}
                className="text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Accepted: JPG/PNG, max 2MB</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <p className="flex items-center gap-2 text-gray-700"><Mail className="w-4 h-4" /> {profile?.institutionalEmail || 'N/A'}</p>
          </div>
          <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <p className="flex items-center gap-2 text-gray-700"><CheckCircle2 className="w-4 h-4" /> Active Student</p>
          </div>
          <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <p className="flex items-center gap-2 text-gray-700"><Building2 className="w-4 h-4" /> {profile?.department?.name || 'Not Assigned'}</p>
          </div>
          <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
            <p className="flex items-center gap-2 text-gray-700"><GraduationCap className="w-4 h-4" /> {profile?.program?.name || 'Not Assigned'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
