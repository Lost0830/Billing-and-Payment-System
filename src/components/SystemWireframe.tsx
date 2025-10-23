export function SystemWireframe() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6 text-center">Hospital Billing & Payment System - Wireframe</h1>
        
        {/* Main Layout Container */}
        <div className="bg-white border-2 border-gray-400 rounded-lg overflow-hidden">
          
          {/* Header */}
          <div className="h-20 bg-gray-200 border-b-2 border-gray-400 flex items-center px-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-400 rounded"></div>
              <div>
                <div className="w-80 h-4 bg-gray-400 rounded mb-1"></div>
                <div className="w-60 h-3 bg-gray-300 rounded"></div>
              </div>
            </div>
          </div>

          <div className="flex min-h-[600px]">
            
            {/* Left Sidebar Navigation */}
            <div className="w-80 bg-gray-50 border-r-2 border-gray-400 p-6">
              <div className="mb-4">
                <div className="w-20 h-4 bg-gray-400 rounded mb-4"></div>
              </div>
              
              <div className="space-y-3">
                {/* Navigation Items */}
                {[
                  'Invoice Generation',
                  'Payment Processing', 
                  'Billing History',
                  'Discounts & Promotions'
                ].map((item, index) => (
                  <div key={index} className={`p-4 border-2 rounded-lg ${index === 0 ? 'bg-gray-300 border-gray-500' : 'bg-white border-gray-300'}`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-gray-400 rounded"></div>
                      <div className="text-sm font-medium">{item}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6">
              
              {/* Dashboard Overview Section */}
              <div className="mb-8">
                <div className="w-40 h-5 bg-gray-400 rounded mb-4"></div>
                
                {/* Stats Cards Grid */}
                <div className="grid grid-cols-4 gap-6 mb-8">
                  {[
                    'Total Revenue',
                    'Pending Payments',
                    'Processed Invoices', 
                    'Outstanding Invoices'
                  ].map((stat, index) => (
                    <div key={index} className="bg-white border-2 border-gray-300 rounded-lg">
                      {/* Card Header */}
                      <div className="h-12 bg-gray-200 border-b border-gray-300 flex items-center px-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-gray-400 rounded"></div>
                          <div className="w-20 h-3 bg-gray-400 rounded"></div>
                        </div>
                      </div>
                      {/* Card Content */}
                      <div className="p-4">
                        <div className="w-24 h-6 bg-gray-400 rounded mb-2"></div>
                        <div className="w-16 h-3 bg-gray-300 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Module Content Section */}
              <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
                <div className="mb-6">
                  <div className="w-48 h-6 bg-gray-400 rounded mb-2"></div>
                </div>
                
                {/* Module Content Area */}
                <div className="space-y-6">
                  {/* Sample Module Content Layout */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Content Block */}
                    <div className="space-y-4">
                      <div className="border-2 border-gray-300 rounded-lg p-4">
                        <div className="w-32 h-4 bg-gray-400 rounded mb-4"></div>
                        <div className="space-y-3">
                          <div className="w-full h-3 bg-gray-300 rounded"></div>
                          <div className="w-full h-3 bg-gray-300 rounded"></div>
                          <div className="w-3/4 h-3 bg-gray-300 rounded"></div>
                        </div>
                      </div>
                      
                      <div className="border-2 border-gray-300 rounded-lg p-4">
                        <div className="w-28 h-4 bg-gray-400 rounded mb-4"></div>
                        <div className="space-y-3">
                          <div className="w-full h-3 bg-gray-300 rounded"></div>
                          <div className="w-full h-3 bg-gray-300 rounded"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Content Block */}
                    <div className="space-y-4">
                      <div className="border-2 border-gray-300 rounded-lg p-4">
                        <div className="w-36 h-4 bg-gray-400 rounded mb-4"></div>
                        <div className="space-y-3">
                          <div className="w-full h-3 bg-gray-300 rounded"></div>
                          <div className="w-2/3 h-3 bg-gray-300 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Data Table Area */}
                  <div className="border-2 border-gray-300 rounded-lg">
                    <div className="h-12 bg-gray-200 border-b border-gray-300 flex items-center px-4">
                      <div className="w-32 h-4 bg-gray-400 rounded"></div>
                    </div>
                    <div className="p-4">
                      {/* Table Headers */}
                      <div className="grid grid-cols-6 gap-4 mb-3 pb-2 border-b border-gray-300">
                        {Array.from({length: 6}).map((_, i) => (
                          <div key={i} className="w-20 h-3 bg-gray-400 rounded"></div>
                        ))}
                      </div>
                      {/* Table Rows */}
                      {Array.from({length: 4}).map((_, rowIndex) => (
                        <div key={rowIndex} className="grid grid-cols-6 gap-4 mb-2">
                          {Array.from({length: 6}).map((_, colIndex) => (
                            <div key={colIndex} className="w-16 h-3 bg-gray-300 rounded"></div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Architecture Notes */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Layout Structure */}
          <div className="bg-white border-2 border-gray-400 rounded-lg p-6">
            <h3 className="font-semibold mb-4">Layout Structure</h3>
            <ul className="space-y-2 text-sm">
              <li>• <strong>Header:</strong> 80px height, system branding</li>
              <li>• <strong>Sidebar:</strong> 320px fixed width navigation</li>
              <li>• <strong>Main Content:</strong> Flexible width with dashboard + modules</li>
              <li>• <strong>Dashboard Cards:</strong> 4-column grid layout</li>
              <li>• <strong>Module Area:</strong> Dynamic content based on selection</li>
            </ul>
          </div>

          {/* Key Components */}
          <div className="bg-white border-2 border-gray-400 rounded-lg p-6">
            <h3 className="font-semibold mb-4">Core Modules</h3>
            <ul className="space-y-2 text-sm">
              <li>• <strong>Invoice Generation:</strong> Create and calculate bills</li>
              <li>• <strong>Payment Processing:</strong> Handle transactions</li>
              <li>• <strong>Billing History:</strong> Track records and balances</li>
              <li>• <strong>Discounts & Promotions:</strong> Manage offers</li>
            </ul>
          </div>

          {/* Color System */}
          <div className="bg-white border-2 border-gray-400 rounded-lg p-6">
            <h3 className="font-semibold mb-4">Color System</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded" style={{backgroundColor: '#358E83'}}></div>
                <span className="text-sm"><strong>#358E83</strong> - Headers & Primary</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded" style={{backgroundColor: '#E94D61'}}></div>
                <span className="text-sm"><strong>#E94D61</strong> - Buttons & Interactive</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-50 border rounded"></div>
                <span className="text-sm"><strong>Gray Scale</strong> - Backgrounds & Text</span>
              </div>
            </div>
          </div>

          {/* Data Flow */}
          <div className="bg-white border-2 border-gray-400 rounded-lg p-6">
            <h3 className="font-semibold mb-4">Philippines Context</h3>
            <ul className="space-y-2 text-sm">
              <li>• <strong>Currency:</strong> Philippine Peso (₱)</li>
              <li>• <strong>Tax Status:</strong> VAT-Exempt (Hospital Services)</li>
              <li>• <strong>Insurance:</strong> PhilHealth, MaxiCare, Medicard</li>
              <li>• <strong>Payment Methods:</strong> GCash, PayMaya, Bank Transfer</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}