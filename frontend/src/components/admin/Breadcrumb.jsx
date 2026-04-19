export default function Breadcrumb({ items = [] }) {
  if (!items.length) return null;
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-2">
            {i > 0 && <span className="text-gray-300">/</span>}
            {last || !item.onClick ? (
              <span className={last ? 'font-semibold text-gray-900' : 'text-gray-500'}>{item.label}</span>
            ) : (
              <button
                type="button"
                onClick={item.onClick}
                className="text-blue-600 hover:underline font-medium"
              >
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
