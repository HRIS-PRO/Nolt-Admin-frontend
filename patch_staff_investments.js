const fs = require('fs');
const path = './pages/StaffInvestmentsPage.tsx';

let content = fs.readFileSync(path, 'utf-8');

// Update Render
// Add a visual indicator next to the stage or company name if is_liquidating is true
const oldCode = `                                                <td className="p-4">
                                                    <div className="font-bold text-slate-900 dark:text-white capitalize">
                                                        {inv.company_name || inv.rep_full_name || inv.customer_name || 'Individual'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                                                        INV-{inv.id}
                                                    </div>
                                                </td>`;

const newCode = `                                                <td className="p-4 relative">
                                                    <div className="font-bold text-slate-900 dark:text-white capitalize flex items-center gap-2">
                                                        {inv.company_name || inv.rep_full_name || inv.customer_name || 'Individual'}
                                                        {inv.is_liquidating && (
                                                            <span className="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[10px]">warning</span> Liquidating
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                                                        INV-{inv.id}
                                                    </div>
                                                </td>`;

content = content.replace(oldCode, newCode);

fs.writeFileSync(path, content);
console.log("Patched StaffInvestmentsPage");
