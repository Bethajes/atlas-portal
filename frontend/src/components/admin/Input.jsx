export default function Input({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  error,
  className = '',
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="block text-xs font-semibold text-gray-600 mb-1">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
      />
      {error ? <p className="text-red-500 text-xs mt-1">{error}</p> : null}
    </div>
  );
}
