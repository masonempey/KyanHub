const ProcessedPropertiesLog = ({ processedProperties }) => {
  if (processedProperties.length === 0) {
    return null;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-md border border-primary/10 mt-6">
      <h3 className="text-lg font-semibold mb-4 text-dark">
        Processed Properties
      </h3>

      {processedProperties.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No properties have been processed yet.
        </p>
      ) : (
        processedProperties.map((item, index) => (
          <div
            key={`${item.propertyId}-${index}`}
            className={`p-3 mb-2 rounded-lg ${
              item.isBatchHeader
                ? "bg-blue-100 border border-blue-300 font-semibold"
                : item.isPause
                ? "bg-gray-100 border border-gray-300 italic"
                : item.success
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-center">
              {item.isBatchHeader ? (
                <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center mr-3">
                  <span className="text-blue-800">⚙️</span>
                </div>
              ) : item.isPause ? (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                  <span className="text-gray-800">⏱️</span>
                </div>
              ) : item.success ? (
                <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center mr-3">
                  <span className="text-green-800">✓</span>
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-red-200 flex items-center justify-center mr-3">
                  <span className="text-red-800">✗</span>
                </div>
              )}
              <div>
                <p className={`${item.success ? "text-dark" : "text-red-600"}`}>
                  {item.propertyName}
                </p>
                {!item.isBatchHeader && !item.isPause && (
                  <p className="text-sm text-gray-500">
                    {item.success ? item.message : `Error: ${item.error}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ProcessedPropertiesLog;
