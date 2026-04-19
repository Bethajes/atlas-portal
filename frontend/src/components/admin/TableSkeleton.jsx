export default function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-gray-50">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-6 py-4">
              <div
                className="animate-pulse bg-gray-100 rounded h-4"
                style={{ width: `${40 + ((r + c * 7) % 5) * 10}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
