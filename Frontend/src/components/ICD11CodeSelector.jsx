import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiSearch, FiX, FiPlus, FiSave, FiEdit3, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Select from './Select';
import Input from './Input';
import Button from './Button';
import {
  useGetIcdNodesQuery,
  useSearchIcdNodesQuery,
  useLazyGetIcdPathByCodeQuery,
  useLazyGetIcdPathByIdQuery,
  useLazySearchIcdNodesQuery,
  useAddIcdNodeMutation,
  useUpdateIcdNodeMutation,
  useDeleteIcdNodeMutation,
} from '../features/clinical/clinicalApiSlice';

const NODE_TYPE_LABELS = {
  chapter: 'Chapter',
  category: 'Category',
  subcategory: 'Subcategory',
  code: 'Code',
};

const HIERARCHY_TYPES = ['chapter', 'category', 'subcategory'];

function icdNodeLabel(node) {
  if (!node) return '';
  if (node.code) return `${node.code} - ${node.title}`;
  if (node.block) return `${node.block} - ${node.title}`;
  return node.title;
}

function deepestCodeFromPath(path) {
  for (let i = path.length - 1; i >= 0; i--) {
    const c = path[i]?.code;
    if (c) return String(c);
  }
  return '';
}

/** Value persisted on the proforma: WHO code when present, otherwise the selected node label. */
function storedValueFromPath(path) {
  const code = deepestCodeFromPath(path);
  if (code) return code;
  const last = path[path.length - 1];
  return last ? icdNodeLabel(last) : '';
}

function defaultNodeType(parentNode) {
  if (!parentNode) return 'chapter';
  if (parentNode.node_type === 'chapter') return 'category';
  if (parentNode.node_type === 'category') return 'subcategory';
  return 'subcategory';
}

function levelLabel(levelIndex, parentNode) {
  if (levelIndex === 0) return 'Chapter';
  if (parentNode?.node_type === 'chapter') return 'Category';
  if (levelIndex >= 3) return 'Subcategory';
  return 'Subcategory';
}

function canManageNode(node) {
  return node && !node.is_system;
}

function IcdDialog({ open, onClose, title, children, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000000] flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="icd-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full ${maxWidth} max-h-[min(85vh,100%)] overflow-y-auto bg-white shadow-xl border border-gray-200 rounded-t-2xl sm:rounded-xl p-4 sm:p-5`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 id="icd-dialog-title" className="text-base sm:text-lg font-semibold text-gray-800 pr-2">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

function IcdLevelSelect({
  parentId,
  parentNode,
  levelIndex,
  selectedNode,
  onSelect,
  onAddClick,
  onEditClick,
  onDeleteClick,
  showError,
}) {
  const queryParent = levelIndex === 0 ? 'root' : parentId;
  const { data: nodes = [], isLoading } = useGetIcdNodesQuery(queryParent, {
    skip: levelIndex > 0 && !parentId,
  });

  const labelText = levelIndex === 0 ? 'Chapter' : levelLabel(levelIndex, parentNode);

  return (
    <div className="w-full min-w-0 sm:min-w-[220px] sm:flex-1 sm:max-w-xs lg:max-w-sm">
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="block text-sm font-medium text-gray-700">{labelText}</label>
        <button
          type="button"
          onClick={onAddClick}
          className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
          title={`Add ${labelText}`}
        >
          <FiPlus className="w-3 h-3" /> Add
        </button>
      </div>
      <Select
        searchable
        value={selectedNode ? String(selectedNode.id) : ''}
        placeholder={isLoading ? 'Loading...' : `Select ${labelText}`}
        onChange={(e) => {
          const id = e.target.value;
          const node = id ? nodes.find((n) => String(n.id) === id) ?? null : null;
          onSelect(node);
        }}
        options={nodes.map((node) => ({
          value: String(node.id),
          label: icdNodeLabel(node),
          meta: node,
        }))}
        renderOptionSuffix={(option) => {
          const node = option.meta;
          if (!canManageNode(node)) return null;
          return (
            <>
              <button
                type="button"
                onClick={() => onEditClick(node)}
                className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded"
                title="Edit"
                aria-label="Edit"
              >
                <FiEdit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteClick(node)}
                className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded"
                title="Delete"
                aria-label="Delete"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
              </button>
            </>
          );
        }}
        error={levelIndex === 0 && showError}
      />
    </div>
  );
}

