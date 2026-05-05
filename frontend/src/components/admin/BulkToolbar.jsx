import React from 'react';
import { Trash2, FolderOpen } from 'lucide-react';
import Button from './Button';

export default function BulkToolbar({
  selectedCount,
  onDelete,
  onAssignProgram,
  canDelete = true,
  entityType = 'items',
}) {
  // Only show toolbar when items are selected
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-blue-900">
          {selectedCount} {entityType} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Show Assign Program button only for students */}
        {entityType === 'students' && onAssignProgram && (
          <Button
            variant="secondary"
            onClick={onAssignProgram}
            className="text-sm"
          >
            <FolderOpen className="w-4 h-4" />
            Assign Program
          </Button>
        )}

        {/* Show Delete button only if user has permission */}
        {canDelete && onDelete && (
          <Button
            variant="danger"
            onClick={onDelete}
            className="text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected
          </Button>
        )}
      </div>
    </div>
  );
}
