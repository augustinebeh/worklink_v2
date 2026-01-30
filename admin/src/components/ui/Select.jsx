import { forwardRef, Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronDownIcon, CheckIcon } from 'lucide-react';
import { clsx } from 'clsx';

const Select = forwardRef(({ 
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  error,
  className,
  containerClassName,
  ...props 
}, ref) => {
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Button 
            ref={ref}
            className={clsx(
              'input text-left flex items-center justify-between',
              error && 'input-error',
              !selectedOption && 'text-slate-400 dark:text-slate-500',
              className
            )}
          >
            <span className="truncate">
              {selectedOption?.label || placeholder}
            </span>
            <ChevronDownIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
          </Listbox.Button>
          
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto focus:outline-none">
              {options.map((option) => (
                <Listbox.Option
                  key={option.value}
                  value={option.value}
                  className={({ active, selected }) => clsx(
                    'relative cursor-pointer select-none py-2.5 px-3 text-sm',
                    active && 'bg-slate-50 dark:bg-slate-800',
                    selected && 'text-primary-600 dark:text-primary-400'
                  )}
                >
                  {({ selected }) => (
                    <div className="flex items-center justify-between">
                      <span className={clsx(selected && 'font-medium')}>
                        {option.label}
                      </span>
                      {selected && (
                        <CheckIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      )}
                    </div>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
      {error && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
