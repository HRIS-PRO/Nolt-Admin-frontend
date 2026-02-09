import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MDAS_LIST } from '@/data';

interface MdaTertiarySelectProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    error?: string;
}

const TERTIARY_LIST = [
    'AHMADU BELLO UNIVERSITY ZARIA',
    'AKANU IBIAM FEDERAL POLYTECHNIC',
    'ALVAN IKOKU COLLEGE OF EDUCATION',
    'BAYERO UNIVERSITY KANO',
    'DIVISION OF AGRICULTURAL COLLEGES, ABU ZARIA',
    'FEDERAL COLLEGE OF EDUCATION (TECHNICAL) BICHI',
    'FEDERAL COLLEGE OF EDUCATION IWO OSUN',
    'FEDERAL COLLEGE OF EDUCATION ODUGBO, BENUE',
    'FEDERAL COLLEGE OF EDUCATION PANKSHIN',
    'FEDERAL COLLEGE OF EDUCATION ZARIA',
    'FEDERAL COLLEGE OF FORESTRY JOS',
    'FEDERAL POLYTECHNIC BAYELSA',
    'FEDERAL POLYTECHNIC BIDA',
    'FEDERAL POLYTECHNIC KAURA NAMODA',
    'FEDERAL POLYTECHNIC MUBI ADAMAWA',
    'FEDERAL POLYTECHNIC NASARAWA',
    'FEDERAL POLYTECHNIC NEKEDE',
    'FEDERAL POLYTECHNIC OFFA',
    'FEDERAL POLYTECHNIC OHODO, ENUGU',
    'FEDERAL POLYTECHNIC OKO ANAMBRA',
    'FEDERAL POLYTECHNIC WANNUNE, BENUE',
    'FEDERAL POLYTECHNIC, AUCHI',
    'FEDERAL POLYTECHNICS ADO EKITI ADO',
    'FEDERAL POLYTECHNICS EDE OSUN STATE',
    'FEDERAL UNIVERSITY BIRNIN KEBBI',
    'FEDERAL UNIVERSITY DUTSIN-MA',
    'FEDERAL UNIVERSITY GASHUA',
    'FEDERAL UNIVERSITY GUSAU',
    'FEDERAL UNIVERSITY KASHERE GOMBE STATE',
    'FEDERAL UNIVERSITY OF TECHNOLOGY MINNA',
    'FEDERAL UNIVERSITY OTUOKE BAYELSA',
    'FEDERAL UNIVERSITY TECHNOLOGY OWERRI',
    'FEDERAL UNIVERSITY WUKARI TARABA STATE',
    'INSTITUTE FOR AGRICULTURAL RESEARCH IAR ZARIA',
    'KADUNA POLYTECHNIC KADUNA',
    'MICHAEL OKPARA UNI. OF AGRIC. UMUDIKE',
    'MODIBBO ADAMA UNIVERSITY YOLA',
    'NATIONAL AGRICULTURAL EXTENSION AND RESEARCH LIAISON SERVICES',
    'NATIONAL ANIMAL PRODUCTION RESEARCH INSTITUTE ABU ZARIA',
    'NATIONAL OPEN UNIVERSITY OF NIGERIA',
    'NIGERIAN ARMY UNIVERSITY BIU',
    'NIGERIAN DEFENCE ACADEMY KADUNA',
    'NIGERIAN MARITIME UNIVERSITY OKERENKONKO',
    'NNAMDI AZIKIWE UNIVERSITY AWKA',
    'UNIVERSITY OF ABUJA GWAGWALADA',
    'UNIVERSITY OF AGRICULTURE MAKURDI',
    'UNIVERSITY OF CALABAR',
    'UNIVERSITY OF ILORIN',
    'UNIVERSITY OF JOS',
    'UNIVERSITY OF LAGOS',
    'UNIVERSITY OF MAIDUGURI',
    'UNIVERSITY OF NIGERIA NSUKKA',
    'USMANU DANFODIYO UNIVERSITY',
    'WAZIRI UMARU FEDERAL POLYTECHNIC BIRNIN KEBBI',
    'YABA COLLEGE OF TECHNOLOGY'
];

const MdaTertiarySelect: React.FC<MdaTertiarySelectProps> = ({
    value,
    onChange,
    label = "Select Organization",
    error
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'MDA' | 'TERTIARY'>('MDA');
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLButtonElement>(null);
    const [dropdownStyles, setDropdownStyles] = useState({});

    useEffect(() => {
        const handleScroll = () => {
            if (isOpen) setIsOpen(false);
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [isOpen]);

    const toggleDropdown = () => {
        if (!isOpen && dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const dropUp = spaceBelow < 400;

            setDropdownStyles({
                position: 'fixed',
                top: dropUp ? 'auto' : `${rect.bottom + 8}px`,
                bottom: dropUp ? `${window.innerHeight - rect.top + 8}px` : 'auto',
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                zIndex: 9999
            });
        }
        setIsOpen(!isOpen);
    };

    const filteredItems = (activeTab === 'MDA' ? MDAS_LIST : TERTIARY_LIST).filter(item =>
        item.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (item: string) => {
        onChange(item);
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <div className="relative space-y-2">
            {label && <label className="text-sm font-black text-slate-500 uppercase">{label}</label>}

            {/* Trigger Button */}
            <button
                ref={dropdownRef}
                type="button"
                onClick={toggleDropdown}
                className={`w-full h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 px-6 text-lg font-bold flex items-center justify-between transition-all outline-none ${error ? 'border-red-300 bg-red-50' : isOpen ? 'border-primary ring-4 ring-primary/10' : 'border-slate-100 dark:border-slate-700 hover:border-primary/50'
                    } dark:text-white`}
            >
                <span className={`truncate mr-4 ${value ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                    {value || 'Select MDA / Tertiary Institution'}
                </span>
                <span className={`material-symbols-outlined transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-slate-400'}`}>
                    expand_more
                </span>
            </button>

            {/* Dropdown Panel - Portaled to Body */}
            {isOpen && createPortal(
                <div style={dropdownStyles} className="fixed bg-white dark:bg-slate-800 rounded-3xl shadow-2xl shadow-slate-900/20 border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex border-b border-slate-100 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => setActiveTab('MDA')}
                            className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-colors ${activeTab === 'MDA' ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500'}`}
                        >
                            MDA
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('TERTIARY')}
                            className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-colors ${activeTab === 'TERTIARY' ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500'}`}
                        >
                            Tertiary
                        </button>
                    </div>

                    <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                            <input
                                type="text"
                                placeholder={`Search ${activeTab === 'MDA' ? 'MDAs' : 'Institutions'}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-none outline-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                        {filteredItems.length > 0 ? (
                            <div className="grid gap-1">
                                {filteredItems.map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => handleSelect(item)}
                                        className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all text-sm ${value === item
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-primary'
                                            }`}
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-slate-400 font-medium">
                                No matches found
                            </div>
                        )}
                    </div>
                    {/* Backdrop to close on click outside (transparent) */}
                    <div className="fixed inset-0 -z-10" onClick={() => setIsOpen(false)}></div>
                </div>,
                document.body
            )}

            {error && <p className="text-red-500 text-xs font-bold ml-1">{error}</p>}
        </div>
    );
};

export default MdaTertiarySelect;
