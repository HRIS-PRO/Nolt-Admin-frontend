const fs = require('fs');
const path = './pages/ApplicationsList.tsx';

let content = fs.readFileSync(path, 'utf-8');

// Update processLiquidation
const oldProcess = `
  const processLiquidation = () => {
    setShowWarningModal(false);
    setShowLiquidationModal(false);
    setIsProcessing(true);
    
    setTimeout(() => {
      setIsProcessing(false);
      setProcessingMessage(\`Your liquidation request for \${selectedApp?.id} is being processed. Funds will be credited to your linked account within 24-48 hours.\`);
      setTimeout(() => setProcessingMessage(null), 8000);
    }, 2000);
  };
`;

const newProcess = `
  const processLiquidation = async () => {
    setShowWarningModal(false);
    setShowLiquidationModal(false);
    setIsProcessing(true);
    
    try {
      const amountToLiquidate = liquidationType === 'FULL' ? selectedApp?.amount : parseFloat(customAmount);
      
      // Extract numeric ID from e.g. "INV-42"
      const realId = selectedApp?.id.replace('INV-', '');

      await axios.post(\`\${import.meta.env.VITE_API_URL || ''}/api/investments/\${realId}/liquidate\`, {
        liquidation_type: liquidationType,
        amount: amountToLiquidate
      }, { withCredentials: true });

      setIsProcessing(false);
      setProcessingMessage(\`Your liquidation request for \${selectedApp?.id} is being processed by our CX team. We will notify you once it moves to the next stage.\`);
      
      // Update local state to reflect is_liquidating status to prevent duplicate clicks without refetching immediately
      setCompletedApps(prev => prev.map(app => 
        app.id === selectedApp?.id 
        ? { ...app, data: { ...app.data, is_liquidating: true } } 
        : app
      ));

      setTimeout(() => setProcessingMessage(null), 8000);
    } catch (err: any) {
      setIsProcessing(false);
      alert(err.response?.data?.message || 'Failed to submit liquidation request');
    }
  };
`;

content = content.replace(oldProcess.trim(), newProcess.trim());


// Update dropdown UI to handle is_liquidating
// We need to find the specific buttons: Top-Up and Liquidate, and disable/hide them, or just hide them.
// Let's hide them if item.data?.is_liquidating === true
const oldInvestmentCondition = `{!item.type.toLowerCase().includes('loan') && (`;
const newInvestmentCondition = `{!item.type.toLowerCase().includes('loan') && (
                        <>
                          {item.data?.is_liquidating ? (
                            <div className="w-full flex items-center gap-4 px-6 py-4 text-xs font-black text-orange-500 bg-orange-500/5 transition-all uppercase tracking-widest group">
                              <div className="size-8 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg animate-pulse">pending</span>
                              </div>
                              Liquidation Processing
                            </div>
                          ) : (`;
                          
const oldCloseInvestmentCondition = `</button>
                        </>
                      )}`;

const newCloseInvestmentCondition = `</button>
                          )}
                        </>
                      )}`;
                      
content = content.replace(oldInvestmentCondition, newInvestmentCondition);
content = content.replace(oldCloseInvestmentCondition, newCloseInvestmentCondition);


fs.writeFileSync(path, content);
console.log('Patched Successfully!');
