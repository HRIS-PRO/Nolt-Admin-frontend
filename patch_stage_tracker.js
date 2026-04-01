const fs = require('fs');
const path = './pages/StaffInvestmentDetailsPage.tsx';

let content = fs.readFileSync(path, 'utf-8');

const oldTracker = `
            {/* Stage Tracker */}
            {(() => {
                const stages = [
                    { id: 'submitted', label: 'Customer Exp.', icon: 'support_agent' },
                    { id: 'compliance_review', label: 'Compliance', icon: 'policy' },
                    { id: 'finance_review', label: 'Finance', icon: 'payments' },
                    { id: 'active', label: 'Active', icon: 'check_circle' }
                ];

                const currentStageId = investment.stage || 'submitted';
                let currentStageIndex = stages.findIndex(s => s.id === currentStageId);
                const activeIndex = currentStageIndex === -1 ? 0 : currentStageIndex;

                return (
                    <div className="bg-white dark:bg-[#0f172a] rounded-[24px] p-8 mb-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                        <div className="flex justify-between items-center relative z-10 overflow-x-auto pb-4 px-4">
                            {stages.map((stage, idx) => {
                                const isCompleted = idx < activeIndex || investment.status === 'active';
                                const isRejected = investment.status === 'rejected' && idx === activeIndex;
                                const isActive = idx === activeIndex && !isRejected && investment.status !== 'active';
                                return (
                                    <div key={stage.id} className="flex flex-col items-center gap-3 min-w-[80px] flex-1">
                                        <div className={\`size-10 rounded-full flex z-10 bg-white dark:bg-[#0f172a] items-center justify-center border-2 \${isActive ? 'border-purple-500 text-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : isCompleted ? 'border-green-500 text-green-500' : isRejected ? 'border-red-500 text-red-500' : 'border-slate-200 text-slate-300 dark:border-slate-700 dark:text-slate-600'}\`}>
                                            <span className="material-symbols-outlined text-lg">{isCompleted ? 'check' : isRejected ? 'close' : stage.icon}</span>
                                        </div>
                                        <p className={\`text-[10px] font-black uppercase text-center \${isActive ? 'text-purple-500' : isRejected ? 'text-red-500' : 'text-slate-400'}\`}>{stage.label}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}
`;

const newTracker = `
            {/* Stage Tracker */}
            {(() => {
                const isLiq = investment.is_liquidating || investment.liquidation_stage === 'completed' || investment.status === 'liquidated';
                
                const stages = isLiq ? [
                    { id: 'customer_experience', label: 'CX Review', icon: 'support_agent' },
                    { id: 'internal_audit', label: 'Audit', icon: 'fact_check' },
                    { id: 'md', label: 'MD Appr.', icon: 'verified_user' },
                    { id: 'finance', label: 'Finance', icon: 'payments' },
                    { id: 'completed', label: 'Payout', icon: 'account_balance_wallet' }
                ] : [
                    { id: 'submitted', label: 'Customer Exp.', icon: 'support_agent' },
                    { id: 'compliance_review', label: 'Compliance', icon: 'policy' },
                    { id: 'finance_review', label: 'Finance', icon: 'payments' },
                    { id: 'active', label: 'Active', icon: 'check_circle' }
                ];

                const currentStageId = isLiq 
                    ? (investment.liquidation_stage || 'customer_experience')
                    : (investment.stage || 'submitted');

                let currentStageIndex = stages.findIndex(s => s.id === currentStageId);
                const activeIndex = currentStageIndex === -1 ? 0 : currentStageIndex;

                return (
                    <div className="bg-white dark:bg-[#0f172a] rounded-[24px] p-8 mb-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                        <div className="flex justify-between items-center relative z-10 overflow-x-auto pb-4 px-4">
                            {stages.map((stage, idx) => {
                                let isCompleted = false;
                                let isRejected = false;
                                let isActive = false;
                                
                                if (isLiq) {
                                  isCompleted = idx < activeIndex || investment.liquidation_stage === 'completed' || investment.status === 'liquidated';
                                  isActive = idx === activeIndex && !isCompleted;
                                } else {
                                  isCompleted = idx < activeIndex || investment.status === 'active';
                                  isRejected = investment.status === 'rejected' && idx === activeIndex;
                                  isActive = idx === activeIndex && !isRejected && investment.status !== 'active';
                                }

                                return (
                                    <div key={stage.id} className="flex flex-col items-center gap-3 min-w-[80px] flex-1 relative">
                                        <div className={\`size-10 rounded-full flex z-10 bg-white dark:bg-[#0f172a] items-center justify-center border-2 \${isActive ? (isLiq ? 'border-orange-500 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'border-purple-500 text-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]') : isCompleted ? (isLiq ? 'border-orange-500 text-orange-500' : 'border-green-500 text-green-500') : isRejected ? 'border-red-500 text-red-500' : 'border-slate-200 text-slate-300 dark:border-slate-700 dark:text-slate-600'}\`}>
                                            <span className="material-symbols-outlined text-lg">{isCompleted ? 'check' : isRejected ? 'close' : stage.icon}</span>
                                        </div>
                                        <p className={\`text-[10px] font-black uppercase text-center \${isActive ? (isLiq ? 'text-orange-500' : 'text-purple-500') : isRejected ? 'text-red-500' : 'text-slate-400'}\`}>{stage.label}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}
`;

content = content.replace(oldTracker.trim(), newTracker.trim());
fs.writeFileSync(path, content);
console.log("Patched!!");
