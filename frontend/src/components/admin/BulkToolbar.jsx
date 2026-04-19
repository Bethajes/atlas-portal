import Button from './Button';

export default function BulkToolbar({
  selectedCount,
  onDelete,
  onAssignProgram,
  canDelete = true,
  entityType = 'records',
}) {
  if (selectedCount <= 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200">
      <span className="text-sm font-semibold text-blue-900">
        {selectedCount} {entityType} selected
      </span>
      {onAssignProgram ? (
        <Button variant="secondary" className="!py-1.5 !text-xs" onClick={onAssignProgram}>
          Assign program
        </Button>
      ) : null}
      {canDelete && onDelete ? (
        <Button variant="danger" className="!py-1.5 !text-xs" onClick={onDelete}>
          Delete selected
        </Button>
      ) : null}
    </div>
  );
}
