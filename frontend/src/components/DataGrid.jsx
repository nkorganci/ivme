import { useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { AG_GRID_LOCALE_TR } from '@ag-grid-community/locale';
import { selectionFilter } from './GridSelectionFilter.jsx';

const modules = [AllCommunityModule];
ModuleRegistry.registerModules(modules);

const numberFormatter = new Intl.NumberFormat('tr-TR');
const theme = themeQuartz.withParams({
  backgroundColor: 'var(--surface)',
  foregroundColor: 'var(--ink)',
  accentColor: 'var(--table-accent)',
  borderColor: 'var(--line)',
  headerBackgroundColor: 'var(--table-accent)',
  headerTextColor: 'var(--surface)',
  headerColumnResizeHandleColor: 'var(--table-accent)',
  oddRowBackgroundColor: 'var(--tint)',
  autoHeightMinBodyHeight: 0,
});
const sheetTheme = themeQuartz.withParams({
  backgroundColor: 'var(--surface)',
  foregroundColor: 'var(--ink)',
  accentColor: 'var(--table-accent)',
  borderColor: 'var(--line)',
  headerBackgroundColor: 'var(--surface)',
  headerTextColor: 'var(--ink)',
  headerColumnResizeHandleColor: 'var(--line)',
  oddRowBackgroundColor: 'var(--surface)',
  autoHeightMinBodyHeight: 0,
});
// A one-row summary still needs room below the row for touch-mode overlay scrollbars.
const denseTheme = theme.withParams({ spacing: 3, fontSize: 12, cellHorizontalPadding: 4, headerHeight: 34, rowHeight: 34, autoHeightMinBodyHeight: 50 });

const defaultColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  flex: 0,
  minWidth: 40,
};
const compactColDef = { ...defaultColDef, sortable: false, filter: false };
// Keep the grid at container width and redistribute columns when that width changes.
const gridSizeStrategy = { type: 'fitGridWidth', continuous: true };
const contentSizeStrategy = { type: 'fitCellContents', scaleUpToFitGridWidth: true, continuous: true };
const sortOnlyColDef = { ...defaultColDef, filter: false, unSortIcon: true, sortingOrder: ['asc', 'desc'] };
const dataTypeDefinitions = {
  number: {
    baseDataType: 'number',
    extendsDataType: 'number',
    valueFormatter: ({ value }) => value == null ? '' : numberFormatter.format(value),
  },
};

const defaultRowKey = row => row.key ?? row.id;

// Community full-width rows keep the editor directly below its source row.
function ExpandedDetail({ data, node, api, context }) {
  const root = useRef(null);
  const Detail = context.inlineDetail.component;
  useEffect(() => {
    let frame;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!root.current || api.isDestroyed()) return;
        const height = Math.ceil(root.current.getBoundingClientRect().height) + 1;
        if (height > 0 && height !== node.rowHeight) {
          node.setRowHeight(height);
          api.onRowHeightChanged();
        }
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root.current);
    measure();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [node, api]);
  return <div ref={root} className="app-grid-inline-detail"><Detail item={data} {...context.inlineDetail.props} /></div>;
}