function IcdNodeFormModal({
  open,
  title,
  parentNode,
  initialNode,
  defaultType,
  onClose,
  onSubmit,
  isLoading,
}) {
  const isEdit = Boolean(initialNode);
  const [nodeType, setNodeType] = useState(defaultType || 'chapter');
  const [nodeTitle, setNodeTitle] = useState('');
  const [code, setCode] = useState('');
  const [block, setBlock] = useState('');

  useEffect(() => {
    if (!open) return;
    if (initialNode) {
      setNodeType(initialNode.node_type || defaultType || 'subcategory');
      setNodeTitle(initialNode.title || '');
      setCode(initialNode.code || '');
      setBlock(initialNode.block || '');
    } else {
      setNodeType(defaultType || defaultNodeType(parentNode));
      setNodeTitle('');
      setCode('');
      setBlock('');
    }
  }, [open, initialNode, defaultType, parentNode]);

  if (!open) return null;

  const handleSave = () => {
    const trimmedTitle = nodeTitle.trim();
    if (!trimmedTitle) {
      toast.error('Title is required');
      return;
    }
    if (nodeType === 'code' && !code.trim()) {
      toast.error('Code is required for code nodes');
      return;
    }
    onSubmit({
      node_type: nodeType,
      title: trimmedTitle,
      code: code.trim() || null,
      block: block.trim() || null,
    });
  };

  return (
    <IcdDialog open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {parentNode && !isEdit && (
          <p className="text-sm text-gray-600 break-words">
            Under: <span className="font-medium">{icdNodeLabel(parentNode)}</span>
          </p>
        )}

        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={nodeType}
              onChange={(e) => setNodeType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {Object.entries(NODE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        <Input
          label="Title"
          value={nodeTitle}
          onChange={(e) => setNodeTitle(e.target.value)}
          required
        />
        <Input
          label="ICD Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={nodeType === 'code' ? 'Required for code' : 'Optional'}
        />
        <Input
          label="Block"
          value={block}
          onChange={(e) => setBlock(e.target.value)}
          placeholder="Optional block code"
        />

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto">
            <FiSave className="w-4 h-4 mr-1" /> Save
          </Button>
        </div>
      </div>
    </IcdDialog>
  );
}

function SubcategoryPromptModal({ open, savedNode, onYes, onNo, onClose }) {
  if (!open || !savedNode) return null;

  return (
    <IcdDialog open={open} onClose={onClose} title="Add subcategory?" maxWidth="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 break-words">
          <span className="font-medium">{icdNodeLabel(savedNode)}</span> was saved successfully.
          Do you want to add a subcategory under this item?
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onNo} className="w-full sm:w-auto">
            No
          </Button>
          <Button type="button" onClick={onYes} className="w-full sm:w-auto">
            Yes
          </Button>
        </div>
      </div>
    </IcdDialog>
  );
}

function DeleteConfirmModal({ open, node, onConfirm, onClose }) {
  if (!open || !node) return null;

  return (
    <IcdDialog open={open} onClose={onClose} title="Confirm delete" maxWidth="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 break-words">
          Delete &quot;{node.title}&quot; and all items under it?
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(node)}
            className="w-full sm:w-auto bg-gray-800 hover:bg-gray-900 text-white"
          >
            Delete
          </Button>
        </div>
      </div>
    </IcdDialog>
  );
}

export const ICD11CodeSelector = ({ value, onChange, error }) => {
  const [selectedPath, setSelectedPath] = useState([]);
  const [selectedCode, setSelectedCode] = useState(value || '');
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalOpen, setGlobalOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [addModal, setAddModal] = useState({ open: false, parentNode: null, levelIndex: 0 });
  const [editModal, setEditModal] = useState({ open: false, node: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, node: null });
  const [subcategoryPrompt, setSubcategoryPrompt] = useState({ open: false, node: null, path: [] });
  const [allowEmptyChildLevel, setAllowEmptyChildLevel] = useState(null);
  const globalBoxRef = useRef(null);
  const lastEmittedValueRef = useRef(value || '');

  const [fetchPathByCode] = useLazyGetIcdPathByCodeQuery();
  const [fetchPathById] = useLazyGetIcdPathByIdQuery();
  const [searchIcdNodes] = useLazySearchIcdNodesQuery();
  const [addNode, { isLoading: isAdding }] = useAddIcdNodeMutation();
  const [updateNode, { isLoading: isUpdating }] = useUpdateIcdNodeMutation();
  const [deleteNode] = useDeleteIcdNodeMutation();

  const { data: rootNodes = [] } = useGetIcdNodesQuery('root');
  const { data: globalResults = [] } = useSearchIcdNodesQuery(globalQuery, {
    skip: globalQuery.trim().length < 2,
  });

  const pendingChildParent = useMemo(() => {
    for (let i = selectedPath.length - 1; i >= 0; i -= 1) {
      const node = selectedPath[i];
      if (!node) continue;
      if (i + 1 >= selectedPath.length || !selectedPath[i + 1]) return node;
    }
    return null;
  }, [selectedPath]);

  const { data: pendingChildren = [] } = useGetIcdNodesQuery(pendingChildParent?.id, {
    skip: !pendingChildParent?.id,
  });

  const syncFromValue = useCallback(
    async (v) => {
      if (!v) {
        setSelectedPath([]);
        setSelectedCode('');
        return;
      }
      try {
        const data = await fetchPathByCode(v).unwrap();
        if (data?.path?.length) {
          setSelectedPath(data.path);
          setSelectedCode(storedValueFromPath(data.path) || v);
          return;
        }
      } catch {
        /* fall through to title search */
      }

      // Custom/local selections are stored as node titles when no WHO code exists
      try {
        const searchResult = await searchIcdNodes(v).unwrap();
        const needle = v.trim().toLowerCase();
        const match =
          searchResult?.find?.((n) => icdNodeLabel(n).toLowerCase() === needle) ||
          searchResult?.find?.((n) => String(n.title || '').trim().toLowerCase() === needle);
        if (match?.id) {
          const byId = await fetchPathById(match.id).unwrap();
          if (byId?.path?.length) {
            setSelectedPath(byId.path);
            setSelectedCode(storedValueFromPath(byId.path) || v);
            return;
          }
        }
      } catch {
        /* show stored label only */
      }

      setSelectedCode(v);
      setSelectedPath([]);
    },
    [fetchPathByCode, fetchPathById, searchIcdNodes]
  );

  useEffect(() => {
    const incoming = value || '';
    // Ignore value changes that originated from our own selection; only
    // rebuild the path when the value is set externally (initial load / reset).
    if (incoming === lastEmittedValueRef.current) return;
    lastEmittedValueRef.current = incoming;
    syncFromValue(incoming);
  }, [value, syncFromValue]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (globalBoxRef.current && !globalBoxRef.current.contains(e.target)) {
        setGlobalOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [globalQuery]);

  const applyPath = useCallback(
    (path) => {
      setSelectedPath(path);
      const stored = storedValueFromPath(path);
      setSelectedCode(stored);
      lastEmittedValueRef.current = stored;
      onChange({ target: { name: 'icd_code', value: stored } });
    },
    [onChange]
  );

  const replaceNodeInPath = useCallback(
    (updatedNode) => {
      setSelectedPath((prev) => {
        const next = prev.map((n) => (n.id === updatedNode.id ? updatedNode : n));
        const stored = storedValueFromPath(next);
        setSelectedCode(stored);
        lastEmittedValueRef.current = stored;
        onChange({ target: { name: 'icd_code', value: stored } });
        return next;
      });
    },
    [onChange]
  );

  const pickSearchResult = async (node) => {
    try {
      const data = await fetchPathById(node.id).unwrap();
      if (data?.path?.length) {
        applyPath(data.path);
      } else {
        applyPath([node]);
      }
    } catch {
      applyPath([node]);
    }
    setGlobalQuery('');
    setGlobalOpen(false);
  };

  const handleLevelChange = (levelIndex, node) => {
    setAllowEmptyChildLevel(null);
    const newPath = selectedPath.slice(0, levelIndex);
    if (node) newPath[levelIndex] = node;
    applyPath(newPath);
  };

  const buildPathForNewNode = (node) => {
    if (!node) return [];
    if (node.node_type === 'chapter' || !addModal.parentNode) return [node];
    const parentIndex = selectedPath.findIndex((n) => n.id === addModal.parentNode?.id);
    const newPath = selectedPath.slice(0, parentIndex + 1);
    newPath[parentIndex + 1] = node;
    return newPath;
  };

  const handleNodeSaved = (node) => {
    if (!node) return;
    const newPath = buildPathForNewNode(node);

    if (HIERARCHY_TYPES.includes(node.node_type)) {
      setSubcategoryPrompt({ open: true, node, path: newPath });
      return;
    }

    setAllowEmptyChildLevel(null);
    applyPath(newPath);
  };

  const openAddSubcategoryUnder = (parentNode, path) => {
    setAddModal({
      open: true,
      parentNode,
      levelIndex: path.length,
    });
  };

  const levelsToRender = useMemo(() => {
    const levels = [0];

    for (let i = 0; i < selectedPath.length; i++) {
      if (!selectedPath[i]) break;

      const next = i + 1;
      if (selectedPath[next]) {
        if (!levels.includes(next)) levels.push(next);
        continue;
      }

      const node = selectedPath[i];
      const userRequestedChild = allowEmptyChildLevel === next;
      // WHO/system chapters & categories reliably have children, so drill in
      // immediately (avoids a fetch delay). For custom nodes, only open the
      // child column when there are actual children to drill into — otherwise
      // selecting a leaf node should NOT spawn an empty "Subcategory" column.
      const isSystemContainer =
        node.is_system && (node.node_type === 'chapter' || node.node_type === 'category');
      const hasFetchedChildren =
        pendingChildParent?.id === node.id && pendingChildren.length > 0;

      if (isSystemContainer || hasFetchedChildren || userRequestedChild) {
        if (!levels.includes(next)) levels.push(next);
      }
      break;
    }

    return levels;
  }, [selectedPath, allowEmptyChildLevel, pendingChildren.length, pendingChildParent?.id]);

  const handleGlobalKeyDown = (e) => {
    if (!globalOpen || globalResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, globalResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pickSearchResult(globalResults[highlight]);
    } else if (e.key === 'Escape') {
      setGlobalOpen(false);
    }
  };

  const handleAddSubmit = async (form) => {
    const { parentNode } = addModal;
    try {
      const result = await addNode({
        parent_id: form.node_type === 'chapter' ? null : parentNode?.id ?? null,
        node_type: form.node_type,
        title: form.title,
        code: form.code,
        block: form.block,
        chapter_no: parentNode?.chapter_no || null,
      }).unwrap();
      const node = result?.data?.node ?? result?.node;
      toast.success('ICD node added');
      setAddModal({ open: false, parentNode: null, levelIndex: 0 });
      handleNodeSaved(node);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to add ICD node');
    }
  };

  const handleEditSubmit = async (form) => {
    const node = editModal.node;
    if (!node) return;
    try {
      const result = await updateNode({
        id: node.id,
        title: form.title,
        code: form.code,
        block: form.block,
        node_type: form.node_type,
      }).unwrap();
      const updated = result?.data?.node ?? result?.node ?? { ...node, ...form };
      toast.success('ICD node updated');
      replaceNodeInPath(updated);
      setEditModal({ open: false, node: null });
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update ICD node');
    }
  };

  const handleDeleteNode = async (node) => {
    if (!canManageNode(node)) return;
    try {
      await deleteNode(node.id).unwrap();
      toast.success('Deleted');
      const levelIndex = selectedPath.findIndex((n) => n.id === node.id);
      const newPath =
        levelIndex >= 0
          ? selectedPath.slice(0, levelIndex)
          : selectedPath.filter((n) => n.id !== node.id);
      applyPath(newPath);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete');
    }
  };

  const requestDeleteNode = (node) => {
    if (!canManageNode(node)) return;
    setDeleteModal({ open: true, node });
  };

  const confirmDeleteNode = async (node) => {
    setDeleteModal({ open: false, node: null });
    await handleDeleteNode(node);
  };

  const lastNode = selectedPath[selectedPath.length - 1];
  const showEmptyDbHint = rootNodes.length === 0;

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">ICD Code</label>

      {showEmptyDbHint && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">
          ICD hierarchy is not loaded yet. Ask an administrator to run the ICD seed, or restart the
          backend after migration.
        </div>
      )}

      <div className="relative" ref={globalBoxRef}>
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={globalQuery}
          onChange={(e) => {
            setGlobalQuery(e.target.value);
            setGlobalOpen(true);
          }}
          onFocus={() => {
            if (globalQuery.trim().length >= 2) setGlobalOpen(true);
          }}
          onKeyDown={handleGlobalKeyDown}
          placeholder="Quick search by ICD code or diagnosis name (e.g. 6A02, autism)"
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
        />
        {globalQuery && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setGlobalQuery('');
              setGlobalOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          >
            <FiX className="h-4 w-4" />
          </button>
        )}

        {globalOpen && globalQuery.trim().length >= 2 && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden max-h-80 overflow-y-auto">
            {globalResults.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">No matches</div>
            ) : (
              globalResults.map((node, idx) => {
                const tag = node.code || node.block || '';
                const active = idx === highlight;
                return (
                  <button
                    key={`${node.id}-${idx}`}
                    type="button"
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => pickSearchResult(node)}
                    className={`w-full text-left px-4 py-2 text-sm flex items-start gap-3 border-b border-gray-100 last:border-b-0 ${
                      active ? 'bg-gray-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    {tag ? (
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {tag}
                      </span>
                    ) : (
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {NODE_TYPE_LABELS[node.node_type] || 'Node'}
                      </span>
                    )}
                    <span className="flex-1 text-gray-800">{node.title}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
        {levelsToRender.map((levelIndex) => {
          const parentId = levelIndex === 0 ? null : selectedPath[levelIndex - 1]?.id;
          const parentNode = levelIndex === 0 ? null : selectedPath[levelIndex - 1];
          if (levelIndex > 0 && !parentId) return null;
          return (
            <IcdLevelSelect
              key={levelIndex}
              parentId={parentId}
              parentNode={parentNode}
              levelIndex={levelIndex}
              selectedNode={selectedPath[levelIndex]}
              showError={error}
              onSelect={(node) => handleLevelChange(levelIndex, node)}
              onAddClick={() =>
                setAddModal({
                  open: true,
                  parentNode: levelIndex === 0 ? null : selectedPath[levelIndex - 1],
                  levelIndex,
                })
              }
              onEditClick={(node) => setEditModal({ open: true, node })}
              onDeleteClick={requestDeleteNode}
            />
          );
        })}
      </div>

      {lastNode &&
      HIERARCHY_TYPES.includes(lastNode.node_type) &&
      !levelsToRender.includes(selectedPath.length) ? (
        <button
          type="button"
          onClick={() => {
            setAllowEmptyChildLevel(selectedPath.length);
            openAddSubcategoryUnder(lastNode, selectedPath);
          }}
          className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
        >
          <FiPlus className="w-3 h-3" /> Add item under &quot;{lastNode.title}&quot;
        </button>
      ) : null}

      {selectedCode ? (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-700">
            <strong>Selected ICD-11 Code:</strong>{' '}
            <span className="font-mono font-semibold">{selectedCode}</span>
            {lastNode && <span className="ml-2 text-gray-600">— {lastNode.title}</span>}
          </p>
        </div>
      ) : null}

      <IcdNodeFormModal
        open={addModal.open}
        title="Add ICD Node"
        parentNode={addModal.parentNode}
        defaultType={
          addModal.levelIndex === 0 ? 'chapter' : defaultNodeType(addModal.parentNode)
        }
        onClose={() => setAddModal({ open: false, parentNode: null, levelIndex: 0 })}
        onSubmit={handleAddSubmit}
        isLoading={isAdding}
      />

      <IcdNodeFormModal
        open={editModal.open}
        title="Edit ICD Node"
        initialNode={editModal.node}
        defaultType={editModal.node?.node_type}
        onClose={() => setEditModal({ open: false, node: null })}
        onSubmit={handleEditSubmit}
        isLoading={isUpdating}
      />

      <DeleteConfirmModal
        open={deleteModal.open}
        node={deleteModal.node}
        onClose={() => setDeleteModal({ open: false, node: null })}
        onConfirm={confirmDeleteNode}
      />

      <SubcategoryPromptModal
        open={subcategoryPrompt.open}
        savedNode={subcategoryPrompt.node}
        onClose={() => {
          applyPath(subcategoryPrompt.path);
          setAllowEmptyChildLevel(null);
          setSubcategoryPrompt({ open: false, node: null, path: [] });
        }}
        onYes={() => {
          applyPath(subcategoryPrompt.path);
          setAllowEmptyChildLevel(subcategoryPrompt.path.length);
          const { node, path } = subcategoryPrompt;
          setSubcategoryPrompt({ open: false, node: null, path: [] });
          openAddSubcategoryUnder(node, path);
        }}
        onNo={() => {
          applyPath(subcategoryPrompt.path);
          setAllowEmptyChildLevel(null);
          setSubcategoryPrompt({ open: false, node: null, path: [] });
        }}
      />
    </div>
  );
};
