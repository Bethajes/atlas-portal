import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, X, Clock, Users, MapPin, BookOpen } from 'lucide-react';
import api from '../../../api/axios';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 'basic', title: 'Basic Information', icon: BookOpen },
  { id: 'instructor', title: 'Instructor Assignment', icon: Users },
  { id: 'schedule', title: 'Schedule Builder', icon: Clock },
  { id: 'capacity', title: 'Capacity & Room', icon: MapPin },
  { id: 'review', title: 'Review & Confirm', icon: Check },
];

export default function SectionWizard({ onComplete, onCancel, initialData = {} }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    courseId: '',
    name: '',
    instructorId: '',
    semesterId: '',
    departmentId: '',
    maxStudents: 40,
    roomNumber: '',
    schedules: [],
    ...initialData,
  });

  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, instructorsRes, semestersRes, departmentsRes] = await Promise.all([
        api.get('/courses'),
        api.get('/instructors'),
        api.get('/semesters'),
        api.get('/departments'),
      ]);

      setCourses(coursesRes.data.data || []);
      setInstructors(instructorsRes.data.data || []);
      setSemesters(semestersRes.data.data || []);
      setDepartments(departmentsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const validateStep = (step) => {
    const errors = {};

    switch (step) {
      case 0: // Basic
        if (!formData.courseId) errors.courseId = 'Course is required';
        if (!formData.name) errors.name = 'Section name is required';
        break;
      case 1: // Instructor
        if (!formData.instructorId) errors.instructorId = 'Instructor is required';
        break;
      case 2: // Schedule
        if (formData.schedules.length === 0) errors.schedules = 'At least one schedule slot is required';
        break;
      case 3: // Capacity
        if (!formData.maxStudents || formData.maxStudents < 1) errors.maxStudents = 'Valid capacity is required';
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      const response = await api.post('/sections', formData);
      toast.success('Section created successfully!');
      onComplete(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create section');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <BasicInfoStep formData={formData} updateFormData={updateFormData} courses={courses} semesters={semesters} errors={validationErrors} />;
      case 1:
        return <InstructorStep formData={formData} updateFormData={updateFormData} instructors={instructors} errors={validationErrors} />;
      case 2:
        return <ScheduleStep formData={formData} updateFormData={updateFormData} errors={validationErrors} />;
      case 3:
        return <CapacityStep formData={formData} updateFormData={updateFormData} departments={departments} errors={validationErrors} />;
      case 4:
        return <ReviewStep formData={formData} courses={courses} instructors={instructors} semesters={semesters} departments={departments} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Create New Section</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isActive ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="ml-3">
                    <div className={`text-sm font-medium ${
                      isActive ? 'text-brand-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-12 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-96">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>

            {currentStep === STEPS.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-md hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Section'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-md hover:bg-brand-700"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Step Components
function BasicInfoStep({ formData, updateFormData, courses, semesters, errors }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Course *</label>
        <select
          value={formData.courseId}
          onChange={(e) => updateFormData({ courseId: e.target.value })}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
        >
          <option value="">Select a course</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>
              {course.code} - {course.title}
            </option>
          ))}
        </select>
        {errors.courseId && <p className="mt-1 text-sm text-red-600">{errors.courseId}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Section Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          placeholder="e.g., A1, B2, Lab-01"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Semester</label>
        <select
          value={formData.semesterId}
          onChange={(e) => updateFormData({ semesterId: e.target.value })}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
        >
          <option value="">Select semester (optional)</option>
          {semesters.map(semester => (
            <option key={semester.id} value={semester.id}>
              {semester.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function InstructorStep({ formData, updateFormData, instructors, errors }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Instructor *</label>
        <select
          value={formData.instructorId}
          onChange={(e) => updateFormData({ instructorId: e.target.value })}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
        >
          <option value="">Select an instructor</option>
          {instructors.map(instructor => (
            <option key={instructor.id} value={instructor.id}>
              {instructor.user?.name} ({instructor.employeeId})
            </option>
          ))}
        </select>
        {errors.instructorId && <p className="mt-1 text-sm text-red-600">{errors.instructorId}</p>}
      </div>
    </div>
  );
}

function ScheduleStep({ formData, updateFormData, errors }) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const addSchedule = () => {
    updateFormData({
      schedules: [...formData.schedules, { dayOfWeek: 1, startTime: '09:00', endTime: '10:30' }]
    });
  };

  const updateSchedule = (index, updates) => {
    const newSchedules = [...formData.schedules];
    newSchedules[index] = { ...newSchedules[index], ...updates };
    updateFormData({ schedules: newSchedules });
  };

  const removeSchedule = (index) => {
    updateFormData({
      schedules: formData.schedules.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Meeting Times</h3>
        <button
          onClick={addSchedule}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700"
        >
          Add Time Slot
        </button>
      </div>

      {formData.schedules.length === 0 && (
        <p className="text-gray-500 text-center py-8">No schedule slots added yet. Click "Add Time Slot" to begin.</p>
      )}

      {formData.schedules.map((schedule, index) => (
        <div key={index} className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">Time Slot {index + 1}</h4>
            <button
              onClick={() => removeSchedule(index)}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Day</label>
              <select
                value={schedule.dayOfWeek}
                onChange={(e) => updateSchedule(index, { dayOfWeek: parseInt(e.target.value) })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
              >
                {days.map((day, i) => (
                  <option key={i} value={i}>{day}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Start Time</label>
              <input
                type="time"
                value={schedule.startTime}
                onChange={(e) => updateSchedule(index, { startTime: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">End Time</label>
              <input
                type="time"
                value={schedule.endTime}
                onChange={(e) => updateSchedule(index, { endTime: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
        </div>
      ))}

      {errors.schedules && <p className="text-sm text-red-600">{errors.schedules}</p>}
    </div>
  );
}

function CapacityStep({ formData, updateFormData, departments, errors }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Maximum Students *</label>
        <input
          type="number"
          min="1"
          max="200"
          value={formData.maxStudents}
          onChange={(e) => updateFormData({ maxStudents: parseInt(e.target.value) })}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
        />
        {errors.maxStudents && <p className="mt-1 text-sm text-red-600">{errors.maxStudents}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Room Number</label>
        <input
          type="text"
          value={formData.roomNumber}
          onChange={(e) => updateFormData({ roomNumber: e.target.value })}
          placeholder="e.g., Room 101, Lab 205"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Department</label>
        <select
          value={formData.departmentId}
          onChange={(e) => updateFormData({ departmentId: e.target.value })}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
        >
          <option value="">Select department (optional)</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ReviewStep({ formData, courses, instructors, semesters, departments }) {
  const selectedCourse = courses.find(c => c.id === formData.courseId);
  const selectedInstructor = instructors.find(i => i.id === formData.instructorId);
  const selectedSemester = semesters.find(s => s.id === formData.semesterId);
  const selectedDepartment = departments.find(d => d.id === formData.departmentId);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Section Summary</h3>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Basic Information</h4>
            <dl className="mt-2 space-y-1">
              <div><dt className="text-sm text-gray-600 inline">Course:</dt> <dd className="inline ml-2">{selectedCourse?.code} - {selectedCourse?.title}</dd></div>
              <div><dt className="text-sm text-gray-600 inline">Section:</dt> <dd className="inline ml-2">{formData.name}</dd></div>
              <div><dt className="text-sm text-gray-600 inline">Code:</dt> <dd className="inline ml-2">{selectedCourse?.code}-{formData.name}</dd></div>
              <div><dt className="text-sm text-gray-600 inline">Semester:</dt> <dd className="inline ml-2">{selectedSemester?.name || 'Not specified'}</dd></div>
            </dl>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Assignment</h4>
            <dl className="mt-2 space-y-1">
              <div><dt className="text-sm text-gray-600 inline">Instructor:</dt> <dd className="inline ml-2">{selectedInstructor?.user?.name}</dd></div>
              <div><dt className="text-sm text-gray-600 inline">Department:</dt> <dd className="inline ml-2">{selectedDepartment?.name || 'Not specified'}</dd></div>
              <div><dt className="text-sm text-gray-600 inline">Capacity:</dt> <dd className="inline ml-2">{formData.maxStudents} students</dd></div>
              <div><dt className="text-sm text-gray-600 inline">Room:</dt> <dd className="inline ml-2">{formData.roomNumber || 'Not specified'}</dd></div>
            </dl>
          </div>
        </div>

        {formData.schedules.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Schedule</h4>
            <div className="space-y-2">
              {formData.schedules.map((schedule, index) => (
                <div key={index} className="flex items-center text-sm text-gray-600">
                  <span className="font-medium w-16">{days[schedule.dayOfWeek]}</span>
                  <span>{schedule.startTime} - {schedule.endTime}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}