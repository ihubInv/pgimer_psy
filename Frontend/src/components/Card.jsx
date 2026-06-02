const Card = ({
  children,
  title,
  subtitle,
  actions,
  className = '',
  variant = 'glass',
  ...props
}) => {
  const isSolid = variant === 'solid';
  const shellClass = isSolid
    ? 'relative bg-white border border-gray-200 rounded-xl shadow-sm transition-shadow hover:shadow-md'
    : 'relative backdrop-blur-xl bg-white/70 border border-white/40 rounded-2xl shadow-2xl transition-all duration-300 hover:bg-white/80 hover:shadow-3xl';
  const headerClass = isSolid
    ? 'px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-start'
    : 'px-6 py-4 border-b border-white/30 backdrop-blur-sm bg-white/30 flex justify-between items-start';
  const bodyClass = isSolid ? 'overflow-visible' : 'overflow-visible';

  return (
    <div className={`${shellClass} ${className}`} style={{ zIndex: 'auto' }} {...props}>
      {(title || subtitle || actions) && (
        <div className={headerClass}>
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className={`px-6 py-4 ${bodyClass}`} style={{ zIndex: 'auto' }}>
        {children}
      </div>
    </div>
  );
};

export default Card;
