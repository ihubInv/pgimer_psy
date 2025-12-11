import { useState } from 'react';
import { useGetAllPatientsQuery } from '../features/patients/patientsApiSlice';
import Card from '../components/Card';
import Button from '../components/Button';
import { isProduction, getEnvironment } from '../utils/constants';


const ApiTest = () => {
  const [testPatients, setTestPatients] = useState(false);
  
  const { data: patientsData, isLoading: patientsLoading, error: patientsError } = 
    useGetAllPatientsQuery({ page: 1, limit: 10 }, { skip: !testPatients });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">API Connection Test</h1>
        <p className="text-gray-600 mt-1">Test backend API connections</p>
      </div>

      {/* API Base URL */}
      <Card title="Configuration">
        <div className="space-y-2">
          <p><strong>API Base URL:</strong> {import.meta.env.VITE_API_URL}</p>
          <p><strong>Frontend URL:</strong> {window.location.origin}</p>
          <p><strong>Environment:</strong> {getEnvironment()}</p>
          <p><strong>Is Production:</strong> {isProduction() ? 'Yes' : 'No'}</p>
          <p><strong>Vite MODE:</strong> {import.meta.env.MODE}</p>
          <p><strong>Vite PROD:</strong> {import.meta.env.PROD ? 'true' : 'false'}</p>
          <p><strong>VITE_NODE_ENV:</strong> {import.meta.env.VITE_NODE_ENV || 'not set'}</p>
        </div>
      </Card>

      {/* Patients API Test */}
      <Card title="Patients API Test">
        <div className="space-y-4">
          <Button onClick={() => setTestPatients(true)}>
            Test Patients API
          </Button>

          {testPatients && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              {patientsLoading && <p>Loading...</p>}
              
              {patientsError && (
                <div className="text-red-600">
                  <p><strong>Error:</strong></p>
                  <pre className="text-xs mt-2 overflow-auto">
                    {JSON.stringify(patientsError, null, 2)}
                  </pre>
                </div>
              )}

              {patientsData && (
                <div className="text-green-600">
                  <p><strong>✅ Success!</strong></p>
                  <p className="mt-2">Total Patients: {patientsData?.data?.pagination?.total || 0}</p>
                  <p>Records Returned: {patientsData?.data?.patients?.length || 0}</p>
                  <pre className="text-xs mt-2 overflow-auto max-h-64">
                    {JSON.stringify(patientsData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ApiTest;

