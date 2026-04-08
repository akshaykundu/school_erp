import React from 'react';
import logo from '../assets/logo3.jpeg';

function BrandBanner({ subtitle = '', textClassName = 'text-slate-900', subtextClassName = 'text-slate-500', className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src={logo} alt="Chetan Classes logo" className="h-12 w-12 rounded-2xl object-cover shadow-sm" />
      <div>
        <p className={`text-lg font-extrabold tracking-[0.18em] ${textClassName}`}>CHETAN CLASSES</p>
        {subtitle ? <p className={`text-xs font-medium uppercase tracking-[0.18em] ${subtextClassName}`}>{subtitle}</p> : null}
      </div>
    </div>
  );
}

export default BrandBanner;
