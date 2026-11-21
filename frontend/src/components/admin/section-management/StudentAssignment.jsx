import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Users, CheckCircle, AlertCircle, Zap,
  Filter, Download, Upload, RefreshCw
} from 'lucide-react';
import api from '../../../api/axios';
import toast from 'react-hot-toast';

export default function StudentAssignment({ sectionId, onAssignmentComplete }) {
  const [section, setSection] = useState(null);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [filters, setFilters] = useState({
    department: '',
    program: '',
    minGPA: '',
    maxGPA: '',
  });

  useEffect(() => {
    fetchData();
  }, [sectionId]);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const sectionRes = await api.get(`/sections/${sectionId}`);
      setSection(sectionRes.data.data);

      const studentsRes = await api.get('/academic/students');
      const enrolled = new Set(sectionRes.data.data.enrollments.map(e => e.student.id));
      const available = (studentsRes.data.data || []).filter(s => !enrolled.has(s.id));
      setStudents(available);
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.user?.name?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.user?.institutionalEmail?.toLowerCase().includes(q)
      );
    }

    if (filters.department) {
      filtered = filtered.filter(s => s.department?.id === filters.department);
    }
    if (filters.program) {
      filtered = filtered.filter(s => s.program?.id === filters.program);
    }
    if (filters.minGPA) {
      filtered = filtered.filter(s => (s.cumulativeGPA ?? 0) >= parseFloat(filters.minGPA));
    }
    if (filters.maxGPA) {
      filtered = filtered.filter(s => (s.cumulativeGPA ?? 0) <= parseFloat(filters.maxGPA));
    }

    setFilteredStudents(filtered);
  };

  const toggleStudent = (studentId) => {
    const newSelected = new Set(selected);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    if (selected.size === filteredStudents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleBulkAssign = async () => {
    if (selected.size === 0) {
      toast.error('Please select at least one student');
      return;
    }

    const availableSlots = section.maxStudents - section.enrollments.length;
    if (selected.size > availableSlots) {
      toast.error(`Only ${availableSlots} spots available in this section`);
      return;
    }

    setAssigning(true);
    try {
      const assignments = Array.from(selected).map(studentId => ({
        studentId,
        sectionId,
      }));

      await api.post('/sections/bulk/assign', { assignments });
      toast.success(`Successfully assigned ${selected.size} students`);
      setSelected(new Set());
      onAssignmentComplete?.();
    } catch (error) {
      toast.error('Failed to assign students');
    } finally {
      setAssigning(false);
    }
  };

  const handleSmartAssign = async () => {
    setAssigning(true);
    try {
      const criteria = {
        departmentId: filters.department || undefined,
        minGPA: filters.minGPA ? parseFloat(filters.minGPA) : undefined,
        maxGPA: filters.maxGPA ? parseFloat(filters.maxGPA) : undefined,
      };

      const response = await api.post(`/sections/${sectionId}/smart-assign`, { criteria });
      toast.success(`Smart assign: ${response.data.data.assigned.length} students added`);
      onAssignmentComplete?.();
    } catch (error) {
      toast.error('Smart assign failed');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (!section) {
    return (
      <div className="text-center py-12 text-gray-500">Section not found.</div>
    );
  }

  const availableSlots = section.maxStudents - (section.enrollments?.length ?? 0);
  const allDepartments = [...new Set(students.map(s => s.department?.id))].map(id =>
    students.find(s => s.department?.id === id)?.department
  ).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Section Info */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-brand-50 border border-brand-200 rounded-lg p-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-blue-900">{section.sectionCode}</h2>
            <p className="text-sm text-brand-700">{section.course?.title}</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-blue-900">
              {availableSlots} slots available
            </div>
            <div className="w-32 bg-blue-200 rounded-full h-2 mt-1">
              <div
                className="bg-brand-600 h-2 rounded-full"
                style={{
                  width: `${Math.min(((section.maxStudents - availableSlots) / section.maxStudents) * 100, 100)}%`
                }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Search</label>
          <div className="mt-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Name, ID, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Department</label>
          <select
            value={filters.department}
            onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
          >
            <option value="">All</option>
            {allDepartments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Min GPA</label>
          <input
            type="number"
            min="0"
            max="4"
            step="0.1"
            value={filters.minGPA}
            onChange={(e) => setFilters(prev => ({ ...prev, minGPA: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
            placeholder="0.0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Max GPA</label>
          <input
            type="number"
            min="0"
            max="4"
            step="0.1"
            value={filters.maxGPA}
            onChange={(e) => setFilters(prev => ({ ...prev, maxGPA: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
            placeholder="4.0"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={selected.size === filteredStudents.length && filteredStudents.length > 0}
              onChange={selectAll}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">
              {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
            </span>
          </label>
          <div className="text-sm text-gray-600">{filteredStudents.length} available</div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSmartAssign}
            disabled={assigning || availableSlots === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
          >
            {assigning
              ? <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              : <Zap className="w-4 h-4 mr-2" />}
            Smart Assign
          </button>

          <button
            onClick={handleBulkAssign}
            disabled={assigning || selected.size === 0 || availableSlots === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50"
          >
            {assigning
              ? <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              : <CheckCircle className="w-4 h-4 mr-2" />}
            Assign Selected ({selected.size})
          </button>
        </div>
      </div>

      {/* Student List */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === filteredStudents.length && filteredStudents.length > 0}
                    onChange={selectAll}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-gray-700 font-medium">Name</th>
                <th className="px-4 py-3 text-left text-gray-700 font-medium">ID</th>
                <th className="px-4 py-3 text-left text-gray-700 font-medium">Department</th>
                <th className="px-4 py-3 text-left text-gray-700 font-medium">GPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    No students match your criteria
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr
                    key={student.id}
                    className={`hover:bg-gray-50 cursor-pointer ${selected.has(student.id) ? 'bg-brand-50' : ''}`}
                    onClick={() => toggleStudent(student.id)}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        onClick={e => e.stopPropagation()}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{student.user?.name}</div>
                      <div className="text-xs text-gray-500">{student.user?.institutionalEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{student.studentId}</td>
                    <td className="px-4 py-3 text-gray-600">{student.department?.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (student.cumulativeGPA ?? 0) >= 3.5 ? 'bg-green-100 text-green-800' :
                        (student.cumulativeGPA ?? 0) >= 3.0 ? 'bg-brand-100 text-brand-700' :
                        (student.cumulativeGPA ?? 0) >= 2.0 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {student.cumulativeGPA?.toFixed(2) ?? 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
