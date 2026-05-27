/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import logoAsset from '../assets/images/magnifiq_logo_official_1779711238353.png';

interface CompanyLogoProps {
  className?: string;
  size?: number | string;
}

export default function CompanyLogo({ className = "w-6 h-6", size }: CompanyLogoProps) {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <div className={`overflow-hidden rounded-full ${className}`} style={style}>
      <img 
        src={logoAsset} 
        alt="Magnifiq Logo" 
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
