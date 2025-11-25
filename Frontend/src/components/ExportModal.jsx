import { useState } from 'react';
import { FiDownload, FiX, FiFileText, FiFile } from 'react-icons/fi';
import Button from './Button';
import Modal from './Modal';

const ExportModal = ({ isOpen, onClose, onExport, data, filename = 'export' }) => {
  const [exportFormat, setExportFormat] = useState('excel');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!data || data.length === 0) {
      return;
    }

    setIsExporting(true);
    try {
      await onExport(data, filename, exportFormat);
      onClose();
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Data">
      <div className="space-y-6">
        {/* Export Format Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Export Format</h3>
          <div className="space-y-3">
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
                  <div className="text-sm text-gray-500">Best for data analysis and sharing</div>
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
                  <div className="text-sm text-gray-500">Universal format, works with any spreadsheet app</div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Export Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <FiDownload className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Ready to export {data?.length || 0} records
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
            disabled={isExporting || !data || data.length === 0}
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

export default ExportModal;
