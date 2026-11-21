import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Filter, Grid, List, Download,
  Upload, Settings, BarChart3, Users, BookOpen
} from 'lucide-react';
import api from '../../../api/axios';
import toast from 'react-hot-toast';
import SectionWizard from './SectionWizard';
import StudentAssignment from './StudentAssignment';
import SectionCard from './SectionCard';
import OptimizationDashboard from './OptimizationDashboard';

export default function SectionManagement() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    semester: '',
    department: '',
    instructor: '',
    course: '',
  });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showWizard, setShowWizard] = useState(false);
  const [showAssignment, setShowAssignment] = useState(null);
  const [showOptimization, setShowOptimization] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);

  // Data for filters
  const [semesters, setSemesters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchSections();
  }, [searchTerm, filters]);

  const fetchData = async () => {
    try {
      const [sectionsRes, semestersRes, departmentsRes, instructorsRes, coursesRes] = await Promise.all([
        api.get('/sections'),
        api.get('/semesters'),
        api.get('/departments'),
        api.get('/instructors'),
        api.get('/courses'),
      ]);

      setSemesters(semestersRes.data.data || []);
      setDepartments(departmentsRes.data.data || []);
      setInstructors(instructorsRes.data.data || []);
      setCourses(coursesRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load filter data');
    }
  };

  const fetchSections = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm || undefined,
        semesterId: filters.semester || undefined,
        departmentId: filters.department || undefined,
        instructorId: filters.instructor || undefined,
        courseId: filters.course || undefined,
      };

      const response = await api.get('/sections', { params });
      setSections(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSection = (newSection) => {
    setSections(prev => [newSection, ...prev]);
    setShowWizard(false);
  };

  const handleEditSection = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    setSelectedSection(section);
    setShowWizard(true);
  };

  const handleDeleteSection = async (sectionId) => {
    if (!confirm('Are you sure you want to delete this section? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/sections/${sectionId}`);
      setSections(prev => prev.filter(s => s.id !== sectionId));
      toast.success('Section deleted successfully');
    } catch (error) {
      toast.error('Failed to delete section');
    }
  };

  const handleAssignStudents = (sectionId) => {
    setShowAssignment(sectionId);
  };

  const handleViewAnalytics = (sectionId) => {
    // This would open analytics modal or navigate to analytics page
    toast.info('Analytics view coming soon');
  };

  const handleViewDetails = (sectionId) => {
    // This would open section details modal
    toast.info('Section details view coming soon');
  };

  const exportSections = () => {
    const csvData = sections.map(section => ({
      'Section Code': section.sectionCode,
      'Course': section.courseTitle,
      'Instructor': section.instructor,
      'Semester': section.semesterId,
      'Department': section.department,
      'Enrolled': section.enrolledCount,
      'Capacity': section.maxStudents,
      'Utilization %': section.utilization,
      'Room': section.roomNumber || '',
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(v => `"${v || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sections-export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilters({
      semester: '',
      department: '',
      instructor: '',
      course: '',
    });
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Section Management</h1>
          <p className="text-gray-600 mt-1">
            Manage course sections, assignments, and optimization
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowOptimization(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Optimization
          </button>
          <button
            onClick={exportSections}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => { setSelectedSection(null); setShowWizard(true); }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Section
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Search</label>
            <div className="mt-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Section code, course, instructor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Semester</label>
            <select
              value={filters.semester}
              onChange={(e) => setFilters(prev => ({ ...prev, semester: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">All Semesters</option>
              {semesters.map(semester => (
                <option key={semester.id} value={semester.id}>{semester.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select
              value={filters.department}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Instructor</label>
            <select
              value={filters.instructor}
              onChange={(e) => setFilters(prev => ({ ...prev, instructor: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">All Instructors</option>
              {instructors.map(instructor => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.user?.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {sections.length} section{sections.length !== 1 ? 's' : ''} found
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-brand-100 text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-brand-100 text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sections Display */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      ) : sections.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No sections found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || Object.values(filters).some(v => v) ?
              'Try adjusting your search or filters.' :
              'Get started by creating your first section.'
            }
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Section
            </button>
          </div>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {sections.map(section => (
            <SectionCard
              key={section.id}
              section={section}
              onEdit={handleEditSection}
              onDelete={handleDeleteSection}
              onAssignStudents={handleAssignStudents}
              onViewAnalytics={handleViewAnalytics}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showWizard && (
        <SectionWizard
          onComplete={handleCreateSection}
          onCancel={() => { setShowWizard(false); setSelectedSection(null); }}
          initialData={selectedSection}
        />
      )}

      {showAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Student Assignment</h2>
              <button
                onClick={() => setShowAssignment(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <StudentAssignment
                sectionId={showAssignment}
                onAssignmentComplete={() => {
                  setShowAssignment(null);
                  fetchSections();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showOptimization && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Section Optimization</h2>
              <button
                onClick={() => setShowOptimization(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <OptimizationDashboard
                semesterId={filters.semester}
                departmentId={filters.department}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}