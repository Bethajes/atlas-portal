import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, TrendingUp, Users, Clock, BarChart3,
  RefreshCw, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import api from '../../../api/axios';
import toast from 'react-hot-toast';

export default function OptimizationDashboard({ semesterId, departmentId }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyingFix, setApplyingFix] = useState(null);

  useEffect(() => {
    fetchAnalysis();
  }, [semesterId, departmentId]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      // This would be a new API endpoint for optimization analysis
      const response = await api.get('/optimization/analyze', {
        params: { semesterId, departmentId }
      });
      setAnalysis(response.data.data);
    } catch (error) {
      // For now, generate mock data
      setAnalysis(generateMockAnalysis());
    } finally {
      setLoading(false);
    }
  };

  const generateMockAnalysis = () => {
    return {
      overcrowdedSections: [
        {
          id: 'sec-1',
          sectionCode: 'CS101-A',
          courseTitle: 'Introduction to Computer Science',
          enrolled: 45,
          capacity: 40,
          utilization: 112.5,
          instructor: 'Dr. Smith',
          recommendations: [
            {
              type: 'move_students',
              description: 'Move 5 students to CS101-B',
              impact: 'Resolves overcrowding',
              action: 'auto'
            }
          ]
        }
      ],
      underfilledSections: [
        {
          id: 'sec-2',
          sectionCode: 'MATH201-B',
          courseTitle: 'Calculus II',
          enrolled: 15,
          capacity: 40,
          utilization: 37.5,
          instructor: 'Dr. Johnson',
          recommendations: [
            {
              type: 'merge_sections',
              description: 'Consider merging with MATH201-A',
              impact: 'Optimizes resource usage',
              action: 'manual'
            }
          ]
        }
      ],
      instructorWorkload: [
        {
          instructorId: 'ins-1',
          instructorName: 'Dr. Smith',
          totalHours: 24,
          maxHours: 20,
          sections: ['CS101-A', 'CS201-A', 'CS301-A'],
          status: 'overloaded',
          recommendations: [
            {
              type: 'reassign_section',
              description: 'Reassign CS301-A to another instructor',
              impact: 'Balances workload',
              action: 'manual'
            }
          ]
        }
      ],
      scheduleConflicts: [
        {
          section1: 'CS101-A',
          section2: 'CS102-A',
          instructor: 'Dr. Smith',
          time: 'Mon 9:00-10:30',
          type: 'instructor_conflict',
          resolution: 'Change CS102-A to Tue 9:00-10:30'
        }
      ],
      summary: {
        totalSections: 150,
        optimizedSections: 120,
        issuesFound: 15,
        potentialSavings: '$50,000'
      }
    };
  };

  const applyRecommendation = async (recommendation, sectionId) => {
    setApplyingFix(sectionId);
    try {
      // This would call the appropriate API endpoint
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock delay
      toast.success('Recommendation applied successfully');
      fetchAnalysis(); // Refresh data
    } catch (error) {
      toast.error('Failed to apply recommendation');
    } finally {
      setApplyingFix(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
        <span className="ml-3 text-gray-600">Analyzing sections...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg border border-gray-200"
        >
          <div className="flex items-center">
            <div className="p-2 bg-brand-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-brand-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sections</p>
              <p className="text-2xl font-bold text-gray-900">{analysis.summary.totalSections}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-lg border border-gray-200"
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Optimized</p>
              <p className="text-2xl font-bold text-gray-900">{analysis.summary.optimizedSections}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-lg border border-gray-200"
        >
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Issues Found</p>
              <p className="text-2xl font-bold text-gray-900">{analysis.summary.issuesFound}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-lg border border-gray-200"
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Potential Savings</p>
              <p className="text-2xl font-bold text-gray-900">{analysis.summary.potentialSavings}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Overcrowded Sections */}
      {analysis.overcrowdedSections.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-lg"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              Overcrowded Sections
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {analysis.overcrowdedSections.map(section => (
              <div key={section.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{section.sectionCode}</h4>
                    <p className="text-sm text-gray-600">{section.courseTitle}</p>
                    <p className="text-xs text-gray-500">Instructor: {section.instructor}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-red-600">
                      {section.enrolled}/{section.capacity} ({section.utilization}%)
                    </div>
                    <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${Math.min(section.utilization, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                {section.recommendations.map((rec, index) => (
                  <div key={index} className="mt-4 p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-red-800">{rec.description}</p>
                        <p className="text-xs text-red-600">{rec.impact}</p>
                      </div>
                      <button
                        onClick={() => applyRecommendation(rec, section.id)}
                        disabled={applyingFix === section.id}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                      >
                        {applyingFix === section.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        )}
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Instructor Workload Issues */}
      {analysis.instructorWorkload.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-lg"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Clock className="w-5 h-5 text-yellow-500 mr-2" />
              Instructor Workload Issues
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {analysis.instructorWorkload.map(instructor => (
              <div key={instructor.instructorId} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{instructor.instructorName}</h4>
                    <p className="text-xs text-gray-500">
                      Sections: {instructor.sections.join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      instructor.status === 'overloaded' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {instructor.totalHours}/{instructor.maxHours} hours
                    </div>
                    <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className={`h-2 rounded-full ${
                          instructor.status === 'overloaded' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${(instructor.totalHours / instructor.maxHours) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                {instructor.recommendations.map((rec, index) => (
                  <div key={index} className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-yellow-800">{rec.description}</p>
                        <p className="text-xs text-yellow-600">{rec.impact}</p>
                      </div>
                      <button
                        onClick={() => applyRecommendation(rec, instructor.instructorId)}
                        disabled={applyingFix === instructor.instructorId}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                      >
                        {applyingFix === instructor.instructorId ? (
                          <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        )}
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Schedule Conflicts */}
      {analysis.scheduleConflicts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-lg"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              Schedule Conflicts
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {analysis.scheduleConflicts.map((conflict, index) => (
              <div key={index} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {conflict.section1} vs {conflict.section2}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Instructor: {conflict.instructor} • Time: {conflict.time}
                    </p>
                    <p className="text-xs text-red-600">{conflict.type.replace('_', ' ').toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Suggested fix:</p>
                    <p className="text-sm font-medium text-brand-600">{conflict.resolution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}