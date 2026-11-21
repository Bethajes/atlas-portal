import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Users, BookOpen, GraduationCap, Briefcase, Activity, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import StatCard from '../components/admin/StatCard';
import Button from '../components/admin/Button';
import EnrollmentBarChart from '../components/admin/analytics/EnrollmentBarChart';
import GpaDistributionPieChart from '../components/admin/analytics/GpaDistributionPieChart';
import CoursePopularityBarChart from '../components/admin/analytics/CoursePopularityBarChart';
import PassFailPieChart from '../components/admin/analytics/PassFailPieChart';

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-base font-bold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="animate-pulse bg-gray-200 rounded h-5 w-40 mb-4" />
      <div className="animate-pulse bg-gray-100 rounded-xl h-64 w-full" />
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/analytics');
      setData(res.data.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load analytics';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const totals = data?.totals ?? {};
  const gpa = data?.gpaDistribution ?? {};
  const enrollment = data?.enrollmentByProgram ?? [];
  const courses = data?.coursePopularity ?? [];
  const passFail = data?.passFailRate ?? {};

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Analytics</h2>
          <p className="text-gray-500 mt-1 font-medium">Real-time system insights.</p>
        </div>
        <Button variant="secondary" onClick={fetchAnalytics} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Students"    value={totals.totalStudents}    icon={Users}         color="text-brand-600"   bg="bg-brand-50"   loading={loading} />
        <StatCard label="Total Courses"     value={totals.totalCourses}     icon={BookOpen}      color="text-amber-600"  bg="bg-amber-50"  loading={loading} />
        <StatCard label="Total Programs"    value={totals.totalPrograms}    icon={GraduationCap} color="text-violet-600" bg="bg-violet-50" loading={loading} />
        <StatCard label="Total Instructors" value={totals.totalInstructors} icon={Briefcase}     color="text-indigo-600" bg="bg-indigo-50" loading={loading} />
        <StatCard label="Total Enrollments" value={totals.totalEnrollments} icon={Activity}      color="text-emerald-600" bg="bg-emerald-50" loading={loading} />
      </div>

      {/* Error + Retry */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 flex items-center justify-between">
          <p className="text-red-700 font-medium">{error}</p>
          <Button variant="danger" onClick={fetchAnalytics}>Retry</Button>
        </div>
      )}

      {/* Charts */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Enrollment by Program">
            <EnrollmentBarChart data={enrollment} />
          </ChartCard>
          <ChartCard title="GPA Distribution">
            <GpaDistributionPieChart data={gpa} />
          </ChartCard>
          <ChartCard title="Top 10 Courses by Enrollment">
            <CoursePopularityBarChart data={courses} />
          </ChartCard>
          <ChartCard title="Pass / Fail Rate">
            <PassFailPieChart data={passFail} />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
