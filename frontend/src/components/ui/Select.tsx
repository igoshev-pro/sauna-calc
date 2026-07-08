import { cn } from '@/lib/utils';
import { forwardRef, SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: { value: string; label: string }[];
    placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, error, options, placeholder, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1">
                {label && (
                    <label className="text-sm font-medium text-gray-700">{label}</label>
                )}
                <select
                    ref={ref}
                    className={cn(
                        'w-full rounded-lg border border-gray-300 px-3 py-2',
                        'text-sm text-black bg-white',
                        'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
                        'disabled:bg-gray-50 disabled:cursor-not-allowed',
                        error && 'border-red-500 focus:ring-red-500',
                        className,
                    )}
                    {...props}
                >
                    {placeholder && (
                        <option value="" className="text-black bg-white">{placeholder}</option>
                    )}
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value} className="text-black bg-white">
                            {opt.label}
                        </option>
                    ))}
                </select>
                {error && <span className="text-xs text-red-500">{error}</span>}
            </div>
        );
    },
);

Select.displayName = 'Select';