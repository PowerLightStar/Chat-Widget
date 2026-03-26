import React from 'react';
import type { QuickButton } from '../types/types';

interface QuickButtonsProps {
  buttons: QuickButton[];
  selectedValues: string[];
  isMultiSelect: boolean;
  onButtonClick: (value: string) => void;
  onSubmitSelection: () => void;
  onClearSelection: () => void;
}

const QuickButtons: React.FC<QuickButtonsProps> = ({
  buttons,
  selectedValues,
  isMultiSelect,
  onButtonClick,
  onSubmitSelection,
  onClearSelection,
}) => {
  return (
    <div className="p-3 border-t border-gray-200 space-y-3">
      <div className="flex gap-2 flex-wrap">
        {buttons.map((button, index) => {
          const isSelected = selectedValues.includes(button.value);

          return (
            <button
              key={index}
              onClick={() => onButtonClick(button.value)}
              className={`px-3 py-1.5 border drop-shadow-2xl rounded-full text-xs transition-all hover:-translate-y-0.5 ${
                isSelected
                  ? 'bg-[#786550] border-[#41372c] text-white'
                  : 'bg-gray-100 border-gray-300 hover:bg-[#786550] hover:border-[#41372c] hover:text-white'
              }`}
            >
              {button.label}
            </button>
          );
        })}
      </div>

      {isMultiSelect && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">
            {selectedValues.length === 0
              ? 'Select one or more options'
              : `${selectedValues.length} option${selectedValues.length > 1 ? 's' : ''} selected`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClearSelection}
              disabled={selectedValues.length === 0}
              className="px-3 py-1 text-xs rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onSubmitSelection}
              disabled={selectedValues.length === 0}
              className="px-3 py-1 text-xs rounded-full border border-[#41372c] bg-[#786550] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send Selected
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickButtons;
