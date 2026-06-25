import { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  useGetClinicalOptionsQuery,
  useAddClinicalOptionMutation,
  useDeleteClinicalOptionMutation,
  useUpdateClinicalOptionMutation,
} from '../features/clinical/clinicalApiSlice';
import {
  FiX,
  FiSave,
  FiPlus,
  FiHeart,
  FiActivity,
  FiUser,
  FiClipboard,
  FiList,
  FiCheckSquare,
  FiFileText,
  FiEdit3,
  FiChevronDown,
  FiSearch,
  FiTrash2,
} from 'react-icons/fi';
import Input from './Input';
import Button from './Button';
import Textarea from './Textarea';

const iconByGroup = {
  nature_of_information: <FiList className="w-6 h-6 text-blue-600" />,
  mood: <FiHeart className="w-6 h-6 text-rose-600" />,
  behaviour: <FiActivity className="w-6 h-6 text-violet-600" />,
  speech: <FiUser className="w-6 h-6 text-sky-600" />,
  thought: <FiClipboard className="w-6 h-6 text-indigo-600" />,
  perception: <FiList className="w-6 h-6 text-cyan-600" />,
  somatic: <FiActivity className="w-6 h-6 text-emerald-600" />,
  bio_functions: <FiCheckSquare className="w-6 h-6 text-emerald-600" />,
  adjustment: <FiList className="w-6 h-6 text-amber-600" />,
  cognitive_function: <FiActivity className="w-6 h-6 text-fuchsia-600" />,
  fits: <FiActivity className="w-6 h-6 text-red-600" />,
  sexual_problem: <FiHeart className="w-6 h-6 text-pink-600" />,
  substance_use: <FiList className="w-6 h-6 text-teal-600" />,
  associated_medical_surgical: <FiFileText className="w-6 h-6 text-indigo-600" />,
  mse_behaviour: <FiActivity className="w-6 h-6 text-violet-600" />,
  mse_affect: <FiHeart className="w-6 h-6 text-rose-600" />,
  mse_thought: <FiClipboard className="w-6 h-6 text-indigo-600" />,
  mse_perception: <FiList className="w-6 h-6 text-cyan-600" />,
  mse_cognitive_function: <FiActivity className="w-6 h-6 text-fuchsia-600" />,
};