export default function DataGrid({ rowData, columnDefs, gridOptions = {}, mode = 'standard', className = '', columnSorting = false, scrollable = false, fitContent = false, dense = false,
  showColumnFilters = false, selectionFilters = false, compactColumns = false, showSearch = true, onFilteredRowsChange,
  expandedRowKey, detailComponent, detailContext, rowKey = defaultRowKey }) {
  const [search, setSearch] = useState('');
  const compact = mode !== 'standard';
  const columns = useMemo(() => {
    const configure = defs => defs.map(def => def.children ? { ...def, children: configure(def.children) } : {
      ...def,
      ...(fitContent ? { flex: 0, minWidth: Math.min(def.minWidth ?? 40, 40) } : {}),
      ...(selectionFilters ? { editable: false, floatingFilter: false,
      comparator: def.comparator || (def.cellDataType === 'number' || def.filterParams?.selectionType === 'date'
        ? undefined : (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'tr', { numeric: true })),
      filter: def.filter === false ? false : selectionFilter,
      filterParams: { ...def.filterParams, selectionType: def.filterParams?.selectionType || (def.cellDataType === 'number' ? 'number' : 'text') },
      } : {}),
    });
    return configure(columnDefs);
  }, [columnDefs, selectionFilters, fitContent]);
  const columnDefaults = useMemo(() => ({
    ...(columnSorting ? sortOnlyColDef : compact ? compactColDef : defaultColDef),
    ...(showColumnFilters && !compact ? { floatingFilter: true, wrapHeaderText: true, autoHeaderHeight: true } : {}),
    ...(scrollable ? { wrapText: true, wrapHeaderText: true, autoHeaderHeight: true } : {}),
    ...(dense ? { minWidth: 50, resizable: false } : {}),
    ...(selectionFilters ? { flex: 0, width: 110, wrapHeaderText: false, autoHeaderHeight: false, unSortIcon: false, suppressHeaderFilterButton: false } : {}),
    ...(compactColumns ? { minWidth: 28, flex: 1, cellStyle: { textAlign: 'center' } } : {}),
    ...(fitContent ? { flex: 0, minWidth: 40 } : {}),
  }), [columnSorting, compact, scrollable, showColumnFilters, fitContent, dense, selectionFilters, compactColumns]);
  const notifyFilteredRows = event => {
    if (!onFilteredRowsChange) return;
    const rows = [];
    event.api.forEachNodeAfterFilter(node => { if (node.data && !node.data.__inlineDetail) rows.push(node.data); });
    onFilteredRowsChange(rows);
  };
  const displayRows = useMemo(() => !detailComponent ? rowData : (rowData || []).flatMap(row =>
    rowKey(row) === expandedRowKey ? [row, { ...row, __inlineDetail: true }] : [row]), [rowData, expandedRowKey, detailComponent, rowKey]);
  const expansionOptions = detailComponent ? {
    context: { ...gridOptions.context, inlineDetail: { component: detailComponent, props: detailContext } },
    getRowId: ({ data }) => `${data.__inlineDetail ? 'detail:' : 'row:'}${rowKey(data)}`,
    isFullWidthRow: ({ rowNode }) => !!rowNode.data?.__inlineDetail,
    fullWidthCellRenderer: ExpandedDetail,
    getRowHeight: params => params.data?.__inlineDetail ? 480 : gridOptions.getRowHeight?.(params),
    postSortRows: ({ nodes }) => {
      const details = new Map(nodes.filter(n => n.data?.__inlineDetail).map(n => [rowKey(n.data), n]));
      const parents = nodes.filter(n => !n.data?.__inlineDetail);
      nodes.length = 0;
      parents.forEach(node => { nodes.push(node); if (details.has(rowKey(node.data))) nodes.push(details.get(rowKey(node.data))); });
    },
  } : {};
  return <div className={`app-data-grid app-data-grid-${mode}${scrollable ? ' app-data-grid-scrollable' : ''}${fitContent ? ' app-data-grid-fit-content' : ''}${dense ? ' app-data-grid-dense' : ''}${selectionFilters ? ' app-data-grid-selection' : ''}${compactColumns ? ' app-data-grid-compact-columns' : ''} ${className}`}>
    {!compact && showSearch && <label className="app-data-grid-search">
      <span className="sr-only">Tabloda ara</span>
      <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
        placeholder="Tabloda ara" aria-label="Tabloda ara" />
    </label>}
    <AgGridReact
      modules={modules}
      theme={dense || compactColumns ? denseTheme : mode === 'sheet' ? sheetTheme : theme}
      rowData={displayRows ?? []}
      columnDefs={columns}
      enableFilterHandlers={selectionFilters}
      defaultColDef={columnDefaults}
      dataTypeDefinitions={dataTypeDefinitions}
      localeText={AG_GRID_LOCALE_TR}
      quickFilterText={showSearch ? search : ''}
      pagination={!compact}
      paginationPageSize={10}
      paginationPageSizeSelector={false}
      domLayout={scrollable ? 'normal' : 'autoHeight'}
      suppressMovableColumns={compact}
      autoSizeStrategy={fitContent ? contentSizeStrategy : gridSizeStrategy}
      suppressColumnVirtualisation={fitContent}
      {...gridOptions}
      {...expansionOptions}
      onFilterChanged={event => { notifyFilteredRows(event); gridOptions.onFilterChanged?.(event); }}
      onRowDataUpdated={event => { notifyFilteredRows(event); gridOptions.onRowDataUpdated?.(event); }}
      onPaginationChanged={event => {
        if (fitContent && event.newPage) requestAnimationFrame(() => {
          if (!event.api.isDestroyed()) event.api.autoSizeAllColumns();
        });
        gridOptions.onPaginationChanged?.(event);
      }}
    />
  </div>;
}
