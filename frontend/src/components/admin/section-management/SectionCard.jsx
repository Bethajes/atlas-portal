import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Clock, MapPin, BookOpen, MoreVertical, Edit, Trash2,
  UserPlus, BarChart3, Eye, GraduationCap, AlertTriangle
} from 'lucide-react';

export default function SectionCard({
  section,
  onEdit,
  onDelete,
  onAssignStudents,
  onViewAnalytics,
  onViewDetails
}) {
  const [showActions, setShowActions] = useState(false);

  const utilizationRate = Math.round((section.enrolledCount / section.maxStudents) * 100);
  const isOverCapacity = section.enrolledCount > section.maxStudents;
  const isUnderUtilized = utilizationRate < 50;

  const getUtilizationColor = () => {
    if (isOverCapacity) return 'text-red-600 bg-red-100';
    if (utilizationRate >= 90) return 'text-green-600 bg-green-100';
    if (utilizationRate >= 70) return 'text-brand-600 bg-brand-100';
    if (utilizationRate >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getStatusBadge = () => {
    if (isOverCapacity) return { text: 'Over Capacity', color: 'bg-red-100 text-red-800' };
    if (utilizationRate === 0) return { text: 'Empty', color: 'bg-gray-100 text-gray-800' };
    if (utilizationRate < 50) return { text: 'Low', color: 'bg-yellow-100 text-yellow-800' };
    if (utilizationRate < 80) return { text: 'Good', color: 'bg-brand-100 text-brand-700' };
    return { text: 'Full', color: 'bg-green-100 text-green-800' };
  };

  const status = getStatusBadge();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {section.courseCode}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                {status.text}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {section.courseTitle}
            </p>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => { onEdit(section.id); setShowActions(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Edit className="w-4 h-4 mr-3" />
                    Edit Section
                  </button>
                  <button
                    onClick={() => { onAssignStudents(section.id); setShowActions(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <UserPlus className="w-4 h-4 mr-3" />
                    Assign Students
                  </button>
                  <button
                    onClick={() => { onViewAnalytics(section.id); setShowActions(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <BarChart3 className="w-4 h-4 mr-3" />
                    View Analytics
                  </button>
                  <button
                    onClick={() => { onViewDetails(section.id); setShowActions(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Eye className="w-4 h-4 mr-3" />
                    View Details
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={() => { onDelete(section.id); setShowActions(false); }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-3" />
                    Delete Section
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructor */}
        <div className="mt-4 flex items-center text-sm text-gray-600">
          <Users className="w-4 h-4 mr-2" />
          <span>{section.instructor || 'Unassigned'}</span>
        </div>

        {/* Schedule */}
        {section.schedules && section.schedules.length > 0 && (
          <div className="mt-3 flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            <span>
              {section.schedules.map((schedule, index) => (
                <span key={index}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][schedule.dayOfWeek]} {schedule.startTime}-{schedule.endTime}
                  {index < section.schedules.length - 1 ? ', ' : ''}
                </span>
              ))}
            </span>
          </div>
        )}

        {/* Room */}
        {section.roomNumber && (
          <div className="mt-2 flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            <span>{section.roomNumber}</span>
          </div>
        )}

        {/* Capacity and Utilization */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Capacity</span>
            <span className={`font-medium ${getUtilizationColor()}`}>
              {section.enrolledCount}/{section.maxStudents}
            </span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  isOverCapacity ? 'bg-red-500' :
                  utilizationRate >= 90 ? 'bg-green-500' :
                  utilizationRate >= 70 ? 'bg-brand-500' :
                  utilizationRate >= 50 ? 'bg-yellow-500' : 'bg-gray-400'
                }`}
                style={{ width: `${Math.min(utilizationRate, 100)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500">{utilizationRate}% utilized</span>
            {isOverCapacity && (
              <div className="flex items-center text-xs text-red-600">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Over capacity
              </div>
            )}
          </div>
        </div>

        {/* Performance Summary */}
        {section.avgGPA && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-600">
                <GraduationCap className="w-4 h-4 mr-2" />
                <span>Avg GPA</span>
              </div>
              <span className="font-medium">{section.avgGPA.toFixed(2)}</span>
            </div>
            {section.attendanceRate && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600">Attendance</span>
                <span className="font-medium">{section.attendanceRate}%</span>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex space-x-2">
            <button
              onClick={() => onAssignStudents(section.id)}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700"
            >
              <UserPlus className="w-3 h-3 mr-1" />
              Assign
            </button>
            <button
              onClick={() => onViewAnalytics(section.id)}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              Analytics
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}