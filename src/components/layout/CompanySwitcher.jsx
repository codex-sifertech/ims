import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import useStore from '../../store/useStore';
import { Building2 } from 'lucide-react';

export default function CompanySwitcher() {
    const { user, activeCompany, setActiveCompany, companies } = useStore();

    return (
        <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Building2 size={16} />
            </div>
            <select
                value={activeCompany?.id || ''}
                onChange={(e) => {
                    const c = companies.find(c => c.id === e.target.value);
                    if (c) setActiveCompany(c);
                }}
                className="block w-full pl-10 pr-3 py-2 bg-dark-700/50 border border-dark-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none transition-colors hover:bg-dark-700 cursor-pointer shadow-sm"
            >
                {companies.map(company => (
                    <option key={company.id} value={company.id} className="bg-dark-800 text-white">
                        {company.name}
                    </option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
    );
}
