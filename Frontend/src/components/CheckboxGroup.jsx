import { useState, useEffect } from 'react';
import { useGetClinicalOptionsQuery, useAddClinicalOptionMutation, useDeleteClinicalOptionMutation } from '../features/clinical/clinicalApiSlice';
import { FiX, FiSave, FiPlus, FiHeart, FiActivity, FiUser, FiClipboard, FiList, FiCheckSquare, FiFileText, FiEdit3 } from 'react-icons/fi';
import Input from './Input';
import Button from './Button';
import Textarea from './Textarea';

export const CheckboxGroup = ({ label, name, value = [], onChange, options = [], rightInlineExtra = null, disabled = false, note = '', onNoteChange = null }) => {
    // Initialize with provided options to ensure they're always available
    const baseOptions = Array.isArray(options) ? options : [];
    const [localOptions, setLocalOptions] = useState(baseOptions);
    const [systemOptions, setSystemOptions] = useState(new Set()); // Track which options are system (cannot be deleted)
    const [userCreatedOptions, setUserCreatedOptions] = useState(new Set()); // Track user-created options explicitly
    const [showAdd, setShowAdd] = useState(false);
    const [customOption, setCustomOption] = useState('');
    const [showNote, setShowNote] = useState(false);
    const [localNote, setLocalNote] = useState(note || '');
    const { data: remoteOptionsData } = useGetClinicalOptionsQuery(name);
    const [addOption] = useAddClinicalOptionMutation();
    const [deleteOption] = useDeleteClinicalOptionMutation();
    
    // Sync local note with prop changes
    useEffect(() => {
      setLocalNote(note || '');
    }, [note]);
    
    // Extract options and system flags from API response
    const remoteOptions = remoteOptionsData?.data?.options || [];
    const remoteOptionsWithMeta = remoteOptionsData?.data?.optionsWithMeta || [];
  
    const iconByGroup = {
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
  
    // Separate effect to sync user-created options from database metadata
    useEffect(() => {
      if (Array.isArray(remoteOptionsWithMeta)) {
        const userCreatedFromDB = new Set();
        remoteOptionsWithMeta.forEach(opt => {
          // Any option with is_system === false is user-created
          // Also treat undefined/null is_system as user-created (for backwards compatibility)
          if (opt.label && (opt.is_system === false || opt.is_system === null || opt.is_system === undefined)) {
            // This is a user-created option from database
            userCreatedFromDB.add(opt.label);
          }
        });
        
        // Always update user-created options from database (overwrite to ensure sync after refresh)
        if (userCreatedFromDB.size > 0 || remoteOptionsWithMeta.length > 0) {
          setUserCreatedOptions(userCreatedFromDB);
        }
      }
    }, [remoteOptionsWithMeta]);

    useEffect(() => {
      // Merge remote options from database with hardcoded options prop
      // This ensures both database options and hardcoded defaults are available
      const baseOptions = Array.isArray(options) ? options : [];
      const remoteOpts = Array.isArray(remoteOptions) ? remoteOptions : [];
      
      // Track which options are system (from metadata)
      const systemSet = new Set();
      
      // First, mark options from database metadata as system (only if is_system is true)
      if (Array.isArray(remoteOptionsWithMeta)) {
        remoteOptionsWithMeta.forEach(opt => {
          if (opt.is_system && opt.label) {
            // Mark as system option (hardcoded in database)
            systemSet.add(opt.label);
          }
        });
      }
      
      // Also mark all hardcoded options (from props) as system (they cannot be deleted)
      // These are the default options passed from the parent component
      // IMPORTANT: Hardcoded options from props are ALWAYS system, regardless of database state
      baseOptions.forEach(opt => {
        systemSet.add(opt);
      });
      
      // Explicitly remove user-created options from system set
      // This ensures newly added options and existing user-created options are never marked as system
      // CRITICAL: This must run after systemSet is populated to ensure user-created options are not system
      userCreatedOptions.forEach(opt => {
        systemSet.delete(opt);
      });
      
      // Also check remoteOptionsWithMeta to ensure user-created options from DB are not marked as system
      // This is a double-check to ensure options with is_system=false are never in systemSet
      if (Array.isArray(remoteOptionsWithMeta)) {
        remoteOptionsWithMeta.forEach(opt => {
          if (opt.label && (opt.is_system === false || opt.is_system === null || opt.is_system === undefined)) {
            // This is a user-created option, remove it from system set
            systemSet.delete(opt.label);
          }
        });
      }
      
      setSystemOptions(systemSet);
      
      // Merge both arrays, keeping all unique options
      // This ensures that when a new option is added, existing hardcoded options don't disappear
      // Priority: Show all options from both sources, with remote options appearing first
      const mergedOptions = Array.from(new Set([...remoteOpts, ...baseOptions]));
      setLocalOptions(mergedOptions.length > 0 ? mergedOptions : baseOptions);
    }, [remoteOptions, options, remoteOptionsWithMeta, userCreatedOptions]);
  
    const toggle = (opt) => {
      const exists = value.includes(opt);
      const next = exists ? value.filter(v => v !== opt) : [...value, opt];
      onChange({ target: { name, value: next } });
    };
  
    const handleDelete = async (opt) => {
      // Remove from user-created options tracking
      setUserCreatedOptions((prev) => {
        const updated = new Set(prev);
        updated.delete(opt);
        return updated;
      });
      
      // Remove from UI immediately
      setLocalOptions((prev) => prev.filter((o) => o !== opt));
      if (value.includes(opt)) {
        const next = value.filter((v) => v !== opt);
        onChange({ target: { name, value: next } });
      }
      // Hard delete from database (permanently remove)
      try {
        await deleteOption({ group: name, label: opt, hard_delete: true }).unwrap();
      } catch (error) {
        // If hard delete fails, try soft delete
        try {
          await deleteOption({ group: name, label: opt, hard_delete: false }).unwrap();
        } catch (softError) {
          console.error('Failed to delete option:', softError);
          // Re-add to UI if deletion failed
          setLocalOptions((prev) => [...prev, opt].sort());
          // Re-add to user-created options if deletion failed
          setUserCreatedOptions((prev) => new Set(prev).add(opt));
        }
      }
    };
  
    const handleAddClick = () => {
      setShowAdd(true);
      setShowNote(false); // Close note if open
    };
    const handleCancelAdd = () => {
      setShowAdd(false);
      setCustomOption('');
    };
    
    const handleNoteClick = () => {
      setShowNote(true);
      setShowAdd(false); // Close add if open
    };
    
    const handleNoteSave = () => {
      if (onNoteChange) {
        onNoteChange({ target: { name: `${name}_notes`, value: localNote } });
      }
      setShowNote(false);
    };
    
    const handleNoteCancel = () => {
      setLocalNote(note || ''); // Reset to original value
      setShowNote(false);
    };
    
    const handleNoteDelete = () => {
      if (onNoteChange) {
        onNoteChange({ target: { name: `${name}_notes`, value: '' } });
      }
      setLocalNote('');
      setShowNote(false);
    };
  
    const handleSaveAdd = async () => {
      const opt = customOption.trim();
      if (!opt) {
        setShowAdd(false);
        return;
      }
      
      // Mark this as a user-created option (not system)
      setUserCreatedOptions((prev) => new Set(prev).add(opt));
      
      // Immediately ensure the new option is NOT in systemOptions (user-created options are not system)
      setSystemOptions((prev) => {
        const updated = new Set(prev);
        updated.delete(opt); // Remove from system options - new options are never system
        return updated;
      });
      
      setLocalOptions((prev) => (prev.includes(opt) ? prev : [...prev, opt]));
      const next = value.includes(opt) ? value : [...value, opt];
      onChange({ target: { name, value: next } });
      setCustomOption('');
      setShowAdd(false);
      
      // Add option to database - this will trigger a refetch and update systemOptions
      try {
        await addOption({ group: name, label: opt }).unwrap();
      } catch (error) {
        console.error('Failed to add option:', error);
        // If add fails, remove from userCreatedOptions
        setUserCreatedOptions((prev) => {
          const updated = new Set(prev);
          updated.delete(opt);
          return updated;
        });
      }
    };
  
    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center gap-3 text-base font-semibold text-gray-800">
            <span>{iconByGroup[name] || <FiList className="w-6 h-6 text-gray-500" />}</span>
            <span>{label}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {localOptions?.map((opt) => {
            // Determine if this is a system option (hardcoded or from database with is_system=true)
            const isSystemOption = systemOptions.has(opt);
            // Show delete button only for non-system, non-disabled options
            // System options (hardcoded) should NEVER show delete button
            // User-created options (not in systemOptions) SHOULD show delete button
            const showDeleteButton = !disabled && !isSystemOption;
            
            return (
            <div key={opt} className="relative inline-flex items-center group">
              {showDeleteButton && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(opt);
                  }}
                  className="absolute -top-2 -right-2 z-20 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 hover:scale-110"
                  aria-label={`Remove ${opt}`}
                  title={`Delete ${opt}`}
                >
                  <FiX className="w-3 h-3" />
                </button>
              )}
              <label
                className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-colors duration-150 ${
                  disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                }
                  ${value.includes(opt)
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-gray-200 bg-white hover:bg-gray-50 text-gray-800"
                  }`}
              >
                <input
                  type="checkbox"
                  checked={value.includes(opt)}
                  onChange={() => toggle(opt)}
                  disabled={disabled}
                  className={`h-4 w-4 text-primary-600 rounded ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                />
                <span>{opt}</span>
              </label>
            </div>
            );
          })}
          {rightInlineExtra && (
            <div className="inline-flex items-center">
              {rightInlineExtra}
            </div>
          )}
          {!disabled && (
            <div className="flex items-center gap-2">
              {showAdd && (
                <Input
                  placeholder="Enter option name"
                  value={customOption}
                  onChange={(e) => setCustomOption(e.target.value)}
                  className="max-w-xs"
                />
              )}
              {showAdd ? (
                <>
                  <Button
                    type="button"
                    onClick={handleCancelAdd}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 px-3 py-1.5 rounded-md flex items-center gap-2 text-sm hover:from-red-600 hover:to-red-700 hover:shadow-xl hover:shadow-red-500/40"
                  >
                    <FiX className="w-4 h-4" /> Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveAdd}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 px-3 py-1.5 rounded-md flex items-center gap-2 text-sm hover:from-green-600 hover:to-green-700 hover:shadow-xl hover:shadow-green-500/40"
                  >
                    <FiSave className="w-4 h-4" /> Save
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={handleAddClick}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 px-4 py-2 rounded-md flex items-center gap-2 transition-all duration-200 hover:from-green-600 hover:to-green-700 hover:shadow-xl hover:shadow-green-500/40"
                  >
                    <FiPlus className="w-4 h-4" /> Add
                  </Button>
                  {onNoteChange && (
                    <Button
                      type="button"
                      onClick={handleNoteClick}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 px-4 py-2 rounded-md flex items-center gap-2 transition-all duration-200 hover:from-blue-600 hover:to-blue-700 hover:shadow-xl hover:shadow-blue-500/40"
                    >
                      <FiEdit3 className="w-4 h-4" /> Note
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        {showNote && onNoteChange && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Textarea
              label={`Notes for ${label}`}
              value={localNote}
              onChange={(e) => setLocalNote(e.target.value)}
              rows={3}
              placeholder="Enter notes for this section..."
            />
            <div className="flex items-center gap-2 mt-3">
              <Button
                type="button"
                onClick={handleNoteCancel}
                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg shadow-gray-500/30 px-3 py-1.5 rounded-md flex items-center gap-2 text-sm hover:from-gray-600 hover:to-gray-700 hover:shadow-xl hover:shadow-gray-500/40"
              >
                <FiX className="w-4 h-4" /> Cancel
              </Button>
              {note && (
                <Button
                  type="button"
                  onClick={handleNoteDelete}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 px-3 py-1.5 rounded-md flex items-center gap-2 text-sm hover:from-red-600 hover:to-red-700 hover:shadow-xl hover:shadow-red-500/40"
                >
                  <FiX className="w-4 h-4" /> Delete Note
                </Button>
              )}
              <Button
                type="button"
                onClick={handleNoteSave}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 px-3 py-1.5 rounded-md flex items-center gap-2 text-sm hover:from-green-600 hover:to-green-700 hover:shadow-xl hover:shadow-green-500/40"
              >
                <FiSave className="w-4 h-4" /> Save Note
              </Button>
            </div>
          </div>
        )}
        {!showNote && note && onNoteChange && (
          <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 mb-1">Notes:</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{note}</p>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <Button
                  type="button"
                  onClick={handleNoteClick}
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
            </div>
          </div>
        )}
      </div>
    );
  };