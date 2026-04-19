import Modal from './Modal';
import Button from './Button';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  entityType = 'item',
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Delete ${entityType}?`}
      subtitle="This action may be reversible from Trash if soft-delete is enabled."
      accentColor="red"
    >
      <p className="text-sm text-gray-600 mb-6">
        Are you sure you want to remove <strong className="text-gray-900">{itemName}</strong>?
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" className="flex-1" loading={loading} onClick={onConfirm}>
          Delete
        </Button>
      </div>
    </Modal>
  );
}
