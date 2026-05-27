const Table = ({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  flush = false,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  const wrapClass = flush
    ? 'overflow-x-auto'
    : 'overflow-x-auto backdrop-blur-sm bg-white/30 border border-white/40 rounded-xl shadow-lg';
  const headClass = flush
    ? 'bg-slate-50 border-b border-gray-200'
    : 'backdrop-blur-md bg-white/50 border-b border-white/40';
  const bodyClass = flush ? 'bg-white divide-y divide-gray-100' : 'backdrop-blur-sm bg-white/40 divide-y divide-white/30';

  return (
    <div className={wrapClass}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className={headClass}>
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={bodyClass}>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-slate-50/80 transition-colors duration-150">
              {columns.map((column, colIndex) => (
                <td
                  key={colIndex}
                  className="px-4 py-3 text-sm text-gray-900 align-middle"
                >
                  {column.render
                    ? column.render(row, rowIndex)
                    : row[column.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;