export const ClinicalMultiSelectDropdown = ({
  label,
  name,
  value = [],
  onChange,
  options = [],
  rightInlineExtra = null,
  disabled = false,
  note = '',
  onNoteChange = null,
}) => {
  const baseOptions = Array.isArray(options) ? options : [];
  const [systemOptions, setSystemOptions] = useState(new Set());
  const [userCreatedOptions, setUserCreatedOptions] = useState(new Set());
  const [optionIdByLabel, setOptionIdByLabel] = useState({});
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [customOption, setCustomOption] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [localNote, setLocalNote] = useState(note || '');
  const [editingOption, setEditingOption] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deleteConfirmOption, setDeleteConfirmOption] = useState(null);
  const [isSavingOption, setIsSavingOption] = useState(false);
  const [optimisticAdds, setOptimisticAdds] = useState([]);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const { data: remoteOptionsData, refetch: refetchOptions } = useGetClinicalOptionsQuery(name);
  const [addOption] = useAddClinicalOptionMutation();
  const [deleteOption] = useDeleteClinicalOptionMutation();
  const [updateOption] = useUpdateClinicalOptionMutation();

  const remoteOptions = remoteOptionsData?.options || [];
  const remoteOptionsWithMeta = remoteOptionsData?.optionsWithMeta || [];

  useEffect(() => {
    setLocalNote(note || '');
  }, [note]);

  useEffect(() => {
    if (Array.isArray(remoteOptionsWithMeta)) {
      const userCreatedFromDB = new Set();
      const idMap = {};
      remoteOptionsWithMeta.forEach((opt) => {
        if (opt.label) {
          if (opt.id != null) idMap[opt.label] = opt.id;
          if (opt.is_system === false || opt.is_system == null) {
            userCreatedFromDB.add(opt.label);
          }
        }
      });
      setOptionIdByLabel((prev) => ({ ...prev, ...idMap }));
      setUserCreatedOptions((prev) => new Set([...prev, ...userCreatedFromDB]));
    }
  }, [remoteOptionsWithMeta]);

  const localOptions = useMemo(() => {
    const baseOpts = Array.isArray(options) ? options : [];
    const remoteOpts = Array.isArray(remoteOptions) ? remoteOptions : [];
    return Array.from(
      new Set([
        ...remoteOpts,
        ...baseOpts,
        ...(Array.isArray(value) ? value : []),
        ...Array.from(userCreatedOptions),
        ...optimisticAdds,
      ])
    );
  }, [remoteOptions, options, value, userCreatedOptions, optimisticAdds]);

  useEffect(() => {
    setOptimisticAdds((prev) => prev.filter((label) => !remoteOptions.includes(label)));
  }, [remoteOptions]);

  useEffect(() => {
    const baseOpts = Array.isArray(options) ? options : [];
    const systemSet = new Set();

    if (Array.isArray(remoteOptionsWithMeta)) {
      remoteOptionsWithMeta.forEach((opt) => {
        if (opt.is_system && opt.label) systemSet.add(opt.label);
      });
    }

    baseOpts.forEach((opt) => systemSet.add(opt));
    userCreatedOptions.forEach((opt) => systemSet.delete(opt));

    if (Array.isArray(remoteOptionsWithMeta)) {
      remoteOptionsWithMeta.forEach((opt) => {
        if (opt.label && (opt.is_system === false || opt.is_system == null)) {
          systemSet.delete(opt.label);
        }
      });
    }

    setSystemOptions(systemSet);
  }, [options, remoteOptionsWithMeta, userCreatedOptions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowAdd(false);
        setShowNote(false);
        setEditingOption(null);
        setDeleteConfirmOption(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleHeaderSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!disabled && q.trim()) {
      setIsOpen(true);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const searchPlaceholder = label ? `Search ${label}...` : 'Search...';

  const displayedSelectedValues = useMemo(() => {
    if (!disabled) return value;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return value;
    return value.filter((opt) => opt.toLowerCase().includes(q));
  }, [value, searchQuery, disabled]);

  const availableOptions = useMemo(() => {
    const unselected = localOptions.filter((opt) => !value.includes(opt));
    const q = searchQuery.trim().toLowerCase();
    if (!q) return unselected;
    return unselected.filter((opt) => opt.toLowerCase().includes(q));
  }, [localOptions, value, searchQuery]);

  const selectOption = (opt) => {
    if (disabled || value.includes(opt)) return;
    onChange({ target: { name, value: [...value, opt] } });
  };

  const removeSelected = (opt) => {
    if (disabled) return;
    onChange({ target: { name, value: value.filter((v) => v !== opt) } });
  };

  const handleDelete = async (opt) => {
    setDeleteConfirmOption(null);
    setUserCreatedOptions((prev) => {
      const updated = new Set(prev);
      updated.delete(opt);
      return updated;
    });
    if (value.includes(opt)) {
      onChange({ target: { name, value: value.filter((v) => v !== opt) } });
    }
    try {
      await deleteOption({ group: name, label: opt, hard_delete: true }).unwrap();
    } catch {
      try {
        await deleteOption({ group: name, label: opt, hard_delete: false }).unwrap();
      } catch (err) {
        console.error('Failed to delete option:', err);
        setUserCreatedOptions((prev) => new Set(prev).add(opt));
      }
    }
  };

  const handleSaveAdd = async () => {
    const opt = customOption.trim();
    if (!opt) {
      setShowAdd(false);
      return;
    }
    if (localOptions.includes(opt)) {
      toast.info('This option already exists.');
      setCustomOption('');
      setShowAdd(false);
      return;
    }

    setIsSavingOption(true);
    setOptimisticAdds((prev) => (prev.includes(opt) ? prev : [...prev, opt]));
    setUserCreatedOptions((prev) => new Set(prev).add(opt));
    setSystemOptions((prev) => {
      const updated = new Set(prev);
      updated.delete(opt);
      return updated;
    });

    try {
      const result = await addOption({ group: name, label: opt }).unwrap();
      const payload = result?.data ?? result;
      const newOption = payload?.option;

      if (newOption?.id != null) {
        setOptionIdByLabel((prev) => ({ ...prev, [opt]: newOption.id }));
      }
      refetchOptions();
      setCustomOption('');
      setShowAdd(false);
      setSearchQuery('');
      toast.success(`"${opt}" added to ${label || name}`);
    } catch (error) {
      setOptimisticAdds((prev) => prev.filter((o) => o !== opt));
      setUserCreatedOptions((prev) => {
        const updated = new Set(prev);
        updated.delete(opt);
        return updated;
      });
      const message = error?.data?.message || 'Failed to save option. Please try again.';
      console.error('Failed to add option:', error);
      toast.error(message);
    } finally {
      setIsSavingOption(false);
    }
  };

  const handleSaveEdit = async () => {
    const newLabel = editValue.trim();
    if (!newLabel || !editingOption || newLabel === editingOption) {
      setEditingOption(null);
      return;
    }
    const oldLabel = editingOption;
    const optionId = optionIdByLabel[oldLabel];
    const isUserOption = userCreatedOptions.has(oldLabel);

    setUserCreatedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(oldLabel)) {
        next.delete(oldLabel);
        next.add(newLabel);
      }
      return next;
    });
    if (value.includes(oldLabel)) {
      onChange({
        target: { name, value: value.map((v) => (v === oldLabel ? newLabel : v)) },
      });
    }
    setOptionIdByLabel((prev) => {
      const next = { ...prev };
      if (optionId != null) {
        delete next[oldLabel];
        next[newLabel] = optionId;
      }
      return next;
    });
    setEditingOption(null);

    try {
      if (optionId != null) {
        await updateOption({ id: optionId, label: newLabel }).unwrap();
      } else if (isUserOption) {
        await addOption({ group: name, label: newLabel }).unwrap();
        try {
          await deleteOption({ group: name, label: oldLabel, hard_delete: true }).unwrap();
        } catch {
          await deleteOption({ group: name, label: oldLabel, hard_delete: false }).unwrap();
        }
      }
    } catch (error) {
      console.error('Failed to update option:', error);
      if (value.includes(newLabel)) {
        onChange({
          target: { name, value: value.map((v) => (v === newLabel ? oldLabel : v)) },
        });
      }
      setUserCreatedOptions((prev) => {
        const next = new Set(prev);
        if (next.has(newLabel)) {
          next.delete(newLabel);
          next.add(oldLabel);
        }
        return next;
      });
      setOptionIdByLabel((prev) => {
        const next = { ...prev };
        if (optionId != null) {
          delete next[newLabel];
          next[oldLabel] = optionId;
        }
        return next;
      });
    }
  };

  const startEditing = (opt) => {
    setEditingOption(opt);
    setEditValue(opt);
    setDeleteConfirmOption(null);
    setShowAdd(false);
  };

  const renderEditPanel = (opt) => (
    <div className="px-3 py-2 border border-blue-200 rounded-lg bg-blue-50">
      <p className="text-xs text-gray-500 mb-1">Current: {opt}</p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="New value"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSaveEdit();
            }
            if (e.key === 'Escape') setEditingOption(null);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          autoFocus
        />
        <Button
          type="button"
          onClick={handleSaveEdit}
          className="bg-green-600 text-white px-2 py-1.5 rounded text-xs hover:bg-green-700"
        >
          <FiSave className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          onClick={() => setEditingOption(null)}
          className="bg-gray-500 text-white px-2 py-1.5 rounded text-xs hover:bg-gray-600"
        >
          <FiX className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );

  const handleNoteClick = () => {
    setShowNote(true);
    setShowAdd(false);
    setEditingOption(null);
    setDeleteConfirmOption(null);
    setIsOpen(true);
  };

  const handleNoteSave = () => {
    if (onNoteChange) {
      onNoteChange({ target: { name: `${name}_notes`, value: localNote } });
    }
    setShowNote(false);
  };

  const handleNoteCancel = () => {
    setLocalNote(note || '');
    setShowNote(false);
  };

  const handleNoteDelete = () => {
    if (onNoteChange) {
      onNoteChange({ target: { name: `${name}_notes`, value: '' } });
    }
    setLocalNote('');
    setShowNote(false);
  };

  const triggerLabel = label ? `Select ${label}` : 'Select options';

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-3 text-base font-semibold text-gray-800 shrink-0">
            <span>{iconByGroup[name] || <FiList className="w-6 h-6 text-gray-500" />}</span>
            <span>{label}</span>
          </div>
          <div className="relative w-full sm:max-w-xs sm:min-w-[220px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleHeaderSearchChange}
              placeholder={searchPlaceholder}
              disabled={disabled && value.length === 0}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              aria-label={searchPlaceholder}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
                aria-label="Clear search"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {!disabled && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          >
            <span className="text-gray-500">{triggerLabel}</span>
            <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="max-h-60 overflow-y-auto">
                {availableOptions.length === 0 && !showAdd && (
                  <p className="px-4 py-3 text-sm text-gray-500">
                    {searchQuery.trim() ? 'No matching options' : 'All options selected'}
                  </p>
                )}
                {availableOptions.map((opt) => {
                  const isSystemOption = systemOptions.has(opt);
                  const showDeleteButton = !isSystemOption;

                  if (editingOption === opt) {
                    return (
                      <div key={opt} className="px-3 py-2 border-b border-gray-50" onMouseDown={(e) => e.stopPropagation()}>
                        {renderEditPanel(opt)}
                      </div>
                    );
                  }

                  if (deleteConfirmOption === opt) {
                    return (
                      <div key={opt} className="px-3 py-2 border-b border-gray-50 bg-red-50">
                        <p className="text-sm text-gray-700 mb-2">Are you sure you want to delete &quot;{opt}&quot;?</p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => handleDelete(opt)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                          >
                            Yes
                          </Button>
                          <Button
                            type="button"
                            onClick={() => setDeleteConfirmOption(null)}
                            className="bg-gray-500 text-white px-3 py-1 rounded text-xs hover:bg-gray-600"
                          >
                            No
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={opt}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                    >
                      <button
                        type="button"
                        onClick={() => selectOption(opt)}
                        className="flex-1 flex items-center gap-2 text-left text-sm text-gray-800"
                      >
                        <span className="w-4 h-4 border border-gray-300 rounded flex-shrink-0" />
                        <span className="flex-1">{opt}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(opt);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        title="Edit"
                      >
                        <FiEdit3 className="w-3.5 h-3.5" />
                      </button>
                      {showDeleteButton && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmOption(opt);
                            setEditingOption(null);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Delete"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-2 border-t border-gray-100">
                {showAdd ? (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter option name"
                      value={customOption}
                      onChange={(e) => setCustomOption(e.target.value)}
                      className="flex-1 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveAdd();
                        if (e.key === 'Escape') {
                          setShowAdd(false);
                          setCustomOption('');
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        setShowAdd(false);
                        setCustomOption('');
                      }}
                      className="bg-gray-500 text-white px-2 py-1.5 rounded text-xs"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveAdd}
                      disabled={isSavingOption}
                      className="bg-green-600 text-white px-2 py-1.5 rounded text-xs"
                    >
                      <FiSave className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : showNote && onNoteChange ? (
                  <div className="space-y-2" onMouseDown={(e) => e.stopPropagation()}>
                    <Textarea
                      label={`Notes for ${label}`}
                      value={localNote}
                      onChange={(e) => setLocalNote(e.target.value)}
                      rows={3}
                      placeholder="Enter notes for this section..."
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={handleNoteCancel}
                        className="bg-gray-500 text-white px-2 py-1.5 rounded text-xs"
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </Button>
                      {note && (
                        <Button
                          type="button"
                          onClick={handleNoteDelete}
                          className="bg-red-600 text-white px-2 py-1.5 rounded text-xs"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        onClick={handleNoteSave}
                        className="bg-green-600 text-white px-2 py-1.5 rounded text-xs"
                      >
                        <FiSave className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-stretch gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdd(true);
                        setShowNote(false);
                        setEditingOption(null);
                        setDeleteConfirmOption(null);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-md transition-colors border border-transparent hover:border-primary-100"
                    >
                      <FiPlus className="w-4 h-4" />
                      Add New Item
                    </button>
                    {onNoteChange && (
                      <button
                        type="button"
                        onClick={handleNoteClick}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors border ${
                          note
                            ? 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100'
                            : 'text-blue-600 border-transparent hover:bg-blue-50 hover:border-blue-100'
                        }`}
                      >
                        <FiEdit3 className="w-4 h-4" />
                        Note{note ? ' ✓' : ''}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {(displayedSelectedValues.length > 0 || rightInlineExtra) && (
        <div className="flex flex-wrap items-center gap-2">
          {displayedSelectedValues.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {!disabled && displayedSelectedValues.length > 0 && (
                <span className="text-xs font-medium text-gray-500 w-full sm:w-auto">Selected:</span>
              )}
              {displayedSelectedValues.map((opt) => (
                <span
                  key={opt}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border border-emerald-300 bg-emerald-50 text-emerald-800"
                >
                  {opt}
                  {!disabled && (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditing(opt)}
                        className="text-emerald-600 hover:text-blue-600 rounded-full p-0.5"
                        aria-label={`Edit ${opt}`}
                        title="Edit"
                      >
                        <FiEdit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSelected(opt)}
                        className="text-emerald-600 hover:text-red-600 rounded-full p-0.5"
                        aria-label={`Remove ${opt}`}
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </span>
              ))}
            </div>
          )}
          {editingOption && value.includes(editingOption) && !disabled && (
            <div className="w-full mt-2" onMouseDown={(e) => e.stopPropagation()}>
              {renderEditPanel(editingOption)}
            </div>
          )}
          {rightInlineExtra && (
            <div className="inline-flex items-center">{rightInlineExtra}</div>
          )}
        </div>
      )}

      {disabled && searchQuery.trim() && value.length > 0 && displayedSelectedValues.length === 0 && (
        <p className="text-sm text-gray-500 px-1">No matching selected items for &quot;{searchQuery.trim()}&quot;</p>
      )}

      {!showNote && note && onNoteChange && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 mb-1">Notes:</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{note}</p>
            </div>
            {!disabled && (
              <div className="flex items-center gap-2 ml-2">
                <Button
                  type="button"
                  onClick={() => {
                    setIsOpen(true);
                    handleNoteClick();
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700"
                  title="Edit note"
                >
                  <FiEdit3 className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  onClick={handleNoteDelete}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  title="Delete note"
                >
                  <FiX className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
