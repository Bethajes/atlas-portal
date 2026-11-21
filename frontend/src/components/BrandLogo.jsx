import newGenerationLogo from '/newgenerationlogo.png';

import { BRAND } from '../config/brand';

export function BrandMark({ className = 'h-10 w-10', logoClassName, alt, ...props }) {
  return (
    <img
      src={newGenerationLogo}
      alt={alt || `${BRAND.name} logo`}
      className={`object-contain shrink-0 ${logoClassName || className}`}
      {...props}
    />
  );
}

function BrandLogo({
  showName = true,
  className = '',
  logoClassName = 'h-10 w-10',
  nameClassName = 'text-slate-900 dark:text-white',
  subtitleClassName = 'text-slate-500 dark:text-slate-400',
  subtitle,
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <BrandMark className={logoClassName} />
      {showName ? (
        <div className="min-w-0">
          <div className={`font-bold leading-tight truncate ${nameClassName}`}>{BRAND.shortName}</div>
          <div className={`text-xs truncate ${subtitleClassName}`}>{subtitle || BRAND.name}</div>
        </div>
      ) : null}
    </div>
  );
}

export { BrandLogo };
export default BrandLogo;
