import React from 'react';
import clsx from 'clsx';

export interface Column<T> {
  key: string;
  title: string | React.ReactNode;
  dataIndex?: keyof T;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  columns: Column<T>[];
  dataSource: T[];
  loading?: boolean;
  rowKey?: string | ((record: T) => string);
  onRow?: (record: T) => React.HTMLAttributes<HTMLTableRowElement> & {
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragLeave?: () => void;
    onDrop?: (e: React.DragEvent) => void;
  };
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  bordered?: boolean;
  striped?: boolean;
}

function Table<T extends Record<string, any>>({
  columns = [],
  dataSource = [],
  loading = false,
  rowKey = 'id',
  onRow,
  pagination,
  bordered = false,
  striped = true,
}: TableProps<T>) {
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || String(index);
  };

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table
          className={clsx('w-full', {
            'border-collapse': bordered,
          })}
        >
          <thead>
            <tr className="bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider',
                    {
                      'text-center': col.align === 'center',
                      'text-right': col.align === 'right',
                      'border border-gray-200': bordered,
                    }
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-500">加载中...</span>
                  </div>
                </td>
              </tr>
            ) : dataSource.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              dataSource.map((record, index) => {
                const key = getRowKey(record, index);
                const rowProps = onRow ? onRow(record) : {};
                const { className: rowClassName, ...restRowProps } = rowProps;
                return (
                  <tr
                    key={key}
                    {...restRowProps}
                    className={clsx('hover:bg-gray-50 transition-colors', rowClassName, {
                      'bg-gray-50': striped && index % 2 === 1,
                      'border border-gray-200': bordered,
                    })}
                  >
                    {columns.map((col) => {
                      const value = col.dataIndex ? record[col.dataIndex] : undefined;
                      const content = col.render ? col.render(value, record, index) : value;
                      return (
                        <td
                          key={col.key}
                          className={clsx('px-4 py-3 text-sm text-gray-900', {
                            'text-center': col.align === 'center',
                            'text-right': col.align === 'right',
                            'border border-gray-200': bordered,
                          })}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            共 <span className="font-medium">{pagination.total}</span> 条记录
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
              disabled={pagination.current === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-700">
              第 {pagination.current} / {Math.ceil(pagination.total / pagination.pageSize)} 页
            </span>
            <button
              onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
              disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;

