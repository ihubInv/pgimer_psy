import { useState, useEffect } from 'react';
import { FiDownload, FiX, FiFileText, FiFile, FiCheck, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import Button from './Button';
import Modal from './Modal';
import { getExportFieldOptions } from '../utils/exportUtils';

const AdvancedExportModal = ({ isOpen, onClose, onExport, data, filename = 'export' }) => {
  const [exportFormat, setExportFormat] = useState('excel');
  const [colorTheme, setColorTheme] = useState('blue');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFields, setSelectedFields] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  
  const fieldOptions = getExportFieldOptions();

  // Initialize with all fields selected by default
  useEffect(() => {
    if (isOpen && selectedFields.length === 0) {
      const allFields = fieldOptions.flatMap(category => 
        category.fields.map(field => field.key)
      );
      setSelectedFields(allFields);
      setSelectAll(true);
    }
  }, [isOpen, fieldOptions, selectedFields.length]);

  const handleExport = async () => {
    if (!data || data.length === 0) {
      return;
    }

    setIsExporting(true);
    try {
      await onExport(data, filename, exportFormat, selectedFields, colorTheme);
      onClose();
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  const toggleField = (fieldKey) => {
    setSelectedFields(prev => {
      if (prev.includes(fieldKey)) {
        return prev.filter(field => field !== fieldKey);
      } else {
        return [...prev, fieldKey];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedFields([]);
      setSelectAll(false);
    } else {
      const allFields = fieldOptions.flatMap(category => 
        category.fields.map(field => field.key)
      );
      setSelectedFields(allFields);
      setSelectAll(true);
    }
  };

  const toggleCategoryFields = (categoryFields) => {
    const categoryFieldKeys = categoryFields.map(field => field.key);
    const allSelected = categoryFieldKeys.every(field => selectedFields.includes(field));
    
    if (allSelected) {
      // Deselect all fields in this category
      setSelectedFields(prev => prev.filter(field => !categoryFieldKeys.includes(field)));
    } else {
      // Select all fields in this category
      setSelectedFields(prev => {
        const newFields = [...prev];
        categoryFieldKeys.forEach(field => {
          if (!newFields.includes(field)) {
            newFields.push(field);
          }
        });
        return newFields;
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Advanced Export Options" size="lg">
      <div className="space-y-6">
        {/* Export Format Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Export Format</h3>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="exportFormat"
                value="excel"
                checked={exportFormat === 'excel'}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              <div className="ml-3 flex items-center">
                <FiFile className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Excel (.xlsx)</div>
                  <div className="text-xs text-gray-500">Best for data analysis</div>
                </div>
              </div>
            </label>

            <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="exportFormat"
                value="csv"
                checked={exportFormat === 'csv'}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              <div className="ml-3 flex items-center">
                <FiFileText className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">CSV (.csv)</div>
                  <div className="text-xs text-gray-500">Universal format</div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Color Theme Selection (only for Excel) */}
        {exportFormat === 'excel' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Header Color Theme</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { key: 'blue', name: 'Blue', color: 'bg-blue-600' },
                { key: 'green', name: 'Green', color: 'bg-green-600' },
                { key: 'purple', name: 'Purple', color: 'bg-purple-600' },
                { key: 'orange', name: 'Orange', color: 'bg-orange-600' },
                { key: 'red', name: 'Red', color: 'bg-red-600' },
                { key: 'teal', name: 'Teal', color: 'bg-teal-600' },
                { key: 'indigo', name: 'Indigo', color: 'bg-indigo-600' }
              ].map((theme) => (
                <label
                  key={theme.key}
                  className="flex flex-col items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="radio"
                    name="colorTheme"
                    value={theme.key}
                    checked={colorTheme === theme.key}
                    onChange={(e) => setColorTheme(e.target.value)}
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500 mb-2"
                  />
                  <div className={`w-8 h-8 rounded-full ${theme.color} mb-2`}></div>
                  <span className="text-xs font-medium text-gray-700">{theme.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Field Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Select Fields to Export</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="text-sm"
            >
              {selectAll ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            {fieldOptions.map((category, categoryIndex) => (
              <div key={categoryIndex} className="border-b border-gray-100 last:border-b-0">
                <button
                  onClick={() => toggleCategory(category.category)}
                  className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={category.fields.every(field => selectedFields.includes(field.key))}
                      onChange={() => toggleCategoryFields(category.fields)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mr-3"
                    />
                    <span className="font-medium text-gray-900">{category.category}</span>
                    <span className="ml-2 text-sm text-gray-500">
                      ({category.fields.filter(field => selectedFields.includes(field.key)).length}/{category.fields.length})
                    </span>
                  </div>
                  {expandedCategories[category.category] ? (
                    <FiChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <FiChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                
                {expandedCategories[category.category] && (
                  <div className="px-4 py-2 bg-white">
                    <div className="grid grid-cols-1 gap-2">
                      {category.fields.map((field, fieldIndex) => (
                        <label
                          key={fieldIndex}
                          className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFields.includes(field.key)}
                            onChange={() => toggleField(field.key)}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mr-3"
                          />
                          <span className="text-sm text-gray-700">{field.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Export Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <FiDownload className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Ready to export {data?.length || 0} records with {selectedFields.length} fields
              </p>
              <p className="text-xs text-blue-600 mt-1">
                File will be saved as: {filename}.{exportFormat === 'excel' ? 'xlsx' : 'csv'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || !data || data.length === 0 || selectedFields.length === 0}
            className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <FiDownload className="mr-2" />
                Export Data
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AdvancedExportModal;
