import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus, X, AlertTriangle } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6 AM to 8 PM

export default function ScheduleBuilder({ selectedSlots = [], onSlotsChange, conflicts = [], instructorId }) {
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);

  const getTimeFromPosition = (dayIndex, hourIndex) => {
    const hour = HOURS[hourIndex];
    return {
      dayOfWeek: dayIndex,
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
    };
  };

  const isSlotSelected = (dayIndex, hourIndex) => {
    const timeSlot = getTimeFromPosition(dayIndex, hourIndex);
    return selectedSlots.some(slot =>
      slot.dayOfWeek === timeSlot.dayOfWeek &&
      slot.startTime === timeSlot.startTime
    );
  };

  const hasConflict = (dayIndex, hourIndex) => {
    const timeSlot = getTimeFromPosition(dayIndex, hourIndex);
    return conflicts.some(conflict =>
      conflict.schedule.dayOfWeek === timeSlot.dayOfWeek &&
      conflict.schedule.startTime === timeSlot.startTime
    );
  };

  const handleMouseDown = (dayIndex, hourIndex) => {
    setDragging(true);
    setDragStart({ dayIndex, hourIndex });
    setDragEnd({ dayIndex, hourIndex });
  };

  const handleMouseEnter = (dayIndex, hourIndex) => {
    if (dragging) {
      setDragEnd({ dayIndex, hourIndex });
    }
  };

  const handleMouseUp = () => {
    if (dragging && dragStart) {
      const startDay = Math.min(dragStart.dayIndex, dragEnd.dayIndex);
      const endDay = Math.max(dragStart.dayIndex, dragEnd.dayIndex);
      const startHour = Math.min(dragStart.hourIndex, dragEnd.hourIndex);
      const endHour = Math.max(dragStart.hourIndex, dragEnd.hourIndex);

      const newSlots = [];
      for (let day = startDay; day <= endDay; day++) {
        for (let hour = startHour; hour <= endHour; hour++) {
          const timeSlot = getTimeFromPosition(day, hour);
          if (!selectedSlots.some(slot =>
            slot.dayOfWeek === timeSlot.dayOfWeek &&
            slot.startTime === timeSlot.startTime
          )) {
            newSlots.push(timeSlot);
          }
        }
      }

      onSlotsChange([...selectedSlots, ...newSlots]);
    }

    setDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const removeSlot = (slotToRemove) => {
    onSlotsChange(selectedSlots.filter(slot =>
      !(slot.dayOfWeek === slotToRemove.dayOfWeek &&
        slot.startTime === slotToRemove.startTime)
    ));
  };

  const clearAll = () => {
    onSlotsChange([]);
  };

  const isInDragArea = (dayIndex, hourIndex) => {
    if (!dragging || !dragStart || !dragEnd) return false;

    const startDay = Math.min(dragStart.dayIndex, dragEnd.dayIndex);
    const endDay = Math.max(dragStart.dayIndex, dragEnd.dayIndex);
    const startHour = Math.min(dragStart.hourIndex, dragEnd.hourIndex);
    const endHour = Math.max(dragStart.hourIndex, dragEnd.hourIndex);

    return dayIndex >= startDay && dayIndex <= endDay &&
           hourIndex >= startHour && hourIndex <= endHour;
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
        <div className="flex">
          <Clock className="w-5 h-5 text-blue-400 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-brand-700">Schedule Builder</h3>
            <p className="text-sm text-brand-700 mt-1">
              Click and drag to select time slots. Red slots indicate conflicts.
              Each slot represents a 1-hour block.
            </p>
          </div>
        </div>
      </div>

      {/* Conflict Warnings */}
      {conflicts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Schedule Conflicts Detected</h3>
              <ul className="text-sm text-red-700 mt-1 space-y-1">
                {conflicts.map((conflict, index) => (
                  <li key={index}>
                    {DAYS[conflict.schedule.dayOfWeek]} {conflict.schedule.startTime} - {conflict.schedule.endTime}:
                    {conflict.conflictingSections.map(s => ` ${s.courseCode}`).join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Grid */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-8 bg-gray-50 border-b">
          <div className="p-3 font-medium text-gray-700">Time</div>
          {DAYS.map(day => (
            <div key={day} className="p-3 font-medium text-gray-700 text-center">{day.slice(0, 3)}</div>
          ))}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {HOURS.map((hour, hourIndex) => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
              <div className="p-3 text-sm text-gray-600 bg-gray-50 border-r">
                {hour}:00
              </div>
              {DAYS.map((day, dayIndex) => {
                const isSelected = isSlotSelected(dayIndex, hourIndex);
                const hasConflictHere = hasConflict(dayIndex, hourIndex);
                const isInDrag = isInDragArea(dayIndex, hourIndex);

                return (
                  <div
                    key={`${dayIndex}-${hourIndex}`}
                    className={`relative p-2 border-r border-gray-100 cursor-pointer transition-colors ${
                      isSelected
                        ? hasConflictHere
                          ? 'bg-red-200 hover:bg-red-300'
                          : 'bg-blue-200 hover:bg-blue-300'
                        : isInDrag
                        ? 'bg-brand-100'
                        : 'hover:bg-gray-50'
                    }`}
                    onMouseDown={() => handleMouseDown(dayIndex, hourIndex)}
                    onMouseEnter={() => handleMouseEnter(dayIndex, hourIndex)}
                    onMouseUp={handleMouseUp}
                  >
                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSlot(getTimeFromPosition(dayIndex, hourIndex));
                        }}
                        className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Slots Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} selected
        </div>
        <button
          onClick={clearAll}
          className="text-sm text-red-600 hover:text-red-800"
          disabled={selectedSlots.length === 0}
        >
          Clear All
        </button>
      </div>

      {/* Selected Slots List */}
      {selectedSlots.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Selected Time Slots</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {selectedSlots.map((slot, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                <span className="text-sm">
                  {DAYS[slot.dayOfWeek]} {slot.startTime} - {slot.endTime}
                </span>
                <button
                  onClick={() => removeSlot(slot)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}